import { T } from "../../constants/colors";

export type Tab = "overview" | "profile" | "documents";

export type SubjectGroup = {
  board: string;
  grades: { grade: string; subjects: string[] }[];
};

// â”€â”€â”€ Chip palette â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const CHIP_PALETTE = [
  "#2D68C4",
  "#7C3AED",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
  "#0EA5E9",
  "#F97316",
  "#6366F1",
  "#14B8A6",
];

// â”€â”€â”€ Document card meta â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const DOC_META: Record<
  string,
  { label: string; icon: any; color: string; grad: [string, string] }
> = {
  AADHAAR: {
    label: "Aadhaar Card",
    icon: "scan-outline",
    color: "#8B5CF6",
    grad: ["#8B5CF620", "#6D28D910"],
  },
  CERTIFICATE: {
    label: "Certificate",
    icon: "ribbon-outline",
    color: "#10B981",
    grad: ["#10B98120", "#059F6710"],
  },
  EXPERIENCE_PROOF: {
    label: "Experience Proof",
    icon: "briefcase-outline",
    color: "#F59E0B",
    grad: ["#F59E0B22", "#D9770610"],
  },
  DEGREE: {
    label: "Degree",
    icon: "school-outline",
    color: "#EF4444",
    grad: ["#EF444420", "#DC262610"],
  },
  OTHER: {
    label: "Document",
    icon: "document-outline",
    color: "#64748B",
    grad: ["#64748B18", "#47556910"],
  },
};

// â”€â”€â”€ Tier helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const TIER_META: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  GOLD: { label: "Gold", color: "#F59E0B", icon: "star" },
  SILVER: { label: "Silver", color: "#94A3B8", icon: "star-half" },
  BRONZE: { label: "Bronze", color: "#B45309", icon: "star-outline" },
};

export const getTierKey = (tier?: string) => {
  if (!tier) return null;
  if (tier.includes("GOLD")) return "GOLD";
  if (tier.includes("SILVER")) return "SILVER";
  if (tier.includes("BRONZE")) return "BRONZE";
  return null;
};

// â”€â”€â”€ Teaching mode â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const modeColor: Record<string, string> = {
  ONLINE: T.primary,
  OFFLINE: T.secondary,
  HYBRID: "#7C3AED",
};

export const modeIcon: Record<string, any> = {
  ONLINE: "videocam-outline",
  OFFLINE: "home-outline",
  HYBRID: "git-merge-outline",
};

// â”€â”€â”€ Verification constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const V_STEPS = ["Documents", "Payment", "Declaration", "Review", "Submit"];

export const VDOC_TYPES = [
  {
    type: "PROFILE_PHOTO",
    label: "Profile Photo",
    icon: "person-outline" as any,
    color: "#2D68C4",
    required: true,
  },
  {
    type: "AADHAAR",
    label: "Aadhaar Card",
    icon: "scan-outline" as any,
    color: "#7C3AED",
    required: true,
  },
  {
    type: "CERTIFICATE",
    label: "Certificate",
    icon: "ribbon-outline" as any,
    color: "#10B981",
    required: true,
  },
  {
    type: "EXPERIENCE_PROOF",
    label: "Exp. Proof",
    icon: "briefcase-outline" as any,
    color: "#F59E0B",
    required: false,
  },
];

export const DECLARATIONS = [
  "I agree to the Terms & Conditions and Policies of the platform",
  "All uploaded documents are genuine, authentic, and not fake",
  "I understand false or misleading information may lead to rejection or permanent disqualification",
];

