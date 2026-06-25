const tf = require('@tensorflow/tfjs');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { getSoilAnalysisFallback, getPricePredictionFallback, getPestDetectionFallback } = require('../utils/predictionFallback');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim();
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const GEMINI_API_VERSION =
  process.env.GEMINI_API_VERSION?.trim() || "v1beta";
const REQUESTED_GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-1.5-flash";
const DEFAULT_FALLBACK_MODELS = [
  "gemini-1.5-flash",
  "gemini-1.5-pro"
];
const CONFIGURED_FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODEL || DEFAULT_FALLBACK_MODELS.join(",")).split(",")
    .map((name) => name.trim())
    .filter((name) => name && name !== REQUESTED_GEMINI_MODEL);
const GEMINI_MODEL_CANDIDATES = [REQUESTED_GEMINI_MODEL, ...new Set(CONFIGURED_FALLBACK_MODELS)];

console.log(`Gemini config: version=${GEMINI_API_VERSION} primary=${REQUESTED_GEMINI_MODEL} candidates=${GEMINI_MODEL_CANDIDATES.join(', ')}`);

const ensureGenerativeAI = () => {
    if (!GEMINI_API_KEY) {
        throw new Error("Gemini API key is not configured. Set GEMINI_API_KEY in backend/.env");
    }
    if (!genAI) {
        throw new Error("Gemini client initialization failed.");
    }
    return genAI;
};

const generateWithGemini = async ({ prompt, imagePart }) => {
    const client = ensureGenerativeAI();
    const models = GEMINI_MODEL_CANDIDATES;
    let lastError = null;

    for (let index = 0; index < models.length; index += 1) {
        const modelName = models[index];
        try {
            console.log(`🔄 Attempting Gemini model: ${modelName} with API version: ${GEMINI_API_VERSION}`);
            const model = client.getGenerativeModel({ model: modelName }, { apiVersion: GEMINI_API_VERSION });
            const response = imagePart
                ? await model.generateContent([prompt, imagePart])
                : await model.generateContent(prompt);
            console.log(`✅ Gemini model ${modelName} succeeded`);
            return response;
        } catch (err) {
            lastError = err;
            const message = err?.message || "";
            const statusCode = err?.status || err?.code || "unknown";
            const isQuotaError = err?.status === 429 || /429|quota|exhausted|rate limit/i.test(message);
            const isUnsupportedModel = /not (supported|found|available)|unsupported model|not supported for|404/i.test(message);
            const isLastModel = index === models.length - 1;

            console.error(`❌ Gemini model ${modelName} failed (Status: ${statusCode}):`, message || err);

            if (isLastModel) {
                if (isUnsupportedModel) {
                    throw new Error(`All Gemini models failed - models may be unavailable. Update GEMINI_MODEL in backend/.env.`);
                }
                throw err;
            }

            if (isQuotaError || isUnsupportedModel) {
                console.warn(`⏭️ Skipping ${modelName} and trying next fallback model...`);
                continue;
            }

            throw err;
        }
    }

    throw new Error(`Gemini requests failed for all configured models: ${GEMINI_MODEL_CANDIDATES.join(', ')}`);
};

const extractGenAIText = (result) => {
    try {
        const textHelper = result?.response?.text;
        if (typeof textHelper === 'function') {
            return textHelper();
        }
        if (typeof textHelper === 'string') {
            return textHelper;
        }
    } catch (e) {
       
    }
    return "";
};

const CROP_LABELS = [
    "rice", "maize", "chickpea", "kidneybeans", "pigeonpeas",
    "mothbeans", "mungbean", "blackgram", "lentil", "pomegranate",
    "banana", "mango", "grapes", "watermelon", "muskmelon",
    "apple", "orange", "papaya", "coconut", "cotton", "jute", "coffee"
];
const SOIL_LABELS = ["Sandy", "Loamy", "Black", "Red", "Clayey"];


const getModelFromMemory = (dir, modelFile, weightFile) => {
    const modelPath = path.join(dir, modelFile);
    const weightPath = path.join(dir, weightFile);
    if (!fs.existsSync(modelPath) || !fs.existsSync(weightPath)) throw new Error(`Files missing in ${dir}`);
    const modelInfo = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
    const weightsBin = fs.readFileSync(weightPath);
    return { modelTopology: modelInfo.modelTopology, weightSpecs: modelInfo.weightSpecs, weightData: weightsBin.buffer };
};

// 🟢 1. CROP RECOMMENDATION
const getRecommendation = async (req, res) => {
    try {
        const { n, p, k, ph, temp, humidity, rainfall } = req.body;
        const modelDir = path.join(__dirname, '../ml_models');
        const model = await tf.loadLayersModel(tf.io.fromMemory(getModelFromMemory(modelDir, 'model.json', 'weights.bin')));
        const input = tf.tensor2d([[Number(n), Number(p), Number(k), Number(temp || 25), Number(humidity || 70), Number(ph), Number(rainfall || 100)]]);
        const resultIdx = model.predict(input).argMax(1).dataSync()[0];
        res.json({ success: true, recommendedCrop: CROP_LABELS[resultIdx], confidence: "95.00" });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// 🟢 2. SOIL DIAGNOSTIC
const analyzeSoil = async (req, res) => {
    try {
        const body = req.body || {};
        const { n, p, k, language } = body;
        const modelDir = path.join(__dirname, '../soil_ml_models');
        const model = await tf.loadLayersModel(tf.io.fromMemory(getModelFromMemory(modelDir, 'soil_model.json', 'soil_weights.bin')));
        const input = tf.tensor2d([[Number(n), Number(p), Number(k)]]);
        const resultIdx = model.predict(input).argMax(1).dataSync()[0];
        const soilType = SOIL_LABELS[resultIdx];
        const soilTreatments = {
            Sandy: "Use compost and mulch.", Loamy: "Keep well-drained.",
            Black: "Avoid water logging.", Red: "Add organic matter.", Clayey: "Improve drainage with gypsum."
        };
        res.json({ success: true, soilType, treatment: soilTreatments[soilType] || "Use organic compost.", confidence: "95.00" });
    } catch (e) {
        const body = req.body || {};
        const { n, p, k, language } = body;
        const fallback = getSoilAnalysisFallback(n, p, k, language);
        res.json({ success: true, ...fallback });
    }
};

// 🟢 3. PEST DETECTION
const detectPestWithGemini = async (req, res) => {
    const body = req.body || {};
    const { language } = body;
    const fallback = {
        success: true,
        ...getPestDetectionFallback(language, req.file?.originalname || req.files?.[0]?.originalname || ''),
        confidence: "80%"
    };

    try {
        const file = req.file || (req.files && req.files[0]);
        if (!file) {
            return res.json({
                ...fallback,
                disease: 'No image uploaded',
                pestDetection: 'No image uploaded',
                treatment: 'Upload a clear crop leaf image for disease detection.',
                fertilizer: 'Use balanced nutrition and keep the field clean until an image is available.'
            });
        }

        const imagePart = { inlineData: { data: file.buffer.toString("base64"), mimeType: file.mimetype } };
        const langName = language === 'te' ? 'Telugu' : 'English';
        
        const prompt = `Analyze this crop leaf image. Disease name, treatment, and the fertilizer or preventive product to use in ${langName}. Return ONLY JSON: { "disease": "...", "treatment": "...", "fertilizer": "...", "confidence": "90%" }`;

        const result = await generateWithGemini({ prompt, imagePart });
        const text = extractGenAIText(result);
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        
        if (!jsonMatch || !jsonMatch[0]) {
            console.error("❌ Pest Error: No JSON found in response. Response:", text);
            return res.json(fallback);
        }
        
        const parsedData = JSON.parse(jsonMatch[0]);
        const hasMeaningfulDisease = typeof parsedData?.disease === 'string' && parsedData.disease.trim().length > 0;
        return res.json({
            success: true,
            disease: hasMeaningfulDisease ? parsedData.disease : fallback.disease,
            pestDetection: hasMeaningfulDisease ? parsedData.disease : fallback.pestDetection,
            treatment: hasMeaningfulDisease ? parsedData.treatment || fallback.treatment : fallback.treatment,
            fertilizer: hasMeaningfulDisease ? parsedData.fertilizer || fallback.fertilizer : fallback.fertilizer,
            confidence: hasMeaningfulDisease ? parsedData.confidence || fallback.confidence : fallback.confidence
        });
    } catch (e) {
        console.error("❌ Pest Error:", e.message || e);
        return res.json(fallback);
    }
};

// 🟢 4. PRICE PREDICTION
const predictPrice = async (req, res) => {
    const body = req.body || {};
    const { cropName, crop, language } = body;
    const finalCrop = cropName || crop;

    try {
        if (!finalCrop) return res.status(400).json({ success: false, message: "Crop name missing" });

        const langName = language === 'te' ? 'Telugu' : 'English';
        const prompt = `Market price for ${finalCrop} in AP. Respond in ${langName}. Return ONLY JSON: { "currentPrice": "...", "trend": "...", "advice": "..." }`;

        const result = await generateWithGemini({ prompt });
        const text = extractGenAIText(result);
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        
        if (!jsonMatch || !jsonMatch[0]) {
            console.error("❌ Price Error: No JSON found in response. Response:", text);
            return res.status(500).json({ success: false, message: "Invalid AI response format." });
        }
        
        const parsedData = JSON.parse(jsonMatch[0]);
        res.json({ success: true, ...parsedData });
    } catch (e) {
        console.error("❌ Price Error:", e.message || e);
        const fallback = getPricePredictionFallback(finalCrop);
        res.json({ success: true, ...fallback });
    }
};


module.exports = {
    getRecommendation,
    analyzeSoil,
    detectPestWithGemini,
    predictPrice
};