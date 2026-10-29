import { View, Text, StyleSheet } from 'react-native';
import { C, S, R } from '../theme';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning ☀️';
  if (h < 17) return 'Good afternoon 🌤️';
  return 'Good evening 🌙';
}

export default function Header({ dark = false }) {
  const today = new Date();
  return (
    <View style={[styles.header, dark && styles.headerDark]}>
      <View>
        <Text style={[styles.greeting, dark && styles.greetingDark]}>{getGreeting()}</Text>
        <Text style={[styles.title, styles.homeTitle, dark && styles.titleDark]}>Make today count</Text>
      </View>
      <View style={[styles.dateBadge, dark && styles.dateBadgeDark]}>
        <Text style={[styles.dateWeekday, dark && styles.dateTextDark]}>
          {today.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
        </Text>
        <Text style={[styles.dateNum, dark && styles.dateTextDark]}>{today.getDate()}</Text>
        <Text style={[styles.dateMon, dark && styles.dateTextDark]}>
          {today.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: S.lg,
    paddingTop: S.md,
    paddingBottom: S.md,
    backgroundColor: C.bg,
    paddingTop: S.lg,
    paddingBottom: S.md,
  },
  headerDark: { backgroundColor: '#0b1020' },
  greetingDark: { color: '#9ca9c8' },
  titleDark: { color: '#a5b4fc' },
  dateBadgeDark: { backgroundColor: '#202947', borderWidth: 1, borderColor: '#303b61' },
  dateTextDark: { color: '#c7d2fe' },
  greeting: {
    fontSize: 12,
    color: C.textSub,
    fontWeight: '500',
    marginBottom: 2,
    letterSpacing: 0.1,
  },
  title: {
    fontSize: 25,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.7,
  },
  homeTitle: {
    color: C.primary,
    fontSize: 24,
    letterSpacing: -0.6,
  },
  dateBadge: {
    backgroundColor: C.primaryLight,
    borderRadius: R.lg,
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
    alignItems: 'center',
    minWidth: 52,
  },
  dateWeekday: {
    fontSize: 9,
    color: C.primary,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  dateNum: {
    fontSize: 24,
    color: C.primary,
    fontWeight: '800',
    lineHeight: 28,
  },
  dateMon: {
    fontSize: 9,
    color: '#c7d2fe',
    fontWeight: '700',
    letterSpacing: 0.8,
  },
});