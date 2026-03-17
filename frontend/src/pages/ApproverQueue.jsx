import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listRequests, updateRequestStatus } from "../api.js";

export default function ApproverQueue() {
    const [rows, setRows] = useState([]);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortBy, setSortBy] = useState("start_date");

    const [commentModal, setCommentModal] = useState(null);
    const [commentText, setCommentText] = useState("");

    useEffect(() => {
        listRequests().then(setRows).catch(() => setRows([]));
    }, []);

    async function changeStatus(id, status) {
        try {
            const updated = await updateRequestStatus(id, status);

            setRows((prev) =>
                prev.map((r) => (r.id === id ? updated : r))
            );
        } catch (err) {
            alert("Unable to update status");
            console.error(err);
        }
    }

    const filteredRows = useMemo(() => {
        let data = [...rows];

        if (search.trim()) {
            const q = search.toLowerCase();
            data = data.filter((r) => {
                return (
                    String(r.traveler_name || "").toLowerCase().includes(q) ||
                    String(r.destination_city || "").toLowerCase().includes(q) ||
                    String(r.status || "").toLowerCase().includes(q)
                );
            });
        }

        if (statusFilter !== "all") {
            data = data.filter(
                (r) => String(r.status || "").toLowerCase() === statusFilter
            );
        }

        data.sort((a, b) => {
            if (sortBy === "traveler_name") {
                return String(a.traveler_name || "").localeCompare(
                    String(b.traveler_name || "")
                );
            }

            if (sortBy === "destination_city") {
                return String(a.destination_city || "").localeCompare(
                    String(b.destination_city || "")
                );
            }

            return String(a.start_date || "").localeCompare(
                String(b.start_date || "")
            );
        });

        return data;
    }, [rows, search, statusFilter, sortBy]);

    const stats = useMemo(() => {
        const submitted = rows.filter(
            (r) => String(r.status || "").toLowerCase() === "submitted"
        ).length;

        const approved = rows.filter(
            (r) => String(r.status || "").toLowerCase() === "approved"
        ).length;

        const disapproved = rows.filter(
            (r) => String(r.status || "").toLowerCase() === "disapproved"
        ).length;

        const kickback = rows.filter(
            (r) => String(r.status || "").toLowerCase() === "kickback"
        ).length;

        return {
            total: rows.length,
            submitted,
            approved,
            disapproved,
            kickback,
        };
    }, [rows]);

    return (
        <div style={styles.page}>
            <div style={styles.headerRow}>
                <div>
                    <h2 style={styles.pageTitle}>Approver Queue</h2>
                    <p style={styles.pageSubtitle}>
                        Review submitted TARs, search requests, open review dashboards, and update approval status.
                    </p>
                </div>
            </div>

            <div style={styles.statsGrid}>
                <StatCard label="Total Requests" value={stats.total} />
                <StatCard label="Submitted" value={stats.submitted} />
                <StatCard label="Approved" value={stats.approved} />
                <StatCard label="Disapproved" value={stats.disapproved} />
                <StatCard label="Kickback" value={stats.kickback} />
            </div>

            <div style={styles.toolbar}>
                <div style={styles.toolbarGroup}>
                    <label style={styles.label}>Search</label>
                    <input
                        type="text"
                        placeholder="Traveler, destination, or status"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={styles.input}
                    />
                </div>

                <div style={styles.toolbarGroup}>
                    <label style={styles.label}>Status</label>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={styles.select}
                    >
                        <option value="all">All</option>
                        <option value="submitted">Submitted</option>
                        <option value="approved">Approved</option>
                        <option value="disapproved">Disapproved</option>
                        <option value="kickback">Kickback</option>
                    </select>
                </div>

                <div style={styles.toolbarGroup}>
                    <label style={styles.label}>Sort By</label>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        style={styles.select}
                    >
                        <option value="start_date">Start Date</option>
                        <option value="traveler_name">Traveler</option>
                        <option value="destination_city">Destination</option>
                    </select>
                </div>
            </div>

            <div style={styles.card}>
                <div style={styles.tableHeader}>
                    <div style={styles.tableTitle}>Requests</div>
                    <div style={styles.tableCount}>{filteredRows.length} shown</div>
                </div>

                {filteredRows.length === 0 ? (
                    <div style={styles.emptyState}>No matching requests found.</div>
                ) : (
                    <div style={styles.list}>
                        {filteredRows.map((r) => {
                            const status = String(r.status || "").toLowerCase();
                            const decisionMade = ["approved", "disapproved", "kickback"].includes(status);

                            return (
                                <div key={r.id} style={styles.rowCard}>
                                    <div style={styles.rowTop}>
                                        <div>
                                            <div style={styles.travelerName}>
                                                {r.traveler_name || "Unknown Traveler"}
                                            </div>
                                            <div style={styles.destinationText}>
                                                {r.destination_city || "Unknown Destination"}
                                            </div>
                                        </div>
                                        <div style={statusBadge(r.status)}>
                                            {r.status || "UNKNOWN"}
                                        </div>
                                    </div>

                                    <div style={styles.metaGrid}>
                                        <MetaItem label="Request ID" value={r.id} />
                                        <MetaItem label="Start Date" value={r.start_date} />
                                        <MetaItem label="End Date" value={r.end_date} />
                                    </div>

                                    <div style={styles.actionsRow}>
                                        <Link to={`/requests/${r.id}`} style={styles.openButton}>
                                            Review
                                        </Link>

                                        <button
                                            disabled={decisionMade}
                                            style={{
                                                ...styles.actionButton,
                                                ...styles.approveBtn,
                                                ...(decisionMade ? styles.disabledBtn : {}),
                                            }}
                                            onClick={() => changeStatus(r.id, "approved")}
                                        >
                                            ✓ Approve
                                        </button>

                                        <button
                                            disabled={decisionMade}
                                            style={{
                                                ...styles.actionButton,
                                                ...styles.disapproveBtn,
                                                ...(decisionMade ? styles.disabledBtn : {}),
                                            }}
                                            onClick={() => setCommentModal({ id: r.id, status: "disapproved" })}
                                        >
                                            ✕ Disapprove
                                        </button>

                                        <button
                                            disabled={decisionMade}
                                            style={{
                                                ...styles.actionButton,
                                                ...styles.kickbackBtn,
                                                ...(decisionMade ? styles.disabledBtn : {}),
                                            }}
                                            onClick={() => setCommentModal({ id: r.id, status: "kickback" })}
                                        >
                                            ↺ Kickback
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            {commentModal && (
                <div style={styles.modalBackdrop}>
                    <div style={styles.modal}>
                        <h3>Provide Reason</h3>

                        <textarea
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Enter explanation for this decision..."
                            style={styles.textarea}
                        />

                        <div style={styles.modalButtons}>
                            <button
                                style={styles.modalCancel}
                                onClick={() => {
                                    setCommentModal(null);
                                    setCommentText("");
                                }}
                            >
                                Cancel
                            </button>

                            <button
                                style={styles.modalConfirm}
                                onClick={() => {
                                    changeStatus(commentModal.id, commentModal.status, commentText);
                                    setCommentModal(null);
                                    setCommentText("");
                                }}
                            >
                                Submit
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ label, value }) {
    return (
        <div style={styles.statCard}>
            <div style={styles.statLabel}>{label}</div>
            <div style={styles.statValue}>{value}</div>
        </div>
    );
}

function MetaItem({ label, value }) {
    return (
        <div style={styles.metaItem}>
            <div style={styles.metaLabel}>{label}</div>
            <div style={styles.metaValue}>{value || "—"}</div>
        </div>
    );
}

function statusBadge(status) {
    const s = String(status || "").toLowerCase();

    let bg = "#eef2ff";
    let color = "#4338ca";

    if (s === "approved") {
        bg = "#ecfdf3";
        color = "#047857";
    } else if (s === "submitted") {
        bg = "#eff6ff";
        color = "#1d4ed8";
    } else if (s === "kickback") {
        bg = "#fffbeb";
        color = "#b45309";
    } else if (s === "disapproved") {
        bg = "#fef2f2";
        color = "#b91c1c";
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
    statsGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 14,
        marginBottom: 18,
    },
    statCard: {
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 18,
        padding: 18,
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
    },
    statLabel: {
        fontSize: 13,
        color: "#64748b",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    statValue: {
        fontSize: 30,
        fontWeight: 800,
        marginTop: 10,
    },
    toolbar: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 14,
        marginBottom: 18,
    },
    toolbarGroup: {
        display: "flex",
        flexDirection: "column",
        gap: 6,
    },
    label: {
        fontSize: 12,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        color: "#64748b",
        fontWeight: 700,
    },
    input: {
        padding: "12px 14px",
        borderRadius: 12,
        border: "1px solid #cbd5e1",
        fontSize: 14,
        background: "#ffffff",
    },
    select: {
        padding: "12px 14px",
        borderRadius: 12,
        border: "1px solid #cbd5e1",
        fontSize: 14,
        background: "#ffffff",
    },
    card: {
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 18,
        padding: 20,
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
    },
    tableHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        marginBottom: 16,
    },
    tableTitle: {
        fontSize: 20,
        fontWeight: 700,
    },
    tableCount: {
        fontSize: 13,
        color: "#64748b",
        fontWeight: 700,
    },
    list: {
        display: "grid",
        gap: 14,
    },
    rowCard: {
        border: "1px solid #e2e8f0",
        borderRadius: 16,
        padding: 16,
        background: "#f8fafc",
    },
    rowTop: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
        marginBottom: 14,
    },
    travelerName: {
        fontSize: 18,
        fontWeight: 700,
    },
    destinationText: {
        marginTop: 4,
        color: "#475569",
        fontSize: 14,
    },
    metaGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: 12,
    },
    metaItem: {
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: 12,
    },
    metaLabel: {
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        color: "#64748b",
        fontWeight: 700,
        marginBottom: 6,
    },
    metaValue: {
        fontSize: 14,
        fontWeight: 600,
    },
    actionsRow: {
        marginTop: 16,
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
    },
    openButton: {
        display: "inline-block",
        textDecoration: "none",
        background: "#0f172a",
        color: "#ffffff",
        padding: "10px 16px",
        borderRadius: 12,
        fontWeight: 700,
        marginRight: "auto",
    },
    emptyState: {
        padding: 20,
        color: "#475569",
    },
    actionButton: {
        border: "none",
        borderRadius: 10,
        padding: "10px 14px",
        fontWeight: 700,
        cursor: "pointer",
    },
    approveBtn: {
        background: "#ecfdf3",
        color: "#047857",
    },
    disapproveBtn: {
        background: "#fef2f2",
        color: "#b91c1c",
    },
    kickbackBtn: {
        background: "#fffbeb",
        color: "#b45309",
    },
    disabledBtn: {
        opacity: 0.45,
        cursor: "not-allowed",
    },

    modalBackdrop: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999
    },

    modal: {
        background: "#ffffff",
        padding: 24,
        borderRadius: 16,
        width: 400,
        boxShadow: "0 20px 40px rgba(0,0,0,0.2)"
    },

    textarea: {
        width: "100%",
        minHeight: 100,
        marginTop: 12,
        padding: 12,
        borderRadius: 10,
        border: "1px solid #cbd5e1",
        boxSizing: "border-box",
        resize: "vertical"
    },

    modalButtons: {
        display: "flex",
        justifyContent: "flex-end",
        gap: 10,
        marginTop: 14
    },

    modalCancel: {
        padding: "8px 14px",
        borderRadius: 8,
        border: "none",
        background: "#e2e8f0",
        cursor: "pointer"
    },

    modalConfirm: {
        padding: "8px 14px",
        borderRadius: 8,
        border: "none",
        background: "#0f172a",
        color: "white",
        cursor: "pointer"
    }
};