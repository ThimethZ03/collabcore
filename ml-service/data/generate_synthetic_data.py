"""
generate_synthetic_data.py
──────────────────────────
Generates realistic synthetic training data that mirrors
the shape CollabCore will export from MongoDB.

Run:
    python generate_synthetic_data.py --n 1000 --out data/teams_historical.csv
"""

import argparse
import os
import numpy as np
import pandas as pd

# Make sure we can import from sibling package
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from utils.constants import SKILL_COLS, ROLE_COLS, ALL_FEATURES, TARGET_COL, SUCCESS_THRESHOLD


def generate(n: int = 1000, seed: int = 42) -> pd.DataFrame:
    """
    Build N synthetic team records with plausible correlations.

    Design decisions
    ─────────────────
    • Skills: each member is sampled from realistic level distributions
      (not purely uniform) so we get more 2-3 level entries than 0 or 5.
    • success_score is a weighted sum of meaningful features + Gaussian noise,
      so the ML model has something real to learn.
    """
    rng = np.random.default_rng(seed)

    N = n
    rows = []

    for _ in range(N):
        team_size = int(rng.integers(3, 7))          # 3 to 6 members

        # ── Per-member skill matrix ─────────────────────────────────────────
        # Each member gets a "primary domain" → high skills in 2-3 areas
        member_skills = []
        for _ in range(team_size):
            domain = rng.choice(["backend", "frontend", "qa", "design", "devops"])
            s = {sk: int(rng.integers(0, 3)) for sk in SKILL_COLS}   # base: 0-2

            if domain == "backend":
                s["skill_python"]     = int(rng.integers(3, 6))
                s["skill_nodejs"]     = int(rng.integers(3, 6))
                s["skill_mongodb"]    = int(rng.integers(2, 5))
            elif domain == "frontend":
                s["skill_javascript"] = int(rng.integers(3, 6))
                s["skill_react"]      = int(rng.integers(3, 6))
            elif domain == "qa":
                s["skill_testing"]    = int(rng.integers(3, 6))
            elif domain == "design":
                s["skill_design"]     = int(rng.integers(3, 6))
            elif domain == "devops":
                s["skill_devops"]     = int(rng.integers(3, 6))

            member_skills.append(s)

        # ── Team-level skill aggregation ────────────────────────────────────
        skill_values = {}
        for sk in SKILL_COLS:
            levels = [m[sk] for m in member_skills]
            skill_values[sk] = max(levels)   # team's best level per skill

        # ── Role coverage ───────────────────────────────────────────────────
        # Randomly assign roles; more members → higher chance of coverage
        roles_pool = ["PM", "Developer", "Designer", "QA", "BusinessAnalyst"]
        assigned   = rng.choice(roles_pool, size=team_size, replace=False if team_size <= 5 else True)
        role_values = {f"role_{r}": (1 if r in assigned else 0) for r in roles_pool}

        # ── Aggregate features ───────────────────────────────────────────────
        availability_overlap   = float(rng.uniform(0.3, 1.0))
        avg_skill_level        = float(np.mean([v for v in skill_values.values()]))
        skill_diversity        = int(sum(1 for v in skill_values.values() if v >= 2))
        roles_covered          = int(sum(role_values.values()))
        max_skill_gap          = float(rng.uniform(0, 3))  # synthetic gap score
        workload_balance_score = float(rng.uniform(0, 2))  # lower = more balanced

        # ── Ground-truth success_score ───────────────────────────────────────
        # This heuristic drives supervised learning.
        # Weights reflect domain knowledge from the proposal.
        score = (
            skill_values["skill_python"]     * 3.5 +
            skill_values["skill_javascript"] * 3.0 +
            skill_values["skill_react"]      * 2.5 +
            skill_values["skill_testing"]    * 3.0 +
            skill_values["skill_design"]     * 2.5 +
            roles_covered                    * 4.0 +
            role_values["role_PM"]           * 3.0 +
            availability_overlap             * 15.0 +
            avg_skill_level                  * 4.0 +
            skill_diversity                  * 1.5 +
            float(rng.normal(0, 5))          # noise
        )

        # Penalise bad teams
        score -= max_skill_gap * 4.0
        score -= workload_balance_score * 3.0

        success_score = float(np.clip(score, 0, 100))

        row = {**skill_values, **role_values,
               "availability_overlap":    availability_overlap,
               "team_size":               team_size,
               "avg_skill_level":         round(avg_skill_level, 3),
               "skill_diversity":         skill_diversity,
               "roles_covered":           roles_covered,
               "max_skill_gap":           round(max_skill_gap, 3),
               "workload_balance_score":  round(workload_balance_score, 3),
               TARGET_COL:               round(success_score, 2)}
        rows.append(row)

    df = pd.DataFrame(rows, columns=ALL_FEATURES + [TARGET_COL])
    return df


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--n",   type=int, default=1000, help="Number of synthetic rows")
    parser.add_argument("--out", type=str, default="data/teams_historical.csv")
    parser.add_argument("--seed",type=int, default=42)
    args = parser.parse_args()

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    df = generate(n=args.n, seed=args.seed)
    df.to_csv(args.out, index=False)
    print(f"✅  Generated {len(df)} rows → {args.out}")
    print(f"    Success rate (>={SUCCESS_THRESHOLD}): "
          f"{(df[TARGET_COL] >= SUCCESS_THRESHOLD).mean():.1%}")
    print(df.describe().to_string())
