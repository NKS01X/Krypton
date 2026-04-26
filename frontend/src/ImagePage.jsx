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
          <div style={{ marginTop: "20px", textAlign: "left" }}>
            {results.matches?.map((item, i) => (
              <div key={i} className="card" style={{ padding: "12px", marginBottom: "12px" }}>
                <img src={item.url} style={{ width: "100%", borderRadius: "8px", marginBottom: "8px" }} />
                <p>Similarity: {item.similarity}%</p>
                <p>{item.piracy}</p>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}