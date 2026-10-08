import { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  TextInput,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { useAuthStore } from "@/lib/store";
import { Button } from "@/components";
import { supabase } from "@/lib/supabase";

export default function EditProfileScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);

  // Initialize display name from profile once
  const initialDisplayName = useMemo(() => profile?.display_name || "", [profile?.display_name]);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please grant photo library access to change your profile picture."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoUri) return null;

    const userId = useAuthStore.getState().session?.user?.id;
    if (!userId) return null;

    if (__DEV__ && process.env.EXPO_PUBLIC_DEV_MOCK_SESSION === "true") {
      return `mock/${userId}/avatar.jpg`;
    }

    setUploading(true);

    try {
      const response = await fetch(photoUri);
      const blob = await response.blob();
      const fileName = `${userId}/avatar_${Date.now()}.jpg`;

      const { data, error } = await supabase.storage
        .from("profile-photos")
        .upload(fileName, blob, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (error) throw error;

      return data?.path || null;
    } catch (_error) {
      console.error("Error uploading photo:", _error);
      Alert.alert("Upload Failed", "Could not upload profile photo. Please try again.");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    const userId = useAuthStore.getState().session?.user?.id;
    if (!userId) return;

    setLoading(true);

    try {
      let photoPath = profile?.photo_url;

      if (photoUri) {
        const uploaded = await uploadPhoto();
        if (uploaded) {
          photoPath = uploaded;
        }
      }

      if (__DEV__ && process.env.EXPO_PUBLIC_DEV_MOCK_SESSION === "true") {
        Alert.alert("Success", "Profile updated!");
        await fetchProfile();
        router.back();
        return;
      }

      const { error } = await (supabase
        .from("profiles") as any)
        .update({
          display_name: displayName.trim(),
          photo_url: photoPath,
        })
        .eq("id", userId);

      if (error) throw error;

      Alert.alert("Success", "Profile updated!");
      await fetchProfile();
      router.back();
    } catch (error: any) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", error.message || "Could not update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const currentPhotoUrl = photoUri || profile?.photo_url;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <Pressable onPress={pickImage} style={styles.avatarContainer}>
            {currentPhotoUrl ? (
              <View style={styles.avatar}>
                {/* In real mode, would show <Image source={{ uri: signedUrl }} /> */}
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={48} color={colors.textSecondary} />
                </View>
              </View>
            ) : (
              <View style={styles.avatar}>
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {displayName?.[0]?.toUpperCase() || "U"}
                  </Text>
                </View>
              </View>
            )}
            <View style={styles.cameraIcon}>
              <Ionicons name="camera" size={20} color="#fff" />
            </View>
          </Pressable>
          <Text style={styles.changePhotoText}>Tap to change photo</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Display Name</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Enter your name"
              placeholderTextColor={colors.textSecondary}
              maxLength={50}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.disabledInput}>
              <Text style={styles.disabledText}>{profile?.email || ""}</Text>
            </View>
            <Text style={styles.helpText}>
              Email cannot be changed. Contact support if you need help.
            </Text>
          </View>
        </View>

        {/* Save Button */}
        <View style={styles.buttonContainer}>
          <Button
            label={uploading ? "Uploading photo..." : "Save Changes"}
            onPress={handleSave}
            loading={loading || uploading}
            disabled={!displayName.trim() || loading || uploading}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    flexGrow: 1,
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
  avatarSection: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: "hidden",
  },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#FFD66B",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 48,
    fontWeight: "900",
    color: "#1B2140",
  },
  cameraIcon: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  changePhotoText: {
    ...fonts.body,
    fontSize: 14,
    color: colors.primary,
    marginTop: spacing.sm,
  },
  form: {
    paddingHorizontal: spacing.lg,
  },
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    ...fonts.body,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  input: {
    ...fonts.body,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  disabledInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  disabledText: {
    ...fonts.body,
    color: colors.textSecondary,
  },
  helpText: {
    ...fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  buttonContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
});
