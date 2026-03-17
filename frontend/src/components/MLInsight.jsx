import React from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

export default function MLInsights({ ml }) {
    if (!ml) return null;

    const probs = [
        { name: "Approve", value: ml.ml_probabilities[0] },
        { name: "Clarify", value: ml.ml_probabilities[1] },
        { name: "Hold", value: ml.ml_probabilities[2] },
    ];

    const features = Object.entries(ml.ml_features_used).map(([k, v]) => ({
        name: k,
        value: v,
    }));

    return (
        <div style={{ marginTop: 20 }}>
            <h4>ML Model Insights</h4>

            <div style={{ height: 220 }}>
                <ResponsiveContainer>
                    <BarChart data={probs}>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <h5 style={{ marginTop: 20 }}>Features Used</h5>

            <div style={{ height: 220 }}>
                <ResponsiveContainer>
                    <BarChart data={features}>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}