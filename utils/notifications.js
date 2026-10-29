import * as Notifications from 'expo-notifications';
import { Platform, Alert, LogBox } from 'react-native';

// 🔕 Ignore Expo Go notification warning

// Default handler — prevents “no handler” warning
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function initNotifications() {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX, // 👈 Highest priority
        sound: 'default',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        enableVibrate: true,
        vibrationPattern: [250, 250, 250, 250],
      });
    }

    // Request permission if not granted
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      Alert.alert('Notifications', 'Enable notifications in settings to receive reminders.');
      return;
    }

  } catch (e) {
    console.warn('❌ Notification init failed:', e);
  }
}

export async function scheduleStartNotification(task) {

  if (!task.date || !task.time) return null;

  try {
    // Parse 12-hour time string (e.g. "08:50 pm")
    const [timePart, meridian] = task.time.trim().split(' ');
    let [hh, mm] = timePart.split(':').map(Number);

    if (meridian?.toLowerCase() === 'pm' && hh !== 12) hh += 12;
    if (meridian?.toLowerCase() === 'am' && hh === 12) hh = 0;

    const [y, m, d] = task.date.split('-').map(Number);
    const dt = new Date(y, m - 1, d, hh, mm, 0);

    // Schedule local notification
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🚀 Hey There! Time to Start',
        body: `It's time to start your task: ${task.title}`,
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: dt,
        repeats: false,
      },
    });

    // Avoid fetching and logging every scheduled notification after each schedule.
    
    return id;
  } catch (e) {
    console.warn('❌ schedule failed', e);
    return null;
  }
}

export async function cancelScheduled(id) {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch (e) {
    console.warn('❌ cancel failed', e);
  }
}
