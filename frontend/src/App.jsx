import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import Traveler from "./pages/Traveler.jsx";
import ApproverQueue from "./pages/ApproverQueue.jsx";
import RequestDetail from "./pages/RequestDetail.jsx";

export default function App() {
    return (
        <div style={{ fontFamily: "system-ui", padding: 16, maxWidth: 980, margin: "0 auto" }}>
            <header style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ margin: 0 }}>Smart TAR Review Assistant</h2>
                <nav style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
                    <Link to="/">Traveler</Link>
                    <Link to="/approver">Approver</Link>
                </nav>
            </header>

            <Routes>
                <Route path="/" element={<Traveler />} />
                <Route path="/approver" element={<ApproverQueue />} />
                <Route path="/requests/:id" element={<RequestDetail />} />
            </Routes>
        </div>
    );
}
