import { useEffect, useState } from 'react';
import {
  Modal, View, Text, TextInput,
  Pressable, StyleSheet, ScrollView,
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { C, S, R } from '../theme';

const DAYS = [
  { key: 'Mon' }, { key: 'Tue' }, { key: 'Wed' }, { key: 'Thu' },
  { key: 'Fri' }, { key: 'Sat' }, { key: 'Sun' },
];

// fromHome = true  → hide repeat-days section, CTA says "Add to Today"
// fromHome = false → show repeat-days section (default, used in Timetable)
export default function AddEditTaskModal({
  visible, onClose, onAdd, onSave, editingTask, defaultDate, fromHome = false, activeDay,
}) {
  const [title,         setTitle]         = useState('');
  const [time,          setTime]          = useState('09:00');
  const [period,        setPeriod]        = useState('AM');
  const [duration,      setDuration]      = useState('60');
  const [repeatDays,    setRepeatDays]    = useState([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [submitted,     setSubmitted]     = useState(false);
  const [scopePromptVisible, setScopePromptVisible] = useState(false);

  useEffect(() => {
    if (!visible) { setSubmitted(false); setScopePromptVisible(false); return; }
    setScopePromptVisible(false);
    if (editingTask) {
      setTitle(editingTask.title || '');
      const parts = (editingTask.time || '09:00 AM').split(' ');
      setTime(parts[0]);
      setPeriod(parts[1] || 'AM');
      setDuration(String(editingTask.durationMinutes || 60));
      setRepeatDays(editingTask.repeatDays || []);
    } else {
      setTitle(''); setTime('09:00'); setPeriod('AM');
      setDuration('60'); setRepeatDays([]);
    }
  }, [visible, editingTask]);

  const toggleDay = (key) =>
    setRepeatDays((p) => p.includes(key) ? p.filter((d) => d !== key) : [...p, key]);

  const toggleAll = () =>
    setRepeatDays(repeatDays.length === 7 ? [] : DAYS.map((d) => d.key));

  const parsedDuration = Number.parseInt(duration, 10);
  const isDurationError = submitted && (!duration.trim() || !Number.isFinite(parsedDuration) || parsedDuration < 1 || parsedDuration > 1440);

  const submit = () => {
    setSubmitted(true);
    if (!title.trim() || !duration.trim() || !Number.isFinite(parsedDuration) || parsedDuration < 1 || parsedDuration > 1440) return;
    const payload = {
      title:           title.trim(),
      time:            `${time} ${period}`,
      durationMinutes: parsedDuration,
      repeatDays:      fromHome ? [] : repeatDays, // no repeat when adding from Home
      // Preserve the edited occurrence identity for one-off edits and series rejoining.
      id: editingTask?.id,
    };
    if (defaultDate) payload.date = defaultDate;
    if (editingTask) {
      if (Array.isArray(editingTask.repeatDays) && editingTask.repeatDays.length > 0) {
        setScopePromptVisible(true);
        return;
      }
      onSave(payload, 'all-days');
    } else {
      onAdd(payload);
    }
    onClose();
  };

  const saveWithScope = (scope) => {
    const payload = {
      title: title.trim(),
      time: `${time} ${period}`,
      durationMinutes: parsedDuration,
      repeatDays: fromHome ? [] : repeatDays,
      id: editingTask?.id,
    };
    if (defaultDate) payload.date = defaultDate;
    setScopePromptVisible(false);
    onSave(payload, scope);
    onClose();
  };

  const isTitleError = submitted && !title.trim();

  // Heading and CTA label change based on context
  const heading  = editingTask ? '✏️  Edit Task'
                 : fromHome    ? '＋  Add to Today'
                 :               '＋  New Task';
  const saveLabel = editingTask ? 'Save Changes'
                  : fromHome    ? 'Add to Today'
                  :               'Add Task';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Stop press propagation so tapping inside sheet doesn't close */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />

          <Text style={styles.heading}>{heading}</Text>

          {/* "Today only" notice when opened from Home */}
          {fromHome && !editingTask && (
            <View style={styles.noticeBanner}>
              <Text style={styles.noticeText}>
                📅  This task will only appear on today's schedule
              </Text>
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Title */}
            <Text style={styles.label}>Task Name</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              accessibilityLabel="Task name"
              style={[styles.input, isTitleError && styles.inputError]}
              placeholder="e.g. Morning Run"
              placeholderTextColor={C.textHint}
              returnKeyType="done"
              autoFocus={visible}
            />
            {isTitleError && (
              <Text style={styles.errorMsg}>Please enter a task name</Text>
            )}

            {/* Time + Duration row */}
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Time</Text>
                <Pressable
                  style={styles.inputRow}
                  onPress={() => setPickerVisible(true)}
                >
                  <Text style={styles.inputRowText}>🕐  {time} {period}</Text>
                  <Text style={styles.inputRowChevron}>›</Text>
                </Pressable>
              </View>
              <View style={{ width: 110 }}>
                <Text style={styles.label}>Duration (min)</Text>
                <TextInput
                  value={duration}
                  onChangeText={(v) => { if (/^\d*$/.test(v)) setDuration(v); }}
                  accessibilityLabel="Duration in minutes"
                  keyboardType="numeric"
                  maxLength={4}
                  style={[styles.input, isDurationError && styles.inputError]}
                  placeholder="60"
                  placeholderTextColor={C.textHint}
                />
                {isDurationError && <Text style={styles.errorMsg}>Enter 1–1440 minutes</Text>}
              </View>
            </View>

            <DateTimePickerModal
              isVisible={pickerVisible}
              mode="time"
              onConfirm={(d) => {
                const H = d.getHours(), M = d.getMinutes();
                const p  = H >= 12 ? 'PM' : 'AM';
                const hh = H % 12 === 0 ? 12 : H % 12;
                setTime(`${String(hh).padStart(2, '0')}:${String(M).padStart(2, '0')}`);
                setPeriod(p);
                setPickerVisible(false);
              }}
              onCancel={() => setPickerVisible(false)}
            />

            {/* Repeat days — hidden when opened from Home */}
            {!fromHome && (
              <>
                <View style={styles.repeatHeader}>
                  <Text style={styles.label}>Repeat</Text>
                  <Pressable onPress={toggleAll}>
                    <Text style={styles.toggleAll}>
                      {repeatDays.length === 7 ? 'Clear all' : 'Every day'}
                    </Text>
                  </Pressable>
                </View>
                <View style={styles.daysRow}>
                  {DAYS.map((d) => {
                    const active = repeatDays.includes(d.key);
                    const isSun  = d.key === 'Sun';
                    return (
                      <Pressable
                        key={d.key}
                        onPress={() => toggleDay(d.key)}
                        accessibilityRole="checkbox"
                        accessibilityLabel={'Repeat on ' + d.key}
                        accessibilityState={{ checked: active }}
                        style={[
                          styles.dayBtn,
                          active && styles.dayBtnActive,
                          isSun && !active && styles.dayBtnSun,
                        ]}
                      >
                        <Text style={[
                          styles.dayBtnLabel,
                          active && styles.dayBtnLabelActive,
                          isSun && !active && styles.dayBtnLabelSun,
                        ]}>
                          {d.key}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.repeatHint}>
                  {repeatDays.length === 0
                    ? 'No days selected — this is a one-time task for the selected day.'
                    : 'Repeats every ' + repeatDays.join(', ') + '.'}
                </Text>
              </>
            )}
          </ScrollView>

          {scopePromptVisible && (
            <View style={styles.scopeOverlay}>
              <View style={styles.scopeCard}>
                <Text style={styles.scopeTitle}>Apply changes to</Text>
                <Text style={styles.scopeDescription}>
                  Choose whether this edit affects only {activeDay || 'this day'} or the whole repeating schedule.
                </Text>
                <Pressable accessibilityRole="button" onPress={() => saveWithScope('this-day')}
                  style={({ pressed }) => [styles.scopeOption, pressed && { opacity: 0.8 }]}>
                  <Text style={styles.scopeOptionTitle}>Just this day</Text>
                  <Text style={styles.scopeOptionHint}>Other weekdays stay unchanged</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => saveWithScope('all-days')}
                  style={({ pressed }) => [styles.scopeOption, styles.scopeOptionPrimary, pressed && { opacity: 0.8 }]}>
                  <Text style={[styles.scopeOptionTitle, styles.scopeOptionTitlePrimary]}>All selected days</Text>
                  <Text style={[styles.scopeOptionHint, styles.scopeOptionHintPrimary]}>Update the selected repeating schedule</Text>
                </Pressable>
                <Pressable onPress={() => setScopePromptVisible(false)} style={styles.scopeCancel}>
                  <Text style={styles.scopeCancelText}>Back to editing</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.footerBtn, styles.cancelBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={submit}
              style={({ pressed }) => [styles.footerBtn, styles.saveBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.saveText}>{saveLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: S.xl,
    paddingTop: S.sm,
    paddingBottom: S.xxl,
    maxHeight: '92%',
  },
  handle: {
    width: 36, height: 4,
    backgroundColor: C.border2,
    borderRadius: R.full,
    alignSelf: 'center',
    marginBottom: S.lg,
  },
  heading: {
    fontSize: 20, fontWeight: '800',
    color: C.text, letterSpacing: -0.4,
    marginBottom: S.sm,
  },
  noticeBanner: {
    backgroundColor: C.primaryLight,
    borderRadius: R.sm,
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
    marginBottom: S.sm,
    borderLeftWidth: 3,
    borderLeftColor: C.primary,
  },
  noticeText: {
    fontSize: 12, fontWeight: '600',
    color: C.primary, lineHeight: 18,
  },
  label: {
    fontSize: 12, fontWeight: '700',
    color: C.textSub, letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: S.xs, marginTop: S.md,
  },
  input: {
    backgroundColor: C.bg,
    borderRadius: R.md,
    paddingHorizontal: S.md, paddingVertical: 11,
    fontSize: 15, color: C.text,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  inputError: { borderColor: C.red, backgroundColor: C.redBg },
  errorMsg:   { fontSize: 12, color: C.red, marginTop: 4, fontWeight: '500' },
  row:        { flexDirection: 'row', gap: S.md },
  inputRow: {
    backgroundColor: C.bg, borderRadius: R.md,
    paddingHorizontal: S.md, paddingVertical: 11,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputRowText:    { fontSize: 15, color: C.text },
  inputRowChevron: { fontSize: 20, color: C.textHint, fontWeight: '300' },
  repeatHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: S.md, marginBottom: S.xs,
  },
  toggleAll: { fontSize: 13, fontWeight: '600', color: C.primary },
  repeatHint: { fontSize: 12, color: C.textSub, lineHeight: 17, marginTop: S.sm },
  daysRow:   { flexDirection: 'row', gap: S.xs, marginTop: S.sm },
  dayBtn: {
    flex: 1, paddingVertical: S.sm, borderRadius: R.sm,
    backgroundColor: C.bg, alignItems: 'center',
  },
  dayBtnActive:      { backgroundColor: C.primary },
  dayBtnSun:         { backgroundColor: '#fff5f5' },
  dayBtnLabel:       { fontSize: 11, fontWeight: '700', color: C.textSub },
  dayBtnLabelActive: { color: '#fff' },
  dayBtnLabelSun:    { color: C.red },
  scopeOverlay: {
    ...StyleSheet.absoluteFillObject, zIndex: 20,
    backgroundColor: 'rgba(15,23,42,0.55)', alignItems: 'center',
    justifyContent: 'center', padding: S.md,
  },
  scopeCard: { width: '100%', backgroundColor: C.surface, borderRadius: R.lg,
    padding: S.lg, borderWidth: 1, borderColor: C.border },
  scopeTitle: { fontSize: 18, fontWeight: '800', color: C.text, marginBottom: S.xs },
  scopeDescription: { fontSize: 13, lineHeight: 19, color: C.textSub, marginBottom: S.md },
  scopeOption: { borderWidth: 1, borderColor: C.border, borderRadius: R.md,
    padding: S.md, marginTop: S.sm, backgroundColor: C.bg },
  scopeOptionPrimary: { backgroundColor: C.primary, borderColor: C.primary },
  scopeOptionTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  scopeOptionTitlePrimary: { color: '#fff' },
  scopeOptionHint: { fontSize: 12, lineHeight: 17, color: C.textSub, marginTop: 3 },
  scopeOptionHintPrimary: { color: '#eef2ff' },
  scopeCancel: { alignItems: 'center', paddingVertical: S.md, marginTop: S.xs },
  scopeCancelText: { fontSize: 13, fontWeight: '600', color: C.primary },
  footer: { flexDirection: 'row', gap: S.md, marginTop: S.xl },
  footerBtn: {
    flex: 1, paddingVertical: S.md,
    borderRadius: R.md, alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: C.bg,
    borderWidth: 1, borderColor: C.border2,
  },
  saveBtn:    { backgroundColor: C.primary },
  cancelText: { fontSize: 15, fontWeight: '600', color: C.textSub },
  saveText:   { fontSize: 15, fontWeight: '700', color: '#fff' },
});