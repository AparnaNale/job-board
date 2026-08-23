"""
Dry-run tester — DB, Postgres, Supabase, ki Gemini key kahich lagत नाही.
Fakt tumcha dataset JSON file ghevun, prati job kasa parse/classify/dedupe
hoईल te dakhavto, jenekarun evaluate-yogya seed run karण्याआधीच dataset
compatibility खात्री करता yeईल.

Vapar:
    python scripts/dry_run_test.py --file path/to/jobs_dataset.json
    python scripts/dry_run_test.py --file scripts/sample_jobs.json --limit 5
"""
import argparse
import json
import sys
import os
from collections import Counter

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.dedup import compute_job_hash
from services.dataset_parser import parse_job_record


def run(file_path: str, limit: int | None):
    with open(file_path, "r", encoding="utf-8") as f:
        raw_jobs = json.load(f)

    print(f"Loaded {len(raw_jobs)} raw records from {file_path}\n")

    seen_hashes = set()
    source_counts = Counter()
    skipped_incomplete = 0
    skipped_duplicates = 0
    shown = 0

    for item in raw_jobs:
        parsed = parse_job_record(item)
        if parsed is None:
            skipped_incomplete += 1
            continue

        job_hash = compute_job_hash(parsed["title"], parsed["company"], parsed["location"])
        is_dup = job_hash in seen_hashes
        if is_dup:
            skipped_duplicates += 1
        else:
            seen_hashes.add(job_hash)
            source_counts[parsed["source_platform"]] += 1

        if limit is None or shown < limit:
            shown += 1
            status = "DUPLICATE (skip)" if is_dup else "insert"
            print(f"[{status}] {parsed['title']!r} @ {parsed['company']!r}")
            print(f"    source_platform : {parsed['source_platform']}"
                  f"{' (raw: ' + parsed['source_raw'] + ')' if parsed['source_raw'] else ''}")
            print(f"    apply_link      : {parsed['apply_link'] or '(none found)'}")
            print(f"    employment_type : {parsed['employment_type']}")
            print(f"    posted_at       : {parsed['posted_at']}")
            print(f"    experience_level: {parsed['experience_level']}")
            print(f"    tags            : {parsed['tags']}")
            print()

    print("=" * 60)
    print(f"Would insert       : {len(seen_hashes)}")
    print(f"Duplicates skipped : {skipped_duplicates}")
    print(f"Incomplete skipped : {skipped_incomplete}")
    print(f"Sources breakdown  : {dict(source_counts)}")
    print("=" * 60)
    print(
        "\nNote: this does NOT call Gemini and does NOT touch a database — "
        "it only proves the dataset->fields mapping and dedup logic are "
        "correct before you spend AI calls / DB writes on the real run."
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", required=True, help="Path to jobs_dataset.json")
    parser.add_argument("--limit", type=int, default=None, help="Only print details for first N records")
    args = parser.parse_args()
    run(args.file, args.limit)
