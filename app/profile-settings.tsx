import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  Linking,
  Switch,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { useAuthStore, usePrivacyStore, useSettingsStore } from "@/lib/store";
import { SUPPORT_EMAIL } from "@/lib/config";
import { supabase } from "@/lib/supabase";
import { ConfirmationSheet } from "@/components";
import { DELETED_DATA_SUMMARY } from "@/lib/constants/deletion";
import { wipeOfflineCache } from "@/lib/offline-cache";

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const signOut = useAuthStore((s) => s.signOut);
  const { privacyOptOut, loadPrivacySettings, setPrivacyOptOut } = usePrivacyStore();
  const {
    pushNotifications,
    marketingEmails,
    publicProjectsDefault,
    reduceMotion,
    loadSettings,
    updateSetting,
  } = useSettingsStore();

  const [prosWaitlist, setProsWaitlist] = useState(false);
  const [checkingWaitlist, setCheckingWaitlist] = useState(true);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const checkProsWaitlist = useCallback(async () => {
    const userId = useAuthStore.getState().session?.user?.id;
    
    if (__DEV__ && process.env.EXPO_PUBLIC_DEV_MOCK_SESSION === "true") {
      const stored = await AsyncStorage.getItem("@visionbuild:waitlist:general");
      setProsWaitlist(stored === "true");
      setCheckingWaitlist(false);
      return;
    }

    if (!userId) {
      setCheckingWaitlist(false);
      return;
    }

    try {
      const { data } = await (supabase
        .from("pro_waitlist") as any)
        .select("id")
        .eq("user_id", userId)
        .is("project_id", null)
        .single();

      setProsWaitlist(!!data);
    } catch (_err) {
      console.error("pros_waitlist_check_failed");
    } finally {
      setCheckingWaitlist(false);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      await loadPrivacySettings();
      await loadSettings();
      await checkProsWaitlist();
    };
    load();
  }, [loadPrivacySettings, loadSettings, checkProsWaitlist]);

  const handleProsWaitlist = async (enabled: boolean) => {
    const userId = useAuthStore.getState().session?.user?.id;
    const userProfile = useAuthStore.getState().profile;
    const email = userProfile?.email || "";

    if (__DEV__ && process.env.EXPO_PUBLIC_DEV_MOCK_SESSION === "true") {
      if (enabled) {
        await AsyncStorage.setItem("@visionbuild:waitlist:general", "true");
      } else {
        // Delete all waitlist entries in mock mode
        const keys = await AsyncStorage.getAllKeys();
        const waitlistKeys = keys.filter(key => key.startsWith("@visionbuild:waitlist:"));
        await AsyncStorage.multiRemove(waitlistKeys);
      }
      setProsWaitlist(enabled);
      return;
    }

    if (!userId) return;

    try {
      if (enabled) {
        // Join general waitlist
        const { error } = await (supabase
          .from("pro_waitlist") as any)
          .insert({
            user_id: userId,
            project_id: null,
            email,
          });

        if (!error) {
          setProsWaitlist(true);
        }
      } else {
        // Delete ALL user's waitlist entries
        const { error } = await (supabase
          .from("pro_waitlist") as any)
          .delete()
          .eq("user_id", userId);

        if (!error) {
          setProsWaitlist(false);
        }
      }
    } catch (_err) {
      console.error("pros_waitlist_update_failed");
    }
  };

  const handlePrivacyOptOut = async (optOut: boolean) => {
    if (optOut) {
      // Revoke AI consent on the server
      try {
        if (!(__DEV__ && process.env.EXPO_PUBLIC_DEV_MOCK_SESSION === "true")) {
          const { error } = await supabase.functions.invoke("revoke-ai-consent");
          if (error) {
            console.error("ai_consent_revoke_failed");
            setErrorMessage("Could not revoke AI consent. Please try again.");
            setTimeout(() => setErrorMessage(""), 3000);
            return;
          }
        }
      } catch (_err) {
        console.error("ai_consent_revoke_call_failed");
        setErrorMessage("Could not revoke AI consent. Please try again.");
        setTimeout(() => setErrorMessage(""), 3000);
        return;
      }
    }
    await setPrivacyOptOut(optOut);
  };

  const handleDeleteAccount = () => {
    setDeleteConfirmVisible(true);
  };

  const confirmDeleteAccount = async () => {
    const profile = useAuthStore.getState().profile;
    const userId = profile?.id;
    const isAppleUser = profile?.email?.endsWith('@privaterelay.appleid.com') || false;
    
    if (__DEV__ && process.env.EXPO_PUBLIC_DEV_MOCK_SESSION === "true") {
      // Record mock delete call for E2E testing
      if (typeof window !== 'undefined') {
        (window as any).__VB_MOCK_DELETE_CALLS__ = (window as any).__VB_MOCK_DELETE_CALLS__ || [];
        (window as any).__VB_MOCK_DELETE_CALLS__.push({
          timestamp: new Date().toISOString(),
          userId: profile?.id
        });
      }
      
      // Wipe offline cache BEFORE navigating to deleted screen
      if (userId) {
        try {
          await wipeOfflineCache(userId);
        } catch (error) {
          console.error("offline_cache_deletion_wipe_failed");
        }
      }
      
      // Sign out and set mock signed-out flag
      await signOut();
      
      // Navigate to deleted screen
      router.replace({
        pathname: '/deleted-account' as any,
        params: { variant: isAppleUser ? 'apple' : 'email' }
      });
      return;
    }

    try {
      const { error } = await supabase.functions.invoke("delete-account");
      
      if (error) throw error;
      
      // Wipe offline cache BEFORE navigating to deleted screen
      if (userId) {
        try {
          await wipeOfflineCache(userId);
        } catch (error) {
          console.error("offline_cache_deletion_wipe_failed");
        }
      }
      
      await signOut();
      
      // Navigate to deleted screen
      router.replace({
        pathname: '/deleted-account' as any,
        params: { variant: isAppleUser ? 'apple' : 'email' }
      });
    } catch {
      setErrorMessage("Failed to delete account");
      setTimeout(() => setErrorMessage(""), 3000);
    }
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
      <ConfirmationSheet
        visible={deleteConfirmVisible}
        onClose={() => setDeleteConfirmVisible(false)}
        title="Delete Account"
        message={`Are you sure? This will permanently delete your account and ${DELETED_DATA_SUMMARY}. This action cannot be undone.`}
        confirmLabel="Delete My Account"
        confirmVariant="danger"
        onConfirm={confirmDeleteAccount}
        testID="delete-account-confirm"
      />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Pros Waitlist</Text>
                <Text style={styles.settingDescription}>
                  Get notified when local pros can quote your projects
                </Text>
              </View>
              <Switch
                value={prosWaitlist}
                onValueChange={handleProsWaitlist}
                disabled={checkingWaitlist}
                testID="settings-pros-waitlist-toggle"
                accessibilityLabel="Pros Waitlist"
                trackColor={{ false: colors.border, true: colors.success }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

        {/* Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <View style={styles.settingCard}>
            <Pressable
              style={styles.settingRow}
              onPress={() => updateSetting("publicProjectsDefault", !publicProjectsDefault)}
              accessibilityRole="switch"
              accessibilityState={{ checked: publicProjectsDefault }}
              accessibilityLabel={`Public Projects by Default, ${publicProjectsDefault ? "on" : "off"}. New projects visible in Explore.`}
            >
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Public Projects by Default</Text>
                <Text style={styles.settingDescription}>
                  New projects visible in Explore (you can change per-project)
                </Text>
              </View>
              <View style={[
                styles.switch,
                publicProjectsDefault && styles.switchOn,
              ]}>
                <View style={[
                  styles.switchThumb,
                  publicProjectsDefault && styles.switchThumbOn,
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
              are sent through OpenRouter only to AI providers that don't keep or train on your data, 
              and only to create your designs.
            </Text>
            
            <Pressable
              style={styles.settingRow}
              onPress={() => handlePrivacyOptOut(!privacyOptOut)}
              accessibilityRole="switch"
              accessibilityState={{ checked: privacyOptOut }}
              accessibilityLabel={`Opt out of AI processing, ${privacyOptOut ? "on" : "off"}. When on, design generation and chat won't work.`}
            >
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Opt out of AI processing</Text>
                <Text style={styles.settingDescription}>
                  Disable AI processing (design generation and chat won't work)
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
              accessibilityRole="button"
              accessibilityLabel="Request my data or deletion"
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
              onPress={() => updateSetting("reduceMotion", !reduceMotion)}
              accessibilityRole="switch"
              accessibilityState={{ checked: reduceMotion }}
              accessibilityLabel={`Reduce Motion, ${reduceMotion ? "on" : "off"}. Minimize animations and transitions.`}
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
              accessibilityRole="button"
              accessibilityLabel="Terms of Service, opens in browser"
            >
              <Text style={styles.settingLabel}>Terms of Service</Text>
              <Ionicons name="open-outline" size={20} color={colors.textSecondary} />
            </Pressable>

            <View style={styles.separator} />

            <Pressable
              style={styles.settingRow}
              onPress={() => openLink("https://visionbuild.app/privacy")}
              accessibilityRole="button"
              accessibilityLabel="Privacy Policy, opens in browser"
            >
              <Text style={styles.settingLabel}>Privacy Policy</Text>
              <Ionicons name="open-outline" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.dangerTitle]}>Danger Zone</Text>
          <View style={styles.settingCard}>
            <Pressable
              style={styles.settingRow}
              onPress={() => {
                router.back();
                useAuthStore.getState().signOut();
              }}
              accessibilityRole="button"
              accessibilityLabel="Sign out of your account"
            >
              <Text style={styles.settingLabel}>Sign out</Text>
              <Ionicons name="log-out-outline" size={20} color={colors.textSecondary} />
            </Pressable>
            
            <View style={styles.separator} />
            
            <Pressable
              style={styles.settingRow}
              onPress={handleDeleteAccount}
              accessibilityRole="button"
              accessibilityLabel="Delete Account. Permanently delete your account and all data."
              testID="delete-account-button"
            >
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, styles.dangerLabel]}>
                  Delete Account
                </Text>
                <Text style={styles.settingDescription}>
                  Permanently delete your account and all data
                </Text>
              </View>
              <Ionicons name="trash" size={20} color={colors.error} />
            </Pressable>
          </View>
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
  errorBanner: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    borderRadius: radius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  errorText: {
    ...fonts.body,
    color: colors.error,
  },
});
