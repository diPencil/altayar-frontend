#!/usr/bin/env python3
"""
i18n audit utility for Altayar MobileApp frontend.

Checks:
- Missing keys between en/ar translation JSON files
- Type mismatches at any JSON path (dict vs string vs list, etc.)
- Placeholder mismatches (e.g., {{name}}, {{count}})
- Suspicious language content:
  - Latin letters in Arabic translations (ar.json)
  - Arabic letters in English translations (en.json)

Outputs a JSON report and prints a human-readable summary.
"""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence, Set, Tuple


ROOT = Path(__file__).resolve().parents[1]  # frontend/
EN_PATH = ROOT / "src" / "i18n" / "translations" / "en.json"
AR_PATH = ROOT / "src" / "i18n" / "translations" / "ar.json"


ARABIC_RE = re.compile(r"[\u0600-\u06FF]")
LATIN_RE = re.compile(r"[A-Za-z]")
PLACEHOLDER_RE = re.compile(r"\{\{\s*([A-Za-z0-9_]+)\s*\}\}")


T_CALL_RE = re.compile(r"""\bt\(\s*(?P<q>["'])(?P<key>[^"']+?)(?P=q)\s*(?:,|\))""")
T_CALL_TEMPLATE_RE = re.compile(r"""\bt\(\s*`(?P<key>[^`]+?)`\s*(?:,|\))""")
I18N_T_CALL_RE = re.compile(r"""\bi18n\.t\(\s*(?P<q>["'])(?P<key>[^"']+?)(?P=q)\s*(?:,|\))""")


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def iter_files(base: Path) -> Iterable[Path]:
    for p in base.rglob("*"):
        if p.is_file() and p.suffix in {".ts", ".tsx", ".js", ".jsx"}:
            yield p


def extract_keys_from_text(text: str) -> Set[str]:
    keys: Set[str] = set()
    for m in T_CALL_RE.finditer(text):
        keys.add(m.group("key"))
    for m in T_CALL_TEMPLATE_RE.finditer(text):
        keys.add(m.group("key"))
    for m in I18N_T_CALL_RE.finditer(text):
        keys.add(m.group("key"))
    # Ignore basic dynamic keys (heuristic)
    keys = {k for k in keys if "${" not in k and "+" not in k}
    return {k.strip() for k in keys if k.strip()}


def type_name(v: Any) -> str:
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "bool"
    if isinstance(v, (int, float)):
        return "number"
    if isinstance(v, str):
        return "string"
    if isinstance(v, list):
        return "list"
    if isinstance(v, dict):
        return "object"
    return type(v).__name__


def flatten_paths(
    obj: Any, prefix: str = "", include_containers: bool = True
) -> Dict[str, Any]:
    """
    Returns a mapping of JSON-path -> value for all nodes.
    - For dict/list: includes the container itself if include_containers is True
    - For dict: recurses into children using dot notation
    - For list: treated as a leaf (we do not expand indexes for i18n values)
    """
    out: Dict[str, Any] = {}

    key = prefix
    if key and include_containers:
        out[key] = obj

    if isinstance(obj, dict):
        for k, v in obj.items():
            child_key = f"{prefix}.{k}" if prefix else str(k)
            out.update(flatten_paths(v, child_key, include_containers=include_containers))
    elif isinstance(obj, list):
        # Do not expand list indices; keep as leaf
        if prefix and not include_containers:
            out[prefix] = obj
    else:
        if prefix:
            out[prefix] = obj

    return out


def get_in(obj: Dict[str, Any], dotted_key: str) -> Tuple[bool, Any]:
    cur: Any = obj
    for part in dotted_key.split("."):
        if not isinstance(cur, dict) or part not in cur:
            return False, None
        cur = cur[part]
    return True, cur


def placeholders(s: str) -> Set[str]:
    return set(PLACEHOLDER_RE.findall(s))


@dataclass(frozen=True)
class AuditConfig:
    # Key paths in en allowed to contain Arabic script (e.g. language labels)
    allow_arabic_in_en_keys: Set[str]
    # Key paths in ar allowed to contain Latin letters (e.g. VIP, USD, brand names)
    allow_latin_in_ar_keys: Set[str]
    # Substrings allowed in ar strings even if they contain Latin letters
    allow_latin_in_ar_substrings: Set[str]


DEFAULT_CONFIG = AuditConfig(
    allow_arabic_in_en_keys={
        "common.arabic",
        "common.language",
    },
    allow_latin_in_ar_keys={
        "common.tiers.VIP",
        "common.currency.usd",
        "common.altId",
        "common.langCode.en",
        "common.langCode.ar",
        "auth.placeholders.email",
        "wallet.currency",
        "offers.voucherValue",
        "about.description",
        "about.copyright",
        "about.developedBy",
        "legal.termsOfService.introContent",
    },
    allow_latin_in_ar_substrings={
        "VIP",
        "Altayar",
        "AltayarVIP",
        "diPencil",
        "USD",
        "SAR",
        "PTS",
        "ID",
        "SKU",
        "X",
        "O",
        "2048",
    },
)


def is_allowed_by_substrings(s: str, allowed: Set[str]) -> bool:
    return any(token in s for token in allowed)


def audit_language_content(
    en_flat: Dict[str, Any],
    ar_flat: Dict[str, Any],
    cfg: AuditConfig,
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    suspicious_in_ar: List[Dict[str, Any]] = []
    suspicious_in_en: List[Dict[str, Any]] = []

    def strip_placeholders(s: str) -> str:
        # Remove i18next-style placeholders like {{count}} so they don't flag Latin letters.
        return PLACEHOLDER_RE.sub("", s)

    for k, v in ar_flat.items():
        if not isinstance(v, str):
            continue
        if k in cfg.allow_latin_in_ar_keys:
            continue
        v_check = strip_placeholders(v)
        if LATIN_RE.search(v_check) and not is_allowed_by_substrings(v, cfg.allow_latin_in_ar_substrings):
            suspicious_in_ar.append({"key": k, "value": v})

    for k, v in en_flat.items():
        if not isinstance(v, str):
            continue
        if k in cfg.allow_arabic_in_en_keys:
            continue
        v_check = strip_placeholders(v)
        if ARABIC_RE.search(v_check):
            suspicious_in_en.append({"key": k, "value": v})

    return suspicious_in_ar, suspicious_in_en


def audit_placeholders(
    en_obj: Dict[str, Any], ar_obj: Dict[str, Any], common_leaf_keys: Sequence[str]
) -> List[Dict[str, Any]]:
    mismatches: List[Dict[str, Any]] = []
    for k in common_leaf_keys:
        ok_en, v_en = get_in(en_obj, k)
        ok_ar, v_ar = get_in(ar_obj, k)
        if not ok_en or not ok_ar:
            continue
        if not isinstance(v_en, str) or not isinstance(v_ar, str):
            continue
        pe = placeholders(v_en)
        pa = placeholders(v_ar)
        if pe != pa:
            mismatches.append(
                {
                    "key": k,
                    "en_placeholders": sorted(pe),
                    "ar_placeholders": sorted(pa),
                    "en_value": v_en,
                    "ar_value": v_ar,
                }
            )
    return mismatches


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit i18n translations for missing keys, mismatches, and suspicious values.")
    parser.add_argument(
        "--report",
        default=str(ROOT / "i18n_audit_report.json"),
        help="Write JSON report to this path (default: frontend/i18n_audit_report.json).",
    )
    parser.add_argument(
        "--scan",
        action="append",
        default=[],
        help="Directory to scan for used keys (relative to frontend/ or absolute). Can be provided multiple times.",
    )
    parser.add_argument("--full", action="store_true", help="Print full lists (default prints up to 200 items each).")
    args = parser.parse_args()

    en_obj = load_json(EN_PATH)
    ar_obj = load_json(AR_PATH)

    en_flat = flatten_paths(en_obj, include_containers=True)
    ar_flat = flatten_paths(ar_obj, include_containers=True)

    en_keys = set(en_flat.keys())
    ar_keys = set(ar_flat.keys())

    missing_in_en = sorted(ar_keys - en_keys)
    missing_in_ar = sorted(en_keys - ar_keys)

    type_mismatches: List[Dict[str, Any]] = []
    for k in sorted(en_keys & ar_keys):
        te = type_name(en_flat[k])
        ta = type_name(ar_flat[k])
        if te != ta:
            type_mismatches.append({"key": k, "en_type": te, "ar_type": ta})

    # Placeholder mismatches only on common leaf-string keys
    common_leaf_string_keys: List[str] = []
    for k in sorted(en_keys & ar_keys):
        if isinstance(en_flat[k], str) and isinstance(ar_flat[k], str):
            common_leaf_string_keys.append(k)
    placeholder_mismatches = audit_placeholders(en_obj, ar_obj, common_leaf_string_keys)

    suspicious_ar, suspicious_en = audit_language_content(en_flat, ar_flat, DEFAULT_CONFIG)

    # Used keys scanning (optional)
    used_keys: Set[str] = set()
    scan_dirs: List[str] = []
    if args.scan:
        for d in args.scan:
            p = Path(d)
            if not p.is_absolute():
                p = (ROOT / d).resolve()
            if not p.exists():
                print(f"[ERR] Scan dir not found: {p}")
                return 2
            scan_dirs.append(str(p))
            for f in iter_files(p):
                try:
                    used_keys |= extract_keys_from_text(f.read_text(encoding="utf-8"))
                except UnicodeDecodeError:
                    used_keys |= extract_keys_from_text(f.read_text(encoding="utf-8", errors="replace"))

    missing_used_en: List[str] = []
    missing_used_ar: List[str] = []
    for k in sorted(used_keys):
        ok_en, _ = get_in(en_obj, k)
        ok_ar, _ = get_in(ar_obj, k)
        if not ok_en:
            missing_used_en.append(k)
        if not ok_ar:
            missing_used_ar.append(k)

    report_path = Path(args.report).resolve()
    payload = {
        "paths": {"en": str(EN_PATH), "ar": str(AR_PATH)},
        "summary": {
            "en_paths": len(en_keys),
            "ar_paths": len(ar_keys),
            "missing_in_en": len(missing_in_en),
            "missing_in_ar": len(missing_in_ar),
            "type_mismatches": len(type_mismatches),
            "placeholder_mismatches": len(placeholder_mismatches),
            "suspicious_latin_in_ar": len(suspicious_ar),
            "suspicious_arabic_in_en": len(suspicious_en),
            "scan_dirs": len(scan_dirs),
            "used_keys": len(used_keys),
            "missing_used_en": len(missing_used_en),
            "missing_used_ar": len(missing_used_ar),
        },
        "scan_dirs": scan_dirs,
        "missing_in_en": missing_in_en,
        "missing_in_ar": missing_in_ar,
        "type_mismatches": type_mismatches,
        "placeholder_mismatches": placeholder_mismatches,
        "suspicious_latin_in_ar": suspicious_ar,
        "suspicious_arabic_in_en": suspicious_en,
        "missing_used_en": missing_used_en,
        "missing_used_ar": missing_used_ar,
    }
    report_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    def print_list(title: str, items: Sequence[Any], limit: int = 200) -> None:
        print(title)
        to_print = items if args.full else items[:limit]
        for it in to_print:
            if isinstance(it, str):
                print("  -", it)
            else:
                # dict-ish
                k = it.get("key", "?") if isinstance(it, dict) else str(it)
                print("  -", k)
        if (not args.full) and len(items) > limit:
            print(f"  ... {len(items) - limit} more")
        print("")

    print("=== i18n audit ===")
    for k, v in payload["summary"].items():
        print(f"{k}: {v}")
    print("")

    print_list("Missing paths in EN:", missing_in_en)
    print_list("Missing paths in AR:", missing_in_ar)
    print_list("Type mismatches:", type_mismatches)
    print_list("Placeholder mismatches:", placeholder_mismatches)
    print_list("Suspicious (Latin in AR):", suspicious_ar)
    print_list("Suspicious (Arabic in EN):", suspicious_en)

    print(f"[OK] Wrote report: {report_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

