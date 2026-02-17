import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { useProjectStore } from "@/lib/store";
import { Button, ProgressBar } from "@/components";

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
    <SafeAreaView style={styles.container}>
      {/* Header hint */}
      <Text style={styles.hint}>
        Take a photo or pick one from your gallery to get started.
      </Text>

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
              <Button
                label="Camera"
                icon="camera"
                onPress={() => pickImage(true)}
                variant="primary"
                fullWidth={false}
                style={styles.flexBtn}
              />
              <Button
                label="Gallery"
                icon="images"
                onPress={() => pickImage(false)}
                variant="outline"
                fullWidth={false}
                style={styles.flexBtn}
              />
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: spacing.lg },
  hint: {
    ...fonts.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.md,
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
  buttonRow: { flexDirection: "row", gap: spacing.sm },
  flexBtn: { flex: 1 },
});
