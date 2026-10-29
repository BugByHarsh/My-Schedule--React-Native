import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Target } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { C, S, R } from '../theme';

export default function TaskRow({ item, onStart, onComplete }) {
  const router = useRouter();
  const [now, setNow] = useState(Date.now());

  const onFocus = async () => {
    try {
      await AsyncStorage.setItem(
        '@Focus_Duration',
        JSON.stringify({
          durationMinutes: item.durationMinutes,
          taskTitle: item.title,
          // The focus countdown starts when Focus is opened, not when the task was first started.
          startedAt: new Date().toISOString(),
        })
      );
      router.push('/focus');
    } catch (e) {
      console.warn('Failed to store focus duration', e);
    }
  };

  useEffect(() => {
    if (!item.startedAt || item.completed) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [item.startedAt, item.completed]);

  const elapsedLabel = (() => {
    if (!item.startedAt || item.completed) return null;
    const sec = Math.floor((now - item.startedAt) / 1000);
    if (sec < 0) return null;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  })();

  // Status: 'pending' | 'started' | 'completed'
  const status = item.completed ? 'completed' : item.startedAt ? 'started' : 'pending';

  const stripColor = {
    pending: C.border2,
    started: C.amber,
    completed: C.green,
  }[status];

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onLongPress={() => {}} // allow long press feel
    >
      {/* Left colored status strip */}
      <View style={[styles.strip, { backgroundColor: stripColor }]} />

      {/* Time column */}
      <View style={styles.timeCol}>
        <Text style={styles.timeHour}>{item.time?.split(' ')[0]}</Text>
        <Text style={styles.timePeriod}>{item.time?.split(' ')[1]}</Text>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text
            numberOfLines={1}
            style={[styles.title, item.completed && styles.titleDone]}
          >
            {item.title}
          </Text>
          {elapsedLabel && (
            <View style={styles.elapsedBadge}>
              <Text style={styles.elapsedText}>{elapsedLabel}</Text>
            </View>
          )}
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.duration}>⏱ {item.durationMinutes} min</Text>
          {item.completed && <Text style={styles.doneChip}>✓ Done</Text>}
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {status === 'pending' && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Start ${item.title}`}
            style={({ pressed }) => [styles.btn, styles.btnStart, pressed && styles.btnPressed]}
            onPress={() => onStart(item)}
          >
            <Text style={styles.btnText}>Start</Text>
          </Pressable>
        )}

        {status === 'started' && (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Start focus session for ${item.title}`}
              style={({ pressed }) => [styles.iconBtn, styles.iconBtnFocus, pressed && styles.btnPressed]}
              onPress={onFocus}
            >
              <Target size={18} color={C.primary} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Mark ${item.title} as done`}
              style={({ pressed }) => [styles.btn, styles.btnDone, pressed && styles.btnPressed]}
              onPress={() => onComplete(item)}
            >
              <Text style={styles.btnText}>Done</Text>
            </Pressable>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: R.lg,
    marginBottom: S.sm,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  cardPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  strip: {
    width: 4,
    alignSelf: 'stretch',
  },
  timeCol: {
    width: 52,
    alignItems: 'center',
    paddingVertical: S.md,
    paddingLeft: S.xs,
  },
  timeHour: {
    fontSize: 14,
    fontWeight: '700',
    color: C.primary,
    letterSpacing: -0.2,
  },
  timePeriod: {
    fontSize: 10,
    fontWeight: '600',
    color: C.primaryMid,
    letterSpacing: 0.3,
  },
  divider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: C.border,
    marginVertical: S.sm,
  },
  content: {
    flex: 1,
    paddingVertical: S.md,
    paddingHorizontal: S.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    marginBottom: 3,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
  },
  titleDone: {
    color: C.textHint,
    textDecorationLine: 'line-through',
  },
  elapsedBadge: {
    backgroundColor: C.amberBg,
    borderRadius: R.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  elapsedText: {
    fontSize: 10,
    fontWeight: '700',
    color: C.amber,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
  },
  duration: {
    fontSize: 12,
    color: C.textSub,
  },
  doneChip: {
    fontSize: 11,
    fontWeight: '700',
    color: C.green,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: S.md,
    gap: S.xs,
  },
  btn: {
    minHeight: 40,
    paddingVertical: S.sm,
    paddingHorizontal: S.md,
    borderRadius: R.sm,
    alignItems: 'center',
  },
  btnStart: { backgroundColor: C.primary },
  btnDone: { backgroundColor: C.green },
  btnPressed: { opacity: 0.8 },
  btnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: R.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnFocus: { backgroundColor: C.primaryLight },
  iconBtnText: { fontSize: 16 },
});