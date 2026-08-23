"""
Resume <-> Job matching.

Simple, explainable overlap-scoring: intersects the candidate's skill set
with each job's tag set, score = matched / total job skill tags. This is
less accurate than an embedding-based approach, but every line of it can
be explained in an interview -- an explicit requirement of the assignment
('explainable during the interview').

Two correctness fixes baked in here:
1. Normalization -- 'Node.js' (resume) and 'nodejs' / 'Node JS' (job tag)
   used to miss each other under plain exact-string matching. Both sides
   now go through normalize_skill() (imported from resume_parser.py) so
   extraction and scoring stay consistent.
2. Noise tags -- job.tags mixes in generic labels like role_category
   ("Data Science") and experience_level ("Fresher") alongside actual
   skills. These never match a candidate skill, so counting them just
   inflates the denominator and drags the score down artificially. They
   are filtered out before scoring.
"""
from typing import List
from models import Job
from services.resume_parser import normalize_skill

# Generic/non-skill labels that end up inside job.tags (see
# services/tagging.py and scripts/seed_data.py) -- not real skills, so
# they should not count toward the match score.
_NON_SKILL_LABELS = {
    "data science", "software engineering", "other",
    "fresher", "junior", "mid", "senior", "unspecified",
}


def _skill_tags(tags: List[str]) -> set:
    return {
        normalize_skill(t)
        for t in tags
        if t and t.strip().lower() not in _NON_SKILL_LABELS
    }


def score_job(candidate_skills: List[str], job: Job) -> float:
    if not job.tags:
        return 0.0
    candidate_set = {normalize_skill(s) for s in candidate_skills}
    job_set = _skill_tags(job.tags)
    if not job_set or not candidate_set:
        return 0.0
    overlap = candidate_set & job_set
    return round(len(overlap) / len(job_set), 2)


def recommend_jobs(candidate_skills: List[str], all_jobs: List[Job], top_n: int = 6):
    scored = [(job, score_job(candidate_skills, job)) for job in all_jobs]
    scored = [pair for pair in scored if pair[1] > 0]
    scored.sort(key=lambda pair: pair[1], reverse=True)
    return scored[:top_n]