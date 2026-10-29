import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, TouchableOpacity, FlatList, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

// DraggableFlatList only works on native (iOS/Android), not on web
const isWeb = Platform.OS === 'web';
let DraggableFlatList, ScaleDecorator, GestureHandlerRootView;
if (!isWeb) {
  DraggableFlatList = require('react-native-draggable-flatlist').default;
  ScaleDecorator    = require('react-native-draggable-flatlist').ScaleDecorator;
  GestureHandlerRootView = require('react-native-gesture-handler').GestureHandlerRootView;
}
import Header from '../components/Header';
import { useDailyNotifications } from '../utils/useDailyNotifs';
import AddEditTaskModal from '../components/AddEditTaskModal';
import TaskRowTable from '../components/TaskRowTable';
import { cancelScheduled } from '../utils/notifications';
import { C, S, R } from '../theme';
import { getNextDateForShortDay, normalizeTimetable } from '../utils/dates';

const STORAGE_KEY = '@TIMETABLE_v1';
const WEEKDAYS    = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getTodayKey() {
  const jsDay = new Date().getDay();
  return WEEKDAYS[jsDay === 0 ? 6 : jsDay - 1];
}

function toMin(s) {
  if (!s) return 0;
  const [time, period] = s.trim().split(' ');
  let [h, m] = time.split(':').map(Number);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

// Normalize newly added task names to readable Title Case (e.g. RUnning -> Running).
function normalizeTaskTitle(value) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase()
    .replace(/(^|[\s'-])([\p{L}\p{N}])/gu, (_, separator, character) => separator + character.toLocaleUpperCase());
}

export default function TimeTable() {
  const todayKey = getTodayKey();
  const [timetable,    setTimetable]    = useState({});
  const [dataReady,    setDataReady]    = useState(false);
  const [activeDay,    setActiveDay]    = useState(todayKey);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask,  setEditingTask]  = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  // dragging = true while user is actively dragging a row
  const [dragging,     setDragging]     = useState(false);

  useEffect(() => { loadTimetable(); }, []);

  const saveTimetable = useCallback(async (updated) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setTimetable(updated);
    } catch (e) { console.warn('Failed to save timetable', e); }
  }, []);

  useDailyNotifications(timetable, saveTimetable, dataReady);

  const loadTimetable = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = data ? JSON.parse(data) : {};
      const result = normalizeTimetable(parsed);
      if (result.changed) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(result.timetable));
      setTimetable(result.timetable);
    } catch (e) { console.warn('Failed to load timetable', e); setTimetable({}); }
    finally { setDataReady(true); }
  };

  // ─── Add ───────────────────────────────────────────────────────────────────
  const onAdd = (newTask) => {
    const seriesId = Date.now().toString();
    const repeatDays = newTask.repeatDays || [];
    const targetDays = repeatDays.length > 0 ? repeatDays : [activeDay];
    const updated = { ...timetable };
    targetDays.forEach((day) => {
      if (!updated[day]) updated[day] = [];
      const occurrence = {
        id: `${seriesId}-${day}`,
        seriesId,
        title: normalizeTaskTitle(newTask.title),
        time: newTask.time || '09:00 AM',
        durationMinutes: newTask.durationMinutes || 60,
        repeatDays,
        scheduledDate: repeatDays.length ? null : getNextDateForShortDay(activeDay),
        completed: false,
        startedOnDate: null,
        completedOnDate: null,
        startedAt: null,
        notifId: null,
      };
      updated[day] = [occurrence, ...updated[day]];
    });
    saveTimetable(updated);
  };

  // ─── Edit ──────────────────────────────────────────────────────────────────
  const onEditSave = async (updatedTask, scope = 'all-days') => {
    const updated = { ...timetable };
    const originalTask =
      (updated[activeDay] || []).find((task) => task.id === updatedTask.id) ||
      WEEKDAYS.flatMap((day) => updated[day] || []).find((task) => task.id === updatedTask.id);
    const seriesId = originalTask?.seriesId || originalTask?.id || updatedTask.id;
    const isRecurring = Array.isArray(originalTask?.repeatDays) && originalTask.repeatDays.length > 0;
    const belongsToSeries = (task) => String(task.seriesId || task.id) === String(seriesId);

    if (scope === 'this-day' && isRecurring) {
      const dayTasks = updated[activeDay] || [];
      const occurrence = dayTasks.find((task) => task.id === updatedTask.id);
      if (occurrence?.notifId) await cancelScheduled(occurrence.notifId);
      // Remove this weekday from the remaining recurring series, so its day
      // indicators accurately reflect the weekdays that still repeat.
      const remainingDays = (originalTask.repeatDays || []).filter((day) => day !== activeDay);
      for (const day of WEEKDAYS) {
        updated[day] = (updated[day] || []).map((task) =>
          belongsToSeries(task) ? { ...task, repeatDays: remainingDays } : task
        );
      }
      const dayTasksAfterSeriesUpdate = updated[activeDay] || [];
      updated[activeDay] = dayTasksAfterSeriesUpdate.map((task) => task.id !== updatedTask.id ? task : ({
        ...task,
        title: updatedTask.title,
        time: updatedTask.time,
        durationMinutes: updatedTask.durationMinutes,
        // This occurrence is now independent of the repeating series.
        repeatDays: [],
        seriesId: task.id,
        scheduledDate: task.scheduledDate || getNextDateForShortDay(activeDay),
        notifId: null,
      }));
      saveTimetable(updated);
      setEditingTask(null);
      return;
    }

    // A detached one-off task can rejoin a recurring series when its title and
    // time exactly match that series. Add the current weekday back to the series.
    if (!isRecurring && scope === 'all-days') {
      const normalizedTitle = (updatedTask.title || '').trim().toLocaleLowerCase();
      const matchingOccurrence = WEEKDAYS
        .filter((day) => day !== activeDay)
        .flatMap((day) => updated[day] || [])
        .find((task) =>
          Array.isArray(task.repeatDays) &&
          task.repeatDays.length > 0 &&
          (task.title || '').trim().toLocaleLowerCase() === normalizedTitle &&
          task.time === updatedTask.time
        );

      if (matchingOccurrence) {
        const matchingSeriesId = matchingOccurrence.seriesId || matchingOccurrence.id;
        const mergedDays = [...new Set([...(matchingOccurrence.repeatDays || []), activeDay])]
          .filter((day) => WEEKDAYS.includes(day));
        for (const day of WEEKDAYS) {
          updated[day] = (updated[day] || []).map((task) =>
            String(task.seriesId || task.id) === String(matchingSeriesId)
              ? { ...task, repeatDays: mergedDays }
              : task
          );
        }
        updated[activeDay] = (updated[activeDay] || []).filter((task) => String(task.id) !== String(updatedTask.id));
        const existingOnDay = (updated[activeDay] || []).some(
          (task) => String(task.seriesId || task.id) === String(matchingSeriesId)
        );
        if (!existingOnDay) {
          updated[activeDay] = [...(updated[activeDay] || []), {
            ...matchingOccurrence,
            ...updatedTask,
            // Keep the existing series' canonical casing when a detached task rejoins.
            title: matchingOccurrence.title,
            id: updatedTask.id,
            seriesId: matchingSeriesId,
            repeatDays: mergedDays,
            scheduledDate: null,
            notifId: null,
          }];
        }
        saveTimetable(updated);
        setEditingTask(null);
        return;
      }
    }

    for (const day of WEEKDAYS) {
      for (const task of updated[day] || []) {
        if (belongsToSeries(task) && task.notifId) await cancelScheduled(task.notifId);
      }
    }
    const repeatDays = updatedTask.repeatDays?.length ? updatedTask.repeatDays : [];
    const targetDays = repeatDays.length ? repeatDays : [activeDay];
    const scheduledDate = repeatDays.length ? null : (originalTask?.scheduledDate || getNextDateForShortDay(activeDay));
    const previousByDay = {};
    WEEKDAYS.forEach((day) => {
      previousByDay[day] = (updated[day] || []).find(belongsToSeries);
      if (updated[day]) updated[day] = updated[day].filter((task) => !belongsToSeries(task));
    });
    const editedAt = Date.now();
    targetDays.forEach((day) => {
      if (!updated[day]) updated[day] = [];
      const previous = previousByDay[day] || originalTask || {};
      updated[day].push({
        ...previous,
        ...updatedTask,
        id: previousByDay[day]?.id && previousByDay[day].id !== seriesId
          ? previousByDay[day].id
          : `${seriesId}-${day}-${editedAt}`,
        seriesId,
        repeatDays,
        scheduledDate,
        notifId: null,
      });
    });
    saveTimetable(updated);
    setEditingTask(null);
  };

  // ─── Delete ────────────────────────────────────────────────────────────────
  const onDelete = async (task) => {
    const isRecurring = Array.isArray(task.repeatDays) && task.repeatDays.length > 0;
    // One-off tasks are deleted immediately; only recurring tasks need a scope choice.
    if (!isRecurring) {
      await deleteTask(task, activeDay, 'this-day');
      return;
    }
    setPendingDelete({ task, day: activeDay });
  };

  const deleteTask = async (taskToDelete, occurrenceDay, scope) => {
    const updated = { ...timetable };
    const seriesId = taskToDelete.seriesId || taskToDelete.id;
    const belongsToSeries = (task) => String(task.seriesId || task.id) === String(seriesId);

    if (scope === 'this-day') {
      const removed = (updated[occurrenceDay] || []).filter(belongsToSeries);
      for (const task of removed) {
        if (task.notifId) {
          try { await cancelScheduled(task.notifId); }
          catch (error) { console.warn('Failed to cancel task notification', error); }
        }
      }
      updated[occurrenceDay] = (updated[occurrenceDay] || []).filter((task) => !belongsToSeries(task));
      const remainingDays = (taskToDelete.repeatDays || []).filter((day) => day !== occurrenceDay);
      for (const day of WEEKDAYS) {
        updated[day] = (updated[day] || []).map((task) =>
          belongsToSeries(task) ? { ...task, repeatDays: remainingDays } : task
        );
      }
    } else {
      for (const day of WEEKDAYS) {
        for (const task of updated[day] || []) {
          if (belongsToSeries(task) && task.notifId) {
            try { await cancelScheduled(task.notifId); }
            catch (error) { console.warn('Failed to cancel task notification', error); }
          }
        }
        updated[day] = (updated[day] || []).filter((task) => !belongsToSeries(task));
      }
    }
    await saveTimetable(updated);
  };

  const confirmDelete = async (scope) => {
    if (!pendingDelete) return;
    const { task, day } = pendingDelete;
    setPendingDelete(null);
    await deleteTask(task, day, scope);
  };

  // ─── Drag to reorder ───────────────────────────────────────────────────────
  // Called by DraggableFlatList when the user drops a row.
  // We persist the new order directly — no re-sort by time so manual order sticks.
  const onDragEnd = ({ data }) => {
    setDragging(false);
    const updated = { ...timetable, [activeDay]: data };
    saveTimetable(updated);
  };

  // The displayed list: use stored order (already persisted from last drag).
  // On first load (no drag yet), sort by time as before.
  const currentTasks = (() => {
    const raw = timetable[activeDay] || [];
    // If user has never reordered, sort by time. Once they drag, the stored
    // array reflects their custom order and we show it as-is.
    // We detect "default order" by checking whether the array is already
    // sorted by time — if yes we re-sort (handles newly added tasks too).
    const sortedByTime = [...raw].sort((a, b) => toMin(a.time) - toMin(b.time));
    const isSortedByTime = raw.every((t, i) => t.id === sortedByTime[i]?.id);
    return isSortedByTime ? sortedByTime : raw;
  })();

  // ─── Render row ────────────────────────────────────────────────────────────
  // On web: plain row, no drag handle (DraggableFlatList not supported on web)
  // On native: ScaleDecorator + drag handle on the right
  const renderItem = isWeb
    ? ({ item }) => (
        <View style={styles.rowWrap}>
          <TaskRowTable
            item={item}
            hasTimeConflict={currentTasks.some((other) => String(other.id) !== String(item.id) && toMin(other.time) === toMin(item.time))}
            onEdit={() => { setEditingTask(item); setModalVisible(true); }}
            onDelete={() => onDelete(item)}
          />
        </View>
      )
    : ({ item, drag, isActive }) => (
        <ScaleDecorator activeScale={1.03}>
          <View style={[styles.rowWrap, isActive && styles.rowWrapActive]}>
            <TaskRowTable
              item={item}
              hasTimeConflict={currentTasks.some(
                (other) =>
                  String(other.id) !== String(item.id) &&
                  toMin(other.time) === toMin(item.time)
              )}
              onEdit={() => { setEditingTask(item); setModalVisible(true); }}
              onDelete={() => onDelete(item)}
            />
            <TouchableOpacity
              onLongPress={drag}
              delayLongPress={150}
              style={styles.dragHandle}
              activeOpacity={0.6}
              hitSlop={8}
            >
              <View style={styles.dragDots}>
                {[0,1,2,3,4,5].map((i) => (
                  <View key={i} style={styles.dragDot} />
                ))}
              </View>
            </TouchableOpacity>
          </View>
        </ScaleDecorator>
      );

  // ─── Render ────────────────────────────────────────────────────────────────
  const listProps = {
    data: currentTasks,
    keyExtractor: (item) => item.id,
    renderItem,
    contentContainerStyle: styles.list,
    initialNumToRender: 8,
    maxToRenderPerBatch: 8,
    windowSize: 7,
    ListEmptyComponent: () => (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>🗓️</Text>
        <Text style={styles.emptyTitle}>No tasks for {activeDay}</Text>
        <Text style={styles.emptyHint}>Tap + to add one</Text>
      </View>
    ),
  };

  const ListComponent = isWeb ? (
    <FlatList {...listProps} />
  ) : (
    <DraggableFlatList
      {...listProps}
      onDragBegin={() => setDragging(true)}
      onDragEnd={onDragEnd}
      activationDistance={10}
    />
  );

  const content = (
    <SafeAreaView style={styles.container}>
      <Header />

        {/* Day selector */}
        <View style={styles.dayStrip}>
          {WEEKDAYS.map((day) => {
            const isActive = activeDay === day;
            const isToday  = day === todayKey;
            return (
              <Pressable
                key={day}
                onPress={() => setActiveDay(day)}
                style={({ pressed }) => [
                  styles.dayBtn,
                  isActive && styles.dayBtnActive,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={[styles.dayLabel, isActive && styles.dayLabelActive]}>
                  {day.slice(0, 2)}
                </Text>
                <View style={[
                  styles.todayDot,
                  isToday  && styles.todayDotVisible,
                  isActive && styles.todayDotActiveColor,
                ]} />
              </Pressable>
            );
          })}
        </View>

        {/* Sub-header */}
        <View style={styles.subHeader}>
          <Text style={styles.subHeaderTitle}>
            {activeDay === todayKey ? "Today's Tasks" : `${activeDay} Tasks`}
          </Text>
          {currentTasks.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{currentTasks.length}</Text>
            </View>
          )}
          {currentTasks.length >= 2 && !isWeb && (
            <Text style={styles.dragHint}>Hold ⠿ to reorder</Text>
          )}
        </View>

        {/* List — DraggableFlatList on native, plain FlatList on web */}
        {ListComponent}

        {/* FAB */}
        <Pressable
          style={({ pressed }) => [
            styles.fab,
            pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
          ]}
          onPress={() => { setEditingTask(null); setModalVisible(true); }}
        >
          <Text style={styles.fabText}>+</Text>
        </Pressable>

        <AddEditTaskModal
          visible={modalVisible}
          onClose={() => { setModalVisible(false); setEditingTask(null); }}
          onAdd={onAdd}
          onSave={onEditSave}
          editingTask={editingTask}
          activeDay={activeDay}
          hideDate
          showRepeatDays
        />

        <Modal
          visible={!!pendingDelete}
          transparent
          animationType="fade"
          onRequestClose={() => setPendingDelete(null)}
        >
          <View style={styles.deleteBackdrop}>
            <View style={styles.deleteDialog}>
              <Text style={styles.deleteTitle}>Delete task?</Text>
              <Text style={styles.deleteMessage}>
                {pendingDelete
                  ? `"${pendingDelete.task.title}" repeats on multiple days. Where should it be deleted?`
                  : ''}
              </Text>
              <Text style={styles.deleteHint}>
                Delete only this day's occurrence, or remove the entire repeating series.
              </Text>
              <View style={styles.deleteActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setPendingDelete(null)}
                  style={({ pressed }) => [styles.deleteCancelButton, pressed && { opacity: 0.8 }]}
                >
                  <Text style={styles.deleteCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => confirmDelete('this-day')}
                  style={({ pressed }) => [styles.deleteCancelButton, pressed && { opacity: 0.8 }]}
                >
                  <Text style={styles.deleteCancelText}>Just today</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => confirmDelete('all-days')}
                  style={({ pressed }) => [styles.deleteConfirmButton, pressed && { opacity: 0.8 }]}
                >
                  <Text style={styles.deleteConfirmText}>Every day</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
  );

  // GestureHandlerRootView is required on native for drag to work; skip on web
  return isWeb ? content : (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {content}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  deleteBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: S.xl,
  },
  deleteDialog: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.xl,
    borderWidth: 1,
    borderColor: C.border,
  },
  deleteTitle: { fontSize: 19, fontWeight: '800', color: C.text, marginBottom: S.sm },
  deleteMessage: { fontSize: 14, lineHeight: 20, color: C.text, marginBottom: S.sm },
  deleteHint: { fontSize: 12, lineHeight: 18, color: C.textSub, marginBottom: S.lg },
  deleteActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: S.sm },
  deleteCancelButton: {
    paddingHorizontal: S.lg, paddingVertical: S.md, borderRadius: R.md,
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border2,
  },
  deleteCancelText: { color: C.textSub, fontWeight: '700', fontSize: 14 },
  deleteConfirmButton: {
    paddingHorizontal: S.lg, paddingVertical: S.md, borderRadius: R.md,
    backgroundColor: C.red,
  },
  deleteConfirmText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Day strip
  dayStrip: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
  },
  dayBtn: {
    flex: 1, alignItems: 'center',
    paddingVertical: S.sm, borderRadius: R.sm, gap: 4,
  },
  dayBtnActive:        { backgroundColor: C.primary },
  dayLabel:            { fontSize: 13, fontWeight: '700', color: C.textSub },
  dayLabelActive:      { color: '#fff' },
  todayDot:            { width: 4, height: 4, borderRadius: 2, backgroundColor: 'transparent' },
  todayDotVisible:     { backgroundColor: C.primary },
  todayDotActiveColor: { backgroundColor: '#c7d2fe' },

  // Sub-header
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
    gap: S.sm,
  },
  subHeaderTitle: {
    fontSize: 16, fontWeight: '700',
    color: C.text, letterSpacing: -0.2,
  },
  countBadge: {
    backgroundColor: C.primaryLight,
    borderRadius: R.full,
    paddingHorizontal: S.sm, paddingVertical: 2,
  },
  countBadgeText: { fontSize: 12, fontWeight: '700', color: C.primary },
  dragHint: {
    marginLeft: 'auto',
    fontSize: 11, color: C.textHint,
    fontWeight: '500',
  },

  // Row wrapper — adds drag handle alongside TaskRowTable
  rowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: S.lg,
    paddingBottom: S.sm,
    flex: 1,
  },
  rowWrapActive: {
    backgroundColor: C.primaryLight,
    borderRadius: R.lg,
  },

  // Drag handle (6-dot grid)
  dragHandle: {
    paddingLeft: S.sm,
    paddingVertical: S.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragDots: {
    width: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
  },
  dragDot: {
    width: 3, height: 3,
    borderRadius: 1.5,
    backgroundColor: C.textHint,
  },

  list: { paddingBottom: 90 },

  // Empty state
  empty: {
    alignItems: 'center',
    paddingTop: 80, paddingHorizontal: S.xxl,
  },
  emptyIcon:  { fontSize: 44, marginBottom: S.lg },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.text, marginBottom: S.sm },
  emptyHint:  { fontSize: 14, color: C.textSub, textAlign: 'center' },

  // FAB
  fab: {
    position: 'absolute',
    right: S.lg, bottom: S.xl,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.primary,
    shadowOpacity: 0.4, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 32 },
});