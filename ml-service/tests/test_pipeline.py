"""
tests/test_pipeline.py
───────────────────────
End-to-end tests for the CollabCore ML pipeline.
Run: pytest tests/ -v
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
import numpy as np
import pandas as pd

from utils.constants import SKILL_COLS, ROLE_COLS, ALL_FEATURES, TARGET_COL


# ─── Data Generation Tests ─────────────────────────────────────────────────────

class TestDataGeneration:
    def test_generates_correct_columns(self):
        from data.generate_synthetic_data import generate
        df = generate(n=50)
        for col in ALL_FEATURES + [TARGET_COL]:
            assert col in df.columns, f"Missing column: {col}"

    def test_skill_levels_in_range(self):
        from data.generate_synthetic_data import generate
        df = generate(n=100)
        for sk in SKILL_COLS:
            assert df[sk].min() >= 0,  f"{sk} below 0"
            assert df[sk].max() <= 5,  f"{sk} above 5"

    def test_success_score_in_range(self):
        from data.generate_synthetic_data import generate
        df = generate(n=100)
        assert df[TARGET_COL].min() >= 0
        assert df[TARGET_COL].max() <= 100

    def test_role_cols_binary(self):
        from data.generate_synthetic_data import generate
        df = generate(n=100)
        for rc in ROLE_COLS:
            assert set(df[rc].unique()).issubset({0, 1}), f"{rc} has non-binary values"

    def test_no_null_in_generated_data(self):
        from data.generate_synthetic_data import generate
        df = generate(n=200)
        assert df.isnull().sum().sum() == 0, "Generated data contains nulls"


# ─── Preprocessing Tests ────────────────────────────────────────────────────────

class TestPreprocessor:
    @pytest.fixture(scope="class")
    def sample_df(self):
        from data.generate_synthetic_data import generate
        return generate(n=300)

    def test_validate_schema_drops_missing_target(self, sample_df):
        from model.preprocessor import validate_schema
        df = sample_df.copy()
        df.loc[0, TARGET_COL] = None
        result = validate_schema(df)
        assert len(result) == len(sample_df) - 1

    def test_validate_schema_drops_duplicates(self, sample_df):
        from model.preprocessor import validate_schema
        df = pd.concat([sample_df, sample_df.iloc[:5]], ignore_index=True)
        result = validate_schema(df)
        assert len(result) == len(sample_df)

    def test_coerce_types(self, sample_df):
        from model.preprocessor import coerce_types
        df = sample_df.copy()
        df["skill_python"] = df["skill_python"].astype(str)  # corrupt dtype
        result = coerce_types(df)
        assert result["skill_python"].dtype == "float32"

    def test_clamp_ranges(self, sample_df):
        from model.preprocessor import clamp_ranges
        df = sample_df.copy()
        df.loc[0, "skill_python"] = 999   # out-of-range
        result = clamp_ranges(df)
        assert result["skill_python"].max() <= 5

    def test_impute_missing(self, sample_df):
        from model.preprocessor import impute_missing
        df = sample_df.copy()
        df.loc[:5, "avg_skill_level"] = None
        result = impute_missing(df)
        assert result["avg_skill_level"].isnull().sum() == 0

    def test_engineer_features_adds_columns(self, sample_df):
        from model.preprocessor import engineer_features, coerce_types, clamp_ranges, impute_missing
        from data.generate_synthetic_data import generate
        df = generate(n=100)
        df = coerce_types(df)
        df = clamp_ranges(df)
        df = impute_missing(df)
        df = engineer_features(df)
        for col in ["full_role_coverage", "core_skills_present",
                    "high_availability", "skill_role_alignment"]:
            assert col in df.columns, f"Missing derived feature: {col}"

    def test_binarise_target(self, sample_df):
        from model.preprocessor import binarise_target
        df = sample_df.copy()
        result = binarise_target(df, threshold=70)
        assert "success_label" in result.columns
        assert set(result["success_label"].unique()).issubset({0, 1})

    def test_split_sizes(self, sample_df):
        from model.preprocessor import (coerce_types, clamp_ranges, impute_missing,
                                         engineer_features, binarise_target, split_data)
        df = sample_df.copy()
        df = coerce_types(df)
        df = clamp_ranges(df)
        df = impute_missing(df)
        df = engineer_features(df)
        df = binarise_target(df)
        train, val, test = split_data(df)
        total = len(train) + len(val) + len(test)
        assert total == len(df)
        assert len(test)  / total == pytest.approx(0.15, abs=0.02)


# ─── Prediction Tests (require trained models) ─────────────────────────────────

SAMPLE_MEMBERS = [
    {"_id": "u1", "name": "Alice",   "role": "Developer", "taskCount": 2, "availability": 0.9,
     "skills": [{"name": "python", "level": 4}, {"name": "react", "level": 3}]},
    {"_id": "u2", "name": "Bob",     "role": "Designer",  "taskCount": 1, "availability": 0.8,
     "skills": [{"name": "design", "level": 4}, {"name": "javascript", "level": 2}]},
    {"_id": "u3", "name": "Carol",   "role": "QA",        "taskCount": 3, "availability": 0.7,
     "skills": [{"name": "testing", "level": 5}]},
    {"_id": "u4", "name": "David",   "role": "PM",        "taskCount": 1, "availability": 0.85,
     "skills": [{"name": "nodejs", "level": 3}, {"name": "mongodb", "level": 2}]},
]

SAMPLE_TASK = {
    "requiredSkills": [{"name": "python", "minLevel": 3}, {"name": "testing", "minLevel": 3}],
    "urgency": 4,
}


class TestPrediction:
    @pytest.fixture(scope="class", autouse=True)
    def train_models_if_needed(self, tmp_path_factory):
        """Train models on synthetic data before running prediction tests."""
        import json
        if not os.path.exists("model/saved/team_quality_classifier.pkl"):
            from data.generate_synthetic_data import generate
            df = generate(n=400)
            tmp_dir = tmp_path_factory.mktemp("data")
            data_path = str(tmp_dir / "test_teams.csv")
            df.to_csv(data_path, index=False)
            from model.train import main
            main(data_path)

    def test_team_quality_returns_score(self):
        from model.predict import predict_team_quality, registry
        registry.load()
        result = predict_team_quality(SAMPLE_MEMBERS, 0.8)
        assert "score"      in result
        assert "label"      in result
        assert "confidence" in result
        assert 0 <= result["score"] <= 100
        assert result["label"] in ("Good", "At Risk")

    def test_task_assignment_returns_rankings(self):
        from model.predict import predict_task_assignment, registry
        registry.load()
        result = predict_task_assignment(SAMPLE_MEMBERS, SAMPLE_TASK)
        assert "rankings" in result
        assert len(result["rankings"]) == len(SAMPLE_MEMBERS)
        # Should be sorted descending by score
        scores = [r["score"] for r in result["rankings"]]
        assert scores == sorted(scores, reverse=True)

    def test_risk_detection_returns_level(self):
        from model.predict import predict_risk, registry
        registry.load()
        result = predict_risk(SAMPLE_MEMBERS, 0.8)
        assert "risk_level" in result
        assert "risk_score" in result
        assert "flags"      in result
        assert result["risk_level"] in ("Low", "Medium", "High")
        assert 0 <= result["risk_score"] <= 100
        assert isinstance(result["flags"], list)

    def test_risk_flags_on_bad_team(self):
        from model.predict import predict_risk, registry
        registry.load()
        bad_team = [
            {"_id": "x1", "name": "Solo", "role": "", "taskCount": 10, "availability": 0.2,
             "skills": [{"name": "python", "level": 0}]},
        ]
        result = predict_risk(bad_team, 0.1, {
            "days_since_last_commit": 14,
            "missed_milestones": 2,
        })
        assert result["risk_level"] in ("Medium", "High")
        assert len(result["flags"]) >= 1

    def test_graceful_empty_skills(self):
        from model.predict import predict_team_quality, registry
        registry.load()
        members = [
            {"_id": "e1", "name": "Empty1", "role": "Developer", "taskCount": 0,
             "availability": 0.5, "skills": []},
            {"_id": "e2", "name": "Empty2", "role": "QA", "taskCount": 0,
             "availability": 0.5, "skills": []},
        ]
        result = predict_team_quality(members, 0.5)
        assert result["label"] in ("Good", "At Risk", "Unknown")


# ─── Constants Tests ──────────────────────────────────────────────────────────

class TestConstants:
    def test_all_features_complete(self):
        from utils.constants import ALL_FEATURES, SKILL_COLS, ROLE_COLS, AGGREGATE_COLS
        assert set(ALL_FEATURES) == set(SKILL_COLS + ROLE_COLS + AGGREGATE_COLS)

    def test_skill_col_names_consistent(self):
        from utils.constants import SKILL_COLS, SKILL_NAMES
        assert SKILL_NAMES == [c.replace("skill_", "") for c in SKILL_COLS]
