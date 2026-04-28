const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { getEmbedding } = require('../embedding');
const { cosineSimilarity } = require('../similarity');
const { fetchImageUrls, downloadImage } = require('../externalSearch');
const { analyzeImage } = require('../gemini');

const router = express.Router();

// ✅ Ensure uploads folder exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// multer config
const upload = multer({ dest: uploadDir });

// delay to prevent overload
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// piracy level helper
const getPiracyLevel = (score) => {
    if (score > 85) return "HIGH ⚠️";
    if (score > 70) return "MEDIUM ⚠️";
    return "LOW";
};

router.post('/', upload.single('image'), async (req, res) => {
    let tempFiles = [];

    try {
        const inputImage = req.file;

        if (!inputImage) {
            return res.status(400).json({ error: "Please upload an image" });
        }

        console.log("📸 Processing input image...");

        // ✅ Step 1: Embedding
        const inputEmbedding = await getEmbedding(inputImage.path);

        // 🔥 Step 2: Gemini (ENTITY + QUERIES)
        const aiResult = await analyzeImage(inputImage.path);

        let queries = aiResult.queries || [];
        const entity = (aiResult.entity || "unknown").toLowerCase();

        console.log("🎯 Detected entity:", entity);
        console.log("🔍 Queries:", queries);

        // fallback
        if (!queries.length) {
            queries = [
                "football player",
                "sports image",
                "match highlight",
                "stadium action"
            ];
        }

        queries = queries.slice(0, 4);

        // ✅ Step 3: Fetch URLs
        let allUrls = [];

        for (let q of queries) {
            const urls = await fetchImageUrls(q);
            allUrls.push(...urls);
        }

        allUrls = [...new Set(allUrls)];

        console.log("🌍 URLs fetched:", allUrls.length);

        let results = [];

        // ✅ Step 4: Compare images
        for (let i = 0; i < Math.min(allUrls.length, 10); i++) {
            const url = allUrls[i];
            const filePath = path.join(uploadDir, `ext_${Date.now()}_${i}.jpg`);

            try {
                console.log("⬇️ Downloading:", url);

                await downloadImage(url, filePath);
                tempFiles.push(filePath);

                const emb = await getEmbedding(filePath);

                let similarity = cosineSimilarity(inputEmbedding, emb);
                let percentage = similarity * 100;

                // 🔥 SMART BOOST (ENTITY MATCH)
                if (entity !== "unknown" && url.toLowerCase().includes(entity)) {
                    console.log("⚡ Entity match boost applied");
                    percentage += 10;
                }

                // cap at 100
                if (percentage > 100) percentage = 100;

                console.log("📊 Similarity:", percentage.toFixed(2));

                results.push({
                    url,
                    similarity: Number(percentage.toFixed(2)),
                    piracy: getPiracyLevel(percentage)
                });

                await sleep(300);

            } catch (err) {
                console.log("❌ Skipping:", url);
            }
        }

        // ✅ Step 5: Sort
        results.sort((a, b) => b.similarity - a.similarity);

        // ✅ Step 6: Filter
        let filtered = results.filter(r => r.similarity > 30);

        if (filtered.length === 0) {
            console.log("⚠️ No strong matches, returning best guesses");
            filtered = results.slice(0, 3);
        }

        res.json({
            message: "External search completed",
            detected_entity: entity, // 🔥 NEW
            queries_used: queries,
            matches: filtered.slice(0, 5)
        });

    } catch (err) {
        console.error("❌ External search error:", err);
        res.status(500).json({ error: "External search failed" });
    } finally {
        // 🧹 CLEANUP
        try {
            tempFiles.forEach(file => {
                if (fs.existsSync(file)) fs.unlinkSync(file);
            });
        } catch (e) {
            console.log("⚠️ Cleanup failed");
        }
    }
});

module.exports = router;