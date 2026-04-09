import React from "react";
import { Routes, Route, NavLink } from "react-router-dom";
import Traveler from "./pages/Traveler.jsx";
import ApproverQueue from "./pages/ApproverQueue.jsx";
import RequestDetail from "./pages/RequestDetail.jsx";
import Analytics from "./pages/Analytics";
import FeatureTiles from "./components/FeatureTiles";

export default function App() {
    return (
        <div style={styles.appShell}>
            <header style={styles.topBar}>
                <div style={styles.brandBlock}>
                    <div style={styles.logo}>ST</div>
                    <div>
                        <h1 style={styles.brandTitle}>Smart TAR Assistant</h1>
                        <div style={styles.brandSubtitle}>
                            Hybrid travel review using rules, risk scoring, and ML prediction
                        </div>
                    </div>
                </div>

                <nav style={styles.nav}>
                    <AppNavLink to="/">Traveler</AppNavLink>
                    <AppNavLink to="/approver">Approver Queue</AppNavLink>
                    <AppNavLink to="/analytics">Analytics</AppNavLink>
                </nav>
            </header>

            <section style={styles.hero}>
                <div>
                    <div style={styles.heroEyebrow}>Capstone Demo Platform</div>
                    <h2 style={styles.heroTitle}>AI-assisted review for Travel Authorization Requests</h2>
                    <p style={styles.heroText}>
                        This interface showcases the full Smart TAR workflow: request intake, supporting
                        document upload, discrepancy detection, ML-assisted prediction, and reviewer-facing
                        decision support.
                    </p>
                </div>

                <div style={styles.heroStats}>
                    <HeroStat label="Review Model" value="Rules + ML" />
                    <HeroStat label="ML Outputs" value="Approve / Clarify / Hold" />
                    <HeroStat label="Primary Goal" value="Faster, explainable review" />
                </div>
            </section>
            
            <main style={styles.main}>
                <Routes>
                    <Route path="/" element={<Traveler />} />
                    <Route path="/approver" element={<ApproverQueue />} />
                    <Route path="/requests/:id" element={<RequestDetail />} />
                    <Route path="/analytics" element={<Analytics />} />
                </Routes>
            </main>
            
            <footer style={styles.footer}>
                <div>Smart TAR Assistant</div>
                <div style={styles.footerText}>
                    Demonstrating explainable hybrid review with deterministic checks and ML prediction.
                </div>
            </footer>
        </div>
    );
}

function AppNavLink({ to, children }) {
    return (
        <NavLink
            to={to}
            end={to === "/"}
            style={({ isActive }) => ({
                textDecoration: "none",
                padding: "10px 14px",
                borderRadius: 12,
                borderWidth: "1px",
                borderStyle: "solid",
                borderColor: isActive ? "#0f172a" : "#cbd5e1",
                background: isActive ? "#0f172a" : "#ffffff",
                color: isActive ? "#ffffff" : "#334155",
                fontWeight: 700,
                fontSize: 14,
            })}
        >
            {children}
        </NavLink>
    );
}

function HeroStat({ label, value }) {
    return (
        <div style={styles.heroStatCard}>
            <div style={styles.heroStatLabel}>{label}</div>
            <div style={styles.heroStatValue}>{value}</div>
        </div>
    );
}

const styles = {
    appShell: {
        minHeight: "100vh",
        background: "#f1f5f9",
        fontFamily: "Arial, sans-serif",
        color: "#0f172a",
    },
    topBar: {
        position: "sticky",
        top: 0,
        zIndex: 20,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        padding: "16px 24px",
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid #e2e8f0",
    },
    brandBlock: {
        display: "flex",
        alignItems: "center",
        gap: 14,
    },
    logo: {
        width: 44,
        height: 44,
        borderRadius: 14,
        background: "#0f172a",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
        fontSize: 16,
        letterSpacing: 0.5,
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.18)",
    },
    brandTitle: {
        margin: 0,
        fontSize: 22,
        lineHeight: 1.1,
    },
    brandSubtitle: {
        marginTop: 4,
        fontSize: 13,
        color: "#64748b",
    },
    nav: {
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
    },
    
    hero: {
        maxWidth: 1280,
        margin: "24px auto 0 auto",
        padding: "0 24px",
        display: "grid",
        gridTemplateColumns: "1.2fr 0.8fr",
        gap: 20,
    },
    heroEyebrow: {
        fontSize: 12,
        textTransform: "uppercase",
        letterSpacing: 0.8,
        color: "#475569",
        fontWeight: 800,
        marginBottom: 10,
    },
    heroTitle: {
        margin: 0,
        fontSize: 34,
        lineHeight: 1.15,
    },
    heroText: {
        marginTop: 12,
        color: "#475569",
        lineHeight: 1.7,
        maxWidth: 760,
        fontSize: 15,
    },
    heroStats: {
        display: "grid",
        gap: 12,
        alignContent: "start",
    },
    heroStatCard: {
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 18,
        padding: 16,
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
    },
    heroStatLabel: {
        fontSize: 12,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        color: "#64748b",
        fontWeight: 700,
    },
    heroStatValue: {
        marginTop: 8,
        fontSize: 20,
        fontWeight: 800,
        color: "#0f172a",
    },
    main: {
        maxWidth: 1280,
        margin: "20px auto 0 auto",
        padding: "0 24px 32px 24px",
    },
    footer: {
        borderTop: "1px solid #e2e8f0",
        marginTop: 24,
        padding: "18px 24px 28px 24px",
        color: "#475569",
        fontSize: 14,
        maxWidth: 1280,
        marginLeft: "auto",
        marginRight: "auto",
    },
    footerText: {
        marginTop: 6,
    },
};