const fs = require('fs');
const path = require('path');
const { getEmbedding } = require('./embedding');

const datasetPath = path.join(__dirname, 'dataset');
const outputFile = path.join(__dirname, 'embeddings.json');

async function generate() {
    const files = fs.readdirSync(datasetPath);

    let data = [];

    for (let file of files) {
        const filePath = path.join(datasetPath, file);

        console.log("Processing:", file);

        const embedding = await getEmbedding(filePath);

        data.push({
            image: file,
            embedding: embedding
        });
    }

    fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));

    console.log("✅ Embeddings saved!");
}

generate();