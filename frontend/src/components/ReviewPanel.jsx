import React, { useMemo, useState } from "react";
import {
    ResponsiveContainer,
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

export default function ReviewPanel({ review, loading }) {
    const [activeTab, setActiveTab] = useState("summary");

    if (loading) {
        return (
            <div style={styles.card}>
                <h3 style={styles.cardTitle}>AI Review</h3>
                <div style={styles.emptyState}>Loading review...</div>
            </div>
        );
    }

    if (!review) {
        return (
            <div style={styles.card}>
                <h3 style={styles.cardTitle}>AI Review</h3>
                <div style={styles.emptyState}>
                    No review found yet. Submit the request to generate rule-based and ML review results.
                </div>
            </div>
        );
    }

    const ruleScore = review.rule_score ?? review.flags?.length ?? 0;
    const finalRiskScore = review.risk_score ?? 0;
    const riskLevel = review.risk_level ?? "unknown";
    const mlPrediction = review.ml_result?.ml_prediction ?? "n/a";
    const mlConfidence = review.ml_result?.ml_confidence ?? 0;

    const features = review.ml_result?.ml_features_used || {};
    const probabilities = review.ml_result?.ml_probabilities || [];

    const severityCounts = useMemo(() => {
        const counts = { HIGH: 0, MED: 0, LOW: 0 };
        (review.flags || []).forEach((f) => {
            const sev = String(f.severity || "").toUpperCase();
            if (sev === "HIGH") counts.HIGH += 1;
            else if (sev === "MED" || sev === "MEDIUM") counts.MED += 1;
            else if (sev === "LOW") counts.LOW += 1;
        });
        return counts;
    }, [review.flags]);

    const probabilityData = [
        { name: "Approve", value: Number(((probabilities[0] || 0) * 100).toFixed(1)) },
        { name: "Clarify", value: Number(((probabilities[1] || 0) * 100).toFixed(1)) },
        { name: "Hold", value: Number(((probabilities[2] || 0) * 100).toFixed(1)) },
    ];

    const severityPieData = [
        { name: "High", value: severityCounts.HIGH },
        { name: "Medium", value: severityCounts.MED },
        { name: "Low", value: severityCounts.LOW },
    ];

    const scoreComparisonData = [
        { name: "Rule Score", value: ruleScore },
        { name: "Final Risk Score", value: finalRiskScore },
    ];

    const pieColors = ["#dc2626", "#d97706", "#059669"];

    return (
        <div style={{ display: "grid", gap: 18 }}>
            <div style={styles.topGrid}>
                <MetricCard title="Rule Score" value={ruleScore} subtitle="Deterministic checks" tone="neutral" />
                <MetricCard title="Final Risk Score" value={finalRiskScore} subtitle="Rules + ML adjustment" tone={riskLevel} />
                <MetricCard title="ML Prediction" value={mlPrediction} subtitle="Predicted review action" tone={riskLevel} capitalize />
                <MetricCard
                    title="ML Confidence"
                    value={`${Math.round(mlConfidence * 100)}%`}
                    subtitle="Classifier confidence"
                    tone="neutral"
                />
            </div>

            <div style={styles.card}>
                <div style={styles.cardHeaderRow}>
                    <div>
                        <h3 style={styles.cardTitle}>AI Review Dashboard</h3>
                        <p style={styles.cardSubtitle}>
                            Hybrid review output combining rule-based analysis with machine learning support.
                        </p>
                    </div>
                    <div style={riskBadge(riskLevel)}>{riskLevel}</div>
                </div>

                <div style={styles.tabRow}>
                    <TabButton active={activeTab === "summary"} onClick={() => setActiveTab("summary")}>
                        Summary
                    </TabButton>
                    <TabButton active={activeTab === "flags"} onClick={() => setActiveTab("flags")}>
                        Flags
                    </TabButton>
                    <TabButton active={activeTab === "ml"} onClick={() => setActiveTab("ml")}>
                        ML Insights
                    </TabButton>
                    <TabButton active={activeTab === "raw"} onClick={() => setActiveTab("raw")}>
                        Raw JSON
                    </TabButton>
                </div>

                {activeTab === "summary" && (
                    <div style={styles.contentGrid}>
                        <div style={styles.sectionCard}>
                            <h4 style={styles.sectionTitle}>Summary</h4>
                            <ul style={styles.cleanList}>
                                {(review.summary || []).map((item, i) => (
                                    <li key={i} style={styles.listItem}>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div style={styles.sectionCard}>
                            <h4 style={styles.sectionTitle}>Reviewer Questions</h4>
                            {review.questions?.length ? (
                                <ul style={styles.cleanList}>
                                    {review.questions.map((q, i) => (
                                        <li key={i} style={styles.listItem}>
                                            {q}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div style={styles.goodText}>No follow-up questions ✅</div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === "flags" && (
                    <div style={styles.contentGrid}>
                        <div style={styles.sectionCard}>
                            <h4 style={styles.sectionTitle}>Flags Found</h4>
                            {review.flags?.length ? (
                                <div style={{ display: "grid", gap: 10 }}>
                                    {review.flags.map((f, i) => (
                                        <div key={i} style={styles.flagCard}>
                                            <div style={styles.flagHeader}>
                                                <span style={styles.flagType}>{f.type}</span>
                                                <span style={severityBadge(f.severity)}>{f.severity}</span>
                                            </div>
                                            <div style={styles.flagDesc}>{f.description}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={styles.goodText}>No flags ✅</div>
                            )}
                        </div>

                        <div style={styles.sectionCard}>
                            <h4 style={styles.sectionTitle}>Severity Breakdown</h4>
                            <div style={{ height: 280 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={severityPieData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={90}
                                            label
                                        >
                                            {severityPieData.map((entry, index) => (
                                                <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "ml" && (
                    <div style={styles.contentGrid}>
                        <div style={styles.sectionCard}>
                            <h4 style={styles.sectionTitle}>Prediction Probabilities</h4>
                            <div style={{ height: 280 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={probabilityData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis unit="%" />
                                        <Tooltip />
                                        <Bar dataKey="value" fill="#0f172a" radius={[8, 8, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div style={styles.sectionCard}>
                            <h4 style={styles.sectionTitle}>Rule vs Final Score</h4>
                            <div style={{ height: 280 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={scoreComparisonData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="value" fill="#334155" radius={[8, 8, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div style={{ ...styles.sectionCard, gridColumn: "1 / -1" }}>
                            <h4 style={styles.sectionTitle}>Model Features Used</h4>
                            <div style={styles.featureGrid}>
                                {Object.entries(features).map(([key, value]) => (
                                    <div key={key} style={styles.featureTile}>
                                        <div style={styles.featureLabel}>{formatFeatureLabel(key)}</div>
                                        <div style={styles.featureValue}>{String(value)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ ...styles.sectionCard, gridColumn: "1 / -1" }}>
                            <h4 style={styles.sectionTitle}>Why this result?</h4>
                            <div style={styles.explainerBox}>
                                <div>
                                    <b>Rule score:</b> {ruleScore}
                                </div>
                                <div>
                                    <b>ML prediction:</b> {mlPrediction}
                                </div>
                                <div>
                                    <b>Confidence:</b> {Math.round(mlConfidence * 100)}%
                                </div>
                                <div style={{ marginTop: 8, color: "#475569" }}>
                                    The final assessment blends structured discrepancy checks with the model’s predicted review action.
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "raw" && (
                    <div style={styles.sectionCard}>
                        <h4 style={styles.sectionTitle}>Raw Review Response</h4>
                        <pre style={styles.pre}>{JSON.stringify(review, null, 2)}</pre>
                    </div>
                )}
            </div>
        </div>
    );
}

function MetricCard({ title, value, subtitle, tone, capitalize }) {
    return (
        <div style={styles.metricCard}>
            <div style={styles.metricTitle}>{title}</div>
            <div style={{ ...styles.metricValue, ...metricTone(tone), textTransform: capitalize ? "capitalize" : "none" }}>
                {value}
            </div>
            <div style={styles.metricSubtitle}>{subtitle}</div>
        </div>
    );
}

function TabButton({ active, children, onClick }) {
    return (
        <button
            onClick={onClick}
            style={{
                ...styles.tabButton,
                ...(active ? styles.tabButtonActive : {}),
            }}
        >
            {children}
        </button>
    );
}

function severityBadge(severity) {
    const sev = String(severity || "").toUpperCase();

    if (sev === "HIGH") {
        return { ...styles.smallBadge, background: "#fef2f2", color: "#b91c1c" };
    }
    if (sev === "MED" || sev === "MEDIUM") {
        return { ...styles.smallBadge, background: "#fffbeb", color: "#b45309" };
    }
    return { ...styles.smallBadge, background: "#ecfdf3", color: "#047857" };
}

function riskBadge(level) {
    const l = String(level || "").toLowerCase();

    if (l === "high") {
        return { ...styles.riskBadge, background: "#fef2f2", color: "#b91c1c" };
    }
    if (l === "medium") {
        return { ...styles.riskBadge, background: "#fffbeb", color: "#b45309" };
    }
    return { ...styles.riskBadge, background: "#ecfdf3", color: "#047857" };
}

function metricTone(tone) {
    const t = String(tone || "").toLowerCase();

    if (t === "high") return { color: "#b91c1c" };
    if (t === "medium") return { color: "#b45309" };
    if (t === "low") return { color: "#047857" };
    return { color: "#0f172a" };
}

function formatFeatureLabel(key) {
    return key.replaceAll("_", " ");
}

const styles = {
    topGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 14,
    },
    metricCard: {
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 18,
        padding: 18,
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
    },
    metricTitle: {
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
    metricSubtitle: {
        marginTop: 6,
        color: "#64748b",
        fontSize: 13,
    },
    card: {
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 18,
        padding: 20,
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
    },
    cardHeaderRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
        marginBottom: 16,
    },
    cardTitle: {
        margin: 0,
        fontSize: 22,
    },
    cardSubtitle: {
        margin: "6px 0 0 0",
        color: "#475569",
        fontSize: 14,
    },
    riskBadge: {
        padding: "8px 14px",
        borderRadius: 999,
        fontWeight: 700,
        fontSize: 13,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    tabRow: {
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        marginBottom: 18,
    },
    tabButton: {
        border: "1px solid #cbd5e1",
        background: "#f8fafc",
        color: "#334155",
        padding: "10px 14px",
        borderRadius: 12,
        fontWeight: 600,
        cursor: "pointer",
    },
    tabButtonActive: {
        background: "#0f172a",
        color: "#ffffff",
        borderColor: "#0f172a",
    },
    contentGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: 16,
    },
    sectionCard: {
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 16,
        padding: 16,
    },
    sectionTitle: {
        margin: "0 0 12px 0",
        fontSize: 17,
    },
    cleanList: {
        margin: 0,
        paddingLeft: 18,
        color: "#1e293b",
    },
    listItem: {
        marginBottom: 8,
        lineHeight: 1.45,
    },
    goodText: {
        color: "#047857",
        fontWeight: 600,
    },
    flagCard: {
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 14,
        padding: 12,
    },
    flagHeader: {
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        alignItems: "center",
        marginBottom: 8,
    },
    flagType: {
        fontWeight: 700,
        color: "#0f172a",
        fontSize: 14,
    },
    flagDesc: {
        color: "#475569",
        lineHeight: 1.45,
        fontSize: 14,
    },
    smallBadge: {
        padding: "5px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: "nowrap",
    },
    featureGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: 12,
    },
    featureTile: {
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 14,
        padding: 12,
    },
    featureLabel: {
        fontSize: 12,
        color: "#64748b",
        textTransform: "uppercase",
        letterSpacing: 0.4,
        fontWeight: 700,
    },
    featureValue: {
        marginTop: 8,
        fontSize: 24,
        fontWeight: 800,
        color: "#0f172a",
    },
    explainerBox: {
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 14,
        padding: 14,
        lineHeight: 1.6,
        color: "#1e293b",
    },
    pre: {
        background: "#0f172a",
        color: "#e2e8f0",
        padding: 14,
        borderRadius: 12,
        overflowX: "auto",
        fontSize: 13,
    },
    emptyState: {
        color: "#475569",
        lineHeight: 1.5,
    },
};