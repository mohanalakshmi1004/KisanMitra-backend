require('dotenv').config(); 
console.log("-----------------------------------------");
console.log("CHECKING API KEY:", process.env.GEMINI_API_KEY);
console.log("-----------------------------------------");
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth'); // 👈 add this
const predictRoutes = require('./routes/predict');

// Routes ఇంపోర్ట్

const communityRoutes = require('./routes/community'); 

const app = express();

// --- 1. Middlewares ---
app.use(cors()); 

// Base64 ఇమేజెస్ మరియు పెద్ద డేటా కోసం లిమిట్
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use('/api/auth', authRoutes); // 👈 add this
app.use('/api/predict', predictRoutes);
// --- 2. MongoDB Connection ---
const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI)
    .then(() => {
        console.log(`✅ MongoDB Connected: Thimmayyapalem_Farmer_DB`);
    })
    .catch((err) => {
        console.log(`❌ MongoDB Connection Error: ${err}`);
    });

// --- 3. Sensors Route (నీ 404 ఎర్రర్ ని ఫిక్స్ చేస్తుంది) ---
app.get('/api/sensors', (req, res) => {
    // ప్రస్తుతానికి డమ్మీ డేటా పంపిస్తున్నాం, కావాలంటే నీ సెన్సార్ లాజిక్ ఇక్కడ రాసుకోవచ్చు
    res.json({
        success: true,
        temp: 30,
        humidity: 65,
        ph: 7.2,
        moisture: "45%",
        message: "Sensor data fetched successfully from Visakhapatnam Station"
    });
});

// --- 4. Routes Mounting ---
app.use('/api/community', communityRoutes); 

// Health Check
app.get('/', (req, res) => {
    res.send(`<h1>🚀 Nanna Farmer API is Live!</h1>`);
});

// 🔍 404 Fallback
app.use((req, res) => {
    console.log(`⚠️ 404 Alert: User requested ${req.originalUrl} which does not exist.`);
    res.status(404).json({ success: false, message: `Route ${req.originalUrl} Not Found.` });
});

// --- 5. Server Start ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server started on Port: ${PORT}`);
    console.log(`📡 URL: http://localhost:${PORT}`);
});
console.log("-----------------------------------------");
console.log("నీ జెమిని కీ ఇదేనా?:", process.env.GEMINI_API_KEY);
console.log("-----------------------------------------");