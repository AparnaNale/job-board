"""
Deduplication logic.

Approach: for each job, build a normalized 'raw_hash' -- title + company +
location are normalized (lowercased, extra spaces/punctuation stripped)
into a consistent string, then SHA-256 hashed. Before inserting, we check
whether that hash already exists in the table -- if so, the record is
skipped as a duplicate.

This approach is explainable and deterministic -- even if the same job
appears on two platforms with slightly different formatting (extra spaces,
case), it's still recognized as the same job.
"""
import hashlib
import re


def normalize(text: str) -> str:
    if not text:
        return ""
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9\s]", "", text)
    text = re.sub(r"\s+", " ", text)
    return text


def compute_job_hash(title: str, company: str, location: str) -> str:
    combined = f"{normalize(title)}|{normalize(company)}|{normalize(location)}"
    return hashlib.sha256(combined.encode("utf-8")).hexdigest()
