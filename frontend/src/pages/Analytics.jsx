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
    BarChart,
    Bar,
    LabelList,
} from "recharts";

import FeatureTiles from "../components/FeatureTiles";
import LivePredictionDemo from "../components/LivePredictionDemo";

export default function Analytics() {
    

    const [metrics, setMetrics] = useState(null);
    const [requestStats, setRequestStats] = useState(null);
    const [flagStats, setFlagStats] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        Promise.all([
            fetch("http://127.0.0.1:8000/api/analytics/model-metrics").then((res) => {
                if (!res.ok) throw new Error("Failed to load model metrics");
                return res.json();
            }),
            fetch("http://127.0.0.1:8000/api/analytics/request-stats").then((res) => {
                if (!res.ok) throw new Error("Failed to load request stats");
                return res.json();
            }),
            fetch("http://127.0.0.1:8000/api/analytics/flag-breakdown").then((res) => {
                if (!res.ok) throw new Error("Failed to load flag breakdown");
                return res.json();
            }),
        ])
            .then(([metricsData, statsData, flagData]) => {
                setMetrics(metricsData);
                setRequestStats(statsData);
                setFlagStats(flagData);
                setError("");
            })
            .catch((err) => {
                console.error(err);
                setError("Unable to load analytics data.");
                setMetrics(null);
                setRequestStats(null);
                setFlagStats(null);
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

    if (!metrics || !requestStats || !flagStats) {
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
        {
            label: "Accuracy",
            value: metrics?.summary?.accuracy?.toFixed(2) ?? "—",
        },
        {
            label: "F1 Score",
            value: metrics?.summary?.f1_score?.toFixed(2) ?? "—",
        },
        {
            label: "Precision",
            value: metrics?.summary?.precision?.toFixed(2) ?? "—",
        },
        {
            label: "Recall",
            value: metrics?.summary?.recall?.toFixed(2) ?? "—",
        },
    ];
    const liveRequestCards = [
        { label: "Total Requests", value: requestStats.total_requests ?? 0 },
        { label: "Submitted", value: requestStats.status_counts?.submitted ?? 0 },
        { label: "Approved", value: requestStats.status_counts?.approved ?? 0 },
        { label: "Kickback", value: requestStats.status_counts?.kickback ?? 0 },
    ];

    const curves = metrics?.training_curves;
    console.log("metrics:", metrics);
    console.log("curves:", curves);

    const classDistribution = [
        { name: "Approve", value: metrics?.class_counts?.approve ?? 0 },
        { name: "Clarify", value: metrics?.class_counts?.clarify ?? 0 },
        { name: "Hold", value: metrics?.class_counts?.hold ?? 0 },
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
    const maxConfusionValue = Math.max(...confusionData.map((d) => d.value), 1);

    function getCellColor(value) {
        const intensity = value / maxConfusionValue;
        const base = 220;
        const dark = 140;
        const shade = base - intensity * (base - dark);
        return `rgb(${shade}, ${shade + 10}, 255)`;
    }

    const topFlags = (flagStats.flag_breakdown || []).slice(0, 7);
    const maxFlagValue = Math.max(...topFlags.map((d) => d.value), 1);

    function formatFlagLabel(name) {
        const clean = String(name || "")
            .replaceAll("_", " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
        return clean.length > 16 ? `${clean.slice(0, 16)}...` : clean;
    }

    function getBarColor(value) {
        const intensity = value / maxFlagValue;
        return `rgba(51, 65, 85, ${0.5 + intensity * 0.5})`;
    }

    const topDestinations = requestStats.top_destinations || [];

    return (
        <div style={styles.page}>
            <div style={styles.header}>
                <h2 style={styles.pageTitle}>AI Review Analytics</h2>
                <p style={styles.pageSubtitle}>
                    Model evaluation visuals and live Smart TAR workflow insights.
                </p>
            </div>

            <LivePredictionDemo />
            
            <FeatureTiles /> 

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
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Confusion Matrix</h3>
                    <p style={styles.cardSubtitle}>
                        Predicted versus actual review outcomes.
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
                        Indicates convergence behavior and possible overfitting.
                    </p>

                    <div style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                                data={
                                    curves?.epochs?.map((epoch, i) => ({
                                        epoch,
                                        train: curves.train_loss[i],
                                        val: curves.val_loss?.[i],
                                    })) || []
                                }
                            >
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
                                    name="Train Loss"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="val"
                                    stroke="#94a3b8"
                                    strokeWidth={3}
                                    name="Validation Loss"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Training vs Validation Accuracy</h3>
                    <p style={styles.cardSubtitle}>
                        Shows predictive performance improvement over epochs.
                    </p>

                    <div style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                                data={
                                    curves?.epochs?.map((epoch, i) => ({
                                        epoch,
                                        train: curves.train_accuracy[i],
                                        val: curves.val_accuracy?.[i],
                                    })) || []
                                }
                            >
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
                                    name="Train Accuracy"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="val"
                                    stroke="#94a3b8"
                                    strokeWidth={3}
                                    name="Validation Accuracy"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Class Distribution</h3>
                    <p style={styles.cardSubtitle}>
                        Balance of training examples across review classes.
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

                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Top Destinations</h3>
                    <p style={styles.cardSubtitle}>
                        Most common travel destinations across Smart TAR requests.
                    </p>

                    <div style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topDestinations}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="value" fill="#0f172a" radius={[8, 8, 0, 0]}>
                                    <LabelList dataKey="count" position="top" />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Flag Frequency</h3>
                    <p style={styles.cardSubtitle}>
                        Most common discrepancy types detected by the Smart TAR review engine.
                    </p>

                    {topFlags.length > 0 && (
                        <div style={styles.insightBox}>
                            Most common issue:{" "}
                            <b>
                                {String(topFlags[0].name || "")
                                    .replaceAll("_", " ")
                                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                            </b>{" "}
                            ({topFlags[0].value})
                        </div>
                    )}

                    <div style={{ height: 340 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topFlags}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="name"
                                    tickFormatter={formatFlagLabel}
                                    interval={0}
                                    angle={-30}
                                    textAnchor="end"
                                    height={90}
                                />
                                <YAxis />
                                <Tooltip
                                    formatter={(value) => [value, "Count"]}
                                    labelFormatter={(label) =>
                                        String(label || "")
                                            .replaceAll("_", " ")
                                            .replace(/\b\w/g, (c) => c.toUpperCase())
                                    }
                                />
                                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                                    {topFlags.map((entry, index) => (
                                        <Cell key={index} fill={getBarColor(entry.value)} />
                                    ))}
                                    <LabelList dataKey="value" position="top" />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div style={{ ...styles.card, gridColumn: "1 / -1" }}>
                    <h3 style={styles.cardTitle}>How to Read These Visuals</h3>
                    <div style={styles.noteBox}>
                        <div>
                            <b>Confusion Matrix:</b> shows where the model predicts the
                            correct class and where it confuses classes.
                        </div>
                        <div>
                            <b>Loss Curves:</b> indicate model convergence and possible
                            overfitting.
                        </div>
                        <div>
                            <b>Accuracy Curves:</b> show predictive performance improvements
                            during training.
                        </div>
                        <div>
                            <b>Top Destinations:</b> highlights the most common travel
                            locations in Smart TAR activity.
                        </div>
                        <div>
                            <b>Flag Frequency:</b> shows which discrepancy types are most
                            often detected by the review engine.
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
        lineHeight: 1.5,
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
        textAlign: "center",
        padding: 8,
    },
    confusionCell: {
        borderRadius: 12,
        minHeight: 54,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#0f172a",
    },
    insightBox: {
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        color: "#334155",
        lineHeight: 1.5,
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