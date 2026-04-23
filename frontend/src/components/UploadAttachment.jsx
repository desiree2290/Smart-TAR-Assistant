import React, { useMemo, useState } from "react";
import { uploadAttachment } from "../api.js";

export default function UploadAttachment({ requestId }) {
    const [file, setFile] = useState(null);
    const [msg, setMsg] = useState("");
    const [busy, setBusy] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [submitBusy, setSubmitBusy] = useState(false);
    const [submitMsg, setSubmitMsg] = useState("");


    const fileMeta = useMemo(() => {
        if (!file) return null;

        const sizeKb = `${(file.size / 1024).toFixed(1)} KB`;
        return {
            name: file.name,
            size: sizeKb,
            type: file.type || "application/pdf",
        };
    }, [file]);

    const [reviewResult, setReviewResult] = useState(null);

    async function onUpload() {
        if (!file || busy) return;

        setBusy(true);
        setMsg("Uploading packet...");

        try {
            const result = await uploadAttachment(requestId, file);

            setUploadResult(result);  // 👈 SAVE RESPONSE

            setMsg("Packet uploaded successfully ");
        } catch (e) {
            setMsg("Upload failed ");
        } finally {
            setBusy(false);
        }
    }

    async function onSubmitReview() {
        if (!requestId || submitBusy) return;

        setSubmitBusy(true);
        setSubmitMsg("Submitting request and running AI review...");
        setReviewResult(null);

        try {
            const result = await submitRequest(requestId);
            setReviewResult(result.review);
            setSubmitMsg("AI review completed ");
        } catch (err) {
            console.error(err);
            setSubmitMsg("AI review failed ");
        } finally {
            setSubmitBusy(false);
        }
    }

    return (
        <div style={styles.card}>
            <div style={styles.headerRow}>
                <div>
                    <h4 style={styles.title}>Supporting Packet Upload</h4>
                    <p style={styles.subtitle}>
                        Upload the traveler’s PDF packet so it can be reviewed by the Smart TAR Assistant.
                    </p>
                </div>
                <div style={styles.badge}>PDF Only</div>
            </div>

            <div style={styles.uploadArea}>
                <label style={styles.fileLabel}>
                    <span style={styles.fileButtonText}>Choose PDF</span>
                    <input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        style={styles.hiddenInput}
                    />
                </label>

                {fileMeta ? (
                    <div style={styles.fileInfoCard}>
                        <div style={styles.fileName}>{fileMeta.name}</div>
                        <div style={styles.fileMeta}>
                            <span>{fileMeta.size}</span>
                            <span>•</span>
                            <span>{fileMeta.type}</span>
                        </div>
                    </div>
                ) : (
                    <div style={styles.placeholderBox}>
                        No file selected yet. Choose a PDF packet to continue.
                    </div>
                )}
            </div>

            <div style={styles.helperBox}>
                <div style={styles.helperTitle}>What happens after upload?</div>
                <div style={styles.helperText}>
                    Once the packet is attached and the request is submitted, the backend can extract fields,
                    run rule checks, and generate ML-assisted review output.
                </div>
            </div>

            <div style={styles.actionRow}>
                <button
                    onClick={onUpload}
                    disabled={!file || busy}
                    style={{
                        ...styles.uploadButton,
                        opacity: !file || busy ? 0.65 : 1,
                        cursor: !file || busy ? "not-allowed" : "pointer",
                    }}
                >
                    {busy ? "Uploading..." : "Upload Packet"}
                </button>
            </div>

            {msg && (
                <div
                    style={{
                        ...styles.message,
                        ...(msg.includes("failed") ? styles.errorMsg : styles.successMsg),
                    }}
                >
                    {msg}
                </div>
            )}
            {uploadResult && (
                <div style={{
                    marginTop: 16,
                    padding: 16,
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    background: "#f8fafc"
                }}>
                    <h4 style={{ marginTop: 0 }}>Extracted Packet Preview</h4>

                    <p><strong>File:</strong> {uploadResult.filename}</p>

                    <pre style={{
                        whiteSpace: "pre-wrap",
                        fontSize: 12,
                        background: "#fff",
                        padding: 12,
                        borderRadius: 8,
                        maxHeight: 200,
                        overflow: "auto"
                    }}>
                        {uploadResult.extracted_text_preview}
                    </pre>
                </div>
            )}
            {reviewResult && (
                <div style={{
                    marginTop: 20,
                    padding: 16,
                    borderRadius: 12,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0"
                }}>
                    <h4 style={{ marginTop: 0 }}>AI Review Result</h4>

                    <p><strong>Prediction:</strong> {reviewResult.prediction ?? "N/A"}</p>
                    <p><strong>Confidence:</strong> {reviewResult.confidence ?? "N/A"}</p>

                    {reviewResult.summary && (
                        <p><strong>Summary:</strong> {reviewResult.summary}</p>
                    )}

                    {Array.isArray(reviewResult.flags) && reviewResult.flags.length > 0 && (
                        <>
                            <p><strong>Flags:</strong></p>
                            <ul>
                                {reviewResult.flags.map((flag, i) => (
                                    <li key={i}>
                                        {typeof flag === "string"
                                            ? flag
                                            : JSON.stringify(flag)}
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

const styles = {
    card: {
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 18,
        padding: 18,
    },
    headerRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 14,
        marginBottom: 16,
    },
    title: {
        margin: 0,
        fontSize: 18,
        color: "#0f172a",
    },
    subtitle: {
        margin: "6px 0 0 0",
        color: "#475569",
        lineHeight: 1.5,
        fontSize: 14,
    },
    badge: {
        padding: "8px 12px",
        borderRadius: 999,
        background: "#eff6ff",
        color: "#1d4ed8",
        fontWeight: 700,
        fontSize: 12,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        whiteSpace: "nowrap",
    },
    uploadArea: {
        display: "grid",
        gap: 12,
    },
    fileLabel: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        alignSelf: "start",
        background: "#ffffff",
        border: "1px solid #cbd5e1",
        borderRadius: 12,
        padding: "12px 16px",
        fontWeight: 700,
        color: "#0f172a",
        cursor: "pointer",
        width: "fit-content",
    },
    fileButtonText: {
        fontSize: 14,
    },
    hiddenInput: {
        display: "none",
    },
    fileInfoCard: {
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 14,
        padding: 14,
    },
    fileName: {
        fontWeight: 700,
        color: "#0f172a",
        wordBreak: "break-word",
    },
    fileMeta: {
        marginTop: 6,
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        color: "#64748b",
        fontSize: 13,
    },
    placeholderBox: {
        background: "#ffffff",
        border: "1px dashed #cbd5e1",
        borderRadius: 14,
        padding: 14,
        color: "#64748b",
        fontSize: 14,
    },
    helperBox: {
        marginTop: 14,
        background: "#ffffff",
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
    actionRow: {
        marginTop: 16,
        display: "flex",
        justifyContent: "flex-end",
    },
    uploadButton: {
        background: "#0f172a",
        color: "#ffffff",
        border: "none",
        borderRadius: 14,
        padding: "12px 18px",
        fontWeight: 700,
        fontSize: 14,
    },
    message: {
        marginTop: 14,
        borderRadius: 12,
        padding: "10px 12px",
        fontWeight: 600,
        fontSize: 14,
    },
    successMsg: {
        background: "#ecfdf3",
        border: "1px solid #bbf7d0",
        color: "#047857",
    },
    errorMsg: {
        background: "#fef2f2",
        border: "1px solid #fecaca",
        color: "#b91c1c",
    },
};