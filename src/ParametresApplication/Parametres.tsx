import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  SafeAreaView,
  Alert
} from 'react-native';
import {
  User,
  Bell,
  Lock,
  Eye,
  Globe,
  HelpCircle,
  LogOut,
  ChevronRight,
  Info,
  Palette
} from 'lucide-react-native';

export default function SettingsScreen({ navigation }: any) {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  // Composant pour chaque ligne de réglage
  const SettingItem = ({ icon: Icon, title, value, type, onPress, color = "#64748B" }: any) => (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onPress}
      disabled={type === 'switch'}
    >
      <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
        <Icon size={22} color={color} />
      </View>
      
      <View style={styles.settingInfo}>
        <Text style={styles.settingTitle}>{title}</Text>
      </View>

      {type === 'switch' ? (
        <Switch
          value={value}
          onValueChange={onPress}
          trackColor={{ false: "#CBD5E1", true: "#3B82F6" }}
        />
      ) : (
        <View style={styles.rightContent}>
          {value && <Text style={styles.settingValue}>{value}</Text>}
          <ChevronRight size={20} color="#94A3B8" />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Paramètres</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Section Compte */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Mon Compte</Text>
          <View style={styles.card}>
            <SettingItem 
              icon={User} 
              title="Profil" 
              value="Admin" 
              color="#3B82F6" 
              onPress={() => navigation.navigate('Profile')}
            />
            <SettingItem 
              icon={Lock} 
              title="Sécurité & Mot de passe" 
              color="#10B981" 
              onPress={() => {}} 
            />
          </View>
        </View>

        {/* Section Application */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Application</Text>
          <View style={styles.card}>
            <SettingItem 
              icon={Bell} 
              title="Notifications" 
              type="switch" 
              value={notifications}
              color="#F59E0B"
              onPress={() => setNotifications(!notifications)} 
            />
            <SettingItem 
              icon={Palette} 
              title="Mode Sombre" 
              type="switch" 
              value={darkMode}
              color="#6366F1"
              onPress={() => setDarkMode(!darkMode)} 
            />
            <SettingItem 
              icon={Globe} 
              title="Langue" 
              value="Français" 
              color="#EC4899"
              onPress={() => {}} 
            />
          </View>
        </View>

        {/* Section Support */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Assistance</Text>
          <View style={styles.card}>
            <SettingItem icon={HelpCircle} title="Centre d'aide" color="#8B5CF6" onPress={() => {}} />
            <SettingItem icon={Info} title="À propos" color="#64748B" onPress={() => {}} />
          </View>
        </View>

        {/* Déconnexion */}
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={() => Alert.alert("Déconnexion", "Voulez-vous vous déconnecter ?")}
        >
          <LogOut size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Version 1.0.2</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 24, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1E293B' },
  scrollContent: { padding: 16 },
  section: { marginBottom: 24 },
  sectionHeader: { fontSize: 13, fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginLeft: 8, marginBottom: 8 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' },
  settingItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  iconContainer: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  settingInfo: { flex: 1 },
  settingTitle: { fontSize: 16, color: '#334155', fontWeight: '500' },
  settingValue: { fontSize: 14, color: '#94A3B8', marginRight: 8 },
  rightContent: { flexDirection: 'row', alignItems: 'center' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20, padding: 16, backgroundColor: '#FEF2F2', borderRadius: 16 },
  logoutText: { color: '#EF4444', fontWeight: '600', marginLeft: 8, fontSize: 16 },
  version: { textAlign: 'center', color: '#94A3B8', fontSize: 12, marginTop: 24, marginBottom: 40 }
});