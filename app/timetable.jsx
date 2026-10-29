import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, TouchableOpacity, FlatList, Platform } from 'react-native';
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
import { getNextDateForShortDay } from '../utils/dates';

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

export default function TimeTable() {
  const todayKey = getTodayKey();
  const [timetable,    setTimetable]    = useState({});
  const [activeDay,    setActiveDay]    = useState(todayKey);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask,  setEditingTask]  = useState(null);
  // dragging = true while user is actively dragging a row
  const [dragging,     setDragging]     = useState(false);

  useEffect(() => { loadTimetable(); }, []);

  const saveTimetable = useCallback(async (updated) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setTimetable(updated);
    } catch (e) { console.warn('Failed to save timetable', e); }
  }, []);

  useDailyNotifications(timetable, saveTimetable);

  const loadTimetable = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      setTimetable(data ? JSON.parse(data) : {});
    } catch (e) { console.warn('Failed to load timetable', e); }
  };

  // ─── Add ───────────────────────────────────────────────────────────────────
  const onAdd = (newTask) => {
    const id   = Date.now().toString();
    const task = {
      id,
      title:           newTask.title.trim(),
      time:            newTask.time || '09:00 AM',
      durationMinutes: newTask.durationMinutes || 60,
      repeatDays:      newTask.repeatDays || [],
      scheduledDate:   (newTask.repeatDays || []).length ? null : getNextDateForShortDay(activeDay),
      completed:       false,
      startedOnDate:   null,
      completedOnDate: null,
      startedAt:       null,
      notifId:         null,
    };
    const updated    = { ...timetable };
    const targetDays = task.repeatDays.length > 0 ? task.repeatDays : [activeDay];
    targetDays.forEach((day) => {
      if (!updated[day]) updated[day] = [];
      updated[day] = [
        task,
        ...updated[day].filter(
          (t) => !(t.title === task.title && t.time === task.time)
        ),
      ];
    });
    saveTimetable(updated);
  };

  // ─── Edit ──────────────────────────────────────────────────────────────────
  const onEditSave = async (updatedTask) => {
    const updated = { ...timetable };
    const originalTask = WEEKDAYS.flatMap((day) => updated[day] || []).find((task) => task.id === updatedTask.id);
    // Editing time/title invalidates any already-scheduled reminder for this task.
    for (const day of WEEKDAYS) {
      for (const task of updated[day] || []) {
        if (task.id === updatedTask.id && task.notifId) await cancelScheduled(task.notifId);
      }
    }
    const repeatDays = updatedTask.repeatDays?.length ? updatedTask.repeatDays : [activeDay];
    updatedTask = {
      ...updatedTask,
      notifId: null,
      scheduledDate: updatedTask.repeatDays?.length
        ? null
        : (originalTask?.scheduledDate || getNextDateForShortDay(activeDay)),
    };

    WEEKDAYS.forEach((day) => {
      if (updated[day]) updated[day] = updated[day].filter((t) => t.id !== updatedTask.id);
    });
    repeatDays.forEach((day) => {
      if (!updated[day]) updated[day] = [];
      updated[day].push(updatedTask);
    });
    saveTimetable(updated);
    setEditingTask(null);
  };

  // ─── Delete ────────────────────────────────────────────────────────────────
  const onDelete = (task) => {
    Alert.alert('Delete Task', `Remove "${task.title}" from all days?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          const updated = { ...timetable };
          for (const day of WEEKDAYS) {
            if (updated[day]) {
              for (const t of updated[day]) {
                if (t.id === task.id && t.notifId) await cancelScheduled(t.notifId);
              }
              updated[day] = updated[day].filter((t) => t.id !== task.id);
            }
          }
          saveTimetable(updated);
        },
      },
    ]);
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
          hideDate
          showRepeatDays
        />
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