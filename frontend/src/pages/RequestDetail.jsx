import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getRequest, getReview } from "../api.js";
import ReviewPanel from "../components/ReviewPanel.jsx";

export default function RequestDetail() {
    const { id } = useParams();
    const [req, setReq] = useState(null);
    const [review, setReview] = useState(null);

    useEffect(() => {
        getRequest(id).then(setReq);
        getReview(id).then(setReview).catch(() => setReview(null));
    }, [id]);

    if (!req) return <div>Loading...</div>;

    return (
        <div>
            <h3>Request Detail</h3>

            <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
                <div><b>Traveler:</b> {req.traveler_name}</div>
                <div><b>Destination:</b> {req.destination_city}</div>
                <div><b>Dates:</b> {req.start_date} to {req.end_date}</div>
                <div><b>Status:</b> {req.status}</div>
                <div style={{ marginTop: 8 }}><b>Justification:</b><br />{req.justification}</div>
            </div>

            <div style={{ marginTop: 16 }}>
                <ReviewPanel review={review} />
            </div>
        </div>
    );
}
