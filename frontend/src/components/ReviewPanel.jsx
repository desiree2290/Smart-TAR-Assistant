import React from "react";

export default function ReviewPanel({ review }) {
    if (!review) {
        return (
            <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
                <h4>AI Review</h4>
                <div>No review found yet (submit the request to generate it).</div>
            </div>
        );
    }

    return (
        <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
            <h4>AI Review</h4>

            <div>
                <b>Summary</b>
                <ul>
                    {review.summary.map((b, i) => <li key={i}>{b}</li>)}
                </ul>
            </div>

            <div>
                <b>Extracted Fields</b>
                <pre style={{ background: "#f7f7f7", padding: 10, borderRadius: 8 }}>
                    {JSON.stringify(review.extracted_fields, null, 2)}
                </pre>
            </div>

            <div>
                <b>Flags</b>
                {review.flags.length === 0 ? (
                    <div>No flags ✅</div>
                ) : (
                    <ul>
                        {review.flags.map((f, i) => (
                            <li key={i}>
                                <b>{f.type}</b> ({f.severity}) — {f.description}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div>
                <b>Questions</b>
                {review.questions.length === 0 ? (
                    <div>No questions ✅</div>
                ) : (
                    <ul>
                        {review.questions.map((q, i) => <li key={i}>{q}</li>)}
                    </ul>
                )}
            </div>
        </div>
    );
}
