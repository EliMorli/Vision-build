import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  SafeAreaView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { useProjectStore, useAuthStore } from "@/lib/store";
import { Button, ProgressBar } from "@/components";
import { AI_CONSENT_VERSION } from "@/lib/config";

const AI_CONSENT_VERSION_KEY = "@visionbuild:ai_consent_version";

export default function CameraScreen() {
  const router = useRouter();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const { loading, progress, progressMessage, error, uploadAndAnalyze } =
    useProjectStore();
  const session = useAuthStore((s) => s.session);

  const checkAIConsent = async (): Promise<{ hasConsent: boolean; reason?: "never" | "outdated" }> => {
    try {
      const storedVersion = await AsyncStorage.getItem(AI_CONSENT_VERSION_KEY);
      if (!storedVersion) {
        return { hasConsent: false, reason: "never" };
      }
      if (storedVersion !== AI_CONSENT_VERSION) {
        return { hasConsent: false, reason: "outdated" };
      }
      return { hasConsent: true };
    } catch {
      return { hasConsent: false, reason: "never" };
    }
  };

  const pickImage = async (useCamera: boolean) => {
    // Request permissions
    let permissionResult;
    
    if (useCamera) {
      permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    } else {
      permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    }

    if (!permissionResult.granted) {
      Alert.alert(
        "Permission Required",
        useCamera
          ? "Camera permission is required to take photos. Please enable it in your device settings."
          : "Photo library permission is required to select photos. Please enable it in your device settings.",
        [{ text: "OK" }]
      );
      return;
    }

    const method = useCamera
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;

    const result = await method({
      mediaTypes: ["images"],
      quality: 0.9,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleAnalyze = async () => {
    if (!imageUri || !session) return;

    // Check AI consent before proceeding
    const consentCheck = await checkAIConsent();
    if (!consentCheck.hasConsent) {
      // Set up pending consent state with correct reason
      useProjectStore.getState().setPendingConsent({
        reason: consentCheck.reason!,
        resume: {
          type: "analyze",
          imageUri,
        },
      });
      // Navigate to consent screen
      router.push("/ai-consent");
      return;
    }

    const project = await uploadAndAnalyze(imageUri);
    if (project) {
      router.push(`/editor/${project.id}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Quick tips */}
      {!imageUri && (
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>Quick Tips</Text>
          <View style={styles.tipRow}>
            <Ionicons name="sunny-outline" size={16} color={colors.primary} />
            <Text style={styles.tipText}>Good lighting works best</Text>
          </View>
          <View style={styles.tipRow}>
            <Ionicons name="expand-outline" size={16} color={colors.primary} />
            <Text style={styles.tipText}>Shoot from a corner</Text>
          </View>
          <View style={styles.tipRow}>
            <Ionicons name="layers-outline" size={16} color={colors.primary} />
            <Text style={styles.tipText}>Include the floor and a wall</Text>
          </View>
        </View>
      )}

      {/* Image preview area */}
      <View style={styles.previewArea}>
        {imageUri ? (
          <Pressable onPress={() => !loading && pickImage(false)} style={styles.imageFill}>
            <Image source={{ uri: imageUri }} style={styles.image} />
            {!loading && (
              <View style={styles.retapHint}>
                <Ionicons name="refresh" size={14} color="#fff" />
                <Text style={styles.retapText}>Tap to change</Text>
              </View>
            )}
          </Pressable>
        ) : (
          <Pressable style={styles.placeholder} onPress={() => pickImage(false)}>
            <View style={styles.placeholderIcon}>
              <Ionicons name="image-outline" size={48} color={colors.primary} />
            </View>
            <Text style={styles.placeholderTitle}>Add a Room Photo</Text>
            <Text style={styles.placeholderSub}>
              Take a photo or choose from your gallery
            </Text>
          </Pressable>
        )}
      </View>

      {/* Progress bar when loading */}
      {loading && (
        <View style={styles.progressWrap}>
          <ProgressBar progress={progress} message={progressMessage} />
        </View>
      )}

      {/* Error */}
      {error && <Text style={styles.error}>{error}</Text>}

      {/* Action buttons */}
      {!loading && (
        <View style={styles.buttons}>
          {imageUri ? (
            <Button
              label="Analyze Room"
              icon="sparkles"
              onPress={handleAnalyze}
              variant="primary"
            />
          ) : (
            <View style={styles.buttonRow}>
              <Pressable
                style={styles.cameraButton}
                onPress={() => pickImage(true)}
                accessibilityRole="button"
                accessibilityLabel="Take photo with camera"
              >
                <View style={styles.cameraButtonInner}>
                  <Ionicons name="camera" size={28} color="#fff" />
                </View>
                <Text style={styles.cameraButtonText}>Camera</Text>
              </Pressable>
              <Pressable
                style={styles.galleryButton}
                onPress={() => pickImage(false)}
                accessibilityRole="button"
                accessibilityLabel="Choose from gallery"
              >
                <View style={styles.galleryButtonInner}>
                  <Ionicons name="images" size={28} color={colors.primary} />
                </View>
                <Text style={styles.galleryButtonText}>Gallery</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: spacing.lg },
  tipsContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  tipText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  previewArea: { flex: 1, marginBottom: spacing.md },
  imageFill: { flex: 1, borderRadius: radius.lg, overflow: "hidden" },
  image: { flex: 1 },
  retapHint: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  retapText: { color: "#fff", fontSize: 12 },
  placeholder: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.primary + "4D",
    borderStyle: "dashed",
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  placeholderIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary + "12",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderTitle: { ...fonts.title, fontSize: 18 },
  placeholderSub: { ...fonts.regular, textAlign: "center" },
  progressWrap: { marginBottom: spacing.md },
  error: {
    color: colors.error,
    fontSize: 13,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  buttons: { paddingBottom: spacing.sm },
  buttonRow: { 
    flexDirection: "row", 
    gap: spacing.md,
    justifyContent: "center",
  },
  cameraButton: {
    alignItems: "center",
    gap: spacing.xs,
  },
  cameraButtonInner: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderBottomWidth: 5,
    borderBottomColor: "#0F4FB0",
  },
  cameraButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  galleryButton: {
    alignItems: "center",
    gap: spacing.xs,
  },
  galleryButtonInner: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 3,
    borderColor: colors.border,
    borderBottomWidth: 5,
  },
  galleryButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },
});
