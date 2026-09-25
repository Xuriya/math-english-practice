#!/usr/bin/env python3
"""Download the What to say index and record snapshot provenance."""

from __future__ import annotations

import hashlib
import json
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
SOURCE_PATH = ROOT / "data/source/what-say.html"
METADATA_PATH = ROOT / "data/source/metadata.json"
SOURCE_URL = "https://cm.pg.edu.pl/en/mathematics/vocabulary/what-say"


def main() -> None:
    request = Request(
        SOURCE_URL,
        headers={"User-Agent": "Math-English-Reading-Drill/0.1 (personal study)"},
    )
    with urlopen(request, timeout=60) as response:
        source = response.read()

    if b"collapsable-header" not in source or b".pdf" not in source:
        raise ValueError("The downloaded page does not contain the expected category and PDF markers.")

    digest = hashlib.sha256(source).hexdigest()
    retrieved_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8")) if METADATA_PATH.exists() else {}
    metadata["whatToSay"] = {
        "url": SOURCE_URL,
        "retrievedAt": retrieved_at,
        "sha256": digest,
    }

    SOURCE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=SOURCE_PATH.parent, delete=False) as temporary:
        temporary.write(source)
        temporary_path = Path(temporary.name)
    temporary_path.replace(SOURCE_PATH)
    METADATA_PATH.write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Saved {SOURCE_PATH} ({len(source)} bytes, sha256 {digest}).")


if __name__ == "__main__":
    main()
