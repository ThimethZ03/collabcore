"""
export_mongo_data.py
─────────────────────
Connects to your CollabCore MongoDB instance and exports
real training data once you have a semester of completed projects.

Usage:
    python data/export_mongo_data.py --uri mongodb://localhost:27017 --db collabcore --out data/teams_historical.csv

Requirements:
    pip install pymongo pandas python-dotenv
"""

import argparse
import os
import sys
import json

import numpy as np
import pandas as pd
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"))

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from utils.constants import SKILL_COLS, ROLE_COLS, SKILL_NAMES, ROLE_NAMES, TARGET_COL


def connect(uri: str, db_name: str):
    """Return a pymongo database handle."""
    try:
        from pymongo import MongoClient
        client = MongoClient(uri, serverSelectionTimeoutMS=5000)
        client.server_info()   # trigger connection
        return client[db_name]
    except Exception as e:
        print(f"❌  MongoDB connection failed: {e}")
        sys.exit(1)


def fetch_teams(db) -> list[dict]:
    """Fetch all teams that have a completed evaluation."""
    pipeline = [
        # Join teams → evaluations
        {"$lookup": {
            "from": "evaluations",
            "localField": "_id",
            "foreignField": "teamId",
            "as": "evaluations"
        }},
        # Only keep teams with at least one completed evaluation
        {"$match": {"evaluations.0": {"$exists": True}}},
        # Join teams → projects
        {"$lookup": {
            "from": "projects",
            "localField": "projectId",
            "foreignField": "_id",
            "as": "project"
        }},
        # Unwind members array (each member is a userId)
        {"$lookup": {
            "from": "users",
            "localField": "members",
            "foreignField": "_id",
            "as": "memberProfiles"
        }},
    ]
    return list(db.teams.aggregate(pipeline, allowDiskUse=True))


def compute_availability_overlap(member_profiles: list[dict]) -> float:
    """
    Compute fraction of common available hours across team members.
    Each user doc has: availability: { monday: [9,10,11,...], tuesday: [...], ... }
    """
    if not member_profiles:
        return 0.5

    days = ["monday", "tuesday", "wednesday", "thursday", "friday"]
    sets = []
    for m in member_profiles:
        avail = m.get("availability", {})
        slots = set()
        for d in days:
            for h in avail.get(d, []):
                slots.add(f"{d}-{h}")
        sets.append(slots)

    if not sets:
        return 0.5

    common = sets[0]
    for s in sets[1:]:
        common = common & s

    total = max(len(s) for s in sets) if sets else 1
    return round(len(common) / max(total, 1), 4)


def vectorise_team(team_doc: dict) -> dict | None:
    """
    Convert a raw MongoDB team document (with lookups) into
    a flat feature vector row.  Returns None if data is unusable.
    """
    profiles = team_doc.get("memberProfiles", [])
    if len(profiles) < 2:
        return None   # skip malformed teams

    # ── Skill aggregation ──────────────────────────────────────────────────
    skill_values = {sk: 0 for sk in SKILL_COLS}
    for member in profiles:
        for skill_entry in member.get("skills", []):
            skill_name  = skill_entry.get("name", "").lower().replace(" ", "")
            skill_level = int(skill_entry.get("level", 0))
            col = f"skill_{skill_name}"
            if col in skill_values:
                skill_values[col] = max(skill_values[col], skill_level)

    # ── Role coverage ──────────────────────────────────────────────────────
    role_values = {rc: 0 for rc in ROLE_COLS}
    for member in profiles:
        role = member.get("role", "")
        col  = f"role_{role}"
        if col in role_values:
            role_values[col] = 1

    # ── Aggregate features ─────────────────────────────────────────────────
    availability_overlap   = compute_availability_overlap(profiles)
    team_size              = len(profiles)
    all_levels             = [v for v in skill_values.values()]
    avg_skill_level        = round(float(np.mean(all_levels)), 3) if all_levels else 0
    skill_diversity        = int(sum(1 for v in all_levels if v >= 2))
    roles_covered          = int(sum(role_values.values()))

    # Workload balance: std-dev of task counts per member (0 = perfect balance)
    task_counts = [int(m.get("taskCount", 0)) for m in profiles]
    workload_balance_score = round(float(np.std(task_counts)), 3) if task_counts else 0

    # Max skill gap: difference between required level (from project) and team max
    required_skills = team_doc.get("project", [{}])[0].get("requiredSkills", [])
    gaps = []
    for rs in required_skills:
        rname = rs.get("name", "").lower().replace(" ", "")
        req   = int(rs.get("minLevel", 3))
        col   = f"skill_{rname}"
        team_max = skill_values.get(col, 0)
        gaps.append(max(0, req - team_max))
    max_skill_gap = round(float(max(gaps)) if gaps else 0, 3)

    # ── Target: mean overall score from evaluations ────────────────────────
    evals = team_doc.get("evaluations", [])
    if not evals:
        return None
    scores = [float(e.get("overallScore", 0)) for e in evals if "overallScore" in e]
    if not scores:
        return None
    success_score = round(float(np.mean(scores)), 2)

    row = {
        **skill_values,
        **role_values,
        "availability_overlap":   availability_overlap,
        "team_size":              team_size,
        "avg_skill_level":        avg_skill_level,
        "skill_diversity":        skill_diversity,
        "roles_covered":          roles_covered,
        "max_skill_gap":          max_skill_gap,
        "workload_balance_score": workload_balance_score,
        TARGET_COL:              success_score,
    }
    return row


def export(uri: str, db_name: str, out_path: str):
    print(f"📡  Connecting to {uri} / {db_name} …")
    db     = connect(uri, db_name)
    teams  = fetch_teams(db)
    print(f"📦  Fetched {len(teams)} teams with evaluations")

    rows = []
    skipped = 0
    for t in teams:
        row = vectorise_team(t)
        if row:
            rows.append(row)
        else:
            skipped += 1

    print(f"⚠️   Skipped {skipped} malformed / incomplete team docs")

    if not rows:
        print("❌  No usable rows produced. Check your MongoDB data.")
        sys.exit(1)

    df = pd.DataFrame(rows)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    df.to_csv(out_path, index=False)
    print(f"✅  Exported {len(df)} rows → {out_path}")
    return df


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--uri", default=os.getenv("MONGO_URI", "mongodb://localhost:27017"))
    parser.add_argument("--db",  default=os.getenv("DB_NAME",   "collabcore"))
    parser.add_argument("--out", default="data/teams_historical.csv")
    args = parser.parse_args()
    export(args.uri, args.db, args.out)
