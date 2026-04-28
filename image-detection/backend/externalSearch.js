const axios = require('axios');
const fs = require('fs');

const API_KEY = process.env.SERP_API_KEY;

// 🔍 Fetch image URLs
async function fetchImageUrls(query) {
    try {
        const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&tbm=isch&api_key=${API_KEY}`;

        const response = await axios.get(url, {
            timeout: 10000 // 🔥 prevent hanging
        });

        const images = response.data.images_results || [];

        return images
            .slice(0, 5)
            .map(img => img.original)
            .filter(Boolean); // remove nulls

    } catch (err) {
        console.log("❌ Error fetching images for:", query);
        return [];
    }
}

// ⬇️ Download image
async function downloadImage(url, filename) {
    try {
        const writer = fs.createWriteStream(filename);

        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream',
            timeout: 10000, // 🔥 VERY IMPORTANT
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

    } catch (err) {
        throw new Error("Download failed");
    }
}

module.exports = { fetchImageUrls, downloadImage };