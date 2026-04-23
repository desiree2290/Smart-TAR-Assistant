import React from "react";

export default function MLLifecycle() {
    return (
        <div style={styles.page}>
            <div style={styles.header}>
                <h2 style={styles.title}>ML Lifecycle Overview</h2>
                <p style={styles.subtitle}>
                    This page summarizes how the Smart TAR Assistant demonstrates an end-to-end machine learning workflow.
                </p>
            </div>

            <div style={styles.grid}>
                <section style={styles.card}>
                    <h3 style={styles.cardTitle}>1. Problem Definition</h3>
                    <p style={styles.text}>
                        Smart TAR Assistant helps reviewers assess travel authorization requests by combining rule-based checks,
                        risk scoring, and machine learning predictions to support faster and more explainable review decisions.
                    </p>
                </section>

                <section style={styles.card}>
                    <h3 style={styles.cardTitle}>2. End-to-End Data Flow</h3>
                    <div style={styles.flowBox}>
                        <div>User submits TAR request</div>
                        <div style={styles.arrow}>↓</div>
                        <div>System extracts structured features</div>
                        <div style={styles.arrow}>↓</div>
                        <div>ML model predicts Approve / Clarify / Hold</div>
                        <div style={styles.arrow}>↓</div>
                        <div>Results are exposed through FastAPI</div>
                        <div style={styles.arrow}>↓</div>
                        <div>React dashboard visualizes metrics and insights</div>
                    </div>
                </section>

                <section style={styles.card}>
                    <h3 style={styles.cardTitle}>3. Features Used by the Model</h3>
                    <ul style={styles.list}>
                        <li>Trip length in days</li>
                        <li>Number of rule-based flags</li>
                        <li>Justification length</li>
                        <li>Destination city</li>
                        <li>Risk score</li>
                        <li>Supporting packet presence</li>
                    </ul>
                </section>

                <section style={styles.card}>
                    <h3 style={styles.cardTitle}>4. Model Development</h3>
                    <p style={styles.text}>
                        Logistic Regression and Random Forest achieved similar performance on the test set (0.77 vs 0.76 accuracy).
                        Given the marginal difference, Logistic Regression was selected due to its interpretability and lower risk of
                        overfitting compared to more complex models.
                    </p>
                    <div style={styles.metricRow}>
                        <div style={styles.metricCard}>
                            <div style={styles.metricLabel}>Logistic Regression</div>
                            <div style={styles.metricValue}>Test Accuracy: 0.77</div>
                        </div>
                        <div style={styles.metricCard}>
                            <div style={styles.metricLabel}>Random Forest</div>
                            <div style={styles.metricValue}>Test Accuracy: 0.76</div>
                        </div>
                    </div>
                </section>

                <section style={styles.card}>
                    <h3 style={styles.cardTitle}>5. Iteration Story</h3>
                    <ul style={styles.list}>
                        <li>Baseline model established initial performance.</li>
                        <li>Feature engineering improved model usefulness and interpretability.</li>
                        <li>Additional evaluation showed Random Forest overfit compared to Logistic Regression.</li>
                        <li>Dashboard analytics were added to communicate model behavior visually.</li>
                    </ul>
                </section>

                <section style={styles.card}>
                    <h3 style={styles.cardTitle}>6. Real vs Simulated Components</h3>
                    <ul style={styles.list}>
                        <li>Real: frontend app, backend API, routing, metrics endpoints, dashboard rendering</li>
                        <li>Real: model comparison logic and integration structure</li>
                        <li>Simulated: some analytics values used to create a realistic demo narrative</li>
                        <li>Goal: demonstrate full ML lifecycle and system design, not production deployment</li>
                    </ul>
                </section>
            </div>
        </div>
    );
}

const styles = {
    page: {
        padding: 24,
        maxWidth: 1200,
        margin: "0 auto",
        fontFamily: "Arial, sans-serif",
        color: "#0f172a",
        background: "#f8fafc",
        minHeight: "100vh",
    },
    header: {
        marginBottom: 24,
    },
    title: {
        margin: 0,
        fontSize: 30,
    },
    subtitle: {
        marginTop: 8,
        color: "#475569",
        fontSize: 15,
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: 20,
    },
    card: {
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 18,
        padding: 20,
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
    },
    cardTitle: {
        margin: "0 0 12px 0",
        fontSize: 22,
    },
    text: {
        margin: 0,
        color: "#334155",
        lineHeight: 1.7,
    },
    list: {
        margin: 0,
        paddingLeft: 20,
        color: "#334155",
        lineHeight: 1.8,
    },
    flowBox: {
        display: "grid",
        gap: 8,
        color: "#334155",
        lineHeight: 1.6,
        fontWeight: 600,
    },
    arrow: {
        color: "#64748b",
        fontSize: 20,
    },
    metricRow: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 12,
        marginTop: 16,
    },
    metricCard: {
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: 14,
    },
    metricLabel: {
        fontSize: 13,
        color: "#64748b",
        fontWeight: 700,
        marginBottom: 6,
    },
    metricValue: {
        fontSize: 18,
        fontWeight: 800,
    },
};