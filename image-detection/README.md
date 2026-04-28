1.External Search (Main Pipeline)
POST http://localhost:5000/external-search
body->form-data
key-image value- one image file of 512 dimension
Output:
{
  "detected_entity": "lionel messi",
  "queries_used": [...],
  "matches": [
    {
      "url": "...",
      "similarity": 87.5,
      "piracy": "HIGH ⚠️"
    }
  ]
}


2.Embedding endpoint- gives you the end-points of the image 
http://127.0.0.1:8000/embed?file
body->form-data
key-image value- one image file of 512 dimension



🚀 How to Run
1. Install dependencies
npm install
2. Set environment variables
GEMINI_API_KEY=your_key
SERP_API_KEY=your_key
3. Start server
node backend/server.js
python ml-service/app.py
Server runs at:
http://localhost:5000/external-search


CORS configuration in server.js running on 5000 port and CORS is configured for all region.
