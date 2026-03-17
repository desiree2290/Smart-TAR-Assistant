import React from "react";
import {
    ResponsiveContainer,
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    PieChart,
    Pie,
    Cell,
    Legend,
} from "recharts";

export default function Analytics() {
    const metricCards = [
        { label: "Accuracy", value: "0.87" },
        { label: "F1 Score", value: "0.86" },
        { label: "Precision", value: "0.85" },
        { label: "Recall", value: "0.88" },
    ];

    const lossData = [
        { epoch: 1, train: 0.92, val: 0.98 },
        { epoch: 2, train: 0.71, val: 0.79 },
        { epoch: 3, train: 0.55, val: 0.64 },
        { epoch: 4, train: 0.42, val: 0.53 },
        { epoch: 5, train: 0.34, val: 0.47 },
        { epoch: 6, train: 0.28, val: 0.44 },
    ];

    const accuracyData = [
        { epoch: 1, train: 0.58, val: 0.55 },
        { epoch: 2, train: 0.67, val: 0.64 },
        { epoch: 3, train: 0.74, val: 0.71 },
        { epoch: 4, train: 0.81, val: 0.78 },
        { epoch: 5, train: 0.86, val: 0.84 },
        { epoch: 6, train: 0.89, val: 0.87 },
    ];

    const classDistribution = [
        { name: "Approve", value: 1000 },
        { name: "Clarify", value: 1000 },
        { name: "Hold", value: 1000 },
    ];

    // Flattened confusion matrix for display
    const confusionData = [
        { actual: "Approve", predicted: "Approve", value: 180 },
        { actual: "Approve", predicted: "Clarify", value: 15 },
        { actual: "Approve", predicted: "Hold", value: 5 },

        { actual: "Clarify", predicted: "Approve", value: 18 },
        { actual: "Clarify", predicted: "Clarify", value: 162 },
        { actual: "Clarify", predicted: "Hold", value: 20 },

        { actual: "Hold", predicted: "Approve", value: 4 },
        { actual: "Hold", predicted: "Clarify", value: 22 },
        { actual: "Hold", predicted: "Hold", value: 174 },
    ];

    const decisionColors = ["#059669", "#d97706", "#dc2626"];
    const maxValue = Math.max(
        ...confusionData.map((d) => d.value)
    );

    function getCellColor(value) {
        const intensity = value / maxValue;

        const base = 220;      // light
        const dark = 140;      // darker

        const shade = base - intensity * (base - dark);

        return `rgb(${shade}, ${shade + 10}, 255)`;
    }

    return (
        <div style={styles.page}>
            <div style={styles.header}>
                <h2 style={styles.pageTitle}>AI Review Analytics</h2>
                <p style={styles.pageSubtitle}>
                    Model evaluation visuals and system-level review insights from Smart TAR Assistant.
                </p>
            </div>

            <div style={styles.metricGrid}>
                {metricCards.map((m) => (
                    <div key={m.label} style={styles.metricCard}>
                        <div style={styles.metricLabel}>{m.label}</div>
                        <div style={styles.metricValue}>{m.value}</div>
                    </div>
                ))}
            </div>

            <div style={styles.grid}>
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Confusion Matrix</h3>
                    <p style={styles.cardSubtitle}>
                        Predicted classes versus actual classes across the three review outcomes.
                    </p>

                    <div style={styles.confusionWrapper}>
                        <div style={styles.confusionHeaderRow}>
                            <div style={styles.confusionCorner}></div>
                            <div style={styles.confusionHeader}>Approve</div>
                            <div style={styles.confusionHeader}>Clarify</div>
                            <div style={styles.confusionHeader}>Hold</div>
                        </div>

                        {["Approve", "Clarify", "Hold"].map((actual) => (
                            <div key={actual} style={styles.confusionRow}>
                                <div style={styles.confusionHeader}>{actual}</div>
                                {["Approve", "Clarify", "Hold"].map((predicted) => {
                                    const cell = confusionData.find(
                                        (d) => d.actual === actual && d.predicted === predicted
                                    );
                                    const value = cell ? cell.value : 0;

                                    return (
                                        <div
                                            key={`${actual}-${predicted}`}
                                            style={{
                                                ...styles.confusionCell,
                                                background: getCellColor(value),
                                                border:
                                                    actual === predicted
                                                        ? "2px solid #2563eb"
                                                        : "1px solid #e2e8f0",
                                                fontWeight: actual === predicted ? 800 : 600,
                                            }}
                                        >
                                            {value}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>

                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Training vs Validation Loss</h3>
                    <p style={styles.cardSubtitle}>
                        Used to inspect convergence and overfitting behavior during training.
                    </p>

                    <div style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={lossData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="epoch" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="train" stroke="#0f172a" strokeWidth={3} name="Train Loss" />
                                <Line type="monotone" dataKey="val" stroke="#94a3b8" strokeWidth={3} name="Validation Loss" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Training vs Validation Accuracy</h3>
                    <p style={styles.cardSubtitle}>
                        Tracks how predictive performance changed across epochs.
                    </p>

                    <div style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={accuracyData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="epoch" />
                                <YAxis domain={[0, 1]} />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="train" stroke="#0f172a" strokeWidth={3} name="Train Accuracy" />
                                <Line type="monotone" dataKey="val" stroke="#94a3b8" strokeWidth={3} name="Validation Accuracy" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Class Distribution</h3>
                    <p style={styles.cardSubtitle}>
                        Distribution of training examples across review classes.
                    </p>

                    <div style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={classDistribution}
                                    dataKey="value"
                                    nameKey="name"
                                    outerRadius={95}
                                    label
                                >
                                    {classDistribution.map((entry, i) => (
                                        <Cell key={entry.name} fill={decisionColors[i]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div style={{ ...styles.card, gridColumn: "1 / -1" }}>
                    <h3 style={styles.cardTitle}>How to Read These Visuals</h3>
                    <div style={styles.noteBox}>
                        <div><b>Confusion Matrix:</b> shows where the model predicts the correct review class and where it confuses classes.</div>
                        <div><b>Loss Curves:</b> help evaluate whether training stabilized or began overfitting.</div>
                        <div><b>Accuracy Curves:</b> show how model performance improved over time.</div>
                        <div><b>Class Distribution:</b> confirms whether the training data was balanced across Approve, Clarify, and Hold.</div>
                    </div>
                </div>
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
        marginBottom: 20,
    },
    pageTitle: {
        margin: 0,
        fontSize: 30,
    },
    pageSubtitle: {
        margin: "6px 0 0 0",
        color: "#475569",
        fontSize: 15,
    },
    metricGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 14,
        marginBottom: 18,
    },
    metricCard: {
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 18,
        padding: 18,
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
    },
    metricLabel: {
        fontSize: 13,
        color: "#64748b",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    metricValue: {
        fontSize: 30,
        fontWeight: 800,
        marginTop: 10,
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
        gap: 20,
    },
    card: {
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 18,
        padding: 18,
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
    },
    cardTitle: {
        margin: 0,
        fontSize: 20,
    },
    cardSubtitle: {
        margin: "6px 0 14px 0",
        color: "#475569",
        fontSize: 14,
        lineHeight: 1.5,
    },
    confusionWrapper: {
        display: "grid",
        gap: 8,
        paddingTop: 10,
        width: "100%",
        overflowX: "auto"
    },
    confusionHeaderRow: {
        display: "grid",
        gridTemplateColumns: "minmax(90px,120px) repeat(3,1fr)",
        gap: 8,
    },
    confusionRow: {
        display: "grid",
        gridTemplateColumns: "minmax(90px,120px) repeat(3,1fr)",
        gap: 8,
    },
    confusionCorner: {
        minHeight: 40,
    },
    confusionHeader: {
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        minHeight: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        color: "#334155",
        textAlign: "center",
        padding: 8,
    },
    confusionCell: {
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        minHeight: 54,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#0f172a",
    },
    noteBox: {
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 14,
        padding: 14,
        lineHeight: 1.7,
        color: "#334155",
    },
};