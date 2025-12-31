// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import {
  collection,
  doc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Phone,
  Mail,
  User,
  X,
  Filter,
  MoreVertical,
  Star,
  Calendar,
} from 'lucide-react-native';
import ScreenHeader from '../Components/ScreenHeader'
const { width } = Dimensions.get('window');

const StaffScreen = ({ navigation }) => {
  const [staffList, setStaffList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(0));

  // Filtres disponibles
  const filters = [
    { id: 'all', label: 'Tous', count: 0 },
    { id: 'admin', label: 'Admin', count: 0 },
    { id: 'chef-maintenance', label: 'Chef Maintenance', count: 0 },
    { id: 'maintenance', label: 'Technicien', count: 0 },
    { id: 'menage', label: 'Ménage', count: 0 },
    { id: 'receptionniste', label: 'Réception', count: 0 },
  ];

  // Récupérer le personnel depuis Firestore avec optimisation
  useEffect(() => {
    const q = query(
      collection(db, 'staff'),
      orderBy('name', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          joinDate: doc.data().joinDate?.toDate() || new Date(),
        }));
        
        setStaffList(list);
        setLoading(false);
        setRefreshing(false);
        
        // Animation d'entrée
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      },
      (error) => {
        console.error('Erreur Firestore:', error);
        Alert.alert('Erreur', 'Impossible de charger les données du personnel');
        setLoading(false);
        setRefreshing(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Calculer les statistiques par filtre
  const filterStats = useMemo(() => {
    const stats = { all: staffList.length };
    filters.forEach(filter => {
      if (filter.id !== 'all') {
        stats[filter.id] = staffList.filter(staff => staff.role === filter.id).length;
      }
    });
    return stats;
  }, [staffList]);

  // Filtrer et rechercher avec useMemo pour optimiser les performances
  const filteredStaff = useMemo(() => {
    let filtered = staffList;

    // Filtrer par rôle
    if (selectedFilter !== 'all') {
      filtered = filtered.filter((staff) => staff.role === selectedFilter);
    }

    // Filtrer par recherche
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (staff) =>
          staff.name?.toLowerCase().includes(term) ||
          staff.email?.toLowerCase().includes(term) ||
          staff.role?.toLowerCase().includes(term) ||
          staff.specialite?.toLowerCase().includes(term) ||
          staff.tel?.includes(term)
      );
    }

    return filtered;
  }, [staffList, searchTerm, selectedFilter]);

  // Rafraîchir les données
  const onRefresh = useCallback(() => {
    setRefreshing(true);
  }, []);

  // Supprimer un membre avec confirmation
  const handleDelete = useCallback((staffId, staffName) => {
    Alert.alert(
      'Confirmer la suppression',
      `Êtes-vous sûr de vouloir supprimer "${staffName}" ? Cette action est irréversible.`,
      [
        { 
          text: 'Annuler', 
          style: 'cancel',
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'staff', staffId));
              Alert.alert('Succès', `"${staffName}" a été supprimé avec succès`);
            } catch (error) {
              console.error('Erreur suppression:', error);
              Alert.alert('Erreur', 'Impossible de supprimer ce membre du personnel');
            }
          },
        },
      ]
    );
  }, []);

  // Obtenir les informations du badge de rôle
  const getRoleBadge = useCallback((role) => {
    const badges = {
      admin: { label: 'Administrateur', color: '#3498db', icon: '👑' },
      'chef-maintenance': { label: 'Chef Maintenance', color: '#9b59b6', icon: '🔧' },
      maintenance: { label: 'Technicien', color: '#e67e22', icon: '⚙️' },
      menage: { label: 'Agent de Ménage', color: '#2ecc71', icon: '🧹' },
      receptionniste: { label: 'Réceptionniste', color: '#e74c3c', icon: '💼' },
    };
    return badges[role] || { label: role, color: '#95a5a6', icon: '👤' };
  }, []);

  // Formater la date d'embauche
  const formatJoinDate = useCallback((date) => {
    if (!date) return 'Date inconnue';
    
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Aujourd\'hui';
    if (diffDays <= 7) return `Il y a ${diffDays} jours`;
    
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }, []);

  // Rendu d'un membre du personnel
  const renderStaffItem = useCallback(({ item, index }) => {
    const badge = getRoleBadge(item.role);
    const animatedStyle = {
      opacity: fadeAnim,
      transform: [{
        translateY: fadeAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [50, 0],
        }),
      }],
    };

    return (
      <Animated.View style={[styles.card, animatedStyle]}>
        <View style={styles.cardHeader}>
          <View style={styles.avatarContainer}>
            {item.profileImage ? (
              <Image
                source={{ uri: item.profileImage }}
                style={styles.avatar}
                onError={() => console.log('Erreur de chargement de l\'image')}
              />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: badge.color + '20' }]}>
                <Text style={[styles.avatarText, { color: badge.color }]}>
                  {item.name?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              </View>
            )}
            <View style={[styles.statusDot, { backgroundColor: item.isActive ? '#2ecc71' : '#95a5a6' }]} />
          </View>

          <View style={styles.cardInfo}>
            <View style={styles.nameContainer}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              {item.isChef && (
                <Star color="#f39c12" size={16} fill="#f39c12" />
              )}
            </View>
            
            <View style={styles.roleContainer}>
              <Text style={styles.roleIcon}>{badge.icon}</Text>
              <View style={[styles.badge, { backgroundColor: badge.color + '15' }]}>
                <Text style={[styles.badgeText, { color: badge.color }]}>
                  {badge.label}
                </Text>
              </View>
            </View>

            {item.specialite && (
              <Text style={styles.specialite} numberOfLines={1}>
                {item.specialite}
              </Text>
            )}
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.editBtn]}
              onPress={() => navigation.navigate('EditStaff', { staff: item })}
            >
              <Edit color="#3498db" size={18} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.deleteBtn]}
              onPress={() => handleDelete(item.id, item.name)}
            >
              <Trash2 color="#e74c3c" size={18} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.contactInfo}>
            <View style={styles.contactItem}>
              <Mail color="#7f8c8d" size={14} />
              <Text style={styles.contactText} numberOfLines={1}>
                {item.email}
              </Text>
            </View>
            
            {item.tel && (
              <View style={styles.contactItem}>
                <Phone color="#7f8c8d" size={14} />
                <Text style={styles.contactText}>{item.tel}</Text>
              </View>
            )}
          </View>

          <View style={styles.metaInfo}>
            <View style={styles.metaItem}>
              <Calendar color="#7f8c8d" size={12} />
              <Text style={styles.metaText}>
                {formatJoinDate(item.joinDate)}
              </Text>
            </View>
            
            {item.reclamationsCount > 0 && (
              <View style={styles.statsBadge}>
                <Text style={styles.statsText}>
                  {item.reclamationsCount} intervention{item.reclamationsCount > 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    );
  }, [fadeAnim, getRoleBadge, handleDelete, formatJoinDate]);

  // Rendu du header de la liste
  const renderListHeader = useCallback(() => (
    <View style={styles.listHeader}>
      <Text style={styles.listHeaderTitle}>
        {filteredStaff.length} membre{filteredStaff.length > 1 ? 's' : ''} 
        {selectedFilter !== 'all' && ` • ${filters.find(f => f.id === selectedFilter)?.label}`}
        {searchTerm && ` • "${searchTerm}"`}
      </Text>
    </View>
  ), [filteredStaff.length, selectedFilter, searchTerm]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Chargement du personnel...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
    <ScreenHeader 
        title="Gestion du Personnel"
        subtitle="Gestion du staff"
        backgroundColor="#3B82F6"
        onBackPress={() => navigation.goBack()}
        rightButtons={[
          { label: "+ Nouvelle", onPress: () => navigation.navigate('AddStaff') }
        ]}
      />

      {/* Barre de recherche et filtres */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Search color="#7f8c8d" size={20} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Nom, email, spécialité..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor="#bdc3c7"
            returnKeyType="search"
          />
          {searchTerm ? (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={() => setSearchTerm('')}
            >
              <X color="#7f8c8d" size={20} />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.filterToggle}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter color={showFilters ? "#667eea" : "#7f8c8d"} size={20} />
        </TouchableOpacity>
      </View>

      {/* Filtres horizontaux */}
      {showFilters && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersContainer}
          contentContainerStyle={styles.filtersContent}
        >
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterChip,
                selectedFilter === filter.id && styles.filterChipActive,
              ]}
              onPress={() => setSelectedFilter(filter.id)}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedFilter === filter.id && styles.filterTextActive,
                ]}
              >
                {filter.label}
              </Text>
              <View style={[
                styles.filterCount,
                selectedFilter === filter.id && styles.filterCountActive
              ]}>
                <Text style={[
                  styles.filterCountText,
                  selectedFilter === filter.id && styles.filterCountTextActive
                ]}>
                  {filterStats[filter.id] || 0}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Liste du personnel */}
      <FlatList
        data={filteredStaff}
        renderItem={renderStaffItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <User color="#bdc3c7" size={80} />
            <Text style={styles.emptyTitle}>
              {searchTerm || selectedFilter !== 'all' ? 'Aucun résultat' : 'Aucun membre'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchTerm 
                ? `Aucun membre ne correspond à "${searchTerm}"`
                : selectedFilter !== 'all'
                ? `Aucun membre dans la catégorie "${filters.find(f => f.id === selectedFilter)?.label}"`
                : 'Commencez par ajouter un membre du personnel'
              }
            </Text>
            {(searchTerm || selectedFilter !== 'all') && (
              <TouchableOpacity 
                style={styles.resetButton}
                onPress={() => {
                  setSearchTerm('');
                  setSelectedFilter('all');
                }}
              >
                <Text style={styles.resetButtonText}>Réinitialiser les filtres</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#667eea']}
            tintColor="#667eea"
          />
        }
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },

  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  clearButton: {
    padding: 4,
  },
  filterToggle: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filtersContainer: {
  backgroundColor: '#fff',
  borderBottomWidth: 1,
  borderBottomColor: '#e2e8f0',
  // Ajoutez une hauteur fixe ou min-height si nécessaire
  height: 70, 
},
 filtersContent: {
  paddingHorizontal: 16,
  alignItems: 'center', // Aligne les puces verticalement au centre
  gap: 8,
  // Très important : permet au contenu de s'étendre au-delà de l'écran
  flexDirection: 'row', 
},
filterChip: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 16,
  paddingVertical: 10, // Augmentez un peu pour donner de l'espace
  borderRadius: 20,
  backgroundColor: '#f8fafc',
  borderWidth: 1,
  borderColor: '#e2e8f0',
  marginRight: 8,
  // Empêche le bouton de s'écraser
  minWidth: 80, 
},
  filterChipActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginRight: 6,
  },
  filterTextActive: {
    color: '#fff',
  },
  filterCount: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  filterCountActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  filterCountTextActive: {
    color: '#fff',
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  listHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f1f5f9',
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  roleIcon: {
    fontSize: 14,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  specialite: {
    fontSize: 14,
    color: '#64748b',
    fontStyle: 'italic',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  editBtn: {
    backgroundColor: '#f0f9ff',
    borderColor: '#e0f2fe',
  },
  deleteBtn: {
    backgroundColor: '#fef2f2',
    borderColor: '#fee2e2',
  },
  cardContent: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  contactInfo: {
    gap: 8,
    marginBottom: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
  },
  metaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  statsBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statsText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },
  resetButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#667eea',
    borderRadius: 12,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default StaffScreen;