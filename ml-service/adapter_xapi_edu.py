"""
adapter_xapi_edu.py
────────────────────
DATASET : Students' Academic Performance (xAPI-Edu-Data)
KAGGLE  : https://www.kaggle.com/datasets/aljarah/xAPI-Edu-Data
LICENSE : CC BY 4.0
ROWS    : 480 real student records from Kalboard 360 LMS
FORMAT  : CSV  →  xAPI-Edu-Data.csv

HOW TO DOWNLOAD:
  1. Go to https://www.kaggle.com/datasets/aljarah/xAPI-Edu-Data
  2. Click Download → xAPI-Edu-Data.csv
  3. Place it in collabcore-real-data/raw/xAPI-Edu-Data.csv

WHAT IT CONTAINS (16 features):
  - raisedhands        : how often student raises hand in class (0-100)
  - VisITedResources   : how often student visits course content (0-100)
  - AnnouncementsView  : how often student checks announcements (0-100)
  - Discussion         : how often student joins discussion groups (0-100)
  - StudentAbsenceDays : 'Under-7' or 'Above-7'
  - Class              : 'L' (low 0-69), 'M' (mid 70-89), 'H' (high 90-100) ← our label

MAPPING TO COLLABCORE FEATURES:
  raisedhands + Discussion      → communication skill proxy → role_PM, avg_skill_level
  VisITedResources              → learning drive → skill_diversity
  AnnouncementsView             → team awareness/availability → availability_overlap proxy
  StudentAbsenceDays            → availability_overlap (inverse)
  Class H/M/L                   → success_label (H=1, M/L=0)

This represents INDIVIDUAL student quality, which we use to infer
team-level quality by aggregating multiple student rows into a pseudo-team.
"""

import os
import numpy as np
import pandas as pd


RAW_PATH = "raw/xAPI-Edu-Data.csv"


def load_raw(path: str = RAW_PATH) -> pd.DataFrame:
    if not os.path.exists(path):
        raise FileNotFoundError(
            f"\n❌  File not found: {path}\n"
            "    Download from: https://www.kaggle.com/datasets/aljarah/xAPI-Edu-Data\n"
            "    Place at: collabcore-real-data/raw/xAPI-Edu-Data.csv"
        )
    df = pd.read_csv(path)
    print(f"[xAPI] Loaded {len(df)} rows, columns: {list(df.columns)}")
    return df


def clean(df: pd.DataFrame) -> pd.DataFrame:
    """Rename & normalise columns."""
    df = df.copy()

    # Normalize engagement scores to 0-5 scale (originally 0-100)
    for col in ["raisedhands", "VisITedResources", "AnnouncementsView", "Discussion"]:
        df[col] = (df[col] / 20).clip(0, 5).round(1)

    # Encode absence
    df["absence_flag"] = (df["StudentAbsenceDays"] == "Above-7").astype(int)

    # Encode class label: H=1 (Good), M/L=0 (At Risk)
    df["success_label"] = (df["Class"] == "H").astype(int)
    df["success_score"] = df["Class"].map({"H": 90, "M": 75, "L": 50}).astype(float)

    return df


def build_pseudo_teams(df: pd.DataFrame,
                        team_size: int = 4,
                        n_teams: int = 300,
                        seed: int = 42) -> pd.DataFrame:
    """
    Since xAPI has individual student records, we group students
    randomly into pseudo-teams of `team_size` to create team-level
    feature vectors that match CollabCore's schema.

    Team success = majority label (>= half the members are High performers).
    """
    rng = np.random.default_rng(seed)
    df_clean = clean(df).reset_index(drop=True)

    rows = []
    for _ in range(n_teams):
        members = df_clean.sample(n=team_size, random_state=int(rng.integers(0, 9999)))

        # ── Skill proxies from behavioral features ─────────────────────────
        # raisedhands / Discussion → communication / leadership → PM + BA
        comm_level     = members["raisedhands"].mean()
        discussion_lv  = members["Discussion"].mean()
        resource_level = members["VisITedResources"].mean()
        announce_level = members["AnnouncementsView"].mean()

        # Map to skill columns (these are plausible proxies, not direct measurements)
        skill_python     = round(resource_level * rng.uniform(0.7, 1.0), 1)
        skill_javascript = round(resource_level * rng.uniform(0.6, 1.0), 1)
        skill_react      = round(resource_level * rng.uniform(0.5, 0.9), 1)
        skill_nodejs     = round(resource_level * rng.uniform(0.5, 0.9), 1)
        skill_mongodb    = round(resource_level * rng.uniform(0.4, 0.8), 1)
        skill_design     = round(resource_level * rng.uniform(0.4, 0.9), 1)
        skill_testing    = round(resource_level * rng.uniform(0.5, 1.0), 1)
        skill_devops     = round(resource_level * rng.uniform(0.3, 0.8), 1)
        skill_ml         = min(round(resource_level * rng.uniform(0.2, 0.6), 1), 5)
        skill_java       = min(round(resource_level * rng.uniform(0.3, 0.7), 1), 5)

        # Role coverage: diverse teams tend to cover more roles
        unique_topics = members.get("Topic", pd.Series(["IT"] * team_size)).nunique()
        roles_covered  = min(int(rng.integers(2, 6)), 5)
        role_PM        = int(comm_level >= 3)
        role_Developer = int(resource_level >= 2.5)
        role_Designer  = int(resource_level >= 2.0)
        role_QA        = int(rng.random() > 0.4)
        role_BA        = int(comm_level >= 2.5)

        # Availability: students with more absences → lower overlap
        absent_count       = members["absence_flag"].sum()
        availability_overlap = round(float(1.0 - absent_count / (team_size * 2)), 2)
        availability_overlap = float(np.clip(availability_overlap, 0.2, 1.0))

        avg_skill_level        = round(float(np.mean([skill_python, skill_javascript,
                                                       skill_react, skill_testing, skill_design])), 2)
        skill_diversity        = int(sum([
            skill_python >= 2, skill_javascript >= 2, skill_design >= 2,
            skill_testing >= 2, skill_devops >= 2, skill_nodejs >= 2
        ]))
        max_skill_gap          = round(float(rng.uniform(0, 2)), 2)
        workload_balance_score = round(float(rng.uniform(0, 1.5)), 2)

        # ── Derived features ────────────────────────────────────────────────
        full_role_coverage    = float(roles_covered == 5)
        core_skills_present   = float(skill_python >= 3 and skill_testing >= 3 and skill_design >= 3)
        high_availability     = float(availability_overlap >= 0.7)
        skill_role_alignment  = round(
            (role_PM * comm_level + role_Developer * resource_level +
             role_Designer * skill_design + role_QA * skill_testing) / 5.0, 2
        )

        # ── Team success label ───────────────────────────────────────────────
        success_label = int(members["success_label"].mean() >= 0.5)
        success_score = float(members["success_score"].mean())

        rows.append({
            "skill_python": min(skill_python, 5),
            "skill_javascript": min(skill_javascript, 5),
            "skill_react": min(skill_react, 5),
            "skill_nodejs": min(skill_nodejs, 5),
            "skill_mongodb": min(skill_mongodb, 5),
            "skill_design": min(skill_design, 5),
            "skill_testing": min(skill_testing, 5),
            "skill_devops": min(skill_devops, 5),
            "skill_ml": skill_ml,
            "skill_java": skill_java,
            "role_PM": role_PM,
            "role_Developer": role_Developer,
            "role_Designer": role_Designer,
            "role_QA": role_QA,
            "role_BusinessAnalyst": role_BA,
            "availability_overlap": availability_overlap,
            "team_size": team_size,
            "avg_skill_level": avg_skill_level,
            "skill_diversity": skill_diversity,
            "roles_covered": roles_covered,
            "max_skill_gap": max_skill_gap,
            "workload_balance_score": workload_balance_score,
            "full_role_coverage": full_role_coverage,
            "core_skills_present": core_skills_present,
            "high_availability": high_availability,
            "skill_role_alignment": skill_role_alignment,
            "success_score": success_score,
            "success_label": success_label,
            "source": "xapi_edu",
        })

    df_teams = pd.DataFrame(rows)
    pos = df_teams["success_label"].sum()
    print(f"[xAPI] Built {len(df_teams)} pseudo-teams | "
          f"Good: {pos} ({pos/len(df_teams):.1%}), At-Risk: {len(df_teams)-pos}")
    return df_teams


if __name__ == "__main__":
    os.makedirs("raw", exist_ok=True)
    df_raw   = load_raw()
    df_teams = build_pseudo_teams(df_raw, team_size=4, n_teams=300)
    os.makedirs("data", exist_ok=True)
    df_teams.to_csv("data/xapi_teams.csv", index=False)
    print("Saved -> data/xapi_teams.csv")
