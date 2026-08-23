"""
Dataset parsing logic — pure functions, ZERO external dependencies
(no SQLAlchemy, no DB, no network). Pulled out of scripts/seed_data.py so
it can be:
  1. unit-tested / dry-run tested without a database or API key
  2. reused if we ever need to parse the dataset outside the seed script

The dataset's actual shape (SerpApi/Google-Jobs style) -- each record has
these useful fields:
  title, company_name, location, description / formattedDescription,
  via              -> which site the job was posted on (e.g. "LinkedIn",
                       "Naukri.com", but sometimes a third-party
                       aggregator's name too -- Recruit.net, SimplyHired, etc.)
  apply_options     -> a JSON-ENCODED STRING (needs to be parsed twice),
                       a list of {"link":..., "title":...}
  skills            -> "Not mentioned" or comma-separated skills
  domain            -> broad category, e.g. "Data Science"
  roles             -> comma-separated role titles
  minExperienceRequired / maxExperienceRequired
  posted_at         -> a "2025/7/14, 23:30" style string
"""
import json
from datetime import datetime

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


def detect_source_platform(item: dict, apply_options: list):
    """
    Returns (canonical_source, matched_apply_option_title):
      - canonical_source is ALWAYS one of "linkedin"/"naukri"/"indeed"/
        "internshala"/"other" -- a single clean set, so the dropdown filter
        doesn't explode (the dataset has Recruit.net, SimplyHired, Bayt.com,
        Jobrapido and 10+ other aggregators -- they all get bucketed into
        "other", but the raw 'via' value is still saved separately in the
        source_raw column, so no data is lost).
      - matched_apply_option_title, if a match was found among the
        apply_options, so that option's specific link can be selected.
    """
    via = (item.get("via") or "").lower()
    for platform in KNOWN_PLATFORMS:
        if platform in via:
            return platform, None

    for opt in apply_options:
        title = (opt.get("title") or "").lower()
        link = (opt.get("link") or "").lower()
        for platform in KNOWN_PLATFORMS:
            if platform in title or platform in link:
                return platform, opt.get("title")

    return "other", None


def extract_apply_link(apply_options: list, matched_title):
    """Prefer the apply option link matching the detected platform;
    otherwise fall back to the first available link."""
    if matched_title:
        for opt in apply_options:
            if opt.get("title") == matched_title:
                return opt.get("link", "") or ""
    if apply_options and isinstance(apply_options[0], dict):
        return apply_options[0].get("link", "") or ""
    return ""


def extract_dataset_tags(item: dict) -> list:
    """Fills tags from signals already present in the dataset (skills/domain/roles), before any AI call."""
    tags = []
    skills_raw = (item.get("skills") or "").strip()
    if skills_raw and skills_raw.lower() != "not mentioned":
        tags.extend([s.strip() for s in skills_raw.split(",") if s.strip()])
    domain = (item.get("domain") or "").strip()
    if domain:
        tags.append(domain)
    roles_raw = (item.get("roles") or "").strip()
    if roles_raw:
        tags.extend([r.strip() for r in roles_raw.split(",") if r.strip()])
    return list(dict.fromkeys(tags))  # dedupe, keep order


def guess_experience_level(item: dict) -> str:
    min_exp = item.get("minExperienceRequired")
    max_exp = item.get("maxExperienceRequired")
    try:
        min_exp = int(min_exp) if min_exp not in (None, "null", "") else None
    except (TypeError, ValueError):
        min_exp = None
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


def parse_posted_at(raw):
    """The dataset's date is in a "2025/7/14, 23:30" style format.
    If it can't be parsed, return None -- the job is still saved, just
    with an empty posted_at (no crash)."""
    if not raw:
        return None
    for fmt in ("%Y/%m/%d, %H:%M", "%Y/%m/%d %H:%M", "%Y-%m-%d"):
        try:
            return datetime.strptime(raw.strip(), fmt)
        except (ValueError, AttributeError):
            continue
    return None


def parse_job_record(item: dict) -> dict | None:
    """Takes a raw dataset record and returns all the normalized data
    seed_data.py needs, in a single dict. Returns None for an incomplete
    record (missing title/description) -- the caller should skip it."""
    title = (item.get("title") or "").strip()
    company = (item.get("company_name") or item.get("company") or "").strip()
    location = (item.get("location") or "").strip()
    description = (item.get("description") or item.get("formattedDescription") or "").strip()

    if not title or not description:
        return None

    apply_options = parse_apply_options(item.get("apply_options"))
    source, matched_title = detect_source_platform(item, apply_options)

    return {
        "external_id": (item.get("job_id") or "").strip() or None,
        "title": title,
        "company": company,
        "location": location,
        "description": description,
        "source_platform": source,
        "source_raw": (item.get("via") or "").strip() or None,
        "apply_link": extract_apply_link(apply_options, matched_title),
        "employment_type": (item.get("employmentType") or item.get("schedule_type") or "").strip() or None,
        "posted_at": parse_posted_at(item.get("posted_at")),
        "tags": extract_dataset_tags(item),
        "experience_level": guess_experience_level(item),
    }
