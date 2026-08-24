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

Memory note: score_by_tags() takes only (id, tags) pairs, not full Job
ORM rows -- deliberately, so the caller can score against every job in
the DB without loading each job's full description text into memory.
On a 512MB free-tier container, loading full Job rows (description
included) for the whole dataset on every resume upload was enough to
exceed the memory limit and get the process killed (see routers/resume.py
for how the lightweight scoring pass + a second small fetch-by-id query
for just the top_n results replaces the old "load everything" approach).
"""
from typing import List, Tuple
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


def score_tags(candidate_skills: List[str], tags: List[str]) -> float:
    if not tags:
        return 0.0
    candidate_set = {normalize_skill(s) for s in candidate_skills}
    job_set = _skill_tags(tags)
    if not job_set or not candidate_set:
        return 0.0
    overlap = candidate_set & job_set
    return round(len(overlap) / len(job_set), 2)


def rank_job_ids(
    candidate_skills: List[str],
    id_tag_pairs: List[Tuple[str, List[str]]],
    top_n: int = 6,
) -> List[Tuple[str, float]]:
    """Takes cheap (job_id, tags) pairs -- not full Job rows -- and
    returns the top_n (job_id, score) pairs with score > 0, highest
    first. Caller fetches full row details only for these few ids."""
    scored = [(job_id, score_tags(candidate_skills, tags)) for job_id, tags in id_tag_pairs]
    scored = [pair for pair in scored if pair[1] > 0]
    scored.sort(key=lambda pair: pair[1], reverse=True)
    return scored[:top_n]