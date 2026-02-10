import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { useProjectStore } from "@/lib/store";

export default function CameraScreen() {
  const router = useRouter();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const { loading, progress, progressMessage, error, uploadAndAnalyze } =
    useProjectStore();

  const pickImage = async (useCamera: boolean) => {
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
    if (!imageUri) return;

    const project = await uploadAndAnalyze(imageUri);
    if (project) {
      router.push(`/editor/${project.id}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={fonts.body}>
        Take a photo or upload an image of the room you want to renovate.
      </Text>

      {/* Image preview */}
      <View style={styles.preview}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <Pressable
            style={styles.placeholder}
            onPress={() => pickImage(false)}
          >
            <Ionicons
              name="add-circle-outline"
              size={64}
              color={colors.primary + "80"}
            />
            <Text style={[fonts.title, { color: colors.textSecondary, marginTop: 16 }]}>
              Tap to add a photo
            </Text>
            <Text style={fonts.regular}>Take a photo or choose from gallery</Text>
          </Pressable>
        )}
      </View>

      {/* Progress */}
      {loading && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${progress * 100}%` }]}
            />
          </View>
          <Text style={fonts.regular}>{progressMessage}</Text>
        </View>
      )}

      {/* Error */}
      {error && <Text style={styles.error}>{error}</Text>}

      {/* Buttons */}
      {!loading && (
        <View style={styles.buttons}>
          {imageUri ? (
            <>
              <Pressable
                style={[styles.btn, styles.btnOutline, { flex: 1 }]}
                onPress={() => pickImage(false)}
              >
                <Ionicons name="refresh" size={18} color={colors.primary} />
                <Text style={styles.btnOutlineText}>Retake</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.btnPrimary, { flex: 2 }]}
                onPress={handleAnalyze}
              >
                <Ionicons name="sparkles" size={18} color="#fff" />
                <Text style={styles.btnPrimaryText}>Analyze Room</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                style={[styles.btn, styles.btnPrimary, { flex: 1 }]}
                onPress={() => pickImage(true)}
              >
                <Ionicons name="camera" size={18} color="#fff" />
                <Text style={styles.btnPrimaryText}>Camera</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.btnOutline, { flex: 1 }]}
                onPress={() => pickImage(false)}
              >
                <Ionicons name="images" size={18} color={colors.primary} />
                <Text style={styles.btnOutlineText}>Gallery</Text>
              </Pressable>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: "#fff" },
  preview: { flex: 1, marginVertical: spacing.md },
  image: { flex: 1, borderRadius: radius.lg },
  placeholder: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.primary + "4D",
    borderStyle: "dashed",
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  progressContainer: { alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  progressBar: {
    width: "100%",
    height: 4,
    backgroundColor: colors.primary + "1A",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: colors.primary },
  error: { color: colors.error, fontSize: 13, textAlign: "center", marginBottom: spacing.sm },
  buttons: { flexDirection: "row", gap: spacing.sm },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: radius.md,
    gap: 8,
  },
  btnPrimary: { backgroundColor: colors.primary },
  btnPrimaryText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  btnOutline: { borderWidth: 1, borderColor: colors.border },
  btnOutlineText: { color: colors.primary, fontSize: 16, fontWeight: "600" },
});
