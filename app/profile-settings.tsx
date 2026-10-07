import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  Alert,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { useAuthStore } from "@/lib/store";

interface Setting {
  id: string;
  label: string;
  type: "toggle" | "link" | "action";
  enabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  url?: string;
  destructive?: boolean;
}

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const signOut = useAuthStore((s) => s.signOut);

  const [settings, setSettings] = useState({
    notifications: true,
    marketing: false,
    publicDefault: false,
    reduceMotion: false,
  });

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure? This will permanently delete your account, all projects, and designs. This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete My Account",
          style: "destructive",
          onPress: () => {
            // In production, this would call the delete account API
            Alert.alert("Account Deleted", "Your account has been scheduled for deletion.");
            signOut();
          },
        },
      ]
    );
  };

  const handleYourPrivacyChoices = () => {
    // In production, this would open the CCPA/GDPR privacy choices screen
    Alert.alert(
      "Your Privacy Choices",
      "Manage your privacy preferences including data sharing, targeted advertising, and data deletion rights.",
      [
        { text: "Do Not Sell My Info", onPress: () => {} },
        { text: "Manage Cookies", onPress: () => {} },
        { text: "Download My Data", onPress: () => {} },
        { text: "Close", style: "cancel" },
      ]
    );
  };

  const openLink = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.settingCard}>
            <Pressable
              style={styles.settingRow}
              onPress={() => toggleSetting("notifications")}
              accessibilityRole="switch"
              accessibilityState={{ checked: settings.notifications }}
            >
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Push Notifications</Text>
                <Text style={styles.settingDescription}>
                  Get updates about quotes and messages
                </Text>
              </View>
              <View style={[
                styles.switch,
                settings.notifications && styles.switchOn,
              ]}>
                <View style={[
                  styles.switchThumb,
                  settings.notifications && styles.switchThumbOn,
                ]} />
              </View>
            </Pressable>

            <View style={styles.separator} />

            <Pressable
              style={styles.settingRow}
              onPress={() => toggleSetting("marketing")}
              accessibilityRole="switch"
              accessibilityState={{ checked: settings.marketing }}
            >
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Marketing Emails</Text>
                <Text style={styles.settingDescription}>
                  Design tips, trends, and special offers
                </Text>
              </View>
              <View style={[
                styles.switch,
                settings.marketing && styles.switchOn,
              ]}>
                <View style={[
                  styles.switchThumb,
                  settings.marketing && styles.switchThumbOn,
                ]} />
              </View>
            </Pressable>
          </View>
        </View>

        {/* Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <View style={styles.settingCard}>
            <Pressable
              style={styles.settingRow}
              onPress={() => toggleSetting("publicDefault")}
              accessibilityRole="switch"
              accessibilityState={{ checked: settings.publicDefault }}
            >
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Public Projects by Default</Text>
                <Text style={styles.settingDescription}>
                  New projects visible in Explore (you can change per-project)
                </Text>
              </View>
              <View style={[
                styles.switch,
                settings.publicDefault && styles.switchOn,
              ]}>
                <View style={[
                  styles.switchThumb,
                  settings.publicDefault && styles.switchThumbOn,
                ]} />
              </View>
            </Pressable>

            <View style={styles.separator} />

            <Pressable
              style={styles.settingRow}
              onPress={handleYourPrivacyChoices}
            >
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Your Privacy Choices</Text>
                <Text style={styles.settingDescription}>
                  Manage data sharing and advertising preferences
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        {/* Accessibility Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accessibility</Text>
          <View style={styles.settingCard}>
            <Pressable
              style={styles.settingRow}
              onPress={() => toggleSetting("reduceMotion")}
              accessibilityRole="switch"
              accessibilityState={{ checked: settings.reduceMotion }}
            >
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Reduce Motion</Text>
                <Text style={styles.settingDescription}>
                  Minimize animations and transitions
                </Text>
              </View>
              <View style={[
                styles.switch,
                settings.reduceMotion && styles.switchOn,
              ]}>
                <View style={[
                  styles.switchThumb,
                  settings.reduceMotion && styles.switchThumbOn,
                ]} />
              </View>
            </Pressable>
          </View>
        </View>

        {/* Legal Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>
          <View style={styles.settingCard}>
            <Pressable
              style={styles.settingRow}
              onPress={() => openLink("https://visionbuild.app/terms")}
            >
              <Text style={styles.settingLabel}>Terms of Service</Text>
              <Ionicons name="open-outline" size={20} color={colors.textSecondary} />
            </Pressable>

            <View style={styles.separator} />

            <Pressable
              style={styles.settingRow}
              onPress={() => openLink("https://visionbuild.app/privacy")}
            >
              <Text style={styles.settingLabel}>Privacy Policy</Text>
              <Ionicons name="open-outline" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.dangerTitle]}>Danger Zone</Text>
          <Pressable
            style={[styles.settingCard, styles.dangerCard]}
            onPress={handleDeleteAccount}
          >
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, styles.dangerLabel]}>
                  Delete Account
                </Text>
                <Text style={styles.settingDescription}>
                  Permanently delete your account and all data
                </Text>
              </View>
              <Ionicons name="trash" size={20} color={colors.error} />
            </View>
          </Pressable>
        </View>

        {/* Version */}
        <Text style={styles.version}>VisionBuild v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...fonts.title,
    fontSize: 18,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...fonts.title,
    fontSize: 13,
    textTransform: "uppercase",
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  dangerTitle: {
    color: colors.error,
  },
  settingCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  dangerCard: {
    borderColor: colors.error + "40",
    backgroundColor: colors.error + "08",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    minHeight: 66,
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingLabel: {
    ...fonts.body,
    fontWeight: "600",
    marginBottom: 2,
  },
  dangerLabel: {
    color: colors.error,
  },
  settingDescription: {
    ...fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.md,
  },
  switch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    padding: 2,
    justifyContent: "center",
  },
  switchOn: {
    backgroundColor: colors.primary,
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  switchThumbOn: {
    transform: [{ translateX: 20 }],
  },
  version: {
    ...fonts.regular,
    textAlign: "center",
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
});
