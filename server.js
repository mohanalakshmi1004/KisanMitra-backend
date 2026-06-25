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
const mlController = require('./controllers/mlController');

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
app.post('/api/predict/soil', mlController.analyzeSoil);

/** 
 * PEST DETECTION (GEMINI VISION) 
 */
app.post('/api/predict/pest-gemini', upload.single('image'), mlController.detectPestWithGemini);

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

const mongoUri = process.env.MONGO_URI || process.env.MONGO_URI_LOCAL || 'mongodb://127.0.0.1:27017/nanna_farmer';

const connectMongo = async (uri) => {
    try {
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log(`✅ MongoDB Connected: ${uri}`);
    } catch (err) {
        console.warn(`⚠️ MongoDB Connection Error: ${err.message}`);
        console.warn('⚠️ Continuing without MongoDB. Database-backed routes may fail until MongoDB is reachable.');
    }
};

connectMongo(mongoUri);

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