import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Pencil, Trash2 } from 'lucide-react-native';
import { C, S, R } from '../theme';

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_LABELS = { Mon: 'M', Tue: 'T', Wed: 'W', Thu: 'T', Fri: 'F', Sat: 'S', Sun: 'S' };

export default function TaskRowTable({ item, onEdit, onDelete, hasTimeConflict = false }) {
  const hasRepeat = item?.repeatDays?.length > 0;

  return (
    <View style={styles.card}>
      {/* Left accent strip */}
      <View style={styles.strip} />

      {/* Time */}
      <View style={styles.timeCol}>
        <Text style={styles.timeHour}>{item?.time?.split(' ')[0] ?? '--:--'}</Text>
        <Text style={styles.timePeriod}>{item?.time?.split(' ')[1] ?? ''}</Text>
      </View>

      <View style={styles.divider} />

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={styles.title}>
            {item?.title ?? 'Untitled Task'}
          </Text>
          {hasTimeConflict && (
            <View style={styles.conflictBadge} accessibilityLabel="Time conflict">
              <Text style={styles.conflictBadgeText}>Time conflict</Text>
            </View>
          )}
        </View>
        <View style={styles.metaRow}>
          {item?.durationMinutes ? (
            <Text style={styles.duration}>⏱ {item.durationMinutes} min</Text>
          ) : null}
          {/* Repeat day dots */}
          {hasRepeat && (
            <View style={styles.daysRow}>
              {ALL_DAYS.map((d) => (
                <View
                  key={d}
                  style={[
                    styles.dayDot,
                    item.repeatDays.includes(d) && styles.dayDotActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayDotText,
                      item.repeatDays.includes(d) && styles.dayDotTextActive,
                    ]}
                  >
                    {DAY_LABELS[d]}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <Pressable
          onPress={() => onEdit?.(item)}
          style={({ pressed }) => [styles.iconBtn, styles.editBtn, pressed && styles.btnPressed]}
          hitSlop={8}
        >
          <Pencil size={15} color={C.primary} />
        </Pressable>
        <Pressable
          onPress={() => onDelete?.(item)}
          style={({ pressed }) => [styles.iconBtn, styles.deleteBtn, pressed && styles.btnPressed]}
          hitSlop={8}
        >
          <Trash2 size={15} color={C.red} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: R.lg,
    marginBottom: S.sm,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  strip: {
    width: 4,
    alignSelf: 'stretch',
    backgroundColor: C.primary,
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
  },
  divider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: C.border,
    marginVertical: S.sm,
  },
  info: {
    flex: 1,
    paddingVertical: S.md,
    paddingHorizontal: S.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.xs,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  title: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
  },
  conflictBadge: {
    backgroundColor: '#fff0d9',
    borderColor: '#f4b860',
    borderWidth: 1,
    borderRadius: R.full,
    paddingHorizontal: S.sm,
    paddingVertical: 2,
  },
  conflictBadgeText: {
    color: '#9a5800',
    fontSize: 10,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    flexWrap: 'wrap',
  },
  duration: {
    fontSize: 12,
    color: C.textSub,
  },
  daysRow: {
    flexDirection: 'row',
    gap: 2,
  },
  dayDot: {
    width: 16,
    height: 16,
    borderRadius: R.full,
    backgroundColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDotActive: {
    backgroundColor: C.primaryLight,
  },
  dayDotText: {
    fontSize: 8,
    fontWeight: '700',
    color: C.textHint,
  },
  dayDotTextActive: {
    color: C.primary,
  },
  actions: {
    flexDirection: 'row',
    paddingRight: S.md,
    gap: S.xs,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: R.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtn: { backgroundColor: C.primaryLight },
  deleteBtn: { backgroundColor: C.redBg },
  btnPressed: { opacity: 0.7 },
});