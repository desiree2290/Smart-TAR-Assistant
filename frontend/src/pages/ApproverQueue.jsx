import React, { useEffect, useState } from "react";
import { listRequests } from "../api.js";
import { Link } from "react-router-dom";

export default function ApproverQueue() {
    const [rows, setRows] = useState([]);

    useEffect(() => {
        listRequests("submitted").then(setRows).catch(() => setRows([]));
    }, []);

    return (
        <div>
            <h3>Approver Queue</h3>
            <p>Shows submitted requests.</p>

            <div style={{ display: "grid", gap: 10 }}>
                {rows.map((r) => (
                    <div key={r.id} style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
                        <div><b>{r.traveler_name}</b> → {r.destination_city}</div>
                        <div>{r.start_date} to {r.end_date}</div>
                        <div>Status: {r.status}</div>
                        <Link to={`/requests/${r.id}`}>Open</Link>
                    </div>
                ))}
                {rows.length === 0 && <div>No submitted requests yet.</div>}
            </div>
        </div>
    );
}
