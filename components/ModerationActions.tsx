import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fonts } from "@/lib/theme";
import { Button } from "./Button";
import { ConfirmationSheet } from "./ConfirmationSheet";
import { banCountLine, banTitle, type QueueItem } from "@/lib/moderation/queue";
import type { CardAction } from "@/lib/moderation/actions";

/**
 * Action row for a reported design, shared by the queue card and the detail
 * screen: Hide / Dismiss, or Keep hidden / Restore when auto-hidden, plus the
 * ban link.
 */
export function ModerationActions({
  item,
  busy,
  onAction,
}: {
  item: QueueItem;
  busy: boolean;
  onAction: (kind: CardAction) => void;
}) {
  return (
    <View>
      <View style={styles.actions}>
        {item.isHidden ? (
          <>
            <Button label="Keep hidden" variant="primary" fullWidth={false} disabled={busy}
              onPress={() => onAction("keep")} style={styles.actionButton} testID="admin-keep-hidden-button" />
            <Button label="Restore" variant="outline" fullWidth={false} disabled={busy}
              onPress={() => onAction("restore")} style={styles.actionButton} testID="admin-restore-button" />
          </>
        ) : (
          <>
            <Button label="Hide" accessibilityLabel="Hide design" icon="eye-off-outline" variant="primary"
              fullWidth={false} disabled={busy} onPress={() => onAction("hide")} style={styles.actionButton}
              testID="admin-hide-button" />
            <Button label="Dismiss" variant="outline" fullWidth={false} disabled={busy}
              onPress={() => onAction("dismiss")} style={styles.actionButton} testID="admin-dismiss-button" />
          </>
        )}
      </View>
      {item.ownerId && !item.ownerBanned && (
        <Pressable
          onPress={() => onAction("ban")}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={item.ownerName ? `Ban ${item.ownerName} from publishing` : "Ban the owner from publishing"}
          style={styles.banRow}
          hitSlop={8}
          testID="admin-ban-button"
        >
          <Ionicons name="ban-outline" size={16} color={colors.error} />
          <Text style={styles.banText}>Ban owner from publishing</Text>
        </Pressable>
      )}
    </View>
  );
}

/**
 * Ban confirmation. Name and count come only from the `item` passed in, which
 * is the card (or detail) whose ban link was tapped.
 */
export function BanSheet({
  item,
  onClose,
  onConfirm,
}: {
  item: QueueItem | null;
  onClose: () => void;
  onConfirm: (item: QueueItem) => void;
}) {
  if (!item) return null;
  return (
    <ConfirmationSheet
      key={item.projectId}
      visible
      onClose={onClose}
      title={banTitle(item.ownerName)}
      message={`${banCountLine(item.ownerPublicCount)} They can't make new ones public.`}
      confirmLabel="Ban from publishing"
      confirmVariant="danger"
      onConfirm={() => onConfirm(item)}
      testID="admin-confirm-sheet"
    />
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  actionButton: { flex: 1 },
  banRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.md, alignSelf: "center" },
  banText: { ...fonts.label, color: colors.error },
});
