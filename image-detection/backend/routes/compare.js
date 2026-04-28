const express = require('express');
const multer = require('multer');

const { getEmbedding } = require('../embedding');
const { cosineSimilarity, getPiracyLevel } = require('../similarity');

const router = express.Router();

// Store uploaded files in /uploads
const upload = multer({ dest: 'uploads/' });

router.post('/', upload.array('images', 2), async (req, res) => {
    try {
        const files = req.files;

        // ✅ Validate input
        if (!files || files.length !== 2) {
            return res.status(400).json({
                error: "Please upload exactly 2 images with key 'images'"
            });
        }

        const [img1, img2] = files;

        // 🔹 Get embeddings from CLIP service
        const emb1 = await getEmbedding(img1.path);
        const emb2 = await getEmbedding(img2.path);

        // 🔥 CLIP returns flat arrays → NO indexing
        const similarity = cosineSimilarity(emb1, emb2);

        const percentage = (similarity * 100).toFixed(2);

        res.json({
            similarity: percentage + "%",
            piracyLevel: getPiracyLevel(similarity)
        });

    } catch (err) {
        console.error("❌ Compare error:", err.message);
        res.status(500).json({
            error: "Error processing images"
        });
    }
});

module.exports = router;