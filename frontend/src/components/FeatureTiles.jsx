import { useEffect, useState } from "react";

export default function FeatureTiles() {
    const [analytics, setAnalytics] = useState(null);
    const curves = analytics?.training_curves;
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadAnalytics() {
            try {
                const response = await fetch("http://127.0.0.1:8000/api/analytics");

                if (!response.ok) {
                    throw new Error(`Request failed: ${response.status}`);
                }

                const data = await response.json();
                setAnalytics(data);
            } catch (err) {
                setError(err.message || "Failed to load analytics");
            } finally {
                setLoading(false);
            }
        }

        loadAnalytics();
    }, []);

    const styles = {
        wrapper: {
            marginBottom: "24px",
        },
        title: {
            margin: "0 0 6px 0",
            fontSize: "28px",
            color: "#0f172a",
            fontFamily: "Arial, sans-serif",
        },
        subtitle: {
            margin: "0 0 18px 0",
            color: "#475569",
            fontSize: "15px",
            fontFamily: "Arial, sans-serif",
        },
        row: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "14px",
        },
        card: {
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "18px",
            padding: "18px",
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
            fontFamily: "Arial, sans-serif",
        },
        label: {
            fontSize: "13px",
            color: "#64748b",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: "10px",
        },
        value: {
            fontSize: "20px",
            fontWeight: 800,
            color: "#0f172a",
            lineHeight: 1.2,
        },
        message: {
            padding: "12px 0",
            fontFamily: "Arial, sans-serif",
            color: "#475569",
        },
    };

    if (loading) {
        return <div style={styles.message}>Loading analytics summary...</div>;
    }

    if (error) {
        return <div style={styles.message}>Error: {error}</div>;
    }

    if (!analytics) {
        return <div style={styles.message}>No analytics summary available.</div>;
    }

    const bestModel =
        (analytics?.model_metrics?.logistic_regression?.test_accuracy ?? 0) >=
            (analytics?.model_metrics?.random_forest?.test_accuracy ?? 0)
            ? "Logistic Regression"
            : "Random Forest";

    const accuracy =
        analytics?.model_metrics?.logistic_regression?.test_accuracy ?? null;

    return (
        <div style={styles.wrapper}>

            <div style={styles.row}>
                <div style={styles.card}>
                    <div style={styles.label}>Best Model</div>
                    <div style={styles.value}>{bestModel}</div>
                </div>
                <div style={styles.card}>
                    <div style={styles.label}>Accuracy</div>
                    <div style={styles.value}>
                        {accuracy !== null ? accuracy.toFixed(2) : "—"}
                    </div>
                </div>

                <div style={styles.card}>
                    <div style={styles.label}>Risk Insight</div>
                    <div style={styles.value}>Moderate</div>
                </div>
            </div>
        </div>
    );
}