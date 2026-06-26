"""
preprocessor.py
───────────────
Complete data cleaning and preprocessing pipeline for CollabCore ML.

Steps:
  1. Schema validation  — drop rows missing critical columns
  2. Type coercion      — enforce numeric types
  3. Range clamping     — clip skills to [0,5], overlap to [0,1], etc.
  4. Outlier detection  — IQR-based flagging and capping
  5. Missing value imputation — median for numerics, 0 for binary roles
  6. Class imbalance    — check ratio, apply SMOTE if needed
  7. Feature engineering — add derived features
  8. Scaling            — StandardScaler fitted ONLY on train split
  9. Train/val/test split — stratified

Usage (standalone):
    python model/preprocessor.py --input data/teams_historical.csv
"""

import os
import sys
import argparse
import warnings

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
import joblib

warnings.filterwarnings("ignore")
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from utils.constants import (
    SKILL_COLS, ROLE_COLS, AGGREGATE_COLS, ALL_FEATURES,
    TARGET_COL, SUCCESS_THRESHOLD
)


# ─── 1. Schema Validation ──────────────────────────────────────────────────────

def validate_schema(df: pd.DataFrame) -> pd.DataFrame:
    """
    Drop rows that are missing the target column or ALL skill columns.
    Print a report of what was dropped and why.
    """
    original_len = len(df)
    report = {}

    # Must have target
    missing_target = df[TARGET_COL].isna()
    report["missing_target"] = missing_target.sum()
    df = df[~missing_target].copy()

    # Must have at least half the skill columns present
    skill_present = df[SKILL_COLS].notna().sum(axis=1)
    too_sparse    = skill_present < (len(SKILL_COLS) // 2)
    report["too_sparse_skills"] = too_sparse.sum()
    df = df[~too_sparse].copy()

    # Duplicate rows
    dups = df.duplicated()
    report["duplicates"] = dups.sum()
    df = df[~dups].copy()

    print(f"\n[Validate] {original_len} → {len(df)} rows")
    for reason, count in report.items():
        if count:
            print(f"  ⚠  Dropped {count} rows: {reason}")

    return df.reset_index(drop=True)


# ─── 2. Type Coercion ──────────────────────────────────────────────────────────

def coerce_types(df: pd.DataFrame) -> pd.DataFrame:
    """Force every feature column to the correct dtype."""
    for col in SKILL_COLS:
        df[col] = pd.to_numeric(df[col], errors="coerce").astype("float32")

    for col in ROLE_COLS:
        df[col] = pd.to_numeric(df[col], errors="coerce").astype("float32")

    df["availability_overlap"]   = pd.to_numeric(df["availability_overlap"],   errors="coerce").astype("float32")
    df["team_size"]              = pd.to_numeric(df["team_size"],              errors="coerce").astype("float32")
    df["avg_skill_level"]        = pd.to_numeric(df["avg_skill_level"],        errors="coerce").astype("float32")
    df["skill_diversity"]        = pd.to_numeric(df["skill_diversity"],        errors="coerce").astype("float32")
    df["roles_covered"]          = pd.to_numeric(df["roles_covered"],          errors="coerce").astype("float32")
    df["max_skill_gap"]          = pd.to_numeric(df["max_skill_gap"],          errors="coerce").astype("float32")
    df["workload_balance_score"] = pd.to_numeric(df["workload_balance_score"], errors="coerce").astype("float32")
    df[TARGET_COL]              = pd.to_numeric(df[TARGET_COL],              errors="coerce").astype("float32")

    print(f"[Coerce]  All columns cast to correct dtypes.")
    return df


# ─── 3. Range Clamping ─────────────────────────────────────────────────────────

VALID_RANGES = {
    **{sk: (0, 5)     for sk in SKILL_COLS},
    **{rk: (0, 1)     for rk in ROLE_COLS},
    "availability_overlap":   (0.0, 1.0),
    "team_size":              (1,   10),
    "avg_skill_level":        (0.0, 5.0),
    "skill_diversity":        (0,   10),
    "roles_covered":          (0,   5),
    "max_skill_gap":          (0.0, 5.0),
    "workload_balance_score": (0.0, 10.0),
    TARGET_COL:              (0.0, 100.0),
}

def clamp_ranges(df: pd.DataFrame) -> pd.DataFrame:
    """Clip values to their valid domain."""
    for col, (lo, hi) in VALID_RANGES.items():
        if col in df.columns:
            before = df[col].isna().sum()
            df[col] = df[col].clip(lower=lo, upper=hi)
            after  = df[col].isna().sum()
            if after > before:
                print(f"  ⚠  {col}: clipping introduced {after-before} NaNs")
    print(f"[Clamp]   Ranges enforced for {len(VALID_RANGES)} columns.")
    return df


# ─── 4. Outlier Detection & Capping ───────────────────────────────────────────

def cap_outliers(df: pd.DataFrame, factor: float = 1.5) -> pd.DataFrame:
    """
    IQR-based outlier capping for continuous columns only.
    Binary role columns are excluded (they only have values 0 and 1).
    """
    continuous = SKILL_COLS + [
        "availability_overlap", "avg_skill_level",
        "max_skill_gap", "workload_balance_score", TARGET_COL
    ]
    capped_total = 0
    for col in continuous:
        if col not in df.columns:
            continue
        Q1  = df[col].quantile(0.25)
        Q3  = df[col].quantile(0.75)
        IQR = Q3 - Q1
        lo  = Q1 - factor * IQR
        hi  = Q3 + factor * IQR

        # Also respect domain ranges
        domain_lo, domain_hi = VALID_RANGES.get(col, (-np.inf, np.inf))
        lo = max(lo, domain_lo)
        hi = min(hi, domain_hi)

        n_capped = ((df[col] < lo) | (df[col] > hi)).sum()
        df[col]  = df[col].clip(lower=lo, upper=hi)
        if n_capped:
            capped_total += n_capped
            print(f"  ✂  {col}: capped {n_capped} outliers to [{lo:.2f}, {hi:.2f}]")

    print(f"[Outlier] Capped {capped_total} outlier values total.")
    return df


# ─── 5. Missing Value Imputation ──────────────────────────────────────────────

def impute_missing(df: pd.DataFrame, strategy: str = "median") -> pd.DataFrame:
    """
    Fill remaining NaNs:
    - Skill & aggregate columns → median imputation
    - Role binary columns → fill with 0 (role not assigned)
    """
    # Role columns → 0
    for col in ROLE_COLS:
        if col in df.columns:
            df[col] = df[col].fillna(0)

    # Everything else → median
    numeric_cols = [c for c in df.columns if c in ALL_FEATURES and c not in ROLE_COLS]
    before = df[numeric_cols].isna().sum().sum()
    if before:
        imputer = SimpleImputer(strategy=strategy)
        df[numeric_cols] = imputer.fit_transform(df[numeric_cols])
        print(f"[Impute]  Filled {before} missing values with {strategy}.")
    else:
        print(f"[Impute]  No missing values found.")
    return df


# ─── 6. Feature Engineering ───────────────────────────────────────────────────

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add derived features that help the model:
    - full_role_coverage:     1 if ALL 5 roles are filled
    - core_skills_present:    1 if dev + test + design skills >= 3 each
    - high_availability:      1 if availability_overlap >= 0.7
    - skill_role_alignment:   dot-product-like score of skill-role fit
    """
    df["full_role_coverage"] = (df["roles_covered"] == 5).astype("float32")

    df["core_skills_present"] = (
        (df["skill_python"]     >= 3) |
        (df["skill_javascript"] >= 3) |
        (df["skill_nodejs"]     >= 3)
    ).astype("float32") * (
        (df["skill_testing"]    >= 3)
    ).astype("float32") * (
        (df["skill_design"]     >= 3)
    ).astype("float32")

    df["high_availability"] = (df["availability_overlap"] >= 0.7).astype("float32")

    # Skill-role alignment: if PM role filled AND communication-like skills present
    df["skill_role_alignment"] = (
        df["role_PM"]              * df["avg_skill_level"] +
        df["role_Developer"]       * df[["skill_python","skill_javascript","skill_nodejs"]].max(axis=1) +
        df["role_Designer"]        * df["skill_design"] +
        df["role_QA"]              * df["skill_testing"]
    ) / 5.0

    print(f"[Engineer] Added 4 derived features. Total columns: {len(df.columns)}")
    return df


# ─── 7. Binarise Target ───────────────────────────────────────────────────────

def binarise_target(df: pd.DataFrame, threshold: float = SUCCESS_THRESHOLD) -> pd.DataFrame:
    """
    Convert continuous success_score (0-100) into binary label.
    Also keep the original score column for regression tasks.
    """
    df["success_label"] = (df[TARGET_COL] >= threshold).astype(int)
    pos = df["success_label"].sum()
    neg = len(df) - pos
    ratio = pos / max(neg, 1)
    print(f"[Target]  Threshold={threshold}: {pos} Good ({pos/len(df):.1%}), "
          f"{neg} At-Risk ({neg/len(df):.1%}), ratio={ratio:.2f}")
    if ratio < 0.3 or ratio > 3.0:
        print("  ⚠  Class imbalance detected — SMOTE will be applied during training.")
    return df


# ─── 8. Train / Val / Test Split ──────────────────────────────────────────────

def split_data(df: pd.DataFrame,
               test_size: float  = 0.15,
               val_size:  float  = 0.15,
               random_state: int = 42
               ) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Stratified 70/15/15 split preserving class balance.
    """
    feature_cols = [c for c in df.columns
                    if c not in (TARGET_COL, "success_label")]

    train_val, test = train_test_split(
        df, test_size=test_size,
        stratify=df["success_label"],
        random_state=random_state
    )
    val_frac = val_size / (1 - test_size)
    train, val = train_test_split(
        train_val, test_size=val_frac,
        stratify=train_val["success_label"],
        random_state=random_state
    )
    print(f"[Split]   Train={len(train)}, Val={len(val)}, Test={len(test)}")
    return train, val, test


# ─── 9. Scaling ───────────────────────────────────────────────────────────────

def fit_scaler(train_df: pd.DataFrame, feature_cols: list[str], save_path: str | None = None) -> StandardScaler:
    """
    Fit a StandardScaler on TRAIN only. Optionally save to disk.
    """
    scaler = StandardScaler()
    scaler.fit(train_df[feature_cols])
    if save_path:
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        joblib.dump(scaler, save_path)
        print(f"[Scaler]  Saved → {save_path}")
    return scaler


def apply_scaler(df: pd.DataFrame, feature_cols: list[str], scaler: StandardScaler) -> pd.DataFrame:
    """Apply a pre-fitted scaler to any split."""
    df = df.copy()
    df[feature_cols] = scaler.transform(df[feature_cols])
    return df


# ─── Master Pipeline ───────────────────────────────────────────────────────────

def run_pipeline(input_path: str,
                 scaler_save_path: str = "model/saved/scaler.pkl",
                 splits_save_dir:  str = "data/processed/"
                 ) -> dict:
    """
    Full preprocessing pipeline. Returns a dict with train/val/test DataFrames
    and the fitted scaler.
    """
    print(f"\n{'='*55}")
    print(f"  CollabCore ML — Data Preprocessing Pipeline")
    print(f"{'='*55}")

    df = pd.read_csv(input_path)
    print(f"\n📂  Loaded {len(df)} rows from {input_path}")

    df = validate_schema(df)
    df = coerce_types(df)
    df = clamp_ranges(df)
    df = cap_outliers(df)
    df = impute_missing(df)
    df = engineer_features(df)
    df = binarise_target(df)

    train, val, test = split_data(df)

    # Columns to scale (all feature + derived, not target, label, or metadata)
    feature_cols = [c for c in df.columns
                    if c not in (TARGET_COL, "success_label", "source")]

    scaler = fit_scaler(train, feature_cols, save_path=scaler_save_path)
    train  = apply_scaler(train, feature_cols, scaler)
    val    = apply_scaler(val,   feature_cols, scaler)
    test   = apply_scaler(test,  feature_cols, scaler)

    # Save processed splits
    os.makedirs(splits_save_dir, exist_ok=True)
    train.to_csv(f"{splits_save_dir}/train.csv", index=False)
    val.to_csv(  f"{splits_save_dir}/val.csv",   index=False)
    test.to_csv( f"{splits_save_dir}/test.csv",  index=False)
    print(f"\n✅  Processed splits saved to {splits_save_dir}")

    return {"train": train, "val": val, "test": test,
            "scaler": scaler, "feature_cols": feature_cols}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input",  default="data/teams_historical.csv")
    parser.add_argument("--scaler", default="model/saved/scaler.pkl")
    parser.add_argument("--outdir", default="data/processed/")
    args = parser.parse_args()
    run_pipeline(args.input, args.scaler, args.outdir)
