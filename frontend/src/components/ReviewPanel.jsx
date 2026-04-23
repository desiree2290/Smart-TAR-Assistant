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

function safeJsonParse(value, fallback) {
    if (value == null) return fallback;
    if (typeof value !== "string") return value;
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

function normalizeReview(review) {
    const safeReview = review || {};

    const phase3 = safeJsonParse(safeReview.phase3_json, safeReview.phase3 || {});
    const mlFromJson = safeJsonParse(safeReview.ml_json, {});
    const extractedFromJson = safeJsonParse(
        safeReview.extracted_fields_json,
        safeReview.features_used || {}
    );
    const flagsFromJson = safeJsonParse(safeReview.flags_json, safeReview.flags || []);
    const questionsFromJson = safeJsonParse(
        safeReview.questions_json,
        safeReview.questions || []
    );

    const mlResult = safeReview.ml_result || {};

    const prediction =
        safeReview.prediction ??
        safeReview.ml_prediction ??
        mlResult.ml_prediction ??
        mlFromJson.prediction ??
        safeReview.final_action ??
        "n/a";

    const confidence =
        safeReview.confidence ??
        safeReview.ml_confidence ??
        mlResult.ml_confidence ??
        mlFromJson.confidence ??
        0;

    const probabilitiesRaw =
        safeReview.probabilities ??
        mlResult.ml_probabilities ??
        mlFromJson.probabilities ??
        {};

    let probabilities = {};
    if (Array.isArray(probabilitiesRaw)) {
        const labels = ["approve", "clarify", "hold"];
        probabilities = labels.reduce((acc, label, idx) => {
            acc[label] = Number(probabilitiesRaw[idx] || 0);
            return acc;
        }, {});
    } else {
        probabilities = probabilitiesRaw || {};
    }

    const summaryRaw =
        safeReview.summary ??
        safeReview.summary_text ??
        [];

    const summary = Array.isArray(summaryRaw)
        ? summaryRaw
        : summaryRaw
            ? [summaryRaw]
            : [];

    const flags = Array.isArray(flagsFromJson) ? flagsFromJson : [];
    const questions = Array.isArray(questionsFromJson) ? questionsFromJson : [];
    const extractedFields =
        extractedFromJson && typeof extractedFromJson === "object"
            ? extractedFromJson
            : {};

    const finalRiskScore = phase3.risk_score ?? safeReview.risk_score ?? 0;
    const riskLevel = phase3.risk_level ?? safeReview.risk_level ?? "unknown";
    const finalDecision =
        safeReview.final_action ??
        phase3.final_action ??
        prediction;

    const decisionExplanation =
        safeReview.decision_explanation ??
        phase3.decision_explanation ??
        [];

    return {
        raw: safeReview,
        phase3,
        mlResult,
        prediction,
        confidence,
        probabilities,
        summary,
        flags,
        questions,
        extractedFields,
        finalRiskScore,
        riskLevel,
        finalDecision,
        decisionExplanation,
    };
}

function ConfidenceGauge({ value }) {
    const percent = Math.round((Number(value) || 0) * 100);

    let color = "#047857";
    if (percent > 60 && percent <= 80) color = "#b45309";
    if (percent > 80) color = "#b91c1c";

    return (
        <div style={styles.gaugeContainer}>
            <div style={styles.gauge}>
                <div
                    style={{
                        ...styles.gaugeFill,
                        width: `${percent}%`,
                        background: color,
                    }}
                />
            </div>

            <div style={styles.gaugeLabel}>{percent}% confidence</div>
        </div>
    );
}

function DecisionBanner({ finalDecision, finalRiskScore, mlPrediction }) {
    const d = String(finalDecision || "").toLowerCase();

    let background = "#ecfdf3";
    let border = "#bbf7d0";
    let color = "#047857";
    let title = "Approve recommended";

    if (d === "clarify") {
        background = "#fffbeb";
        border = "#fde68a";
        color = "#b45309";
        title = "Clarification required";
    }

    if (d === "hold") {
        background = "#fef2f2";
        border = "#fecaca";
        color = "#b91c1c";
        title = "Hold for manual review";
    }

    return (
        <div
            style={{
                background,
                border: `1px solid ${border}`,
                color,
                borderRadius: 16,
                padding: 16,
            }}
        >
            <div style={{ fontSize: 18, fontWeight: 800 }}>{title}</div>
            <div style={{ marginTop: 6, lineHeight: 1.5 }}>
                Final decision: <b>{String(finalDecision).toUpperCase()}</b> · Risk score:{" "}
                <b>{finalRiskScore}</b> · ML prediction: <b>{mlPrediction}</b>
            </div>
        </div>
    );
}

function InsightStrip({ finalDecision, finalRiskScore, highFlagCount, mlConfidence }) {
    return (
        <div style={styles.insightStrip}>
            <div style={styles.insightPill}>
                <span style={styles.insightLabel}>Decision</span>
                <span style={{ ...styles.insightValue, ...metricTone(finalDecision) }}>
                    {String(finalDecision).toUpperCase()}
                </span>
            </div>

            <div style={styles.insightPill}>
                <span style={styles.insightLabel}>Risk Score</span>
                <span style={styles.insightValue}>{finalRiskScore}</span>
            </div>

            <div style={styles.insightPill}>
                <span style={styles.insightLabel}>High Flags</span>
                <span style={styles.insightValue}>{highFlagCount}</span>
            </div>

            <div style={styles.insightPill}>
                <span style={styles.insightLabel}>Model Confidence</span>
                <span style={styles.insightValue}>
                    {Math.round((Number(mlConfidence) || 0) * 100)}%
                </span>
            </div>
        </div>
    );
}

export default function ReviewPanel({ review, loading }) {
    const [activeTab, setActiveTab] = useState("summary");

    const featuresUsed = review?.phase3?.features_used || {};
    
    const normalized = normalizeReview(review);

    const {
        raw,
        prediction,
        confidence,
        probabilities,
        summary,
        flags,
        questions,
        extractedFields,
        finalRiskScore,
        riskLevel,
        finalDecision,
        decisionExplanation,
    } = normalized;

    const ruleScore = flags.length;
    const mlPrediction = prediction;
    const mlConfidence = confidence;

    const highFlagCount = flags.filter((f) => {
        const sev =
            typeof f === "object"
                ? String(f.severity || "").toUpperCase()
                : "";
        return sev === "HIGH";
    }).length;

    const workflowSteps = [
        "Request submitted",
        `Rule checks completed (${ruleScore} discrepancies found)`,
        `ML prediction generated: ${mlPrediction}`,
        `Risk score computed: ${finalRiskScore}`,
        `Final decision issued: ${finalDecision}`,
    ];

    const severityCounts = useMemo(() => {
        const counts = { HIGH: 0, MED: 0, LOW: 0 };
        flags.forEach((f) => {
            const sev =
                typeof f === "object"
                    ? String(f.severity || "").toUpperCase()
                    : "LOW";

            if (sev === "HIGH") counts.HIGH += 1;
            else if (sev === "MED" || sev === "MEDIUM") counts.MED += 1;
            else counts.LOW += 1;
        });
        return counts;
    }, [flags]);

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


    const probabilityData = [
        { name: "Approve", value: Number(((probabilities.approve || 0) * 100).toFixed(1)) },
        { name: "Clarify", value: Number(((probabilities.clarify || 0) * 100).toFixed(1)) },
        { name: "Hold", value: Number(((probabilities.hold || 0) * 100).toFixed(1)) },
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
            <DecisionBanner
                finalDecision={finalDecision}
                finalRiskScore={finalRiskScore}
                mlPrediction={mlPrediction}
            />

            <div style={styles.topGrid}>
                <MetricCard
                    title="Rule Score"
                    value={ruleScore}
                    subtitle="Deterministic checks"
                    tone="neutral"
                />

                <MetricCard
                    title="Final Risk Score"
                    value={finalRiskScore}
                    subtitle="Rules + ML adjustment"
                    tone={riskLevel}
                />

                <MetricCard
                    title="Final Decision"
                    value={finalDecision}
                    subtitle="Rules + ML decision"
                    tone={finalDecision}
                />

                <MetricCard
                    title="ML Prediction"
                    value={mlPrediction}
                    subtitle="Raw model output"
                    tone="neutral"
                />

                <MetricCard
                    title="ML Confidence"
                    value={`${Math.round((Number(mlConfidence) || 0) * 100)}%`}
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

                <InsightStrip
                    finalDecision={finalDecision}
                    finalRiskScore={finalRiskScore}
                    highFlagCount={highFlagCount}
                    mlConfidence={mlConfidence}
                />

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
                    <TabButton active={activeTab === "audit"} onClick={() => setActiveTab("audit")}>
                        Audit View
                    </TabButton>
                </div>

                {activeTab === "summary" && (
                    <div style={styles.contentGrid}>
                        <div style={styles.sectionCard}>
                            <h4 style={styles.sectionTitle}>Summary</h4>
                            {summary.length > 0 ? (
                                <ul style={styles.cleanList}>
                                    {summary.map((item, i) => (
                                        <li key={i} style={styles.listItem}>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div style={styles.emptyState}>No summary available.</div>
                            )}
                        </div>

                        <div style={styles.sectionCard}>
                            <h4 style={styles.sectionTitle}>Reviewer Questions</h4>
                            {questions.length ? (
                                <ul style={styles.cleanList}>
                                    {questions.map((q, i) => (
                                        <li key={i} style={styles.listItem}>
                                            {typeof q === "string"
                                                ? q
                                                : q.message || JSON.stringify(q)}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div style={styles.goodText}>No follow-up questions ✅</div>
                            )}
                        </div>

                        <div style={{ ...styles.sectionCard, gridColumn: "1 / -1" }}>
                            <h4 style={styles.sectionTitle}>Review Pipeline</h4>
                            <div style={styles.timeline}>
                                {workflowSteps.map((step, i) => (
                                    <div key={i} style={styles.timelineItem}>
                                        <div style={styles.timelineBadge}>{i + 1}</div>
                                        <div style={styles.timelineText}>{step}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "flags" && (
                    <div style={styles.contentGrid}>
                        <div style={styles.sectionCard}>
                            <h4 style={styles.sectionTitle}>Flags Found</h4>
                            {flags.length ? (
                                <div style={{ display: "grid", gap: 10 }}>
                                    {flags.map((f, i) => {
                                        const isObject = typeof f === "object" && f !== null;
                                        const type = isObject ? f.type || "Flag" : "Flag";
                                        const severity = isObject ? f.severity || "LOW" : "LOW";
                                        const description = isObject
                                            ? f.description || f.message || JSON.stringify(f)
                                            : String(f);

                                        return (
                                            <div key={i} style={styles.flagCard}>
                                                <div style={styles.flagHeader}>
                                                    <span style={styles.flagType}>{type}</span>
                                                    <span style={severityBadge(severity)}>{severity}</span>
                                                </div>
                                                <div style={styles.flagDesc}>{description}</div>

                                                {isObject && f.evidence && Object.keys(f.evidence).length > 0 && (
                                                    <div style={styles.evidenceBox}>
                                                        <div style={styles.evidenceTitle}>Evidence</div>
                                                        {Object.entries(f.evidence).map(([key, value]) => (
                                                            <div key={key} style={styles.evidenceRow}>
                                                                <div style={styles.evidenceKey}>{key}</div>
                                                                <div style={styles.evidenceValue}>
                                                                    {String(value || "—")}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
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

                            <ConfidenceGauge value={mlConfidence} />
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
                            <h3 style={styles.sectionTitle}>Model Features Used</h3>

                            {Object.keys(featuresUsed).length > 0 ? (
                                <div>
                                    {Object.entries(featuresUsed).map(([key, value]) => (
                                        <div
                                            key={key}
                                            style={{
                                                padding: "6px 0",
                                                borderBottom: "1px solid #e5e7eb",
                                                fontSize: "13px",
                                                color: "#334155",
                                            }}
                                        >
                                            <strong>{formatLabel(key)}:</strong> {String(value)}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p>No feature details available.</p>
                            )}
                        </div>

                        <div style={{ ...styles.sectionCard, gridColumn: "1 / -1" }}>
                            <h4 style={styles.sectionTitle}>Decision Explanation</h4>
                            <div style={styles.explainerBox}>
                                {Array.isArray(decisionExplanation) && decisionExplanation.length > 0 ? (
                                    decisionExplanation.map((line, i) => (
                                        <div key={i} style={{ marginBottom: 8 }}>
                                            {typeof line === "string" ? line : JSON.stringify(line)}
                                        </div>
                                    ))
                                ) : (
                                    <div>No additional explanation available.</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "audit" && (
                    <div style={styles.sectionCard}>
                        <h4 style={styles.sectionTitle}>Review Audit Record</h4>
                        <div style={{ marginBottom: 12, color: "#475569" }}>
                            Full structured response returned by the AI review pipeline.
                        </div>
                        <pre style={styles.pre}>
                            {JSON.stringify(raw, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
}

function MetricCard({ title, value, subtitle, tone }) {
    return (
        <div style={styles.metricCard}>
            <div style={styles.metricTitle}>{title}</div>
            <div
                style={{
                    ...styles.metricValue,
                    ...metricTone(tone),
                    ...metricBackground(tone),
                }}
            >
                {String(value)}
            </div>
            <div style={styles.metricSubtitle}>{subtitle}</div>
        </div>
    );
}

function formatLabel(input) {
    if (!input) return "";
    return input
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
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

    if (t === "hold") return { color: "#b91c1c" };
    if (t === "clarify") return { color: "#b45309" };
    if (t === "approve") return { color: "#047857" };

    return { color: "#0f172a" };
}

function metricBackground(tone) {
    const t = String(tone || "").toLowerCase();

    if (t === "approve") return { background: "#ecfdf3", padding: "6px 10px", borderRadius: 8 };
    if (t === "clarify") return { background: "#fffbeb", padding: "6px 10px", borderRadius: 8 };
    if (t === "hold") return { background: "#fef2f2", padding: "6px 10px", borderRadius: 8 };

    return {};
}

function formatFeatureLabel(key) {
    return key.replaceAll("_", " ");
}

const styles = {
    topGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 14,
    },
    metricCard: {
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 18,
        padding: 18,
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
        minWidth: 0,
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
        minWidth: 0,
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
        minWidth: 0,
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
        maxWidth: "100%",
        width: "100%",
        boxSizing: "border-box",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
    },
    emptyState: {
        color: "#475569",
        lineHeight: 1.5,
    },
    evidenceBox: {
        marginTop: 10,
        padding: 10,
        background: "#f8fafc",
        border: "1px dashed #cbd5e1",
        borderRadius: 12,
    },
    evidenceTitle: {
        fontSize: 12,
        fontWeight: 700,
        color: "#64748b",
        textTransform: "uppercase",
        marginBottom: 8,
    },
    evidenceRow: {
        marginBottom: 8,
    },
    evidenceKey: {
        fontSize: 12,
        fontWeight: 700,
        color: "#334155",
    },
    evidenceValue: {
        fontSize: 13,
        color: "#475569",
        wordBreak: "break-word",
    },
    timeline: {
        display: "grid",
        gap: 12,
    },
    timelineItem: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 14,
        padding: 12,
    },
    timelineBadge: {
        width: 28,
        height: 28,
        borderRadius: 999,
        background: "#0f172a",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: 13,
        flexShrink: 0,
    },
    timelineText: {
        fontSize: 14,
        color: "#1e293b",
        fontWeight: 600,
    },
    gaugeContainer: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        marginTop: 18,
    },
    gauge: {
        width: "100%",
        height: 14,
        background: "#e2e8f0",
        borderRadius: 999,
        overflow: "hidden",
    },
    gaugeFill: {
        height: "100%",
        borderRadius: 999,
    },
    gaugeLabel: {
        fontWeight: 700,
        color: "#334155",
    },
    insightStrip: {
        display: "flex",
        flexWrap: "wrap",
        gap: 10,
        marginBottom: 16,
    },
    insightPill: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 999,
        padding: "8px 12px",
    },
    insightLabel: {
        fontSize: 12,
        fontWeight: 700,
        color: "#64748b",
        textTransform: "uppercase",
        letterSpacing: 0.4,
    },
    insightValue: {
        fontSize: 14,
        fontWeight: 800,
        color: "#0f172a",
    },
    sectionCard: {
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 16,
        padding: 16,
        minWidth: 0,
    },
};