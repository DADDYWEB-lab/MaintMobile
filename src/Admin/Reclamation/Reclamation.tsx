// AdminReclamations.tsx
// @ts-nocheck

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Platform,
  Animated,
} from "react-native";
import {
  collection,
  query,
  onSnapshot,
  updateDoc,
  doc,
  addDoc,
} from "firebase/firestore";

import { getAuth } from "firebase/auth";
import { db } from "../../../firebaseConfig";
import ScreenHeader from '../Components/ScreenHeader'
const { width } = Dimensions.get("window");
import AddReclamationModal from './AddReclamationModal';

const AdminReclamations = ({ navigation }: any) => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  // --- ÉTATS ---
  const [reclamations, setReclamations] = useState([]);
  const [agents, setAgents] = useState([]);

  // Navigation et Vues
  const [currentView, setCurrentView] = useState("list");
  const [filterMode, setFilterMode] = useState("all");

  // Modales
  const [selectedReclamation, setSelectedReclamation] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [drillDownData, setDrillDownData] = useState(null);
  const [showDrillDownModal, setShowDrillDownModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Filtres
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [filters, setFilters] = useState({
    status: "",
    urgency: "",
    searchTerm: "",
    category: "",
    dateFrom: "",
    dateTo: "",
  });

  // Filtre spécifique pour la vue "Par Agent"
  const [agentSearchTerm, setAgentSearchTerm] = useState("");
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [selectedAgentFilter, setSelectedAgentFilter] = useState(null);

  // Animation pour les filtres
  const [filterAnimation] = useState(new Animated.Value(0));

  // Stats globales
  const [stats, setStats] = useState({
    total: 0,
    enRetard: 0,
    terminees: 0,
    enCours: 0,
  });

  // --- CHARGEMENT ---
  useEffect(() => {
    const q = query(collection(db, "reclamations"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      }));
      setReclamations(data);
      calculateStats(data);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "staff"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAgents(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, filterMode]);

  // Animation des filtres
  useEffect(() => {
    Animated.timing(filterAnimation, {
      toValue: showAdvancedFilters ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [showAdvancedFilters]);

  // --- LOGIQUE MÉTIER ---
  const calculateStats = useCallback((data) => {
    const now = new Date();
    const stats = { total: data.length, enRetard: 0, terminees: 0, enCours: 0 };

    data.forEach((rec) => {
      const isDone = rec.status === "résolu" || rec.status === "clôturé";
      if (isDone) stats.terminees++;
      else {
        stats.enCours++;
        if (isEnRetard(rec)) stats.enRetard++;
      }
    });

    setStats(stats);
  }, []);

  const getDelaiByUrgency = (urgency) => {
    const delais = {
      tres_urgent: 0,
      urgent: 4,
      moyen: 24,
      bas: 48,
      high: 4,
      medium: 24,
      low: 48,
    };
    return delais[urgency] || 24;
  };

  const isEnRetard = useCallback((reclamation) => {
    if (
      reclamation.status === "résolu" ||
      reclamation.status === "clôturé" ||
      !reclamation.createdAt
    )
      return false;
    const diff = (new Date() - reclamation.createdAt) / (1000 * 60 * 60);
    return diff > getDelaiByUrgency(reclamation.urgency);
  }, []);

  // --- FONCTIONS FILTRES AMÉLIORÉES ---
  const resetFilters = () => {
    setFilters({
      status: "",
      urgency: "",
      searchTerm: "",
      category: "",
      dateFrom: "",
      dateTo: "",
    });
    setCurrentPage(1);
  };

  const resetAgentFilter = () => {
    setAgentSearchTerm("");
    setSelectedAgentFilter(null);
  };

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some(value => value !== "");
  }, [filters]);

  const activeFiltersCount = useMemo(() => {
    return Object.values(filters).filter(value => value !== "").length;
  }, [filters]);

  // Filtrage des agents pour la vue "Par Agent"
  const filteredAgents = useMemo(() => {
    if (!agentSearchTerm && !selectedAgentFilter) {
      return agents;
    }

    return agents.filter((agent) => {
      // Si un agent est sélectionné dans la dropdown, afficher seulement celui-là
      if (selectedAgentFilter) {
        return agent.uid === selectedAgentFilter.uid;
      }

      // Sinon, filtrer par le terme de recherche
      if (agentSearchTerm) {
        const searchLower = agentSearchTerm.toLowerCase();
        return (
          agent.name?.toLowerCase().includes(searchLower) ||
          agent.specialite?.toLowerCase().includes(searchLower) ||
          agent.role?.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  }, [agents, agentSearchTerm, selectedAgentFilter]);

  // Agents suggérés pour la dropdown
  const suggestedAgents = useMemo(() => {
    if (!agentSearchTerm || selectedAgentFilter) return [];
    
    const searchLower = agentSearchTerm.toLowerCase();
    return agents.filter((agent) => 
      agent.name?.toLowerCase().includes(searchLower) ||
      agent.specialite?.toLowerCase().includes(searchLower) ||
      agent.role?.toLowerCase().includes(searchLower)
    ).slice(0, 5); // Limiter à 5 suggestions
  }, [agents, agentSearchTerm, selectedAgentFilter]);

  // FILTRAGE PRINCIPAL AMÉLIORÉ
  const filteredReclamations = useMemo(() => {
    return reclamations.filter((rec) => {
      // 1. Filtre "Mes Réclamations" vs "Toutes"
      if (filterMode === "mine") {
        if (rec.agentAssigne?.uid !== currentUser?.uid) return false;
      }

      // 2. Filtres de base
      if (filters.status && rec.status !== filters.status) return false;
      if (filters.urgency && rec.urgency !== filters.urgency) return false;
      
      // 3. Filtre par catégorie
      if (filters.category && rec.categorie !== filters.category) return false;
      
      // 4. Filtre par date (amélioré)
      if (filters.dateFrom && rec.createdAt) {
        const recDate = new Date(rec.createdAt).setHours(0, 0, 0, 0);
        const filterDate = new Date(filters.dateFrom).setHours(0, 0, 0, 0);
        if (recDate < filterDate) return false;
      }
      
      if (filters.dateTo && rec.createdAt) {
        const recDate = new Date(rec.createdAt).setHours(23, 59, 59, 999);
        const filterDate = new Date(filters.dateTo).setHours(23, 59, 59, 999);
        if (recDate > filterDate) return false;
      }
      
      // 5. Recherche textuelle améliorée
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase().trim();
        const searchFields = [
          rec.roomNumber?.toLowerCase(),
          rec.problem?.toLowerCase(),
          rec.categorie?.toLowerCase(),
          rec.agentAssigne?.nom?.toLowerCase(),
          rec.description?.toLowerCase(),
          rec.status?.toLowerCase(),
        ].filter(Boolean);
        
        return searchFields.some(field => field.includes(term));
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
  const getAgentStats = useCallback(
    (agentUid) => {
      const agentRecs = reclamations.filter(
        (r) => r.agentAssigne?.uid === agentUid
      );
      const total = agentRecs.length;
      const terminees = agentRecs.filter(
        (r) => r.status === "résolu" || r.status === "clôturé"
      ).length;
      const enRetard = agentRecs.filter((r) => isEnRetard(r)).length;
      const tauxReussite =
        total > 0 ? Math.round((terminees / total) * 100) : 0;
      return { total, terminees, enRetard, tauxReussite, raw: agentRecs };
    },
    [reclamations, isEnRetard]
  );

  const handleAgentStatClick = (agent, type) => {
    const stats = getAgentStats(agent.uid);
    let filteredList = [];
    let title = "";

    switch (type) {
      case "total":
        filteredList = stats.raw;
        title = `Toutes les réclamations - ${agent.name}`;
        break;
      case "terminees":
        filteredList = stats.raw.filter(
          (r) => r.status === "résolu" || r.status === "clôturé"
        );
        title = `Réclamations terminées - ${agent.name}`;
        break;
      case "enRetard":
        filteredList = stats.raw.filter((r) => isEnRetard(r));
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
      await updateDoc(doc(db, "reclamations", recId), {
        status: newStatus,
        updatedAt: new Date(),
      });
      Alert.alert("Succès", "Statut mis à jour");
    } catch (error) {
      Alert.alert("Erreur", "Mise à jour échouée");
    }
  };

  const handleAction = (type, rec) => {
    Alert.alert(
      type === "message" ? "Envoyer un message" : "Envoyer un document",
      `Action pour ${
        rec.agentAssigne?.nom || "l'agent"
      } concernant la chambre ${rec.roomNumber}.`
    );
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  // --- HELPERS VISUELS ---
  const formatDuree = (date) => {
    if (!date) return "N/A";
    const h = Math.floor((new Date() - date) / (1000 * 60 * 60));
    return h > 24 ? `${Math.floor(h / 24)}j ${h % 24}h` : `${h}h`;
  };

  const getUrgencyColor = (u) =>
    ({
      tres_urgent: "#DC2626",
      urgent: "#EA580C",
      moyen: "#CA8A04",
      bas: "#2563EB",
      high: "#DC2626",
    }[u] || "#6B7280");

  const getStatusColor = (s) =>
    ({
      "en attente": "#9CA3AF",
      assigné: "#3B82F6",
      "en cours": "#F59E0B",
      résolu: "#10B981",
      clôturé: "#6B7280",
    }[s] || "#9CA3AF");

  // --- COMPOSANTS INTERNES ---
  const StatCard = ({ value, label, color, onPress }) => (
    <TouchableOpacity style={styles.statCard} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.statValue, color && { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );

  const UrgencyBadge = ({ urgency }) => (
    <View
      style={[
        styles.urgencyBadge,
        { backgroundColor: getUrgencyColor(urgency) + "20" },
      ]}
    >
      <View
        style={[
          styles.urgencyDot,
          { backgroundColor: getUrgencyColor(urgency) },
        ]}
      />
      <Text style={[styles.urgencyText, { color: getUrgencyColor(urgency) }]}>
        {urgency?.replace('_', ' ')}
      </Text>
    </View>
  );

  // --- COMPOSANTS FILTRES AMÉLIORÉS ---
  const SimpleSearchBar = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchInputContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par chambre, problème, agent..."
          placeholderTextColor="#94A3B8"
          value={filters.searchTerm}
          onChangeText={(text) => updateFilter('searchTerm', text)}
        />
        {filters.searchTerm ? (
          <TouchableOpacity onPress={() => updateFilter('searchTerm', "")}>
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      
      <TouchableOpacity 
        style={[
          styles.filterButton,
          hasActiveFilters && styles.filterButtonActive
        ]}
        onPress={() => setShowAdvancedFilters(!showAdvancedFilters)}
      >
        <Text style={styles.filterButtonText}>
          {showAdvancedFilters ? "▼" : "▶"} Filtres
        </Text>
        {activeFiltersCount > 0 && (
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  // Nouveau composant de recherche pour les agents
  const AgentSearchBar = () => (
    <View style={styles.agentSearchContainer}>
      <View style={styles.agentSearchWrapper}>
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>👤</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un agent par nom..."
            placeholderTextColor="#94A3B8"
            value={agentSearchTerm}
            onChangeText={(text) => {
              setAgentSearchTerm(text);
              setSelectedAgentFilter(null);
              setShowAgentDropdown(true);
            }}
            onFocus={() => setShowAgentDropdown(true)}
          />
          {(agentSearchTerm || selectedAgentFilter) && (
            <TouchableOpacity onPress={resetAgentFilter}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {selectedAgentFilter && (
          <View style={styles.selectedAgentBadge}>
            <Text style={styles.selectedAgentText}>
              ✓ {selectedAgentFilter.name}
            </Text>
          </View>
        )}

        {/* Dropdown de suggestions */}
        {showAgentDropdown && suggestedAgents.length > 0 && !selectedAgentFilter && (
          <View style={styles.agentDropdown}>
            <ScrollView style={styles.agentDropdownScroll} nestedScrollEnabled>
              {suggestedAgents.map((agent) => (
                <TouchableOpacity
                  key={agent.id}
                  style={styles.agentDropdownItem}
                  onPress={() => {
                    setSelectedAgentFilter(agent);
                    setAgentSearchTerm(agent.name);
                    setShowAgentDropdown(false);
                  }}
                >
                  <View style={styles.agentDropdownInfo}>
                    <Text style={styles.agentDropdownName}>{agent.name}</Text>
                    <Text style={styles.agentDropdownRole}>
                      {agent.specialite || agent.role}
                    </Text>
                  </View>
                  <Text style={styles.agentDropdownArrow}>→</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {(agentSearchTerm || selectedAgentFilter) && (
        <View style={styles.agentFilterInfo}>
          <Text style={styles.agentFilterText}>
            {filteredAgents.length} agent{filteredAgents.length > 1 ? 's' : ''} trouvé{filteredAgents.length > 1 ? 's' : ''}
          </Text>
        </View>
      )}
    </View>
  );

 
  const ActiveFilterChips = () => {
    if (!hasActiveFilters) return null;
    
    const chips = [];
    
    if (filters.status) chips.push({ key: 'status', label: `Statut: ${filters.status}`, value: filters.status });
    if (filters.urgency) chips.push({ key: 'urgency', label: `Urgence: ${filters.urgency.replace('_', ' ')}`, value: filters.urgency });
    if (filters.category) chips.push({ key: 'category', label: `Catégorie: ${filters.category}`, value: filters.category });
    if (filters.dateFrom) chips.push({ key: 'dateFrom', label: `Depuis: ${new Date(filters.dateFrom).toLocaleDateString()}`, value: filters.dateFrom });
    if (filters.dateTo) chips.push({ key: 'dateTo', label: `Jusqu'à: ${new Date(filters.dateTo).toLocaleDateString()}`, value: filters.dateTo });
    
    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.activeChipsContainer}
      >
        {chips.map((chip) => (
          <View key={chip.key} style={styles.activeChip}>
            <Text style={styles.activeChipText}>{chip.label}</Text>
            <TouchableOpacity onPress={() => updateFilter(chip.key, "")}>
              <Text style={styles.activeChipClose}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity onPress={resetFilters} style={styles.resetChip}>
          <Text style={styles.resetChipText}>🔄 Réinitialiser tout</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const AdvancedFilters = () => {
    const filterHeight = filterAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 400],
    });

    return (
      <Animated.View style={[styles.advancedFiltersContainer, { height: filterHeight, overflow: 'hidden' }]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Filtre par statut */}
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>📊 STATUT</Text>
            <View style={styles.filterChips}>
              {["", "en attente", "assigné", "en cours", "résolu", "clôturé"].map((status) => (
                <TouchableOpacity
                  key={status || "all"}
                  style={[
                    styles.filterChip,
                    filters.status === status && styles.filterChipActive,
                    filters.status === status && { borderColor: getStatusColor(status) }
                  ]}
                  onPress={() => updateFilter('status', status)}
                >
                  <Text style={[
                    styles.filterChipText,
                    filters.status === status && styles.filterChipTextActive
                  ]}>
                    {status || "Tous"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* Filtre par urgence */}
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>⚡ URGENCE</Text>
            <View style={styles.filterChips}>
              {["", "tres_urgent", "urgent", "moyen", "bas"].map((urgency) => (
                <TouchableOpacity
                  key={urgency || "all"}
                  style={[
                    styles.filterChip,
                    filters.urgency === urgency && styles.filterChipActive,
                    filters.urgency === urgency && urgency && { 
                      borderColor: getUrgencyColor(urgency),
                      backgroundColor: getUrgencyColor(urgency) + '15'
                    }
                  ]}
                  onPress={() => updateFilter('urgency', urgency)}
                >
                  <View style={styles.filterChipContent}>
                    {urgency && (
                      <View style={[
                        styles.urgencyDotSmall,
                        { backgroundColor: getUrgencyColor(urgency) }
                      ]} />
                    )}
                    <Text style={[
                      styles.filterChipText,
                      filters.urgency === urgency && styles.filterChipTextActive
                    ]}>
                      {urgency ? urgency.replace("_", " ") : "Tous"}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Boutons d'action des filtres */}
          <View style={styles.filterActions}>
            <TouchableOpacity 
              style={styles.resetButton}
              onPress={resetFilters}
            >
              <Text style={styles.resetButtonText}>🔄 Réinitialiser</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.applyButton}
              onPress={() => setShowAdvancedFilters(false)}
            >
              <Text style={styles.applyButtonText}>✓ Appliquer ({filteredReclamations.length})</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    );
  };

  // Pagination améliorée
  const PaginationControls = () => {
    if (totalPages <= 1) return null;

    return (
      <View style={styles.paginationContainer}>
        <TouchableOpacity
          style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
          onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
        >
          <Text style={styles.paginationButtonText}>◀</Text>
        </TouchableOpacity>

        <View style={styles.paginationInfo}>
          <Text style={styles.paginationText}>
            Page {currentPage} / {totalPages}
          </Text>
          <Text style={styles.paginationSubtext}>
            {filteredReclamations.length} résultat{filteredReclamations.length > 1 ? 's' : ''}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
          onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages}
        >
          <Text style={styles.paginationButtonText}>▶</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const AgentCard = ({ agent }) => {
    const stats = getAgentStats(agent.uid);
    if (stats.total === 0) return null;

    return (
      <View style={styles.agentCard}>
        <View style={styles.agentHeader}>
          <View>
            <Text style={styles.agentName}>{agent.name}</Text>
            <Text style={styles.agentRole}>{agent.specialite || agent.role}</Text>
          </View>
          <View style={styles.agentSuccessRate}>
            <Text style={styles.agentSuccessValue}>{stats.tauxReussite}%</Text>
            <Text style={styles.agentSuccessLabel}>Taux de réussite</Text>
          </View>
        </View>

        <View style={styles.agentStatsGrid}>
          <TouchableOpacity
            style={[styles.agentStatItem, { backgroundColor: "#EEF2FF" }]}
            onPress={() => handleAgentStatClick(agent, "total")}
          >
            <Text style={[styles.agentStatValue, { color: "#4F46E5" }]}>
              {stats.total}
            </Text>
            <Text style={styles.agentStatLabel}>Total</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.agentStatItem, { backgroundColor: "#ECFDF5" }]}
            onPress={() => handleAgentStatClick(agent, "terminees")}
          >
            <Text style={[styles.agentStatValue, { color: "#10B981" }]}>
              {stats.terminees}
            </Text>
            <Text style={styles.agentStatLabel}>Terminées</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.agentStatItem, { backgroundColor: "#FEF2F2" }]}
            onPress={() => handleAgentStatClick(agent, "enRetard")}
          >
            <Text style={[styles.agentStatValue, { color: "#DC2626" }]}>
              {stats.enRetard}
            </Text>
            <Text style={styles.agentStatLabel}>En retard</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${stats.tauxReussite}%`,
                backgroundColor:
                  stats.tauxReussite >= 80 ? "#10B981" : stats.tauxReussite >= 50 ? "#F59E0B" : "#DC2626",
              },
            ]}
          />
        </View>
      </View>
    );
  };

  const ReclamationCard = ({ item, minimal = false }) => (
    <TouchableOpacity
      style={[
        styles.reclamationCard,
        isEnRetard(item) && styles.reclamationCardRetard,
      ]}
      onPress={() => {
        setSelectedReclamation(item);
        setShowDetailModal(true);
      }}
      activeOpacity={0.7}
    >
      {isEnRetard(item) && !minimal && (
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

      <View style={styles.reclamationFooter}>
        <View style={styles.agentInfo}>
          <Text style={styles.agentLabel}>Agent:</Text>
          <Text style={styles.agentText}>
            {item.agentAssigne ? item.agentAssigne.nom : "Non assigné"}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      {item.createdAt && (
        <View style={styles.timeInfo}>
          <Text style={styles.timeText}>🕐 {formatDuree(item.createdAt)}</Text>
        </View>
      )}

      {minimal && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleAction("message", item)}
          >
            <Text style={styles.actionBtnText}>💬 Message</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleAction("doc", item)}
          >
            <Text style={styles.actionBtnText}>📎 Document</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Réclamations</Text>
          <Text style={styles.subtitle}>Gestion et supervision</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>+ Nouvelle</Text>
        </TouchableOpacity>
      </View> */}
<ScreenHeader 
  title="Réclamations"
  subtitle="Gestion et supervision"
  backgroundColor="#3B82F6"
  onBackPress={() => navigation.goBack()}
  rightButtons={[
    { label: "+ Nouvelle", onPress: () => setShowAddModal(true) }
  ]}
/>

      {/* Barre de recherche conditionnelle selon la vue */}
      {currentView === "list" ? <SimpleSearchBar /> : <AgentSearchBar />}
      
      {/* Chips des filtres actifs - uniquement pour la vue liste */}
      {currentView === "list" && <ActiveFilterChips />}
      
      {/* Filtres avancés - uniquement pour la vue liste */}
      {currentView === "list" && showAdvancedFilters && <AdvancedFilters />}

      {/* Tabs Principaux */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity

          style={[styles.tab, currentView === "list" && styles.tabActive]}
          onPress={() => setCurrentView("list")} 
           >

          <Text
            style={[
              styles.tabText,
              currentView === "list" && styles.tabTextActive,
            ]}  >

            📋 Liste


          </Text>
          
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, currentView === "history" && styles.tabActive]}
          onPress={() => setCurrentView("history")}
        >
          <Text
            style={[
              styles.tabText,
              currentView === "history" && styles.tabTextActive,
            ]}
          >
            👥 Par Agent
          </Text>
        </TouchableOpacity>
      </View>

      {/* Mode "Mes Réclamations" */}
      {currentView === "list" && (
        <View style={styles.filterModeContainer}>
          <TouchableOpacity
            style={[
              styles.filterModeBtn,
              filterMode === "all" && styles.filterModeBtnActive,
            ]}
            onPress={() => setFilterMode("all")}
          >
            <Text
              style={[
                styles.filterModeText,
                filterMode === "all" && styles.filterModeTextActive,
              ]}
            >
              🌐 Toutes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterModeBtn,
              filterMode === "mine" && styles.filterModeBtnActive,
            ]}
            onPress={() => setFilterMode("mine")}
          >
            <Text
              style={[
                styles.filterModeText,
                filterMode === "mine" && styles.filterModeTextActive,
              ]}
            >
              👤 Les miennes
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Stats Cards */}
      {filterMode === "all" && currentView === "list" && (
        <View style={styles.statsGrid}>
          <StatCard 
            value={stats.total} 
            label="Total" 
            onPress={() => {
              resetFilters();
              setCurrentView("list");
            }}
          />
          
          <StatCard 
            value={stats.enRetard} 
            label="Retard" 
            color="#DC2626"
            onPress={() => {
              const retardReclamations = reclamations.filter(isEnRetard);
              setDrillDownData({
                title: "⚠️ Réclamations en retard",
                list: retardReclamations,
                agent: null
              });
              setShowDrillDownModal(true);
            }}
          />
          
          <StatCard 
            value={stats.terminees} 
            label="Terminées" 
            color="#10B981"
            onPress={() => {
              const terminees = reclamations.filter(
                (rec) => rec.status === "résolu" || rec.status === "clôturé"
              );
              setDrillDownData({
                title: "✅ Réclamations terminées",
                list: terminees,
                agent: null
              });
              setShowDrillDownModal(true);
            }}
          />
          
          <StatCard 
            value={stats.enCours} 
            label="En Cours" 
            color="#F59E0B"
            onPress={() => {
              const enCours = reclamations.filter(
                (rec) => rec.status !== "résolu" && 
                        rec.status !== "clôturé" && 
                        !isEnRetard(rec)
              );
              setDrillDownData({
                title: "🔄 Réclamations en cours",
                list: enCours,
                agent: null
              });
              setShowDrillDownModal(true);
            }}
          />
        </View>
      )}

      {/* VUE LISTE */}
      {currentView === "list" && (
        <>
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
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={styles.emptyText}>
                  {hasActiveFilters
                    ? "Aucune réclamation ne correspond aux filtres" 
                    : "Aucune réclamation trouvée"}
                </Text>
                {hasActiveFilters && (
                  <TouchableOpacity 
                    style={styles.resetEmptyButton}
                    onPress={resetFilters}
                  >
                    <Text style={styles.resetEmptyButtonText}>
                      Réinitialiser les filtres
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            }
          />
          <PaginationControls />
        </>
      )}

      {/* VUE PAR AGENT */}
      {currentView === "history" && (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filteredAgents.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>👤</Text>
              <Text style={styles.emptyText}>
                Aucun agent trouvé
              </Text>
              <TouchableOpacity 
                style={styles.resetEmptyButton}
                onPress={resetAgentFilter}
              >
                <Text style={styles.resetEmptyButtonText}>
                  Réinitialiser la recherche
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredAgents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))
          )}
        </ScrollView>
      )}

      {/* MODALE DRILL-DOWN */}
      <Modal
        visible={showDrillDownModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDrillDownModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {drillDownData?.title}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 15 }}>
                <TouchableOpacity 
                  onPress={() => {
                    if (drillDownData?.agent) {
                      setShowDrillDownModal(false);
                    } else {
                      setShowDrillDownModal(false);
                      setCurrentView("list");
                    }
                  }}
                >
                  <Text style={[styles.modalClose, { fontSize: 18 }]}>←</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowDrillDownModal(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            <FlatList
              data={drillDownData?.list || []}
              renderItem={({ item }) => (
                <ReclamationCard item={item} minimal={true} />
              )}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16 }}
              ListEmptyComponent={
                <Text style={styles.emptyModalText}>
                  Aucune réclamation dans cette catégorie.
                </Text>
              }
            />
          </View>
        </View>
      </Modal>

      {/* MODALE DETAILS */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Détails de la réclamation</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {selectedReclamation && (
                <>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>🏠 Chambre</Text>
                    <Text style={styles.detailValue}>{selectedReclamation.roomNumber}</Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>📝 Problème</Text>
                    <View style={styles.problemBox}>
                      <Text style={styles.problemText}>
                        {selectedReclamation.problem}
                      </Text>
                    </View>
                  </View>

                  {selectedReclamation.description && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>📄 Description</Text>
                      <View style={styles.problemBox}>
                        <Text style={styles.problemText}>
                          {selectedReclamation.description}
                        </Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>⚡ Urgence</Text>
                    <UrgencyBadge urgency={selectedReclamation.urgency} />
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>👤 Agent assigné</Text>
                    <Text style={styles.detailValue}>
                      {selectedReclamation.agentAssigne?.nom || "Non assigné"}
                    </Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>🔄 Changer le statut</Text>
                    <View style={styles.statusSelector}>
                      {["en attente", "assigné", "en cours", "résolu", "clôturé"].map((s) => (
                        <TouchableOpacity
                          key={s}
                          style={[
                            styles.statusOption,
                            selectedReclamation.status === s && {
                              backgroundColor: getStatusColor(s),
                            },
                          ]}
                          onPress={() =>
                            handleStatusChange(selectedReclamation.id, s)
                          }
                        >
                          <Text
                            style={[
                              styles.statusOptionText,
                              selectedReclamation.status === s && {
                                color: "white",
                              },
                            ]}
                          >
                            {s}
                          </Text>
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

      <AddReclamationModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={(formData) => {
          console.log('Nouvelle réclamation:', formData);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },

  // HEADER
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#3B82F6",
    paddingTop: Platform.OS === "ios" ? 60 : 50,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  headerContent: {
    flex: 1,
  },
  backButtonText: {
    color: "rgba(255, 255, 255, 0.95)",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.85)",
    fontWeight: "500",
  },
  addButton: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  addButtonText: {
    color: "#3B82F6",
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 0.5,
  },

  // RECHERCHE
  searchContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    gap: 12,
    backgroundColor: "#F1F5F9",
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 10,
  },
 searchInput: {
  flex: 1,
  paddingVertical: 14,
  fontSize: 15,
  color: "#000000", // Forcez le noir pour le test
  fontWeight: "500",
},
  clearIcon: {
    fontSize: 18,
    color: "#94A3B8",
    padding: 4,
    fontWeight: "600",
  },
  filterButton: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E2E8F0",
    minWidth: 100,
    position: "relative",
  },
  filterButtonActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  filterButtonText: {
    color: "#3B82F6",
    fontWeight: "700",
    fontSize: 14,
  },
  filterBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#DC2626",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  filterBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },

  // RECHERCHE AGENT (Vue Par Agent)
agentSearchContainer: {
  paddingHorizontal: 20,
  paddingTop: 20,
  paddingBottom: 12,
  backgroundColor: "#F1F5F9",
  // Ajoutez ceci pour forcer l'affichage au-dessus de la liste
  zIndex: 5000, 
  elevation: 10, // Indispensable pour Android
minHeight: 70
},
  agentSearchWrapper: {
    position: "relative",
    zIndex: 1000,
  },
  selectedAgentBadge: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 2,
    borderColor: "#93C5FD",
    alignSelf: "flex-start",
  },
  selectedAgentText: {
    color: "#1E40AF",
    fontSize: 14,
    fontWeight: "700",
  },
  agentDropdown: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    maxHeight: 250,
    zIndex: 1001,
  },
  agentDropdownScroll: {
    maxHeight: 246,
  },
  agentDropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  agentDropdownInfo: {
    flex: 1,
  },
  agentDropdownName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  agentDropdownRole: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  agentDropdownArrow: {
    fontSize: 18,
    color: "#3B82F6",
    fontWeight: "600",
  },
  agentFilterInfo: {
    marginTop: 12,
    paddingHorizontal: 4,
  },
  agentFilterText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },

  // CHIPS FILTRES ACTIFS
  activeChipsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 8,
  },
  activeChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1.5,
    borderColor: "#93C5FD",
  },
  activeChipText: {
    color: "#1E40AF",
    fontSize: 13,
    fontWeight: "600",
  },
  activeChipClose: {
    color: "#60A5FA",
    fontSize: 16,
    fontWeight: "700",
  },
  resetChip: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#FECACA",
  },
  resetChipText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "700",
  },

  // FILTRES AVANCÉS
  advancedFiltersContainer: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,

  },


  filterGroup: {
    marginBottom: 20,
  },


  filterLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#475569",
    marginBottom: 12,
    letterSpacing: 0.8,
  },


  filterChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },


  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 2,
    borderColor: "#E2E8F0",
  },

  filterChipActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },

  filterChipContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
    textTransform: "capitalize",
  },

  filterChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  urgencyDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  
  // ACTIONS FILTRES
  filterActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingTop: 20,
    borderTopWidth: 2,
    borderTopColor: "#F1F5F9",
    gap: 12,
  },
  
  resetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 2,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  resetButtonText: {
    color: "#64748B",
    fontWeight: "700",
    fontSize: 14,
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  applyButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },

  // TABS
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginTop: 16,
    padding: 6,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: "#3B82F6",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  tabTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  // FILTER MODE
  filterModeContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    gap: 12,
  },
  filterModeBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  filterModeBtnActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  filterModeText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "600",
  },
  filterModeTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  // STATS
  statsGrid: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 2,
    borderColor: "#F1F5F9",
  },
  statValue: {
    fontSize: 28,
    fontWeight: "900",
    color: "#1E293B",
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  // PAGINATION
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  paginationButton: {
    backgroundColor: "#3B82F6",
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  paginationButtonDisabled: {
    backgroundColor: "#E2E8F0",
    shadowOpacity: 0,
  },
  paginationButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  paginationInfo: {
    alignItems: "center",
  },
  paginationText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  paginationSubtext: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },

  // RECLAMATION CARD
  reclamationCard: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 2,
    borderColor: "#F8FAFC",
  },
  reclamationCardRetard: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FCA5A5",
    borderWidth: 2,
  },
  reclamationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  roomBadge: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
  },
  roomText: {
    color: "#4F46E5",
    fontSize: 14,
    fontWeight: "800",
  },
  urgencyBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 7,
  },
  urgencyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  urgencyText: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  reclamationProblem: {
    fontSize: 16,
    color: "#334155",
    lineHeight: 24,
    marginBottom: 16,
    fontWeight: "600",
  },
  reclamationFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: "#F1F5F9",
  },
  agentInfo: {
    flex: 1,
  },
  agentLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  agentText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 100,
    alignItems: "center",
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  retardBadge: {
    backgroundColor: "#DC2626",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  retardText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  timeInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  timeText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },

  // ACTION ROW
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
    gap: 10,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: "#F1F5F9",
  },
  actionBtn: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E2E8F0",
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },

  // AGENT CARD
  agentCard: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 2,
    borderColor: "#F8FAFC",
  },
  agentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  agentName: {
    fontSize: 20,
    fontWeight: "900",
    color: "#1E293B",
    marginBottom: 4,
  },
  agentRole: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
  },
  agentSuccessRate: {
    alignItems: "flex-end",
  },
  agentSuccessValue: {
    fontSize: 24,
    fontWeight: "900",
    color: "#10B981",
  },
  agentSuccessLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  agentStatsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 18,
  },
  agentStatItem: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  agentStatValue: {
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 6,
  },
  agentStatLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: "#F1F5F9",
    borderRadius: 6,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 6,
  },

  // MODALES
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    borderBottomWidth: 2,
    borderBottomColor: "#F1F5F9",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#1E293B",
    flex: 1,
    marginRight: 12,
  },
  modalClose: {
    fontSize: 26,
    color: "#64748B",
    fontWeight: "300",
    width: 44,
    textAlign: "center",
  },
  modalBody: {
    padding: 24,
  },
  emptyModalText: {
    textAlign: "center",
    marginTop: 32,
    marginBottom: 32,
    color: "#94A3B8",
    fontSize: 15,
    fontWeight: "600",
  },

  // DETAILS
  detailSection: {
    marginBottom: 24,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#475569",
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 16,
    color: "#1E293B",
    fontWeight: "600",
  },
  problemBox: {
    backgroundColor: "#F8FAFC",
    padding: 18,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E2E8F0",
  },
  problemText: {
    fontSize: 15,
    color: "#334155",
    lineHeight: 24,
    fontWeight: "500",
  },
  statusSelector: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  statusOption: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 2,
    borderColor: "#E2E8F0",
    minWidth: 110,
    alignItems: "center",
  },
  statusOptionText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "capitalize",
  },

  // ÉTATS VIDES
  emptyState: {
    alignItems: "center",
    marginTop: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 72,
    marginBottom: 20,
    opacity: 0.4,
  },
  emptyText: {
    color: "#94A3B8",
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 24,
  },
  resetEmptyButton: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  resetEmptyButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },

  // CONTENU
  listContent: {
    paddingVertical: 16,
    paddingBottom: 32,
  },
  scrollContent: {
    paddingVertical: 16,
    paddingBottom: 32,
  },
});

export default AdminReclamations;