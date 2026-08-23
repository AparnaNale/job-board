"""
One-time script: reads the given jobs.json (SerpApi/Google-Jobs style)
dataset, dedups it, tags it with Gemini, and saves it into
Postgres/Supabase.

Usage:
    python scripts/seed_data.py --file path/to/jobs_dataset.json --api-key YOUR_GEMINI_KEY

Note: if --api-key isn't given, AI tagging is skipped (jobs are still
saved, tags will only contain the dataset's own 'skills'/'domain') -- the
app still works either way.

The dataset's actual shape (based on the provided sample): a JSON array,
where each record has these useful fields:
  title, company_name, location, description / formattedDescription,
  via              -> which site the job was posted on (e.g. "LinkedIn",
                       "Naukri.com", but sometimes a third-party
                       aggregator's name too -- BeBee, Adzuna, etc.)
  apply_options     -> a JSON-ENCODED STRING (needs to be parsed twice),
                       a list of {"link":..., "title":...} -- the platform
                       can also be identified from this
  skills            -> "Not mentioned" or comma-separated skills
  domain            -> broad category, e.g. "Data Science"
  minExperienceRequired / maxExperienceRequired
"""
import argparse
import asyncio
import json
import re
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, Base, engine
from models import Job
from services.dedup import compute_job_hash
from services.tagging import tag_job_description

KNOWN_PLATFORMS = ["linkedin", "naukri", "indeed", "internshala"]


def parse_apply_options(raw) -> list:
    """apply_options is sometimes a list, sometimes a JSON-encoded string -- handle both."""
    if not raw:
        return []
    if isinstance(raw, list):
        return raw
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, list) else []
    except (json.JSONDecodeError, TypeError):
        return []


def detect_source_platform(item: dict, apply_options: list) -> str:
    """
    Checks the 'via' field and the link/title inside apply_options to
    identify which of the four platforms this is. If nothing matches, the
    dataset's own 'via' value is slugified and used instead -- so no data
    is lost, it just won't show up in the 4-platform dropdown filter.
    """
    candidates = [_to_str(item.get("via")).lower()]
    for opt in apply_options:
        if not isinstance(opt, dict):
            continue
        candidates.append(_to_str(opt.get("title")).lower())
        candidates.append(_to_str(opt.get("link")).lower())
    combined = " ".join(candidates)

    for platform in KNOWN_PLATFORMS:
        if platform in combined:
            return platform

    via = _to_str(item.get("via")).strip()
    if via:
        return re.sub(r"[^a-z0-9]+", "_", via.lower()).strip("_") or "other"
    return "other"


def extract_apply_link(apply_options: list) -> str:
    if apply_options and isinstance(apply_options[0], dict):
        return _to_str(apply_options[0].get("link"))
    return ""


def _to_str(value) -> str:
    """A field can be None, a number, or a list -- always convert it to a
    safe string so this never crashes."""
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    return str(value)


def extract_dataset_tags(item: dict) -> list:
    """Fills tags from signals already present in the dataset (skills/domain), before any AI call."""
    tags = []
    skills_raw = _to_str(item.get("skills")).strip()
    if skills_raw and skills_raw.lower() != "not mentioned":
        tags.extend([s.strip() for s in skills_raw.split(",") if s.strip()])
    domain = _to_str(item.get("domain")).strip()
    if domain:
        tags.append(domain)
    return tags


def _to_number(value):
    """The dataset's experience fields are sometimes an int, sometimes a
    string ("2"), sometimes blank text ("Not mentioned", "") -- handle all
    of these safely, returning None if it can't be converted (no crash)."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return value
    try:
        return float(str(value).strip())
    except (ValueError, TypeError):
        return None


def guess_experience_level(item: dict) -> str:
    min_exp = _to_number(item.get("minExperienceRequired"))
    max_exp = _to_number(item.get("maxExperienceRequired"))
    if min_exp is None and max_exp is None:
        return "unspecified"
    lo = min_exp if min_exp is not None else 0
    if lo == 0:
        return "fresher"
    if lo <= 2:
        return "junior"
    if lo <= 5:
        return "mid"
    return "senior"



async def seed(file_path: str, api_key: str | None):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    with open(file_path, "r", encoding="utf-8") as f:
        raw_jobs = json.load(f)

    total = len(raw_jobs)
    print(f"Loaded {total} records from {file_path}")

    # PERFORMANCE FIX: this used to run a separate DB query per job (for
    # the duplicate check) -- since Supabase is remote, every round-trip
    # incurs network latency, which was very slow for thousands of jobs.
    # Now all existing hashes are loaded up front in a single query and
    # checked against an in-memory set instead -- no more per-row DB calls.
    existing_hashes = {row[0] for row in db.query(Job.raw_hash).all()}
    print(f"{len(existing_hashes)} jobs already in the database")

    new_jobs = []
    inserted, skipped_duplicates, skipped_incomplete, skipped_errors = 0, 0, 0, 0

    for idx, item in enumerate(raw_jobs, start=1):
        if idx % 200 == 0 or idx == total:
            print(f"  processing {idx}/{total}...")

        try:
            title = _to_str(item.get("title")).strip()
            company = _to_str(item.get("company_name") or item.get("company")).strip()
            location = _to_str(item.get("location")).strip()
            description = _to_str(item.get("description") or item.get("formattedDescription")).strip()

            if not title or not description:
                skipped_incomplete += 1
                continue  # incomplete record -- skip gracefully, don't crash

            job_hash = compute_job_hash(title, company, location)
            if job_hash in existing_hashes:
                skipped_duplicates += 1
                continue
            existing_hashes.add(job_hash)  # also catches duplicates within the same file

            apply_options = parse_apply_options(item.get("apply_options"))
            source = detect_source_platform(item, apply_options)
            apply_link = extract_apply_link(apply_options)

            tags = extract_dataset_tags(item)
            experience_level = guess_experience_level(item)

            if api_key:
                try:
                    result = await tag_job_description(description, api_key)
                    tags = list(dict.fromkeys(tags + result["tags"]))  # merge + dedupe
                    if result.get("experience_level") not in (None, "unspecified"):
                        experience_level = result["experience_level"]
                except Exception as e:
                    print(f"  [warn] AI tagging failed for '{title}': {e}")

            new_jobs.append(
                Job(
                    title=title,
                    company=company,
                    location=location,
                    description=description,
                    source_platform=source,
                    apply_link=apply_link,
                    tags=tags,
                    experience_level=experience_level,
                    raw_hash=job_hash,
                )
            )
            inserted += 1

        except Exception as e:
            # If a single record is malformed (unexpected shape), don't
            # let it crash the whole 56,000-row run -- just log and skip it.
            skipped_errors += 1
            print(f"  [warn] skipped record {idx} due to error: {e}")
            continue

        # Batch insert every 500 rows instead of one giant commit at the
        # end -- keeps memory bounded and gives visible progress on huge files.
        if len(new_jobs) >= 500:
            db.bulk_save_objects(new_jobs)
            db.commit()
            new_jobs = []

    if new_jobs:
        db.bulk_save_objects(new_jobs)
        db.commit()

    db.close()
    print(
        f"Done. Inserted: {inserted}, "
        f"Skipped duplicates: {skipped_duplicates}, "
        f"Skipped incomplete: {skipped_incomplete}, "
        f"Skipped errors: {skipped_errors}"
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", required=True, help="Path to jobs_dataset.json")
    parser.add_argument("--api-key", default=None, help="Gemini API key for AI tagging (optional)")
    args = parser.parse_args()

    asyncio.run(seed(args.file, args.api_key))