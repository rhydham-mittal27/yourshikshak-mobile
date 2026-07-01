import { StyleSheet, Dimensions } from "react-native";
import { T } from "../../constants/colors";

export const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.background },

  hero: {
    paddingHorizontal: 20,
    paddingBottom: 52,
    overflow: "hidden",
  },
  orbA: { position: "absolute", width: 0, height: 0 },
  orbB: { position: "absolute", width: 0, height: 0 },
  orbC: { position: "absolute", width: 0, height: 0 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  editBtnTxt: { color: "#fff", fontSize: 12, fontWeight: "700" },
  topActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  shareBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },

  // horizontal identity row
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 14,
  },
  avatarWrap: { position: "relative" },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: "rgba(45,104,196,0.55)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2.5,
    borderColor: "rgba(255,255,255,0.25)",
  },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "rgba(255,255,255,0.2)",
  },
  avatarInitial: { color: "#fff", fontSize: 26, fontWeight: "700" },
  cameraBtn: {
    position: "absolute",
    bottom: 2,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: T.primary,
    borderWidth: 2,
    borderColor: T.darkBg,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadingOverlay: {
    position: "absolute",
    inset: 0,
    borderRadius: 40,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  statusDot: {
    position: "absolute",
    bottom: 2,
    left: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: T.darkBg,
  },

  identityInfo: { flex: 1 },
  heroName: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  heroRole: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 8,
  },
  badgesRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: T.radiusFull,
    borderWidth: 1,
  },
  badgeTxt: { fontSize: 9, fontWeight: "700", letterSpacing: 0.3 },

  // strip
  stripRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  stripItem: { flex: 1, alignItems: "center", gap: 4, paddingVertical: 2 },
  stripVal: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  stripLbl: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 9,
    fontWeight: "600",
    marginTop: 0,
    letterSpacing: 0.3,
  },
  stripSep: { width: 1, height: 30, backgroundColor: "rgba(255,255,255,0.12)" },

  // slate card body â€” white stat cards pop against this
  card: {
    backgroundColor: "#F4F7FB",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
    padding: 16,
    paddingTop: 10,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
  cardHighlight: {
    height: 4,
    width: 48,
    borderRadius: 2,
    backgroundColor: T.primary,
    marginBottom: 18,
    alignSelf: "center",
    opacity: 0.45,
  },

  // stats row (4 mini cards)
  statsRow: { flexDirection: "row", gap: 7, marginBottom: 8 },

  // bio
  bioBox: {
    backgroundColor: `${T.primary}06`,
    borderRadius: T.radiusMd,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: `${T.primary}20`,
  },
  bioTxt: {
    fontSize: 12,
    color: T.textSecondary,
    fontStyle: "italic",
    lineHeight: 18,
  },

  // mode card (compact)
  modeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: T.radiusMd,
    borderWidth: 1,
    marginBottom: 8,
  },
  modeIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modeVal: { fontSize: 14, fontWeight: "800" },

  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },

  // Teaching Info card
  teachCard: {
    backgroundColor: T.paper,
    borderRadius: T.radiusMd,
    borderWidth: 1,
    borderColor: T.border,
    padding: 12,
    marginBottom: 8,
  },
  teachRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  teachRowIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: T.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  teachRowLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: T.mutedFg,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    width: 60,
  },
  teachChips: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 5 },

  // Preferred Areas card
  areasCard: {
    backgroundColor: T.paper,
    borderRadius: T.radiusMd,
    borderWidth: 1,
    borderColor: T.border,
    padding: 12,
    marginBottom: 8,
    gap: 0,
  },
  areasLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: T.mutedFg,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 6,
  },
  areasTxt: {
    fontSize: 12,
    color: T.textSecondary,
    lineHeight: 18,
  },
  areasDivider: {
    borderTopWidth: 1,
    borderTopColor: T.border,
    marginTop: 10,
    paddingTop: 10,
  },

  // availability
  availRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  availIcon: {
    width: 26,
    height: 26,
    borderRadius: T.radiusSm,
    alignItems: "center",
    justifyContent: "center",
  },
  availTxt: { fontSize: 12, color: T.textSecondary, flex: 1, lineHeight: 16 },

  // address
  addrBox: {
    backgroundColor: T.muted,
    borderRadius: T.radiusMd,
    padding: 12,
    borderWidth: 1,
    borderColor: T.border,
  },
  addrTag: {
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 4,
  },
  addrVal: { fontSize: 12, color: T.textSecondary, lineHeight: 17 },

  // verification banner
  veriBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: T.radiusMd,
    borderWidth: 1,
    marginBottom: 8,
  },
  veriIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  veriStatus: { fontSize: 13, fontWeight: "800" },
  veriDate: { fontSize: 10, color: T.mutedFg, marginTop: 1 },
  feeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: T.radiusFull,
  },
  feeTxt: { fontSize: 10, fontWeight: "700" },

  // rejection
  rejBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: T.radiusMd,
    marginBottom: 8,
    backgroundColor: `${T.error}08`,
    borderWidth: 1,
    borderColor: `${T.error}20`,
  },
  rejTitle: {
    fontSize: 9,
    color: T.error,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  rejTxt: { fontSize: 12, color: T.error, lineHeight: 16 },

  // lock notice
  lockNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F5F3FF",
    borderRadius: T.radiusMd,
    padding: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#DDD6FE",
  },
  lockTxt: { fontSize: 10, color: "#7C3AED", fontWeight: "700" },

  // verify profile CTA button
  verifyCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
  },
  verifyCtaIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  verifyCtaTitle: { color: "#fff", fontSize: 13, fontWeight: "800" },
  verifyCtaSub: { color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 1 },

  // error / empty
  errorBox: { alignItems: "center", paddingVertical: 24, gap: 8 },
  errorTxt: { color: T.mutedFg, fontSize: 13, textAlign: "center" },
  retryBtn: {
    backgroundColor: T.primary,
    borderRadius: T.radiusMd,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  retryTxt: { color: "#fff", fontWeight: "700", fontSize: 13 },
  emptyBox: { alignItems: "center", paddingVertical: 20, gap: 6 },
  emptyTxt: { color: T.textDisabled, fontSize: 12 },
});

// Section head
export const sh = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 22,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  iconBg: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    color: T.textPrimary,
    letterSpacing: 0.05,
    flex: 1,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: T.radiusFull,
    borderWidth: 1,
  },
  badgeTxt: { fontSize: 9, fontWeight: "800" },

  // Subject hierarchy â€” compact tabbed design
  subjectsWrap: {},
  subjectsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  // Board tabs
  boardTabs: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 10,
  },
  boardTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 99,
    backgroundColor: "#E8F4FE",
    borderWidth: 1,
    borderColor: "#BDE0F8",
  },
  boardTabActive: {
    backgroundColor: "#0EA5E9",
    borderColor: "#0284C7",
  },
  boardTabTxt: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0EA5E9",
  },
  boardTabTxtActive: {
    color: "#fff",
  },

  // Single board (no tabs)
  singleBoardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 8,
  },
  singleBoardTxt: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#0EA5E9",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  // Compact grade rows
  gradeRows: { gap: 6 },
  gradeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5FB",
  },
  gradeRowLabel: {
    width: 110,
    fontSize: 11,
    fontWeight: "600",
    color: T.textSecondary,
    paddingTop: 3,
    flexShrink: 0,
  },
  gradeRowChips: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },

  // Legacy (kept for compat)
  boardRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  boardLabel: { fontSize: 11.5, fontWeight: "800", color: "#0EA5E9" },
  gradeBlock: { marginLeft: 8, gap: 5 },
  gradeLabel: { fontSize: 10.5, fontWeight: "700", color: T.textSecondary },
  subjectChips: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
});

// Tab bar
export const tb = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: "#DDE8F5",
    borderRadius: 14,
    padding: 4,
    marginBottom: 18,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: T.primary,
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  label: { fontSize: 11, fontWeight: "600", color: T.mutedFg },
  labelActive: { color: "#fff", fontWeight: "700" },
});

// Mini stat card (4 across)
export const ms = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: T.radiusLg,
    borderWidth: 0.5,
    borderColor: "#CBD5E1",
    padding: 11,
    alignItems: "center",
    gap: 5,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  label: {
    fontSize: 9,
    color: T.mutedFg,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 0.1,
  },
});

// Compact info row
export const ir = StyleSheet.create({
  container: {
    borderRadius: T.radiusLg,
    borderWidth: 1,
    borderColor: T.border,
    overflow: "hidden",
    marginBottom: 6,
    backgroundColor: T.paper,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: T.paper,
  },
  border: { borderBottomWidth: 1, borderBottomColor: T.border },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flex: 1 },
  lbl: {
    fontSize: 10,
    color: T.mutedFg,
    fontWeight: "600",
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  val: {
    fontSize: 14,
    color: T.textPrimary,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  arrowBox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
});

// Chip
export const chip = StyleSheet.create({
  wrap: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: T.radiusFull,
    borderWidth: 1,
  },
  txt: { fontSize: 12, fontWeight: "600" },
});

// Document card
export const dc = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: T.paper,
    borderRadius: T.radiusMd,
    borderWidth: 1,
    borderColor: T.border,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 13,
    color: T.textPrimary,
    fontWeight: "700",
    marginBottom: 5,
  },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: T.radiusFull,
    alignSelf: "flex-start",
    borderWidth: 1,
  },
  badgeTxt: { fontSize: 8, fontWeight: "800", letterSpacing: 0.6 },
  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: T.radiusMd,
    borderWidth: 1,
  },
  viewTxt: { fontSize: 11, fontWeight: "700" },
});

// In-app document viewer
const { width: SW, height: SH2 } = Dimensions.get("window");
export const dv = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0f172a" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
    marginHorizontal: 8,
  },
  imgBox: {
    flex: 1,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
  },
  img: { width: SW, height: SH2 * 0.78 },
  loaderBox: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f172a",
  },
  loaderTxt: { color: "#94A3B8", fontSize: 13, marginTop: 10 },
});

// Photo upload modal
export const pm = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: T.paper,
    borderTopLeftRadius: T.radiusXxl,
    borderTopRightRadius: T.radiusXxl,
    padding: 24,
    paddingBottom: 36,
    gap: 0,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.border,
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: T.textPrimary,
    textAlign: "center",
  },
  sub: {
    fontSize: 12,
    color: T.mutedFg,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 20,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  optIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  optLabel: { fontSize: 14, fontWeight: "700", color: T.textPrimary },
  optSub: { fontSize: 11, color: T.mutedFg, marginTop: 2 },
  cancel: {
    marginTop: 16,
    paddingVertical: 13,
    backgroundColor: T.muted,
    borderRadius: T.radiusMd,
    alignItems: "center",
  },
  cancelTxt: { fontSize: 14, fontWeight: "700", color: T.mutedFg },
});

// Verification modal
export const vm = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.background },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },

  stepBarWrap: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },
  stepDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  dot: { height: 8, borderRadius: 4 },
  stepLabel: { fontSize: 11, color: T.mutedFg, fontWeight: "600" },

  content: { padding: 16, paddingBottom: 32 },

  // Step headings
  stepTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: T.textPrimary,
    marginBottom: 4,
  },
  stepSub: { fontSize: 12, color: T.mutedFg, marginBottom: 14 },

  // Warning
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: T.radiusMd,
    marginBottom: 12,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  warningTxt: { fontSize: 12, fontWeight: "600", color: "#92400E", flex: 1 },

  // Doc grid
  docGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  docCard: {
    width: "47%",
    borderRadius: T.radiusMd,
    borderWidth: 1.5,
    backgroundColor: T.paper,
    padding: 12,
    alignItems: "center",
    gap: 6,
  },
  docIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  docLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: T.textPrimary,
    textAlign: "center",
  },
  docBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: T.radiusFull,
  },
  docBadgeTxt: {
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  // Guidelines
  guideBox: {
    backgroundColor: T.muted,
    borderRadius: T.radiusMd,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: T.border,
  },
  guideRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  guideTxt: { fontSize: 12, color: "#475569", flex: 1, lineHeight: 17 },

  // Payment
  feeSuccessBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: T.radiusMd,
    backgroundColor: `${T.success}10`,
    borderWidth: 1,
    borderColor: `${T.success}30`,
  },
  feeCard: {
    borderWidth: 2,
    borderRadius: T.radiusMd,
    backgroundColor: T.paper,
    padding: 14,
    overflow: "hidden",
  },
  feeCardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  feeCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  feeCardTitle: { fontSize: 14, fontWeight: "700", color: T.textPrimary },
  feeCardSub: { fontSize: 11, color: T.mutedFg, marginTop: 1 },
  feeAmt: { fontSize: 18, fontWeight: "800" },
  feePlusTxt: { fontSize: 10, color: T.textDisabled, fontWeight: "600" },

  qrSection: { marginTop: 12, gap: 10 },
  qrHint: { fontSize: 12, color: T.mutedFg, textAlign: "center" },
  qrBox: { alignItems: "center", gap: 6 },
  qrImg: {
    width: 150,
    height: 150,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.border,
  },
  qrUpi: { fontSize: 11, color: T.mutedFg, fontWeight: "600" },
  screenshotBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: "#7C3AED",
    borderStyle: "dashed",
    borderRadius: T.radiusMd,
    padding: 12,
  },
  screenshotBtnTxt: { fontSize: 13, fontWeight: "600" },

  lateBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: T.radiusMd,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  lateTxt: { fontSize: 12, color: "#92400E", fontWeight: "600" },

  // Declaration
  declCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderWidth: 1.5,
    borderRadius: T.radiusMd,
    padding: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  declTxt: { flex: 1, fontSize: 13, lineHeight: 19 },

  rejBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: T.radiusMd,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    gap: 6,
  },
  rejTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#92400E",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  rejChips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 },
  rejChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: T.radiusFull,
    backgroundColor: "#FDE68A",
  },
  rejChipTxt: { fontSize: 10, color: "#92400E", fontWeight: "700" },

  // Review
  reviewCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: T.radiusMd,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: "#FAFAFA",
  },
  reviewIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewTitle: { fontSize: 13, fontWeight: "700", color: T.textPrimary },
  reviewSub: { fontSize: 11, color: T.mutedFg, marginTop: 2 },

  summaryBox: {
    padding: 14,
    borderRadius: T.radiusMd,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: "#FAFAFA",
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: T.textPrimary,
    marginBottom: 10,
  },
  summaryChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  summaryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: T.radiusFull,
  },
  summaryChipTxt: { fontSize: 10, fontWeight: "700" },

  // Submit
  submitWrap: { alignItems: "center", paddingTop: 8 },
  submitIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#7C3AED15",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  submitTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: T.textPrimary,
    marginBottom: 8,
    textAlign: "center",
  },
  submitSub: {
    fontSize: 13,
    color: T.mutedFg,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 20,
  },

  outcomeRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginBottom: 14,
  },
  outcomeCard: {
    flex: 1,
    borderRadius: T.radiusMd,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  outcomeTitle: { fontSize: 12, fontWeight: "800", marginTop: 2 },
  outcomePt: { fontSize: 11, lineHeight: 17 },

  submitNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: T.radiusMd,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    width: "100%",
  },
  submitNoteTxt: { fontSize: 12, color: "#1E40AF", flex: 1, lineHeight: 17 },

  // Error
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: T.radiusMd,
    marginTop: 12,
    backgroundColor: `${T.error}08`,
    borderWidth: 1,
    borderColor: `${T.error}20`,
  },
  errorTxt: { fontSize: 12, color: T.error, flex: 1 },

  // Bottom nav
  bottomNav: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: T.border,
    backgroundColor: T.paper,
  },
  backBtn2: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: T.radiusMd,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  backBtnTxt: { fontSize: 13, fontWeight: "600", color: T.textPrimary },
  nextBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: T.radiusMd,
    paddingVertical: 13,
  },
  nextBtnTxt: { fontSize: 14, fontWeight: "700", color: "#fff" },

  // Success
  successWrap: { alignItems: "center", paddingTop: 40 },
  successIcon: { marginBottom: 20 },
  successTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: T.textPrimary,
    marginBottom: 10,
  },
  successSub: {
    fontSize: 13,
    color: T.mutedFg,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  successBtn: {
    backgroundColor: T.success,
    borderRadius: T.radiusMd,
    paddingHorizontal: 40,
    paddingVertical: 14,
  },
  successBtnTxt: { color: "#fff", fontSize: 15, fontWeight: "800" },
});

