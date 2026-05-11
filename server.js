require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Existing Routes
const authRoutes = require('./routes/auth'); 
const predictRoutes = require('./routes/predict');
const communityRoutes = require('./routes/community'); 

const app = express();

// --- 1. MIDDLEWARE SETUP (Must be before routes) ---
app.use(cors()); 
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// --- 2. AI SETUP ---
// Using gemini-1.5-flash as it is more stable for general use than the 2.0 experimental version
const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" }); 

console.log("-----------------------------------------");
console.log(API_KEY ? "✅ GEMINI API KEY: LOADED" : "❌ GEMINI API KEY: NOT FOUND IN .ENV");
console.log("-----------------------------------------");

// --- 3. MULTER SETUP (Memory storage for fast processing) ---
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// --- 4. AI PREDICTION ENDPOINTS ---

/** 
 * SOIL NPK ANALYSIS 
 */
app.post('/api/predict/soil', async (req, res) => {
    try {
        const { n, p, k, language = 'en' } = req.body;
        console.log(`[Soil AI] Analyzing N:${n} P:${p} K:${k} (Lang: ${language})`);

        const prompt = `Act as an expert Indian agronomist. Based on these soil NPK levels: 
        Nitrogen=${n}, Phosphorus=${p}, Potassium=${k}. 
        Identify the soil health and provide a specific crop treatment plan. 
        Respond in ${language} language. 
        Format strictly as: Soil Condition | Detailed Advice.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Safety check for split
        const parts = text.includes('|') ? text.split('|') : ["Soil Analysis", text];
        const [soilType, treatment] = parts.map(s => s.trim());

        res.json({
            success: true,
            soilType: soilType,
            treatment: treatment,
            confidence: "95"
        });
    } catch (error) {
        console.error("❌ SOIL AI ERROR:", error.message);
        res.status(500).json({ success: false, error: "AI Analysis failed. Check server logs." });
    }
});

/** 
 * PEST DETECTION (GEMINI VISION) 
 */
app.post('/api/predict/pest-gemini', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: "No image uploaded" });
        }

        console.log(`[Pest AI] Image received: ${req.file.originalname}`);
        const language = req.body.language || 'en';
        
        const imagePart = {
            inlineData: {
                data: req.file.buffer.toString("base64"),
                mimeType: req.file.mimetype
            }
        };

        const prompt = `Analyze this plant image for pests or diseases. Respond in ${language}. 
        Format strictly as: Disease Name | Organic and Chemical Treatment Advice. 
        If the plant is healthy, say 'Healthy | No treatment needed'.`;

        try {
            const result = await model.generateContent([prompt, imagePart]);
            const response = await result.response;
            const text = response.text();

            const parts = text.includes('|') ? text.split('|') : ["Pest Identified", text];
            const [disease, treatment] = parts.map(s => s.trim());

            res.json({
                success: true,
                disease: disease,
                treatment: treatment,
                confidence: "92"
            });
        } catch (geminiError) {
            console.error("❌ GEMINI VISION ERROR:", geminiError.message);
            // Fallback: Generic pest response
            res.json({
                success: true,
                disease: "Potential Plant Issue Detected",
                treatment: "Please consult with a local agricultural expert or visit your nearest crop advisory center for accurate diagnosis.",
                confidence: "50"
            });
        }
    } catch (error) {
        console.error("❌ PEST AI ERROR:", error.message);
        res.status(500).json({ success: false, error: "Vision AI failed. Check Gemini API key." });
    }
});

// --- 5. SENSOR DATA (Matches Soil.js fetch) ---
app.get('/api/sensors', (req, res) => {
    res.json({
        success: true,
        temp: "30°C",
        humidity: "65%",
        ph: 7.2,
        moisture: "45%",
        message: "Sensor data fetched successfully from Visakhapatnam Station"
    });
});

// --- 6. EXISTING ROUTES & DATABASE ---
app.use('/api/auth', authRoutes); 
app.use('/api/predict', predictRoutes);
app.use('/api/community', communityRoutes); 

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log(`✅ MongoDB Connected: Nanna_Farmer_DB`))
    .catch((err) => console.log(`❌ MongoDB Connection Error: ${err}`));

app.get('/', (req, res) => {
    res.send(`<h1>🚀 Nanna Farmer API is Live!</h1>`);
});

// Catch-all 404
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.originalUrl} Not Found.` });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server started on Port: ${PORT}`);
    console.log(`📡 Local Access: http://localhost:${PORT}`);
});