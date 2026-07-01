import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  listTickets,
  getTicket,
  addTicketComment,
  updateTicketStatus,
  getTicketStats,
  Ticket,
} from "../../api/client";
import { T } from "../../constants/colors";

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

const STATUS_CFG: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  OPEN:        { color: T.error,   bg: `${T.error}15`,   label: "Open",        icon: "alert-circle-outline" },
  IN_PROGRESS: { color: T.warning, bg: `${T.warning}15`, label: "In Progress", icon: "time-outline" },
  RESOLVED:    { color: T.success, bg: `${T.success}15`, label: "Resolved",    icon: "checkmark-circle-outline" },
  CLOSED:      { color: T.mutedFg, bg: T.muted,          label: "Closed",      icon: "lock-closed-outline" },
};

const PRIORITY_CFG: Record<string, { color: string; label: string }> = {
  HIGH:   { color: T.error,   label: "High" },
  MEDIUM: { color: T.warning, label: "Medium" },
  LOW:    { color: T.success, label: "Low" },
};

// â”€â”€â”€ Status Badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.OPEN;
  return (
    <View style={[b.badge, { backgroundColor: cfg.bg }]}>
      <Ionicons name={cfg.icon as any} size={10} color={cfg.color} />
      <Text style={[b.txt, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
};
const b = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 99 },
  txt:   { fontSize: 10, fontWeight: "700" },
});

// â”€â”€â”€ Ticket Detail Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const TicketDetailModal = ({
  ticketId,
  visible,
  onClose,
  onUpdated,
}: {
  ticketId: string | null;
  visible: boolean;
  onClose: () => void;
  onUpdated: () => void;
}) => {
  const insets = useSafeAreaInsets();
  const [ticket, setTicket]           = useState<Ticket | null>(null);
  const [loading, setLoading]         = useState(false);
  const [comment, setComment]         = useState("");
  const [posting, setPosting]         = useState(false);
  const [resolving, setResolving]     = useState(false);
  const [resolutionNote, setResolutionNote] = useState("");
  const [showResolveBox, setShowResolveBox] = useState(false);

  const load = useCallback(async () => {
    if (!ticketId) return;
    setLoading(true);
    try {
      const res = await getTicket(ticketId);
      setTicket(res.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [ticketId]);

  useEffect(() => {
    if (visible && ticketId) load();
    else { setTicket(null); setComment(""); setResolutionNote(""); setShowResolveBox(false); }
  }, [visible, ticketId]);

  const submitComment = async () => {
    if (!ticket || !comment.trim()) return;
    setPosting(true);
    try {
      await addTicketComment(ticket._id, comment.trim());
      setComment("");
      await load();
      onUpdated();
    } catch { /* silent */ }
    finally { setPosting(false); }
  };

  const resolve = async () => {
    if (!ticket) return;
    setResolving(true);
    try {
      await updateTicketStatus(ticket._id, { status: "RESOLVED", resolutionNote: resolutionNote.trim() || undefined });
      onUpdated();
      onClose();
    } catch { /* silent */ }
    finally { setResolving(false); }
  };

  const markInProgress = async () => {
    if (!ticket) return;
    try {
      await updateTicketStatus(ticket._id, { status: "IN_PROGRESS" });
      await load();
      onUpdated();
    } catch { /* silent */ }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[dm.root, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" />
        {/* Header */}
        <View style={dm.header}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color={T.textPrimary} />
          </Pressable>
          <Text style={dm.headerTitle} numberOfLines={1}>
            {ticket?.ticketNumber ?? "Ticket"}
          </Text>
          {ticket && ticket.status === "OPEN" && (
            <Pressable onPress={markInProgress} style={dm.ipBtn}>
              <Text style={dm.ipBtnTxt}>Start</Text>
            </Pressable>
          )}
        </View>

        {loading && !ticket ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={T.primary} />
        ) : ticket ? (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={dm.body} showsVerticalScrollIndicator={false}>
            {/* Meta */}
            <View style={dm.metaRow}>
              <StatusBadge status={ticket.status} />
              <View style={[dm.priorityBadge, { backgroundColor: `${PRIORITY_CFG[ticket.priority]?.color}15` }]}>
                <Text style={[dm.priorityTxt, { color: PRIORITY_CFG[ticket.priority]?.color }]}>
                  {PRIORITY_CFG[ticket.priority]?.label ?? ticket.priority}
                </Text>
              </View>
              <Text style={dm.dateStr}>{fmtDate(ticket.createdAt)}</Text>
            </View>

            <Text style={dm.subject}>{ticket.subject}</Text>
            {ticket.raisedByName && <Text style={dm.meta}>Raised by: {ticket.raisedByName}{ticket.studentName ? ` Â· Student: ${ticket.studentName}` : ""}</Text>}

            {ticket.description && (
              <View style={dm.descBox}>
                <Text style={dm.descTxt}>{ticket.description}</Text>
              </View>
            )}

            {/* Resolution note */}
            {ticket.resolutionNote && (
              <View style={dm.resolvedBox}>
                <Ionicons name="checkmark-circle" size={14} color={T.success} />
                <Text style={dm.resolvedTxt}>{ticket.resolutionNote}</Text>
              </View>
            )}

            {/* Comments */}
            {ticket.comments.length > 0 && (
              <View style={dm.commentsSection}>
                <Text style={dm.commentsTitle}>Comments ({ticket.comments.length})</Text>
                {ticket.comments.map((c) => (
                  <View key={c._id} style={[dm.commentCard, c.authorRole === "PARENT" && dm.commentCardParent]}>
                    <View style={dm.commentMeta}>
                      <Text style={dm.commentAuthor}>{c.authorName}</Text>
                      <Text style={dm.commentRole}>{c.authorRole}</Text>
                      <Text style={dm.commentTime}>{fmtTime(c.createdAt)}</Text>
                    </View>
                    <Text style={dm.commentMsg}>{c.message}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Reply box */}
            {ticket.status !== "RESOLVED" && ticket.status !== "CLOSED" && (
              <View style={dm.replyBox}>
                <TextInput
                  style={dm.replyInput}
                  placeholder="Add a comment or updateâ€¦"
                  placeholderTextColor={T.textDisabled}
                  value={comment}
                  onChangeText={setComment}
                  multiline
                  maxLength={1000}
                />
                <Pressable
                  style={[dm.replyBtn, !comment.trim() && { opacity: 0.4 }]}
                  onPress={submitComment}
                  disabled={!comment.trim() || posting}
                >
                  {posting ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={14} color="#fff" />}
                </Pressable>
              </View>
            )}

            {/* Resolve */}
            {ticket.status !== "RESOLVED" && ticket.status !== "CLOSED" && (
              <View style={{ marginTop: 12 }}>
                {!showResolveBox ? (
                  <Pressable style={dm.resolveBtn} onPress={() => setShowResolveBox(true)}>
                    <Ionicons name="checkmark-done-outline" size={16} color="#fff" />
                    <Text style={dm.resolveBtnTxt}>Mark as Resolved</Text>
                  </Pressable>
                ) : (
                  <View style={dm.resolveBoxWrap}>
                    <Text style={dm.resolveLabel}>Resolution note (optional)</Text>
                    <TextInput
                      style={dm.resolveInput}
                      placeholder="What was done to resolve this?"
                      placeholderTextColor={T.textDisabled}
                      value={resolutionNote}
                      onChangeText={setResolutionNote}
                      multiline
                      maxLength={500}
                    />
                    <View style={dm.resolveActions}>
                      <Pressable style={dm.cancelBtn} onPress={() => setShowResolveBox(false)}>
                        <Text style={dm.cancelBtnTxt}>Cancel</Text>
                      </Pressable>
                      <Pressable style={dm.resolveBtn} onPress={resolve} disabled={resolving}>
                        {resolving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={dm.resolveBtnTxt}>Confirm Resolve</Text>}
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        ) : null}
      </View>
    </Modal>
  );
};

const dm = StyleSheet.create({
  root:            { flex: 1, backgroundColor: T.background },
  header:          { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: T.border, backgroundColor: T.paper },
  headerTitle:     { flex: 1, fontSize: 16, fontWeight: "700", color: T.textPrimary },
  ipBtn:           { backgroundColor: `${T.warning}15`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  ipBtnTxt:        { fontSize: 12, fontWeight: "700", color: T.warning },
  body:            { padding: 16, gap: 12, paddingBottom: 40 },
  metaRow:         { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  priorityBadge:   { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 99 },
  priorityTxt:     { fontSize: 10, fontWeight: "700" },
  dateStr:         { fontSize: 11, color: T.mutedFg, marginLeft: "auto" },
  subject:         { fontSize: 18, fontWeight: "800", color: T.textPrimary, lineHeight: 24 },
  meta:            { fontSize: 12, color: T.mutedFg },
  descBox:         { backgroundColor: T.muted, borderRadius: T.radiusMd, padding: 14 },
  descTxt:         { fontSize: 13, color: T.textSecondary, lineHeight: 20 },
  resolvedBox:     { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: `${T.success}10`, borderRadius: T.radiusMd, padding: 12 },
  resolvedTxt:     { flex: 1, fontSize: 12, color: T.success, fontWeight: "600" },
  commentsSection: { gap: 8 },
  commentsTitle:   { fontSize: 12, fontWeight: "700", color: T.mutedFg, textTransform: "uppercase", letterSpacing: 0.4 },
  commentCard:     { backgroundColor: T.paper, borderRadius: T.radiusMd, padding: 12, borderWidth: 1, borderColor: T.border },
  commentCardParent: { backgroundColor: `${T.primary}06`, borderColor: `${T.primary}20` },
  commentMeta:     { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  commentAuthor:   { fontSize: 12, fontWeight: "700", color: T.textPrimary },
  commentRole:     { fontSize: 10, color: T.mutedFg, backgroundColor: T.muted, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  commentTime:     { fontSize: 10, color: T.textDisabled, marginLeft: "auto" },
  commentMsg:      { fontSize: 13, color: T.textSecondary, lineHeight: 18 },
  replyBox:        { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  replyInput:      { flex: 1, backgroundColor: T.paper, borderRadius: T.radiusMd, borderWidth: 1, borderColor: T.border, padding: 12, fontSize: 13, color: T.textPrimary, minHeight: 48, textAlignVertical: "top" },
  replyBtn:        { width: 40, height: 40, borderRadius: T.radiusMd, backgroundColor: T.primary, alignItems: "center", justifyContent: "center" },
  resolveBtn:      { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: T.success, padding: 13, borderRadius: T.radiusMd },
  resolveBtnTxt:   { color: "#fff", fontWeight: "700", fontSize: 14 },
  resolveBoxWrap:  { gap: 10 },
  resolveLabel:    { fontSize: 12, fontWeight: "600", color: T.textSecondary },
  resolveInput:    { backgroundColor: T.paper, borderRadius: T.radiusMd, borderWidth: 1, borderColor: T.border, padding: 12, fontSize: 13, color: T.textPrimary, minHeight: 60, textAlignVertical: "top" },
  resolveActions:  { flexDirection: "row", gap: 10 },
  cancelBtn:       { flex: 1, padding: 12, borderRadius: T.radiusMd, borderWidth: 1, borderColor: T.border, alignItems: "center" },
  cancelBtnTxt:    { fontSize: 14, fontWeight: "600", color: T.textSecondary },
});

// â”€â”€â”€ Main Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const FILTERS = ["ALL", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

const CoordinatorTicketsScreen = ({ navigation }: { navigation?: any }) => {
  const insets = useSafeAreaInsets();
  const [tickets, setTickets]       = useState<Ticket[]>([]);
  const [stats, setStats]           = useState<{ open: number; inProgress: number; resolved: number; total: number } | null>(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter]         = useState("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [listRes, statsRes] = await Promise.allSettled([
        listTickets({ status: filter === "ALL" ? undefined : filter, limit: 50 }),
        getTicketStats(),
      ]);
      if (listRes.status === "fulfilled") setTickets((listRes.value as any).data ?? []);
      if (statsRes.status === "fulfilled") setStats((statsRes.value as any).data);
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [filter]);

  useEffect(() => { void load(); }, [load]);

  const openTicket = (id: string) => { setSelectedId(id); setDetailOpen(true); };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[T.darkBg, T.darkBgMid, "#162032"]}
        style={[s.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}
      >
        {navigation && (
          <Pressable onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </Pressable>
        )}
        <View>
          <Text style={s.headerTitle}>Support Tickets</Text>
          <Text style={s.headerSub}>Manage and resolve parent concerns</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={T.primary} />}
      >
        {/* Stats strip */}
        {stats && (
          <View style={s.statsRow}>
            {[
              { label: "Open",        val: stats.open,       color: T.error },
              { label: "In Progress", val: stats.inProgress, color: T.warning },
              { label: "Resolved",    val: stats.resolved,   color: T.success },
              { label: "Total",       val: stats.total,      color: T.primary },
            ].map((item) => (
              <View key={item.label} style={s.statCard}>
                <Text style={[s.statVal, { color: item.color }]}>{item.val}</Text>
                <Text style={s.statLbl}>{item.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Filter tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <View style={s.filterRow}>
            {FILTERS.map((f) => (
              <Pressable
                key={f}
                style={[s.filterChip, filter === f && s.filterChipActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[s.filterTxt, filter === f && s.filterTxtActive]}>
                  {f.replace("_", " ")}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Ticket list */}
        {loading ? (
          <ActivityIndicator color={T.primary} style={{ marginTop: 32 }} />
        ) : tickets.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="ticket-outline" size={40} color={T.textDisabled} />
            <Text style={s.emptyTxt}>No tickets {filter !== "ALL" ? `with status "${filter.replace("_", " ")}"` : "yet"}</Text>
          </View>
        ) : (
          tickets.map((ticket) => {
            const cfg = STATUS_CFG[ticket.status] ?? STATUS_CFG.OPEN;
            const pri = PRIORITY_CFG[ticket.priority];
            return (
              <Pressable key={ticket._id} style={s.ticketCard} onPress={() => openTicket(ticket._id)}>
                <View style={s.ticketTop}>
                  <Text style={s.ticketNum}>{ticket.ticketNumber}</Text>
                  <StatusBadge status={ticket.status} />
                  {pri && (
                    <View style={[s.priDot, { backgroundColor: pri.color }]} />
                  )}
                </View>
                <Text style={s.ticketSubject} numberOfLines={2}>{ticket.subject}</Text>
                <View style={s.ticketMeta}>
                  {ticket.raisedByName && <Text style={s.ticketMetaTxt}>{ticket.raisedByName}</Text>}
                  {ticket.studentName  && <Text style={s.ticketMetaTxt}>Â· {ticket.studentName}</Text>}
                  <Text style={[s.ticketMetaTxt, { marginLeft: "auto" }]}>{fmtDate(ticket.createdAt)}</Text>
                </View>
                {(ticket.comments?.length ?? 0) > 0 && (
                  <View style={s.commentCount}>
                    <Ionicons name="chatbubble-outline" size={11} color={T.mutedFg} />
                    <Text style={s.commentCountTxt}>{ticket.comments.length}</Text>
                  </View>
                )}
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <TicketDetailModal
        ticketId={selectedId}
        visible={detailOpen}
        onClose={() => setDetailOpen(false)}
        onUpdated={load}
      />
    </View>
  );
};

const s = StyleSheet.create({
  root:            { flex: 1, backgroundColor: T.background },
  header:          { paddingHorizontal: 20, paddingBottom: 20, flexDirection: "row", alignItems: "center", gap: 14 },
  backBtn:         { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  headerTitle:     { fontSize: 22, fontWeight: "800", color: "#fff", letterSpacing: -0.5 },
  headerSub:       { fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  body:            { padding: 16, paddingBottom: 40, gap: 10 },

  statsRow:        { flexDirection: "row", gap: 8, marginBottom: 4 },
  statCard:        { flex: 1, backgroundColor: T.paper, borderRadius: T.radiusMd, padding: 12, alignItems: "center", borderWidth: 1, borderColor: T.border },
  statVal:         { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  statLbl:         { fontSize: 10, color: T.mutedFg, fontWeight: "600", marginTop: 2 },

  filterRow:       { flexDirection: "row", gap: 6 },
  filterChip:      { paddingHorizontal: 14, paddingVertical: 7, borderRadius: T.radiusFull, backgroundColor: T.muted, borderWidth: 1, borderColor: T.border },
  filterChipActive: { backgroundColor: T.primary, borderColor: T.primary },
  filterTxt:       { fontSize: 12, fontWeight: "600", color: T.mutedFg },
  filterTxtActive: { color: "#fff" },

  empty:           { alignItems: "center", paddingVertical: 48, gap: 10 },
  emptyTxt:        { fontSize: 14, color: T.mutedFg, textAlign: "center" },

  ticketCard:      { backgroundColor: T.paper, borderRadius: T.radiusLg, padding: 14, borderWidth: 1, borderColor: T.border, gap: 6 },
  ticketTop:       { flexDirection: "row", alignItems: "center", gap: 8 },
  ticketNum:       { fontSize: 11, fontWeight: "700", color: T.primary, letterSpacing: 0.3 },
  priDot:          { width: 7, height: 7, borderRadius: 4, marginLeft: "auto" },
  ticketSubject:   { fontSize: 14, fontWeight: "700", color: T.textPrimary, lineHeight: 20 },
  ticketMeta:      { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  ticketMetaTxt:   { fontSize: 11, color: T.mutedFg },
  commentCount:    { flexDirection: "row", alignItems: "center", gap: 4 },
  commentCountTxt: { fontSize: 11, color: T.mutedFg },
});

export default CoordinatorTicketsScreen;

