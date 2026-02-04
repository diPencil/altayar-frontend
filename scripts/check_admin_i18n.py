import json
import re
import argparse
from pathlib import Path
from typing import Any, Dict, Iterable, List, Set, Tuple


ROOT = Path(__file__).resolve().parents[1]  # frontend/
ADMIN_DIR = ROOT / "app" / "(admin)"
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
    # Ignore dynamic keys (very basic heuristic)
    keys = {k for k in keys if "${" not in k and "+" not in k}
    return keys


def load_json(path: Path) -> Dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def get_in(obj: Dict[str, Any], dotted_key: str) -> Tuple[bool, Any]:
    cur: Any = obj
    for part in dotted_key.split("."):
        if not isinstance(cur, dict) or part not in cur:
            return False, None
        cur = cur[part]
    return True, cur


def flatten_keys(obj: Any, prefix: str = "") -> List[str]:
    out: List[str] = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            p = f"{prefix}.{k}" if prefix else k
            out.extend(flatten_keys(v, p))
    else:
        out.append(prefix)
    return out


def main() -> int:
    if not ADMIN_DIR.exists():
        print(f"[ERR] Admin directory not found: {ADMIN_DIR}")
        return 2

    parser = argparse.ArgumentParser(description="Check missing i18n keys used by Admin screens.")
    parser.add_argument(
        "--full",
        action="store_true",
        help="Print full key lists (not truncated to 200).",
    )
    parser.add_argument(
        "--report",
        default=str(ROOT / "admin_i18n_report.json"),
        help="Write a JSON report to this path (default: frontend/admin_i18n_report.json).",
    )
    args = parser.parse_args()

    en = load_json(EN_PATH)
    ar = load_json(AR_PATH)

    admin_files = list(iter_files(ADMIN_DIR))
    used_keys: Set[str] = set()
    for f in admin_files:
        try:
            used_keys |= extract_keys_from_text(f.read_text(encoding="utf-8"))
        except UnicodeDecodeError:
            used_keys |= extract_keys_from_text(f.read_text(encoding="utf-8", errors="replace"))

    used_keys = {k for k in used_keys if k.strip()}

    missing_en: List[str] = []
    missing_ar: List[str] = []

    for k in sorted(used_keys):
        ok_en, _ = get_in(en, k)
        ok_ar, _ = get_in(ar, k)
        if not ok_en:
            missing_en.append(k)
        if not ok_ar:
            missing_ar.append(k)

    # Write full report to disk (always complete lists).
    report_path = Path(args.report).resolve()
    report_payload = {
        "admin_files_scanned": len(admin_files),
        "unique_keys_referenced": len(used_keys),
        "missing_en_count": len(missing_en),
        "missing_ar_count": len(missing_ar),
        "missing_en": missing_en,
        "missing_ar": missing_ar,
    }

    print("=== Admin i18n check ===")
    print(f"Admin files scanned: {len(admin_files)}")
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

    # Also report structural differences under admin.*
    en_admin = en.get("admin", {})
    ar_admin = ar.get("admin", {})
    en_admin_keys = set(flatten_keys(en_admin, "admin"))
    ar_admin_keys = set(flatten_keys(ar_admin, "admin"))
    only_en = sorted(en_admin_keys - ar_admin_keys)
    only_ar = sorted(ar_admin_keys - en_admin_keys)

    print("=== Admin subtree diff (admin.*) ===")
    print(f"Keys only in EN admin subtree: {len(only_en)}")
    only_en_to_print = only_en if args.full else only_en[:200]
    for k in only_en_to_print:
        print("  -", k)
    if (not args.full) and len(only_en) > 200:
        print(f"  ... {len(only_en) - 200} more")
    print("")
    print(f"Keys only in AR admin subtree: {len(only_ar)}")
    only_ar_to_print = only_ar if args.full else only_ar[:200]
    for k in only_ar_to_print:
        print("  -", k)
    if (not args.full) and len(only_ar) > 200:
        print(f"  ... {len(only_ar) - 200} more")

    report_payload.update(
        {
            "only_en_admin_subtree_count": len(only_en),
            "only_ar_admin_subtree_count": len(only_ar),
            "only_en_admin_subtree": only_en,
            "only_ar_admin_subtree": only_ar,
        }
    )
    try:
        report_path.write_text(json.dumps(report_payload, ensure_ascii=False, indent=2), encoding="utf-8")
        print("")
        print(f"[OK] Wrote full report: {report_path}")
    except Exception as e:
        print("")
        print(f"[WARN] Failed to write report to {report_path}: {e}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

