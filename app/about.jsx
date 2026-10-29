import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, S, R } from '../theme';

const FEATURES = [
  { icon: '🗓️', title: 'Weekly Timetable', desc: 'Build a repeating schedule with per-day tasks' },
  { icon: '✅', title: 'Daily Progress', desc: 'Track started and completed tasks every day' },
  { icon: '🎯', title: 'Focus Mode', desc: 'Countdown timer tied to your task duration' },
  { icon: '📅', title: 'Calendar View', desc: 'Browse any date and see historical progress' },
  { icon: '🔔', title: 'Reminders', desc: 'Automatic notifications when a task is about to start' },
];

export default function About() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageEyebrow}>YOUR PRODUCTIVITY COMPANION</Text>
        <Text style={styles.pageTitle}>About My Schedule</Text>
        <Text style={styles.pageSubtitle}>A calmer way to plan your day and build momentum.</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.appIcon}>
            <Text style={styles.appIconEmoji}>📆</Text>
          </View>
          <Text style={styles.appName}>My Schedule</Text>
          <Text style={styles.appTagline}>Plan your day. Stay focused. Achieve more.</Text>
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>Version 1.0.0</Text>
          </View>
        </View>

        {/* Features */}
        <Text style={styles.sectionHeading}>What's Inside</Text>
        <View style={styles.featureList}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureIconText}>{f.icon}</Text>
              </View>
              <View style={styles.featureBody}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Built with */}
        <Text style={styles.sectionHeading}>Built With</Text>
        <View style={styles.techCard}>
          {['React Native', 'Expo', 'Expo Router', 'AsyncStorage', 'Expo Notifications'].map((tech) => (
            <View key={tech} style={styles.techPill}>
              <Text style={styles.techText}>{tech}</Text>
            </View>
          ))}
        </View>

        {/* Developer */}
        <Text style={styles.sectionHeading}>Developer</Text>
        <View style={styles.devCard}>
          <View style={styles.devAvatar}>
            <Text style={styles.devAvatarText}>HU</Text>
          </View>
          <View>
            <Text style={styles.devName}>Harsh Upadhyay</Text>
            <Text style={styles.devRole}>Creator & Developer</Text>
          </View>
        </View>

        <Text style={styles.footer}>Made with ❤️ in React Native</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  pageHeader: { paddingHorizontal: S.lg, paddingTop: S.lg, paddingBottom: S.sm, backgroundColor: C.bg },
  pageEyebrow: { fontSize: 10, fontWeight: '800', color: C.primary, letterSpacing: 1.2, marginBottom: S.xs },
  pageTitle: { fontSize: 26, lineHeight: 32, fontWeight: '800', color: C.text, letterSpacing: -0.7 },
  pageSubtitle: { fontSize: 13, lineHeight: 19, color: C.textSub, marginTop: S.xs },
  scroll: { paddingHorizontal: S.lg, paddingTop: S.sm, paddingBottom: 24 },

  // Hero
  hero: {
    alignItems: 'center',
    paddingVertical: S.lg,
    marginBottom: S.sm,
  },
  appIcon: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: S.md,
    borderWidth: 1,
    borderColor: C.primary + '33',
  },
  appIconEmoji: { fontSize: 40 },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.8,
    marginBottom: S.xs,
  },
  appTagline: {
    fontSize: 14,
    color: C.textSub,
    marginBottom: S.md,
    textAlign: 'center',
  },
  versionBadge: {
    backgroundColor: C.primaryLight,
    borderRadius: R.full,
    paddingHorizontal: S.md,
    paddingVertical: 4,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.primary,
  },

  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: C.textSub,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: S.sm,
    marginTop: S.md,
  },

  // Features
  featureList: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: S.md,
    paddingHorizontal: S.lg,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: S.md,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: R.sm,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIconText: { fontSize: 20 },
  featureBody: { flex: 1 },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    color: C.textSub,
    lineHeight: 16,
  },

  // Tech
  techCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: S.sm,
  },
  techPill: {
    backgroundColor: C.surface,
    borderRadius: R.full,
    paddingHorizontal: S.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: C.border2,
  },
  techText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textSub,
  },

  // Dev
  devCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.lg,
    gap: S.md,
    borderWidth: 1,
    borderColor: C.border,
  },
  devAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  devAvatarText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  devName: { fontSize: 16, fontWeight: '700', color: C.text },
  devRole: { fontSize: 13, color: C.textSub, marginTop: 2 },

  footer: {
    textAlign: 'center',
    fontSize: 13,
    color: C.textHint,
    marginTop: S.xxl,
  },
});