"""
train.py
─────────
Trains THREE models for CollabCore ML:

  1. TeamQualityClassifier   → RandomForest: predicts Good/At-Risk
  2. TaskAssignmentRanker    → GradientBoosting: ranks students for tasks
  3. RiskDetector            → LogisticRegression: early risk flagging

Each model is:
  - Cross-validated on the train split
  - Evaluated on the val split (accuracy, precision, recall, F1, AUC)
  - Saved as a .pkl file

Usage:
    python model/train.py --data data/teams_historical.csv
"""

import os
import sys
import argparse
import warnings
import json

import numpy as np
import pandas as pd
import joblib
import matplotlib
matplotlib.use("Agg")   # non-interactive backend
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.ensemble import (
    RandomForestClassifier,
    GradientBoostingClassifier,
    VotingClassifier,
)
from sklearn.linear_model  import LogisticRegression
from sklearn.model_selection import (
    StratifiedKFold, cross_validate,
    GridSearchCV
)
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, roc_auc_score, confusion_matrix,
    classification_report
)
from sklearn.pipeline import Pipeline

warnings.filterwarnings("ignore")
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from utils.constants import TARGET_COL, SUCCESS_THRESHOLD
from model.preprocessor import run_pipeline

SAVE_DIR = "model/saved"
PLOT_DIR = "model/plots"
os.makedirs(SAVE_DIR, exist_ok=True)
os.makedirs(PLOT_DIR, exist_ok=True)


# ─── Helpers ───────────────────────────────────────────────────────────────────

def get_XY(df: pd.DataFrame, feature_cols: list[str]):
    X = df[feature_cols].values.astype("float32")
    y = df["success_label"].values.astype(int)
    return X, y


def evaluate(model, X, y, split_name: str = "Val") -> dict:
    y_pred = model.predict(X)
    y_prob = model.predict_proba(X)[:, 1] if hasattr(model, "predict_proba") else y_pred

    metrics = {
        "accuracy":  round(accuracy_score(y, y_pred),           4),
        "precision": round(precision_score(y, y_pred,           zero_division=0), 4),
        "recall":    round(recall_score(y, y_pred,              zero_division=0), 4),
        "f1":        round(f1_score(y, y_pred,                  zero_division=0), 4),
        "auc":       round(roc_auc_score(y, y_prob),            4),
    }
    print(f"\n  [{split_name}] Accuracy={metrics['accuracy']:.3f}  "
          f"F1={metrics['f1']:.3f}  AUC={metrics['auc']:.3f}")
    return metrics


def plot_confusion(model, X, y, title: str, path: str):
    cm   = confusion_matrix(y, model.predict(X))
    fig, ax = plt.subplots(figsize=(4, 3))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
                xticklabels=["At-Risk", "Good"],
                yticklabels=["At-Risk", "Good"], ax=ax)
    ax.set_title(title)
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")
    plt.tight_layout()
    plt.savefig(path, dpi=120)
    plt.close()
    print(f"  📊  Confusion matrix saved → {path}")


def plot_feature_importance(model, feature_names: list[str], title: str, path: str):
    if not hasattr(model, "feature_importances_"):
        return
    importances = model.feature_importances_
    idx = np.argsort(importances)[::-1][:15]   # top 15

    fig, ax = plt.subplots(figsize=(7, 5))
    ax.barh([feature_names[i] for i in reversed(idx)],
            [importances[i]   for i in reversed(idx)],
            color="#4F8EF7")
    ax.set_title(title)
    ax.set_xlabel("Importance")
    plt.tight_layout()
    plt.savefig(path, dpi=120)
    plt.close()
    print(f"  📊  Feature importance saved → {path}")


# ─── Model 1: Team Quality Classifier ─────────────────────────────────────────

def train_team_quality(train_df, val_df, test_df, feature_cols):
    print(f"\n{'─'*50}")
    print("  Model 1 — TeamQualityClassifier (RandomForest + SMOTE)")
    print(f"{'─'*50}")

    X_train, y_train = get_XY(train_df, feature_cols)
    X_val,   y_val   = get_XY(val_df,   feature_cols)
    X_test,  y_test  = get_XY(test_df,  feature_cols)

    # Handle class imbalance with SMOTE if needed
    pos_ratio = y_train.mean()
    if pos_ratio < 0.35 or pos_ratio > 0.65:
        try:
            from imblearn.over_sampling import SMOTE
            sm = SMOTE(random_state=42)
            X_train, y_train = sm.fit_resample(X_train, y_train)
            print(f"  ⚖  SMOTE applied → {X_train.shape[0]} samples "
                  f"({y_train.mean():.1%} positive)")
        except ImportError:
            print("  ⚠  imblearn not installed — skipping SMOTE")

    # Hyperparameter search (small grid for speed)
    param_grid = {
        "n_estimators":      [100, 200],
        "max_depth":         [None, 8, 12],
        "min_samples_split": [2, 5],
    }
    base = RandomForestClassifier(random_state=42, n_jobs=-1, class_weight="balanced")
    gs   = GridSearchCV(base, param_grid,
                        cv=StratifiedKFold(n_splits=5, shuffle=True, random_state=42),
                        scoring="f1", n_jobs=-1, verbose=0)
    gs.fit(X_train, y_train)
    best_rf = gs.best_estimator_
    print(f"  🎯  Best params: {gs.best_params_}")

    # Cross-validation report
    cv_res = cross_validate(best_rf, X_train, y_train,
                            cv=StratifiedKFold(5, shuffle=True, random_state=0),
                            scoring=["accuracy","f1","roc_auc"], return_train_score=True)
    print(f"  📈  CV F1   = {cv_res['test_f1'].mean():.3f} ± {cv_res['test_f1'].std():.3f}")
    print(f"  📈  CV AUC  = {cv_res['test_roc_auc'].mean():.3f} ± {cv_res['test_roc_auc'].std():.3f}")

    val_metrics  = evaluate(best_rf, X_val,  y_val,  "Val")
    test_metrics = evaluate(best_rf, X_test, y_test, "Test")

    print(f"\n{classification_report(y_test, best_rf.predict(X_test), target_names=['At-Risk','Good'])}")

    # Save
    model_path = f"{SAVE_DIR}/team_quality_classifier.pkl"
    joblib.dump(best_rf, model_path)
    print(f"  💾  Saved → {model_path}")

    plot_confusion(best_rf, X_test, y_test,
                   "Team Quality — Confusion Matrix",
                   f"{PLOT_DIR}/team_quality_cm.png")
    plot_feature_importance(best_rf, feature_cols,
                            "Team Quality — Feature Importance",
                            f"{PLOT_DIR}/team_quality_fi.png")

    return best_rf, val_metrics, test_metrics


# ─── Model 2: Task Assignment Ranker ──────────────────────────────────────────

def train_task_assignment(train_df, val_df, test_df, feature_cols):
    """
    Task assignment is framed as a classification problem:
    'Does this student–task pair result in on-time completion?'
    We use GradientBoosting for better calibration.
    In real use: pass student skill vector + task requirement vector.
    Here we approximate using team features as a proxy.
    """
    print(f"\n{'─'*50}")
    print("  Model 2 — TaskAssignmentRanker (GradientBoosting)")
    print(f"{'─'*50}")

    X_train, y_train = get_XY(train_df, feature_cols)
    X_val,   y_val   = get_XY(val_df,   feature_cols)
    X_test,  y_test  = get_XY(test_df,  feature_cols)

    model = GradientBoostingClassifier(
        n_estimators=150,
        learning_rate=0.08,
        max_depth=4,
        subsample=0.8,
        random_state=42
    )
    model.fit(X_train, y_train)

    val_metrics  = evaluate(model, X_val,  y_val,  "Val")
    test_metrics = evaluate(model, X_test, y_test, "Test")

    model_path = f"{SAVE_DIR}/task_assignment_ranker.pkl"
    joblib.dump(model, model_path)
    print(f"  💾  Saved → {model_path}")

    plot_confusion(model, X_test, y_test,
                   "Task Assignment — Confusion Matrix",
                   f"{PLOT_DIR}/task_assignment_cm.png")

    return model, val_metrics, test_metrics


# ─── Model 3: Risk Detector ───────────────────────────────────────────────────

def train_risk_detector(train_df, val_df, test_df, feature_cols):
    """
    Risk detection: identify At-Risk teams EARLY (high recall is key).
    LogisticRegression with class_weight='balanced' maximises recall on minority.
    Uses only features available early in the project lifecycle.
    """
    print(f"\n{'─'*50}")
    print("  Model 3 — RiskDetector (Logistic Regression, recall-optimised)")
    print(f"{'─'*50}")

    # Use only features available at team formation (no workload/task history)
    early_features = [c for c in feature_cols
                      if c not in ("workload_balance_score", "max_skill_gap")]
    print(f"  📋  Using {len(early_features)} early-available features")

    X_train, y_train = get_XY(train_df, early_features)
    X_val,   y_val   = get_XY(val_df,   early_features)
    X_test,  y_test  = get_XY(test_df,  early_features)

    # Invert label: 1 = AT RISK (minority we care about detecting)
    y_train_r = 1 - y_train
    y_val_r   = 1 - y_val
    y_test_r  = 1 - y_test

    model = LogisticRegression(
        C=0.5,
        class_weight="balanced",
        solver="lbfgs",
        max_iter=500,
        random_state=42
    )
    model.fit(X_train, y_train_r)

    val_metrics  = evaluate(model, X_val,  y_val_r,  "Val")
    test_metrics = evaluate(model, X_test, y_test_r, "Test")

    # Save with feature list (risk model uses a different subset)
    payload = {"model": model, "features": early_features}
    model_path = f"{SAVE_DIR}/risk_detector.pkl"
    joblib.dump(payload, model_path)
    print(f"  💾  Saved → {model_path}")

    plot_confusion(model, X_test, y_test_r,
                   "Risk Detector — Confusion Matrix",
                   f"{PLOT_DIR}/risk_detector_cm.png")

    return model, val_metrics, test_metrics


# ─── Ensemble (optional bonus) ────────────────────────────────────────────────

def train_ensemble(rf_model, gb_model, train_df, val_df, test_df, feature_cols):
    """
    Combine RF + GB into a soft-voting ensemble for the primary classifier.
    """
    print(f"\n{'─'*50}")
    print("  Ensemble — VotingClassifier (RF + GB)")
    print(f"{'─'*50}")

    X_train, y_train = get_XY(train_df, feature_cols)
    X_val,   y_val   = get_XY(val_df,   feature_cols)
    X_test,  y_test  = get_XY(test_df,  feature_cols)

    ensemble = VotingClassifier(
        estimators=[("rf", rf_model), ("gb", gb_model)],
        voting="soft"
    )
    ensemble.fit(X_train, y_train)

    evaluate(ensemble, X_val,  y_val,  "Val")
    evaluate(ensemble, X_test, y_test, "Test")

    joblib.dump(ensemble, f"{SAVE_DIR}/ensemble.pkl")
    print(f"  💾  Ensemble saved → {SAVE_DIR}/ensemble.pkl")
    return ensemble


# ─── Main ─────────────────────────────────────────────────────────────────────

def main(data_path: str):
    print(f"\n{'='*55}")
    print(f"  CollabCore ML — Training Pipeline")
    print(f"{'='*55}")

    # 1. Preprocess
    result = run_pipeline(
        input_path=data_path,
        scaler_save_path=f"{SAVE_DIR}/scaler.pkl",
        splits_save_dir="data/processed/"
    )
    train_df     = result["train"]
    val_df       = result["val"]
    test_df      = result["test"]
    feature_cols = result["feature_cols"]

    # Save feature list for inference
    with open(f"{SAVE_DIR}/feature_cols.json", "w") as f:
        json.dump(feature_cols, f, indent=2)
    print(f"\n  💾  Feature list saved → {SAVE_DIR}/feature_cols.json")

    # 2. Train models
    rf_model,  rf_val,  rf_test  = train_team_quality(   train_df, val_df, test_df, feature_cols)
    gb_model,  gb_val,  gb_test  = train_task_assignment( train_df, val_df, test_df, feature_cols)
    lr_model,  lr_val,  lr_test  = train_risk_detector(   train_df, val_df, test_df, feature_cols)
    ensemble                      = train_ensemble(rf_model, gb_model, train_df, val_df, test_df, feature_cols)

    # 3. Summary report
    report = {
        "team_quality":    {"val": rf_val, "test": rf_test},
        "task_assignment": {"val": gb_val, "test": gb_test},
        "risk_detector":   {"val": lr_val, "test": lr_test},
    }
    with open(f"{SAVE_DIR}/metrics_report.json", "w") as f:
        json.dump(report, f, indent=2)

    print(f"\n{'='*55}")
    print(f"  ✅  All models trained and saved to {SAVE_DIR}/")
    print(f"{'='*55}")
    print(f"\n  FINAL TEST METRICS:")
    print(f"  {'Model':<25} {'F1':>6}  {'AUC':>6}")
    print(f"  {'─'*40}")
    for name, m in report.items():
        print(f"  {name:<25} {m['test']['f1']:>6.3f}  {m['test']['auc']:>6.3f}")
    print()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", default="data/teams_historical.csv")
    args = parser.parse_args()
    main(args.data)
