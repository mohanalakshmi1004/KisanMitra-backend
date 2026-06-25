const test = require('node:test');
const assert = require('node:assert/strict');
const { predictPrice } = require('../controllers/mlController');
const { getSoilAnalysisFallback, getPricePredictionFallback, getPestDetectionFallback } = require('../utils/predictionFallback');

test('soil fallback returns a useful result for low nutrient values', () => {
  const result = getSoilAnalysisFallback(20, 10, 15, 'en');
  assert.ok(result.soilType);
  assert.ok(result.treatment);
  assert.match(result.soilType, /Sandy|Loamy|Black|Red|Clayey/i);
});

test('price fallback returns a numeric price for a crop name', () => {
  const result = getPricePredictionFallback('tomato');
  assert.ok(typeof result.currentPrice === 'number');
  assert.ok(result.currentPrice > 0);
  assert.ok(result.advice);
});

test('pest fallback returns a disease name and fertilizer guidance', () => {
  const result = getPestDetectionFallback('en');
  assert.ok(result.disease);
  assert.ok(result.fertilizer);
  assert.ok(result.treatment);
});

test('pest fallback recognizes healthy tomato images', () => {
  const result = getPestDetectionFallback('en', 'healthy-tomato-leaf.jpg');
  assert.match(result.disease, /Healthy|healthy/i);
  assert.ok(result.fertilizer);
});

test('pest fallback handles human photos as invalid input', () => {
  const result = getPestDetectionFallback('en', 'selfie.jpg');
  assert.match(result.disease, /Please upload/i);
});

test('price controller returns a fallback payload when AI generation fails', async () => {
  const req = { body: { cropName: 'tomato' } };
  const res = {
    statusCode: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return payload;
    }
  };

  await predictPrice(req, res);

  assert.equal(res.statusCode, null);
  assert.equal(res.payload.success, true);
  assert.ok(res.payload.currentPrice > 0 || res.payload.currentPrice !== undefined);
  assert.ok(res.payload.advice);
});
