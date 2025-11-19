// @ts-nocheck




import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Modal,
  StatusBar,
  FlatList,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import {
  User,
  Bed,
  AlertCircle,
  AlertTriangle,
  Shield,
  Building,
  Truck,
  MessageSquare,
  MessageCircle,
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  ChevronRight,
} from 'lucide-react-native';

// --- CONSTANTES ---
const { width } = Dimensions.get('window');
const CARD_GAP = 15;
// Calcul dynamique : (Largeur écran - padding total - gap entre cartes) / 2 colonnes
const CARD_WIDTH = (width - 30 - CARD_GAP) / 2;

const MENU_ITEMS = [
  { id: '1', title: 'Tableau de bord', icon: LayoutDashboard, route: 'DashboardAdmin', color: '#3498db' },
  { id: '2', title: 'Personnel', icon: User, route: 'staff', color: '#9b59b6' },
//   { id: '3', title: 'Gestion des chambres', icon: Bed, route: 'Chambre', color: '#e74c3c' },
//   { id: '4', title: 'Réclamations', icon: AlertCircle, route: 'Reclamations', color: '#f39c12' },
//   { id: '5', title: 'Alerte Réclamation', icon: AlertTriangle, route: 'EscaladeReclamation', color: '#e67e22' },
//   { id: '6', title: 'Gestion des rôles', icon: Shield, route: 'Roles', color: '#1abc9c' },
//   { id: '7', title: 'Gestion des espaces', icon: Building, route: 'Espaces', color: '#34495e' },
//   { id: '8', title: 'Fournisseurs', icon: Truck, route: 'Fournisseurs', color: '#16a085' },
//   { id: '9', title: 'Message', icon: MessageSquare, route: 'Message', color: '#2ecc71' },
//   { id: '10', title: 'Chat', icon: MessageCircle, route: 'Chat', color: '#27ae60' },
 ];

// --- SOUS-COMPOSANTS ---

// 1. Carte du tableau de bord
const DashboardCard = ({ item, onPress }) => (
  <TouchableOpacity
    style={[styles.card, { borderLeftColor: item.color, width: CARD_WIDTH }]}
    onPress={() => onPress(item.route)}
    activeOpacity={0.7}
  >
    <View style={[styles.iconContainer, { backgroundColor: `${item.color}15` }]}>
      <item.icon color={item.color} size={32} />
    </View>
    <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
  </TouchableOpacity>
);

// 2. Élément du menu latéral
const SideMenuItem = ({ item, onPress }) => (
  <TouchableOpacity style={styles.sideMenuItem} onPress={() => onPress(item.route)}>
    <View style={[styles.sideMenuIconContainer, { backgroundColor: item.color }]}>
      <item.icon color="#fff" size={20} />
    </View>
    <Text style={styles.sideMenuItemText}>{item.title}</Text>
    <ChevronRight size={16} color="#bdc3c7" style={{ marginLeft: 'auto' }} />
  </TouchableOpacity>
);

// --- COMPOSANT PRINCIPAL ---
const AdminDashboard = ({ navigation }) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await signOut(auth);
              navigation.replace('Login');
            } catch (error) {
              console.error('Erreur lors de la déconnexion', error);
              Alert.alert('Erreur', 'Impossible de se déconnecter. Vérifiez votre connexion.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const navigateToScreen = useCallback((route) => {
    setMenuVisible(false);
    if (route && typeof route === 'string') {
      // Optionnel : éviter de naviguer vers l'écran actuel
      // if (route === 'Dashboard') return; 
      navigation.navigate(route);
    }
  }, [navigation]);

  // Header de la liste (Le titre "Bienvenue")
  const ListHeader = () => (
    <View style={styles.welcomeCard}>
      <View>
        <Text style={styles.welcomeTitle}>Bienvenue, Admin</Text>
        <Text style={styles.welcomeSubtitle}>Gestion complète de votre hôtel</Text>
      </View>
      <View style={styles.welcomeIconBg}>
        <LayoutDashboard color="#2c3e50" size={24} opacity={0.5} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2c3e50" />

      {/* En-tête fixe */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.headerButton}>
          <Menu color="#fff" size={26} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>HotelNet Admin</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.headerButton} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <LogOut color="#fff" size={24} />
          )}
        </TouchableOpacity>
      </View>

      {/* Contenu principal avec FlatList */}
      <FlatList
        data={MENU_ITEMS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <DashboardCard item={item} onPress={navigateToScreen} />}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={ListHeader}
        showsVerticalScrollIndicator={false}
      />

      {/* Modal Menu Latéral */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={menuVisible}
        onRequestClose={() => setMenuVisible(false)}
      >
        <View style={styles.modalOverlay}>
          {/* Zone cliquable pour fermer */}
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setMenuVisible(false)}
          />
          
          {/* Panneau latéral */}
          <View style={styles.sideMenu}>
            <View style={styles.sideMenuHeader}>
              <Text style={styles.sideMenuTitle}>Menu Admin</Text>
              <TouchableOpacity onPress={() => setMenuVisible(false)} style={styles.closeButton}>
                <X color="#2c3e50" size={24} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={MENU_ITEMS}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <SideMenuItem item={item} onPress={navigateToScreen} />}
              contentContainerStyle={styles.sideMenuContent}
              showsVerticalScrollIndicator={false}
            />

            <View style={styles.sideMenuFooter}>
              <TouchableOpacity style={styles.sideMenuLogout} onPress={handleLogout}>
                <View style={styles.logoutIconContainer}>
                  <LogOut color="#e74c3c" size={20} />
                </View>
                <Text style={styles.sideMenuLogoutText}>Déconnexion</Text>
              </TouchableOpacity>
              <Text style={styles.versionText}>v1.0.0</Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2c3e50',
    paddingHorizontal: 20,
    paddingVertical: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  headerButton: {
    padding: 5,
  },
  // FlatList Styles
  listContent: {
    padding: 15,
    paddingBottom: 30,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: CARD_GAP,
  },
  // Welcome Card
  welcomeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 25,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2c3e50',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#95a5a6',
    fontWeight: '500',
  },
  welcomeIconBg: {
    backgroundColor: '#f0f2f5',
    padding: 10,
    borderRadius: 12,
  },
  // Dashboard Card Styles
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    borderLeftWidth: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 130,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#34495e',
    textAlign: 'center',
    marginTop: 5,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    flexDirection: 'row',
  },
  modalBackdrop: {
    width: '20%', // L'espace vide à droite
    height: '100%',
  },
  sideMenu: {
    width: '80%',
    backgroundColor: '#fff',
    height: '100%',
    elevation: 10,
  },
  sideMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40, // Pour la status bar si transparent
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sideMenuTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  closeButton: {
    padding: 5,
    backgroundColor: '#f5f6fa',
    borderRadius: 20,
  },
  sideMenuContent: {
    padding: 15,
  },
  sideMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  sideMenuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  sideMenuItemText: {
    fontSize: 15,
    color: '#34495e',
    fontWeight: '500',
  },
  sideMenuFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fafafa',
  },
  sideMenuLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffebee',
  },
  logoutIconContainer: {
    backgroundColor: '#ffebee',
    padding: 8,
    borderRadius: 8,
    marginRight: 15,
  },
  sideMenuLogoutText: {
    fontSize: 16,
    color: '#e74c3c',
    fontWeight: '600',
  },
  versionText: {
    textAlign: 'center',
    color: '#bdc3c7',
    fontSize: 12,
    marginTop: 15,
  },
});

export default AdminDashboard;