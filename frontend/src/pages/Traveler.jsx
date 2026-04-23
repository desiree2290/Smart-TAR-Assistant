import React, { useState } from "react";
import RequestForm from "../components/RequestForm.jsx";
import UploadAttachment from "../components/UploadAttachment.jsx";
import { createRequest, submitRequest, runDemoScenario } from "../api.js";
import { useNavigate } from "react-router-dom";
import ReviewPanel from "../components/ReviewPanel.jsx";


export default function Traveler() {
    const [created, setCreated] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [submitBusy, setSubmitBusy] = useState(false);
    const [submitMsg, setSubmitMsg] = useState("");
    const [reviewResult, setReviewResult] = useState(null);
    const nav = useNavigate();

    async function onCreate(payload) {
        setBusy(true);
        setError("");
        try {
            const req = await createRequest(payload);
            setCreated(req);
        } catch (err) {
            setError("Unable to create request. Please try again.");
        } finally {
            setBusy(false);
        }
    }

    async function onRunDemo(type) {
        setBusy(true);
        setError("");
        try {
            const req = await runDemoScenario(type);
            nav(`/requests/${req.id}`);
        } catch (err) {
            setError("Unable to run demo scenario.");
        } finally {
            setBusy(false);
        }
    }

    async function runDemo(type) {
        try {
            const req = await runDemoScenario(type);
            nav(`/requests/${req.id}`);
        } catch {
            alert("Demo failed");
        }
    }

    async function onSubmit() {
        if (!created) return;
        setBusy(true);
        setError("");
        try {
            await submitRequest(created.id);
            nav(`/requests/${created.id}`);
        } catch (err) {
            setError("Unable to submit request for AI review.");
        } finally {
            setBusy(false);
        }
    }



    async function onSubmitReview() {
        try {
            const result = await submitRequest(created.id);

            console.log("submit response:", result);

            setReviewResult(result.review);  

        } catch (err) {
            console.error(err);
        }
    }

    return (
        <div style={styles.page}>
            <div style={styles.heroCard}>
                <div>
                    <h2 style={styles.pageTitle}>Traveler Submission</h2>
                    <p style={styles.pageSubtitle}>
                        Create a TAR draft, upload supporting documents, and submit it for hybrid
                        rule-based and ML-assisted review.
                    </p>
                </div>

                <div style={styles.heroStats}>
                    <div style={styles.heroStat}>
                        <div style={styles.heroStatLabel}>Workflow</div>
                        <div style={styles.heroStatValue}>Create → Upload → Review</div>
                    </div>
                    <div style={styles.heroStat}>
                        <div style={styles.heroStatLabel}>AI Output</div>
                        <div style={styles.heroStatValue}>Rules + ML Risk</div>
                    </div>
                </div>
            </div>

            {error && <div style={styles.errorBanner}>{error}</div>}
            <div style={styles.demoBox}>
                <h4>Quick Demo Scenarios</h4>
                <p>Instantly generate example TAR submissions to demonstrate AI review behavior.</p>

                <div style={styles.demoButtons}>

                    <button
                        style={{ ...styles.demoBtn, background: "#16a34a" }}
                        onClick={() => runDemo("approve")}
                    >
                        Clean Request (Approve)
                    </button>

                    <button
                        style={{ ...styles.demoBtn, background: "#d97706" }}
                        onClick={() => runDemo("clarify")}
                    >
                        Minor Issues (Clarify)
                    </button>

                    <button
                        style={{ ...styles.demoBtn, background: "#dc2626" }}
                        onClick={() => runDemo("hold")}
                    >
                        High Risk (Hold)
                    </button>

                </div>
            </div>

            <div style={styles.mainGrid}>
                <div>
                    <RequestForm onCreate={onCreate} onRunDemo={onRunDemo} disabled={busy} />
                </div>

                <div style={styles.sidePanel}>
                    <div style={styles.sideCard}>
                        <h3 style={styles.sideTitle}>How this demo works</h3>
                        <ul style={styles.sideList}>
                            <li>Create a TAR draft using the form.</li>
                            <li>Upload a packet or supporting PDF.</li>
                            <li>Submit the request to run AI review.</li>
                            <li>Open the request detail page to see flags, scores, and ML insights.</li>
                        </ul>
                    </div>

                    <div style={styles.sideCard}>
                        <h3 style={styles.sideTitle}>What reviewers will see</h3>
                        <div style={styles.infoTile}>Rule score and final risk score</div>
                        <div style={styles.infoTile}>ML prediction and confidence</div>
                        <div style={styles.infoTile}>Flag severity breakdown</div>
                        <div style={styles.infoTile}>Explainable model features</div>
                    </div>
                </div>
            </div>

            {created && (
                <div style={styles.createdCard}>
                    <div style={styles.createdHeader}>
                        <div>
                            <h3 style={styles.createdTitle}>Draft Created</h3>
                            <p style={styles.createdSubtitle}>
                                Your TAR draft is ready. Upload the packet, then submit it for AI review.
                            </p>
                        </div>
                        <div style={statusBadge(created.status)}>{created.status}</div>
                    </div>

                    <div style={styles.createdGrid}>
                        <CreatedItem label="Request ID" value={created.id} />
                        <CreatedItem label="Traveler" value={created.traveler_name} />
                        <CreatedItem label="Destination" value={created.destination_city} />
                        <CreatedItem
                            label="Travel Dates"
                            value={`${created.start_date} to ${created.end_date}`}
                        />
                    </div>

                    <div style={{ marginTop: 18 }}>
                        <UploadAttachment requestId={created.id} />
                    </div>

                    <div style={styles.actionRow}>
                        <button 
                            onClick={onSubmitReview}
                            disabled={submitBusy}
                            style={{
                                ...styles.submitButton,
                                opacity: submitBusy ? 0.7 : 1,
                                cursor: submitBusy ? "not-allowed" : "pointer",
                            }}
                        >
                            {submitBusy ? "Running Review..." : "Submit and Run AI Review"}
                        </button>
                    </div>
                    {submitMsg && (
                        <div style={{
                            marginTop: 12,
                            padding: 12,
                            borderRadius: 10,
                            background: submitMsg.includes("failed") ? "#fef2f2" : "#f8fafc",
                            border: `1px solid ${submitMsg.includes("failed") ? "#fecaca" : "#e2e8f0"}`
                        }}>
                            {submitMsg}
                        </div>
                    )}

                    {reviewResult && <ReviewPanel review={reviewResult} loading={submitBusy} />}
                </div>
            )}
        </div>
    );
}

function CreatedItem({ label, value }) {
    return (
        <div style={styles.createdItem}>
            <div style={styles.createdItemLabel}>{label}</div>
            <div style={styles.createdItemValue}>{value || "—"}</div>
        </div>
    );
}

function statusBadge(status) {
    const s = String(status || "").toLowerCase();

    let bg = "#eef2ff";
    let color = "#4338ca";

    if (s.includes("draft")) {
        bg = "#f8fafc";
        color = "#334155";
    } else if (s.includes("submitted")) {
        bg = "#eff6ff";
        color = "#1d4ed8";
    } else if (s.includes("approved")) {
        bg = "#ecfdf3";
        color = "#047857";
    }

    return {
        padding: "8px 14px",
        borderRadius: 999,
        background: bg,
        color,
        fontWeight: 700,
        fontSize: 12,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        whiteSpace: "nowrap",
    };
}

const styles = {
    page: {
        padding: 24,
        maxWidth: 1280,
        margin: "0 auto",
        fontFamily: "Arial, sans-serif",
        color: "#0f172a",
        background: "#f8fafc",
        minHeight: "100vh",
    },
    heroCard: {
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        color: "#ffffff",
        borderRadius: 20,
        padding: 24,
        display: "grid",
        gridTemplateColumns: "1.4fr 1fr",
        gap: 20,
        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.18)",
        marginBottom: 20,
    },
    pageTitle: {
        margin: 0,
        fontSize: 32,
    },
    pageSubtitle: {
        margin: "10px 0 0 0",
        color: "#cbd5e1",
        lineHeight: 1.6,
        maxWidth: 700,
    },
    heroStats: {
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: 12,
        alignContent: "start",
    },
    heroStat: {
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 16,
        padding: 16,
    },
    heroStatLabel: {
        fontSize: 12,
        textTransform: "uppercase",
        letterSpacing: 0.6,
        color: "#cbd5e1",
        fontWeight: 700,
    },
    heroStatValue: {
        marginTop: 8,
        fontSize: 20,
        fontWeight: 800,
    },
    errorBanner: {
        background: "#fef2f2",
        border: "1px solid #fecaca",
        color: "#b91c1c",
        borderRadius: 14,
        padding: 12,
        marginBottom: 18,
        fontWeight: 600,
    },
    mainGrid: {
        display: "grid",
        gridTemplateColumns: "1.3fr 0.7fr",
        gap: 20,
        alignItems: "start",
    },
    sidePanel: {
        display: "grid",
        gap: 16,
    },
    sideCard: {
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 18,
        padding: 18,
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
    },
    sideTitle: {
        margin: "0 0 12px 0",
        fontSize: 18,
    },
    sideList: {
        margin: 0,
        paddingLeft: 18,
        color: "#334155",
        lineHeight: 1.6,
    },
    infoTile: {
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
        fontWeight: 600,
        color: "#1e293b",
    },
    createdCard: {
        marginTop: 22,
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 20,
        padding: 20,
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
    },
    createdHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 14,
        marginBottom: 16,
    },
    createdTitle: {
        margin: 0,
        fontSize: 22,
    },
    createdSubtitle: {
        margin: "6px 0 0 0",
        color: "#475569",
    },
    createdGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 14,
    },
    createdItem: {
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 14,
        padding: 14,
    },
    createdItemLabel: {
        fontSize: 12,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        color: "#64748b",
        fontWeight: 700,
        marginBottom: 6,
    },
    createdItemValue: {
        fontWeight: 700,
        color: "#0f172a",
    },
    actionRow: {
        marginTop: 18,
        display: "flex",
        justifyContent: "flex-end",
    },
    primaryButton: {
        background: "#0f172a",
        color: "#ffffff",
        border: "none",
        borderRadius: 14,
        padding: "12px 18px",
        fontWeight: 700,
        fontSize: 14,
    },

    demoBox: {
        marginBottom: 20,
        padding: 16,
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 12
    },

    demoButtons: {
        display: "flex",
        gap: 10,
        marginTop: 10
    },

    demoBtn: {
        border: "none",
        color: "white",
        padding: "10px 16px",
        borderRadius: 8,
        cursor: "pointer",
        fontWeight: 600
    },
    submitButton: {
        backgroundColor: "#0f172a",
        color: "white",
        border: "none",
        padding: "10px 18px",
        borderRadius: 8,
        fontWeight: 600,
        fontSize: 14,
        cursor: "pointer",
        transition: "all 0.2s ease",
        boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
    },
    
};