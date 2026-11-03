import { Tabs } from 'expo-router';
import { View, Platform, Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, CalendarDays, Info, Timer, CalendarClock } from 'lucide-react-native';
import { C } from '../theme';

function SmoothTabButton(props) {
  return (
    <Pressable
      {...props}
      android_ripple={{ color: 'transparent' }}
      style={({ pressed }) => [
        props.style,
        { opacity: pressed ? 0.82 : 1 },
      ]}
    />
  );
}

export default function Layout() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="dark" backgroundColor={C.bg} translucent={false} />
      <Tabs
        screenOptions={{
          headerShown: false,
          lazy: true,
          freezeOnBlur: true,
          animation: 'none',
          tabBarButton: (props) => <SmoothTabButton {...props} />,
          tabBarHideOnKeyboard: true,
          tabBarActiveTintColor: C.primary,
          tabBarInactiveTintColor: C.textHint,
          tabBarStyle: {
            backgroundColor: C.surface,
            borderTopWidth: 1,
            borderTopColor: C.border,
            height: Platform.OS === 'ios' ? 80 : 58 + Math.max(insets.bottom, 0),
            paddingBottom: Platform.OS === 'ios' ? 22 : Math.max(insets.bottom, 8),
            paddingTop: 6,
            shadowColor: '#000',
            shadowOpacity: 0.045,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: -2 },
            elevation: 8,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            letterSpacing: 0.1,
          },
          tabBarIconStyle: {
            marginBottom: -1,
          },
          tabBarItemStyle: {
            paddingVertical: 1,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <Home color={color} size={focused ? 23 : 21} strokeWidth={focused ? 2.3 : 1.9} />
            ),
          }}
        />
        <Tabs.Screen
          name="timetable"
          options={{
            title: 'Timetable',
            tabBarIcon: ({ color, focused }) => (
              <CalendarClock color={color} size={focused ? 23 : 21} strokeWidth={focused ? 2.3 : 1.9} />
            ),
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: 'Calendar',
            tabBarIcon: ({ color, focused }) => (
              <CalendarDays color={color} size={focused ? 23 : 21} strokeWidth={focused ? 2.3 : 1.9} />
            ),
          }}
        />
        <Tabs.Screen
          name="focus"
          options={{
            title: 'Focus',
            tabBarIcon: ({ color, focused }) => (
              <Timer color={color} size={focused ? 23 : 21} strokeWidth={focused ? 2.3 : 1.9} />
            ),
          }}
        />
        <Tabs.Screen
          name="about"
          options={{
            title: 'About',
            tabBarIcon: ({ color, focused }) => (
              <Info color={color} size={focused ? 23 : 21} strokeWidth={focused ? 2.3 : 1.9} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}