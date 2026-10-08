import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { colors } from "@/lib/theme";

export default function TabsLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        headerStyle: { backgroundColor: "#fff" },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: "600" },
        tabBarStyle: { height: 65, paddingBottom: 8 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false,
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarLabel: "Explore",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "Create",
          tabBarLabel: " ",
          tabBarIcon: ({ focused }) => (
            <View style={styles.createButtonContainer}>
              <View style={styles.createButton}>
                <Ionicons name="add" size={32} color="#fff" style={{ transform: [{ rotate: '6deg' }] }} />
              </View>
            </View>
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push("/create-choice");
          },
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: "Inbox",
          tabBarLabel: "Inbox",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          title: "New design",
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  createButtonContainer: {
    marginTop: -20,
  },
  createButton: {
    width: 58,
    height: 58,
    borderRadius: 22,
    backgroundColor: colors.primary,
    borderBottomWidth: 5,
    borderBottomColor: "#0F4FB0",
    justifyContent: "center",
    alignItems: "center",
    transform: [{ rotate: '-6deg' }],
  },
});
