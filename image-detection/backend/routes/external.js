const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { getEmbedding } = require('../embedding');
const { cosineSimilarity } = require('../similarity');
const { fetchImageUrls, downloadImage } = require('../externalSearch');
const { analyzeImage } = require('../gemini');

const router = express.Router();

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({ dest: uploadDir });

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

        // ✅ Embedding
        const inputEmbedding = await getEmbedding(inputImage.path);

        // ✅ Gemini
        const aiResult = await analyzeImage(inputImage.path);
        let queries = aiResult.queries || [];
        const entity = (aiResult.entity || "unknown").toLowerCase();

        if (!queries.length) {
            queries = [
                "football player",
                "sports image",
                "match highlight",
                "stadium action"
            ];
        }

        queries = queries.slice(0, 4);

        console.log("🔍 Queries:", queries);

        // ✅ Fetch URLs (NOW OBJECTS)
        let allItems = [];

        for (let q of queries) {
            const items = await fetchImageUrls(q);
            allItems.push(...items);
        }

        // remove duplicates
        const uniqueMap = new Map();
        allItems.forEach(item => {
            if (!uniqueMap.has(item.url)) {
                uniqueMap.set(item.url, item);
            }
        });

        allItems = Array.from(uniqueMap.values());

        console.log("🌍 Images fetched:", allItems.length);

        let results = [];

        // ✅ Compare
        for (let i = 0; i < Math.min(allItems.length, 10); i++) {
            const item = allItems[i];
            const url = item.url;

            const filePath = path.join(uploadDir, `ext_${Date.now()}_${i}.jpg`);

            try {
                await downloadImage(url, filePath);
                tempFiles.push(filePath);

                const emb = await getEmbedding(filePath);
                const similarity = cosineSimilarity(inputEmbedding, emb);

                let percentage = similarity * 100;

                // 🔥 Entity boost
                if (entity !== "unknown" && url.toLowerCase().includes(entity)) {
                    percentage += 10;
                }

                if (percentage > 100) percentage = 100;

                results.push({
                    url,
                    similarity: Number(percentage.toFixed(2)),
                    piracy: getPiracyLevel(percentage),
                    source: item.source,
                    title: item.title,
                    page: item.link
                });

                await sleep(200);

            } catch (err) {
                console.log("❌ Skipping:", url);
            }
        }

        // ✅ Sort
        results.sort((a, b) => b.similarity - a.similarity);

        // ✅ Filter
        let filtered = results.filter(r => r.similarity > 30);

        if (!filtered.length) {
            filtered = results.slice(0, 3);
        }

        // 🔥 FINAL VERDICT
        let verdict = "✅ CLEAN: No matching content found";

        if (filtered.some(r => r.similarity > 85)) {
            verdict = "🚨 HIGH RISK: Strong pirated matches found";
        } else if (filtered.some(r => r.similarity > 70)) {
            verdict = "⚠️ MEDIUM RISK: Potential reused content detected";
        } else if (filtered.length > 0) {
            verdict = "🟢 LOW RISK: Minor similarity detected";
        }

        res.json({
            message: "External search completed",
            detected_entity: entity,
            queries_used: queries,
            matches: filtered.slice(0, 5),
            verdict
        });

    } catch (err) {
        console.error("❌ Error:", err);
        res.status(500).json({ error: "External search failed" });
    } finally {
        tempFiles.forEach(file => {
            if (fs.existsSync(file)) fs.unlinkSync(file);
        });
    }
});

module.exports = router;