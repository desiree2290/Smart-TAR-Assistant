import React, { useState } from "react";
import { uploadAttachment } from "../api.js";

export default function UploadAttachment({ requestId }) {
    const [file, setFile] = useState(null);
    const [msg, setMsg] = useState("");

    async function onUpload() {
        if (!file) return;
        setMsg("Uploading...");
        try {
            await uploadAttachment(requestId, file);
            setMsg("Uploaded ✅");
        } catch {
            setMsg("Upload failed ❌");
        }
    }

    return (
        <div style={{ marginTop: 12 }}>
            <div><b>Attachment (PDF)</b></div>
            <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <button onClick={onUpload} style={{ marginLeft: 8 }}>Upload</button>
            {msg && <div style={{ marginTop: 6 }}>{msg}</div>}
        </div>
    );
}
