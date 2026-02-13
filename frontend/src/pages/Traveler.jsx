import React, { useState } from "react";
import RequestForm from "../components/RequestForm.jsx";
import UploadAttachment from "../components/UploadAttachment.jsx";
import { createRequest, submitRequest } from "../api.js";
import { useNavigate } from "react-router-dom";

export default function Traveler() {
    const [created, setCreated] = useState(null);
    const [busy, setBusy] = useState(false);
    const nav = useNavigate();

    async function onCreate(payload) {
        setBusy(true);
        try {
            const req = await createRequest(payload);
            setCreated(req);
        } finally {
            setBusy(false);
        }
    }

    async function onSubmit() {
        if (!created) return;
        setBusy(true);
        try {
            await submitRequest(created.id);
            nav(`/requests/${created.id}`);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div>
            <h3>Traveler</h3>
            <p>Create a request, upload a PDF, then submit for AI review.</p>

            <RequestForm onCreate={onCreate} disabled={busy} />

            {created && (
                <div style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
                    <div><b>Request created:</b> {created.id}</div>
                    <div><b>Status:</b> {created.status}</div>

                    <UploadAttachment requestId={created.id} />

                    <button onClick={onSubmit} disabled={busy} style={{ marginTop: 12 }}>
                        Submit (Run AI Review)
                    </button>
                </div>
            )}
        </div>
    );
}
