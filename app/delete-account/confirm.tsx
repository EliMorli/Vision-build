// Web route: /delete-account/confirm?token=...
// GET: Validates token and shows confirmation page (does NOT delete)
// POST: Executes actual deletion when user presses button

import { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Platform, Linking } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as AppleAuthentication from "expo-apple-authentication";
import { SUPPORT_EMAIL } from "../../lib/config";
import { colors, fonts } from "../../lib/theme";
import { supabase } from "@/lib/supabase";
import { DELETED_DATA_SUMMARY } from "../../lib/constants/deletion";
import DeletedAccountView from "../../components/DeletedAccountView";

type PageState = "loading" | "valid" | "error" | "deleting" | "deleted";

interface PageData {
  email?: string;
  error?: string;
  expired?: boolean;
  used?: boolean;
  canRetry?: boolean;
  isAppleUser?: boolean;
  needsManualDisconnect?: boolean;
}

export default function DeleteAccountConfirm() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const [state, setState] = useState<PageState>("loading");
  const [data, setData] = useState<PageData>({});

  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState("error");
      setData({ error: "Missing confirmation token" });
      return;
    }
    
    let cancelled = false;
    
    const validateToken = async () => {
      try {
        // Use fetch directly to pass token as query param
        const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace("/rest/v1", "") || "";
        const response = await fetch(
          `${baseUrl}/functions/v1/confirm-account-deletion?token=${encodeURIComponent(token as string)}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
            },
          }
        );

        const validationResult = await response.json();

        if (cancelled) return;

        if (response.ok && validationResult.valid) {
          setState("valid");
          setData({ 
            email: validationResult.email,
            isAppleUser: validationResult.isAppleUser,
          });
        } else {
          setState("error");
          setData({
            error: validationResult.error || "Invalid confirmation link",
            expired: validationResult.expired,
            used: validationResult.used,
          });
        }
      } catch (error: any) {
        if (cancelled) return;
        console.error("Token validation error:", error);
        setState("error");
        setData({ error: "Failed to validate confirmation link" });
      }
    };

    validateToken();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const executeDelete = async () => {
    setState("deleting");

    try {
      let appleAuthCode: string | undefined;

      // Try to get Apple authorization code if this is an Apple user
      // On web/Android, this will be skipped (logged on server)
      if (data.isAppleUser && Platform.OS === "ios") {
        try {
          const isAvailable = await AppleAuthentication.isAvailableAsync();
          
          if (isAvailable) {
            const credential = await AppleAuthentication.signInAsync({
              requestedScopes: [],
            });
            appleAuthCode = credential.authorizationCode || undefined;
          }
        } catch (appleError: any) {
          console.log("Apple authorization cancelled or failed:", appleError.code);
          // Continue with deletion even if Apple auth fails
        }
      }

      const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace("/rest/v1", "") || "";
      const response = await fetch(
        `${baseUrl}/functions/v1/confirm-account-deletion?token=${encodeURIComponent(token as string)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ appleAuthCode }),
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        setState("deleted");
        setData({ 
          needsManualDisconnect: result.needsManualDisconnect,
          isAppleUser: data.isAppleUser 
        });
      } else {
        setState("error");
        setData({
          error: result.error || "Failed to delete account",
          expired: result.expired,
          used: result.used,
          canRetry: result.canRetry,
        });
      }
    } catch (error: any) {
      console.error("Deletion error:", error);
      setState("error");
      setData({ error: "Failed to delete account. Please try again.", canRetry: false });
    }
  };

  const handleKeepAccount = () => {
    if (Platform.OS === "web") {
      // Close the window/tab
      window.close();
    } else {
      // Navigate back to home
      router.replace("/");
    }
  };

  if (state === "loading") {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color="#1A73E8" />
          <Text style={styles.loadingText}>Validating confirmation link...</Text>
        </View>
      </View>
    );
  }

  const handleDone = async () => {
    try {
      // Sign out locally (may fail if session already gone)
      await supabase.auth.signOut();
    } catch (error) {
      // Ignore sign-out errors (account is already deleted)
      console.log("Sign out error (expected after deletion):", error);
    }
    // Navigate to welcome/intro screen
    router.replace("/");
  };

  if (state === "deleted") {
    return (
      <DeletedAccountView
        showNativeActions={Platform.OS !== "web"}
        isAppleUser={data.isAppleUser || false}
        onDone={handleDone}
      />
    );
  }

  if (state === "error") {
    const showRequestNew = data.expired || data.used;
    const canRetry = data.canRetry === true;
    
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>
            {data.expired
              ? "Link expired"
              : data.used
              ? "Already deleted"
              : canRetry
              ? "Deletion incomplete"
              : "Invalid link"}
          </Text>
          <Text style={styles.body}>{data.error}</Text>
          {canRetry && (
            <>
              <Text style={styles.bodySecondary}>
                We'll also keep trying automatically, so you don't need to do anything else.
              </Text>
              <Pressable
                style={styles.buttonDanger}
                onPress={executeDelete}
                testID="delete-retry-button"
              >
                <Text style={styles.buttonText}>Try again</Text>
              </Pressable>
              <Pressable onPress={() => {
                const supportUrl = `mailto:${SUPPORT_EMAIL || "support@visionbuild.app"}`;
                Linking.openURL(supportUrl).catch((err) => {
                  console.error("Failed to open support link:", err);
                });
              }}>
                <Text style={styles.linkText}>Contact support</Text>
              </Pressable>
            </>
          )}
          {showRequestNew && !canRetry && (
            <Pressable
              style={styles.buttonSecondary}
              onPress={() => router.replace("/delete-account")}
            >
              <Text style={styles.buttonSecondaryText}>Request a new link</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  if (state === "deleting") {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color="#EA4335" />
          <Text style={styles.loadingText}>Deleting your account...</Text>
          <Text style={styles.bodySecondary}>This may take a moment.</Text>
        </View>
      </View>
    );
  }

  // state === "valid" - show confirmation
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.email}>{data.email}</Text>
        <Text style={styles.title}>Delete your account?</Text>
        <Text style={styles.warning}>
          Your {DELETED_DATA_SUMMARY} will be deleted, including your posts on Explore. Remixes other
          people made stay with them.
        </Text>
        {data.isAppleUser && Platform.OS === "ios" && (
          <Text style={styles.appleNote}>
            Apple may ask you to confirm. Your account gets deleted either way.
          </Text>
        )}

        <Pressable
          style={styles.buttonDanger}
          onPress={executeDelete}
          testID="delete-confirm-button"
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>Delete my account</Text>
        </Pressable>

        <Pressable onPress={handleKeepAccount}>
          <Text style={styles.linkText}>Keep my account</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: 24,
    padding: 32,
    maxWidth: 480,
    width: "100%",
    shadowColor: "#1E2859",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    alignItems: "center",
  },
  email: {
    ...fonts.title,
    fontSize: 16,
    fontFamily: "Nunito_800ExtraBold",
    color: colors.textSecondary,
    marginBottom: 12,
  },
  title: {
    ...fonts.heading,
    fontSize: 28,
    fontFamily: "Nunito_900Black",
    textAlign: "center",
    marginBottom: 16,
  },
  body: {
    ...fonts.body,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 20,
  },
  bodySecondary: {
    ...fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 20,
  },
  warning: {
    ...fonts.body,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 16,
  },
  appleNote: {
    ...fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
    fontStyle: "italic",
  },
  loadingText: {
    ...fonts.label,
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: colors.textSecondary,
    marginTop: 16,
  },
  buttonDanger: {
    backgroundColor: colors.error,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 32,
    minWidth: 240,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#B3261E",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderWidth: 2,
    borderColor: colors.border,
    marginTop: 12,
  },
  buttonSecondaryText: {
    ...fonts.label,
    fontFamily: "Nunito_800ExtraBold",
    color: colors.primary,
    fontSize: 15,
  },
  buttonText: {
    ...fonts.button,
    fontFamily: "Nunito_900Black",
    color: "#fff",
    fontSize: 16,
    letterSpacing: 0.2,
  },
  linkText: {
    ...fonts.label,
    fontFamily: "Nunito_800ExtraBold",
    color: colors.primary,
    fontSize: 15,
    textDecorationLine: "underline",
  },
});
