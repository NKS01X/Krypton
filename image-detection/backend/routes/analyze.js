const express = require('express');
const multer = require('multer');
const { generateQueries } = require('../gemini');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// ✅ Endpoint: analyze image → return queries
router.post('/', upload.single('image'), async (req, res) => {
    try {
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: "No image uploaded" });
        }

        console.log("🧠 Analyzing image with Gemini...");

        const queries = await generateQueries(file.path);

        res.json({
            message: "Image analyzed successfully",
            queries
        });

    } catch (err) {
        console.error("❌ Analyze error:", err);
        res.status(500).json({ error: "Analyze failed" });
    }
});

module.exports = router;