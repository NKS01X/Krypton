require('dotenv').config();
const express = require('express');
const cors = require('cors');

const compareRoute = require('./routes/compare');
const searchRoute = require('./routes/search');
const externalRoute = require('./routes/external');
const analyzeRoute = require('./routes/analyze'); // 🔥 Gemini route

const app = express();

app.use(cors());
app.use(express.json());
app.listen(5000,()=>console.log("Server running on port 5000") );
// ✅ Routes
app.use('/compare', compareRoute);
app.use('/search', searchRoute);
app.use('/external-search', externalRoute);
app.use('/analyze', analyzeRoute); // 🔥 NEW

// ✅ Health check
app.get('/', (req, res) => {
    res.send("🚀 Server is running");
});

// ✅ Start server
const PORT = 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
