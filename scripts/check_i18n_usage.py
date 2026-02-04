import argparse
import json
import re
from pathlib import Path
from typing import Any, Dict, Iterable, List, Set, Tuple


ROOT = Path(__file__).resolve().parents[1]  # frontend/
EN_PATH = ROOT / "src" / "i18n" / "translations" / "en.json"
AR_PATH = ROOT / "src" / "i18n" / "translations" / "ar.json"


T_CALL_RE = re.compile(r"""\bt\(\s*(?P<q>["'])(?P<key>[^"']+?)(?P=q)\s*(?:,|\))""")
T_CALL_TEMPLATE_RE = re.compile(r"""\bt\(\s*`(?P<key>[^`]+?)`\s*(?:,|\))""")
I18N_T_CALL_RE = re.compile(r"""\bi18n\.t\(\s*(?P<q>["'])(?P<key>[^"']+?)(?P=q)\s*(?:,|\))""")


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
    # Ignore dynamic keys (basic heuristic)
    keys = {k for k in keys if "${" not in k and "+" not in k}
    return {k.strip() for k in keys if k.strip()}


def load_json(path: Path) -> Dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def get_in(obj: Dict[str, Any], dotted_key: str) -> Tuple[bool, Any]:
    cur: Any = obj
    for part in dotted_key.split("."):
        if not isinstance(cur, dict) or part not in cur:
            return False, None
        cur = cur[part]
    return True, cur


def main() -> int:
    parser = argparse.ArgumentParser(description="Check missing i18n keys used in specified directories.")
    parser.add_argument(
        "--dir",
        action="append",
        default=[],
        help="Directory to scan (relative to frontend/ or absolute). Can be provided multiple times.",
    )
    parser.add_argument(
        "--report",
        default=str(ROOT / "i18n_usage_report.json"),
        help="Write JSON report to this path (default: frontend/i18n_usage_report.json).",
    )
    parser.add_argument("--full", action="store_true", help="Print full missing lists (default prints up to 200).")
    args = parser.parse_args()

    scan_dirs: List[Path] = []
    for d in args.dir:
        p = Path(d)
        if not p.is_absolute():
            p = (ROOT / d).resolve()
        if not p.exists():
            print(f"[ERR] Scan dir not found: {p}")
            return 2
        scan_dirs.append(p)

    if not scan_dirs:
        print("[ERR] No --dir provided")
        return 2

    en = load_json(EN_PATH)
    ar = load_json(AR_PATH)

    files: List[str] = []
    used_keys: Set[str] = set()

    for base in scan_dirs:
        for f in iter_files(base):
            files.append(str(f))
            try:
                used_keys |= extract_keys_from_text(f.read_text(encoding="utf-8"))
            except UnicodeDecodeError:
                used_keys |= extract_keys_from_text(f.read_text(encoding="utf-8", errors="replace"))

    missing_en: List[str] = []
    missing_ar: List[str] = []
    for k in sorted(used_keys):
        ok_en, _ = get_in(en, k)
        ok_ar, _ = get_in(ar, k)
        if not ok_en:
            missing_en.append(k)
        if not ok_ar:
            missing_ar.append(k)

    report_path = Path(args.report).resolve()
    payload = {
        "scan_dirs": [str(p) for p in scan_dirs],
        "files_scanned": len(files),
        "unique_keys_referenced": len(used_keys),
        "missing_en_count": len(missing_en),
        "missing_ar_count": len(missing_ar),
        "missing_en": missing_en,
        "missing_ar": missing_ar,
    }

    report_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print("=== i18n usage check ===")
    print(f"Scan dirs: {len(scan_dirs)}")
    print(f"Files scanned: {len(files)}")
    print(f"Unique keys referenced: {len(used_keys)}")
    print("")
    print(f"Missing in EN: {len(missing_en)}")
    en_to_print = missing_en if args.full else missing_en[:200]
    for k in en_to_print:
        print("  -", k)
    if (not args.full) and len(missing_en) > 200:
        print(f"  ... {len(missing_en) - 200} more")
    print("")
    print(f"Missing in AR: {len(missing_ar)}")
    ar_to_print = missing_ar if args.full else missing_ar[:200]
    for k in ar_to_print:
        print("  -", k)
    if (not args.full) and len(missing_ar) > 200:
        print(f"  ... {len(missing_ar) - 200} more")
    print("")
    print(f"[OK] Wrote report: {report_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

