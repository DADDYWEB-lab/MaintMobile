// TaskCalendar.tsx
// @ts-nocheck

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Modal,
  Pressable,
  FlatList,
  RefreshControl
} from 'react-native';
import { collection, query, onSnapshot, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import ScreenHeader from '../Components/ScreenHeader'



const { width } = Dimensions.get('window');

const TaskCalendar = ({ navigation }: { navigation: any }) => {
  const [tasks, setTasks] = useState([]);
  const [staff, setStaff] = useState([]);
  const [espaces, setEspaces] = useState([]);
  const [sousEspaces, setSousEspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [currentView, setCurrentView] = useState('today'); // 'today' ou 'calendar'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);

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
      if (active) {
        setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      }


    });



    return () => {
      active = false;
      unsubStaff();
      unsubEspaces();
      unsubSousEspaces();
      unsubTasks();
    };
  }, 
  []);

  // Fonctions utilitaires
  const getStaffById = (staffId) => staff.find(s => s.id === staffId);



  const getLocationNameById = (espaceId, sousEspaceId) => {
    if (sousEspaceId) {
      const sousEspace = sousEspaces.find(se => se.id === sousEspaceId);
      const espaceParent = espaces.find(e => e.id === (sousEspace?.espaceParentId || espaceId));
      if (sousEspace && espaceParent) {
        return `${espaceParent.nom} - ${sousEspace.nom || `Sous-espace ${sousEspace.numero}`}`;
      }
    }



    if (espaceId) {
      const espace = espaces.find(e => e.id === espaceId);
      return espace?.nom || 'Espace inconnu';
    }
    return 'Lieu non spécifié';
  };



  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return '#10B981';
      case 'in-progress': return '#F59E0B';
      case 'pending': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'completed': return 'Terminée';
      case 'in-progress': return 'En cours';
      case 'pending': return 'En attente';
      default: return status;
    }
  };

  // Génération du calendrier
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Jours vides avant le début du mois
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ isEmpty: true, key: `empty-${i}` });
    }
    
    // Jours du mois
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push({ 
        day, 
        date, 
        isEmpty: false,
        key: `day-${day}`
      });
    }
    
    return days;
  };

  const getTasksForDate = (date) => {
    if (!date) return [];
    
    const dateStr = date.toISOString().split('T')[0];
    return tasks.filter(task => {
      if (task.date === dateStr) return true;
      
      // Tâches récurrentes
      if (task.isRecurring) {
        const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
        const dayName = dayNames[date.getDay()];
        
        if (task.recurringType === 'daily') return true;
        if (task.recurringType === 'weekly' && task.recurringDays?.includes(dayName)) return true;
        if (task.recurringType === 'monthly' && date.getDate() === (task.recurringDayOfMonth || 1)) return true;
      }
      
      return false;
    });
  };

  const hasTasksOnDate = (date) => {
    return getTasksForDate(date).length > 0;
  };

  // Navigation mois
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // Handlers
  const handleDayPress = (dayInfo) => {
    if (dayInfo.isEmpty) return;
    setSelectedDate(dayInfo.date);
  };

  const handleTaskPress = (task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  // Fonction pour changer le statut d'une tâche
  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await updateDoc(doc(db, 'tasks', taskId), { status: newStatus });
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask({ ...selectedTask, status: newStatus });
      }
    } catch (error) {
      console.error('Erreur lors du changement de statut:', error);
    }
  };

  // Fonction pour naviguer vers l'écran d'ajout de tâche
  const handleAddTask = () => {
    navigation.navigate('NewTask', { 
      selectedDate: selectedDate.toISOString().split('T')[0] 
    });
  };

  // Refresh function
  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  const days = getDaysInMonth(currentDate);
  const todayTasks = getTasksForDate(new Date());
  const selectedDateTasks = getTasksForDate(selectedDate);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Chargement du calendrier...</Text>
      </View>
    );
  }

  // Composant pour afficher une carte de tâche
  const TaskCard = ({ task }) => {
    const employee = getStaffById(task.staffId);
    const location = getLocationNameById(task.espaceId, task.sousEspaceId);
    
    return (
      <TouchableOpacity
        style={styles.taskCard}
        onPress={() => handleTaskPress(task)}
        activeOpacity={0.7}
      >
        <View style={[styles.taskStatus, { backgroundColor: getStatusColor(task.status) }]} />
        
        <View style={styles.taskContent}>
          <View style={styles.taskHeader}>
            <Text style={styles.taskTitle}>{task.taskType}</Text>
            <Text style={[styles.taskTime, { color: getStatusColor(task.status) }]}>
              {task.startTime || '00:00'}
            </Text>
          </View>
          
          <View style={styles.taskDetails}>
            <View style={styles.taskDetailRow}>
              <Text style={styles.taskDetailIcon}>👤</Text>
              <Text style={styles.taskDetailText}>
                {employee?.name || 'Non assigné'}
              </Text>
            </View>
            
            <View style={styles.taskDetailRow}>
              <Text style={styles.taskDetailIcon}>📍</Text>
              <Text style={styles.taskDetailText} numberOfLines={1}>
                {location}
              </Text>
            </View>
          </View>
          
          <View style={[styles.taskBadge, { backgroundColor: getStatusColor(task.status) + '20' }]}>
            <Text style={[styles.taskBadgeText, { color: getStatusColor(task.status) }]}>
              {getStatusText(task.status)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      


      <ScreenHeader 
  title="Tâches & Planning"
  subtitle="Gestion des Tâches"
  backgroundColor="#3B82F6"
  onBackPress={() => navigation.goBack()}
  rightButtons={[
    { label: "+ Nouvelle", onPress: () => handleAddTask() }
  ]}
/>

      {/* Tabs Navigation */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, currentView === 'today' && styles.tabActive]}
          onPress={() => setCurrentView('today')}
        >
          <Text style={[styles.tabText, currentView === 'today' && styles.tabTextActive]}>
            📋 Aujourd'hui
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, currentView === 'calendar' && styles.tabActive]}
          onPress={() => setCurrentView('calendar')}
        >
          <Text style={[styles.tabText, currentView === 'calendar' && styles.tabTextActive]}>
            📅 Calendrier
          </Text>
        </TouchableOpacity>
      </View>

      {/* VUE AUJOURD'HUI */}
      {currentView === 'today' && (
        <FlatList
          data={todayTasks}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TaskCard task={item} />}
          contentContainerStyle={styles.todayListContent}
          ListHeaderComponent={
            <View style={styles.todayHeader}>
              <Text style={styles.todayTitle}>
                📋 Tâches d'aujourd'hui
              </Text>
              <Text style={styles.todayDate}>
                {new Date().toLocaleDateString('fr-FR', { 
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
                })}
              </Text>
              <Text style={styles.tasksCount}>
                {todayTasks.length} tâche{todayTasks.length > 1 ? 's' : ''}
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.noTasksContainer}>
              <Text style={styles.noTasksIcon}>✅</Text>
              <Text style={styles.noTasksText}>Aucune tâche pour aujourd'hui</Text>
              <TouchableOpacity 
                style={styles.addFirstTaskButton}
                onPress={() => navigation.navigate('NewTask', { 
                  selectedDate: new Date().toISOString().split('T')[0] 
                })}
              >
                <Text style={styles.addFirstTaskText}>➕ Ajouter une tâche</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* VUE CALENDRIER */}
      {currentView === 'calendar' && (
        <ScrollView 
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Navigation du calendrier */}
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
              <Text style={styles.navButtonText}>←</Text>
            </TouchableOpacity>
            
            <View style={styles.monthYearContainer}>
              <Text style={styles.monthYearText}>
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </Text>
              <TouchableOpacity onPress={goToToday} style={styles.todayButton}>
                <Text style={styles.todayButtonText}>Aujourd'hui</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
              <Text style={styles.navButtonText}>→</Text>
            </TouchableOpacity>
          </View>

          {/* Grille du calendrier */}
          <View style={styles.calendarContainer}>
            {/* En-têtes des jours */}
            <View style={styles.weekDaysRow}>
              {dayNames.map((day, index) => (
                <View key={index} style={styles.weekDayCell}>
                  <Text style={styles.weekDayText}>{day}</Text>
                </View>
              ))}
            </View>

            {/* Jours du mois */}
            <View style={styles.daysGrid}>
              {days.map((dayInfo) => {
                if (dayInfo.isEmpty) {
                  return <View key={dayInfo.key} style={styles.dayCell} />;
                }

                const isSelected = selectedDate.toDateString() === dayInfo.date.toDateString();
                const isToday = new Date().toDateString() === dayInfo.date.toDateString();
                const hasTasks = hasTasksOnDate(dayInfo.date);
                const tasksCount = getTasksForDate(dayInfo.date).length;

                return (
                  <TouchableOpacity
                    key={dayInfo.key}
                    style={[
                      styles.dayCell,
                      isToday && styles.todayCell,
                      isSelected && styles.selectedCell
                    ]}
                    onPress={() => handleDayPress(dayInfo)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.dayText,
                      isToday && styles.todayText,
                      isSelected && styles.selectedText
                    ]}>
                      {dayInfo.day}
                    </Text>
                    {hasTasks && (
                      <View style={styles.taskIndicator}>
                        <Text style={styles.taskIndicatorText}>{tasksCount}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Liste des tâches du jour sélectionné */}
          <View style={styles.tasksList}>
            <Text style={styles.tasksListTitle}>
              Tâches du {selectedDate.toLocaleDateString('fr-FR', { 
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
              })}
            </Text>
            

            {selectedDateTasks.length === 0 ? (
              <View style={styles.noTasksContainer}>
                <Text style={styles.noTasksIcon}>📅</Text>
                <Text style={styles.noTasksText}>Aucune tâche pour ce jour</Text>
                <TouchableOpacity 
                  style={styles.addFirstTaskButton}
                  onPress={handleAddTask}
                >
                  <Text style={styles.addFirstTaskText}>➕ Ajouter une tâche</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={selectedDateTasks}
                scrollEnabled={false}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <TaskCard task={item} />}
              />

            )}
          </View>
        </ScrollView>
      )}

     
      {/* Modal détails de la tâche */}
      <Modal
        visible={showTaskModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTaskModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowTaskModal(false)}
        >
          <View style={styles.modalContent}>
            {selectedTask && (
              <>
              
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Détails de la tâche</Text>
                  <TouchableOpacity 
                    onPress={() => setShowTaskModal(false)}
                    style={styles.closeButton}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Tâche</Text>
                    <Text style={styles.modalValue}>{selectedTask.taskType}</Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Employé</Text>
                    <Text style={styles.modalValue}>
                      {getStaffById(selectedTask.staffId)?.name || 'Non assigné'}
                    </Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Lieu</Text>
                    <Text style={styles.modalValue}>
                      {getLocationNameById(selectedTask.espaceId, selectedTask.sousEspaceId)}
                    </Text>
                  </View>



                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Date</Text>
                    <Text style={styles.modalValue}>
                      {new Date(selectedTask.date || selectedDate).toLocaleDateString('fr-FR', {
                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
   
              
                        
                        
                   })}
                    </Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Heure</Text>
                    <Text style={styles.modalValue}>
                      {selectedTask.startTime || '00:00'}
                      {selectedTask.endTime && ` - ${selectedTask.endTime}`}
                    </Text>
                  </View>


                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Statut</Text>
                    <View style={styles.statusSelector}>
                      {['pending', 'in-progress', 'completed'].map(status => (
                        <TouchableOpacity
                          key={status}
                          style={[
                            styles.statusOption,
                            selectedTask.status === status && { 
                              backgroundColor: getStatusColor(status),
                              borderColor: getStatusColor(status)
                            }
                          ]}
                         



                         onPress={() => handleStatusChange(selectedTask.id, status)}   >



                          <Text style={[
                            styles.statusOptionText,
                            selectedTask.status === status && styles.statusOptionTextActive
                          ]}>
                            {getStatusText(status)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>



                  {selectedTask.notes && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalLabel}>Notes</Text>
                      <Text style={styles.modalValue}>{selectedTask.notes}</Text>
                    </View>
                  )}



                  {selectedTask.isRecurring && (
                    <View style={[styles.modalSection, styles.recurringSection]}>
                      <Text style={styles.recurringIcon}>🔄</Text>
                      <Text style={styles.recurringText}>Tâche récurrente</Text>
                    </View>
                  )}
                </ScrollView>
              </>



            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
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
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },

  backButton: {
    marginBottom: 10,
  },  

  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  // Styles pour les onglets
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
  },       

  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 4,
  },

  tabActive: {
    backgroundColor: '#3B82F6',
  },

  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },

  tabTextActive: {
    color: '#FFFFFF',
  },

  // Styles pour la vue Aujourd'hui
  todayListContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },

  todayHeader: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 8,
  },

  todayTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },

  todayDate: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8,
  },

  tasksCount: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },

  scrollView: {
    flex: 1,
  },

  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  navButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },

  navButtonText: {
    fontSize: 24,
    color: '#3B82F6',
    fontWeight: 'bold',
  },

  monthYearContainer: {
    alignItems: 'center',
  },

  monthYearText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },

  todayButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
  },

  todayButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  calendarContainer: {
    backgroundColor: '#FFFFFF',
    padding: 10,
  },


  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },

  weekDayCell: {
    width: (width - 20) / 7,
    alignItems: 'center',
    paddingVertical: 8,
  },

  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },

  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  dayCell: {
    width: (width - 20) / 7,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
  },

  todayCell: {
    backgroundColor: '#DBEAFE',
  },

  selectedCell: {
    backgroundColor: '#3B82F6',
  },

  dayText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },

  todayText: {
    color: '#3B82F6',
    fontWeight: 'bold',
  },

  selectedText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  taskIndicator: {
    position: 'absolute',
    bottom: 4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },

  taskIndicatorText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },

  tasksList: {
    padding: 20,
  },

  tasksListTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },

  noTasksContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },

  noTasksIcon: {
    fontSize: 48,
    marginBottom: 12,
  },

  noTasksText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },

  addFirstTaskButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  addFirstTaskText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  taskStatus: {
    width: 4,
  },

  taskContent: {
    flex: 1,
    padding: 16,
  },

  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },

  taskTime: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },

  taskDetails: {
    marginBottom: 12,
  },

  taskDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },

  taskDetailIcon: {
    fontSize: 14,
    marginRight: 8,
  },

  taskDetailText: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },

  taskBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },

  taskBadgeText: {
    fontSize: 12,   
    fontWeight: '600',
  },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  fabIcon: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 8,
  },

  fabText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  }
  ,

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },

  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
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
    fontWeight: 'bold',
    color: '#1F2937',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#6B7280',
  },
  modalBody: {
    padding: 20,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  modalValue: {
    fontSize: 16,
    color: '#1F2937',
  },
  statusSelector: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  statusOption: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  statusOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  statusOptionTextActive: {
    color: '#FFFFFF',
  },
  recurringSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 12,
  },
  recurringIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  recurringText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
});

export default TaskCalendar;