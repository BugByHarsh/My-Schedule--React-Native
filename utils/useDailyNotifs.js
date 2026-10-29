import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { scheduleStartNotification, cancelScheduled } from './notifications';
import { getLocalDateKey, getShortDay } from './dates';

export function useDailyNotifications(timetable, saveTimetable) {
  const lastTimetableRef = useRef(null);
  // BUG FIX: `saveTimetable` was in the useEffect dep array. Because it's
  // created with useCallback([]) it's stable, but including it in deps
  // alongside `timetable` caused an extra run on every render in some
  // React versions. Store it in a ref so the effect never lists it as a dep.
  const saveTimetableRef = useRef(saveTimetable);
  useEffect(() => { saveTimetableRef.current = saveTimetable; }, [saveTimetable]);

  useEffect(() => {
    // Bail out early if timetable hasn't actually changed
    const serialized = JSON.stringify(timetable);
    if (lastTimetableRef.current === serialized) return;
    lastTimetableRef.current = serialized;

    async function handleNotifications() {
      const today = new Date();
      const todayDate = getLocalDateKey(today);
      const todayName = getShortDay(today).toLowerCase();

      const updated = { ...timetable };
      let didChange = false;

      for (const day of Object.keys(updated)) {
        const tasks = updated[day] || [];

        const newTasks = await Promise.all(
          tasks.map(async (task) => {
            const taskDay = day.toLowerCase();

            // Cancel notifications for days that are not today
            if (taskDay !== todayName && task.notifId) {
              await cancelScheduled(task.notifId);
              didChange = true;
              return { ...task, notifId: null };
            }

            // Schedule for today's tasks that don't have a notifId yet
            if (taskDay === todayName && !task.notifId) {
              const [timePart, meridianRaw] = task.time.trim().split(' ');
              const [hh, mm] = timePart.split(':').map(Number);
              const meridian = meridianRaw?.toLowerCase();
              let hours = hh;
              if (meridian === 'pm' && hh !== 12) hours += 12;
              if (meridian === 'am' && hh === 12) hours = 0;

              const dt = new Date(
                today.getFullYear(),
                today.getMonth(),
                today.getDate(),
                hours,
                mm
              );

              // Skip tasks whose time has already passed
              if (dt.getTime() <= Date.now()) return task;

              const notifTask = { ...task, date: todayDate };
              const id = await scheduleStartNotification(notifTask);
              if (id) {
                didChange = true;
                return { ...task, notifId: id };
              }
            }

            return task;
          })
        );

        updated[day] = newTasks;
      }

      // Clean up orphaned scheduled notifications
      const allValidIds = new Set(
        Object.values(updated)
          .flat()
          .map((t) => t.notifId)
          .filter(Boolean)
      );

      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const notification of scheduled) {
        if (!allValidIds.has(notification.identifier)) {
          await cancelScheduled(notification.identifier);
        }
      }

      if (didChange) {
        saveTimetableRef.current(updated);
      }
    }

    handleNotifications().catch((e) =>
      console.warn('useDailyNotifications error:', e)
    );
  // BUG FIX: only depend on `timetable` — saveTimetable is accessed via ref
  }, [timetable]);
}