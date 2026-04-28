# 🎬 vid-piracy-frontend

✨ Modern AI Dashboard for Video Piracy Detection  
⚡ Real-time Processing & Smooth UI  
📊 Interactive Charts + AI Insights  
🌗 Dark / Light Theme Support  

A modern AI-powered dashboard for video piracy detection.  
Built as a real-time interactive UI that visualizes backend scan results with smooth animations, progressive loading, and explainable insights.

Works seamlessly with the backend system.

---

## Architecture Overview

User → Upload Video/URL → Processing UI → Results Dashboard → AI Insights

### Flow

1. User uploads video or pastes URL
2. Frontend calls backend /scan API
3. Shows real-time animated processing state
4. Polls backend using job_id
5. Displays results (scores, charts, insights)
6. Final output shows piracy risk clearly

---

## Key Features

### Three-Phase Flow

#### Upload
- Drag and drop interface
- URL input support
- Instant feedback

#### Processing
- Smooth progressive animation (0 → 100%)
- Live status updates (frame extraction, audio analysis, AI processing)
- Circular progress with animated score

#### Results Dashboard
- Composite piracy score

- Metric breakdown:
  - Video similarity
  - Audio similarity
  - Text/subtitle similarity
  - Metadata match

- Visualizations:
  - Detection timeline (line chart)
  - Segment analysis (bar chart)

---

### AI Insights Summary

- Highlights key observations (risk spikes, strong signals)
- Provides AI-based conclusion
- Helps users understand why content is flagged

---

### UI/UX Design

- Glassmorphism-based design
- Smooth transitions between phases
- Staggered card animations
- Hover interactions
- Clean spacing and alignment

---

### Theme Support

Supports both dark and light modes

#### Dark Mode
- Deep background
- Soft glow accents

#### Light Mode
- Clean white cards
- Subtle shadows

- Instant toggle without reload
- Consistent layout across themes

---

## Animation System

### Processing Animations
- Count-up numbers (0 → final %)
- Circular gauge fills smoothly

### Transitions
- Fade and scale between phases
- Staggered card entry
- Chart animations on load

### Micro Interactions
- Card hover lift
- Smooth transitions across UI

---

## Project Structure

vid-piracy-frontend/
  src/
    components/
      Upload/
      Processing/
      Dashboard/
      Charts/
      Insights/
    pages/
      Home.jsx
    hooks/
      usePolling.js
    services/
      api.js
    context/
      ThemeContext.js
    styles/
      globals.css
    App.jsx
  public/
  package.json
  README.md

---

## Tech Stack

- Framework: React / Next.js
- Styling: Tailwind CSS
- Animations: Framer Motion
- Charts: Recharts / Chart.js
- State: React Hooks / Context
- API Handling: Axios / Fetch

---

## API Integration

### Submit Scan
POST /api/v1/scan

### Get Result
GET /api/v1/scan/:id

### Flow
- Send request → receive job_id
- Poll periodically
- Update UI when status = done

---

## ------------Getting Started-------------------
### Install dependencies
npm install

### Run development server
npm run dev

### Configure API URL

Create .env file:

NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1

---

## Example Workflow

1. Paste video URL
2. Start scan
3. Processing animation runs
4. Dashboard displays results with insights

---

## Goals

- Make AI results easy to understand
- Provide explanation, not just numbers
- Deliver a smooth, product-level experience

---

## Future Improvements

- Interactive timeline
- Explainable AI panel
- Scan history dashboard
- Multi-video comparison

---

## License

MIT
