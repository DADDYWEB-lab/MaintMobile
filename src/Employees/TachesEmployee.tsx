import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
  StatusBar,
  Animated,
} from 'react-native';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');

// Types
interface Task {
  id: string;
  taskType: string;
  status: 'pending' | 'en cours' | 'en pause' | 'terminé';
  priority: 'Haute' | 'Moyenne' | 'Basse';
  locationName: string;
  espaceId?: string;
  sousEspaceId?: string;
  date: string;
  startTime?: string;
  startTimeActual?: number;
  isRecurring?: boolean;
  recurringType?: string;
  notes?: string;
}

// Composant Timer
const Timer = ({ startTime }: { startTime: number }) => {
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return <Text style={styles.timerText}>{formatTime(secondsElapsed)}</Text>;
};

// Composant TaskCard
const TaskCard = ({ task, onPress }: { task: Task; onPress: (task: Task) => void }) => {
  const scaleAnim = new Animated.Value(1);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const getStatusConfig = (status: string) => {
    const configs = {
      pending: { 
        color: '#3B82F6', 
        bg: '#EFF6FF', 
        icon: '⏱️',
        text: 'En attente'
      },
      'en cours': { 
        color: '#10B981', 
        bg: '#ECFDF5', 
        icon: '▶️',
        text: 'En cours'
      },
      'en pause': { 
        color: '#F59E0B', 
        bg: '#FEF3C7', 
        icon: '⏸️',
        text: 'En pause'
      },
      terminé: { 
        color: '#14B8A6', 
        bg: '#F0FDFA', 
        icon: '✅',
        text: 'Terminé'
      },
    };
    return configs[status] || configs.pending;
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      Haute: '#EF4444',
      Moyenne: '#F59E0B',
      Basse: '#3B82F6',
    };
    return colors[priority] || colors.Moyenne;
  };

  const statusConfig = getStatusConfig(task.status);
  const priorityColor = getPriorityColor(task.priority);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.taskCard}
        onPress={() => onPress(task)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {/* Indicateur de priorité */}
        <View style={[styles.priorityBar, { backgroundColor: priorityColor }]} />

        {/* Contenu */}
        <View style={styles.taskCardContent}>
          <View style={styles.taskCardHeader}>
            <View style={styles.taskCardTitleContainer}>
              <Text style={styles.taskCardTitle} numberOfLines={1}>
                {task.taskType}
              </Text>
              <View style={styles.locationRow}>
                <Text style={styles.locationIcon}>📍</Text>
                <Text style={styles.locationText} numberOfLines={1}>
                  {task.locationName}
                </Text>
              </View>
            </View>

            {/* Badge de statut */}
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
              <Text style={styles.statusIcon}>{statusConfig.icon}</Text>
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {statusConfig.text}
              </Text>
            </View>
          </View>

          {/* Informations supplémentaires */}
          <View style={styles.taskCardFooter}>
            <View style={styles.infoChip}>
              <Text style={styles.infoChipIcon}>📅</Text>
              <Text style={styles.infoChipText}>{task.date}</Text>
            </View>
            {task.startTime && (
              <View style={styles.infoChip}>
                <Text style={styles.infoChipIcon}>⏰</Text>
                <Text style={styles.infoChipText}>{task.startTime}</Text>
              </View>
            )}
          </View>


          {/* Indicateur actif */}
          {task.status === 'en cours' && (
            <View style={styles.activeIndicatorRow}>
              <View style={styles.activeDot} />
              <Text style={styles.activeText}>Tâche active</Text>
            </View>
          )}
        </View>

        {/* Flèche */}
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Composant Modal
const TaskDetailModal = ({ 
  task, 
  isVisible, 
  onClose, 
  onUpdateStatus 
}: { 
  task: Task | null; 
  isVisible: boolean; 
  onClose: () => void; 
  onUpdateStatus: (status: Task['status']) => void;
}) => {
  if (!task) return null;

  const getStatusGradient = (status: string) => {
    const gradients = {
      pending: ['#3B82F6', '#2563EB'],
      'en cours': ['#10B981', '#059669'],
      'en pause': ['#F59E0B', '#D97706'],
      terminé: ['#14B8A6', '#0D9488'],
                
                
                 };

    return gradients [status] || gradients.pending;

  };
 
  const renderActionButtons = () => {
    if (task.status === 'pending' || task.status === 'en pause')  {  
      return (
        <TouchableOpacity
          style={[styles.actionButton, styles.startButton]}
          onPress={() => onUpdateStatus('en cours')}
        >
          <Text style={styles.actionButtonIcon}>▶️</Text>
          <Text style={styles.actionButtonText}>DÉMARRER LA TÂCHE</Text>
        </TouchableOpacity>
      );
    }

    if (task.status === 'en cours') {
      return (
        <View style={styles.actionButtonRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.pauseButton, styles.flexButton]}
            onPress={() => onUpdateStatus('en pause')}
          >
            <Text style={styles.actionButtonIcon}>⏸️</Text>
            <Text style={styles.actionButtonText}>PAUSE</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.finishButton, styles.flexButton]}
            onPress={() => {
              onUpdateStatus('terminé');
              onClose();
            }}
          >
            <Text style={styles.actionButtonIcon}>✅</Text>
            <Text style={styles.actionButtonText}>TERMINER</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  return (
    <Modal visible={isVisible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          {/* Handle */}
          <View style={styles.modalHandle} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalScrollContent}
          >
            {/* Header avec gradient */}
            <View style={[styles.modalHeader, { backgroundColor: getStatusGradient(task.status)[0] }]}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonIcon}>✕</Text>
              </TouchableOpacity>

              <View style={styles.modalHeaderBadge}>
                <Text style={styles.modalHeaderBadgeText}>{task.status.toUpperCase()}</Text>
              </View>
              
              <Text style={styles.modalTitle}>{task.taskType}</Text>
              <View style={styles.modalDateRow}>
                <Text style={styles.modalDateIcon}>📅</Text>
                <Text style={styles.modalDateText}>{task.date}</Text>
              </View>
            </View>

            {/* Timer Section */}
            <View style={styles.timerSection}>
              <View style={styles.timerLabelRow}>
                <Text style={styles.timerIcon}>⏱️</Text>
                <Text style={styles.timerLabel}>TEMPS D'ACTIVITÉ</Text>
              </View>
              {task.status === 'en cours' && task.startTimeActual ? (
                <Timer startTime={task.startTimeActual} />
              ) : (
                <Text style={styles.inactiveTimer}>00:00</Text>
              )}
            </View>

            {/* Info Cards Grid */}
            <View style={styles.infoGrid}>
              <View style={[styles.infoCard, styles.infoCardBlue]}>
                <View style={styles.infoCardIconContainer}>
                  <Text style={styles.infoCardIcon}>🏢</Text>
                </View>
                <View style={styles.infoCardContent}>
                  <Text style={styles.infoCardLabel}>ESPACE</Text>
                  <Text style={styles.infoCardValue} numberOfLines={1}>
                    {task.espaceId || 'Non défini'}
                  </Text>
                </View>
              </View>

              <View style={[styles.infoCard, styles.infoCardPurple]}>
                <View style={styles.infoCardIconContainer}>
                  <Text style={styles.infoCardIcon}>📍</Text>
                </View>
                <View style={styles.infoCardContent}>
                  <Text style={styles.infoCardLabel}>SOUS-ESPACE</Text>
                  <Text style={styles.infoCardValue} numberOfLines={1}>
                    {task.sousEspaceId || 'Non défini'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Planning Section */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionIconContainer}>
                  <Text style={styles.sectionIcon}>📅</Text>
                </View>
                <Text style={styles.sectionTitle}>Planning</Text>
              </View>
              
              <View style={styles.detailRow}>
                <View style={styles.detailLabelRow}>
                  <Text style={styles.detailIcon}>⏰</Text>
                  <Text style={styles.detailLabel}>Heure de début</Text>
                </View>
                <Text style={styles.detailValue}>{task.startTime || 'Non définie'}</Text>
              </View>

              {task.isRecurring && task.recurringType && (
                <View style={[styles.detailRow, styles.detailRowBorder]}>
                  <View style={styles.detailLabelRow}>
                    <Text style={styles.detailIcon}>🔄</Text>
                    <Text style={styles.detailLabel}>Récurrence</Text>
                  </View>
                  <Text style={styles.detailValue}>{task.recurringType}</Text>
                </View>
              )}
            </View>

            {/* Notes Section */}
            <View style={styles.notesCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionIcon}>📝</Text>
                <Text style={styles.sectionTitle}>Instructions / Notes</Text>
              </View>
              <Text style={styles.notesText}>
                {task.notes || 'Aucune consigne particulière pour cette mission.'}
              </Text>
            </View>

            {/* Action Buttons */}
            {renderActionButtons()}

            <View style={styles.bottomSpacer} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// Composant Principal
const TachesEmployee = () => {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      taskType: 'Nettoyage Bureau 301',
      status: 'en cours',
      priority: 'Haute',
      locationName: 'Bâtiment A - Étage 3',
      espaceId: 'Bureau 301',
      sousEspaceId: 'Zone administrative',
      date: '09 Jan 2026',
      startTime: '09:00',
      startTimeActual: Date.now() - 3600000,
      isRecurring: true,
      recurringType: 'Quotidien',
      notes: 'Attention aux équipements électroniques. Utiliser des produits doux.',
    },
    {
      id: '2',
      taskType: 'Maintenance Climatisation',
      status: 'pending',
      priority: 'Haute',
      locationName: 'Salle de conférence',
      espaceId: 'Salle A',
      sousEspaceId: 'Rez-de-chaussée',
      date: '09 Jan 2026',
      startTime: '14:00',
      notes: 'Vérifier les filtres et nettoyer les bouches d\'aération.',
    },
    {
      id: '3',
      taskType: 'Contrôle Espaces Verts',
      status: 'en pause',
      priority: 'Moyenne',
      locationName: 'Jardin principal',
      espaceId: 'Extérieur',
      sousEspaceId: 'Zone sud',
      date: '09 Jan 2026',
      startTime: '10:00',
      isRecurring: true,
      recurringType: 'Hebdomadaire',
      notes: 'Arrosage et taille des haies. Ramassage des feuilles mortes.',
    },
    {
      id: '4',
      taskType: 'Inspection Sécurité',
      status: 'terminé',
      priority: 'Basse',
      locationName: 'Parking souterrain',
      espaceId: 'Parking P1',
      sousEspaceId: 'Niveau -1',
      date: '08 Jan 2026',
      startTime: '08:00',
      notes: 'Inspection complétée avec succès. Aucun problème détecté.',
    },
  ]);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'en cours' | 'en pause' | 'terminé'>('all');

  const handleUpdateTaskStatus = (status: Task['status']) => {
    if (!selectedTask) return;

    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === selectedTask.id
          ? {
              ...task,
              status,
              startTimeActual: status === 'en cours' ? Date.now() : task.startTimeActual,
            }
          : task
      )
    );

    setSelectedTask(prev => prev ? { ...prev, status } : null);
  };

  const filteredTasks = filter === 'all' 
    ? tasks 
    : tasks.filter(task => task.status === filter);

  const getFilterCount = (status: string) => {
    return tasks.filter(t => t.status === status).length;
  };

  const FilterButton = ({ 
    label, 
    count, 
    filterValue, 
    color 
  }: { 
    label: string; 
    count: number; 
    filterValue: typeof filter; 
    color: string;
  }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filter === filterValue && { backgroundColor: color }
      ]}
      onPress={() => setFilter(filterValue)}
    >
      <Text style={[
        styles.filterButtonText,
        filter === filterValue && styles.filterButtonTextActive
      ]}>
        {label} ({count})
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#9333EA" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tableau de bord 📑</Text>
        <Text style={styles.headerSubtitle}>Gérez vos tâches quotidiennes</Text>
      </View>

      {/* Filtres */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContainer}
      >
        <FilterButton label="Toutes" count={tasks.length} filterValue="all" color="#9333EA" />
        <FilterButton label="En attente" count={getFilterCount('pending')} filterValue="pending" color="#3B82F6" />
        <FilterButton label="En cours" count={getFilterCount('en cours')} filterValue="en cours" color="#10B981" />
        <FilterButton label="En pause" count={getFilterCount('en pause')} filterValue="en pause" color="#F59E0B" />
      </ScrollView>

      {/* Liste des tâches */}
      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TaskCard task={item} onPress={setSelectedTask} />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>Aucune tâche dans cette catégorie</Text>
          </View>
        }
      />

      {/* Modal */}
      <TaskDetailModal
        task={selectedTask}
        isVisible={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdateStatus={handleUpdateTaskStatus}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  
  // Header
  header: {
    backgroundColor: '#9333EA',
    paddingTop: 60,
    paddingBottom: 25,
    paddingHorizontal: 25,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },

  // Filtres
  filterContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    gap: 10,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: '#FFF',
    marginRight: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: '#FFF',
  },

  // Liste
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },

  // Task Card
  taskCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    marginBottom: 15,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  priorityBar: {
    width: 4,
    height: 60,
    borderRadius: 2,
    marginRight: 15,
  },
  taskCardContent: {
    flex: 1,
  },
  taskCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  taskCardTitleContainer: {
    flex: 1,
    marginRight: 10,
  },
  taskCardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 5,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  locationText: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  statusIcon: {
    fontSize: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  taskCardFooter: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoChipIcon: {
    fontSize: 10,
  },
  infoChipText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  activeIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 5,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  activeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  chevron: {
    fontSize: 24,
    color: '#D1D5DB',
    marginLeft: 10,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 15,
    color: '#9CA3AF',
    fontWeight: '600',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    maxHeight: WINDOW_HEIGHT * 0.92,
  },
  modalHandle: {
    width: 50,
    height: 5,
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    alignSelf: 'center',
    marginTop: 12,
  },
  modalScrollContent: {
    paddingBottom: 40,
  },
  modalHeader: {
    paddingHorizontal: 25,
    paddingTop: 30,
    paddingBottom: 30,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeButtonIcon: {
    fontSize: 20,
    color: '#FFF',
    fontWeight: '700',
  },
  modalHeaderBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  modalHeaderBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '900',
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 8,
  },
  modalDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalDateIcon: {
    fontSize: 14,
  },
  modalDateText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },

  // Timer Section
  timerSection: {
    backgroundColor: '#F9FAFB',
    marginHorizontal: 25,
    marginTop: 25,
    borderRadius: 30,
    padding: 30,
    alignItems: 'center',
  },
  timerLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 15,
  },
  timerIcon: {
    fontSize: 16,
  },
  timerLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 1,
  },
  timerText: {
    fontSize: 56,
    fontWeight: '900',
    color: '#1F2937',
    letterSpacing: 2,
  },
  inactiveTimer: {
    fontSize: 56,
    fontWeight: '900',
    color: '#E5E7EB',
  },

  // Info Grid
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 25,
    marginTop: 20,
  },
  infoCard: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoCardBlue: {
    backgroundColor: '#EFF6FF',
  },
  infoCardPurple: {
    backgroundColor: '#F5F3FF',
  },
  infoCardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCardIcon: {
    fontSize: 20,
  },
  infoCardContent: {
    flex: 1,
  },
  infoCardLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoCardValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1F2937',
  },

  // Section Card
  sectionCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 25,
    marginTop: 20,
    padding: 20,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#F3F4F6',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 15,
  },
  sectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionIcon: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  detailRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginTop: 5,
  },
  detailLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailIcon: {
    fontSize: 14,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F2937',
  },

  
  notesCard: {
    backgroundColor: '#FFFBEB',
    marginHorizontal: 25,
    marginTop: 20,
    padding: 20,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FDE68A',
  },
  notesText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
    marginTop: 5,
  },

  // Action Buttons
  actionButtonRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 25,
    marginTop: 30,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  flexButton: {
    flex: 1,
  },
  startButton: {
    backgroundColor: '#10B981',
    marginHorizontal: 25,
    marginTop: 30,
  },
  pauseButton: {
    backgroundColor: '#F59E0B',
  },
  finishButton: {
    backgroundColor: '#14B8A6',
  },
  actionButtonIcon: {
    fontSize: 16,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },

  bottomSpacer: {
    height: 40,
  },
});

export default TachesEmployee;

