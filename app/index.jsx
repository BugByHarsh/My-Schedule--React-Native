import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import Header from '../components/Header';
import StatsRow from '../components/StatsRow';
import TaskRow from '../components/TaskRow';
import AddEditTaskModal from '../components/AddEditTaskModal';
import { initNotifications } from '../utils/notifications';
import { useDailyNotifications } from '../utils/useDailyNotifs';
import { C, S, R } from '../theme';
import { getLocalDateKey, getShortDay, normalizeTimetable } from '../utils/dates';

const TIMETABLE_KEY = '@TIMETABLE_v1';
const PROGRESS_KEY  = '@TASK_PROGRESS_v1';


const TABS = [
  { key: 'all',       label: 'Pending',   color: C.textSub, bg: C.bg      },
  { key: 'started',   label: 'Started',   color: C.amber,   bg: C.amberBg },
  { key: 'completed', label: 'Completed', color: C.green,   bg: C.greenBg },
];

export default function Index() {
  const [selectedTab,     setSelectedTab]     = useState('all');
  const [timetable,       setTimetable]       = useState({});
  const [allTasks,        setAllTasks]        = useState([]);
  const [filteredTasks,   setFilteredTasks]   = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [quickAddVisible, setQuickAddVisible] = useState(false);
  const [todayDate, setTodayDate] = useState(() => new Date());
  const weekday = getShortDay(todayDate);
  const todayStr = getLocalDateKey(todayDate);
  const [dataReady, setDataReady] = useState(false);
  const [focusSession, setFocusSession] = useState(null);

  const selectedTabRef = useRef(selectedTab);
  const hasLoadedRef = useRef(false);
  useEffect(() => { selectedTabRef.current = selectedTab; }, [selectedTab]);

  const saveTimetable = useCallback(async (updated) => {
    try {
      await AsyncStorage.setItem(TIMETABLE_KEY, JSON.stringify(updated));
      setTimetable(updated);
    } catch (e) { console.warn('Failed to save timetable', e); }
  }, []);

  useEffect(() => { initNotifications(); }, []);
  useEffect(() => {
    const timer = setInterval(() => setTodayDate(new Date()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);
  useFocusEffect(useCallback(() => { loadTasks(); }, [todayStr, weekday]));

  // ─── Load ──────────────────────────────────────────────────────────────────
  const loadTasks = async () => {
    // Keep the existing screen visible when returning to Home; only show the
    // full loading state on the first load to avoid a navigation flicker.
    if (!hasLoadedRef.current) setLoading(true);
    try {
      const [data1, data2, focusData] = await Promise.all([
        AsyncStorage.getItem(TIMETABLE_KEY),
        AsyncStorage.getItem(PROGRESS_KEY),
        AsyncStorage.getItem('@Focus_Duration'),
      ]);
      try {
        const savedFocus = focusData ? JSON.parse(focusData) : null;
        setFocusSession(savedFocus && Number.isFinite(savedFocus.durationMinutes)
          && Number.isFinite(savedFocus.remainingSeconds) ? savedFocus : null);
      } catch {
        setFocusSession(null);
      }
      const parsedTimetable = data1 ? JSON.parse(data1) : {};
      const normalized = normalizeTimetable(parsedTimetable, todayDate);
      const loadedTimetable = normalized.timetable;
      if (normalized.changed) await AsyncStorage.setItem(TIMETABLE_KEY, JSON.stringify(loadedTimetable));
      setTimetable(loadedTimetable);
      setDataReady(true);

      const parsedProgress = data2 ? JSON.parse(data2) : {};
      const progress = parsedProgress && typeof parsedProgress === 'object' && !Array.isArray(parsedProgress)
        ? parsedProgress : {};
      const todayProgress = progress[todayStr] || {};
      const tasksForToday = (Array.isArray(loadedTimetable[weekday]) ? loadedTimetable[weekday] : [])
        .filter((task) => !task.scheduledDate || task.scheduledDate === todayStr
          || (Array.isArray(task.repeatDays) && task.repeatDays.includes(weekday)));

      const derived = tasksForToday.map((t) => {
        const p = todayProgress[t.id] || (t.seriesId ? todayProgress[t.seriesId] : null) || {};
        return { ...t, started: !!p.started, completed: !!p.completed, startedAt: p.startedAt || null };
      });
      setAllTasks(derived);
      filterTasks(selectedTabRef.current, derived);
    } catch (e) {
      console.warn('Error loading tasks', e);
      setAllTasks([]); setFilteredTasks([]);
      setDataReady(true);
    } finally {
      hasLoadedRef.current = true;
      setLoading(false);
    }
  };

  // ─── Filter ────────────────────────────────────────────────────────────────
  const filterTasks = (tab, tasks) => {
    if (tab === 'all')            setFilteredTasks(tasks.filter((t) => !t.started && !t.completed));
    else if (tab === 'started')   setFilteredTasks(tasks.filter((t) => t.started && !t.completed));
    else if (tab === 'completed') setFilteredTasks(tasks.filter((t) => t.completed));
  };

  const onTabChange = (tab) => { setSelectedTab(tab); filterTasks(tab, allTasks); };

  // ─── Quick-add from Home ───────────────────────────────────────────────────
  // Adds the task only to today's weekday slot in the timetable (no repeat).
  // Immediately reflects in the Home list without a full reload.
  const onQuickAdd = async (newTask) => {
    try {
      const raw = await AsyncStorage.getItem(TIMETABLE_KEY);
      const parsedStored = raw ? JSON.parse(raw) : {};
      const stored = parsedStored && typeof parsedStored === 'object' && !Array.isArray(parsedStored) ? parsedStored : {};
      const id     = Date.now().toString();
      const task   = {
        id,
        title:           newTask.title.trim(),
        time:            newTask.time || '09:00 AM',
        durationMinutes: newTask.durationMinutes || 60,
        repeatDays:      [],    // today-only: no weekly repeat
        scheduledDate:   todayStr,
        completed:       false,
        startedOnDate:   null,
        completedOnDate: null,
        startedAt:       null,
        notifId:         null,
      };

      if (!stored[weekday]) stored[weekday] = [];
      // Preserve intentional duplicate tasks; each task has its own stable ID.
      stored[weekday] = [task, ...(Array.isArray(stored[weekday]) ? stored[weekday].filter((item) => item && typeof item === 'object' && item.id) : [])];

      await AsyncStorage.setItem(TIMETABLE_KEY, JSON.stringify(stored));
      setTimetable(stored);

      // Optimistically update the local list so the user sees it instantly
      const newDerived = [task, ...allTasks];
      setAllTasks(newDerived);
      // Switch to Pending tab so the new task is immediately visible
      setSelectedTab('all');
      filterTasks('all', newDerived);
    } catch (e) { console.warn('Quick-add failed', e); }
  };

  // ─── Start / Complete ──────────────────────────────────────────────────────
  useDailyNotifications(timetable, saveTimetable, dataReady);

  const onStart = async (task) => {
    try {
      const raw           = await AsyncStorage.getItem(PROGRESS_KEY);
      const progressData  = raw ? JSON.parse(raw) : {};
      const todayProgress = progressData[todayStr] || {};
      const startedAt     = Date.now();

      todayProgress[task.id] = { ...(todayProgress[task.id] || {}), started: true, startedAt, taskSnapshot: { id: task.id, title: task.title, time: task.time, durationMinutes: task.durationMinutes, seriesId: task.seriesId || null } };
      progressData[todayStr] = todayProgress;
      await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(progressData));

      const updated = allTasks.map((t) =>
        t.id === task.id ? { ...t, started: true, startedAt } : t
      );
      setAllTasks(updated);
      setSelectedTab('started');
      filterTasks('started', updated);
    } catch (e) { console.warn('Error starting task', e); }
  };

  const onComplete = async (task) => {
    const taskId = typeof task === 'string' ? task : task.id;
    try {
      const raw           = await AsyncStorage.getItem(PROGRESS_KEY);
      const progressData  = raw ? JSON.parse(raw) : {};
      const todayProgress = progressData[todayStr] || {};
      const wasCompleted  = todayProgress[taskId]?.completed || false;

      todayProgress[taskId] = {
        ...(todayProgress[taskId] || {}),
        completed:   !wasCompleted,
        completedAt: !wasCompleted ? Date.now() : null,
        taskSnapshot: typeof task === 'object' ? { id: task.id, title: task.title, time: task.time, durationMinutes: task.durationMinutes, seriesId: task.seriesId || null } : todayProgress[taskId]?.taskSnapshot || null,
      };
      progressData[todayStr] = todayProgress;
      await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(progressData));

      const updated = allTasks.map((t) =>
        t.id === taskId ? { ...t, completed: !wasCompleted } : t
      );
      setAllTasks(updated);
      filterTasks(selectedTab, updated);
    } catch (e) { console.warn('Error completing task', e); }
  };

  // ─── Derived counts ────────────────────────────────────────────────────────
  const tabCounts = {
    all:       allTasks.filter((t) => !t.started && !t.completed).length,
    started:   allTasks.filter((t) => t.started && !t.completed).length,
    completed: allTasks.filter((t) => t.completed).length,
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <Header />
      <StatsRow tasks={allTasks} selectedDate={todayStr} />

      {/* Pill tabs */}
      <View style={styles.tabsWrap}>
        {TABS.map((tab) => {
          const isActive = selectedTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => onTabChange(tab.key)}
              style={({ pressed }) => [
                styles.tab,
                isActive && { backgroundColor: tab.bg, borderColor: tab.color },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={[styles.tabText, isActive && { color: tab.color }]}>
                {tab.label}
              </Text>
              <View style={[styles.tabBadge, isActive && { backgroundColor: tab.color }]}>
                <Text style={[styles.tabBadgeText, isActive && { color: '#fff' }]}>
                  {tabCounts[tab.key]}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Task list / empty states */}
      {loading ? (
        <View style={styles.center}>
          <Text style={styles.loadingText}>Loading tasks…</Text>
        </View>
      ) : filteredTasks.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>
            {selectedTab === 'all' ? '📋' : selectedTab === 'started' ? '⚡' : '🎉'}
          </Text>
          <Text style={styles.emptyTitle}>
            {selectedTab === 'all'       ? 'No pending tasks'
           : selectedTab === 'started'   ? 'Nothing in progress'
           :                               'Nothing completed yet'}
          </Text>
          <Text style={styles.emptyHint}>
            {selectedTab === 'all'       ? 'Add a quick task or set up your week in Timetable'
           : selectedTab === 'started'   ? 'Tap Start on a pending task to begin'
           :                               'Mark tasks as done to see them here'}
          </Text>
          {/* Quick-add CTA only on Pending tab */}
          {selectedTab === 'all' && (
            <Pressable
              style={({ pressed }) => [styles.emptyAddBtn, pressed && { opacity: 0.8 }]}
              onPress={() => setQuickAddVisible(true)}
            >
              <Text style={styles.emptyAddBtnText}>＋  Add task for today</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TaskRow
              item={item}
              focusSession={focusSession}
              onStart={() => onStart(item)}
              onComplete={() => onComplete(item)}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={7}
        />
      )}

      {/* Quick-add FAB */}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
        ]}
        onPress={() => setQuickAddVisible(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      {/* Quick-add modal — fromHome hides repeat days, shows "Add to Today" */}
      <AddEditTaskModal
        visible={quickAddVisible}
        onClose={() => setQuickAddVisible(false)}
        onAdd={onQuickAdd}
        onSave={() => {}}   // editing never happens from Home
        editingTask={null}
        fromHome
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  tabsWrap: {
    flexDirection: 'row',
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
    gap: S.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: S.sm,
    paddingHorizontal: S.sm,
    borderRadius: R.full,
    borderWidth: 1.5,
    borderColor: C.border2,
    backgroundColor: C.surface,
    gap: S.xs,
  },
  tabText:      { fontSize: 12, fontWeight: '700', color: '#93a0bd', letterSpacing: 0.1 },
  tabBadge: {
    minWidth: 18, height: 18,
    borderRadius: R.full,
    backgroundColor: C.border,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: { fontSize: 10, fontWeight: '800', color: '#aab5d0' },
  tabBadgeActive: { backgroundColor: C.primary },
  tabBadgeTextActive: { color: '#fff' },
  list:         { paddingHorizontal: S.lg, paddingBottom: 90 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText:  { color: '#93a0bd', fontSize: 14 },
  empty: {
    flex: 1,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: S.xxl, paddingBottom: 60,
  },
  emptyIcon:  { fontSize: 48, marginBottom: S.lg },
  emptyTitle: {
    fontSize: 18, fontWeight: '700', color: '#f1f5ff',
    marginBottom: S.sm, textAlign: 'center',
  },
  emptyHint: {
    fontSize: 14, color: '#93a0bd',
    textAlign: 'center', lineHeight: 20, marginBottom: S.lg,
  },
  emptyAddBtn: {
    backgroundColor: '#4f46e5',
    borderRadius: R.full,
    paddingHorizontal: S.xl, paddingVertical: S.md,
    marginTop: S.sm,
  },
  emptyAddBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  fab: {
    position: 'absolute',
    right: S.lg, bottom: S.xl,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.primary,
    shadowOpacity: 0.45, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 32 },
});