import { useState, useMemo } from "react";
import {
  SafeAreaView,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  Modal,
  Platform,
  TextInput,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, spacing, radius } from "@/lib/theme";
import { licenses, LICENSE_TEXTS } from "@/lib/generated/licenses";

export default function LicensesScreen() {
  const [selectedLicense, setSelectedLicense] = useState<typeof licenses[0] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLicenses = useMemo(() => {
    if (!searchQuery.trim()) return licenses;
    
    const query = searchQuery.toLowerCase();
    return licenses.filter(license => 
      license.name.toLowerCase().includes(query) ||
      license.license.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const getLicenseText = (license: typeof licenses[0]) => {
    if (!license.textId) {
      return `License: ${license.license}\n\nFull license text not available.`;
    }
    
    const text = LICENSE_TEXTS[license.textId] || '';
    
    // Only prepend copyright if it's not already in the text
    if (license.copyright && !text.includes(license.copyright)) {
      return license.copyright + '\n\n' + text;
    }
    
    return text;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Open Source Licenses</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search packages..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery("")} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>

      <FlatList
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        testID="licenses-list"
        data={filteredLicenses}
        keyExtractor={(item) => `${item.name}@${item.version}`}
        ListHeaderComponent={
          <Text style={styles.intro}>
            VisionBuild is built with open-source software. Thank you to the following
            projects and their maintainers:
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No packages found</Text>
          </View>
        }
        renderItem={({ item: license }) => (
          <Pressable
            style={styles.licenseItem}
            onPress={() => setSelectedLicense(license)}
            testID={`license-item-${license.name}@${license.version}`}
          >
            <View style={styles.licenseInfo}>
              <Text style={styles.licenseName}>{license.name}</Text>
              <View style={styles.licenseMetaRow}>
                <Text style={styles.licenseVersion}>v{license.version}</Text>
                <Text style={styles.licenseDot}> • </Text>
                <Text style={styles.licenseType}>{license.license}</Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textSecondary}
            />
          </Pressable>
        )}
      />

      <Modal
        visible={selectedLicense !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedLicense(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {selectedLicense?.name || ""}
                </Text>
                <View style={styles.modalMetaRow}>
                  <Text style={styles.modalVersion}>
                    v{selectedLicense?.version || ""}
                  </Text>
                  <Text style={styles.modalDot}> • </Text>
                  <Text style={styles.modalLicense}>
                    {selectedLicense?.license || ""}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => setSelectedLicense(null)}
                hitSlop={12}
              >
                <Ionicons name="close" size={28} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} testID="license-text">
              <Text style={styles.modalLicenseText}>
                {selectedLicense ? getLicenseText(selectedLicense) : ""}
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : spacing.xs,
    backgroundColor: colors.border,
    borderRadius: radius.md,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...fonts.body,
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: spacing.xs,
  },
  clearButton: {
    padding: spacing.xs,
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
    marginBottom: 4,
  },
  licenseMetaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  licenseVersion: {
    ...fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  licenseDot: {
    ...fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  licenseType: {
    ...fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  emptyState: {
    paddingVertical: spacing.xl * 2,
    alignItems: "center",
  },
  emptyStateText: {
    ...fonts.body,
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
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...fonts.title,
    fontSize: 18,
    marginBottom: 4,
  },
  modalMetaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalVersion: {
    ...fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
  },
  modalDot: {
    ...fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
  },
  modalLicense: {
    ...fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
  },
  modalBody: {
    padding: spacing.lg,
  },
  modalLicenseText: {
    ...fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: colors.textPrimary,
  },
});
