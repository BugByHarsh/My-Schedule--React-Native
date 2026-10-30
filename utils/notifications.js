import * as Notifications from 'expo-notifications';
import { Platform, Alert, LogBox } from 'react-native';

// 🔕 Ignore Expo Go notification warning

// Use a new channel ID so Android does not keep the old channel's default sound.
const REMINDER_CHANNEL_ID = 'task-reminders-custom';

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
      await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
        name: 'Task reminders',
        description: 'Sound alerts for scheduled task reminders',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'task_reminder.wav',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        enableVibrate: true,
        vibrationPattern: [250, 250, 250, 250],
      });
    }

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

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🚀 Hey There! Time to Start',
        body: `It's time to start your task: ${task.title}`,
        sound: 'task_reminder.wav',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: dt,
        ...(Platform.OS === 'android' ? { channelId: REMINDER_CHANNEL_ID } : {}),
        repeats: false,
      },
    });

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
