import AsyncStorage from '@react-native-async-storage/async-storage';
const KEY = '@TIMETABLE_v1';

export async function getStoredTasks() {
  try {
    const j = await AsyncStorage.getItem(KEY);
    return j ? JSON.parse(j) : [];
  } catch (e) {
    console.warn('Load failed', e);
    return [];
  }
}

export async function storeTasks(tasks) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(tasks || []));
  } catch (e) {
    console.warn('Save failed', e);
  }
}
