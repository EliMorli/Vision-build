import { useState, useEffect } from "react";
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
import { useAuthStore, usePrivacyStore } from "@/lib/store";
import { SUPPORT_EMAIL } from "@/lib/config";
import { supabase } from "@/lib/supabase";

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
  const { privacyOptOut, reduceMotion, loadPrivacySettings, setPrivacyOptOut, setReduceMotion } = usePrivacyStore();

  const [settings, setSettings] = useState({
    notifications: true,
    marketing: false,
    publicDefault: false,
  });

  useEffect(() => {
    loadPrivacySettings();
  }, []);

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePrivacyOptOut = async (optOut: boolean) => {
    await setPrivacyOptOut(optOut);
  };

  const handleReduceMotion = async (reduce: boolean) => {
    await setReduceMotion(reduce);
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
          onPress: async () => {
            if (__DEV__ && process.env.EXPO_PUBLIC_DEV_MOCK_SESSION === "true") {
              Alert.alert("Account Deleted", "Your account has been scheduled for deletion.");
              signOut();
              return;
            }

            try {
              const { error } = await supabase.functions.invoke("delete-account");
              
              if (error) throw error;
              
              await signOut();
            } catch (err: any) {
              Alert.alert(
                "Error",
                "Failed to delete account. Please try again or contact support.",
                [{ text: "OK" }]
              );
            }
          },
        },
      ]
    );
  };

  const handleRequestData = () => {
    if (SUPPORT_EMAIL) {
      Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Data Request - VisionBuild&body=I would like to request a copy of my personal data.`);
    } else {
      router.push("/profile-settings");
    }
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
          </View>
        </View>

        {/* Your Privacy Choices */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Privacy Choices</Text>
          <View style={styles.privacyCard}>
            <Text style={styles.privacyDescription}>
              We don't sell your personal information or run targeted ads. Your photos and chats 
              go to our AI partners (OpenAI and Replicate) only to create your designs.
            </Text>
            
            <Pressable
              style={styles.settingRow}
              onPress={() => handlePrivacyOptOut(!privacyOptOut)}
              accessibilityRole="switch"
              accessibilityState={{ checked: privacyOptOut }}
            >
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Opt out of sharing</Text>
                <Text style={styles.settingDescription}>
                  Disable sharing data with AI partners (design generation won't work)
                </Text>
              </View>
              <View style={[
                styles.switch,
                privacyOptOut && styles.switchOn,
              ]}>
                <View style={[
                  styles.switchThumb,
                  privacyOptOut && styles.switchThumbOn,
                ]} />
              </View>
            </Pressable>

            <View style={styles.separator} />

            <Pressable
              style={styles.settingRow}
              onPress={handleRequestData}
            >
              <Text style={styles.settingLabel}>Request my data or deletion</Text>
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
              onPress={() => handleReduceMotion(!reduceMotion)}
              accessibilityRole="switch"
              accessibilityState={{ checked: reduceMotion }}
            >
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Reduce Motion</Text>
                <Text style={styles.settingDescription}>
                  Minimize animations and transitions
                </Text>
              </View>
              <View style={[
                styles.switch,
                reduceMotion && styles.switchOn,
              ]}>
                <View style={[
                  styles.switchThumb,
                  reduceMotion && styles.switchThumbOn,
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
  privacyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  privacyDescription: {
    ...fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    padding: spacing.md,
    backgroundColor: colors.primary + "08",
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
