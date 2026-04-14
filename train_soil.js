const tf = require('@tensorflow/tfjs');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// 1. Soil Types Labels
const SOIL_LABELS = ["Sandy", "Loamy", "Black", "Red", "Clayey"];

async function runSoilTraining() {
    const samples = [];
    const labels = [];
    const csvPath = path.join(__dirname, 'soildataset.csv'); // Soil dataset location

    fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row) => {
            // Kevalam Soil Dataset columns matrame load chestundi
            samples.push([
                parseFloat(row.Nitrogen), 
                parseFloat(row.Potassium), 
                parseFloat(row.Phosphorous)
            ]);
            
            const labelIndex = SOIL_LABELS.indexOf(row['Soil Type']);
            if (labelIndex !== -1) labels.push(labelIndex);
        })
        .on('end', async () => {
            const xs = tf.tensor2d(samples);
            const ys = tf.oneHot(tf.tensor1d(labels, 'int32'), 5);

            const model = tf.sequential();
            model.add(tf.layers.dense({ units: 32, activation: 'relu', inputShape: [3] }));
            model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
            model.add(tf.layers.dense({ units: 5, activation: 'softmax' }));

            model.compile({ optimizer: 'adam', loss: 'categoricalCrossentropy', metrics: ['accuracy'] });

            console.log("🚀 Soil Training started...");
            await model.fit(xs, ys, { epochs: 50 });

            // Patha model folder disturb avvakunda kotha folder name 'soil_ml_models'
            const modelDir = path.join(__dirname, 'soil_ml_models');
            if (!fs.existsSync(modelDir)) fs.mkdirSync(modelDir);

            const saveResult = await model.save(tf.io.withSaveHandler(async (artifacts) => artifacts));
            
            const modelInfo = {
                modelTopology: saveResult.modelTopology,
                weightSpecs: saveResult.weightSpecs,
                weightsManifest: [{ paths: ['./soil_weights.bin'], weights: saveResult.weightSpecs }]
            };
            
            fs.writeFileSync(path.join(modelDir, 'soil_model.json'), JSON.stringify(modelInfo));
            fs.writeFileSync(path.join(modelDir, 'soil_weights.bin'), Buffer.from(saveResult.weightData));

            console.log("✅ SUCCESS: Soil model ready in /soil_ml_models. Patha models safe!");
            process.exit();
        });
}
runSoilTraining();