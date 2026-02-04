import type { User } from "../services/api";

export function isMembershipActive(user: User | null | undefined): boolean {
  const status = String(user?.membership?.status || "").toUpperCase();
  if (status !== "ACTIVE") return false;

  const expiry = user?.membership?.expiry_date;
  if (!expiry) return true;

  const d = new Date(expiry);
  if (isNaN(d.getTime())) return true; // If backend sent bad date, don't lock user out.

  return d.getTime() > Date.now();
}

export function isMembershipRequiredError(err: any): boolean {
  const code = String(err?.code || "").toUpperCase();
  if (code === "MEMBERSHIP_REQUIRED") return true;

  const detail = err?.response?.data?.detail;
  if (String(detail) === "MEMBERSHIP_REQUIRED") return true;

  return String(err?.message || "") === "MEMBERSHIP_REQUIRED";
}

