import { useState, useRef } from "react";
import { motion } from "framer-motion";

export default function ImagePage() {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const fileRef = useRef(null);

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("http://localhost:5000/external-search", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  };

  return (
    <div className="input-phase">
      <motion.div
        className="card input-card"
        initial={{ opacity: 0, y: 32, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6 }}
      >
        {/* TITLE */}
        <h1>Image Piracy Detection</h1>
        <p className="subtitle">
          Upload an image to detect pirated content using AI similarity analysis
        </p>

        {/* DROPZONE (SAME STYLE AS VIDEO) */}
        {file ? (
          <div className="file-selected">
            <span>📎</span>
            <span>{file.name}</span>
            <button className="remove-file" onClick={() => setFile(null)}>
              ✕
            </button>
          </div>
        ) : (
          <div
            className={`dropzone ${dragActive ? "drag-active" : ""}`}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              const f = e.dataTransfer.files?.[0];
              if (f) setFile(f);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onClick={() => fileRef.current?.click()}
          >
            <div className="dropzone-icon">🖼️</div>
            <p className="dropzone-text">Drag & drop your image here</p>
            <p className="dropzone-hint">JPG, PNG, WEBP — up to 10MB</p>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setFile(f);
              }}
            />
          </div>
        )}

        {/* BUTTON */}
        <button
          className="btn-primary"
          disabled={!file || loading}
          onClick={handleUpload}
        >
          {loading ? "Scanning..." : "Start Scan"}
        </button>

        {/* RESULTS */}
        {results && (
  <div style={{ marginTop: "24px" }}>

    {/* 🔥 FINAL VERDICT */}
    {results.verdict && (
      <div className="card" style={{
        padding: "16px",
        marginBottom: "18px",
        background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
        color: "white",
        textAlign: "center",
        fontWeight: "600"
      }}>
        {results.verdict}
      </div>
    )}

    {/* 🔥 MATCH RESULTS */}
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
      gap: "16px"
    }}>

      {results.matches?.map((item, i) => (
        <div key={i} className="card card-hover" style={{ padding: "12px" }}>

          {/* IMAGE */}
          <img
            src={item.url}
            alt="match"
            style={{
              width: "100%",
              height: "180px",
              objectFit: "cover",
              borderRadius: "10px",
              marginBottom: "10px"
            }}
          />

          {/* TITLE */}
          <p style={{
            fontSize: "13px",
            fontWeight: "500",
            marginBottom: "6px",
            minHeight: "36px"
          }}>
            {item.title?.slice(0, 80) || "No title available"}
          </p>

          {/* SIMILARITY + RISK */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "6px"
          }}>
            <span style={{ color: "#a5b4fc" }}>
              {item.similarity}%
            </span>

            <span style={{
              color:
                item.similarity > 80 ? "#ef4444" :
                item.similarity > 60 ? "#f59e0b" :
                "#22c55e",
              fontWeight: "600"
            }}>
              {item.piracy}
            </span>
          </div>

          {/* 🔥 SOURCE */}
          <p style={{
            fontSize: "12px",
            color: "#94a3b8",
            marginBottom: "6px"
          }}>
            Source: <strong>{item.source}</strong>
          </p>

          {/* 🔥 LINK */}
          <a
            href={item.page}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: "12px",
              color: "#6366f1",
              textDecoration: "none",
              fontWeight: "500"
            }}
          >
            View Original ↗
          </a>

        </div>
      ))}

    </div>
  </div>
)}
      </motion.div>
    </div>
  );
}