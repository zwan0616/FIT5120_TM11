#!/usr/bin/env python3
"""
Offline script: generate Pollinations AI images for a list of food names.

Reads a JSON file containing a list of food name strings, skips foods that
already have a ready image on disk, downloads the rest from Pollinations AI,
saves PNGs to static/generated_foods/{food_key}.png, and updates
data/image_cache/food_image_cache.json.

Safe to stop/restart at any time — cache is written after every item.

Usage:
    python scripts/generate_missing_food_images_loop.py --input scripts/default_foods.json
    python scripts/generate_missing_food_images_loop.py --input scripts/extra_foods.json \\
        --batch-size 5 --sleep 20 --round-sleep 30 --max-rounds 0

CLI options:
    --input FILE        JSON file with list of food name strings (required)
    --limit N           Only process first N foods from the list
    --batch-size N      Max items to attempt per round (0 = unlimited)
    --dry-run           Print what would be done without downloading
    --force             Re-download even if image already exists
    --retry-failed      Include foods marked 'failed' in cache
    --retry-pending     Include foods marked 'pending' (stale)
    --max-rounds N      Maximum rounds to loop (0 = unlimited)
    --sleep S           Seconds to sleep between each request (default 5)
    --round-sleep S     Extra seconds between rounds (default 10)
    --timeout S         HTTP timeout per request in seconds (default 30)
    --verbose           Print extra debug info
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

# ─── Paths ────────────────────────────────────────────────────────────────────

ROOT       = Path(__file__).resolve().parent.parent
CACHE_FILE = ROOT / "data" / "image_cache" / "food_image_cache.json"
GEN_DIR    = ROOT / "static" / "generated_foods"

CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
GEN_DIR.mkdir(parents=True, exist_ok=True)

# ─── Try to import from app services; fall back to inline implementations ─────

try:
    sys.path.insert(0, str(ROOT))
    from app.services.food_image_cache import (
        normalize_food_key,
        load_cache,
        save_cache,
        get_category_fallback_image,
    )
    from app.services.enrichment import infer_category
    _USING_APP = True
except ImportError:
    _USING_APP = False

    def normalize_food_key(food_name: str) -> str:
        key = food_name.lower().strip()
        key = re.sub(r"[^\w\s-]", "", key)
        key = re.sub(r"[\s\-]+", "_", key)
        key = re.sub(r"_+", "_", key).strip("_")
        return key

    def load_cache() -> dict:
        if not CACHE_FILE.exists():
            return {}
        try:
            with open(CACHE_FILE, encoding="utf-8") as f:
                data = json.load(f)
            return data if isinstance(data, dict) else {}
        except (json.JSONDecodeError, OSError):
            return {}

    def save_cache(cache: dict) -> None:
        tmp = CACHE_FILE.with_suffix(".tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(cache, f, indent=2, ensure_ascii=False)
        tmp.replace(CACHE_FILE)

    _CATEGORY_RULES: list[tuple[str, list[str]]] = [
        ("eggs",         ["egg"]),
        ("fish",         ["salmon", "tuna", "cod", "mackerel", "sardine", "fish"]),
        ("meat",         ["chicken", "beef", "lamb", "turkey", "pork", "duck",
                          "steak", "ribs", "meat", "poultry", "prawn", "shrimp"]),
        ("dairy",        ["milk", "yogurt", "cheese", "cream", "butter", "dairy"]),
        ("beans",        ["bean", "lentil", "tofu", "soy", "chickpea", "pea",
                          "legume", "tempeh", "hummus"]),
        ("fruits",       ["apple", "banana", "orange", "mango", "berry", "kiwi",
                          "grape", "melon", "peach", "pear", "avocado", "lemon",
                          "watermelon", "strawberr", "blueberr", "fruit"]),
        ("vegetables",   ["carrot", "spinach", "broccoli", "kale", "tomato",
                          "cucumber", "capsicum", "pepper", "zucchini", "eggplant",
                          "pumpkin", "sweet potato", "potato", "beet", "cabbage",
                          "lettuce", "corn", "asparagus", "cauliflower", "mushroom",
                          "onion", "garlic", "vegetable", "veggie"]),
        ("grains",       ["oat", "oatmeal", "bread", "wheat", "barley", "quinoa",
                          "cereal", "granola", "toast", "grain"]),
        ("rice",         ["rice", "congee", "risotto", "fried rice"]),
        ("noodles",      ["noodle", "pasta", "spaghetti", "ramen", "pho",
                          "pad thai", "udon", "soba"]),
        ("snacks",       ["chip", "chocolate", "cookie", "cake", "ice cream",
                          "muffin", "fries", "donut", "popcorn", "snack"]),
        ("drinks",       ["soda", "juice", "smoothie", "drink", "water", "tea"]),
        ("mixed_dishes", ["soup", "stew", "curry", "stir fry", "stir-fry",
                          "salad", "wrap", "sandwich", "dumpling", "spring roll",
                          "porridge", "casserole", "bowl", "chowder", "hash"]),
    ]

    def infer_category(food_name: str) -> str:
        name = food_name.lower()
        for category, keywords in _CATEGORY_RULES:
            for kw in keywords:
                if kw in name:
                    return category
        return "mixed_dishes"

    def get_category_fallback_image(category: str) -> str:
        return f"/static/category_fallback/{category}.png"


# ─── Pollinations URL builder ─────────────────────────────────────────────────

def build_pollinations_url(food_name: str) -> str:
    prompt = (
        f"professional food photography of {food_name}, "
        "appetizing, clean white background, natural lighting, high quality, "
        "isolated food item"
    )
    encoded = urllib.parse.quote(prompt)
    return f"https://image.pollinations.ai/prompt/{encoded}?nologo=true&width=512&height=512"


# ─── Core download ────────────────────────────────────────────────────────────

def _now_iso() -> str:
    return datetime.now(tz=timezone.utc).isoformat()


def download_image(food_name: str, timeout: int, verbose: bool) -> tuple[bool, str]:
    """
    Download image from Pollinations and save to GEN_DIR/{key}.png.
    Returns (success, message).
    """
    key      = normalize_food_key(food_name)
    category = infer_category(food_name)
    dest     = GEN_DIR / f"{key}.png"
    url      = build_pollinations_url(food_name)

    if verbose:
        print(f"  GET {url}")

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "NutriHealthBot/1.0"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            status_code = resp.status
            content_type = resp.headers.get("Content-Type", "")
            if status_code == 402:
                return False, f"HTTP 402 (rate limited)"
            if "image" not in content_type:
                return False, f"Bad Content-Type: {content_type}"
            data = resp.read()

        if len(data) < 1024:
            return False, f"Response too small ({len(data)} bytes)"

        dest.write_bytes(data)
        image_url = f"/static/generated_foods/{key}.png"

        # Update cache
        cache = load_cache()
        entry = cache.get(key, {})
        now   = _now_iso()
        cache[key] = {
            **entry,
            "food_name":    food_name,
            "category":     category,
            "image_url":    image_url,
            "image_status": "ready",
            "created_at":   entry.get("created_at", now),
            "updated_at":   now,
            "error":        None,
        }
        save_cache(cache)
        return True, f"saved {dest.name} ({len(data):,} bytes)"

    except urllib.error.HTTPError as exc:
        msg = f"HTTP {exc.code}: {exc.reason}"
        _mark_failed(food_name, category, msg)
        return False, msg
    except urllib.error.URLError as exc:
        msg = f"URLError: {exc.reason}"
        _mark_failed(food_name, category, msg)
        return False, msg
    except Exception as exc:
        msg = str(exc)
        _mark_failed(food_name, category, msg)
        return False, msg


def _mark_failed(food_name: str, category: str, error: str) -> None:
    key   = normalize_food_key(food_name)
    cache = load_cache()
    entry = cache.get(key, {})
    now   = _now_iso()
    cache[key] = {
        **entry,
        "food_name":    food_name,
        "category":     category,
        "image_url":    entry.get("image_url", get_category_fallback_image(category)),
        "image_status": "failed",
        "created_at":   entry.get("created_at", now),
        "updated_at":   now,
        "error":        error,
    }
    save_cache(cache)


# ─── Main loop ────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Generate missing food images via Pollinations AI")
    parser.add_argument("--input",        required=True, help="JSON file with list of food names")
    parser.add_argument("--limit",        type=int, default=0,  help="Max foods to process (0=all)")
    parser.add_argument("--batch-size",   type=int, default=0,  help="Max items per round (0=unlimited)")
    parser.add_argument("--dry-run",      action="store_true",  help="Print plan, no downloads")
    parser.add_argument("--force",        action="store_true",  help="Re-download existing images")
    parser.add_argument("--retry-failed", action="store_true",  help="Retry failed items")
    parser.add_argument("--retry-pending",action="store_true",  help="Retry stale pending items")
    parser.add_argument("--max-rounds",   type=int, default=0,  help="Max loop rounds (0=unlimited)")
    parser.add_argument("--sleep",        type=float, default=5.0,  help="Sleep between requests (s)")
    parser.add_argument("--round-sleep",  type=float, default=10.0, help="Sleep between rounds (s)")
    parser.add_argument("--timeout",      type=int,   default=30,   help="HTTP timeout per request (s)")
    parser.add_argument("--verbose",      action="store_true")
    args = parser.parse_args()

    # Load food list
    input_path = Path(args.input)
    if not input_path.is_absolute():
        input_path = ROOT / args.input
    if not input_path.exists():
        print(f"ERROR: input file not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    with open(input_path, encoding="utf-8") as f:
        all_foods: list[str] = json.load(f)

    if not isinstance(all_foods, list):
        print("ERROR: input file must contain a JSON array of strings", file=sys.stderr)
        sys.exit(1)

    if args.limit > 0:
        all_foods = all_foods[:args.limit]

    print(f"Loaded {len(all_foods)} food names from {input_path.name}")
    print(f"Using app services: {_USING_APP}")
    print(f"Output dir: {GEN_DIR}")
    print(f"Cache: {CACHE_FILE}")
    print()

    totals = {"generated": 0, "skipped": 0, "failed": 0}
    round_num = 0
    consecutive_zero = 0

    while True:
        round_num += 1
        if args.max_rounds > 0 and round_num > args.max_rounds:
            print(f"Reached max rounds ({args.max_rounds}). Stopping.")
            break

        # Build to-process list for this round
        cache = load_cache()
        to_process: list[str] = []

        for food_name in all_foods:
            key   = normalize_food_key(food_name)
            entry = cache.get(key, {})
            status = entry.get("image_status", "missing")
            file_exists = (GEN_DIR / f"{key}.png").exists()

            if status == "ready" and file_exists and not args.force:
                continue  # already done
            if status == "pending" and not args.retry_pending:
                continue
            if status == "failed" and not args.retry_failed and not args.force:
                continue

            to_process.append(food_name)

        if not to_process:
            print("All foods processed. Done.")
            break

        if args.batch_size > 0 and len(to_process) > args.batch_size:
            to_process = to_process[:args.batch_size]

        print(f"--- Round {round_num} | {len(to_process)} items to process ---")

        attempted = 0
        round_counts = {"generated": 0, "failed": 0}

        for i, food_name in enumerate(to_process):
            key = normalize_food_key(food_name)
            print(f"  [{i+1}/{len(to_process)}] {food_name!r} (key={key})", end=" ")

            if args.dry_run:
                print("[dry-run]")
                continue

            attempted += 1
            success, msg = download_image(food_name, args.timeout, args.verbose)

            if success:
                print(f"✓ {msg}")
                round_counts["generated"] += 1
                totals["generated"] += 1
            else:
                print(f"✗ {msg}")
                round_counts["failed"] += 1
                totals["failed"] += 1

            if i < len(to_process) - 1:
                time.sleep(args.sleep)

        if args.dry_run:
            print("Dry run complete.")
            break

        print(f"Round {round_num} done: {round_counts['generated']} generated, "
              f"{round_counts['failed']} failed")

        # Early-stop: 3 consecutive rounds with zero successes
        if attempted > 0 and round_counts["generated"] == 0:
            consecutive_zero += 1
            if consecutive_zero >= 3:
                print("Stopping after 3 consecutive rounds with zero progress.")
                break
        else:
            consecutive_zero = 0

        # Check if anything remains
        cache = load_cache()
        remaining = sum(
            1 for fn in all_foods
            if not ((GEN_DIR / f"{normalize_food_key(fn)}.png").exists()
                    and cache.get(normalize_food_key(fn), {}).get("image_status") == "ready")
        )
        if remaining == 0:
            print("All foods processed. Done.")
            break

        print(f"Remaining: {remaining}. Sleeping {args.round_sleep}s before next round...")
        time.sleep(args.round_sleep)

    print()
    print("=" * 50)
    print(f"Total generated : {totals['generated']}")
    print(f"Total failed    : {totals['failed']}")
    cache = load_cache()
    ready = sum(
        1 for fn in all_foods
        if cache.get(normalize_food_key(fn), {}).get("image_status") == "ready"
        and (GEN_DIR / f"{normalize_food_key(fn)}.png").exists()
    )
    print(f"Ready on disk   : {ready} / {len(all_foods)}")


if __name__ == "__main__":
    main()
