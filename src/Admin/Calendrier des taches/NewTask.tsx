// NewTask.tsx
// @ts-nocheck

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
  Modal,
  Dimensions,
  Platform
} from 'react-native';
import { collection, addDoc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';

const { width } = Dimensions.get('window');

const NewTask = ({ route, navigation }: any) => {
  const { selectedDate } = route.params || {};
  
  const [formData, setFormData] = useState({
    taskType: '',
    staffId: '',
    espaceId: '',
    sousEspaceId: '',
    startTime: '',
    isRecurring: false,
    recurringType: 'daily',
    recurringDays: [],
    recurringDayOfMonth: 1,
    recurringMonthOfYear: 1,
    recurringStartDate: '',
    recurringEndDate: '',
    notes: '',
    date: selectedDate || new Date().toISOString().split('T')[0],
    status: 'pending'
  });

  const [staff, setStaff] = useState([]);
  const [espaces, setEspaces] = useState([]);
  const [sousEspaces, setSousEspaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);
  
  // États pour le calendrier
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [currentDateField, setCurrentDateField] = useState<'start' | 'end'>('start');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);

  // Récupérer les données
  useEffect(() => {
    const qStaff = query(collection(db, 'staff'), orderBy('name'));
    const unsubStaff = onSnapshot(qStaff, (snapshot) => {
      setStaff(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qEspaces = query(collection(db, 'espaces'), orderBy('nom'));
    const unsubEspaces = onSnapshot(qEspaces, (snapshot) => {
      setEspaces(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qSousEspaces = query(collection(db, 'sous_espaces'), orderBy('numero'));
    const unsubSousEspaces = onSnapshot(qSousEspaces, (snapshot) => {
      setSousEspaces(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubStaff();
      unsubEspaces();
      unsubSousEspaces();
    };
  }, []);

  const handleSubmit = async () => {
    if (!formData.taskType || !formData.staffId) {
      Alert.alert('Erreur', 'Veuillez sélectionner un employé et un type de tâche');
      return;
    }

    // Validation des dates si récurrence entre deux dates
    if (formData.isRecurring && formData.recurringType === 'between_dates') {
      if (!formData.recurringStartDate || !formData.recurringEndDate) {
        Alert.alert('Erreur', 'Veuillez sélectionner une date de début et une date de fin');
        return;
      }
      
      const startDate = new Date(formData.recurringStartDate);
      const endDate = new Date(formData.recurringEndDate);
      
      if (endDate < startDate) {
        Alert.alert('Erreur', 'La date de fin doit être après la date de début');
        return;
      }
    }

    setLoading(true);
    try {
      const taskData = {
        ...formData,
        createdAt: new Date(),
        recurringDayOfMonth: parseInt(formData.recurringDayOfMonth.toString()) || 1,
        recurringMonthOfYear: parseInt(formData.recurringMonthOfYear.toString()) || 1
      };

      console.log('Envoi des données à Firebase:', taskData);
      const docRef = await addDoc(collection(db, 'tasks'), taskData);
      console.log('Tâche créée avec ID:', docRef.id);

      Alert.alert('Succès', 'Tâche créée avec succès', [{ 
        text: 'OK', 
        onPress: () => {
          setFormData({
            taskType: '',
            staffId: '',
            espaceId: '',
            sousEspaceId: '',
            startTime: '',
            isRecurring: false,
            recurringType: 'daily',
            recurringDays: [],
            recurringDayOfMonth: 1,
            recurringMonthOfYear: 1,
            recurringStartDate: '',
            recurringEndDate: '',
            notes: '',
            date: selectedDate || new Date().toISOString().split('T')[0],
            status: 'pending'
          });
          navigation.goBack();
        }
      }]);
    } catch (error: any) {
      console.error('Erreur détaillée création tâche:', error);
      Alert.alert('Erreur', `Erreur lors de la création de la tâche: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getSelectedStaffName = useCallback(() => {
    if (!formData.staffId) return '';
    const selected = staff.find((s: any) => s.id === formData.staffId);
    return selected ? selected.name : '';
  }, [formData.staffId, staff]);

  const toggleRecurringDay = useCallback((day: string) => {
    const days = formData.recurringDays || [];
    if (days.includes(day)) {
      setFormData(prev => ({...prev, recurringDays: days.filter(d => d !== day)}));
    } else {
      setFormData(prev => ({...prev, recurringDays: [...days, day]}));
    }
  }, [formData.recurringDays]);

  // Fonctions pour le calendrier - AMÉLIORÉES
  const formatDisplayDate = useCallback((dateString: string) => {
    if (!dateString) return 'Sélectionner une date';
    const date = new Date(dateString + 'T00:00:00'); // Évite les problèmes de timezone
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
  ,
  
  []);



  const openCalendar = useCallback((field: 'start' | 'end') => {
    setCurrentDateField(field);
    
    // Pré-sélectionner la date existante
    const existingDate = field === 'start' ? formData.recurringStartDate : formData.recurringEndDate;
    if (existingDate) {
      const dateObj = new Date(existingDate + 'T00:00:00');
      setSelectedCalendarDate(dateObj);
      setCurrentMonth(new Date(dateObj.getFullYear(), dateObj.getMonth(), 1));
    } else {
      // Si on sélectionne la date de fin et qu'il y a une date de début, partir de là
      if (field === 'end' && formData.recurringStartDate) {
        const startDate = new Date(formData.recurringStartDate + 'T00:00:00');
        setSelectedCalendarDate(startDate);
        setCurrentMonth(new Date(startDate.getFullYear(), startDate.getMonth(), 1));
      } else {
        const today = new Date();
        setSelectedCalendarDate(today);
        setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
      }
    }
    
    setShowCalendarModal(true);
  }, [formData.recurringStartDate, formData.recurringEndDate]);

  const confirmDateSelection = useCallback(() => {
    if (selectedCalendarDate) {
      const formattedDate = selectedCalendarDate.toISOString().split('T')[0];
      
      if (currentDateField === 'start') {
        // Si on définit une date de début qui est après la date de fin, réinitialiser la date de fin
        if (formData.recurringEndDate && formattedDate > formData.recurringEndDate) {
          setFormData(prev => ({
            ...prev, 
            recurringStartDate: formattedDate,
            recurringEndDate: ''
          }));
          Alert.alert(
            'Information',
            'La date de fin a été réinitialisée car la nouvelle date de début est postérieure.',
            [{ text: 'OK' }]
          );
        } else {
          setFormData(prev => ({...prev, recurringStartDate: formattedDate}));
        }
      } else {
        // Vérifier que la date de fin est après la date de début
        if (formData.recurringStartDate && formattedDate < formData.recurringStartDate) {
          Alert.alert(
            'Erreur',
            'La date de fin doit être postérieure à la date de début.',
            [{ text: 'OK' }]
          );
          return;
        }
        setFormData(prev => ({...prev, recurringEndDate: formattedDate}));
      }
    }
    
    setShowCalendarModal(false);
  }, [selectedCalendarDate, currentDateField, formData.recurringStartDate, formData.recurringEndDate]);

  const selectToday = useCallback(() => {
    const today = new Date();
    setSelectedCalendarDate(today);
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  }, []);

  // Génération du calendrier - OPTIMISÉE
  const getDaysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
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
  }, [currentMonth]);

  const isSameDay = useCallback((date1: Date, date2: Date) => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }, []);

  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(newMonth.getMonth() - 1);
      } else {
        newMonth.setMonth(newMonth.getMonth() + 1);
      }
      return newMonth;
    });
  }, []);

  const selectDate = useCallback((date: Date) => {
    setSelectedCalendarDate(date);
  }, []);

  // Vérifier si une date doit être désactivée
  const isDateDisabled = useCallback((date: Date) => {
    if (currentDateField === 'end' && formData.recurringStartDate) {
      const startDate = new Date(formData.recurringStartDate + 'T00:00:00');
      return date < startDate;
    }
    return false;
  }, [currentDateField, formData.recurringStartDate]);

  // Composant pour la liste des employés - SOLUTION au problème VirtualizedList
  const StaffDropdown = () => {
    if (!showStaffDropdown) return null;

    return (
      <View style={styles.dropdownList}>
        <ScrollView 
          style={styles.dropdownScroll}
          nestedScrollEnabled={true}
          keyboardShouldPersistTaps="handled"
        >
          {staff.length > 0 ? (
            staff.map((item: any) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.dropdownItem,
                  formData.staffId === item.id && styles.dropdownItemSelected
                ]}
                onPress={() => {
                  setFormData(prev => ({ ...prev, staffId: item.id }));
                  setShowStaffDropdown(false);
                }}
              >
                <View style={styles.staffItem}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {item.name.split(' ').map((n: string) => n[0]).join('')}
                    </Text>
                  </View>
                  <View style={styles.staffInfo}>
                    <Text style={styles.staffName}>{item.name}</Text>
                    <Text style={styles.staffPosition}>
                      {item.position || 'Aucun poste'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyDropdown}>
              <Text style={styles.emptyText}>Aucun employé trouvé</Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  // Composant Calendrier - AMÉLIORÉ
  const CalendarModal = () => {
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

    return (
      <Modal
        visible={showCalendarModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCalendarModal(false)}
      >
        <TouchableOpacity 
          style={styles.calendarOverlay}
          activeOpacity={1}
          onPress={() => setShowCalendarModal(false)}
        >
          <TouchableOpacity 
            style={styles.calendarContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* En-tête du calendrier */}
            <View style={styles.calendarHeader}>
              <View style={styles.calendarTitleContainer}>
                <Text style={styles.calendarTitle}>
                  {currentDateField === 'start' ? 'Date de début' : 'Date de fin'}
                </Text>
                {currentDateField === 'end' && formData.recurringStartDate && (
                  <Text style={styles.calendarSubtitle}>
                    (après le {formatDisplayDate(formData.recurringStartDate)})
                  </Text>
                )}
              </View>
              
              <View style={styles.calendarNavigation}>
                <TouchableOpacity 
                  style={styles.navButton}
                  onPress={() => navigateMonth('prev')}
                >
                  <Text style={styles.navButtonText}>←</Text>
                </TouchableOpacity>
                
                <Text style={styles.monthYearText}>
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </Text>
                
                <TouchableOpacity 
                  style={styles.navButton}
                  onPress={() => navigateMonth('next')}
                >
                  <Text style={styles.navButtonText}>→</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Jours de la semaine */}
            <View style={styles.weekDaysRow}>
              {dayNames.map((day, index) => (
                <View key={index} style={styles.weekDayCell}>
                  <Text style={styles.weekDayText}>{day}</Text>
                </View>
              ))}
            </View>

            {/* Grille des jours */}
            <ScrollView style={styles.calendarGridScroll}>
              <View style={styles.calendarGrid}>
                {getDaysInMonth.map((dayInfo) => {
                  if (dayInfo.isEmpty) {
                    return <View key={dayInfo.key} style={styles.calendarDayEmpty} />;
                  }

                  const isSelected = selectedCalendarDate && isSameDay(dayInfo.date, selectedCalendarDate);
                  const isToday = isSameDay(dayInfo.date, new Date());
                  const isDisabled = isDateDisabled(dayInfo.date);

                  return (
                    <TouchableOpacity
                      key={dayInfo.key}
                      style={[
                        styles.calendarDay,
                        isToday && styles.calendarDayToday,
                        isSelected && styles.calendarDaySelected,
                        isDisabled && styles.calendarDayDisabled
                      ]}
                      onPress={() => !isDisabled && selectDate(dayInfo.date)}
                      disabled={isDisabled}
                    >
                      <Text style={[
                        styles.calendarDayText,
                        isToday && styles.calendarDayTextToday,
                        isSelected && styles.calendarDayTextSelected,
                        isDisabled && styles.calendarDayTextDisabled
                      ]}>
                        {dayInfo.day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Date sélectionnée */}
            <View style={styles.selectedDateContainer}>
              <Text style={styles.selectedDateLabel}>Date sélectionnée:</Text>
              <Text style={styles.selectedDateText}>
                {selectedCalendarDate ? formatDisplayDate(selectedCalendarDate.toISOString().split('T')[0]) : 'Aucune date sélectionnée'}
              </Text>
            </View>

            {/* Boutons d'action */}
            <View style={styles.calendarActions}>
              <TouchableOpacity 
                style={[styles.calendarButton, styles.todayButton]}
                onPress={selectToday}
              >
                <Text style={styles.todayButtonText}>Aujourd'hui</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.calendarButton, styles.cancelButton]}
                onPress={() => setShowCalendarModal(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.calendarButton, 
                  styles.confirmButton,
                  !selectedCalendarDate && styles.confirmButtonDisabled
                ]}
                onPress={confirmDateSelection}
                disabled={!selectedCalendarDate}
              >
                <Text style={[
                  styles.confirmButtonText,
                  !selectedCalendarDate && styles.confirmButtonTextDisabled
                ]}>
                  Confirmer
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  };

  // Filtrer les sous-espaces
  const filteredSousEspaces = useMemo(() => {
    return sousEspaces.filter((se: any) => se.espaceParentId === formData.espaceId);
  }, [sousEspaces, formData.espaceId]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Nouvelle Tâche</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Sélection employé */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Employé *</Text>
          <TouchableOpacity 
            style={styles.dropdownButton}
            onPress={() => setShowStaffDropdown(!showStaffDropdown)}
          >
            <Text style={formData.staffId ? styles.dropdownText : styles.dropdownPlaceholder}>
              {formData.staffId ? getSelectedStaffName() : 'Sélectionner un employé'}
            </Text>
            <Text style={styles.dropdownArrow}>
              {showStaffDropdown ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>
          <StaffDropdown />
        </View>

        {/* Type de tâche */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Type de tâche *</Text>
          <View style={styles.selectContainer}>
            {['Nettoyage', 'Maintenance', 'Blanchisserie', 'Réception', 'Cuisine', 'Sécurité', 'Technique', 'Autre'].map(type => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeOption,
                  formData.taskType === type && styles.typeOptionSelected
                ]}
                onPress={() => setFormData(prev => ({ ...prev, taskType: type }))}
              >
                <Text style={[
                  styles.typeOptionText,
                  formData.taskType === type && styles.typeOptionTextSelected
                ]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Espace */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Espace (optionnel)</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalScroll}
            contentContainerStyle={styles.horizontalContent}
          >
            <TouchableOpacity
              style={[
                styles.horizontalOption,
                !formData.espaceId && styles.horizontalOptionSelected
              ]}
              onPress={() => setFormData(prev => ({ 
                ...prev, 
                espaceId: '',
                sousEspaceId: '' 
              }))}
            >
              <Text style={[
                styles.horizontalOptionText,
                !formData.espaceId && styles.horizontalOptionTextSelected
              ]}>
                Aucun espace
              </Text>
            </TouchableOpacity>
            {espaces.map((espace: any) => (
              <TouchableOpacity
                key={espace.id}
                style={[
                  styles.horizontalOption,
                  formData.espaceId === espace.id && styles.horizontalOptionSelected
                ]}
                onPress={() => setFormData(prev => ({ 
                  ...prev, 
                  espaceId: espace.id,
                  sousEspaceId: '' 
                }))}
              >
                <Text style={[
                  styles.horizontalOptionText,
                  formData.espaceId === espace.id && styles.horizontalOptionTextSelected
                ]}>
                  {espace.nom}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Sous-espace conditionnel */}
        {formData.espaceId && filteredSousEspaces.length > 0 && (
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Sous-espace (optionnel)</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScroll}
              contentContainerStyle={styles.horizontalContent}
            >
              <TouchableOpacity
                style={[
                  styles.horizontalOption,
                  !formData.sousEspaceId && styles.horizontalOptionSelected
                ]}
                onPress={() => setFormData(prev => ({ ...prev, sousEspaceId: '' }))}
              >
                <Text style={[
                  styles.horizontalOptionText,
                  !formData.sousEspaceId && styles.horizontalOptionTextSelected
                ]}>
                  Aucun sous-espace
                </Text>
              </TouchableOpacity>
              {filteredSousEspaces.map((sousEspace: any) => (
                <TouchableOpacity
                  key={sousEspace.id}
                  style={[
                    styles.horizontalOption,
                    formData.sousEspaceId === sousEspace.id && styles.horizontalOptionSelected
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, sousEspaceId: sousEspace.id }))}
                >
                  <Text style={[
                    styles.horizontalOptionText,
                    formData.sousEspaceId === sousEspace.id && styles.horizontalOptionTextSelected
                  ]}>
                    {sousEspace.nom || `Sous-espace ${sousEspace.numero}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Heure */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Heure de début</Text>
          <TextInput
            style={styles.input}
            value={formData.startTime}
            onChangeText={(text) => setFormData(prev => ({ ...prev, startTime: text }))}
            placeholder="HH:MM (ex: 09:00)"
            placeholderTextColor="#9CA3AF"
            keyboardType="numbers-and-punctuation"
          />
        </View>

        {/* Tâche récurrente */}
        <TouchableOpacity 
          style={styles.checkboxContainer}
          onPress={() => setFormData(prev => ({ ...prev, isRecurring: !prev.isRecurring }))}
        >
          <View style={[
            styles.checkbox,
            formData.isRecurring && styles.checkboxChecked
          ]}>
            {formData.isRecurring && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>Tâche récurrente</Text>
        </TouchableOpacity>

        {/* Options de récurrence */}
        {formData.isRecurring && (
          <View style={styles.recurringSection}>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Type de récurrence</Text>
              <View style={styles.recurringOptions}>
                {[
                  { value: 'daily', label: '📅 Chaque jour' },
                  { value: 'weekly', label: '📆 Chaque semaine (jours personnalisés)' },
                  { value: 'monthly', label: '🗓️ Chaque mois (jour spécifique)' },
                  { value: 'first_day_month', label: '📍 Premier jour du mois' },
                  { value: 'last_day_month', label: '📍 Dernier jour du mois' },
                  { value: 'yearly', label: '🎂 Une fois par an' },
                  { value: 'between_dates', label: '📊 Entre deux dates' }
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.recurringOption,
                      formData.recurringType === option.value && styles.recurringOptionSelected
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, recurringType: option.value }))}
                  >
                    <Text style={[
                      styles.recurringOptionText,
                      formData.recurringType === option.value && styles.recurringOptionTextSelected
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Récurrence hebdomadaire */}
            {formData.recurringType === 'weekly' && (
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Jours de la semaine</Text>
                <View style={styles.daysGrid}>
                  {['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'].map(day => (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.dayOption,
                        formData.recurringDays.includes(day) && styles.dayOptionSelected
                      ]}
                      onPress={() => toggleRecurringDay(day)}
                    >
                      <Text style={[
                        styles.dayOptionText,
                        formData.recurringDays.includes(day) && styles.dayOptionTextSelected
                      ]}>
                        {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Récurrence mensuelle */}
            {formData.recurringType === 'monthly' && (
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Jour du mois (1-31)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.recurringDayOfMonth?.toString()}
                  onChangeText={(text) => setFormData(prev => ({...prev, recurringDayOfMonth: parseInt(text) || 1}))}
                  placeholder="Ex: 15 pour le 15 de chaque mois"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
              </View>
            )}

            {/* Récurrence annuelle */}
            {formData.recurringType === 'yearly' && (
              <View style={styles.fieldContainer}>
                <View style={styles.row}>
                  <View style={styles.halfInput}>
                    <Text style={styles.label}>Jour</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.recurringDayOfMonth?.toString()}
                      onChangeText={(text) => setFormData(prev => ({...prev, recurringDayOfMonth: parseInt(text) || 1}))}
                      placeholder="1-31"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.halfInput}>
                    <Text style={styles.label}>Mois</Text>
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      style={styles.monthsScroll}
                      contentContainerStyle={styles.monthsContent}
                    >
                      {[
                        { value: 1, label: 'Jan' },
                        { value: 2, label: 'Fév' },
                        { value: 3, label: 'Mar' },
                        { value: 4, label: 'Avr' },
                        { value: 5, label: 'Mai' },
                        { value: 6, label: 'Jun' },
                        { value: 7, label: 'Jul' },
                        { value: 8, label: 'Aoû' },
                        { value: 9, label: 'Sep' },
                        { value: 10, label: 'Oct' },
                        { value: 11, label: 'Nov' },
                        { value: 12, label: 'Déc' }
                      ].map((month) => (
                        <TouchableOpacity
                          key={month.value}
                          style={[
                            styles.monthOption,
                            formData.recurringMonthOfYear === month.value && styles.monthOptionSelected
                          ]}
                          onPress={() => setFormData(prev => ({...prev, recurringMonthOfYear: month.value}))}
                        >
                          <Text style={[
                            styles.monthOptionText,
                            formData.recurringMonthOfYear === month.value && styles.monthOptionTextSelected
                          ]}>
                            {month.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              </View>
            )}

            {/* Entre deux dates */}
            {formData.recurringType === 'between_dates' && (
              <View style={styles.fieldContainer}>
                <Text style={styles.sectionTitle}>Période de récurrence</Text>
                
                <View style={styles.dateField}>
                  <Text style={styles.label}>Date de début *</Text>
                  <TouchableOpacity 
                    style={styles.datePickerButton}
                    onPress={() => openCalendar('start')}
                  >
                    <Text style={[
                      styles.datePickerText,
                      !formData.recurringStartDate && styles.datePickerPlaceholder
                    ]}>
                      {formatDisplayDate(formData.recurringStartDate)}
                    </Text>
                    <Text style={styles.calendarIcon}>📅</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.dateField}>
                  <Text style={styles.label}>Date de fin *</Text>
                  <TouchableOpacity 
                    style={[
                      styles.datePickerButton,
                      !formData.recurringStartDate && styles.datePickerButtonDisabled
                    ]}
                    onPress={() => openCalendar('end')}
                    disabled={!formData.recurringStartDate}
                  >
                    <Text style={[
                      styles.datePickerText,
                      !formData.recurringEndDate && styles.datePickerPlaceholder,
                      !formData.recurringStartDate && styles.datePickerTextDisabled
                    ]}>
                      {!formData.recurringStartDate 
                        ? 'Sélectionner d\'abord une date de début' 
                        : formatDisplayDate(formData.recurringEndDate)}
                    </Text>
                    <Text style={styles.calendarIcon}>📅</Text>
                  </TouchableOpacity>
                </View>

                {formData.recurringStartDate && formData.recurringEndDate && (
                  <View style={styles.datePreview}>
                    <Text style={styles.datePreviewLabel}>📊 Période sélectionnée</Text>
                    <Text style={styles.datePreviewText}>
                      Du {formatDisplayDate(formData.recurringStartDate)}
                    </Text>
                    <Text style={styles.datePreviewText}>
                      Au {formatDisplayDate(formData.recurringEndDate)}
                    </Text>
                    {(() => {
                      const start = new Date(formData.recurringStartDate);
                      const end = new Date(formData.recurringEndDate);
                      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                      return (
                        <Text style={styles.datePreviewDays}>
                          ({days} jour{days > 1 ? 's' : ''})
                        </Text>
                      );
                    })()}
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Notes */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Notes (optionnel)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            multiline
            numberOfLines={4}
            value={formData.notes}
            onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
            placeholder="Détails supplémentaires..."
            placeholderTextColor="#9CA3AF"
            textAlignVertical="top"
          />
        </View>

        {/* Bouton de soumission */}
        <TouchableOpacity 
          style={[
            styles.submitButton,
            (!formData.taskType || !formData.staffId) && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={!formData.taskType || !formData.staffId || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Créer la tâche</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <CalendarModal />
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
  backButton: {
    fontSize: 16,
    color: '#3B82F6',
    marginRight: 16,
    fontWeight: '500',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  fieldContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
    position: 'relative',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  // Styles pour la liste déroulante employé
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  dropdownText: {
    fontSize: 16,
    color: '#1F2937',
  },
  dropdownPlaceholder: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#6B7280',
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginTop: 4,
  },
  dropdownScroll: {
    flex: 1,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  staffItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  staffPosition: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyDropdown: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
  },
  // Styles pour les sélections horizontales
  horizontalScroll: {
    marginHorizontal: -16,
  },
  horizontalContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  horizontalOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginRight: 8,
  },
  horizontalOptionSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  horizontalOptionText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  horizontalOptionTextSelected: {
    color: '#FFFFFF',
  },
  // Styles pour les types de tâches
  selectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  typeOptionSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  typeOptionText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  typeOptionTextSelected: {
    color: '#FFFFFF',
  },
  // Autres styles
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#1F2937',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#1F2937',
  },
  // Styles pour la récurrence
  recurringSection: {
    backgroundColor: '#F8FAFC',
  },
  recurringOptions: {
    gap: 8,
  },
  recurringOption: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  recurringOptionSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  recurringOptionText: {
    fontSize: 14,
    color: '#6B7280',
  },
  recurringOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  // Jours de la semaine
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayOption: {
    flex: 1,
    minWidth: '30%',
    padding: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  dayOptionSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: '#3B82F6',
  },
  dayOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
  },
  dayOptionTextSelected: {
    color: '#3B82F6',
  },
  // Layout row
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  // Mois
  monthsScroll: {
    marginHorizontal: -16,
  },
  monthsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  monthOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginRight: 8,
  },
  monthOptionSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  monthOptionText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  monthOptionTextSelected: {
    color: '#FFFFFF',
  },
  // Styles pour les sélecteurs de date - AMÉLIORÉS
  dateField: {
    marginBottom: 16,
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  datePickerButtonDisabled: {
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
    opacity: 0.6,
  },
  datePickerText: {
    fontSize: 16,
    color: '#1F2937',
    flex: 1,
    fontWeight: '500',
  },
  datePickerPlaceholder: {
    color: '#9CA3AF',
    fontWeight: '400',
  },
  datePickerTextDisabled: {
    color: '#9CA3AF',
  },
  calendarIcon: {
    fontSize: 24,
    marginLeft: 12,
  },
  datePreview: {
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
    marginTop: 8,
  },
  datePreviewLabel: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  datePreviewText: {
    fontSize: 14,
    color: '#1E40AF',
    fontWeight: '500',
    marginBottom: 2,
  },
  datePreviewDays: {
    fontSize: 12,
    color: '#60A5FA',
    fontWeight: '400',
    marginTop: 4,
    fontStyle: 'italic',
  },
  calendarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  calendarContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  calendarHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  calendarTitleContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  calendarTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  calendarSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  calendarNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  navButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  monthYearText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  weekDayCell: {
    width: (width - 80) / 7,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  calendarGridScroll: {
    maxHeight: 280,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  calendarDayEmpty: {
    width: (width - 80) / 7,
    height: 44,
  },
  calendarDay: {
    width: (width - 80) / 7,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 2,
  },
  calendarDayToday: {
    backgroundColor: '#DBEAFE',
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  calendarDaySelected: {
    backgroundColor: '#3B82F6',
  },
  calendarDayDisabled: {
    backgroundColor: '#F3F4F6',
    opacity: 0.4,
  },
  calendarDayText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  calendarDayTextToday: {
    color: '#3B82F6',
    fontWeight: 'bold',
  },
  calendarDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  calendarDayTextDisabled: {
    color: '#9CA3AF',
  }
  ,

  selectedDateContainer: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedDateLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectedDateText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  calendarActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  calendarButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  todayButton: {
    backgroundColor: '#10B981',
  },
  cancelButton: {
    backgroundColor: '#6B7280',
  },
  confirmButton: {
    backgroundColor: '#3B82F6',
  },
  confirmButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  todayButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  confirmButtonTextDisabled: {
    opacity: 0.7,
  },
  // Bouton de soumission
  submitButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    margin: 16,
    marginTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NewTask;