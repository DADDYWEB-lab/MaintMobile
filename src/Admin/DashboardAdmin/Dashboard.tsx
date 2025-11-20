// @ts-nocheck

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
  Modal,
  Pressable
} from 'react-native';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../../firebaseConfig'; // Ajustez le chemin selon votre structure

const { width } = Dimensions.get('window');

// En haut du fichier, ajoutez ces types :
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Définissez vos routes
type RootStackParamList = {
  Tasks: undefined;
  Reclamations: undefined;
  Staff: undefined;
  Statistics: undefined;
};

type AdminDashboardProps = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
};

// Puis utilisez-le dans le composant :
const AdminDashboard = ({ navigation }: AdminDashboardProps) => {
  const [tasks, setTasks] = useState([]);
  const [staff, setStaff] = useState([]);
  const [espaces, setEspaces] = useState([]);
  const [sousEspaces, setSousEspaces] = useState([]);
  const [reclamations, setReclamations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);

  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    pendingTasks: 0,
    totalReclamations: 0,
    urgentReclamations: 0,
    activeStaff: 0,
    reclamationsResolues: 0
  });

  // Récupération des données
  useEffect(() => {
    setLoading(true);
    let active = true;

    const qStaff = query(collection(db, 'staff'), orderBy('name'));
    const unsubStaff = onSnapshot(qStaff, (snapshot) => {
      if (active) setStaff(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qEspaces = query(collection(db, 'espaces'), orderBy('nom'));
    const unsubEspaces = onSnapshot(qEspaces, (snapshot) => {
      if (active) setEspaces(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qSousEspaces = query(collection(db, 'sous_espaces'), orderBy('numero'));
    const unsubSousEspaces = onSnapshot(qSousEspaces, (snapshot) => {
      if (active) setSousEspaces(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qTasks = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
    const unsubTasks = onSnapshot(qTasks, (snapshot) => {
      if (active) setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qReclamations = query(collection(db, 'reclamations'));
    const unsubReclamations = onSnapshot(qReclamations, (snapshot) => {
      if (active) {
        setReclamations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      }
    });

    return () => {
      active = false;
      unsubStaff();
      unsubEspaces();
      unsubSousEspaces();
      unsubTasks();
      unsubReclamations();
    };
  }, []);

  // Calcul des statistiques
  useEffect(() => {
    if (loading) return;

    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
    const pendingTasks = tasks.filter(t => t.status === 'pending').length;
    
    const urgentReclamations = reclamations.filter(r => 
      r.urgency === 'tres_urgent' || r.urgency === 'urgent' || r.urgency === 'high'
    ).length;

    const reclamationsResolues = reclamations.filter(r => 
      r.status === 'résolu' || r.status === 'clôturé'
    ).length;

    const activeStaff = staff.filter(s => 
      tasks.some(t => t.staffId === s.id && t.status !== 'completed')
    ).length;

    setStats({
      totalTasks: tasks.length,
      completedTasks,
      inProgressTasks,
      pendingTasks,
      totalReclamations: reclamations.length,
      urgentReclamations,
      activeStaff,
      reclamationsResolues
    });
  }, [tasks, reclamations, staff, loading]);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const StatCard = ({ title, value, color, icon, onPress }) => (
    <TouchableOpacity 
      style={[styles.statCard, { borderLeftColor: color }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.statCardContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{title}</Text>
      </View>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Text style={[styles.statIconText, { color }]}>{icon}</Text>
      </View>
    </TouchableOpacity>
  );

  const QuickActionCard = ({ title, description, color, icon, onPress }) => (
    <TouchableOpacity 
      style={[styles.actionCard, { backgroundColor: color }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.actionIcon}>{icon}</Text>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionDescription}>{description}</Text>
    </TouchableOpacity>
  );

  const DetailModal = () => (
    <Modal
      visible={selectedCard !== null}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setSelectedCard(null)}
    >
      <Pressable 
        style={styles.modalOverlay}
        onPress={() => setSelectedCard(null)}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {selectedCard === 'tasks' && 'Détails des Tâches'}
            {selectedCard === 'reclamations' && 'Détails des Réclamations'}
            {selectedCard === 'staff' && 'Détails du Personnel'}
          </Text>
          
          {selectedCard === 'tasks' && (
            <View style={styles.modalDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Terminées:</Text>
                <Text style={[styles.detailValue, { color: '#10B981' }]}>
                  {stats.completedTasks}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>En cours:</Text>
                <Text style={[styles.detailValue, { color: '#F59E0B' }]}>
                  {stats.inProgressTasks}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>En attente:</Text>
                <Text style={[styles.detailValue, { color: '#EF4444' }]}>
                  {stats.pendingTasks}
                </Text>
              </View>
            </View>
          )}
          
          {selectedCard === 'reclamations' && (
            <View style={styles.modalDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Résolues:</Text>
                <Text style={[styles.detailValue, { color: '#10B981' }]}>
                  {stats.reclamationsResolues}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Urgentes:</Text>
                <Text style={[styles.detailValue, { color: '#EF4444' }]}>
                  {stats.urgentReclamations}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total:</Text>
                <Text style={styles.detailValue}>
                  {stats.totalReclamations}
                </Text>
              </View>
            </View>
          )}
          
          {selectedCard === 'staff' && (
            <View style={styles.modalDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Personnel actif:</Text>
                <Text style={styles.detailValue}>
                  {stats.activeStaff}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total employés:</Text>
                <Text style={styles.detailValue}>
                  {staff.length}
                </Text>
              </View>
            </View>
          )}
          
          <TouchableOpacity 
            style={styles.modalButton}
            onPress={() => setSelectedCard(null)}
          >
            <Text style={styles.modalButtonText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Chargement du dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Dashboard Admin</Text>
          <Text style={styles.headerSubtitle}>Hôtel Maintenance</Text>
        </View>

        {/* Statistiques principales */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vue d'ensemble</Text>
          
          <View style={styles.statsGrid}>
            <StatCard
              title="Tâches"
              value={stats.totalTasks}
              color="#3B82F6"
              icon="📋"
              onPress={() => setSelectedCard('tasks')}
            />
            <StatCard
              title="Terminées"
              value={stats.completedTasks}
              color="#10B981"
              icon="✓"
              onPress={() => setSelectedCard('tasks')}
            />
            <StatCard
              title="En cours"
              value={stats.inProgressTasks}
              color="#F59E0B"
              icon="⏳"
              onPress={() => setSelectedCard('tasks')}
            />
            <StatCard
              title="Réclamations"
              value={stats.totalReclamations}
              color="#EF4444"
              icon="⚠️"
              onPress={() => setSelectedCard('reclamations')}
            />
            <StatCard
              title="Urgentes"
              value={stats.urgentReclamations}
              color="#DC2626"
              icon="🔥"
              onPress={() => setSelectedCard('reclamations')}
            />
            <StatCard
              title="Personnel actif"
              value={stats.activeStaff}
              color="#8B5CF6"
              icon="👥"
              onPress={() => setSelectedCard('staff')}
            />
          </View>
        </View>

        {/* Actions rapides */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions rapides</Text>
          
          <View style={styles.actionsGrid}>
            <QuickActionCard
              title="Tâches"
              description="Gérer les tâches"
              color="#3B82F6"
              icon="📝"
              onPress={() => navigation.navigate('TaskCalendar')}
            />
            <QuickActionCard
              title="Réclamations"
              description="Voir réclamations"
              color="#EF4444"
              icon="📢"
              onPress={() => navigation.navigate('Reclamations')}
            />
            <QuickActionCard
              title="Personnels"
              description="Gérer équipe"
              color="#8B5CF6"
              icon="👤"
              onPress={() => navigation.navigate('Personnel')}
            />
            <QuickActionCard
              title="Statistiques"
              description="Voir détails"
              color="#10B981"
              icon="📊"
              onPress={() => navigation.navigate('Statistics')}
            />
             <QuickActionCard
              title="Fournisseurs"
              description="Voir détails"
              color="#75b910ff"
              icon="🚚"
              onPress={() => navigation.navigate('Fournisseurs')}
            />
             <QuickActionCard
              title="Espaces"
              description="Voir détails"
              color="#b91094ff"
              icon="🏠"
              onPress={() => navigation.navigate('Espaces')}
            />

             <QuickActionCard
              title="Devis"
              description="Voir détails"
              color="#179ca6ff"
              icon="🏠"
              onPress={() => navigation.navigate('Devis')}

            />
            <QuickActionCard
              title="Paramétres"
              description="Voir détails"
              color="#768081ff"
              icon="⚙️​"
              onPress={() => navigation.navigate('Devis')}

            />

                        
              <QuickActionCard
              title="Chat"
              description="Voir détails"
              color="#8f631cff"
              icon="💬​​"
              onPress={() => navigation.navigate('Chat')}

            />


          </View>
        </View>

        {/* Indicateur de performance */}
        <View style={styles.section}>


          <Text style={styles.sectionTitle}>Performance</Text>
          
          <View style={styles.performanceCard}>
            <View style={styles.performanceRow}>
              <Text style={styles.performanceLabel}>Taux de complétion</Text>
              <Text style={styles.performanceValue}>
                {stats.totalTasks > 0 
                  ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
                  : 0}%
              </Text>
            </View>


            <View style={styles.progressBar}>
                  
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${stats.totalTasks > 0 
                      ? (stats.completedTasks / stats.totalTasks) * 100 
                      : 0}%` 
                  }
                ]} 
              />
            </View>
            
            <View style={styles.performanceRow}>
              <Text style={styles.performanceLabel}>Réclamations résolues</Text>

              <Text style={styles.performanceValue}>
                {stats.totalReclamations > 0 
                  ? Math.round((stats.reclamationsResolues / stats.totalReclamations) * 100)
                  : 0}%
              </Text>


            </View>


            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { backgroundColor: '#10B981' },
                  { 
                    width: `${stats.totalReclamations > 0 
                      ? (stats.reclamationsResolues / stats.totalReclamations) * 100 
                      : 0}%` 
                  }
                ]} 
              />
            </View>


          </View>
        </View>
      </ScrollView>

      <DetailModal />
    </View>
  );
};

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },

  scrollView: {
    flex: 1,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },

  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },


  header: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },

  headerSubtitle: {
    fontSize: 16,
    color: '#DBEAFE',
  },

  section: {
    padding: 20,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: (width - 52) / 2,
    borderLeftWidth: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  statCardContent: {
    flex: 1,
  },

  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },

  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },

  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },

    statIconText: {
    fontSize: 24,
  },

  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  actionCard: {
    borderRadius: 16,
    padding: 20,
    width: (width - 52) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  actionIcon: {
    fontSize: 32,
    marginBottom: 12,
  },

  actionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },

  actionDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
  },

  performanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  performanceLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },

  performanceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },

  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 20,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: width - 40,
    maxWidth: 400,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 20,
  },

    modalDetails: {
    marginBottom: 20,
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

   detailLabel: {
    fontSize: 16,
    color: '#6B7280',
  },

    detailValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },

  modalButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },

    modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  }
  
});

export default AdminDashboard;