// AdminReclamations.tsx
// @ts-nocheck

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Image,
  RefreshControl,
  Alert,
  Dimensions,
  Platform
} from 'react-native';
import { collection, query, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';

const { width } = Dimensions.get('window');

const AdminReclamations = ({ navigation }: any) => {
  const [reclamations, setReclamations] = useState([]);
  const [agents, setAgents] = useState([]);
  const [currentView, setCurrentView] = useState('all');
  const [selectedReclamation, setSelectedReclamation] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);


  // États pour la pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filtres
  const [filters, setFilters] = useState({
    status: '',
    urgency: '',
    searchTerm: ''
  });

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    enRetard: 0,
    terminees: 0,
    enCours: 0
  });

  // Récupérer toutes les réclamations
  useEffect(() => {
    const q = query(collection(db, 'reclamations'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      }));
      setReclamations(data);
      calculateStats(data);
    });
    return () => unsubscribe();
  }, []);

  // Récupérer les agents
  useEffect(() => {
    const q = query(collection(db, 'staff'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAgents(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
    });
    return () => unsubscribe();
  }, []);

  // Calculer les statistiques
  const calculateStats = useCallback((data) => {
    const now = new Date();
    const stats = {
      total: data.length,
      enRetard: 0,
      terminees: data.filter(r => r.status === 'résolu' || r.status === 'clôturé').length,
      enCours: data.filter(r => r.status === 'assigné' || r.status === 'en cours').length
    };

    data.forEach(rec => {
      if (rec.status !== 'résolu' && rec.status !== 'clôturé' && rec.createdAt) {
        const delaiHeures = getDelaiByUrgency(rec.urgency);
        const tempsEcoule = (now - rec.createdAt) / (1000 * 60 * 60);
        if (tempsEcoule > delaiHeures) {
          stats.enRetard++;
        }
      }
    });

    setStats(stats);
  }, []);

  // Obtenir le délai selon l'urgence
  const getDelaiByUrgency = (urgency) => {
    const delais = {
      'tres_urgent': 0,
      'urgent': 4,
      'moyen': 24,
      'bas': 48,
      'high': 4,
      'medium': 24,
      'low': 48
    };
    return delais[urgency] || 24;
  };

  // Vérifier si une réclamation est en retard
  const isEnRetard = useCallback((reclamation) => {
    if (reclamation.status === 'résolu' || reclamation.status === 'clôturé') return false;
    if (!reclamation.createdAt) return false;

    const now = new Date();
    const delaiHeures = getDelaiByUrgency(reclamation.urgency);
    const tempsEcoule = (now - reclamation.createdAt) / (1000 * 60 * 60);
    
    return tempsEcoule > delaiHeures;
  }, []);

  // Filtrer les réclamations
  const filteredReclamations = useMemo(() => {
    return reclamations.filter(rec => {
      if (filters.status && rec.status !== filters.status) return false;
      if (filters.urgency && rec.urgency !== filters.urgency) return false;
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        return (
          rec.roomNumber?.toLowerCase().includes(term) ||
          rec.problem?.toLowerCase().includes(term) ||
          rec.categorie?.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [reclamations, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredReclamations.length / itemsPerPage);
  const paginatedReclamations = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredReclamations.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredReclamations, currentPage]);

  // Calculer les statistiques par agent
  const getAgentStats = useCallback((agentUid) => {
    const agentRecs = reclamations.filter(r => r.agentAssigne?.uid === agentUid);
    const total = agentRecs.length;
    const terminees = agentRecs.filter(r => r.status === 'résolu' || r.status === 'clôturé').length;
    const enRetard = agentRecs.filter(r => isEnRetard(r)).length;
    const tauxReussite = total > 0 ? Math.round((terminees / total) * 100) : 0;

    return { total, terminees, enRetard, tauxReussite };
  }, [reclamations, isEnRetard]);

  // Changer le statut d'une réclamation
  const handleStatusChange = async (recId, newStatus) => {
    try {
      await updateDoc(doc(db, 'reclamations', recId), {
        status: newStatus,
        updatedAt: new Date()
      });
      Alert.alert('Succès', 'Statut mis à jour');
    } catch (error) {
      console.error('Erreur lors du changement de statut:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour le statut');
    }
  };

  // Formater la durée écoulée
  const formatDuree = (date) => {
    if (!date) return 'N/A';
    const now = new Date();
    const diff = now - date;
    const heures = Math.floor(diff / (1000 * 60 * 60));
    const jours = Math.floor(heures / 24);
    
    if (jours > 0) return `${jours}j ${heures % 24}h`;
    return `${heures}h`;
  };

  const getUrgencyColor = (urgency) => {
    const colors = {
      'tres_urgent': '#DC2626',
      'urgent': '#EA580C',
      'moyen': '#CA8A04',
      'bas': '#2563EB',
      'high': '#DC2626',
      'medium': '#CA8A04',
      'low': '#2563EB'
    };
    return colors[urgency] || '#6B7280';
  };

  const getStatusColor = (status) => {
    const colors = {
      'en attente': '#9CA3AF',
      'assigné': '#3B82F6',
      'en cours': '#F59E0B',
      'résolu': '#10B981',
      'clôturé': '#6B7280'
    };
    return colors[status] || '#9CA3AF';
  };

  const getUrgencyLabel = (urgency) => {
    const labels = {
      'tres_urgent': 'Très Urgent',
      'urgent': 'Urgent',
      'moyen': 'Moyen',
      'bas': 'Bas',
      'high': 'Urgent',
      'medium': 'Moyen',
      'low': 'Bas'
    };
    return labels[urgency] || urgency;
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const resetFilters = () => {
    setFilters({ status: '', urgency: '', searchTerm: '' });
    setCurrentPage(1);
  };

  // Ouvrir les détails
  const openDetails = (rec) => {
    setSelectedReclamation(rec);
    setShowDetailModal(true);
  };

  // Composant Carte Statistique
  const StatCard = ({ value, label, color }) => (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, color && { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  // Composant Badge Urgence
  const UrgencyBadge = ({ urgency }) => (
    <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(urgency) + '20' }]}>
      <View style={[styles.urgencyDot, { backgroundColor: getUrgencyColor(urgency) }]} />
      <Text style={[styles.urgencyText, { color: getUrgencyColor(urgency) }]}>
        {getUrgencyLabel(urgency)}
      </Text>
    </View>
  );

  // Composant Carte Agent
  const AgentCard = ({ agent }) => {
    const agentStats = getAgentStats(agent.uid);
    if (agentStats.total === 0) return null;

    return (
      <View style={styles.agentCard}>
        <View style={styles.agentHeader}>
          <View>
            <Text style={styles.agentName}>{agent.name}</Text>
            <Text style={styles.agentRole}>{agent.specialite || agent.role}</Text>
          </View>
        </View>
        
        <View style={styles.agentStatsGrid}>
          <View style={[styles.agentStatItem, { backgroundColor: '#EEF2FF' }]}>
            <Text style={[styles.agentStatValue, { color: '#667eea' }]}>{agentStats.total}</Text>
            <Text style={styles.agentStatLabel}>Total</Text>
          </View>
          <View style={[styles.agentStatItem, { backgroundColor: '#D1FAE5' }]}>
            <Text style={[styles.agentStatValue, { color: '#10B981' }]}>{agentStats.terminees}</Text>
            <Text style={styles.agentStatLabel}>Terminées</Text>
          </View>
          <View style={[styles.agentStatItem, { backgroundColor: '#FEE2E2' }]}>
            <Text style={[styles.agentStatValue, { color: '#DC2626' }]}>{agentStats.enRetard}</Text>
            <Text style={styles.agentStatLabel}>En retard</Text>
          </View>
          <View style={[styles.agentStatItem, { backgroundColor: '#FEF3C7' }]}>
            <Text style={[styles.agentStatValue, { color: '#D97706' }]}>{agentStats.tauxReussite}%</Text>
            <Text style={styles.agentStatLabel}>Réussite</Text>
          </View>
        </View>

        {/* Barre de progression */}
        <View style={styles.progressBarContainer}>
          <View 
            style={[
              styles.progressBar, 
              { 
                width: `${agentStats.tauxReussite}%`,
                backgroundColor: agentStats.tauxReussite >= 80 ? '#10B981' : agentStats.tauxReussite >= 50 ? '#F59E0B' : '#DC2626'
              }
            ]} 
          />
        </View>
      </View>
    );
  };

  // Composant Carte Réclamation
  const ReclamationCard = ({ item }) => (
    <TouchableOpacity 
      style={[styles.reclamationCard, isEnRetard(item) && styles.reclamationCardRetard]}
      onPress={() => openDetails(item)}
    >
      {isEnRetard(item) && (
        <View style={styles.retardBadge}>
          <Text style={styles.retardText}>⚠️ EN RETARD</Text>
        </View>
      )}

      <View style={styles.reclamationHeader}>
        <View style={styles.roomBadge}>
          <Text style={styles.roomText}>🏠 Chambre {item.roomNumber}</Text>
        </View>
        <UrgencyBadge urgency={item.urgency} />
      </View>

      <Text style={styles.reclamationProblem} numberOfLines={2}>
        {item.problem}
      </Text>

      <View style={styles.reclamationMeta}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{item.categorie}</Text>
        </View>
        <View style={styles.timeBadge}>
          <Text style={styles.timeText}>⏱️ {formatDuree(item.createdAt)}</Text>
        </View>
      </View>

      <View style={styles.reclamationFooter}>
        <View>
          <Text style={styles.agentLabel}>Agent:</Text>
          <Text style={styles.agentText}>
            {item.agentAssigne ? item.agentAssigne.nom : 'Non assigné'}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Réclamations</Text>
          <Text style={styles.subtitle}>Gestion et suivi</Text>
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('NewReclamation')}
        >
          <Text style={styles.addButtonText}>+ Nouvelle</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, currentView === 'all' && styles.tabActive]}
          onPress={() => {
            setCurrentView('all');
            setCurrentPage(1);
          }}
        >
          <Text style={[styles.tabText, currentView === 'all' && styles.tabTextActive]}>
            📋 Réclamations
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, currentView === 'history' && styles.tabActive]}
          onPress={() => {
            setCurrentView('history');
            setCurrentPage(1);
          }}
        >
          <Text style={[styles.tabText, currentView === 'history' && styles.tabTextActive]}>
            👥 Par Agent
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <StatCard value={stats.total} label="Total" />
        <StatCard value={stats.enRetard} label="En Retard" color="#DC2626" />
        <StatCard value={stats.terminees} label="Terminées" color="#10B981" />
        <StatCard value={stats.enCours} label="En Cours" color="#F59E0B" />
      </View>

      {/* Vue Toutes les Réclamations */}
      {currentView === 'all' && (
        <>
          {/* Filtres */}
          {/* <View style={styles.filtersContainer}>
            <Text style={styles.filtersTitle}>🔍 Filtres</Text>
            
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher (chambre, problème...)"
              placeholderTextColor="#9CA3AF"
              value={filters.searchTerm}
              onChangeText={(text) => {
                setFilters(prev => ({ ...prev, searchTerm: text }));
                setCurrentPage(1);
              }}
            />

            <View style={styles.filterRow}>
              <View style={styles.filterHalf}>
                <Text style={styles.filterLabel}>Statut</Text>
                <View style={styles.filterButtonsRow}>
                  <TouchableOpacity
                    style={[styles.filterChip, !filters.status && styles.filterChipActive]}
                    onPress={() => {
                      setFilters(prev => ({ ...prev, status: '' }));
                      setCurrentPage(1);
                    }}
                  >
                    <Text style={[styles.filterChipText, !filters.status && styles.filterChipTextActive]}>
                      Tous
                    </Text>
                  </TouchableOpacity>
                  {['en attente', 'en cours', 'résolu'].map(status => (
                    <TouchableOpacity
                      key={status}
                      style={[styles.filterChip, filters.status === status && styles.filterChipActive]}
                      onPress={() => {
                        setFilters(prev => ({ ...prev, status }));
                        setCurrentPage(1);
                      }}
                    >
                      <Text style={[styles.filterChipText, filters.status === status && styles.filterChipTextActive]}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.filterHalf}>
              <Text style={styles.filterLabel}>Urgence</Text>
              <View style={styles.filterButtonsRow}>
                <TouchableOpacity
                  style={[styles.filterChip, !filters.urgency && styles.filterChipActive]}
                  onPress={() => {
                    setFilters(prev => ({ ...prev, urgency: '' }));
                    setCurrentPage(1);
                  }}
                >
                  <Text style={[styles.filterChipText, !filters.urgency && styles.filterChipTextActive]}>
                    Toutes
                  </Text>
                </TouchableOpacity>
                {['urgent', 'moyen', 'bas'].map(urgency => (
                  <TouchableOpacity
                    key={urgency}
                    style={[styles.filterChip, filters.urgency === urgency && styles.filterChipActive]}
                    onPress={() => {
                      setFilters(prev => ({ ...prev, urgency }));
                      setCurrentPage(1);
                    }}
                  >
                    <Text style={[styles.filterChipText, filters.urgency === urgency && styles.filterChipTextActive]}>
                      {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {(filters.status || filters.urgency || filters.searchTerm) && (
              <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
                <Text style={styles.resetButtonText}>✕ Réinitialiser</Text>
              </TouchableOpacity>
            )}
          </View> */}

          {/* Filtres Compacts */}



{/* Filtres Compacts */}
<View style={styles.filtersContainer}>
  <TouchableOpacity 
    style={styles.filtersHeader}
    onPress={() => setShowFilters(!showFilters)}
  >
    <Text style={styles.filtersTitle}>
      🔍 Filtres {filters.status || filters.urgency || filters.searchTerm ? '(Actifs)' : ''}
    </Text>
    <Text style={styles.filtersToggle}>
      {showFilters ? '▲' : '▼'}
    </Text>
  </TouchableOpacity>

  {showFilters && (
    <View style={styles.filtersContent}>
      <TextInput
        style={styles.searchInput}
        placeholder="Rechercher (chambre, problème...)"
        placeholderTextColor="#9CA3AF"
        value={filters.searchTerm}
        onChangeText={(text) => {
          setFilters(prev => ({ ...prev, searchTerm: text }));
          setCurrentPage(1);
        }}
      />

      <View style={styles.filterGrid}>
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Statut</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
          >
            <View style={styles.filterChipsRow}>
              <TouchableOpacity
                style={[styles.filterChip, !filters.status && styles.filterChipActive]}
                onPress={() => {
                  setFilters(prev => ({ ...prev, status: '' }));
                  setCurrentPage(1);
                }}
              >
                <Text style={[styles.filterChipText, !filters.status && styles.filterChipTextActive]}>
                  Tous
                </Text>
              </TouchableOpacity>
              {['en attente', 'assigné', 'en cours', 'résolu', 'clôturé'].map(status => (
                <TouchableOpacity
                  key={status}
                  style={[styles.filterChip, filters.status === status && styles.filterChipActive]}
                  onPress={() => {
                    setFilters(prev => ({ ...prev, status }));
                    setCurrentPage(1);
                  }}
                >
                  <Text style={[styles.filterChipText, filters.status === status && styles.filterChipTextActive]}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Urgence</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
          >
            <View style={styles.filterChipsRow}>
              <TouchableOpacity
                style={[styles.filterChip, !filters.urgency && styles.filterChipActive]}
                onPress={() => {
                  setFilters(prev => ({ ...prev, urgency: '' }));
                  setCurrentPage(1);
                }}
              >
                <Text style={[styles.filterChipText, !filters.urgency && styles.filterChipTextActive]}>
                  Toutes
                </Text>
              </TouchableOpacity>
              {['tres_urgent', 'urgent', 'moyen', 'bas'].map(urgency => (
                <TouchableOpacity
                  key={urgency}
                  style={[styles.filterChip, filters.urgency === urgency && styles.filterChipActive]}
                  onPress={() => {
                    setFilters(prev => ({ ...prev, urgency }));
                    setCurrentPage(1);
                  }}
                >
                  <Text style={[styles.filterChipText, filters.urgency === urgency && styles.filterChipTextActive]}>
                    {getUrgencyLabel(urgency)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>

      {(filters.status || filters.urgency || filters.searchTerm) && (
        <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
          <Text style={styles.resetButtonText}>✕ Réinitialiser les filtres</Text>
        </TouchableOpacity>
      )}
    </View>
  )}
</View>


          {/* Liste */}
          <FlatList
            data={paginatedReclamations}
            renderItem={({ item }) => <ReclamationCard item={item} />}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyTitle}>Aucune réclamation</Text>
                <Text style={styles.emptyText}>
                  {filters.status || filters.urgency || filters.searchTerm
                    ? 'Aucun résultat avec ces filtres'
                    : 'Aucune réclamation pour le moment'}
                </Text>
              </View>
            }
          />

          {/* Pagination */}
          {filteredReclamations.length > itemsPerPage && (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[styles.pageButton, currentPage === 1 && styles.pageButtonDisabled]}
                onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <Text style={styles.pageButtonText}>← Préc</Text>
              </TouchableOpacity>
              
              <Text style={styles.pageInfo}>
                Page {currentPage} / {totalPages}
              </Text>
              
              <TouchableOpacity
                style={[styles.pageButton, currentPage === totalPages && styles.pageButtonDisabled]}
                onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <Text style={styles.pageButtonText}>Suiv →</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* Vue Historique par Agent */}
      {currentView === 'history' && (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {agents.map(agent => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
          {agents.filter(agent => getAgentStats(agent.uid).total > 0).length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyTitle}>Aucun historique</Text>
              <Text style={styles.emptyText}>Aucun agent n'a encore traité de réclamations</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Modal Détails */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Détails Réclamation</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedReclamation && (
                <>
                  {isEnRetard(selectedReclamation) && (
                    <View style={styles.alertRetard}>
                      <Text style={styles.alertRetardText}>⚠️ Réclamation en retard !</Text>
                      <Text style={styles.alertRetardSub}>
                        Délai dépassé de {formatDuree(selectedReclamation.createdAt)}
                      </Text>
                    </View>
                  )}

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Chambre</Text>
                    <Text style={styles.detailValue}>🏠 Chambre {selectedReclamation.roomNumber}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailHalf}>
                      <Text style={styles.detailLabel}>Catégorie</Text>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryText}>{selectedReclamation.categorie}</Text>
                      </View>
                    </View>
                    <View style={styles.detailHalf}>
                      <Text style={styles.detailLabel}>Urgence</Text>
                      <UrgencyBadge urgency={selectedReclamation.urgency} />
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Problème</Text>
                    <View style={styles.problemBox}>
                      <Text style={styles.problemText}>{selectedReclamation.problem}</Text>
                    </View>
                  </View>

                  {selectedReclamation.photoURL && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>📷 Photo du problème</Text>
                      <Image 
                        source={{ uri: selectedReclamation.photoURL }} 
                        style={styles.problemImage}
                        resizeMode="contain"
                      />
                    </View>
                  )}

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Agent assigné</Text>
                    {selectedReclamation.agentAssigne ? (
                      <View style={styles.agentBox}>
                        <View style={styles.agentAvatar}>
                          <Text style={styles.agentAvatarText}>👤</Text>
                        </View>
                        <View>
                          <Text style={styles.agentBoxName}>{selectedReclamation.agentAssigne.nom}</Text>
                          <Text style={styles.agentBoxRole}>Technicien de maintenance</Text>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.noAgentBox}>
                        <Text style={styles.noAgentText}>⚠️ Aucun agent assigné</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Statut actuel</Text>
                    <View style={styles.statusSelector}>
                      {['en attente', 'assigné', 'en cours', 'résolu', 'clôturé'].map(status => (
                        <TouchableOpacity
                          key={status}
                          style={[
                            styles.statusOption,
                            selectedReclamation.status === status && { 
                              backgroundColor: getStatusColor(status),
                              borderColor: getStatusColor(status)
                            }
                          ]}
                          onPress={() => {
                            handleStatusChange(selectedReclamation.id, status);
                            setSelectedReclamation({ ...selectedReclamation, status });
                          }}
                        >
                          <Text style={[
                            styles.statusOptionText,
                            selectedReclamation.status === status && styles.statusOptionTextActive
                          ]}>
                            {status}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.timeInfo}>
                    <View style={styles.timeInfoItem}>
                      <Text style={styles.timeInfoLabel}>📅 Créée le</Text>
                      <Text style={styles.timeInfoValue}>
                        {selectedReclamation.createdAt?.toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </View>
                    <View style={styles.timeInfoItem}>
                      <Text style={styles.timeInfoLabel}>⏱️ Temps écoulé</Text>
                      <Text style={[
                        styles.timeInfoValue,
                        isEnRetard(selectedReclamation) && { color: '#DC2626' }
                      ]}>
                        {formatDuree(selectedReclamation.createdAt)}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setShowDetailModal(false)}
                  >
                    <Text style={styles.closeButtonText}>Fermer</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  addButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#667eea',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  statsGrid: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '500',
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 16,
  },
  filterRow: {
    marginBottom: 12,
  },
  filterHalf: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  filterButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  resetButton: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  resetButtonText: {
    color: '#DC2626',
    fontWeight: '600',
    fontSize: 13,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  reclamationCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  reclamationCardRetard: {
    backgroundColor: '#FEE2E2',
    borderWidth: 2,
    borderColor: '#DC2626',
  },
  retardBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  retardText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  reclamationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  roomBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  roomText: {
    color: '#667eea',
    fontSize: 13,
    fontWeight: '700',
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  urgencyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  urgencyText: {
    fontSize: 11,
    fontWeight: '700',
  },
  reclamationProblem: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 12,
    lineHeight: 20,
  },
  reclamationMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    color: '#667eea',
    fontSize: 11,
    fontWeight: '600',
  },
  timeBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  timeText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  reclamationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  agentLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  agentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
  },
  pageButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#667eea',
    borderRadius: 12,
  },
  pageButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  pageButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  pageInfo: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
  },
  agentCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  agentHeader: {
    marginBottom: 16,
  },
  agentName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  agentRole: {
    fontSize: 13,
    color: '#6B7280',
  },
  agentStatsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  agentStatItem: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  agentStatValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  agentStatLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalClose: {
    fontSize: 24,
    color: '#6B7280',
    fontWeight: '700',
  },
  modalBody: {
    padding: 20,
  },
  alertRetard: {
    backgroundColor: '#FEE2E2',
    borderWidth: 2,
    borderColor: '#DC2626',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  alertRetardText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  alertRetardSub: {
    color: '#991B1B',
    fontSize: 12,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  detailHalf: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  problemBox: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
  },
  problemText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  problemImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  agentBox: {
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  agentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentAvatarText: {
    fontSize: 20,
  },
  agentBoxName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  agentBoxRole: {
    fontSize: 12,
    color: '#6B7280',
  },
  noAgentBox: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
  },
  noAgentText: {
    color: '#92400E',
    fontSize: 13,
    fontStyle: 'italic',
  },
  statusSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  statusOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  statusOptionTextActive: {
    color: '#FFFFFF',
  },
  timeInfo: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  timeInfoItem: {
    flex: 1,
  },
  timeInfoLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
  },
  timeInfoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  // Ajouter ces styles :

// Pour la Solution 1 (Accordéon)
filtersHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 12,
},
filtersToggle: {
  fontSize: 12,
  color: '#6B7280',
  fontWeight: '600',
},
filtersContent: {
  paddingTop: 8,
  borderTopWidth: 1,
  borderTopColor: '#E5E7EB',
},
filterGrid: {
  gap: 12,
},
filterGroup: {
  gap: 8,
},
filterScroll: {
  flexGrow: 0,
},
filterChipsRow: {
  flexDirection: 'row',
  gap: 8,
  paddingRight: 16,
},

// Pour la Solution 2 (Barre horizontale)
filtersBar: {
  backgroundColor: '#FFFFFF',
  padding: 12,
  marginHorizontal: 16,
  marginBottom: 16,
  borderRadius: 16,
  gap: 12,
},
searchContainer: {
  // Style existant
},
searchInputCompact: {
  backgroundColor: '#F9FAFB',
  borderWidth: 1,
  borderColor: '#E5E7EB',
  borderRadius: 12,
  padding: 12,
  fontSize: 14,
  color: '#1F2937',
},
quickFilters: {
  flexGrow: 0,
},
quickFiltersContent: {
  gap: 16,
},
quickFilterGroup: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
},
quickFilterLabel: {
  fontSize: 12,
  fontWeight: '600',
  color: '#374151',
  minWidth: 50,
},
quickFilterChips: {
  flexDirection: 'row',
  gap: 6,
},
quickFilterChip: {
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 16,
  backgroundColor: '#F3F4F6',
  borderWidth: 1,
  borderColor: '#E5E7EB',
},
quickFilterChipActive: {
  backgroundColor: '#667eea',
  borderColor: '#667eea',
},
quickFilterChipText: {
  fontSize: 11,
  fontWeight: '600',
  color: '#6B7280',
},
quickFilterChipTextActive: {
  color: '#FFFFFF',
},
resetButtonCompact: {
  backgroundColor: '#FEE2E2',
  padding: 6,
  borderRadius: 16,
  width: 32,
  height: 32,
  alignItems: 'center',
  justifyContent: 'center',
},

resetButtonTextCompact: {
  color: '#DC2626',
  fontWeight: '600',
  fontSize: 12,
},
});

export default AdminReclamations;