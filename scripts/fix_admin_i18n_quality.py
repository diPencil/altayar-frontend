import argparse
import json
import re
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
    keys = {k for k in keys if "${" not in k and "+" not in k}
    return {k.strip() for k in keys if k.strip()}


def load_json(path: Path) -> Dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, obj: Dict[str, Any]) -> None:
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def get_in(obj: Dict[str, Any], dotted_key: str) -> Tuple[bool, Any]:
    cur: Any = obj
    for part in dotted_key.split("."):
        if not isinstance(cur, dict) or part not in cur:
            return False, None
        cur = cur[part]
    return True, cur


def set_in(obj: Dict[str, Any], dotted_key: str, value: str) -> bool:
    parts = dotted_key.split(".")
    cur: Any = obj
    for p in parts[:-1]:
        if p not in cur or not isinstance(cur[p], dict):
            cur[p] = {}
        cur = cur[p]
    leaf = parts[-1]
    before = cur.get(leaf)
    if before == value:
        return False
    cur[leaf] = value
    return True


AR_LETTER_RE = re.compile(r"[\u0600-\u06FF]")
ASCII_LETTER_RE = re.compile(r"[A-Za-z]")


def looks_english_only(s: str) -> bool:
    if not s:
        return False
    return bool(ASCII_LETTER_RE.search(s)) and not bool(AR_LETTER_RE.search(s))


PLACEHOLDER_RE = re.compile(
    r"\b("
    r"title|subtitle|desc|description placeholder|title placeholder|status label|type label|created label|creator label|"
    r"error load|error delete|error|success|failed|confirm|confirm msg|confirm title|"
    r"summary part|mem id|plan desc|deposit description|withdraw description"
    r")\b",
    re.IGNORECASE,
)


def looks_placeholder(s: str) -> bool:
    if not s:
        return True
    if s in {"Title", "Subtitle"}:
        return True
    if s.endswith(" Msg") or s.endswith(" Title") or s.endswith(" Desc"):
        return True
    return bool(PLACEHOLDER_RE.search(s))


def looks_placeholder_en(s: str) -> bool:
    """
    Strict EN placeholder detection.
    We only want to replace obviously-bad placeholders like "Title", "Subtitle",
    "Delete Confirm Title", "Summary Part1", etc. We do NOT want to rewrite
    legitimate sentences like "Failed to load users".
    """
    if not s:
        return True
    if s in {"Title", "Subtitle"}:
        return True
    if s.endswith((" Msg", " Title", " Desc", " Placeholder")):
        return True
    if re.fullmatch(r"Summary Part[0-9]+", s):
        return True
    # e.g. "Error Load", "Error Delete"
    if s.startswith("Error ") and s.count(" ") <= 2 and "(" not in s:
        return True
    return False


def fmt_safe(s: str) -> str:
    # Safe for Windows consoles that can't print Arabic.
    return json.dumps(s, ensure_ascii=True)


def split_words(s: str) -> List[str]:
    s = s.replace("_", " ").replace("-", " ")
    s = re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", s)
    s = re.sub(r"\s+", " ", s).strip()
    return [w for w in s.split(" ") if w]


def title_case_english(words: List[str]) -> str:
    out: List[str] = []
    for w in words:
        up = w.upper()
        if up in {"ID", "USD", "SAR", "EGP", "EUR", "VIP", "PTS"}:
            out.append(up)
        elif w.lower() in {"and", "or", "to", "of", "in", "on", "for", "with"} and out:
            out.append(w.lower())
        else:
            out.append(w[:1].upper() + w[1:])
    return " ".join(out).strip()


def english_suggestion(key: str) -> str:
    # Special, high-signal fixes.
    if key == "admin.manageReports.title":
        return "Reports"
    if key == "admin.manageReports.subtitle":
        return "Quick system performance overview"
    if key == "admin.manageReports.summaryPart1":
        return "This month we onboarded"
    if key == "admin.manageReports.summaryPart2":
        return "users, generating"
    if key == "admin.manageReports.summaryPart3":
        return "USD in revenue."
    if key == "admin.tierPosts.deleteConfirmTitle":
        return "Delete confirmation"
    if key == "admin.tierPosts.deletePostConfirmMsg":
        return "Are you sure you want to delete this post?"
    if key == "admin.tierPosts.deleteCommentConfirmMsg":
        return "Are you sure you want to delete this comment?"
    if key == "admin.tierPosts.approveSuccess":
        return "Approved successfully"
    if key == "admin.tierPosts.rejectSuccess":
        return "Rejected successfully"
    if key == "admin.tierPosts.deleteSuccess":
        return "Deleted successfully"

    parts = key.split(".")
    leaf = parts[-1]

    # Generic common leaves
    COMMON = {
        "title": "Title",
        "subtitle": "Subtitle",
        "empty": "No data found",
        "noResults": "No results",
        "searchPlaceholder": "Search...",
        "confirmTitle": "Confirm",
        "deleteConfirmTitle": "Delete confirmation",
        "deleteConfirmMsg": "Are you sure you want to delete this item?",
        "deleteSuccess": "Deleted successfully",
        "deleteFailed": "Failed to delete",
    }
    if leaf in COMMON:
        return COMMON[leaf]

    words = split_words(leaf)
    if not words:
        return leaf
    return title_case_english([w.lower() for w in words])


def arabic_suggestion(key: str, en_fallback: str) -> str:
    # Special, high-signal fixes.
    if key == "admin.manageReports.title":
        return "التقارير"
    if key == "admin.manageReports.subtitle":
        return "نظرة سريعة على أداء النظام"
    if key == "admin.manageReports.summaryPart1":
        return "تم تسجيل"
    if key == "admin.manageReports.summaryPart2":
        return "مستخدم هذا الشهر، بإيرادات قدرها"
    if key == "admin.manageReports.summaryPart3":
        return "دولار."

    parts = key.split(".")
    leaf = parts[-1]

    # High-frequency exact leaf translations
    LEAF = {
        "title": "العنوان",
        "subtitle": "الوصف",
        "empty": "لا توجد بيانات",
        "noResults": "لا توجد نتائج",
        "searchPlaceholder": "ابحث...",
        "selectUser": "اختر مستخدم",
        "selectCustomer": "اختر عميل",
        "customer": "العميل",
        "customerInfo": "معلومات العميل",
        "createdBy": "تم الإنشاء بواسطة",
        "date": "التاريخ",
        "status": "الحالة",
        "amount": "المبلغ",
        "amountPlaceholder": "أدخل المبلغ",
        "reason": "السبب",
        "reasonPlaceholder": "أدخل السبب",
        "description": "الوصف",
        "descriptionPlaceholder": "أدخل الوصف",
        "confirmTitle": "تأكيد",
        "confirmAdd": "تأكيد الإضافة",
        "confirmRemove": "تأكيد الخصم",
        "add": "إضافة",
        "remove": "خصم",
        "deposit": "إيداع",
        "withdraw": "سحب",
        "history": "السجل",
        "admin": "الإدارة",
        "system": "النظام",
        "success": "نجاح",
        "error": "خطأ",
        "notFound": "غير موجود",
        "save": "حفظ",
        "cancel": "إلغاء",
        "delete": "حذف",
        "edit": "تعديل",
        "create": "إنشاء",
        "updateSuccess": "تم التحديث بنجاح",
        "createSuccess": "تم الإنشاء بنجاح",
        "deleteSuccess": "تم الحذف بنجاح",
        "deleteFailed": "فشل الحذف",
    }
    if leaf in LEAF:
        return LEAF[leaf]

    # Pattern rules
    words = [w.lower() for w in split_words(leaf)]
    if not words:
        return en_fallback

    # Heuristics for common composed phrases
    if "description" in words:
        rest = [w for w in words if w not in {"description", "ar", "en"}]
        if rest:
            if rest == ["deposit"]:
                return "وصف الإيداع"
            if rest == ["withdraw"]:
                return "وصف السحب"
        return "الوصف"
    if "placeholder" in words:
        rest = [w for w in words if w not in {"placeholder", "ar", "en"}]
        if rest == ["amount"]:
            return "أدخل المبلغ"
        if rest == ["reason"]:
            return "أدخل السبب"
        if rest == ["points", "reason"]:
            return "أدخل سبب النقاط"
        if rest == ["points", "amount"]:
            return "أدخل عدد النقاط"
        if rest:
            return "أدخل " + " ".join(rest)
        return "أدخل القيمة"
    if words == ["member", "id"] or words == ["mem", "id"]:
        return "رقم العضوية"
    if words == ["plan", "start", "date"]:
        return "تاريخ بداية الخطة"
    if words == ["payment", "method"]:
        return "طريقة الدفع"
    if words == ["payment", "status"]:
        return "حالة الدفع"
    if words == ["total", "users"]:
        return "إجمالي المستخدمين"
    if words == ["total", "bookings"]:
        return "إجمالي الحجوزات"
    if words == ["total", "revenue"]:
        return "إجمالي الإيرادات"

    # Fallback (better than showing key)
    return en_fallback


def main() -> int:
    parser = argparse.ArgumentParser(description="Fix placeholder/English values for Admin-used i18n keys.")
    parser.add_argument("--dry-run", action="store_true", help="Do not write files, only report changes.")
    parser.add_argument("--fix-en", action="store_true", help="Also fix obvious placeholder values in English.")
    parser.add_argument("--no-fix-ar", action="store_true", help="Skip Arabic fixes (not recommended).")
    parser.add_argument("--max-print", type=int, default=80, help="Max examples to print per language.")
    args = parser.parse_args()

    if not ADMIN_DIR.exists():
        print(f"[ERR] Admin directory not found: {ADMIN_DIR}")
        return 2

    en = load_json(EN_PATH)
    ar = load_json(AR_PATH)

    used_keys: Set[str] = set()
    for f in iter_files(ADMIN_DIR):
        try:
            used_keys |= extract_keys_from_text(f.read_text(encoding="utf-8"))
        except UnicodeDecodeError:
            used_keys |= extract_keys_from_text(f.read_text(encoding="utf-8", errors="replace"))

    used_keys = {k for k in used_keys if k.strip()}

    en_changes: List[Tuple[str, str, str]] = []
    ar_changes: List[Tuple[str, str, str]] = []

    for k in sorted(used_keys):
        ok_en, en_val = get_in(en, k)
        ok_ar, ar_val = get_in(ar, k)
        if not ok_en or not ok_ar:
            # Missing keys are handled elsewhere; skip.
            continue
        if not isinstance(en_val, str) or not isinstance(ar_val, str):
            continue

        # EN: fix placeholders (opt-in)
        if args.fix_en and looks_placeholder_en(en_val):
            suggestion = english_suggestion(k)
            if suggestion and suggestion != en_val:
                en_changes.append((k, en_val, suggestion))
                set_in(en, k, suggestion)

        # AR: fix English-only or placeholders
        ok_en2, en_val2 = get_in(en, k)
        en_fallback = en_val2 if (ok_en2 and isinstance(en_val2, str)) else en_val

        if not args.no_fix_ar and (looks_english_only(ar_val) or looks_placeholder(ar_val)):
            suggestion_ar = arabic_suggestion(k, en_fallback)
            if suggestion_ar and suggestion_ar != ar_val:
                ar_changes.append((k, ar_val, suggestion_ar))
                set_in(ar, k, suggestion_ar)

    print("=== Admin i18n quality fixer ===")
    print(f"Admin files scanned: {len(list(iter_files(ADMIN_DIR)))}")
    print(f"Unique keys referenced: {len(used_keys)}")
    print(f"EN updated (placeholder fixes): {len(en_changes)}" + ("" if args.fix_en else " (skipped; pass --fix-en)"))
    print(f"AR updated (english/placeholder fixes): {len(ar_changes)}" + ("" if not args.no_fix_ar else " (skipped)"))

    if en_changes:
        print("\nExamples (EN):")
        for k, before, after in en_changes[: args.max_print]:
            print(f"  - {k}: {fmt_safe(before)} -> {fmt_safe(after)}")
        if len(en_changes) > args.max_print:
            print(f"  ... {len(en_changes) - args.max_print} more")

    if ar_changes:
        print("\nExamples (AR):")
        for k, before, after in ar_changes[: args.max_print]:
            print(f"  - {k}: {fmt_safe(before)} -> {fmt_safe(after)}")
        if len(ar_changes) > args.max_print:
            print(f"  ... {len(ar_changes) - args.max_print} more")

    if args.dry_run:
        print("\n[DRY RUN] No files written.")
        return 0

    write_json(EN_PATH, en)
    write_json(AR_PATH, ar)
    print("\n[OK] Updated translation files:")
    print(" -", EN_PATH)
    print(" -", AR_PATH)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

