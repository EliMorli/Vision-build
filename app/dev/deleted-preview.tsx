// Dev-only preview route for deleted account screen
// Must not ship in production builds

import { useLocalSearchParams, useRouter, Redirect } from "expo-router";
import DeletedAccountView from "../../components/DeletedAccountView";

export default function DeletedAccountPreview() {
  const { variant } = useLocalSearchParams<{ variant?: string }>();
  const router = useRouter();

  // Only render in __DEV__ mode
  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  const isAppleVariant = variant === "apple";

  const handleDone = () => {
    router.back();
  };

  return (
    <DeletedAccountView
      showNativeActions={true}
      isAppleUser={isAppleVariant}
      onDone={handleDone}
    />
  );
}
