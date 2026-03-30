/**
 * Maps ISO currency codes (e.g. USD, EGP) to localized labels via i18n `common.currency.*`.
 * Unknown codes fall back to the raw code.
 */
export function formatCurrencyLabel(
  code: string | undefined | null,
  t: (key: string, options?: { defaultValue?: string }) => string
): string {
  const c = (code || "USD").trim();
  if (!c) return t("common.currency.usd");
  const key = `common.currency.${c.toLowerCase()}`;
  return t(key, { defaultValue: c });
}
