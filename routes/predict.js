const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const mlController = require('../controllers/mlController');

const PRICE_DATA_PATH = path.join(__dirname, '../../frontend/public/crop_price_dataset.json');

const CROP_ALIASES = {
    paddy: 'rice',
    corn: 'maize',
    maize: 'maize',
    jaggery: 'sugarcane',
    sugarcane: 'sugarcane',
    bajra: 'pearl millet',
    bajri: 'pearl millet',
    jowar: 'sorghum',
    chilli: 'chilli',
    chili: 'chilli',
    moong: 'mungbean',
    tur: 'pigeonpeas',
    urad: 'blackgram',
    lentil: 'lentil',
    copra: 'coconut'
};

const normalizeCropName = (cropName) => {
    if (!cropName) return '';
    const lower = cropName.trim().toLowerCase();
    return CROP_ALIASES[lower] || lower;
};

const loadLocalPriceData = () => {
    try {
        return JSON.parse(fs.readFileSync(PRICE_DATA_PATH, 'utf8'));
    } catch (error) {
        console.error("❌ Local price dataset load failed:", error.message);
        return [];
    }
};

const getSearchTokens = (text) => text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

const scoreCommodity = (searchTokens, commodityName) => {
    const name = commodityName.toLowerCase();
    let score = 0;
    searchTokens.forEach((token) => {
        if (name === token) score += 20;
        if (name.includes(token)) score += 10;
        if (name.startsWith(token)) score += 5;
    });
    return score;
};

const selectLatestPrice = (records) => {
    if (!records || records.length === 0) return null;
    records.sort((a, b) => new Date(b.month) - new Date(a.month));
    const latest = records[0];
    const currentPrice = Math.round(latest.avg_modal_price || latest.avg_max_price || latest.avg_min_price || 0);
    const trendValue = typeof latest.change === 'number' ? latest.change : 0;
    return {
        currentPrice,
        predictedPrice: Math.round(currentPrice + (trendValue / 100) * currentPrice),
        trend: `${trendValue >= 0 ? '+' : ''}${trendValue.toFixed(1)}%`,
        advice: `Based on latest market data for ${latest.commodity_name}.`
    };
};

const findLocalPricePrediction = (cropName) => {
    const normalized = normalizeCropName(cropName);
    if (!normalized) return null;

    const data = loadLocalPriceData();
    if (data.length === 0) return null;

    const exactMatches = data.filter((item) => item.commodity_name?.toLowerCase().includes(normalized));
    if (exactMatches.length > 0) return selectLatestPrice(exactMatches);

    const searchTokens = getSearchTokens(normalized);
    const uniqueNames = [...new Set(data.map((item) => item.commodity_name).filter(Boolean))];
    const scored = uniqueNames
        .map((name) => ({ name, score: scoreCommodity(searchTokens, name) }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score);

    if (scored.length > 0) {
        const topNames = scored.slice(0, 3).map((item) => item.name);
        const matched = data.filter((item) => topNames.includes(item.commodity_name));
        return selectLatestPrice(matched);
    }

    return null;
};

// 🟢 Multer Setup
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// 🟢 AI రిస్పాన్స్ ని JSON గా మార్చే హెల్పర్
const safeParseJSON = (text) => {
    try {
        const cleaned = text.replace(/```json|```/g, "").trim();
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("❌ JSON Parse Error:", e.message);
        return null;
    }
};

// --- ROUTES ---

// 1. CROP PREDICTION
router.post('/crop', mlController.getRecommendation);

// 2. SOIL ANALYSIS
router.post('/soil', mlController.analyzeSoil);

// 3. PEST PREDICTION
router.post('/pest-gemini', upload.single('image'), mlController.detectPestWithGemini);

// 4. PRICE PREDICTION
router.post('/price', async (req, res) => {
    try {
        const { crop, cropName } = req.body;
        const finalCropName = crop || cropName; 

        if (!finalCropName) {
            return res.status(400).json({ 
                success: false, 
                message: "పంట పేరు అందలేదు. మళ్లీ ప్రయత్నించండి." 
            });
        }

        const localPrice = findLocalPricePrediction(finalCropName);
        if (localPrice) {
            return res.json({ success: true, ...localPrice });
        }

        // Fallback to AI-based price prediction when local dataset has no match.
        return mlController.predictPrice(req, res);

    } catch (error) {
        console.error("❌ Price Error:", error.message);
        res.status(500).json({ success: false, message: "సర్వర్ లో సమస్య ఉంది." });
    }
});

module.exports = router;