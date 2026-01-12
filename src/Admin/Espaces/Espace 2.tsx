// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  Modal, Alert, RefreshControl, Platform, Animated, ActivityIndicator
} from 'react-native';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, query, where, getDocs, writeBatch
} from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EspaceParent, SousEspace, CategorieEspace } from '../../Types';

const GestionEspacesHierarchie = ({ navigation }: any) => {
  // États
  const [espaces, setEspaces] = useState<EspaceParent[]>([]);
  const [sousEspaces, setSousEspaces] = useState<SousEspace[]>([]);
  const [categories, setCategories] = useState<CategorieEspace[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategorie, setFilterCategorie] = useState('all');
  const [expandedEspaces, setExpandedEspaces] = useState<Record<string, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Modales
  const [showEspaceModal, setShowEspaceModal] = useState(false);
  const [showSousEspaceModal, setShowSousEspaceModal] = useState(false);
  const [showCategorieModal, setShowCategorieModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedEspace, setSelectedEspace] = useState<EspaceParent | null>(null);
  const [selectedSousEspace, setSelectedSousEspace] = useState<SousEspace | null>(null);
  const [qrCodeData, setQrCodeData] = useState({ valeur: '', titre: '' });
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');

  const [espaceForm, setEspaceForm] = useState({
    nom: '', type: 'etage', numero: '', categorieId: '', description: ''
  });

  const [sousEspaceForm, setSousEspaceForm] = useState({
    nom: '', numero: '', type: 'chambre', espaceParentId: '',
    superficie: '', capacite: '', statut: 'libre', equipements: []
  });

  const [categorieForm, setCategorieForm] = useState({
    nom: '', type: 'public', couleur: '#3B82F6', icone: '🏢'
  });

  const [assignForm, setAssignForm] = useState({
    employeId: '', typeTache: 'nettoyage',
    dateDebut: new Date().toISOString().split('T')[0], notes: ''
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true })
    ]).start();
  }, []);

  // Données statiques
  const categoriesDefaut = [
    { id: 'public_client', nom: 'Public - Client', type: 'public', couleur: '#3B82F6', icone: '👥' },
    { id: 'public_commun', nom: 'Public - Commun', type: 'public', couleur: '#10B981', icone: '🚪' },
    { id: 'professionnel_technique', nom: 'Professionnel - Technique', type: 'professionnel', couleur: '#F59E0B', icone: '🏢' },
    { id: 'professionnel_personnel', nom: 'Professionnel - Personnel', type: 'professionnel', couleur: '#8B5CF6', icone: '🚿' }
  ];

  const typesEspace = [
    { value: 'etage', label: 'Étage', icon: '🏢' },
    { value: 'batiment', label: 'Bâtiment', icon: '🏗️' },
    { value: 'zone', label: 'Zone', icon: '📍' },
    { value: 'aile', label: 'Aile', icon: '➡️' }
  ];

  const typesSousEspace = [
    { value: 'chambre', label: 'Chambre', icon: '🛏️' },
    { value: 'suite', label: 'Suite', icon: '👑' },
    { value: 'toilette', label: 'Toilette', icon: '🚽' },
    { value: 'couloir', label: 'Couloir', icon: '🚶' },
    { value: 'restaurant', label: 'Restaurant', icon: '🍽️' },
    { value: 'cuisine', label: 'Cuisine', icon: '👨‍🍳' },
    { value: 'bureau', label: 'Bureau', icon: '💼' },
    { value: 'salle', label: 'Salle', icon: '🚪' }
  ];

  const typesTache = [
    { value: 'nettoyage', label: 'Nettoyage', icon: '🧹' },
    { value: 'maintenance', label: 'Maintenance', icon: '🔧' },
    { value: 'electricite', label: 'Électricité', icon: '⚡' },
    { value: 'plomberie', label: 'Plomberie', icon: '🚰' },
    { value: 'reception', label: 'Réception', icon: '🛎️' },
    { value: 'securite', label: 'Sécurité', icon: '🔒' }
  ];

  const statutsSousEspace = [
    { value: 'libre', label: 'Libre', color: '#10B981' },
    { value: 'occupe', label: 'Occupé', color: '#EF4444' },
    { value: 'maintenance', label: 'Maintenance', color: '#F59E0B' }
  ];

  // Firestore
  useEffect(() => {
    const unsubs = [];
    try {
      unsubs.push(onSnapshot(collection(db, 'espaces'), snap => {
        setEspaces(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setIsLoading(false);
      }));
      unsubs.push(onSnapshot(collection(db, 'sous_espaces'), snap =>
        setSousEspaces(snap.docs.map(d => ({ id: d.id, ...d.data() })))));
      unsubs.push(onSnapshot(collection(db, 'categories_espaces'), snap => {
        const custom = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setCategories([...categoriesDefaut, ...custom]);
      }));
      unsubs.push(onSnapshot(collection(db, 'staff'), snap =>
        setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })))));
    } catch (e) {
      console.error(e);
      setIsLoading(false);
    }
    return () => unsubs.forEach(u => u());
  }, []);

  // Utilitaires
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const getSousEspacesByParent = useCallback((id) => sousEspaces.filter(s => s.espaceParentId === id), [sousEspaces]);
  const getCategorieById = useCallback((id) => categories.find(c => c.id === id), [categories]);
  const toggleExpand = useCallback((id) => setExpandedEspaces(p => ({ ...p, [id]: !p[id] })), []);

  const resetEspaceForm = useCallback(() => {
    setEspaceForm({ nom: '', type: 'etage', numero: '', categorieId: '', description: '' });
    setSelectedEspace(null);
  }, []);

  const resetSousEspaceForm = useCallback(() => {
    setSousEspaceForm({ nom: '', numero: '', type: 'chambre', espaceParentId: '', superficie: '', capacite: '', statut: 'libre', equipements: [] });
    setSelectedSousEspace(null);
  }, []);

  // CRUD
  const handleSubmitEspace = async () => {
    if (!espaceForm.nom || !espaceForm.categorieId) {
      Alert.alert('Erreur', 'Nom et catégorie obligatoires');
      return;
    }
    setIsSubmitting(true);
    try {
      if (selectedEspace) {
        await updateDoc(doc(db, 'espaces', selectedEspace.id), { ...espaceForm, updatedAt: serverTimestamp() });
        Alert.alert('Succès', 'Espace modifié');
      } else {
        const ref = await addDoc(collection(db, 'espaces'), { ...espaceForm, createdAt: serverTimestamp() });
        Alert.alert('Succès', 'Espace créé');
        setQrCodeData({ valeur: ref.id, titre: espaceForm.nom });
        setShowQRModal(true);
      }
      setShowEspaceModal(false);
      resetEspaceForm();
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitSousEspace = async () => {
    if (!sousEspaceForm.numero || !sousEspaceForm.espaceParentId) {
      Alert.alert('Erreur', 'Numéro et espace parent obligatoires');
      return;
    }
    setIsSubmitting(true);
    try {
      if (selectedSousEspace) {
        await updateDoc(doc(db, 'sous_espaces', selectedSousEspace.id), { ...sousEspaceForm, updatedAt: serverTimestamp() });
        Alert.alert('Succès', 'Sous-espace modifié');
      } else {
        const ref = await addDoc(collection(db, 'sous_espaces'), { ...sousEspaceForm, createdAt: serverTimestamp() });
        Alert.alert('Succès', 'Sous-espace créé');
        setQrCodeData({ valeur: ref.id, titre: `${sousEspaceForm.numero}` });
        setShowQRModal(true);
      }
      setShowSousEspaceModal(false);
      resetSousEspaceForm();
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssign = async () => {
    if (!assignForm.employeId) {
      Alert.alert('Erreur', 'Sélectionnez un employé');
      return;
    }
    setIsSubmitting(true);
    try {
      const emp = employees.find(e => e.id === assignForm.employeId);
      const assign = {
        employeId: emp.id, employeUid: emp.uid, employeNom: emp.name || `${emp.nom} ${emp.prenom}`,
        employeRole: emp.role, typeTache: assignForm.typeTache, dateDebut: assignForm.dateDebut,
        notes: assignForm.notes, assigneLe: new Date().toISOString()
      };
      if (selectedEspace) {
        const e = espaces.find(x => x.id === selectedEspace.id);
        await updateDoc(doc(db, 'espaces', selectedEspace.id), {
          assignations: [...(e?.assignations || []), assign], updatedAt: serverTimestamp()
        });
      } else if (selectedSousEspace) {
        const s = sousEspaces.find(x => x.id === selectedSousEspace.id);
        await updateDoc(doc(db, 'sous_espaces', selectedSousEspace.id), {
          assignations: [...(s?.assignations || []), assign], updatedAt: serverTimestamp()
        });
      }
      Alert.alert('Succès', 'Assigné');
      setShowAssignModal(false);
      setSelectedEspace(null);
      setSelectedSousEspace(null);
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEspace = async (e) => {
    Alert.alert('Supprimer', `Supprimer "${e.nom}" et ses sous-espaces ?`, [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui', style: 'destructive', onPress: async () => {
          try {
            const batch = writeBatch(db);
            batch.delete(doc(db, 'espaces', e.id));
            const q = query(collection(db, 'sous_espaces'), where('espaceParentId', '==', e.id));
            const snap = await getDocs(q);
            snap.forEach(d => batch.delete(d.ref));
            await batch.commit();
            Alert.alert('Succès', 'Supprimé');
          } catch (err) {
            Alert.alert('Erreur', err.message);
          }
        }
      }
    ]);
  };

  const handleDeleteSousEspace = async (s) => {
    Alert.alert('Supprimer', `Supprimer "${s.numero}" ?`, [
      { text: 'Non', style: 'cancel' },
      { text: 'Oui', style: 'destructive', onPress: async () => {
        try {
          await deleteDoc(doc(db, 'sous_espaces', s.id));
          Alert.alert('Succès', 'Supprimé');
        } catch (e) {
          Alert.alert('Erreur', e.message);
        }
      }}
    ]);
  };

  const handleSubmitCategorie = async () => {
    if (!categorieForm.nom) {
      Alert.alert('Erreur', 'Nom obligatoire');
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'categories_espaces'), {
        ...categorieForm,
        custom: true,
        createdAt: serverTimestamp()
      });
      Alert.alert('Succès', 'Catégorie créée');
      setShowCategorieModal(false);
      setCategorieForm({ nom: '', type: 'public', couleur: '#3B82F6', icone: '🏢' });
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveAssignation = async (espaceId, isSousEspace, assignationIndex) => {
    Alert.alert('Confirmation', 'Retirer cette assignation ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Retirer',
        style: 'destructive',
        onPress: async () => {
          try {
            const collectionName = isSousEspace ? 'sous_espaces' : 'espaces';
            const docRef = doc(db, collectionName, espaceId);
            const docData = isSousEspace
              ? sousEspaces.find(se => se.id === espaceId)
              : espaces.find(e => e.id === espaceId);

            const nouvellesAssignations = docData?.assignations?.filter((_, index) => index !== assignationIndex) || [];

            await updateDoc(docRef, {
              assignations: nouvellesAssignations,
              updatedAt: serverTimestamp()
            });

            Alert.alert('Succès', 'Assignation retirée');
          } catch (error) {
            Alert.alert('Erreur', error.message);
          }
        }
      }
    ]);
  };

  // Filtres
  const filteredEspaces = useMemo(() => espaces.filter(e => {
    const s = e.nom?.toLowerCase().includes(searchTerm.toLowerCase());
    const c = filterCategorie === 'all' || e.categorieId === filterCategorie;
    return s && c;
  }), [espaces, searchTerm, filterCategorie]);

  const filteredEmployees = useMemo(() => {
    if (!employeeSearchTerm) return employees;
    const t = employeeSearchTerm.toLowerCase();
    return employees.filter(e => e.name?.toLowerCase().includes(t) || e.email?.toLowerCase().includes(t));
  }, [employees, employeeSearchTerm]);

  const stats = useMemo(() => ({
    public: espaces.filter(e => getCategorieById(e.categorieId)?.type === 'public').length,
    professionnel: espaces.filter(e => getCategorieById(e.categorieId)?.type === 'professionnel').length,
    sousEspaces: sousEspaces.length,
    assignations: [...espaces, ...sousEspaces].reduce((t, i) => t + (i.assignations?.length || 0), 0)
  }), [espaces, sousEspaces, getCategorieById]);

  if (isLoading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color="#3B82F6" /><Text style={styles.loadingText}>Chargement...</Text></View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#1E40AF', '#3B82F6']} style={styles.header}>
        <View style={styles.headerTop}>
          <View><Text style={styles.title}>Gestion des Espaces</Text><Text style={styles.subtitle}>Organisation hiérarchique</Text></View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton} onPress={() => { resetEspaceForm(); setShowEspaceModal(true); }}>
              <Ionicons name="business" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={() => setShowCategorieModal(true)}>
              <Ionicons name="pricetag" size={18} color="white" />
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stats}>
          <StatCard icon="👥" label="Publics" value={stats.public} colors={['#6366F1', '#8B5CF6']} fadeAnim={fadeAnim} slideAnim={slideAnim} />
          <StatCard icon="🏢" label="Professionnels" value={stats.professionnel} colors={['#F59E0B', '#D97706']} fadeAnim={fadeAnim} slideAnim={slideAnim} />
          <StatCard icon="🛏️" label="Sous-espaces" value={stats.sousEspaces} colors={['#10B981', '#059669']} fadeAnim={fadeAnim} slideAnim={slideAnim} />
          <StatCard icon="👤" label="Assignations" value={stats.assignations} colors={['#8B5CF6', '#7C3AED']} fadeAnim={fadeAnim} slideAnim={slideAnim} />
        </ScrollView>
      </LinearGradient>

      <View style={styles.filters}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#6B7280" />
          <TextInput style={styles.searchInput} placeholder="Rechercher..." value={searchTerm} onChangeText={setSearchTerm} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <TouchableOpacity style={[styles.chip, filterCategorie === 'all' && styles.chipActive]} onPress={() => setFilterCategorie('all')}>
            <Text style={[styles.chipText, filterCategorie === 'all' && styles.chipTextActive]}>Toutes</Text>
          </TouchableOpacity>
          {categoriesDefaut.map(c => (
            <TouchableOpacity key={c.id} style={[styles.chip, { borderColor: c.couleur }, filterCategorie === c.id && { backgroundColor: c.couleur }]}
              onPress={() => setFilterCategorie(c.id)}>
              <Text style={[styles.chipText, filterCategorie === c.id && styles.chipTextActive]}>{c.icone} {c.nom}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {filteredEspaces.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="business-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>Aucun espace</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => { resetEspaceForm(); setShowEspaceModal(true); }}>
              <Text style={styles.emptyBtnText}>Créer un espace</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredEspaces.map(e => (
            <EspaceCard key={e.id} espace={e} categorie={getCategorieById(e.categorieId)} sousEspaces={getSousEspacesByParent(e.id)}
              isExpanded={expandedEspaces[e.id]} onToggle={() => toggleExpand(e.id)} fadeAnim={fadeAnim} slideAnim={slideAnim}
              onQR={(d) => { setQrCodeData(d); setShowQRModal(true); }}
              onAssign={(item) => { setSelectedEspace(item); setSelectedSousEspace(null); setShowAssignModal(true); }}
              onAddSub={(id) => { resetSousEspaceForm(); setSousEspaceForm(p => ({ ...p, espaceParentId: id })); setShowSousEspaceModal(true); }}
              onEdit={(item) => { setSelectedEspace(item); setEspaceForm({ nom: item.nom, type: item.type, numero: item.numero || '', categorieId: item.categorieId, description: item.description || '' }); setShowEspaceModal(true); }}
              onDelete={handleDeleteEspace}
              onEditSub={(s) => { setSelectedSousEspace(s); setSousEspaceForm({ nom: s.nom || '', numero: s.numero, type: s.type, espaceParentId: s.espaceParentId, superficie: s.superficie || '', capacite: s.capacite || '', statut: s.statut || 'libre', equipements: s.equipements || [] }); setShowSousEspaceModal(true); }}
              onDeleteSub={handleDeleteSousEspace}
              onAssignSub={(s) => { setSelectedSousEspace(s); setSelectedEspace(null); setShowAssignModal(true); }}
              typesSousEspace={typesSousEspace}
            />
          ))
        )}
      </ScrollView>

      {/* Modal Espace */}
      <Modal visible={showEspaceModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedEspace ? 'Modifier' : 'Nouvel'} Espace</Text>
              <TouchableOpacity onPress={() => { setShowEspaceModal(false); resetEspaceForm(); }}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Nom *</Text>
                <TextInput style={styles.input} placeholder="Ex: Étage 1" value={espaceForm.nom} onChangeText={t => setEspaceForm({ ...espaceForm, nom: t })} />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Type</Text>
                <View style={styles.typeRow}>
                  {typesEspace.map(t => (
                    <TouchableOpacity key={t.value} style={[styles.typeBtn, espaceForm.type === t.value && styles.typeBtnActive]}
                      onPress={() => setEspaceForm({ ...espaceForm, type: t.value })}>
                      <Text style={[styles.typeText, espaceForm.type === t.value && styles.typeTextActive]}>{t.icon} {t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Numéro</Text>
                <TextInput style={styles.input} placeholder="Ex: 001" value={espaceForm.numero} onChangeText={t => setEspaceForm({ ...espaceForm, numero: t })} />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Catégorie *</Text>
                <View style={styles.typeRow}>
                  {categories.map(c => (
                    <TouchableOpacity key={c.id} style={[styles.typeBtn, espaceForm.categorieId === c.id && styles.typeBtnActive]}
                      onPress={() => setEspaceForm({ ...espaceForm, categorieId: c.id })}>
                      <Text style={[styles.typeText, espaceForm.categorieId === c.id && styles.typeTextActive]}>{c.icone} {c.nom}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => { setShowEspaceModal(false); resetEspaceForm(); }}>
                <Text style={styles.btnCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSubmit} onPress={handleSubmitEspace} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color="white" /> : <Text style={styles.btnSubmitText}>{selectedEspace ? 'Modifier' : 'Créer'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Sous-Espace */}
      <Modal visible={showSousEspaceModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedSousEspace ? 'Modifier' : 'Nouveau'} Sous-espace</Text>
              <TouchableOpacity onPress={() => { setShowSousEspaceModal(false); resetSousEspaceForm(); }}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Espace parent *</Text>
                <ScrollView style={styles.picker}>
                  {espaces.map(e => (
                    <TouchableOpacity key={e.id} style={[styles.pickerItem, sousEspaceForm.espaceParentId === e.id && styles.pickerItemActive]}
                      onPress={() => setSousEspaceForm({ ...sousEspaceForm, espaceParentId: e.id })}>
                      <Text style={[styles.pickerText, sousEspaceForm.espaceParentId === e.id && styles.pickerTextActive]}>{e.nom}</Text>
                      {sousEspaceForm.espaceParentId === e.id && <Ionicons name="checkmark" size={20} color="#3B82F6" />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Numéro *</Text>
                <TextInput style={styles.input} placeholder="Ex: 101" value={sousEspaceForm.numero} onChangeText={t => setSousEspaceForm({ ...sousEspaceForm, numero: t })} />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Type</Text>
                <View style={styles.typeRow}>
                  {typesSousEspace.map(t => (
                    <TouchableOpacity key={t.value} style={[styles.typeBtn, sousEspaceForm.type === t.value && styles.typeBtnActive]}
                      onPress={() => setSousEspaceForm({ ...sousEspaceForm, type: t.value })}>
                      <Text style={[styles.typeText, sousEspaceForm.type === t.value && styles.typeTextActive]}>{t.icon} {t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Statut</Text>
                <View style={styles.typeRow}>
                  {statutsSousEspace.map(s => (
                    <TouchableOpacity key={s.value} style={[styles.typeBtn, sousEspaceForm.statut === s.value && styles.typeBtnActive]}
                      onPress={() => setSousEspaceForm({ ...sousEspaceForm, statut: s.value })}>
                      <Text style={[styles.typeText, sousEspaceForm.statut === s.value && styles.typeTextActive]}>{s.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => { setShowSousEspaceModal(false); resetSousEspaceForm(); }}>
                <Text style={styles.btnCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSubmit} onPress={handleSubmitSousEspace} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color="white" /> : <Text style={styles.btnSubmitText}>{selectedSousEspace ? 'Modifier' : 'Créer'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Assignation */}
      <Modal visible={showAssignModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Assigner un employé</Text>
                <Text style={styles.modalSubtitle}>{selectedEspace?.nom || selectedSousEspace?.numero}</Text>
              </View>
              <TouchableOpacity onPress={() => { setShowAssignModal(false); setSelectedEspace(null); setSelectedSousEspace(null); }}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.assignSearch}>
              <Ionicons name="search" size={18} color="#94A3B8" />
              <TextInput style={styles.searchInput} placeholder="Rechercher..." value={employeeSearchTerm} onChangeText={setEmployeeSearchTerm} />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Type de tâche</Text>
              <View style={styles.typeRow}>
                {typesTache.map(t => (
                  <TouchableOpacity key={t.value} style={[styles.typeBtn, assignForm.typeTache === t.value && styles.typeBtnActive]}
                    onPress={() => setAssignForm({ ...assignForm, typeTache: t.value })}>
                    <Text style={[styles.typeText, assignForm.typeTache === t.value && styles.typeTextActive]}>{t.icon} {t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <ScrollView style={styles.modalBody}>
              {filteredEmployees.length === 0 ? (
                <View style={styles.empty}><Text style={styles.emptyText}>Aucun employé disponible</Text></View>
              ) : (
                filteredEmployees.map(emp => (
                  <TouchableOpacity key={emp.id} style={[styles.empCard, assignForm.employeId === emp.id && styles.empCardActive]}
                    onPress={() => setAssignForm({ ...assignForm, employeId: emp.id })}>
                    <View style={styles.empAvatar}><Ionicons name="person" size={24} color="#3B82F6" /></View>
                    <View style={styles.empInfo}>
                      <Text style={styles.empName}>{emp.name || `${emp.nom} ${emp.prenom}`}</Text>
                      <Text style={styles.empRole}>{emp.role || 'Employé'}</Text>
                    </View>
                    {assignForm.employeId === emp.id && <Ionicons name="checkmark-circle" size={24} color="#10B981" />}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => { setShowAssignModal(false); setSelectedEspace(null); setSelectedSousEspace(null); }}>
                <Text style={styles.btnCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSubmit} onPress={handleAssign} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color="white" /> : <Text style={styles.btnSubmitText}>Assigner</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal QR Code */}
      <Modal visible={showQRModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '50%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>QR Code généré</Text>
              <TouchableOpacity onPress={() => setShowQRModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.qrContent}>
              <View style={styles.qrPlaceholder}>
                <Ionicons name="qr-code" size={120} color="#3B82F6" />
              </View>
              <Text style={styles.qrTitle}>{qrCodeData.titre}</Text>
              <Text style={styles.qrId}>ID: {qrCodeData.valeur}</Text>
              <Text style={styles.qrHint}>Scannez ce code pour accéder à l'espace</Text>
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.btnSubmit} onPress={() => setShowQRModal(false)}>
                <Text style={styles.btnSubmitText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Catégorie */}
      <Modal visible={showCategorieModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouvelle Catégorie</Text>
              <TouchableOpacity onPress={() => setShowCategorieModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Nom *</Text>
                <TextInput style={styles.input} placeholder="Ex: VIP" value={categorieForm.nom} onChangeText={t => setCategorieForm({ ...categorieForm, nom: t })} />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Type</Text>
                <View style={styles.typeRow}>
                  <TouchableOpacity style={[styles.typeBtn, categorieForm.type === 'public' && styles.typeBtnActive]}
                    onPress={() => setCategorieForm({ ...categorieForm, type: 'public' })}>
                    <Text style={[styles.typeText, categorieForm.type === 'public' && styles.typeTextActive]}>Public</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.typeBtn, categorieForm.type === 'professionnel' && styles.typeBtnActive]}
                    onPress={() => setCategorieForm({ ...categorieForm, type: 'professionnel' })}>
                    <Text style={[styles.typeText, categorieForm.type === 'professionnel' && styles.typeTextActive]}>Professionnel</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Icône</Text>
                <View style={styles.iconRow}>
                  {['🏢', '👥', '🚪', '🚿', '🔧', '🍽️', '🛏️', '💼'].map(i => (
                    <TouchableOpacity key={i} style={[styles.iconBtn, categorieForm.icone === i && styles.iconBtnActive]}
                      onPress={() => setCategorieForm({ ...categorieForm, icone: i })}>
                      <Text style={styles.iconText}>{i}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setShowCategorieModal(false)}>
                <Text style={styles.btnCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSubmit} onPress={handleSubmitCategorie} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color="white" /> : <Text style={styles.btnSubmitText}>Créer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// Composants
const StatCard = ({ icon, label, value, colors, fadeAnim, slideAnim }) => (
  <Animated.View style={[styles.statCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
    <LinearGradient colors={colors} style={styles.statGradient}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </LinearGradient>
  </Animated.View>
);

const EspaceCard = ({ espace, categorie, sousEspaces, isExpanded, onToggle, fadeAnim, slideAnim, onQR, onAssign, onAddSub, onEdit, onDelete, onEditSub, onDeleteSub, onAssignSub, typesSousEspace }) => (
  <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
    <LinearGradient colors={[categorie?.couleur || '#6B7280', categorie?.couleur || '#6B7280']} style={styles.cardHeader}>
      <TouchableOpacity style={styles.cardHeaderContent} onPress={onToggle}>
        <View style={styles.cardInfo}>
          <Text style={styles.cardIcon}>{categorie?.icone || '🏢'}</Text>
          <View style={styles.cardText}>
            <Text style={styles.cardNom}>{espace.nom} {espace.numero && `- ${espace.numero}`}</Text>
            <Text style={styles.cardSub}>{espace.type} • {sousEspaces.length} sous-espaces</Text>
          </View>
        </View>
        <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color="white" />
      </TouchableOpacity>
    </LinearGradient>

    {isExpanded && (
      <View style={styles.cardExpanded}>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.action} onPress={() => onQR({ valeur: espace.id, titre: espace.nom })}>
            <Ionicons name="qr-code" size={16} color="#3B82F6" />
            <Text style={styles.actionText}>QR</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.action} onPress={() => onAssign(espace)}>
            <Ionicons name="person-add" size={16} color="#10B981" />
            <Text style={styles.actionText}>Assigner</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.action} onPress={() => onAddSub(espace.id)}>
            <Ionicons name="add-circle" size={16} color="#F59E0B" />
            <Text style={styles.actionText}>Ajouter</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.action} onPress={() => onEdit(espace)}>
            <Ionicons name="create" size={16} color="#3B82F6" />
            <Text style={styles.actionText}>Modifier</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.action} onPress={() => onDelete(espace)}>
            <Ionicons name="trash" size={16} color="#EF4444" />
            <Text style={styles.actionText}>Supprimer</Text>
          </TouchableOpacity>
        </View>

        {espace.assignations?.length > 0 && (
          <View style={styles.assigns}>
            <Text style={styles.assignsTitle}>Assignations</Text>
            {espace.assignations.map((a, i) => (
              <View key={i} style={styles.assignItem}>
                <Text style={styles.assignText}>{a.employeNom} - {a.typeTache}</Text>
              </View>
            ))}
          </View>
        )}

        {sousEspaces.length > 0 && (
          <View style={styles.subs}>
            <Text style={styles.subsTitle}>Sous-espaces</Text>
            {sousEspaces.map(s => (
              <View key={s.id} style={styles.subCard}>
                <View style={styles.subInfo}>
                  <Text style={styles.subIcon}>{typesSousEspace.find(t => t.value === s.type)?.icon || '🛏️'}</Text>
                  <View>
                    <Text style={styles.subNom}>{s.numero} {s.nom && `- ${s.nom}`}</Text>
                    <Text style={styles.subType}>{s.type} • {s.statut}</Text>
                  </View>
                </View>
                <View style={styles.subActions}>
                  <TouchableOpacity style={styles.subBtn} onPress={() => onQR({ valeur: s.id, titre: s.numero })}>
                    <Ionicons name="qr-code" size={14} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.subBtn} onPress={() => onAssignSub(s)}>
                    <Ionicons name="person-add" size={14} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.subBtn, { backgroundColor: '#F59E0B' }]} onPress={() => onEditSub(s)}>
                    <Ionicons name="create" size={14} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.subBtn, { backgroundColor: '#EF4444' }]} onPress={() => onDeleteSub(s)}>
                    <Ionicons name="trash" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    )}
  </Animated.View>
);

// Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#64748B' },
  header: { padding: 24, paddingTop: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: 'white' },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.9)' },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerButton: { backgroundColor: 'rgba(255,255,255,0.2)', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  stats: { flexDirection: 'row', gap: 12 },
  statCard: { borderRadius: 16, elevation: 4 },
  statGradient: { padding: 16, borderRadius: 16, width: 120, alignItems: 'center' },
  statIcon: { fontSize: 24, marginBottom: 8 },
  statValue: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.9)' },
  filters: { backgroundColor: 'white', padding: 20, marginHorizontal: 20, marginTop: -20, borderRadius: 16, elevation: 4 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  searchInput: { flex: 1, paddingVertical: 14, fontSize: 16, marginLeft: 12 },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: 'white' },
  chipActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  chipText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  chipTextActive: { color: 'white' },
  list: { flex: 1, padding: 20 },
  empty: { alignItems: 'center', padding: 40, backgroundColor: 'white', borderRadius: 16, marginTop: 20 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#374151', marginTop: 16 },
  emptyText: { fontSize: 16, color: '#6B7280', marginTop: 8 },
  emptyBtn: { backgroundColor: '#3B82F6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 20 },
  emptyBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  card: { borderRadius: 16, marginBottom: 16, elevation: 4, overflow: 'hidden' },
  cardHeader: { padding: 20 },
  cardHeaderContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cardIcon: { fontSize: 24, marginRight: 12 },
  cardText: { flex: 1 },
  cardNom: { fontSize: 18, fontWeight: 'bold', color: 'white' },
  cardSub: { fontSize: 12, color: 'white', marginTop: 4, opacity: 0.9 },
  cardExpanded: { padding: 20, backgroundColor: '#F9FAFB' },
  actions: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  action: { flex: 1, backgroundColor: 'white', padding: 10, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  actionText: { fontSize: 11, fontWeight: '600', color: '#374151', marginTop: 4 },
  assigns: { backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 16 },
  assignsTitle: { fontSize: 14, fontWeight: 'bold', color: '#374151', marginBottom: 12 },
  assignItem: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#F8FAFC', borderRadius: 8, marginBottom: 8 },
  assignText: { fontSize: 14, color: '#374151' },
  subs: { gap: 12 },
  subsTitle: { fontSize: 14, fontWeight: 'bold', color: '#374151', marginBottom: 8 },
  subCard: { backgroundColor: 'white', padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 2 },
  subInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  subIcon: { fontSize: 20, marginRight: 12 },
  subNom: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  subType: { fontSize: 12, color: '#6B7280' },
  subActions: { flexDirection: 'row', gap: 6 },
  subBtn: { backgroundColor: '#3B82F6', width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  modalSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  modalBody: { padding: 20, maxHeight: 400 },
  modalFooter: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  typeBtnActive: { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' },
  typeText: { fontSize: 13, color: '#64748B' },
  typeTextActive: { color: '#3B82F6', fontWeight: '600' },
  picker: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 8, maxHeight: 150 },
  pickerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
  pickerItemActive: { backgroundColor: '#EFF6FF' } ,
  pickerText: { fontSize: 15, color: '#475569' } ,
  pickerTextActive: { color: '#3B82F6', fontWeight: '600' },
  assignSearch: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 10, paddingHorizontal: 12, margin: 20, marginBottom: 0, height: 42 },
  empCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 15, marginBottom: 12 },
  empCardActive: { backgroundColor: '#EFF6FF', borderWidth: 2, borderColor: '#3B82F6' },
  empAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  empInfo: { flex: 1, marginLeft: 12 },
  empName: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  empRole: { fontSize: 13, color: '#64748B', marginTop: 2 },
  btnCancel: { flex: 1, backgroundColor: '#6B7280', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnCancelText: { color: 'white', fontWeight: '600' },
  btnSubmit: { flex: 1, backgroundColor: '#3B82F6', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnSubmitText: { color: 'white', fontWeight: '600' },
  qrContent: { padding: 40, alignItems: 'center' },
  qrPlaceholder: { width: 200, height: 200, backgroundColor: '#F8FAFC', borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  qrTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 8 },
  qrId: { fontSize: 14, color: '#6B7280', marginBottom: 16 },
  qrHint: { fontSize: 12, color: '#9CA3AF', textAlign: 'center' },
  iconRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconBtn: { width: 48, height: 48, backgroundColor: '#F8FAFC', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  iconBtnActive: { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' },
  iconText: { fontSize: 24 }
});

export default GestionEspacesHierarchie;