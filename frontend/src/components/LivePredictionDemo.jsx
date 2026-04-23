import React, { useState } from "react";

export default function LivePredictionDemo() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");

    const sampleRequest = {
        destination_city: "San Diego",
        start_date: "2026-04-15",
        end_date: "2026-04-19",
        justification: "Official travel for training and mission readiness support.",
        has_packet: 1,
        num_flags: 1,
        num_high_flags: 0,
        num_med_flags: 1,
        num_low_flags: 0,
    };

    async function runSamplePrediction() {
        setLoading(true);
        setError("");
        setResult(null);

        try {
            const response = await fetch("http://127.0.0.1:8000/api/predict", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(sampleRequest),
            });

            if (!response.ok) {
                throw new Error(`Prediction request failed: ${response.status}`);
            }

            const data = await response.json();
            setResult(data);
        } catch (err) {
            setError(err.message || "Prediction failed");
        } finally {
            setLoading(false);
        }
    }

    function resetDemo() {
        setResult(null);
        setError("");
        setLoading(false);
    }

    return (
        <div style={styles.card}>
            <h3 style={styles.title}>Live Prediction Demo</h3>
            <p style={styles.subtitle}>
                Run the trained model on a sample TAR request and view prediction outputs.
            </p>

            <button style={styles.button} onClick={runSamplePrediction} disabled={loading}>
                {loading ? "Running..." : "Run Model on Sample TAR"}
            </button>

            <button
                style={styles.resetButton}
                onClick={resetDemo}
                disabled={loading && !result}
            >
                Reset
            </button>

            {error && <p style={styles.error}>{error}</p>}

            {result && (
                <div style={styles.resultBox}>
                    <div><b>Prediction:</b> {result.prediction}</div>
                    <div><b>Confidence:</b> {result.confidence ?? "N/A"}</div>

                    <div style={{ marginTop: 12 }}>
                        <b>Class Probabilities:</b>
                        <pre style={styles.pre}>{JSON.stringify(result.probabilities, null, 2)}</pre>
                    </div>

                    <div style={{ marginTop: 12 }}>
                        <b>Why the model likely predicted this:</b>
                        <ul>
                            {result.explanations?.map((item, i) => (
                                <li key={i}>{item}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}

const styles = {
    card: {
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 18,
        padding: 20,
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
        marginBottom: 24,
    },
    title: {
        margin: 0,
        fontSize: 22,
        color: "#0f172a",
    },
    subtitle: {
        marginTop: 8,
        marginBottom: 16,
        color: "#475569",
        lineHeight: 1.6,
    },
    button: {
        background: "#0f172a",
        color: "#ffffff",
        border: "none",
        borderRadius: 12,
        padding: "12px 18px",
        fontWeight: 700,
        cursor: "pointer",
    },
    resultBox: {
        marginTop: 18,
        padding: 16,
        borderRadius: 12,
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        color: "#334155",
    },
    error: {
        color: "#b91c1c",
        marginTop: 12,
    },
    pre: {
        background: "#ffffff",
        padding: 12,
        borderRadius: 10,
        border: "1px solid #e2e8f0",
        overflowX: "auto",
    },
    buttonRow: {
        display: "flex",
        gap: 12,
        marginTop: 10,
    },

    resetButton: {
        background: "#e2e8f0",
        color: "#0f172a",
        border: "none",
        borderRadius: 12,
        padding: "12px 18px",
        fontWeight: 700,
        cursor: "pointer",
    },
};