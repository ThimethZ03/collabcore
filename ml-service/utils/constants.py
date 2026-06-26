"""
constants.py
────────────
Single source of truth for every feature name used across
data generation, preprocessing, training, and inference.
"""

# ── Technical Skills ────────────────────────────────────────────────────────
SKILL_COLS = [
    "skill_python",
    "skill_javascript",
    "skill_react",
    "skill_nodejs",
    "skill_mongodb",
    "skill_design",
    "skill_testing",
    "skill_devops",
    "skill_ml",
    "skill_java",
]

# ── Role Coverage (binary: 1 = role is filled in team) ──────────────────────
ROLE_COLS = [
    "role_PM",
    "role_Developer",
    "role_Designer",
    "role_QA",
    "role_BusinessAnalyst",
]

# ── Aggregate / Computed Features ───────────────────────────────────────────
AGGREGATE_COLS = [
    "availability_overlap",   # 0-1 float
    "team_size",              # int  3-6
    "avg_skill_level",        # mean across all member skill levels
    "skill_diversity",        # number of unique skill domains covered
    "roles_covered",          # count of distinct roles filled
    "max_skill_gap",          # max(required_level - team_max_level) per domain
    "workload_balance_score", # std-dev of task counts (lower = better balance)
]

# Full ordered feature list — used for DataFrame column order everywhere
ALL_FEATURES = SKILL_COLS + ROLE_COLS + AGGREGATE_COLS

# ── Target ──────────────────────────────────────────────────────────────────
TARGET_COL = "success_score"   # 0-100 float, binarised at threshold in training
SUCCESS_THRESHOLD = 70         # teams scoring >= 70 are labelled "Good"

# ── Roles & Skills mappings ─────────────────────────────────────────────────
ROLE_MAPPING = {
    "PM":               ["communication", "leadership"],
    "Developer":        ["python", "javascript", "nodejs", "java"],
    "Designer":         ["design", "react"],
    "QA":               ["testing"],
    "BusinessAnalyst":  ["communication", "analysis"],
}

SKILL_NAMES = [c.replace("skill_", "") for c in SKILL_COLS]
ROLE_NAMES  = [c.replace("role_",  "") for c in ROLE_COLS]
