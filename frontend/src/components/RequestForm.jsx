import React, { useState } from "react";

const demoScenarios = {
    approve: {
        traveler_name: "Desiree Hodge",
        destination_city: "San Diego",
        start_date: "2026-03-12",
        end_date: "2026-03-15",
        justification:
            "Attend a conference relevant to current program objectives and improve organizational readiness.",
    },
    clarify: {
        traveler_name: "Desiree Hodge",
        destination_city: "San Jose",
        start_date: "2026-04-08",
        end_date: "2026-04-11",
        justification: "Meeting.",
    },
    hold: {
        traveler_name: "Desiree Hodge",
        destination_city: "San Diego",
        start_date: "2026-05-03",
        end_date: "2026-05-05",
        justification: "Meeting.",
    },
};

export default function RequestForm({ onCreate, onRunDemo, disabled }) {
    const [form, setForm] = useState(demoScenarios.approve);

    function setField(key, value) {
        setForm((f) => ({ ...f, [key]: value }));
    }

    function loadScenario(type) {
        setForm(demoScenarios[type]);
    }

    function handleSubmit(e) {
        e.preventDefault();
        onCreate(form);
    }

    return (
        <div style={styles.card}>
            <div style={styles.header}>
                <div>
                    <h3 style={styles.title}>Create TAR</h3>
                    <p style={styles.subtitle}>
                        Fill in traveler details, load a demo scenario into the form, or run a full backend demo instantly.
                    </p>
                </div>
            </div>

            <div style={styles.sectionLabel}>Load demo data into form</div>
            <div style={styles.scenarioRow}>
                <button
                    type="button"
                    onClick={() => loadScenario("approve")}
                    style={{ ...styles.scenarioButton, ...styles.approveButton }}
                >
                    Load Approve Demo
                </button>
                <button
                    type="button"
                    onClick={() => loadScenario("clarify")}
                    style={{ ...styles.scenarioButton, ...styles.clarifyButton }}
                >
                    Load Clarify Demo
                </button>
                <button
                    type="button"
                    onClick={() => loadScenario("hold")}
                    style={{ ...styles.scenarioButton, ...styles.holdButton }}
                >
                    Load Hold Demo
                </button>
            </div>

            <div style={styles.sectionLabel}>Run full backend demo</div>
            <div style={styles.scenarioRow}>
                <button
                    type="button"
                    onClick={() => onRunDemo && onRunDemo("approve")}
                    style={{ ...styles.scenarioButton, ...styles.approveButton }}
                    disabled={disabled}
                >
                    Run Approve Demo
                </button>
                <button
                    type="button"
                    onClick={() => onRunDemo && onRunDemo("clarify")}
                    style={{ ...styles.scenarioButton, ...styles.clarifyButton }}
                    disabled={disabled}
                >
                    Run Clarify Demo
                </button>
                <button
                    type="button"
                    onClick={() => onRunDemo && onRunDemo("hold")}
                    style={{ ...styles.scenarioButton, ...styles.holdButton }}
                    disabled={disabled}
                >
                    Run Hold Demo
                </button>
            </div>

            <form onSubmit={handleSubmit}>
                <div style={styles.grid}>
                    <Field label="Traveler Name">
                        <input
                            value={form.traveler_name}
                            onChange={(e) => setField("traveler_name", e.target.value)}
                            style={styles.input}
                            disabled={disabled}
                        />
                    </Field>

                    <Field label="Destination City">
                        <input
                            value={form.destination_city}
                            onChange={(e) => setField("destination_city", e.target.value)}
                            style={styles.input}
                            disabled={disabled}
                        />
                    </Field>

                    <Field label="Start Date">
                        <input
                            type="date"
                            value={form.start_date}
                            onChange={(e) => setField("start_date", e.target.value)}
                            style={styles.input}
                            disabled={disabled}
                        />
                    </Field>

                    <Field label="End Date">
                        <input
                            type="date"
                            value={form.end_date}
                            onChange={(e) => setField("end_date", e.target.value)}
                            style={styles.input}
                            disabled={disabled}
                        />
                    </Field>
                </div>

                <div style={{ marginTop: 18 }}>
                    <Field label="Justification">
                        <textarea
                            value={form.justification}
                            onChange={(e) => setField("justification", e.target.value)}
                            style={styles.textarea}
                            disabled={disabled}
                        />
                    </Field>
                </div>

                <div style={styles.helperBox}>
                    <div style={styles.helperTitle}>Why this matters for ML</div>
                    <div style={styles.helperText}>
                        Justification length, packet completeness, and detected flag severity all contribute to
                        the ML model’s review prediction.
                    </div>
                </div>

                <div style={styles.buttonRow}>
                    <button
                        type="submit"
                        disabled={disabled}
                        style={{
                            ...styles.primaryButton,
                            opacity: disabled ? 0.7 : 1,
                            cursor: disabled ? "not-allowed" : "pointer",
                        }}
                    >
                        {disabled ? "Creating..." : "Create Draft"}
                    </button>
                </div>
            </form>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <div>
            <label style={styles.label}>{label}</label>
            {children}
        </div>
    );
}

const styles = {
    card: {
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 20,
        padding: 20,
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
    },
    header: {
        marginBottom: 18,
    },
    title: {
        margin: 0,
        fontSize: 24,
    },
    subtitle: {
        margin: "8px 0 0 0",
        color: "#475569",
        lineHeight: 1.5,
    },
    sectionLabel: {
        marginBottom: 10,
        fontSize: 12,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        color: "#64748b",
        fontWeight: 700,
    },
    scenarioRow: {
        display: "flex",
        flexWrap: "wrap",
        gap: 10,
        marginBottom: 18,
    },
    scenarioButton: {
        border: "none",
        borderRadius: 12,
        padding: "10px 14px",
        fontWeight: 700,
        cursor: "pointer",
    },
    approveButton: {
        background: "#ecfdf3",
        color: "#047857",
    },
    clarifyButton: {
        background: "#fffbeb",
        color: "#b45309",
    },
    holdButton: {
        background: "#fef2f2",
        color: "#b91c1c",
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 16,
    },
    label: {
        display: "block",
        marginBottom: 8,
        fontSize: 12,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        color: "#64748b",
        fontWeight: 700,
    },
    input: {
        width: "100%",
        padding: "12px 14px",
        borderRadius: 12,
        border: "1px solid #cbd5e1",
        fontSize: 14,
        background: "#ffffff",
        boxSizing: "border-box",
    },
    textarea: {
        width: "100%",
        minHeight: 110,
        padding: "12px 14px",
        borderRadius: 12,
        border: "1px solid #cbd5e1",
        fontSize: 14,
        background: "#ffffff",
        boxSizing: "border-box",
        resize: "vertical",
        fontFamily: "Arial, sans-serif",
        lineHeight: 1.5,
    },
    helperBox: {
        marginTop: 18,
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 14,
        padding: 14,
    },
    helperTitle: {
        fontWeight: 700,
        color: "#0f172a",
        marginBottom: 6,
    },
    helperText: {
        color: "#475569",
        lineHeight: 1.5,
        fontSize: 14,
    },
    buttonRow: {
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
};