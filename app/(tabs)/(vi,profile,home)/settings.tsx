import { Redirect } from "expo-router";
import { useCurrentTabGroup } from "@/lib/navigation/useTabNavigation";
import { tabHref } from "@/lib/navigation/tabs";

/** /settings is a short alias for Settings & privacy (/profile-settings), in the same tab. */
export default function SettingsAlias() {
  const group = useCurrentTabGroup();
  return <Redirect href={tabHref("/profile-settings", group) as any} />;
}
