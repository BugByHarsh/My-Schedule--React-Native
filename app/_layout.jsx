import { Tabs, useRouter, useSegments } from 'expo-router';
import { View, Platform, Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, CalendarDays, Info, Timer, CalendarClock } from 'lucide-react-native';
import { C } from '../theme';

const TAB_ROUTES = ['index', 'timetable', 'calendar', 'focus', 'about'];

function SmoothTabButton(props) {
  return (
    <Pressable
      {...props}
      android_ripple={{ color: 'transparent' }}
      style={({ pressed }) => [
        props.style,
        { opacity: pressed ? 0.76 : 1 },
      ]}
    />
  );
}

export default function Layout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  const activeRoute = segments[segments.length - 1];
  const activeIndex = Math.max(0, TAB_ROUTES.indexOf(activeRoute));

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-24, 24])
    .failOffsetY([-14, 14])
    .runOnJS(true)
    .onEnd((event) => {
      if (Math.abs(event.translationX) < 80) return;

      const nextIndex = event.translationX < 0
        ? Math.min(activeIndex + 1, TAB_ROUTES.length - 1)
        : Math.max(activeIndex - 1, 0);

      if (nextIndex !== activeIndex) {
        router.navigate('/' + TAB_ROUTES[nextIndex]);
      }
    });

  return (
    <GestureDetector gesture={swipeGesture}>
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
              height: Platform.OS === 'ios' ? 84 : 60 + Math.max(insets.bottom, 0),
              paddingBottom: Platform.OS === 'ios' ? 24 : Math.max(insets.bottom, 8),
              paddingTop: 7,
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
              tabBarIcon: ({ color }) => <Home color={color} size={22} strokeWidth={2} />,
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
    </GestureDetector>
  );
}