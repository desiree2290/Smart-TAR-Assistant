import React, { useEffect, useMemo, useState } from "react";
import { listRequests } from "../api.js";
import { Link } from "react-router-dom";

export default function ApproverQueue() {
    const [rows, setRows] = useState([]);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortBy, setSortBy] = useState("start_date");

    useEffect(() => {
        listRequests("submitted").then(setRows).catch(() => setRows([]));
    }, []);

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
            data = data.filter((r) => String(r.status || "").toLowerCase() === statusFilter);
        }

        data.sort((a, b) => {
            if (sortBy === "traveler_name") {
                return String(a.traveler_name || "").localeCompare(String(b.traveler_name || ""));
            }

            if (sortBy === "destination_city") {
                return String(a.destination_city || "").localeCompare(String(b.destination_city || ""));
            }

            return String(a.start_date || "").localeCompare(String(b.start_date || ""));
        });

        return data;
    }, [rows, search, statusFilter, sortBy]);

    const stats = useMemo(() => {
        const submitted = rows.filter((r) => String(r.status || "").toLowerCase() === "submitted").length;
        const pending = rows.filter((r) => String(r.status || "").toLowerCase().includes("pending")).length;
        const approved = rows.filter((r) => String(r.status || "").toLowerCase().includes("approved")).length;

        return {
            total: rows.length,
            submitted,
            pending,
            approved,
        };
    }, [rows]);

    return (
        <div style={styles.page}>
            <div style={styles.headerRow}>
                <div>
                    <h2 style={styles.pageTitle}>Approver Queue</h2>
                    <p style={styles.pageSubtitle}>
                        Review submitted TARs, search traveler requests, and open individual review dashboards.
                    </p>
                </div>
            </div>

            <div style={styles.statsGrid}>
                <StatCard label="Total Requests" value={stats.total} />
                <StatCard label="Submitted" value={stats.submitted} />
                <StatCard label="Pending" value={stats.pending} />
                <StatCard label="Approved" value={stats.approved} />
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
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={styles.select}>
                        <option value="all">All</option>
                        <option value="submitted">Submitted</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                    </select>
                </div>

                <div style={styles.toolbarGroup}>
                    <label style={styles.label}>Sort By</label>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={styles.select}>
                        <option value="start_date">Start Date</option>
                        <option value="traveler_name">Traveler</option>
                        <option value="destination_city">Destination</option>
                    </select>
                </div>
            </div>

            <div style={styles.card}>
                <div style={styles.tableHeader}>
                    <div style={styles.tableTitle}>Submitted Requests</div>
                    <div style={styles.tableCount}>{filteredRows.length} shown</div>
                </div>

                {filteredRows.length === 0 ? (
                    <div style={styles.emptyState}>No matching requests found.</div>
                ) : (
                    <div style={styles.list}>
                        {filteredRows.map((r) => (
                            <div key={r.id} style={styles.rowCard}>
                                <div style={styles.rowTop}>
                                    <div>
                                        <div style={styles.travelerName}>{r.traveler_name || "Unknown Traveler"}</div>
                                        <div style={styles.destinationText}>{r.destination_city || "Unknown Destination"}</div>
                                    </div>
                                    <div style={statusBadge(r.status)}>{r.status || "UNKNOWN"}</div>
                                </div>

                                <div style={styles.metaGrid}>
                                    <MetaItem label="Request ID" value={r.id} />
                                    <MetaItem label="Start Date" value={r.start_date} />
                                    <MetaItem label="End Date" value={r.end_date} />
                                </div>

                                <div style={styles.actionsRow}>
                                    <Link to={`/requests/${r.id}`} style={styles.openButton}>
                                        Open Review
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
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

    if (s.includes("approved")) {
        bg = "#ecfdf3";
        color = "#047857";
    } else if (s.includes("submitted")) {
        bg = "#eff6ff";
        color = "#1d4ed8";
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
        justifyContent: "flex-end",
    },
    openButton: {
        display: "inline-block",
        textDecoration: "none",
        background: "#0f172a",
        color: "#ffffff",
        padding: "10px 16px",
        borderRadius: 12,
        fontWeight: 700,
    },
    emptyState: {
        padding: 20,
        color: "#475569",
    },
};