import { View, Text, StyleSheet } from 'react-native';
import { C, S, R } from '../theme';

function getMotivation(done, total) {
  if (total === 0) return 'Add tasks to get started 🚀';
  if (done === 0) return "Let's get moving! 💪";
  if (done === total) return 'All done — amazing work! 🎉';
  if (done / total >= 0.7) return 'Almost there, keep going! 🔥';
  if (done / total >= 0.4) return 'Good progress, stay focused! ⚡';
  return 'Nice start, keep it up! 👊';
}

export default function StatsRow({ tasks = [], selectedDate, dark = false }) {
  const list = tasks.filter((t) => !t.date || t.date === selectedDate);
  const total = list.length;
  const done = list.filter((t) => t.completed).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <View style={[styles.card, dark && styles.cardDark]}>
      <View style={styles.cardHeading}>
        <View>
          <Text style={[styles.cardEyebrow, dark && styles.textMutedDark]}>DAILY PROGRESS</Text>
          <Text style={[styles.cardTitle, dark && styles.textPrimaryDark]}>{pct}% completed</Text>
        </View>
        <View style={[styles.progressIcon, dark && styles.progressIconDark]}>
          <Text style={[styles.progressIconText, dark && styles.progressIconTextDark]}>{pct === 100 && total > 0 ? '✓' : '↗'}</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressRow}>
        <View style={[styles.progressOuter, dark && styles.progressOuterDark]}>
          <View style={[styles.progressInner, { width: `${pct}%` }]} />
        </View>
        <Text style={[styles.pctLabel, dark && styles.pctLabelDark]}>{pct}%</Text>
      </View>

      {/* Motivational line */}
      <Text style={[styles.motivation, dark && styles.textMutedDark]}>{getMotivation(done, total)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    marginHorizontal: S.lg,
    marginTop: S.sm,
    marginBottom: S.xs,
    borderRadius: R.lg,
    padding: S.lg,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardDark: { backgroundColor: '#121a2e', borderColor: '#26324d', shadowOpacity: 0.18 },
  textMutedDark: { color: '#93a0bd' },
  textPrimaryDark: { color: '#f1f5ff' },
  progressIconDark: { backgroundColor: '#252f50' },
  progressIconTextDark: { color: '#a5b4fc' },
  progressOuterDark: { backgroundColor: '#28324a' },
  pctLabelDark: { color: '#a5b4fc' },
  cardHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: S.sm },
  cardEyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, color: C.textHint, marginBottom: 3 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: C.text, letterSpacing: -0.4 },
  progressIcon: { width: 36, height: 36, borderRadius: R.md, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' },
  progressIconText: { color: C.primary, fontSize: 20, fontWeight: '800' },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
  },
  progressOuter: {
    flex: 1,
    height: 7,
    backgroundColor: C.border,
    borderRadius: R.full,
    overflow: 'hidden',
  },
  progressInner: {
    height: 7,
    backgroundColor: C.primary,
    borderRadius: R.full,
  },
  pctLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: C.primary,
    minWidth: 32,
    textAlign: 'right',
  },
  motivation: {
    fontSize: 12,
    color: C.textSub,
    marginTop: S.sm,
    fontWeight: '500',
  },
});