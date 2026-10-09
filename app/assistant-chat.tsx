import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fonts } from "@/lib/theme";
import { mockAssistantProvider } from "@/lib/providers/MockAssistantProvider";
import { realAssistantProvider } from "@/lib/providers/RealAssistantProvider";
import { AssistantMessage } from "@/lib/providers/AssistantProvider";
import { Button, ReportModal } from "@/components";
import Constants from "expo-constants";

const WELCOME_MESSAGE: AssistantMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! I'm Vi, your design assistant. I'm here to help you bring your renovation ideas to life. Tell me about the space you're working on!",
  timestamp: 0,
};

// Use real provider unless in mock mode
const useMockMode = __DEV__ && Constants.expoConfig?.extra?.EXPO_PUBLIC_DEV_MOCK_SESSION === "true";
const assistantProvider = useMockMode ? mockAssistantProvider : realAssistantProvider;

export default function AssistantChatScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<AssistantMessage[]>([WELCOME_MESSAGE]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportMessageId, setReportMessageId] = useState("");
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Scroll to bottom when messages change
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: AssistantMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: inputText.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    try {
      const response = await assistantProvider.chat(
        messages,
        userMessage.content
      );
      setMessages((prev) => [...prev, response]);
    } catch (_error) {
      console.error("Chat error:", _error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateDesign = async () => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      const response = await assistantProvider.generateDesign(
        messages,
        "Generate design based on our conversation"
      );
      setMessages((prev) => [...prev, response]);
    } catch (_error) {
      console.error("Generation error:", _error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: AssistantMessage }) => {
    const isUser = item.role === "user";

    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.assistantMessageContainer,
        ]}
      >
        {!isUser && (
          <View style={styles.avatarCircle}>
            <Ionicons name="sparkles" size={16} color={colors.primary} />
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.assistantBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userText : styles.assistantText,
            ]}
          >
            {item.content}
          </Text>
          {item.imageUrls && item.imageUrls.length > 0 && (
            <View style={styles.imagesGrid}>
              {item.imageUrls.map((url, index) => (
                <View key={index} style={styles.imagePreview}>
                  <Image
                    source={{ uri: url }}
                    style={styles.previewImage}
                    accessibilityLabel={`Design image ${index + 1}`}
                  />
                </View>
              ))}
            </View>
          )}
          {!isUser && (
            <Pressable
              style={styles.reportButton}
              onPress={() => {
                setReportMessageId(item.id);
                setReportModalVisible(true);
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Report this message"
            >
              <Ionicons name="flag-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.reportButtonText}>Report</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ReportModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        type="message"
        itemId={reportMessageId}
      />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Vi</Text>
            <Text style={styles.headerSubtitle}>Design assistant</Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
        />

        {/* Loading indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <View style={styles.typingIndicator}>
              <View style={styles.typingDot} />
              <View style={[styles.typingDot, styles.typingDotDelay1]} />
              <View style={[styles.typingDot, styles.typingDotDelay2]} />
            </View>
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actionsBar}>
          <View style={{ flex: 1 }}>
            <Button
              label="Generate design"
              icon="color-palette-outline"
              onPress={generateDesign}
              variant="outline"
              loading={isLoading}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label="Find me a Pro"
              icon="people-outline"
              onPress={() => {
                const projects = require("@/lib/store").useProjectStore.getState().projects;
                const latestProject = projects[0];
                if (latestProject) {
                  router.push(`/pros-coming-soon?projectId=${latestProject.id}` as any);
                } else {
                  router.push("/pros-coming-soon" as any);
                }
              }}
              variant="secondary"
            />
          </View>
        </View>

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Describe your ideas..."
            placeholderTextColor={colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            accessibilityLabel="Message Vi"
            testID="vi-input"
          />
          <Pressable
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isLoading}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: !inputText.trim() || isLoading }}
            testID="vi-send"
          >
            <Ionicons
              name="send"
              size={20}
              color={inputText.trim() ? "#fff" : colors.textSecondary}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  keyboardView: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { ...fonts.title, fontSize: 18 },
  headerSubtitle: { ...fonts.regular, fontSize: 12, color: colors.textSecondary },
  messagesList: {
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  messageContainer: {
    flexDirection: "row",
    marginBottom: spacing.md,
    alignItems: "flex-end",
  },
  userMessageContainer: {
    justifyContent: "flex-end",
  },
  assistantMessageContainer: {
    justifyContent: "flex-start",
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },
  messageBubble: {
    maxWidth: "75%",
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    ...fonts.body,
    lineHeight: 22,
  },
  userText: {
    color: "#fff",
  },
  assistantText: {
    color: colors.textPrimary,
  },
  reportButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: spacing.xs,
    paddingVertical: 4,
  },
  reportButtonText: {
    ...fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  imagesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  loadingContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  typingIndicator: {
    flexDirection: "row",
    gap: 4,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    alignSelf: "flex-start",
    marginLeft: 40,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textSecondary,
  },
  typingDotDelay1: {
    opacity: 0.7,
  },
  typingDotDelay2: {
    opacity: 0.4,
  },
  actionsBar: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    ...fonts.body,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: colors.surface,
  },
});
