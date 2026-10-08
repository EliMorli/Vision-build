import { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  Modal,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, spacing, radius } from "@/lib/theme";
import { licenses } from "@/lib/generated/licenses";

export default function LicensesScreen() {
  const [selectedLicense, setSelectedLicense] = useState<typeof licenses[0] | null>(null);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Open Source Licenses</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        <Text style={styles.intro}>
          VisionBuild is built with open-source software. Thank you to the following
          projects and their maintainers:
        </Text>

        {licenses.map((license, index) => (
          <Pressable
            key={index}
            style={styles.licenseItem}
            onPress={() => setSelectedLicense(license)}
          >
            <View style={styles.licenseInfo}>
              <Text style={styles.licenseName}>{license.name}</Text>
              <Text style={styles.licenseVersion}>{license.version}</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textSecondary}
            />
          </Pressable>
        ))}
      </ScrollView>

      <Modal
        visible={selectedLicense !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedLicense(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedLicense?.name || ""}
              </Text>
              <Pressable
                onPress={() => setSelectedLicense(null)}
                hitSlop={12}
              >
                <Ionicons name="close" size={28} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalVersion}>
                Version: {selectedLicense?.version || ""}
              </Text>
              <Text style={styles.modalLicense}>
                License: {selectedLicense?.license || ""}
              </Text>
              <Text style={styles.modalLicenseText}>
                {selectedLicense?.licenseText || ""}
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  headerTitle: {
    ...fonts.title,
    fontSize: 17,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  intro: {
    ...fonts.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  licenseItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  licenseInfo: {
    flex: 1,
  },
  licenseName: {
    ...fonts.body,
    fontSize: 15,
    marginBottom: 2,
  },
  licenseVersion: {
    ...fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...fonts.title,
    fontSize: 18,
    flex: 1,
  },
  modalBody: {
    padding: spacing.lg,
  },
  modalVersion: {
    ...fonts.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  modalLicense: {
    ...fonts.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  modalLicenseText: {
    ...fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: colors.textPrimary,
  },
});
