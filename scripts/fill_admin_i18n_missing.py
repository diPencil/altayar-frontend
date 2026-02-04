import argparse
import json
import re
from pathlib import Path
from typing import Any, Dict, List, Tuple


ROOT = Path(__file__).resolve().parents[1]  # frontend/
REPORT_PATH = ROOT / "admin_i18n_report.json"
EN_PATH = ROOT / "src" / "i18n" / "translations" / "en.json"
AR_PATH = ROOT / "src" / "i18n" / "translations" / "ar.json"


def load_json(path: Path) -> Dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, obj: Dict[str, Any]) -> None:
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def split_words(s: str) -> List[str]:
    s = s.replace("_", " ").replace("-", " ")
    # split camelCase/PascalCase
    s = re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", s)
    s = re.sub(r"\s+", " ", s).strip()
    return [w for w in s.split(" ") if w]


def title_case_english(words: List[str]) -> str:
    out: List[str] = []
    for w in words:
        up = w.upper()
        if up in {"ID", "USD", "SAR", "EGP", "EUR", "VIP"}:
            out.append(up)
        elif w.lower() in {"and", "or", "to", "of", "in", "on", "for", "with"} and out:
            out.append(w.lower())
        else:
            out.append(w[:1].upper() + w[1:])
    return " ".join(out).strip()


SECTION_EN = {
    "manageUsers": "Manage Users",
    "managePoints": "Manage Points",
    "manageCashback": "Manage Club Gifts",
    "manageWallets": "Manage Wallets",
    "manageOrders": "Manage Orders",
    "manageInvoices": "Manage Invoices",
    "manageReels": "Manage Reels",
    "bookings": "Bookings",
}

SECTION_AR = {
    "manageUsers": "إدارة المستخدمين",
    "managePoints": "إدارة النقاط",
    "manageCashback": "إدارة هدايا النادي",
    "manageWallets": "إدارة المحافظ",
    "manageOrders": "إدارة الطلبات",
    "manageInvoices": "إدارة الفواتير",
    "manageReels": "إدارة الريلز",
    "bookings": "الحجوزات",
}


def english_value(key: str) -> str:
    parts = key.split(".")
    leaf = parts[-1]

    if key == "admin.common.loading":
        return "Loading..."
    if key == "admin.common.noResults":
        return "No results"

    # Titles/subtitles: prefer section label where applicable
    if len(parts) >= 3 and parts[0] == "admin" and parts[1] in SECTION_EN:
        section_label = SECTION_EN[parts[1]]
        if leaf == "title":
            return section_label
        if leaf == "subtitle":
            if parts[1] == "manageUsers":
                return "Search and manage users"
            if parts[1] == "managePoints":
                return "Add or remove loyalty points"
            if parts[1] == "manageCashback":
                return "Add or deduct club gifts"
            if parts[1] == "manageWallets":
                return "Deposit or withdraw from wallets"
            if parts[1] == "manageOrders":
                return "View and manage orders"
            if parts[1] == "manageInvoices":
                return "Create and manage invoices"
            if parts[1] == "manageReels":
                return "Create and manage reels"
            if parts[1] == "bookings":
                return "Create and manage bookings"

    SPECIAL = {
        "noResults": "No results",
        "empty": "No data found",
        "searchPlaceholder": "Search...",
        "selectUser": "Select user",
        "selectCustomer": "Select customer",
        "customerInfo": "Customer information",
        "createdBy": "Created by",
        "memberId": "Member ID",
        "paymentStatus": "Payment status",
        "paymentMethod": "Payment method",
        "transactionId": "Transaction ID",
        "orderId": "Order ID",
        "pointsAction": "Points action",
        "cashbackAction": "Club gifts action",
        "actionType": "Action type",
        "amountPlaceholder": "Enter amount",
        "reasonPlaceholder": "Enter reason",
        "confirmTitle": "Confirm",
        "confirmAdd": "Confirm add",
        "confirmRemove": "Confirm remove",
        "successAdd": "Added successfully",
        "successRemove": "Removed successfully",
        "errorInvalidAmount": "Invalid amount",
        "errorInsufficientFunds": "Insufficient balance",
        "errorInsufficientBalance": "Insufficient balance",
        "errorSelectUser": "Please select a user",
        "errorSelectCustomer": "Please select a customer",
        "errorLoadUsers": "Failed to load users",
        "errorInvalidPoints": "Invalid points",
        "errorInsufficientPoints": "Insufficient points",
    }
    if leaf in SPECIAL:
        return SPECIAL[leaf]

    # Generic: humanize leaf
    words = split_words(leaf)
    if not words:
        return leaf
    return title_case_english([w.lower() for w in words])


def arabic_value(key: str, en_fallback: str) -> str:
    parts = key.split(".")
    leaf = parts[-1]

    if key == "admin.common.loading":
        return "جاري التحميل..."
    if key == "admin.common.noResults":
        return "لا توجد نتائج"

    if len(parts) >= 3 and parts[0] == "admin" and parts[1] in SECTION_AR:
        section_label = SECTION_AR[parts[1]]
        if leaf == "title":
            return section_label
        if leaf == "subtitle":
            if parts[1] == "manageUsers":
                return "بحث وإدارة المستخدمين"
            if parts[1] == "managePoints":
                return "إضافة أو خصم نقاط الولاء"
            if parts[1] == "manageCashback":
                return "إضافة أو خصم هدايا النادي"
            if parts[1] == "manageWallets":
                return "إيداع أو سحب من المحافظ"
            if parts[1] == "manageOrders":
                return "عرض وإدارة الطلبات"
            if parts[1] == "manageInvoices":
                return "إنشاء وإدارة الفواتير"
            if parts[1] == "manageReels":
                return "إنشاء وإدارة الريلز"
            if parts[1] == "bookings":
                return "إنشاء وإدارة الحجوزات"

    SPECIAL = {
        "noResults": "لا توجد نتائج",
        "empty": "لا توجد بيانات",
        "searchPlaceholder": "ابحث...",
        "selectUser": "اختر مستخدم",
        "selectCustomer": "اختر عميل",
        "customerInfo": "معلومات العميل",
        "createdBy": "تم الإنشاء بواسطة",
        "memberId": "رقم العضوية",
        "paymentStatus": "حالة الدفع",
        "paymentMethod": "طريقة الدفع",
        "transactionId": "رقم المعاملة",
        "orderId": "رقم الطلب",
        "pointsAction": "إجراء النقاط",
        "cashbackAction": "إجراء هدايا النادي",
        "actionType": "نوع الإجراء",
        "amount": "المبلغ",
        "amountPlaceholder": "أدخل المبلغ",
        "reason": "السبب",
        "reasonPlaceholder": "أدخل السبب",
        "confirmTitle": "تأكيد",
        "confirmAdd": "تأكيد الإضافة",
        "confirmRemove": "تأكيد الخصم",
        "successAdd": "تمت الإضافة بنجاح",
        "successRemove": "تم الخصم بنجاح",
        "errorInvalidAmount": "المبلغ غير صالح",
        "errorInsufficientFunds": "الرصيد غير كافٍ",
        "errorInsufficientBalance": "الرصيد غير كافٍ",
        "errorSelectUser": "يرجى اختيار مستخدم",
        "errorSelectCustomer": "يرجى اختيار عميل",
        "errorLoadUsers": "فشل في تحميل المستخدمين",
        "errorInvalidPoints": "النقاط غير صالحة",
        "errorInsufficientPoints": "النقاط غير كافية",
        "date": "التاريخ",
        "total": "الإجمالي",
        "subtotal": "الإجمالي الفرعي",
        "tax": "الضريبة",
        "discount": "الخصم",
        "items": "العناصر",
        "email": "البريد الإلكتروني",
        "name": "الاسم",
        "phone": "رقم الهاتف",
    }
    if leaf in SPECIAL:
        return SPECIAL[leaf]

    # Fallback: use English fallback (better than showing raw key)
    return en_fallback


def get_in(obj: Dict[str, Any], dotted_key: str) -> Tuple[bool, Any]:
    cur: Any = obj
    for part in dotted_key.split("."):
        if not isinstance(cur, dict) or part not in cur:
            return False, None
        cur = cur[part]
    return True, cur


def set_if_missing(obj: Dict[str, Any], dotted_key: str, value: str) -> bool:
    parts = dotted_key.split(".")
    cur: Any = obj
    for p in parts[:-1]:
        if p not in cur or not isinstance(cur[p], dict):
            cur[p] = {}
        cur = cur[p]
    leaf = parts[-1]
    if leaf in cur:
        return False
    cur[leaf] = value
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description="Fill missing Admin i18n keys (EN/AR) from admin_i18n_report.json.")
    parser.add_argument("--report", default=str(REPORT_PATH), help="Path to admin_i18n_report.json")
    parser.add_argument("--dry-run", action="store_true", help="Do not write any files")
    args = parser.parse_args()

    report = load_json(Path(args.report))
    missing_en: List[str] = report.get("missing_en", [])
    missing_ar: List[str] = report.get("missing_ar", [])

    en = load_json(EN_PATH)
    ar = load_json(AR_PATH)

    added_en = 0
    added_ar = 0

    # Fill EN first (so AR can fallback to EN values where needed)
    for k in missing_en:
        if set_if_missing(en, k, english_value(k)):
            added_en += 1

    for k in missing_ar:
        ok_en, en_val = get_in(en, k)
        en_fallback = en_val if (ok_en and isinstance(en_val, str)) else english_value(k)
        if set_if_missing(ar, k, arabic_value(k, en_fallback)):
            added_ar += 1

    print(f"Missing in EN (report): {len(missing_en)} | Added to EN: {added_en}")
    print(f"Missing in AR (report): {len(missing_ar)} | Added to AR: {added_ar}")

    if args.dry_run:
        print("[DRY RUN] No files written.")
        return 0

    write_json(EN_PATH, en)
    write_json(AR_PATH, ar)
    print(f"[OK] Updated: {EN_PATH}")
    print(f"[OK] Updated: {AR_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

