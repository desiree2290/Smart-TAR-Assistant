# Smart TAR Assistant

An AI-assisted review system for **Travel Authorization Requests (TARs)** that combines **rule-based validation with machine learning risk prediction**.

The Smart TAR Assistant analyzes travel authorization submissions and supporting documents to identify discrepancies, estimate risk, and assist reviewers in prioritizing approvals.

The system uses a **hybrid architecture** that combines deterministic validation rules with a trained ML classifier.

---

# Project Overview

Travel Authorization Requests often require manual review to verify that travel details are consistent and complete. This process can be time-consuming and error-prone.

The Smart TAR Assistant automates this process by:

1. Detecting discrepancies using rule-based validation.
2. Assigning risk scores based on detected issues.
3. Using a machine learning model to predict approval outcomes.
4. Combining both approaches to produce a final risk assessment.

---

# System Architecture
TAR Request + Supporting Packet
            │
            ▼
      Rule Engine
 (detects discrepancies)
            │
            ▼
      Phase 3 Risk Engine
 (severity scoring + flags)
            │
            ▼
     ML Classifier (Logistic Regression)
 (predicts approve / clarify / hold)
            │
            ▼
     Hybrid Risk Score
 (rules + ML confidence)
            │
            ▼
       Review Output


---

# Key Features

## Rule-Based Validation

The rule engine detects common travel issues such as:

- Destination mismatches
- Missing hotel reservations
- Invalid or reversed travel dates
- Parking inconsistencies
- Missing required fields
- Weak or incomplete justifications

Each discrepancy generates a **flag with severity**.

Severity levels:

- LOW
- MED
- HIGH

These flags contribute to the **rule risk score**.

---

## Machine Learning Risk Prediction

A **Logistic Regression classifier** predicts the recommended action for a TAR:

- `approve`
- `clarify`
- `hold`

The ML model learns patterns from a synthetic dataset of TAR submissions.

---

## Hybrid Risk Scoring

The final risk score combines rule results with ML predictions.
rule score + ML adjustment


Risk levels:

| Score Range | Risk Level |
|-------------|-----------|
| 0–3 | Low |
| 4–8 | Medium |
| 9+ | High |

This hybrid approach improves reliability compared to using rules or ML alone.

---

# Machine Learning Model

Model type:
Logistic Regression


Training pipeline:

Synthetic TAR dataset
      │
Feature engineering
      │
Train/Test split
      │
Model training
      │
Serialized model (.joblib)


---

## Features Used

The model uses structured signals extracted from TAR submissions:

- `num_flags`
- `num_high_flags`
- `num_med_flags`
- `num_low_flags`
- `trip_length_days`
- `justification_len`
- `has_packet`

These features help the model learn patterns in:

- severity of discrepancies
- travel duration
- justification quality
- submission completeness

---

# Dataset

Synthetic TAR cases are generated programmatically.

Dataset size:
3000 cases
1000 approve
1000 clarify
1000 hold


Balanced classes help avoid bias during model training.

Dataset generation script:
ml/reports/figures/


---

# Exploratory Data Analysis

EDA scripts generate charts describing the dataset.

Generated figures are stored in:
ml/reports/figures/


Charts include:

### Label Distribution
Shows the number of examples for each class.

### Average Risk Score by Label
Demonstrates increasing severity from approve → clarify → hold.

### Average Flag Count by Label
Shows that higher-risk submissions typically contain more discrepancies.

---

# Demo Scenarios

Three demo cases demonstrate system behavior.

## Approve Scenario

Clean submission with consistent travel details.

Expected output:
Risk Level: low
ML Prediction: approve


---

## Clarify Scenario

Moderate issues such as weak justification or minor discrepancies.

Expected output:
Risk Level: medium
ML Prediction: clarify


---

## Hold Scenario

Major discrepancies including destination conflicts and invalid dates.

Expected output:
Risk Level: high
ML Prediction: hold


Run the demo:
PYTHONPATH=. python scripts/demo_cases.py


---

# Project Structure

backend/
│
├── app/
│   ├── review.py
│   ├── ml_utils.py
│   ├── phase3/
│   └── models/
│
├── ml/
│   ├── src/
│   │   ├── acquire.py
│   │   ├── prepare.py
│   │   ├── train.py
│   │   ├── explore.py
│   │   └── features.py
│   │
│   ├── data/
│   │   ├── raw/
│   │   └── processed/
│   │
│   └── reports/
│       └── figures/
│
├── scripts/
│   └── demo_cases.py
│
└── tests/


---

# Running the System

## Install Dependencies
pip install -r requirements.txt


---

## Generate Synthetic Dataset
python -m ml.src.acquire


---

## Prepare Training Data
python -m ml.src.prepare


---

## Train the Model
python -m ml.src.train


---

## Run Demo Scenarios
PYTHONPATH=. python scripts/demo_cases.py


---

## Generate EDA Charts
python -m ml.src.explore


---

# Example Output
Traveler: Jordan Smith
TAR destination: San Diego
Flags found: 7
Rule score: 7
Final risk score: 9
Risk level: high
ML predicted risk class: clarify
ML confidence: 0.99


---

# Future Improvements

Potential extensions include:

- OCR extraction from PDF travel packets
- NLP analysis of justification text
- anomaly detection for travel cost estimates
- additional ML models (Random Forest, Gradient Boosting)
- web interface for reviewers

---

# Capstone Summary

The Smart TAR Assistant demonstrates how **machine learning can augment rule-based compliance systems**.

Key contributions:

- hybrid AI architecture
- automated synthetic data generation
- interpretable risk scoring
- explainable model predictions
- reproducible ML pipeline