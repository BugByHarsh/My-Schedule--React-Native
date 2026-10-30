import { useFocusEffect, useRouter, useIsFocused } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Vibration, Alert, AppState, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AnimatedCircularProgress } from 'react-native-circular-progress';
import { C, S, R } from '../theme';

export default function FocusScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { width, height } = useWindowDimensions();
  const ringSize = Math.max(180, Math.min(260, width - 64, height * 0.36));
  const [duration, setDuration] = useState(null);
  const [remaining, setRemaining] = useState(null);
  const [running, setRunning] = useState(false);
  const [endsAt, setEndsAt] = useState(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskId, setTaskId] = useState(null);
  const completedRef = useRef(false);
  const actionLockRef = useRef(false);
  const [savingAction, setSavingAction] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      completedRef.current = false;

      (async () => {
        try {
          const stored = await AsyncStorage.getItem('@Focus_Duration');
          if (!isActive) return;
          if (!stored) {
            setDuration(null); setRemaining(null); setRunning(false); setEndsAt(null); setTaskTitle(''); setTaskId(null);
            return;
          }
          const parsed = JSON.parse(stored);
          const durationMinutes = Number(parsed.durationMinutes);
          if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
            setDuration(null); setRemaining(null); setRunning(false); setEndsAt(null); setTaskTitle(''); setTaskId(null);
            return;
          }

          let left;
          let isRunning;
          let endTimestamp = null;
          if (Number.isFinite(parsed.remainingSeconds)) {
            isRunning = parsed.isRunning !== false;
            if (isRunning && Number.isFinite(parsed.endsAt)) {
              endTimestamp = parsed.endsAt;
              left = Math.max(0, Math.ceil((endTimestamp - Date.now()) / 1000));
            } else {
              isRunning = false;
              left = Math.max(0, Math.floor(parsed.remainingSeconds));
            }
          } else {
            // Backward compatibility with sessions saved by older app versions.
            const startedAt = new Date(parsed.startedAt).getTime();
            left = Number.isFinite(startedAt)
              ? Math.max(0, durationMinutes * 60 - Math.floor((Date.now() - startedAt) / 1000))
              : durationMinutes * 60;
            isRunning = left > 0;
            endTimestamp = isRunning ? Date.now() + left * 1000 : null;
          }

          if (!isActive) return;
          setDuration(durationMinutes);
          setRemaining(left);
          setTaskTitle(typeof parsed.taskTitle === 'string' ? parsed.taskTitle : '');
          setTaskId(typeof parsed.taskId === 'string' ? parsed.taskId : null);
          setEndsAt(endTimestamp);
          setRunning(left > 0 && isRunning);
        } catch (e) {
          console.warn('⚠️ Failed to load focus data', e);
          setDuration(null); setRemaining(null); setRunning(false); setEndsAt(null); setTaskTitle(''); setTaskId(null);
        }
      })();

      return () => { isActive = false; };
    }, [])
  );

  useEffect(() => {
    if (!running || !Number.isFinite(endsAt)) return;
    const tick = () => setRemaining(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [running, endsAt]);

  useEffect(() => {
    if (remaining !== 0 || duration === null || completedRef.current) return;
    completedRef.current = true;
    setRunning(false);
    setEndsAt(null);
    Vibration.vibrate([0, 400, 200, 400]);
    handleFocusComplete();
  }, [remaining, duration]);

  async function handleFocusComplete() {
    try {
      await AsyncStorage.removeItem('@Focus_Duration');
      Alert.alert('Session Complete! 🎉', 'You crushed it — great work!', [
        { text: 'Back to Home', onPress: () => router.back() },
      ]);
    } catch (e) { console.warn('Failed to clear focus data:', e); }
  }

  const toggleRunning = async () => {
    if (actionLockRef.current || remaining === null || remaining <= 0 || duration === null) return;
    actionLockRef.current = true;
    setSavingAction(true);

    try {
      if (running) {
        const left = Number.isFinite(endsAt)
          ? Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
          : remaining;
        await AsyncStorage.setItem('@Focus_Duration', JSON.stringify({
          durationMinutes: duration,
          taskTitle,
          taskId,
          remainingSeconds: left,
          isRunning: false,
          endsAt: null,
        }));
        setRemaining(left);
        setRunning(false);
        setEndsAt(null);
      } else {
        const nextEnd = Date.now() + remaining * 1000;
        await AsyncStorage.setItem('@Focus_Duration', JSON.stringify({
          durationMinutes: duration,
          taskTitle,
          taskId,
          remainingSeconds: remaining,
          isRunning: true,
          endsAt: nextEnd,
        }));
        setEndsAt(nextEnd);
        setRunning(true);
      }
    } catch (e) {
      console.warn('Failed to save focus session state', e);
      Alert.alert('Could not save session', 'Please try pausing or resuming again.');
    } finally {
      actionLockRef.current = false;
      setSavingAction(false);
    }
  };

  // Fallback
  if (duration === null || remaining === null) {
    return (
      <View style={styles.fallback}>
        <StatusBar style={isFocused ? 'light' : 'dark'} />
        <Text style={styles.fallbackIcon}>🎯</Text>
        <Text style={styles.fallbackTitle}>No Active Session</Text>
        <Text style={styles.fallbackSub}>Start a task from Home to begin a focus session.</Text>
        <Pressable
          style={({ pressed }) => [styles.outlineBtn, pressed && { opacity: 0.7 }]}
          onPress={() => router.back()}
        >
          <Text style={styles.outlineBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const fillPct = duration > 0
    ? ((duration * 60 - remaining) / (duration * 60)) * 100 : 100;
  const isFinished = remaining === 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Top label */}
      <Text style={styles.modeLabel}>FOCUS SESSION</Text>
      {taskTitle ? (
        <Text style={styles.taskName} numberOfLines={2}>{taskTitle}</Text>
      ) : null}

      {/* Timer ring */}
      <View style={styles.ringWrap}>
        <AnimatedCircularProgress
          size={ringSize}
          width={12}
          fill={fillPct}
          tintColor={isFinished ? '#34d399' : '#818cf8'}
          backgroundColor="rgba(255,255,255,0.1)"
          rotation={0}
        >
          {() => (
            <View style={styles.timerInner}>
              <Text
                accessibilityLabel={`${minutes} minutes and ${seconds} seconds ${isFinished ? 'remaining' : running ? 'remaining' : 'paused'}`}
                style={[styles.timerText, ringSize < 220 && styles.timerTextCompact]}
              >
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </Text>
              <Text style={styles.timerSub}>
                {isFinished ? 'Complete!' : running ? 'remaining' : 'paused'}
              </Text>
            </View>
          )}
        </AnimatedCircularProgress>
      </View>

      {/* Duration info */}
      <Text style={styles.durationInfo}>{duration} min session</Text>

      {/* Pause / Resume — primary action */}
      {!isFinished && (
        <Pressable
          style={({ pressed }) => [
            styles.primaryBtn,
            running ? styles.pauseBtn : styles.resumeBtn,
            pressed && { opacity: 0.85 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={running ? 'Pause focus session' : 'Resume focus session'}
          accessibilityState={{ disabled: savingAction }}
          disabled={savingAction}
          onPress={toggleRunning}
        >
          <Text style={styles.primaryBtnText}>
            {running ? '⏸  Pause' : '▶  Resume'}
          </Text>
        </Pressable>
      )}

      {/* Exit — secondary, less prominent */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Exit focus session"
        style={({ pressed }) => [styles.exitBtn, pressed && { opacity: 0.6 }]}
        onPress={() => Alert.alert(
          'Exit focus session?',
          'Your current timer will be cleared and cannot be resumed.',
          [
            { text: 'Keep focusing', style: 'cancel' },
            { text: 'Exit session', style: 'destructive', onPress: async () => {
              try {
                await AsyncStorage.removeItem('@Focus_Duration');
              } catch (e) {
                console.warn('Failed to clear focus session', e);
              }
              router.back();
            } },
          ]
        )}
      >
        <Text style={styles.exitBtnText}>Exit Session</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: S.xxl,
  },
  modeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(199,210,254,0.6)',
    letterSpacing: 2,
    marginBottom: S.sm,
  },
  taskName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e2e8f0',
    textAlign: 'center',
    marginBottom: S.xl,
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  ringWrap: {
    marginVertical: S.xl,
  },
  timerInner: {
    alignItems: 'center',
  },
  timerText: {
    fontSize: 52,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: -2,
  },
  timerTextCompact: { fontSize: 42 },
  timerSub: {
    fontSize: 13,
    color: 'rgba(199,210,254,0.7)',
    fontWeight: '500',
    marginTop: 4,
    letterSpacing: 0.3,
  },
  durationInfo: {
    fontSize: 13,
    color: 'rgba(148,163,184,0.7)',
    marginBottom: S.xxl,
    letterSpacing: 0.2,
  },
  primaryBtn: {
    width: '100%',
    paddingVertical: S.lg,
    borderRadius: R.lg,
    alignItems: 'center',
    marginBottom: S.md,
  },
  pauseBtn: { backgroundColor: 'rgba(245,158,11,0.15)', borderWidth: 1.5, borderColor: '#f59e0b' },
  resumeBtn: { backgroundColor: 'rgba(79,70,229,0.2)', borderWidth: 1.5, borderColor: '#818cf8' },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f8fafc',
    letterSpacing: 0.2,
  },
  exitBtn: {
    paddingVertical: S.md,
  },
  exitBtnText: {
    fontSize: 14,
    color: 'rgba(148,163,184,0.6)',
    fontWeight: '500',
  },
  // Fallback screen
  fallback: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: S.xxl,
  },
  fallbackIcon: { fontSize: 56, marginBottom: S.lg },
  fallbackTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: S.sm,
    letterSpacing: -0.4,
  },
  fallbackSub: {
    fontSize: 15,
    color: 'rgba(148,163,184,0.8)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: S.xxl,
  },
  outlineBtn: {
    paddingVertical: S.md,
    paddingHorizontal: S.xxl,
    borderRadius: R.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(129,140,248,0.5)',
  },
  outlineBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#818cf8',
  },
});