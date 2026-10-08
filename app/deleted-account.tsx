// Screen shown after successful account deletion (in-app flow)
// Similar to delete-account/confirm's deleted state

import { useRouter, useLocalSearchParams } from "expo-router";
import { Platform } from "react-native";
import DeletedAccountView from "@/components/DeletedAccountView";
import { supabase } from "@/lib/supabase";

export default function DeletedAccount() {
  const router = useRouter();
  const { variant } = useLocalSearchParams<{ variant?: 'apple' | 'email' }>();
  const isAppleUser = variant === 'apple';

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

  return (
    <DeletedAccountView
      showNativeActions={Platform.OS !== "web"}
      isAppleUser={isAppleUser}
      onDone={handleDone}
    />
  );
}
