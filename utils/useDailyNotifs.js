import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { scheduleStartNotification, cancelScheduled } from './notifications';
import { getLocalDateKey, parseLocalDateKey } from './dates';

const TIMETABLE_KEY = '@TIMETABLE_v1';
const DAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
let notificationQueue = Promise.resolve();

function nextDateForDay(dayName, today) {
  const target = DAY_KEYS.indexOf(dayName);
  if (target < 0) return getLocalDateKey(today);
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  date.setDate(date.getDate() + ((target - date.getDay() + 7) % 7));
  return getLocalDateKey(date);
}

function timeOnDate(dateKey, time) {
  if (typeof time !== 'string') return new Date(NaN);
  const [clock, period] = time.trim().split(/\s+/);
  const parts = (clock || '').split(':').map(Number);
  if (parts.length !== 2 || parts.some((part) => !Number.isFinite(part))) return new Date(NaN);
  let [hours, minutes] = parts;
  if (period?.toLowerCase() === 'pm' && hours !== 12) hours += 12;
  if (period?.toLowerCase() === 'am' && hours === 12) hours = 0;
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0);
}

export function useDailyNotifications(timetable, saveTimetable, ready = true) {
  const lastTimetableRef = useRef(null);
  const saveTimetableRef = useRef(saveTimetable);
  useEffect(() => { saveTimetableRef.current = saveTimetable; }, [saveTimetable]);

  useEffect(() => {
    if (!ready || !timetable || typeof timetable !== 'object') return;
    const serialized = JSON.stringify(timetable);
    if (lastTimetableRef.current === serialized) return;
    lastTimetableRef.current = serialized;

    const run = async () => {
      const raw = await AsyncStorage.getItem(TIMETABLE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      const current = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
      const today = new Date();
      const todayKey = getLocalDateKey(today);
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const scheduledIds = new Set(scheduled.map((item) => item.identifier));
      const updated = {};
      let didChange = false;

      for (const [day, value] of Object.entries(current)) {
        const tasks = Array.isArray(value) ? value : [];
        updated[day] = await Promise.all(tasks.map(async (task) => {
          if (!task || typeof task !== 'object') return task;
          const repeats = Array.isArray(task.repeatDays) && task.repeatDays.length > 0;
          let targetDate = repeats ? nextDateForDay(day, today) : task.scheduledDate;
          if (!targetDate) targetDate = repeats ? nextDateForDay(day, today) : todayKey;
          let targetTime = timeOnDate(targetDate, task.time);

          if (repeats && targetDate === todayKey && targetTime.getTime() <= Date.now()) {
            const nextWeek = parseLocalDateKey(targetDate);
            nextWeek.setDate(nextWeek.getDate() + 7);
            targetDate = getLocalDateKey(nextWeek);
            targetTime = timeOnDate(targetDate, task.time);
          }

          let notifId = task.notifId || null;
          if (notifId && !scheduledIds.has(notifId)) {
            notifId = null;
            didChange = true;
          }

          if (!notifId && Number.isFinite(targetTime.getTime()) && targetTime.getTime() > Date.now()) {
            const id = await scheduleStartNotification({ ...task, date: targetDate });
            if (id) {
              notifId = id;
              scheduledIds.add(id);
              didChange = true;
            }
          }
          return notifId === (task.notifId || null) ? task : { ...task, notifId };
        }));
      }

      const validIds = new Set(Object.values(updated).flat().map((task) => task?.notifId).filter(Boolean));
      for (const item of scheduled) {
        if (!validIds.has(item.identifier)) await cancelScheduled(item.identifier);
      }

      if (didChange) {
        const latestRaw = await AsyncStorage.getItem(TIMETABLE_KEY);
        const latestParsed = latestRaw ? JSON.parse(latestRaw) : {};
        const latest = latestParsed && typeof latestParsed === 'object' && !Array.isArray(latestParsed) ? latestParsed : {};
        const merged = { ...latest };
        for (const [day, latestValue] of Object.entries(latest)) {
          const latestTasks = Array.isArray(latestValue) ? latestValue : [];
          const processedById = new Map((updated[day] || []).filter((task) => task?.id).map((task) => [task.id, task]));
          merged[day] = latestTasks.map((newest) => {
            if (!newest?.id || !processedById.has(newest.id)) return newest;
            return { ...newest, notifId: processedById.get(newest.id).notifId || null };
          });
        }
        await AsyncStorage.setItem(TIMETABLE_KEY, JSON.stringify(merged));
        await saveTimetableRef.current(merged);
      }
    };

    notificationQueue = notificationQueue.then(run).catch((error) => {
      console.warn('useDailyNotifications error:', error);
    });
  }, [timetable, ready]);
}
