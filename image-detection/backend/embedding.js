const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

// Get embedding from Python CLIP service
async function getEmbedding(imagePath) {
    try {
        const form = new FormData();

        form.append('image', fs.createReadStream(imagePath));

        const response = await axios.post(
            'http://localhost:8000/embed',
            form,
            {
                headers: form.getHeaders(),
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            }
        );

        return response.data.embedding;

    } catch (error) {
        console.error("❌ Error calling CLIP service:", error.message);
        throw error;
    }
}

module.exports = { getEmbedding };