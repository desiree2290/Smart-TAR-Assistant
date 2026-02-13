import React, { useState } from "react";

export default function RequestForm({ onCreate, disabled }) {
    const [form, setForm] = useState({
        traveler_name: "Desiree Hodge",
        destination_city: "San Diego",
        start_date: "2026-03-12",
        end_date: "2026-03-15",
        justification: "Attend a conference relevant to current program objectives and improve organizational readiness.",
    });

    function set(key, value) {
        setForm((f) => ({ ...f, [key]: value }));
    }

    return (
        <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
            <h4>Create TAR</h4>

            <label>Traveler Name</label><br />
            <input value={form.traveler_name} onChange={(e) => set("traveler_name", e.target.value)} style={{ width: "100%" }} /><br /><br />

            <label>Destination City</label><br />
            <input value={form.destination_city} onChange={(e) => set("destination_city", e.target.value)} style={{ width: "100%" }} /><br /><br />

            <label>Start Date</label><br />
            <input value={form.start_date} onChange={(e) => set("start_date", e.target.value)} style={{ width: "100%" }} /><br /><br />

            <label>End Date</label><br />
            <input value={form.end_date} onChange={(e) => set("end_date", e.target.value)} style={{ width: "100%" }} /><br /><br />

            <label>Justification</label><br />
            <textarea value={form.justification} onChange={(e) => set("justification", e.target.value)} style={{ width: "100%", minHeight: 80 }} /><br /><br />

            <button onClick={() => onCreate(form)} disabled={disabled}>
                Create Draft
            </button>
        </div>
    );
}
