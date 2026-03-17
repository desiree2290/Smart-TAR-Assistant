import React, { useEffect, useState } from "react";
import {
    ResponsiveContainer,
    LineChart,
    Line,
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
    const [metrics, setMetrics] = useState(null);
    const [error, setError] = useState("");
    const [requestStats, setRequestStats] = useState(null);

    useEffect(() => {
        Promise.all([
            fetch("/analytics/model-metrics").then((res) => {
                if (!res.ok) throw new Error("Failed to load model metrics");
                return res.json();
            }),
            fetch("/analytics/request-stats").then((res) => {
                if (!res.ok) throw new Error("Failed to load request stats");
                return res.json();
            }),
        ])
            .then(([metricsData, statsData]) => {
                setMetrics(metricsData);
                setRequestStats(statsData);
                setError("");
            })
            .catch((err) => {
                console.error(err);
                setError("Unable to load analytics data.");
                setMetrics(null);
                setRequestStats(null);
            });
    }, []); 

    if (error) {
        return (
            <div style={styles.page}>
                <div style={styles.header}>
                    <h2 style={styles.pageTitle}>AI Review Analytics</h2>
                    <p style={styles.pageSubtitle}>{error}</p>
                </div>
            </div>
        );
    }

    if (!metrics || !requestStats) {
        return (
            <div style={styles.page}>
                <div style={styles.header}>
                    <h2 style={styles.pageTitle}>AI Review Analytics</h2>
                    <p style={styles.pageSubtitle}>Loading analytics...</p>
                </div>
            </div>
        );
    }

    const metricCards = [
        { label: "Accuracy", value: metrics.accuracy?.toFixed(2) ?? "—" },
        { label: "F1 Score", value: metrics.f1?.toFixed(2) ?? "—" },
        { label: "Precision", value: metrics.precision?.toFixed(2) ?? "—" },
        { label: "Recall", value: metrics.recall?.toFixed(2) ?? "—" },
    ];

    const liveRequestCards = [
        { label: "Total Requests", value: requestStats.total_requests ?? 0 },
        { label: "Submitted", value: requestStats.status_counts?.submitted ?? 0 },
        { label: "Approved", value: requestStats.status_counts?.approved ?? 0 },
        { label: "Kickback", value: requestStats.status_counts?.kickback ?? 0 },
    ];

    const lossData = metrics.loss_curve || [];
    const accuracyData = metrics.accuracy_curve || [];

    const classDistribution = [
        { name: "Approve", value: metrics.class_counts?.approve ?? 1000 },
        { name: "Clarify", value: metrics.class_counts?.clarify ?? 1000 },
        { name: "Hold", value: metrics.class_counts?.hold ?? 1000 },
    ];

    const labels = ["Approve", "Clarify", "Hold"];
    const rawMatrix = metrics.confusion_matrix || [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
    ];

    const confusionData = [];
    for (let i = 0; i < labels.length; i++) {
        for (let j = 0; j < labels.length; j++) {
            confusionData.push({
                actual: labels[i],
                predicted: labels[j],
                value: rawMatrix[i]?.[j] ?? 0,
            });
        }
    }

    const decisionColors = ["#059669", "#d97706", "#dc2626"];

    const maxValue = Math.max(...confusionData.map((d) => d.value), 1);

    function getCellColor(value) {
        const intensity = value / maxValue;
        const base = 220;
        const dark = 140;
        const shade = base - intensity * (base - dark);
        return `rgb(${shade}, ${shade + 10}, 255)`;
    }

    return (
        <div style={styles.page}>
            <div style={styles.header}>
                <h2 style={styles.pageTitle}>AI Review Analytics</h2>
                <p style={styles.pageSubtitle}>
                    Model evaluation visuals and system insights from Smart TAR Assistant.
                </p>
            </div>

            {/* Metric Cards */}
            <div style={styles.metricGrid}>
                {metricCards.map((m) => (
                    <div key={m.label} style={styles.metricCard}>
                        <div style={styles.metricLabel}>{m.label}</div>
                        <div style={styles.metricValue}>{m.value}</div>
                    </div>
                ))}
            </div>

            <div style={styles.metricGrid}>
                {liveRequestCards.map((m) => (
                    <div key={m.label} style={styles.metricCard}>
                        <div style={styles.metricLabel}>{m.label}</div>
                        <div style={styles.metricValue}>{m.value}</div>
                    </div>
                ))}
            </div>

            <div style={styles.grid}>
                {/* Confusion Matrix */}
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Confusion Matrix</h3>
                    <p style={styles.cardSubtitle}>
                        Predicted vs actual review outcomes.
                    </p>

                    <div style={styles.confusionWrapper}>
                        <div style={styles.confusionHeaderRow}>
                            <div style={styles.confusionCorner}></div>
                            <div style={styles.confusionHeader}>Approve</div>
                            <div style={styles.confusionHeader}>Clarify</div>
                            <div style={styles.confusionHeader}>Hold</div>
                        </div>

                        {labels.map((actual) => (
                            <div key={actual} style={styles.confusionRow}>
                                <div style={styles.confusionHeader}>{actual}</div>

                                {labels.map((predicted) => {
                                    const cell = confusionData.find(
                                        (d) =>
                                            d.actual === actual &&
                                            d.predicted === predicted
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
                                                fontWeight:
                                                    actual === predicted
                                                        ? 800
                                                        : 600,
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

                {/* Loss Chart */}
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>
                        Training vs Validation Loss
                    </h3>

                    <div style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={lossData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="epoch" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="train"
                                    stroke="#0f172a"
                                    strokeWidth={3}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="val"
                                    stroke="#94a3b8"
                                    strokeWidth={3}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Accuracy Chart */}
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>
                        Training vs Validation Accuracy
                    </h3>

                    <div style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={accuracyData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="epoch" />
                                <YAxis domain={[0, 1]} />
                                <Tooltip />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="train"
                                    stroke="#0f172a"
                                    strokeWidth={3}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="val"
                                    stroke="#94a3b8"
                                    strokeWidth={3}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                        
                {/* Class Distribution */}
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Class Distribution</h3>

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
                                        <Cell
                                            key={entry.name}
                                            fill={decisionColors[i]}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                

                {/* Explanation */}
                <div style={{ ...styles.card, gridColumn: "1 / -1" }}>
                    <h3 style={styles.cardTitle}>How to Read These Visuals</h3>

                    <div style={styles.noteBox}>
                        <div>
                            <b>Confusion Matrix:</b> shows where the model
                            predicts the correct class and where it confuses
                            classes.
                        </div>
                        <div>
                            <b>Loss Curves:</b> indicate model convergence or
                            potential overfitting.
                        </div>
                        <div>
                            <b>Accuracy Curves:</b> show predictive performance
                            improvements during training.
                        </div>
                        <div>
                            <b>Class Distribution:</b> confirms the balance of
                            training examples across review classes.
                        </div>
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
    },
    confusionWrapper: {
        display: "grid",
        gap: 8,
        paddingTop: 10,
        width: "100%",
        overflowX: "auto",
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
    },
    confusionCell: {
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