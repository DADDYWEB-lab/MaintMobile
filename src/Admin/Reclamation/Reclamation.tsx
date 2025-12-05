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
import { collection, query, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth'; // Pour identifier l'admin connecté
import { db } from '../../../firebaseConfig';

const { width } = Dimensions.get('window');

const AdminReclamations = ({ navigation }: any) => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  // --- ÉTATS ---
  const [reclamations, setReclamations] = useState([]);
  const [agents, setAgents] = useState([]);
  
  // Navigation et Vues
  const [currentView, setCurrentView] = useState('history'); // 'list' | 'history'
  const [filterMode, setFilterMode] = useState('all'); // 'all' (Tout le monde) | 'mine' (Mes réclamations)
  
  // Modales
  const [selectedReclamation, setSelectedReclamation] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [drillDownData, setDrillDownData] = useState(null); // Pour la vue détaillée agent
  const [showDrillDownModal, setShowDrillDownModal] = useState(false);
  
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Pagination & Filtres
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [filters, setFilters] = useState({ status: '', urgency: '', searchTerm: '' });

  // Stats globales
  const [stats, setStats] = useState({ total: 0, enRetard: 0, terminees: 0, enCours: 0 });

  // --- CHARGEMENT ---
  useEffect(() => {
    const q = query(collection(db, 'reclamations'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id, ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      }));
      setReclamations(data);
      calculateStats(data);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'staff'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAgents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // --- LOGIQUE MÉTIER ---

  const calculateStats = useCallback((data) => {
    const now = new Date();
    const stats = { total: data.length, enRetard: 0, terminees: 0, enCours: 0 };
    
    data.forEach(rec => {
      const isDone = rec.status === 'résolu' || rec.status === 'clôturé';
      if (isDone) stats.terminees++;
      else {
        stats.enCours++;
        if (isEnRetard(rec)) stats.enRetard++;
      }
    });
    setStats(stats);
  }, []);

  const getDelaiByUrgency = (urgency) => {
    const delais = { 'tres_urgent': 0, 'urgent': 4, 'moyen': 24, 'bas': 48, 'high': 4, 'medium': 24, 'low': 48 };
    return delais[urgency] || 24;
  };

  const isEnRetard = useCallback((reclamation) => {
    if (reclamation.status === 'résolu' || reclamation.status === 'clôturé' || !reclamation.createdAt) return false;
    const diff = (new Date() - reclamation.createdAt) / (1000 * 60 * 60);
    return diff > getDelaiByUrgency(reclamation.urgency);
  }, []);

  // FILTRAGE PRINCIPAL
  const filteredReclamations = useMemo(() => {
    return reclamations.filter(rec => {
      // 1. Filtre "Mes Réclamations" vs "Toutes"
      if (filterMode === 'mine') {
        if (rec.agentAssigne?.uid !== currentUser?.uid) return false;
      }

      // 2. Filtres UI (Recherche, Statut, Urgence)
      if (filters.status && rec.status !== filters.status) return false;
      if (filters.urgency && rec.urgency !== filters.urgency) return false;
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        return (
          rec.roomNumber?.toLowerCase().includes(term) ||
          rec.problem?.toLowerCase().includes(term) ||
          rec.categorie?.toLowerCase().includes(term) ||
          rec.agentAssigne?.nom?.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [reclamations, filters, filterMode, currentUser]);

  const paginatedReclamations = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredReclamations.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredReclamations, currentPage]);

  const totalPages = Math.ceil(filteredReclamations.length / itemsPerPage);

  // --- STATS AGENT & DRILL-DOWN ---

  const getAgentStats = useCallback((agentUid) => {
    const agentRecs = reclamations.filter(r => r.agentAssigne?.uid === agentUid);
    const total = agentRecs.length;
    const terminees = agentRecs.filter(r => r.status === 'résolu' || r.status === 'clôturé').length;
    const enRetard = agentRecs.filter(r => isEnRetard(r)).length;
    const tauxReussite = total > 0 ? Math.round((terminees / total) * 100) : 0;
    return { total, terminees, enRetard, tauxReussite, raw: agentRecs };
  }, [reclamations, isEnRetard]);

  const handleAgentStatClick = (agent, type) => {
    const stats = getAgentStats(agent.uid);
    let filteredList = [];
    let title = "";

    switch (type) {
      case 'total':
        filteredList = stats.raw;
        title = `Toutes les réclamations - ${agent.name}`;
        break;
      case 'terminees':
        filteredList = stats.raw.filter(r => r.status === 'résolu' || r.status === 'clôturé');
        title = `Réclamations terminées - ${agent.name}`;
        break;
      case 'enRetard':
        filteredList = stats.raw.filter(r => isEnRetard(r));
        title = `⚠️ Réclamations en retard - ${agent.name}`;
        break;
      default:
        filteredList = stats.raw;
    }

    setDrillDownData({ title, list: filteredList, agent });
    setShowDrillDownModal(true);
  };

  // --- ACTIONS ---

  const handleStatusChange = async (recId, newStatus) => {
    try {
      await updateDoc(doc(db, 'reclamations', recId), { status: newStatus, updatedAt: new Date() });
      Alert.alert('Succès', 'Statut mis à jour');
    } catch (error) { Alert.alert('Erreur', 'Mise à jour échouée'); }
  };

  const handleAction = (type, rec) => {
    Alert.alert(
      type === 'message' ? 'Envoyer un message' : 'Envoyer un document',
      `Action pour ${rec.agentAssigne?.nom || 'l\'agent'} concernant la chambre ${rec.roomNumber}.`
    );
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  // --- HELPERS VISUELS ---
  const formatDuree = (date) => {
    if (!date) return 'N/A';
    const h = Math.floor((new Date() - date) / (1000 * 60 * 60));
    return h > 24 ? `${Math.floor(h / 24)}j ${h % 24}h` : `${h}h`;
  };

  const getUrgencyColor = (u) => ({'tres_urgent': '#DC2626', 'urgent': '#EA580C', 'moyen': '#CA8A04', 'bas': '#2563EB', 'high': '#DC2626'}[u] || '#6B7280');
  const getStatusColor = (s) => ({'en attente': '#9CA3AF', 'assigné': '#3B82F6', 'en cours': '#F59E0B', 'résolu': '#10B981', 'clôturé': '#6B7280'}[s] || '#9CA3AF');

  // --- COMPOSANTS INTERNES ---

  const StatCard = ({ value, label, color }) => (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, color && { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const UrgencyBadge = ({ urgency }) => (
    <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(urgency) + '20' }]}>
      <View style={[styles.urgencyDot, { backgroundColor: getUrgencyColor(urgency) }]} />
      <Text style={[styles.urgencyText, { color: getUrgencyColor(urgency) }]}>{urgency}</Text>
    </View>
  );

  // Nouvelle version AgentCard avec zones cliquables
  const AgentCard = ({ agent }) => {
    const stats = getAgentStats(agent.uid);
    if (stats.total === 0) return null;

    return (
      <View style={styles.agentCard}>
        <View style={styles.agentHeader}>
           <Text style={styles.agentName}>{agent.name}</Text>
           <Text style={styles.agentRole}>{agent.specialite || agent.role}</Text>
        </View>
        
        <View style={styles.agentStatsGrid}>
          <TouchableOpacity 
            style={[styles.agentStatItem, { backgroundColor: '#EEF2FF' }]}
            onPress={() => handleAgentStatClick(agent, 'total')}
          >
            <Text style={[styles.agentStatValue, { color: '#667eea' }]}>{stats.total}</Text>
            <Text style={styles.agentStatLabel}>Total (Voir)</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.agentStatItem, { backgroundColor: '#D1FAE5' }]}
            onPress={() => handleAgentStatClick(agent, 'terminees')}
          >
            <Text style={[styles.agentStatValue, { color: '#10B981' }]}>{stats.terminees}</Text>
            <Text style={styles.agentStatLabel}>Fini</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.agentStatItem, { backgroundColor: '#FEE2E2' }]}
            onPress={() => handleAgentStatClick(agent, 'enRetard')}
          >
            <Text style={[styles.agentStatValue, { color: '#DC2626' }]}>{stats.enRetard}</Text>
            <Text style={styles.agentStatLabel}>⚠️ Retard</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${stats.tauxReussite}%`, backgroundColor: stats.tauxReussite >= 80 ? '#10B981' : '#F59E0B' }]} />
        </View>
      </View>
    );
  };

  const ReclamationCard = ({ item, minimal = false }) => (
    <TouchableOpacity 
      style={[styles.reclamationCard, isEnRetard(item) && styles.reclamationCardRetard]}
      onPress={() => { setSelectedReclamation(item); setShowDetailModal(true); }}
    >
      {isEnRetard(item) && !minimal && (
        <View style={styles.retardBadge}><Text style={styles.retardText}>⚠️ EN RETARD</Text></View>
      )}

      <View style={styles.reclamationHeader}>
        <View style={styles.roomBadge}><Text style={styles.roomText}>🏠 {item.roomNumber}</Text></View>
        <UrgencyBadge urgency={item.urgency} />
      </View>

      <Text style={styles.reclamationProblem} numberOfLines={2}>{item.problem}</Text>

      <View style={styles.reclamationFooter}>
        <Text style={styles.agentText}>{item.agentAssigne ? item.agentAssigne.nom : 'Non assigné'}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      
      {/* Boutons d'action rapides pour le mode Drill-Down */}
      {minimal && (
          <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleAction('message', item)}>
                  <Text>💬 Message</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleAction('doc', item)}>
                  <Text>📎 Doc</Text>
              </TouchableOpacity>
          </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Réclamations</Text>
          <Text style={styles.subtitle}>Supervision</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('NewReclamation')}>
          <Text style={styles.addButtonText}>+ Nouvelle</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs Principaux */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity style={[styles.tab, currentView === 'list' && styles.tabActive]} onPress={() => setCurrentView('list')}>
          <Text style={[styles.tabText, currentView === 'list' && styles.tabTextActive]}>📋 Liste</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, currentView === 'history' && styles.tabActive]} onPress={() => setCurrentView('history')}>
          <Text style={[styles.tabText, currentView === 'history' && styles.tabTextActive]}>👥 Par Agent</Text>
        </TouchableOpacity>
      </View>

      {/* Mode "Mes Réclamations" (Toggle) */}
      {currentView === 'list' && (
          <View style={styles.filterModeContainer}>
              <TouchableOpacity 
                style={[styles.filterModeBtn, filterMode === 'all' && styles.filterModeBtnActive]}
                onPress={() => setFilterMode('all')}
              >
                  <Text style={[styles.filterModeText, filterMode === 'all' && styles.filterModeTextActive]}>Tout voir</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.filterModeBtn, filterMode === 'mine' && styles.filterModeBtnActive]}
                onPress={() => setFilterMode('mine')}
              >
                  <Text style={[styles.filterModeText, filterMode === 'mine' && styles.filterModeTextActive]}>👤 Mes réclamations</Text>
              </TouchableOpacity>
          </View>
      )}

      {/* Stats Cards (Visibles uniquement en mode All) */}
      {filterMode === 'all' && (
        <View style={styles.statsGrid}>
            <StatCard value={stats.total} label="Total" />
            <StatCard value={stats.enRetard} label="Retard" color="#DC2626" />
            <StatCard value={stats.terminees} label="Fini" color="#10B981" />
            <StatCard value={stats.enCours} label="En Cours" color="#F59E0B" />
        </View>
      )}

      {/* --- VUE LISTE --- */}
      {currentView === 'list' && (
        <FlatList
          data={paginatedReclamations}
          renderItem={({ item }) => <ReclamationCard item={item} />}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={styles.emptyText}>Aucune réclamation trouvée</Text>
            </View>
          }
        />
      )}

      {/* --- VUE PAR AGENT --- */}
      {currentView === 'history' && (
        <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {agents.map(agent => <AgentCard key={agent.id} agent={agent} />)}
        </ScrollView>
      )}

      {/* --- MODALE DRILL-DOWN AGENT (Nouvelle fonctionnalité) --- */}
      <Modal visible={showDrillDownModal} animationType="slide" transparent={true} onRequestClose={() => setShowDrillDownModal(false)}>
         <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle} numberOfLines={1}>{drillDownData?.title}</Text>
                    <TouchableOpacity onPress={() => setShowDrillDownModal(false)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
                </View>
                <FlatList
                    data={drillDownData?.list || []}
                    renderItem={({ item }) => <ReclamationCard item={item} minimal={true} />}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{padding: 16}}
                    ListEmptyComponent={<Text style={{textAlign: 'center', marginTop: 20, color: '#6B7280'}}>Aucune réclamation dans cette catégorie.</Text>}
                />
            </View>
         </View>
      </Modal>

      {/* --- MODALE DETAILS (Existante) --- */}
      <Modal visible={showDetailModal} animationType="slide" transparent={true} onRequestClose={() => setShowDetailModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Détails</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {selectedReclamation && (
                <>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Problème</Text>
                    <View style={styles.problemBox}><Text style={styles.problemText}>{selectedReclamation.problem}</Text></View>
                  </View>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Changer Statut</Text>
                    <View style={styles.statusSelector}>
                      {['assigné', 'en cours', 'résolu'].map(s => (
                        <TouchableOpacity key={s} style={[styles.statusOption, selectedReclamation.status === s && {backgroundColor: getStatusColor(s)}]} onPress={() => handleStatusChange(selectedReclamation.id, s)}>
                          <Text style={[styles.statusOptionText, selectedReclamation.status === s && {color: 'white'}]}>{s}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
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
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#463fabff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1F2937' },
  subtitle: { fontSize: 14, color: '#6B7280' },
  addButton: { backgroundColor: '#667eea', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  addButtonText: { color: '#FFFFFF', fontWeight: '600' },
  
  tabsContainer: { flexDirection: 'row', backgroundColor: '#FFFFFF', padding: 16, gap: 8 },
  tab: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center' },
  tabActive: { backgroundColor: '#667eea' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#FFFFFF' },

  // Nouveau style pour le Toggle "Mes Réclamations"
  filterModeContainer: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 10, gap: 10 },
  filterModeBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#667eea', backgroundColor: 'transparent' },
  filterModeBtnActive: { backgroundColor: '#667eea' },
  filterModeText: { color: '#667eea', fontSize: 12, fontWeight: '600' },
  filterModeTextActive: { color: '#FFFFFF' },

  statsGrid: { flexDirection: 'row', padding: 16, gap: 12 },
  statCard: { flex: 1, backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, alignItems: 'center', elevation: 2 },
  statValue: { fontSize: 22, fontWeight: '700', color: '#1F2937' },
  statLabel: { fontSize: 10, color: '#6B7280', marginTop: 4 },

  listContent: { padding: 16 },
  reclamationCard: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, marginBottom: 12, elevation: 3 },
  reclamationCardRetard: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#DC2626' },
  reclamationHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  roomBadge: { backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  roomText: { color: '#667eea', fontSize: 13, fontWeight: '700' },
  urgencyBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, gap: 6 },
  urgencyDot: { width: 8, height: 8, borderRadius: 4 },
  urgencyText: { fontSize: 11, fontWeight: '700' },
  reclamationProblem: { fontSize: 14, color: '#374151', marginBottom: 12 },
  reclamationFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  agentText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  statusText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  retardBadge: { backgroundColor: '#DC2626', padding: 4, borderRadius: 4, alignSelf: 'flex-start', marginBottom: 8 },
  retardText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },

  // Styles Agent Interactif
  agentCard: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, marginBottom: 12, elevation: 3 },
  agentHeader: { marginBottom: 12 },
  agentName: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  agentRole: { fontSize: 13, color: '#6B7280' },
  agentStatsGrid: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  agentStatItem: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center' },
  agentStatValue: { fontSize: 20, fontWeight: '700' },
  agentStatLabel: { fontSize: 10, color: '#6B7280', marginTop: 4 },
  progressBarContainer: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 4 },

  // Styles Actions Drill-Down
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  actionBtn: { backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },

  // Modales
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937' },
  modalClose: { fontSize: 24, color: '#6B7280' },
  modalBody: { padding: 20 },
  
  detailSection: { marginBottom: 20 },
  detailLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
  problemBox: { backgroundColor: '#F9FAFB', padding: 16, borderRadius: 12 },
  problemText: { fontSize: 14, color: '#374151' },
  statusSelector: { flexDirection: 'row', gap: 8 },
  statusOption: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F3F4F6' },
  statusOptionText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },

  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { color: '#9CA3AF' },
});

export default AdminReclamations;