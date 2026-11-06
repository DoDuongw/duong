import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#12659c",
        tabBarInactiveTintColor: "#53646f",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#d5dfe8",
          height: 68,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: "600",
        },
        headerStyle: {
          backgroundColor: "#ffffff",
          borderBottomWidth: 1,
          borderBottomColor: "#d5dfe8",
        },
        headerTitleStyle: {
          fontWeight: "700",
          color: "#16232e",
        } as any,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Trang chủ",
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color as any} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: "Lịch",
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color as any} />,
        }}
      />
      <Tabs.Screen
        name="medications"
        options={{
          title: "Thuốc",
          tabBarIcon: ({ color, size }) => <Ionicons name="medkit" size={size} color={color as any} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Lịch sử",
          tabBarIcon: ({ color, size }) => <Ionicons name="time" size={size} color={color as any} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Cài đặt",
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color as any} />,
        }}
      />
    </Tabs>
  );
}
