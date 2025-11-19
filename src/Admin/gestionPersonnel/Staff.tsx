// @ts-nocheck

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Modal,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  onSnapshot,
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
} from 'lucide-react-native';

const StaffScreen = ({ navigation }) => {
  const [staffList, setStaffList] = useState([]);
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Récupérer le personnel depuis Firestore (temps réel)
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'staff'),
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setStaffList(list);
        setFilteredStaff(list);
        setLoading(false);
        setRefreshing(false);
      },
      (error) => {
        console.error('Erreur Firestore:', error);
        Alert.alert('Erreur', 'Impossible de charger les données');
        setLoading(false);
        setRefreshing(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filtrer par recherche
  useEffect(() => {
    let filtered = staffList;

    // Filtrer par rôle
    if (selectedFilter !== 'all') {
      filtered = filtered.filter((staff) => staff.role === selectedFilter);
    }

    // Filtrer par recherche
    if (searchTerm) {
      filtered = filtered.filter(
        (staff) =>
          staff.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          staff.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          staff.role?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredStaff(filtered);
  }, [searchTerm, staffList, selectedFilter]);

  // Rafraîchir
  const onRefresh = () => {
    setRefreshing(true);
  };

  // Supprimer un membre
  const handleDelete = (staffId, staffName) => {
    Alert.alert(
      'Confirmation',
      `Voulez-vous vraiment supprimer ${staffName} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'staff', staffId));
              Alert.alert('Succès', `${staffName} a été supprimé`);
            } catch (error) {
              console.error('Erreur suppression:', error);
              Alert.alert('Erreur', 'Impossible de supprimer');
            }
          },
        },
      ]
    );
  };

  // Obtenir le badge de rôle
  const getRoleBadge = (role) => {
    const badges = {
      admin: { label: 'Admin', color: '#3498db' },
      'chef-maintenance': { label: 'Chef Maintenance', color: '#9b59b6' },
      maintenance: { label: 'Maintenance', color: '#e67e22' },
      menage: { label: 'Ménage', color: '#2ecc71' },
      receptionniste: { label: 'Réception', color: '#e74c3c' },
    };
    return badges[role] || { label: role, color: '#95a5a6' };
  };

  // Rendu d'un membre du personnel
  const renderStaffItem = ({ item }) => {
    const badge = getRoleBadge(item.role);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          {item.profileImage ? (
            <Image
              source={{ uri: item.profileImage }}
              style={styles.avatar}
              onError={(e) => console.log('Image error:', e.nativeEvent.error)}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <User color="#95a5a6" size={30} />
            </View>
          )}

          <View style={styles.cardInfo}>
            <Text style={styles.name}>{item.name}</Text>
            <View style={[styles.badge, { backgroundColor: badge.color + '20' }]}>
              <Text style={[styles.badgeText, { color: badge.color }]}>
                {badge.label}
              </Text>
            </View>
            {item.specialite && (
              <Text style={styles.specialite}>• {item.specialite}</Text>
            )}
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.editBtn]}
              onPress={() =>
                navigation.navigate('EditStaff', { staff: item })
              }
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

        <View style={styles.cardFooter}>
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
      </View>
    );
  };

  // Filtres rapides
  const filters = [
    { id: 'all', label: 'Tous' },
    { id: 'admin', label: 'Admin' },
    { id: 'maintenance', label: 'Maintenance' },
    { id: 'menage', label: 'Ménage' },
    { id: 'receptionniste', label: 'Réception' },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Personnel</Text>
          <Text style={styles.headerSubtitle}>
            {filteredStaff.length} membre{filteredStaff.length > 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddStaff')}
        >
          <Plus color="#fff" size={24} />
        </TouchableOpacity>
      </View>

      {/* Barre de recherche */}
      <View style={styles.searchContainer}>
        <Search color="#7f8c8d" size={20} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par nom, email..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholderTextColor="#bdc3c7"
        />
        {searchTerm ? (
          <TouchableOpacity onPress={() => setSearchTerm('')}>
            <X color="#7f8c8d" size={20} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filtres */}
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
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Liste du personnel */}
      {filteredStaff.length === 0 ? (
        <View style={styles.emptyContainer}>
          <User color="#bdc3c7" size={60} />
          <Text style={styles.emptyText}>Aucun membre trouvé</Text>
          <Text style={styles.emptySubtext}>
            {searchTerm
              ? 'Essayez une autre recherche'
              : 'Commencez par ajouter un membre'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredStaff}
          renderItem={renderStaffItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#667eea']}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f6fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#7f8c8d',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 4,
  },
  addButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 15,
    paddingHorizontal: 15,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#2c3e50',
  },
  filtersContainer: {
    maxHeight: 50,
    marginBottom: 10,
  },
  filtersContent: {
    paddingHorizontal: 15,
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 8,
    elevation: 1,
  },
  filterChipActive: {
    backgroundColor: '#667eea',
    elevation: 3,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  filterTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 15,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ecf0f1',
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ecf0f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 6,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  specialite: {
    fontSize: 12,
    color: '#7f8c8d',
    fontStyle: 'italic',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtn: {
    backgroundColor: '#e3f2fd',
  },
  deleteBtn: {
    backgroundColor: '#ffebee',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    paddingTop: 12,
    gap: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 13,
    color: '#555',
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default StaffScreen;