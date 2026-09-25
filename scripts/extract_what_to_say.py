#!/usr/bin/env python3
"""Extract the What to say formula index without opening linked PDFs."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from collections import OrderedDict
from html.parser import HTMLParser
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "data/source/what-say.html"
DEFAULT_OUTPUT = ROOT / "data/what-to-say.json"
METADATA_PATH = ROOT / "data/source/metadata.json"

CATEGORY_TITLE_OVERRIDES = {
    "Cramer fromula (1 example)": "Cramer's rule",
}

NO_SPLIT_LINKS = {"distance01.pdf"}


def normalized_text(value: str) -> str:
    return " ".join(value.replace("\xa0", " ").split())


class WhatToSayParser(HTMLParser):
    """Collect category buttons and PDF formula anchors in document order."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.current_category: str | None = None
        self.current_attribution: str | None = None
        self.in_category_button = False
        self.category_text: list[str] = []
        self.in_paragraph = False
        self.paragraph_text: list[str] = []
        self.in_pdf_anchor = False
        self.anchor_text: list[str] = []
        self.anchor_href: str | None = None
        self.rows: list[dict[str, str | None]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = dict(attrs)
        classes = (attributes.get("class") or "").split()

        if tag == "button" and "collapsable-header" in classes:
            self.in_category_button = True
            self.category_text = []

        if tag == "p":
            self.in_paragraph = True
            self.paragraph_text = []

        href = attributes.get("href") or ""
        if (
            tag == "a"
            and self.current_category
            and href.lower().split("?", 1)[0].endswith(".pdf")
        ):
            self.in_pdf_anchor = True
            self.anchor_text = []
            self.anchor_href = href

    def handle_data(self, data: str) -> None:
        if self.in_category_button:
            self.category_text.append(data)
        if self.in_paragraph:
            self.paragraph_text.append(data)
        if self.in_pdf_anchor:
            self.anchor_text.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "button" and self.in_category_button:
            self.current_category = normalized_text("".join(self.category_text))
            self.current_attribution = None
            self.in_category_button = False

        if tag == "a" and self.in_pdf_anchor:
            self.rows.append(
                {
                    "category": self.current_category,
                    "attribution": self.current_attribution,
                    "pdfUrl": self.anchor_href,
                    "anchorText": "".join(self.anchor_text),
                }
            )
            self.in_pdf_anchor = False
            self.anchor_href = None

        if tag == "p" and self.in_paragraph:
            paragraph = normalized_text("".join(self.paragraph_text))
            if "student," in paragraph.lower():
                self.current_attribution = paragraph.rstrip(":")
            self.in_paragraph = False


def extract_math(anchor_text: str) -> tuple[str, list[str]]:
    notes: list[str] = []
    first_dollar = anchor_text.find("$")
    last_dollar = anchor_text.rfind("$")

    if first_dollar == -1 or last_dollar == first_dollar:
        raise ValueError(f"Formula anchor has no complete dollar delimiters: {anchor_text!r}")

    prefix = normalized_text(anchor_text[:first_dollar])
    suffix = normalized_text(anchor_text[last_dollar + 1 :])
    if prefix:
        notes.append(f"Ignored text before the opening dollar delimiter: {prefix!r}.")
    if suffix:
        notes.append(f"Ignored text after the closing dollar delimiter: {suffix!r}.")

    formula = anchor_text[first_dollar + 1 : last_dollar].replace("\xa0", " ").strip()
    return formula, notes


def split_on_top_level_commas(formula: str) -> list[str]:
    parts: list[str] = []
    start = 0
    braces = 0
    parentheses = 0
    brackets = 0
    index = 0

    while index < len(formula):
        character = formula[index]
        if character == "\\":
            index += 2
            continue
        if character == "{":
            braces += 1
        elif character == "}":
            braces = max(0, braces - 1)
        elif character == "(":
            parentheses += 1
        elif character == ")":
            parentheses = max(0, parentheses - 1)
        elif character == "[":
            brackets += 1
        elif character == "]":
            brackets = max(0, brackets - 1)
        elif character == "," and braces == parentheses == brackets == 0:
            parts.append(formula[start:index])
            start = index + 1
        index += 1

    parts.append(formula[start:])
    return parts


def clean_formula_part(formula: str) -> str:
    formula = re.sub(r"^\s*(?:\\quad\s*)+", "", formula)
    formula = re.sub(r"(?:\\quad\s*)+$", "", formula)
    return formula.strip(" ,")


def split_formula(formula: str, pdf_url: str) -> list[str]:
    filename = Path(pdf_url.split("?", 1)[0]).name

    if filename in NO_SPLIT_LINKS:
        return [clean_formula_part(formula)]

    if filename == "eigen01.pdf":
        parts = re.split(r",\s*\\quad\s*(?=A\s*=)", formula, maxsplit=1)
    else:
        parts = split_on_top_level_commas(formula)

    cleaned = [clean_formula_part(part) for part in parts]
    return [part for part in cleaned if part]


def display_formula(source_formula: str, pdf_url: str) -> tuple[str, list[str]]:
    filename = Path(pdf_url.split("?", 1)[0]).name
    formula = source_formula
    notes: list[str] = []

    if filename == "graph08.pdf" and "\\log_{0,5}" in formula:
        formula = formula.replace("\\log_{0,5}", "\\log_{0.5}")
        notes.append("Changed the decimal comma in the logarithm base to a decimal point.")

    if filename == "eigen01.pdf" and "\\begin{array}{c}" in formula:
        formula = formula.replace("\\begin{array}{c}", "\\begin{array}{cc}")
        notes.append("Changed the matrix array declaration from one column to two columns.")

    if filename == "series10.pdf" and "\\sum\\limits_{n+1}" in formula:
        formula = formula.replace("\\sum\\limits_{n+1}", "\\sum\\limits_{n=1}")
        notes.append("Inserted the missing equals sign in the lower summation limit; confirmation is still required.")

    formula = re.sub(r"\s+", " ", formula).strip()
    return formula, notes


def category_details(source_title: str) -> tuple[str, int | None]:
    match = re.search(r"\s*\((\d+) examples?\)\s*$", source_title)
    declared_count = int(match.group(1)) if match else None
    title = source_title[: match.start()].strip() if match else source_title
    title = CATEGORY_TITLE_OVERRIDES.get(source_title, title)
    return title, declared_count


def slugify(value: str) -> str:
    value = value.lower().replace("'", "")
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def load_metadata() -> dict[str, Any]:
    return json.loads(METADATA_PATH.read_text(encoding="utf-8"))["whatToSay"]


def build_dataset(source_path: Path) -> dict[str, Any]:
    source_bytes = source_path.read_bytes()
    source_hash = hashlib.sha256(source_bytes).hexdigest()
    metadata = load_metadata()
    if source_hash != metadata["sha256"]:
        raise ValueError(
            "The source snapshot hash differs from data/source/metadata.json. "
            "Review the new source before updating the recorded hash."
        )

    parser = WhatToSayParser()
    parser.feed(source_bytes.decode("utf-8"))

    grouped_rows: OrderedDict[str, list[dict[str, str | None]]] = OrderedDict()
    for row in parser.rows:
        category = row["category"]
        if not category:
            raise ValueError("A PDF formula link was found outside a named category.")
        grouped_rows.setdefault(category, []).append(row)

    categories: list[dict[str, Any]] = []
    global_order = 0
    total_links = 0

    for category_order, (source_title, rows) in enumerate(grouped_rows.items(), start=1):
        title, declared_count = category_details(source_title)
        category_id = slugify(title)
        items: list[dict[str, Any]] = []

        for link_order, row in enumerate(rows, start=1):
            total_links += 1
            pdf_url = str(row["pdfUrl"])
            link_formula, extraction_notes = extract_math(str(row["anchorText"]))
            parts = split_formula(link_formula, pdf_url)

            for part_order, source_formula in enumerate(parts, start=1):
                global_order += 1
                shown_formula, normalization_notes = display_formula(source_formula, pdf_url)
                item_order = len(items) + 1
                items.append(
                    {
                        "id": f"{category_id}-{item_order:03d}",
                        "categoryOrder": item_order,
                        "globalOrder": global_order,
                        "linkOrder": link_order,
                        "partOrder": part_order,
                        "sourceFormula": source_formula,
                        "displayFormula": shown_formula,
                        "reading": None,
                        "pdfUrl": pdf_url,
                        "attribution": row["attribution"],
                        "sourceLinkFormula": row["anchorText"],
                        "extractionNotes": extraction_notes,
                        "normalizationNotes": normalization_notes,
                    }
                )

        categories.append(
            {
                "id": category_id,
                "title": title,
                "sourceTitle": source_title,
                "sourceOrder": category_order,
                "declaredItemCount": declared_count,
                "items": items,
            }
        )

    return {
        "schemaVersion": 1,
        "title": "Math English Reading Drill",
        "source": {
            "name": "What to say...",
            "url": metadata["url"],
            "retrievedAt": metadata["retrievedAt"],
            "htmlSha256": source_hash,
            "linkedPdfsRead": False,
        },
        "extraction": {
            "categoryCount": len(categories),
            "pdfLinkCount": total_links,
            "itemCount": global_order,
            "splitPolicy": "One independent exercise per item; compound input belonging to one exercise remains together.",
        },
        "categories": categories,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--check", action="store_true")
    return parser.parse_args()


def preserve_readings(dataset: dict[str, Any], output_path: Path) -> None:
    """Keep reviewed readings when the item id and source formula are unchanged."""
    if not output_path.exists():
        return

    existing = json.loads(output_path.read_text(encoding="utf-8"))
    existing_items = {
        item["id"]: item
        for category in existing.get("categories", [])
        for item in category.get("items", [])
    }

    for category in dataset["categories"]:
        for item in category["items"]:
            previous = existing_items.get(item["id"])
            if (
                previous
                and previous.get("sourceFormula") == item["sourceFormula"]
                and isinstance(previous.get("reading"), str)
            ):
                item["reading"] = previous["reading"]


def main() -> int:
    args = parse_args()
    dataset = build_dataset(args.source)
    preserve_readings(dataset, args.output)
    rendered = json.dumps(dataset, ensure_ascii=False, indent=2) + "\n"

    if args.check:
        if not args.output.exists():
            print(f"Missing generated file: {args.output}", file=sys.stderr)
            return 1
        if args.output.read_text(encoding="utf-8") != rendered:
            print(
                f"Generated data is stale. Run: python3 {Path(__file__).name}",
                file=sys.stderr,
            )
            return 1
        print(
            f"Extraction is current: {dataset['extraction']['categoryCount']} categories, "
            f"{dataset['extraction']['pdfLinkCount']} PDF links, "
            f"{dataset['extraction']['itemCount']} items."
        )
        return 0

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(rendered, encoding="utf-8")
    print(
        f"Wrote {args.output}: {dataset['extraction']['categoryCount']} categories, "
        f"{dataset['extraction']['pdfLinkCount']} PDF links, "
        f"{dataset['extraction']['itemCount']} items."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
