import { View, Pressable, Text, StyleSheet } from 'react-native';

export default function SubTabs({ active='all', onChange }) {
  const tabs = [
    { key:'pending', label:'Pending' },
    { key:'started', label:'Started' },
    { key:'completed', label:'Completed' },
  ];
  return (
    <View style={styles.wrap}>
      {tabs.map(t => (
        <Pressable key={t.key} onPress={() => onChange(t.key)} style={[styles.tab, active===t.key && styles.active]}>
          <Text style={[styles.tabText, active===t.key && styles.activeText]}>{t.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection:'row', justifyContent:'center', gap:12, paddingVertical:12 },
  tab: { paddingVertical:6, paddingHorizontal:14, borderRadius:20 },
  active: { backgroundColor:'#eef2ff' },
  tabText: { color:'#444', fontWeight:'600' },
  activeText: { color:'#4f46e5' }
});
