import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { Button, EmptyState, IsoRoom } from "@/components";
import { BanSheet, ModerationActions } from "@/components/ModerationActions";
import { DONE_TEXT, runModerationAction, takePendingNotice, type AnyAction, type CardAction } from "@/lib/moderation/actions";
import { useIsAdmin } from "@/lib/hooks/useIsAdmin";
import {
  UNDO_WINDOW_MS,
  fetchDesignImageUrl,
  fetchLog,
  fetchQueue,
  reasonLabel,
  reportedAgo,
  reporterLabel,
  type LogEntry,
  type QueueItem,
} from "@/lib/moderation";

/**
 * Moderation queue (App Review guideline 1.2).
 * Hidden route: reachable from Settings only when the account is an admin.
 * Every action is enforced and logged by the database, not by this screen.
 *
 * Hide, Dismiss, Keep hidden and Restore run straight away (Hide has a 5s
 * Undo). Ban keeps a confirmation popup because it affects every design the
 * owner has.
 */

const LOG_LABELS: Record<string, string> = {
  hide_design: "Design hidden",
  dismiss_report: "Reports dismissed",
  ban_user: "Banned from publishing",
  auto_hide_design: "Hidden automatically",
  keep_hidden: "Kept hidden",
  restore_design: "Design restored",
};

type Notice = { text: string; undoProjectId: string | null; key: number };

export function Thumbnail({ item, size = 72 }: { item: QueueItem; size?: number }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    fetchDesignImageUrl(item.projectId).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [item.projectId]);

  return (
    <View style={[styles.thumb, { width: size, height: size }]} testID="admin-report-thumbnail">
      {url ? (
        <Image source={{ uri: url }} style={{ width: size, height: size }} accessibilityLabel={`${item.title} design`} />
      ) : (
        <IsoRoom palette={item.selectedStyle || "modern"} size={size} accessible={false} />
      )}
    </View>
  );
}

function ReportCard({
  item,
  busy,
  nowMs,
  onAction,
  onOpen,
}: {
  item: QueueItem;
  busy: boolean;
  nowMs: number;
  onAction: (kind: CardAction) => void;
  onOpen: () => void;
}) {
  return (
    <View style={[styles.card, item.overdue && styles.cardOverdue]} testID="admin-report-card">
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`${item.title}, ${reporterLabel(item.reporterCount)}`}
        accessibilityHint="Opens the design and its reports"
        style={styles.cardTop}
        testID="admin-report-open"
      >
        <Thumbnail item={item} />
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1} testID="admin-report-title">
            {item.title}
          </Text>
          <Text style={styles.cardOwner} numberOfLines={1}>
            {item.ownerName ? `By ${item.ownerName}` : "Owner unknown"}
            {item.ownerBanned ? " · banned" : ""}
          </Text>
          <Text style={styles.reporters} testID="admin-report-count">
            {reporterLabel(item.reporterCount)}
          </Text>
          <Text style={[styles.age, item.overdue && styles.ageOverdue]} testID="admin-report-age">
            {reportedAgo(item.oldestReportAt, nowMs)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </Pressable>

      <View style={styles.chips}>
        {item.overdue && (
          <View style={[styles.chip, styles.chipOverdue]} testID="admin-report-overdue">
            <Ionicons name="time-outline" size={13} color="#fff" />
            <Text style={[styles.chipText, styles.chipTextOnDark]}>Over 24 hours</Text>
          </View>
        )}
        {item.isHidden && (
          <View style={[styles.chip, styles.chipHidden]} testID="admin-report-auto-hidden">
            <Ionicons name="eye-off-outline" size={13} color={colors.textPrimary} />
            <Text style={styles.chipText}>Hidden pending review</Text>
          </View>
        )}
        {item.reasons.map((r) => (
          <View key={r} style={styles.chip} testID="admin-report-reason">
            <Text style={styles.chipText}>{reasonLabel(r)}</Text>
          </View>
        ))}
      </View>

      <ModerationActions item={item} busy={busy} onAction={onAction} />
    </View>
  );
}

export default function ModerationScreen() {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const [queue, setQueue] = useState<QueueItem[] | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [banItem, setBanItem] = useState<QueueItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const noticeSeq = useRef(0);

  const showNotice = useCallback((kind: AnyAction, projectId: string) => {
    noticeSeq.current += 1;
    setNotice({ text: DONE_TEXT[kind], undoProjectId: kind === "hide" ? projectId : null, key: noticeSeq.current });
  }, []);

  // Coming back from the detail screen: show its confirmation (and Undo) and reload.
  useFocusEffect(
    useCallback(() => {
      const pending = takePendingNotice();
      if (pending) showNotice(pending.kind, pending.projectId);
      setReloadKey((k) => k + 1);
    }, [showNotice])
  );
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!isAdmin) return;
    let alive = true;
    Promise.all([fetchQueue(), fetchLog()])
      .then(([q, l]) => {
        if (!alive) return;
        setError(null);
        setQueue(q);
        setLog(l);
        setNowMs(Date.now());
      })
      .catch(() => {
        if (!alive) return;
        setError("Couldn't load reports. Try again.");
        setQueue([]);
      });
    return () => {
      alive = false;
    };
  }, [isAdmin, reloadKey]);

  // Undo window: state-driven. The Undo button belongs to one notice (key);
  // after UNDO_WINDOW_MS that notice loses its Undo.
  const undoKey = notice?.undoProjectId ? notice.key : null;
  useEffect(() => {
    if (undoKey === null) return;
    const t = setTimeout(() => {
      setNotice((n) => (n && n.key === undoKey ? { ...n, undoProjectId: null } : n));
    }, UNDO_WINDOW_MS);
    return () => clearTimeout(t);
  }, [undoKey]);

  const run = async (kind: AnyAction, item: { projectId: string; ownerId: string | null }) => {
    setBusyId(item.projectId);
    setNotice(null);
    try {
      await runModerationAction(kind, item);
      showNotice(kind, item.projectId);
      setReloadKey((k) => k + 1);
    } catch {
      setError("That didn't work. Try again.");
    } finally {
      setBusyId(null);
    }
  };

  const onAction = (kind: CardAction, item: QueueItem) => {
    if (kind === "ban") setBanItem(item);
    else run(kind, item);
  };

  const header = <Stack.Screen options={{ title: "Moderation", headerBackTitle: "Back" }} />;

  if (isAdmin === null) {
    return (
      <SafeAreaView style={styles.center} edges={["bottom"]}>
        {header}
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
    return <ModeratorsOnly header={header} />;
  }

  const overdueCount = queue?.filter((q) => q.overdue).length ?? 0;

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]} testID="admin-moderation-screen">
      {header}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summary} testID="admin-summary">
          <View style={styles.summaryBox}>
            <Text style={styles.summaryNumber} testID="admin-open-count">{queue?.length ?? 0}</Text>
            <Text style={styles.summaryLabel}>Open</Text>
          </View>
          <View style={[styles.summaryBox, overdueCount > 0 && styles.summaryBoxAlert]}>
            <Text style={[styles.summaryNumber, overdueCount > 0 && styles.summaryNumberAlert]} testID="admin-overdue-count">
              {overdueCount}
            </Text>
            <Text style={styles.summaryLabel}>Over 24 hours</Text>
          </View>
        </View>

        {notice && (
          <View style={styles.notice} testID="admin-notice" accessibilityLiveRegion="polite">
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <Text style={styles.noticeText}>{notice.text}</Text>
            {notice.undoProjectId && (
              <Pressable
                onPress={() => run("undo", { projectId: notice.undoProjectId as string, ownerId: null })}
                accessibilityRole="button"
                accessibilityLabel="Undo hide"
                hitSlop={8}
                style={styles.undoButton}
                testID="admin-undo-button"
              >
                <Text style={styles.undoText}>Undo</Text>
              </Pressable>
            )}
          </View>
        )}
        {error && (
          <Text style={styles.error} testID="admin-error">{error}</Text>
        )}

        <Text style={styles.sectionTitle} accessibilityRole="header">Reported designs</Text>
        {queue === null ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
        ) : queue.length === 0 ? (
          <View testID="admin-queue-empty">
            <EmptyState icon="shield-checkmark-outline" title="No open reports" subtitle="New reports show up here and by email." />
          </View>
        ) : (
          queue.map((item) => (
            <ReportCard
              key={item.projectId}
              item={item}
              nowMs={nowMs}
              busy={busyId === item.projectId}
              onAction={(kind) => onAction(kind, item)}
              onOpen={() => router.push(`/admin/design/${item.projectId}`)}
            />
          ))
        )}

        {log.length > 0 && (
          <View testID="admin-log">
            <Text style={styles.sectionTitle} accessibilityRole="header">Recent actions</Text>
            <View style={styles.logCard}>
              {log.map((entry, i) => (
                <View key={entry.id} style={[styles.logRow, i > 0 && styles.logRowBorder]} testID="admin-log-row">
                  <Text style={styles.logAction}>{LOG_LABELS[entry.action] ?? entry.action}</Text>
                  <Text style={styles.logMeta}>{entry.byAdmin ? "Moderator" : "Automatic"}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <BanSheet item={banItem} onClose={() => setBanItem(null)} onConfirm={(item) => run("ban", item)} />
    </SafeAreaView>
  );
}

export function ModeratorsOnly({ header }: { header: React.ReactNode }) {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container} edges={["bottom"]} testID="admin-denied">
      {header}
      <EmptyState icon="lock-closed-outline" title="Moderators only" subtitle="This page is only for moderators.">
        <Button label="Go back" variant="outline" onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))} />
      </EmptyState>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  summary: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  summaryBox: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  summaryBoxAlert: { borderColor: colors.error },
  summaryNumber: { ...fonts.heading },
  summaryNumberAlert: { color: colors.error },
  summaryLabel: { ...fonts.regular },
  sectionTitle: { ...fonts.label, color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.sm },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "#E6F4EA",
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  noticeText: { ...fonts.label, color: colors.success },
  error: { ...fonts.label, color: colors.error, marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardOverdue: { borderColor: colors.error, borderWidth: 2 },
  cardTop: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: radius.sm,
    overflow: "hidden",
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: { flex: 1, justifyContent: "center" },
  cardTitle: { ...fonts.body, fontFamily: "Nunito_800ExtraBold" },
  cardOwner: { ...fonts.regular, marginTop: 2 },
  reporters: { ...fonts.label, marginTop: spacing.xs },
  age: { ...fonts.regular, fontSize: 13, marginTop: 2 },
  ageOverdue: { color: colors.error, fontFamily: "Nunito_700Bold" },
  undoButton: { marginLeft: "auto", paddingHorizontal: spacing.sm, paddingVertical: 4 },
  undoText: { ...fonts.label, color: colors.primary, textDecorationLine: "underline" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.md },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  chipOverdue: { backgroundColor: colors.error },
  chipHidden: { backgroundColor: "#FEF7E0" },
  chipText: { fontSize: 12, fontFamily: "Nunito_700Bold", color: colors.textPrimary },
  chipTextOnDark: { color: "#fff" },
  logCard: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logRow: { flexDirection: "row", justifyContent: "space-between", padding: spacing.md },
  logRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  logAction: { ...fonts.label },
  logMeta: { ...fonts.regular },
});
