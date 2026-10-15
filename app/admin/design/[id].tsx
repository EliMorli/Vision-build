import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { EmptyState, IsoRoom } from "@/components";
import { BanSheet, ModerationActions } from "@/components/ModerationActions";
import { runModerationAction, setPendingNotice, type CardAction } from "@/lib/moderation/actions";
import { useIsAdmin } from "@/lib/hooks/useIsAdmin";
import { ModeratorsOnly } from "../moderation";
import {
  fetchDesignImageUrl,
  fetchQueueItem,
  fetchReportDetails,
  reasonLabel,
  reportedAgo,
  reporterLabel,
  type QueueItem,
  type ReportDetail,
} from "@/lib/moderation";

/**
 * Reported design detail (admins only).
 * The image comes from the admin-design-image function: a 5-minute signed link
 * to the generated design, never the original room photo.
 * Reports show reason, note and time. Never who reported.
 */
export default function ReportedDesignScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isAdmin = useIsAdmin();
  const { width } = useWindowDimensions();
  const [item, setItem] = useState<QueueItem | null | undefined>(undefined);
  const [details, setDetails] = useState<ReportDetail[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [banItem, setBanItem] = useState<QueueItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Act here, then go back to the queue, which shows the same note (and Undo).
  const act = async (kind: CardAction, target: QueueItem) => {
    setBusy(true);
    setActionError(null);
    try {
      await runModerationAction(kind, target);
      setPendingNotice({ kind, projectId: target.projectId });
      if (router.canGoBack()) router.back();
      else router.replace("/admin/moderation");
    } catch {
      setActionError("That didn't work. Try again.");
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!isAdmin || !id) return;
    let alive = true;
    Promise.all([fetchQueueItem(id), fetchReportDetails(id), fetchDesignImageUrl(id)])
      .then(([q, d, url]) => {
        if (!alive) return;
        setItem(q);
        setDetails(d);
        setImageUrl(url);
        setNowMs(Date.now());
      })
      .catch(() => alive && setItem(null));
    return () => {
      alive = false;
    };
  }, [isAdmin, id]);

  const header = <Stack.Screen options={{ title: "Reported design", headerBackTitle: "Back" }} />;
  if (isAdmin === false) return <ModeratorsOnly header={header} />;
  if (isAdmin === null || item === undefined) {
    return (
      <SafeAreaView style={styles.center} edges={["bottom"]}>
        {header}
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }
  if (item === null) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]} testID="admin-detail-missing">
        {header}
        <EmptyState icon="checkmark-done-outline" title="No open reports" subtitle="This design has no open reports right now." />
      </SafeAreaView>
    );
  }

  const imgSize = Math.min(width, 520) - spacing.md * 2;

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]} testID="admin-detail-screen">
      {header}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.imageWrap, { width: imgSize, height: imgSize }]} testID="admin-detail-image">
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={{ width: imgSize, height: imgSize }} accessibilityLabel={`${item.title} design`} />
          ) : (
            <IsoRoom palette={item.selectedStyle || "modern"} size={imgSize * 0.8} accessible={false} />
          )}
        </View>

        <Text style={styles.title} testID="admin-detail-title">{item.title}</Text>
        <Text style={styles.meta}>
          {item.ownerName ? `By ${item.ownerName}` : "Owner unknown"} · {reporterLabel(item.reporterCount)}
        </Text>
        {item.isHidden && <Text style={styles.hidden}>Hidden pending review</Text>}

        <Text style={styles.sectionTitle} accessibilityRole="header">Reports</Text>
        <View style={styles.listCard}>
          {details.map((d, i) => (
            <View key={`${d.createdAt}-${i}`} style={[styles.row, i > 0 && styles.rowBorder]} testID="admin-detail-report">
              <View style={styles.rowTop}>
                <Text style={styles.reason}>{reasonLabel(d.reason)}</Text>
                <Text style={styles.when}>{reportedAgo(d.createdAt, nowMs)}</Text>
              </View>
              {d.note ? (
                <Text style={styles.note} testID="admin-detail-note">“{d.note}”</Text>
              ) : (
                <Text style={styles.noNote}>No note</Text>
              )}
            </View>
          ))}
        </View>
        <Text style={styles.privacy}>Who reported is never shown.</Text>

        <View style={styles.actionsCard} testID="admin-detail-actions">
          {actionError && <Text style={styles.actionError}>{actionError}</Text>}
          <ModerationActions
            item={item}
            busy={busy}
            onAction={(kind) => (kind === "ban" ? setBanItem(item) : act(kind, item))}
          />
        </View>
      </ScrollView>
      <BanSheet item={banItem} onClose={() => setBanItem(null)} onConfirm={(target) => act("ban", target)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, alignItems: "stretch" },
  imageWrap: {
    alignSelf: "center",
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { ...fonts.title, marginTop: spacing.md },
  meta: { ...fonts.regular, marginTop: 2 },
  hidden: { ...fonts.label, marginTop: spacing.xs, color: "#8A6100" },
  sectionTitle: { ...fonts.label, color: colors.textSecondary, marginTop: spacing.lg, marginBottom: spacing.sm },
  listCard: { backgroundColor: colors.background, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  row: { padding: spacing.md },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  rowTop: { flexDirection: "row", justifyContent: "space-between" },
  reason: { ...fonts.label },
  when: { ...fonts.regular, fontSize: 13 },
  note: { ...fonts.body, marginTop: spacing.xs },
  noNote: { ...fonts.regular, marginTop: spacing.xs, fontStyle: "italic" },
  actionsCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    paddingTop: 0,
  },
  actionError: { ...fonts.label, color: colors.error, marginTop: spacing.md },
  privacy: { ...fonts.regular, fontSize: 12, marginTop: spacing.sm, textAlign: "center" },
});
