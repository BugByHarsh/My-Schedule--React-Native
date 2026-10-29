import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import Header from '../components/Header';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { C, S, R } from '../theme';
import { getLocalDateKey, getShortDay, parseLocalDateKey } from '../utils/dates';

const TIMETABLE_KEY = '@TIMETABLE_v1';
const PROGRESS_KEY = '@TASK_PROGRESS_v1';

function getShortDayLocal(dateString) {
  return getShortDay(parseLocalDateKey(dateString));
}

function toMin(s) {
  if (!s) return 0;
  const [time, period] = s.trim().split(' ');
  let [h, m] = time.split(':').map(Number);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateKey());
  const [visibleMonth, setVisibleMonth] = useState(() => getLocalDateKey().slice(0, 7));
  const [timetable, setTimetable] = useState({});
  const [dayTasks, setDayTasks] = useState([]);
  const [progress, setProgress] = useState({});
  const isFocused = useIsFocused();
  const todayStr = getLocalDateKey();

  useEffect(() => { if (isFocused) loadAll(); }, [isFocused]);

  const loadAll = async () => {
    try {
      const [d1, d2] = await Promise.all([
        AsyncStorage.getItem(TIMETABLE_KEY),
        AsyncStorage.getItem(PROGRESS_KEY),
      ]);
      const parsedTimetable = d1 ? JSON.parse(d1) : {};
      const parsedProgress = d2 ? JSON.parse(d2) : {};
      setTimetable(parsedTimetable && typeof parsedTimetable === 'object' && !Array.isArray(parsedTimetable) ? parsedTimetable : {});
      setProgress(parsedProgress && typeof parsedProgress === 'object' && !Array.isArray(parsedProgress) ? parsedProgress : {});
    } catch (e) {
      console.warn('Error loading data', e);
      setTimetable({}); setProgress({});
    }
  };

  useEffect(() => {
    if (!selectedDate) return;
    const shortDay = getShortDayLocal(selectedDate);
    const base = (Array.isArray(timetable[shortDay]) ? timetable[shortDay] : []).filter((task) => {
      const repeatDays = Array.isArray(task.repeatDays) ? task.repeatDays : [];
      if (repeatDays.length > 0) return repeatDays.includes(shortDay);
      if (task.scheduledDate) return task.scheduledDate === selectedDate;
      // Preserve legacy tasks created before date-specific one-off dates were stored.
      return true;
    });
    const daily = progress[selectedDate] || {};
    const merged = base.map((task) => {
      const p = daily[task.id] || (task.seriesId ? daily[task.seriesId] : null) || {};
      return { ...task, completed: !!p.completed, started: !!p.started };
    });
    merged.sort((a, b) => toMin(a.time) - toMin(b.time));
    setDayTasks(merged);
  }, [selectedDate, timetable, progress]);

  const completedCount = dayTasks.filter((t) => t.completed).length;
  const startedCount = dayTasks.filter((t) => t.started && !t.completed).length;
  const pct = dayTasks.length > 0 ? Math.round((completedCount / dayTasks.length) * 100) : 0;
  const isPast = selectedDate < todayStr;
  const isToday = selectedDate === todayStr;

  // Mark days that contain recurring or date-specific tasks in the visible month.
  const markedDates = {};
  const [visibleYear, visibleMonthNumber] = visibleMonth.split('-').map(Number);
  const daysInVisibleMonth = new Date(visibleYear, visibleMonthNumber, 0).getDate();
  for (let day = 1; day <= daysInVisibleMonth; day += 1) {
    const dateKey = visibleMonth + '-' + String(day).padStart(2, '0');
    const shortDay = getShortDayLocal(dateKey);
    const tasksForDay = Array.isArray(timetable[shortDay]) ? timetable[shortDay] : [];
    const hasTasks = tasksForDay.some((task) => {
      const repeatDays = Array.isArray(task.repeatDays) ? task.repeatDays : [];
      if (repeatDays.length > 0) return repeatDays.includes(shortDay);
      if (task.scheduledDate) return task.scheduledDate === dateKey;
      // Legacy tasks without a stored date retain their previous compatibility behavior.
      return true;
    });
    if (hasTasks) markedDates[dateKey] = { marked: true, dotColor: C.primary };
  }
  markedDates[selectedDate] = {
    ...(markedDates[selectedDate] || {}),
    selected: true,
    selectedColor: C.primary,
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header />

      <Calendar
        onDayPress={(day) => setSelectedDate(day.dateString)}
        onMonthChange={(month) => setVisibleMonth(month.year + '-' + String(month.month).padStart(2, '0'))}
        markedDates={markedDates}
        initialDate={selectedDate}
        theme={{
          selectedDayBackgroundColor: C.primary,
          todayTextColor: C.primary,
          todayBackgroundColor: C.primaryLight,
          arrowColor: C.primary,
          dotColor: C.primary,
          textDayFontWeight: '500',
          textMonthFontWeight: '700',
          calendarBackground: C.surface,
          dayTextColor: C.text,
          textDisabledColor: C.textHint,
          monthTextColor: C.text,
        }}
      />

      <View style={styles.content}>
        <View style={styles.calendarActions}>
          <Text style={styles.calendarHint}>Dots mark scheduled days · Select a date to review it</Text>
          {!isToday && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Jump to today"
              onPress={() => setSelectedDate(todayStr)}
              style={({ pressed }) => [styles.todayButton, pressed && { opacity: 0.75 }]}
            >
              <Text style={styles.todayButtonText}>Today</Text>
            </Pressable>
          )}
        </View>
        {/* Summary card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View>
              <Text style={styles.summaryDate}>
                {isToday ? 'Today' : parseLocalDateKey(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </Text>
              <Text style={styles.summaryCount}>
                {dayTasks.length === 0
                  ? 'No tasks'
                  : `${completedCount} of ${dayTasks.length} complete`}
              </Text>
            </View>
            {dayTasks.length > 0 && (
              <View style={styles.pctCircle}>
                <Text style={styles.pctText}>{pct}%</Text>
              </View>
            )}
          </View>

          {dayTasks.length > 0 && (
            <>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${pct}%` }]} />
              </View>
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: C.green }]} />
                  <Text style={styles.legendText}>{completedCount} done</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: C.amber }]} />
                  <Text style={styles.legendText}>{startedCount} in progress</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: C.border2 }]} />
                  <Text style={styles.legendText}>
                    {dayTasks.length - completedCount - startedCount} pending
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Task list */}
        {dayTasks.length > 0 ? (
          <FlatList
            data={dayTasks}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: S.xl }}
            renderItem={({ item }) => {
              const statusColor = item.completed ? C.green
                : item.started ? C.amber
                : isPast ? C.red
                : C.border2;
              const statusLabel = item.completed ? 'Done'
                : item.started ? 'In Progress'
                : isPast ? 'Missed'
                : 'Pending';
              return (
                <View style={styles.taskCard}>
                  {/* Status strip */}
                  <View style={[styles.taskStrip, { backgroundColor: statusColor }]} />
                  <View style={styles.taskTime}>
                    <Text style={styles.taskTimeText}>{item.time?.split(' ')[0]}</Text>
                    <Text style={styles.taskTimePeriod}>{item.time?.split(' ')[1]}</Text>
                  </View>
                  <View style={styles.taskBody}>
                    <Text
                      style={[styles.taskTitle, item.completed && styles.taskTitleDone]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    {item.durationMinutes ? (
                      <Text style={styles.taskDuration}>⏱ {item.durationMinutes} min</Text>
                    ) : null}
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: statusColor + '22' }]}>
                    <Text style={[styles.statusPillText, { color: statusColor }]}>
                      {statusLabel}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyTitle}>No tasks this day</Text>
            <Text style={styles.emptyHint}>Add tasks in the Timetable tab</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { flex: 1, paddingHorizontal: S.lg, paddingTop: S.md },
  calendarActions: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: S.sm },
  calendarHint: { fontSize: 12, color: C.textSub, flex: 1 },
  todayButton: { backgroundColor: C.primaryLight, borderRadius: R.full, paddingHorizontal: S.md, paddingVertical: S.sm, marginLeft: S.sm },
  todayButtonText: { fontSize: 12, fontWeight: '800', color: C.primary },
  summaryCard: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.lg,
    marginBottom: S.md,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: S.md,
  },
  summaryDate: {
    fontSize: 16,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.3,
  },
  summaryCount: {
    fontSize: 13,
    color: C.textSub,
    marginTop: 2,
  },
  pctCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pctText: {
    fontSize: 13,
    fontWeight: '800',
    color: C.primary,
  },
  progressBar: {
    height: 6,
    backgroundColor: C.border,
    borderRadius: R.full,
    overflow: 'hidden',
    marginBottom: S.sm,
  },
  progressFill: {
    height: 6,
    backgroundColor: C.primary,
    borderRadius: R.full,
  },
  legendRow: {
    flexDirection: 'row',
    gap: S.md,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: C.textSub,
    fontWeight: '500',
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: R.lg,
    marginBottom: S.sm,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  taskStrip: {
    width: 4,
    alignSelf: 'stretch',
  },
  taskTime: {
    width: 48,
    alignItems: 'center',
    paddingVertical: S.md,
    paddingLeft: S.xs,
  },
  taskTimeText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.primary,
  },
  taskTimePeriod: {
    fontSize: 9,
    fontWeight: '600',
    color: C.primaryMid,
    letterSpacing: 0.3,
  },
  taskBody: {
    flex: 1,
    paddingVertical: S.md,
    paddingHorizontal: S.md,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
    marginBottom: 2,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: C.textHint,
  },
  taskDuration: {
    fontSize: 11,
    color: C.textSub,
  },
  statusPill: {
    marginRight: S.md,
    paddingHorizontal: S.sm,
    paddingVertical: 3,
    borderRadius: R.full,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  emptyIcon: { fontSize: 40, marginBottom: S.md },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
    marginBottom: S.xs,
  },
  emptyHint: { fontSize: 13, color: C.textSub },
});