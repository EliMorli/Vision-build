import { AssistantChat } from "@/components/AssistantChat";

/**
 * Vi as a screen inside the current tab's stack (opened from a project, from
 * Home when Inbox has the tab slot, etc.), with a back arrow and the tab bar.
 * The Vi tab itself renders <AssistantChat asTab />. Both gate on AI consent.
 */
export default function AssistantChatScreen() {
  return <AssistantChat />;
}
