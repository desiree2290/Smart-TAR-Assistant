from transformers import pipeline

# Load once (VERY IMPORTANT)
classifier = pipeline(
    "text-classification",
    model="distilbert-base-uncased-finetuned-sst-2-english"
)

def predict_justification(text: str):
    if not text:
        return {
            "label": "CLARIFY",
            "confidence": 0.5
        }

    result = classifier(text[:512])[0]

    # Map sentiment → TAR decision (simple version)
    label_map = {
        "POSITIVE": "APPROVE",
        "NEGATIVE": "HOLD"
    }

    mapped_label = label_map.get(result["label"], "CLARIFY")

    return {
        "label": mapped_label,
        "confidence": round(result["score"], 3)
    }