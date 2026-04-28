function cosineSimilarity(a, b) {
    const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);

    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

    return dot / (magA * magB);
}

function getPiracyLevel(score) {
    if (score > 0.9) return "HIGH";
    if (score > 0.7) return "MEDIUM";
    return "LOW";
}

module.exports = { cosineSimilarity, getPiracyLevel };