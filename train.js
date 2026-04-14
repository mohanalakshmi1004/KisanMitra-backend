const handlePredict = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
        // ... (weather and api call) ...
        const response = await axios.post('http://localhost:5000/api/predict/crop', {
            n: Number(soilData.n), p: Number(soilData.p), k: Number(soilData.k), ph: Number(soilData.ph),
            temp: temp, humidity: humidity, rainfall: 100 
        });

        setResult({ 
            crop: response.data.recommendedCrop, 
            confidence: response.data.confidence, // ✅ No more static 92!
            insights: getDynamicInsights(soilData, temp, humidity),
            weather: { temp, humidity }
        });
    } catch (err) { alert("Error connecting to backend"); }
    setLoading(false);
};