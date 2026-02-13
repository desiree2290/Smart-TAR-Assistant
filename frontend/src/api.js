const API_BASE = "http://127.0.0.1:8000";


export async function createRequest(payload) {
    const res = await fetch(`${API_BASE}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to create request");
    return res.json();
}

export async function listRequests(status) {
    const url = status ? `${API_BASE}/requests?status=${status}` : `${API_BASE}/requests`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to list requests");
    return res.json();
}

export async function getRequest(id) {
    const res = await fetch(`${API_BASE}/requests/${id}`);
    if (!res.ok) throw new Error("Failed to get request");
    return res.json();
}

export async function uploadAttachment(id, file) {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_BASE}/requests/${id}/attachment`, {
        method: "POST",
        body: form,
    });
    if (!res.ok) throw new Error("Failed to upload attachment");
    return res.json();
}

export async function submitRequest(id) {
    const res = await fetch(`${API_BASE}/requests/${id}/submit`, { method: "POST" });
    if (!res.ok) throw new Error("Failed to submit");
    return res.json();
}

export async function getReview(id) {
    const res = await fetch(`${API_BASE}/requests/${id}/review`);
    if (!res.ok) throw new Error("No review yet");
    return res.json();
}
