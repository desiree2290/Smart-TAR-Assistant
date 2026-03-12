import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getRequest, getReview } from "../api.js";
import ReviewPanel from "../components/ReviewPanel.jsx";

export default function RequestDetail() {
    const { id } = useParams();
    const [req, setReq] = useState(null);
    const [review, setReview] = useState(null);
    const [loadingReview, setLoadingReview] = useState(true);

    useEffect(() => {
        getRequest(id).then(setReq);

        setLoadingReview(true);
        getReview(id)
            .then(setReview)
            .catch(() => setReview(null))
            .finally(() => setLoadingReview(false));
    }, [id]);

    if (!req) {
        return <div style={styles.page}>Loading request...</div>;
    }

    return (
        <div style={styles.page}>
            <div style={styles.headerRow}>
                <div>
                    <h2 style={styles.pageTitle}>Request Detail</h2>
                    <p style={styles.pageSubtitle}>
                        Review traveler submission details, rule-based findings, and ML insights.
                    </p>
                </div>
                <div style={statusBadge(req.status)}>{req.status || "UNKNOWN"}</div>
            </div>

            <div style={styles.requestCard}>
                <div style={styles.cardHeader}>
                    <h3 style={styles.cardTitle}>Traveler Submission</h3>
                </div>

                <div style={styles.detailGrid}>
                    <DetailItem label="Traveler" value={req.traveler_name} />
                    <DetailItem label="Destination" value={req.destination_city} />
                    <DetailItem label="Start Date" value={req.start_date} />
                    <DetailItem label="End Date" value={req.end_date} />
                </div>

                <div style={{ marginTop: 16 }}>
                    <div style={styles.label}>Justification</div>
                    <div style={styles.justificationBox}>{req.justification || "No justification provided."}</div>
                </div>
            </div>

            <div style={{ marginTop: 20 }}>
                <ReviewPanel review={review} loading={loadingReview} />
            </div>
        </div>
    );
}

function DetailItem({ label, value }) {
    return (
        <div style={styles.detailItem}>
            <div style={styles.label}>{label}</div>
            <div style={styles.value}>{value || "—"}</div>
        </div>
    );
}

function statusBadge(status) {
    const s = String(status || "").toLowerCase();

    let bg = "#eef2ff";
    let color = "#4338ca";

    if (s.includes("approved")) {
        bg = "#ecfdf3";
        color = "#047857";
    } else if (s.includes("pending")) {
        bg = "#fffbeb";
        color = "#b45309";
    } else if (s.includes("hold")) {
        bg = "#fef2f2";
        color = "#b91c1c";
    }

    return {
        padding: "8px 14px",
        borderRadius: 999,
        background: bg,
        color,
        fontWeight: 700,
        fontSize: 13,
        textTransform: "uppercase",
        letterSpacing: 0.4,
    };
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
    headerRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 16,
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
    requestCard: {
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 18,
        padding: 20,
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
    },
    cardHeader: {
        marginBottom: 16,
    },
    cardTitle: {
        margin: 0,
        fontSize: 20,
    },
    detailGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 14,
    },
    detailItem: {
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 14,
        padding: 14,
    },
    label: {
        fontSize: 12,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        color: "#64748b",
        marginBottom: 6,
        fontWeight: 700,
    },
    value: {
        fontSize: 16,
        fontWeight: 600,
    },
    justificationBox: {
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 14,
        padding: 14,
        color: "#1e293b",
        lineHeight: 1.5,
    },
};`         `