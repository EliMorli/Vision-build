import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, SafeAreaView, useWindowDimensions } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { AiGeneratedBadge, Button, EmptyState, IsoRoom, ReportModal } from "@/components";
import { useExploreStore } from "@/lib/store";

function styleName(style?: string | null): string {
  const s = style || "modern";
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/[-_]/g, " ");
}

/**
 * A public design opened from the Explore grid. Lives in Explore's stack, so
 * the tab bar stays visible with Explore highlighted, and back returns to the grid.
 */
export default function ExploreDesignScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const design = useExploreStore((s) => s.publicDesigns.find((p) => p.id === id));
  const { width } = useWindowDimensions();
  const [reportVisible, setReportVisible] = useState(false);
  const [message, setMessage] = useState("");
  const imageSize = Math.min(width - spacing.lg * 2, 480);

  if (!design) {
    return (
      <SafeAreaView style={styles.container} testID="explore-detail-missing">
        <EmptyState
          icon="images-outline"
          title="Design not available"
          subtitle="It may have been made private. Go back to Explore to see more designs."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} testID="explore-detail-screen">
      <ReportModal
        visible={reportVisible}
        onClose={() => setReportVisible(false)}
        onSuccess={() => {
          setMessage("Thank you for reporting. We'll review this design.");
          setTimeout(() => setMessage(""), 3000);
        }}
        onError={(error) => {
          setMessage(error);
          setTimeout(() => setMessage(""), 3000);
        }}
        type="design"
        itemId={design.id}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.imageWrapper, { width: imageSize, height: imageSize }]}>
          <IsoRoom
            palette={design.selected_style || "modern"}
            size={imageSize}
            accessibilityLabel={`${design.title || "Design"}, ${styleName(design.selected_style)} style`}
          />
          <AiGeneratedBadge style={{ top: 12, left: 12 }} testID="explore-detail-ai-badge" />
        </View>
        <Text style={styles.title} accessibilityRole="header" testID="explore-detail-title">
          {design.title || "Design"}
        </Text>
        <Text style={styles.style}>{styleName(design.selected_style)} style</Text>
        {message ? (
          <Text style={styles.message} accessibilityLiveRegion="polite" testID="explore-detail-message">
            {message}
          </Text>
        ) : null}
        <Button
          label="Report this design"
          icon="flag-outline"
          variant="outline"
          onPress={() => setReportVisible(true)}
          testID="explore-detail-report"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: spacing.lg, alignItems: "center", gap: spacing.sm },
  imageWrapper: {
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: "#F4F6FE",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { ...fonts.title, marginTop: spacing.md, textAlign: "center" },
  style: { ...fonts.regular, fontSize: 16, marginBottom: spacing.md },
  message: { ...fonts.regular, color: colors.textPrimary, textAlign: "center" },
});
