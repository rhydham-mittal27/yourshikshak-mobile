import { LeadAnnouncement } from "../../api/client";

export const fmtRupee = (n: number) =>
  n >= 100000
    ? `₹${(n / 100000).toFixed(1)}L`
    : n >= 1000
      ? `₹${(n / 1000).toFixed(1)}K`
      : `₹${Math.round(n)}`;

export const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "Just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export const subjectLabel = (lead: LeadAnnouncement["classLead"]): string => {
  const sub = lead?.subject;
  if (!sub || sub.length === 0) return "—";
  return sub
    .map((s) => s.label ?? s.value ?? "")
    .filter(Boolean)
    .join(", ");
};
