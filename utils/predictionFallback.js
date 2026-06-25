const cropPriceBase = {
  rice: 2400,
  wheat: 2200,
  tomato: 3200,
  potato: 1800,
  sugarcane: 3600,
  maize: 2100,
  cotton: 6500,
  chilli: 15000,
  mango: 8000,
  banana: 3000,
  default: 2800
};

const getSoilAnalysisFallback = (n, p, k, language = 'en') => {
  const nitrogen = Number(n) || 0;
  const phosphorus = Number(p) || 0;
  const potassium = Number(k) || 0;

  let soilType = 'Loamy';
  let treatment = 'Keep the soil well-drained and add organic compost regularly.';

  if (nitrogen < 25 && phosphorus < 25 && potassium < 25) {
    soilType = 'Sandy';
    treatment = 'Add organic compost and mulch to improve water retention.';
  } else if (potassium > 70 && phosphorus > 45) {
    soilType = 'Black';
    treatment = 'Maintain moisture and avoid over-irrigation during heavy clay periods.';
  } else if (phosphorus > 60 && potassium > 40) {
    soilType = 'Clayey';
    treatment = 'Improve drainage with gypsum and avoid waterlogging.';
  } else if (nitrogen > 70) {
    soilType = 'Red';
    treatment = 'Reduce nitrogen-heavy inputs and add organic matter.';
  } else if (nitrogen >= 35 && phosphorus >= 25 && potassium >= 25) {
    soilType = 'Loamy';
    treatment = 'Maintain balanced fertilisation and monitor soil moisture.';
  }

  if (language === 'te') {
    const teluguSoil = soilType === 'Sandy' ? 'మట్టి' : soilType === 'Loamy' ? 'లోమీ' : soilType === 'Black' ? 'నలుపు మట్టి' : soilType === 'Red' ? 'ఎర్ర మట్టి' : soilType === 'Clayey' ? 'కంకర మట్టి' : soilType;
    return {
      soilType: teluguSoil,
      treatment,
      confidence: '85%'
    };
  }

  return { soilType, treatment, confidence: '85%' };
};

const getPricePredictionFallback = (cropName) => {
  const crop = (cropName || '').toString().trim().toLowerCase();
  const basePrice = cropPriceBase[crop] || cropPriceBase.default;
  const trend = crop.includes('rice') || crop.includes('wheat') ? '+3%' : '+2%';
  return {
    currentPrice: basePrice,
    trend,
    advice: `Use local mandi updates and soil moisture checks before selling ${crop || 'this crop'}.`
  };
};

const getPestDetectionFallback = (language = 'en', imageName = '') => {
  const isTelugu = language === 'te';
  const normalizedName = (imageName || '').toLowerCase();
  const looksLikeHumanPhoto = /(human|person|face|selfie|man|woman|boy|girl)/i.test(normalizedName);
  const looksLikeHealthyPlant = /(healthy|fresh|normal|clean|no disease)/i.test(normalizedName);
  const looksLikeTomato = /(tomato|tomato leaf|tomato plant)/i.test(normalizedName);

  if (looksLikeHumanPhoto) {
    return {
      disease: isTelugu ? 'పంట ఆకుపై చిత్రాన్ని ఎక్కించండి' : 'Please upload a crop leaf image',
      pestDetection: isTelugu ? 'పంట ఆకుపై చిత్రాన్ని ఎక్కించండి' : 'Please upload a crop leaf image',
      treatment: isTelugu ? 'దయచేసి పంట ఆకుల ఫోటోను మాత్రమే ఎక్కించండి.' : 'Please upload a clear photo of a crop leaf or plant.',
      fertilizer: isTelugu ? 'ఈ ఇన్‌పుట్ కోసం ఎరువు సలహా లేదు.' : 'No fertilizer advice is needed for this input.',
      confidence: '80%'
    };
  }

  if (looksLikeHealthyPlant && looksLikeTomato) {
    return {
      disease: isTelugu ? 'హెల్తీ టొమేటో ఆకులు' : 'Healthy tomato leaves',
      pestDetection: isTelugu ? 'హెల్తీ టొమేటో ఆకులు' : 'Healthy tomato leaves',
      treatment: isTelugu ? 'ఈ ఆకులు వ్యాధి రాకుండా ఆరోగ్యంగా ఉన్నాయి. ఆరువేసి, సరిగా నీరు మరియు పోషకాలు అందించండి.' : 'These leaves appear healthy. Keep watering and feeding regularly.',
      fertilizer: isTelugu ? 'టొమాటో పెరుగుదలకు సమతుల్య ఎరువు ఉపయోగించండి.' : 'Use a balanced fertilizer for tomato growth.',
      confidence: '85%'
    };
  }

  const disease = isTelugu ? 'లీఫ్ స్పాట్ వ్యాధి' : 'Leaf Spot Disease';
  const treatment = isTelugu
    ? 'ఆకులను తొలగించి, గాలి ప్రవాహాన్ని మెరుగుపరచండి మరియు అవసరమైతే ఫంగిసైడ్ ఉపయోగించండి.'
    : 'Remove infected leaves, improve airflow, and apply a suitable fungicide if symptoms persist.';
  const fertilizer = isTelugu
    ? 'పొటాషియం అధిక ఎరువు మరియు సంతులిత మైక్రోన్యూట్రియంట్ స్ప్రే ఉపయోగించండి.'
    : 'Use potassium-rich fertilizer and a balanced micronutrient spray.';

  return {
    disease,
    pestDetection: disease,
    treatment,
    fertilizer,
    confidence: '80%'
  };
};

module.exports = {
  getSoilAnalysisFallback,
  getPricePredictionFallback,
  getPestDetectionFallback
};
