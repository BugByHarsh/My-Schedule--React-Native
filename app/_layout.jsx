import { Tabs } from 'expo-router';
import { View, Platform } from 'react-native';
import { Home, CalendarDays, Info, Timer, CalendarClock } from 'lucide-react-native';
import { C } from '../theme';

export default function Layout() {
  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: C.primary,
          tabBarInactiveTintColor: C.textHint,
          tabBarStyle: {
            backgroundColor: C.surface,
            borderTopWidth: 1,
            borderTopColor: C.border,
            height: Platform.OS === 'ios' ? 84 : 64,
            paddingBottom: Platform.OS === 'ios' ? 24 : 8,
            paddingTop: 8,
            // Subtle top shadow
            shadowColor: '#000',
            shadowOpacity: 0.06,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: -2 },
            elevation: 12,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            letterSpacing: 0.1,
          },
          tabBarIconStyle: {
            marginBottom: -2,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => <Home color={color} size={22} strokeWidth={2} />,
          }}
        />
        <Tabs.Screen
          name="timetable"
          options={{
            title: 'Timetable',
            tabBarIcon: ({ color }) => <CalendarClock color={color} size={22} strokeWidth={2} />,
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: 'Calendar',
            tabBarIcon: ({ color }) => <CalendarDays color={color} size={22} strokeWidth={2} />,
          }}
        />
        <Tabs.Screen
          name="focus"
          options={{
            title: 'Focus',
            tabBarIcon: ({ color }) => <Timer color={color} size={22} strokeWidth={2} />,
          }}
        />
        <Tabs.Screen
          name="about"
          options={{
            title: 'About',
            tabBarIcon: ({ color }) => <Info color={color} size={22} strokeWidth={2} />,
          }}
        />
      </Tabs>
    </View>
  );
}