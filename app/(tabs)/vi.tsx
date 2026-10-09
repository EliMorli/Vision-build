import { Redirect } from "expo-router";
import { AssistantChat } from "../assistant-chat";
import { isOutreachEnabled } from "@/lib/config/features";

/**
 * Vi tab (assistant chat). Fills the Inbox slot while the outreach flag is off;
 * with outreach on, Inbox takes the slot and Vi is a button on Home instead.
 */
export default function ViTab() {
  if (isOutreachEnabled()) return <Redirect href="/assistant-chat" />;
  return <AssistantChat asTab />;
}
