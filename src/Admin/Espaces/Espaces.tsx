import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  Modal, Alert, ActivityIndicator, FlatList
} from 'react-native';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, query, where, getDocs, writeBatch, getDoc
} from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { Icon } from 'lucide-react-native';  

// Types
interface EspaceParent {
  id: string;
  nom: string;
  type: string;
  numero?: string;
  categorieId: string;
  qrCode?: string;
  assignedTo?: EmployeeAssignment[];
  createdAt?: any;
  updatedAt?: any;
}

interface SousEspace {
  id: string;
  numero: string;
  type: string;
  espaceParentId: string;
  qrCode?: string;
  assignedTo?: EmployeeAssignment[];
  createdAt?: any;
  updatedAt?: any;
}

interface CategorieEspace {
  id: string;
  nom: string;
}

interface EmployeeAssignment {
  employeeId: string;
  employeeName: string;
  employeeRole?: string;
  assignedAt: string;
}

interface Employee {
  id: string;
  nom?: string;
  prenom?: string;
  role?: string;
  poste?: string;
  email?: string;
  [key: string]: any;
}

interface EspaceForm {
  nom: string;
  type: string;
  numero: string;
  categorieId: string;
}

interface SousEspaceForm {
  numero: string;
  type: string;
  parentId: string;
}

// Fonction utilitaire pour formater les dates
const formatDate = (dateString: string) => {
  if (!dateString) return 'Date inconnue';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    return dateString;
  }
};

const GestionEspacesHierarchie = () => {
  // États principaux
  const [espaces, setEspaces] = useState<EspaceParent[]>([]);
  const [sousEspaces, setSousEspaces] = useState<SousEspace[]>([]);
  const [categories, setCategories] = useState<CategorieEspace[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedEspaces, setExpandedEspaces] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Modales
  const [showEspaceModal, setShowEspaceModal] = useState(false);
  const [showSousEspaceModal, setShowSousEspaceModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formulaires et sélections
  const [selectedItem, setSelectedItem] = useState<EspaceParent | SousEspace | null>(null);
  const [selectedQRCode, setSelectedQRCode] = useState<string>('');
  const [selectedItemName, setSelectedItemName] = useState<string>('');

const [showQuickActionMenu, setShowQuickActionMenu] = useState(false);

    // Ajoutez cet état pour le menu d'action
const [showActionMenu, setShowActionMenu] = useState(false);
const [selectedForAction, setSelectedForAction] = useState<{
  type: 'espace' | 'sous_espace' | null;
  item: EspaceParent | SousEspace | null;
}>({ type: null, item: null });



  const [espaceForm, setEspaceForm] = useState<EspaceForm>({
    nom: '',
    type: 'etage',
    numero: '',
    categorieId: 'public_client'
  });
  const [sousEspaceForm, setSousEspaceForm] = useState<SousEspaceForm>({
    numero: '',
    type: 'chambre',
    parentId: ''
  });



  
  // Abonnements Firestore avec gestion d'erreurs
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    try {
      // Espaces parents
      const unsubEspaces = onSnapshot(
        collection(db, 'espaces'),
        (snap) => {
          setEspaces(snap.docs.map(d => ({ id: d.id, ...d.data() } as EspaceParent)));
          setIsLoading(false);
        },
        (error) => {
          console.error('Erreur espaces:', error);
          Alert.alert('Erreur', 'Impossible de charger les espaces');
          setIsLoading(false);
        }
      );
      unsubscribers.push(unsubEspaces);

      // Sous-espaces
      const unsubSous = onSnapshot(
        collection(db, 'sous_espaces'),
        (snap) => setSousEspaces(snap.docs.map(d => ({ id: d.id, ...d.data() } as SousEspace))),
        (error) => console.error('Erreur sous-espaces:', error)
      );
      unsubscribers.push(unsubSous);

      // Catégories
      const unsubCats = onSnapshot(
        collection(db, 'categories_espaces'),
        (snap) => setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as CategorieEspace))),
        (error) => console.error('Erreur catégories:', error)
      );
      unsubscribers.push(unsubCats);

      // Employés
      const unsubStaff = onSnapshot(
        collection(db, 'staff'),
        (snap) => setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() } as Employee))),
        (error) => console.error('Erreur staff:', error)
      );
      unsubscribers.push(unsubStaff);
    } catch (error) {
      console.error('Erreur initialisation:', error);
      setIsLoading(false);
    }

    return () => unsubscribers.forEach(unsub => unsub());
  }, []);

  // Handlers avec useCallback pour optimisation
  const handleDeleteEspace = useCallback(async (item: EspaceParent) => {
    Alert.alert(
      "Confirmation",
      `Supprimer "${item.nom}" et tous ses sous-espaces ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            setIsSubmitting(true);
            try {
              const batch = writeBatch(db);
              batch.delete(doc(db, 'espaces', item.id));
              
              const q = query(
                collection(db, 'sous_espaces'),
                where("espaceParentId", "==", item.id)
              );
              const snap = await getDocs(q);
              snap.forEach(d => batch.delete(d.ref));
              
              await batch.commit();
              Alert.alert('Succès', 'Espace supprimé avec succès');
            } catch (error) {
              console.error('Erreur suppression:', error);
              Alert.alert("Erreur", "Impossible de supprimer l'espace");
            } finally {
              setIsSubmitting(false);
            }
          }
        }
      ]
    );
  }, []);

  const handleDeleteSousEspace = useCallback(async (item: SousEspace) => {
    Alert.alert(
      "Confirmation",
      `Supprimer le sous-espace "${item.numero}" ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            setIsSubmitting(true);
            try {
              await deleteDoc(doc(db, 'sous_espaces', item.id));
              Alert.alert('Succès', 'Sous-espace supprimé');
            } catch (error) {
              console.error('Erreur suppression sous-espace:', error);
              Alert.alert("Erreur", "Impossible de supprimer le sous-espace");
            } finally {
              setIsSubmitting(false);
            }
          }
        }
      ]
    );
  }, []);

  const handleSaveEspace = useCallback(async () => {
    if (!espaceForm.nom.trim()) {
      Alert.alert('Erreur', 'Le nom est requis');
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedItem && 'nom' in selectedItem) {
        // Mise à jour
        await updateDoc(doc(db, 'espaces', selectedItem.id), {
          ...espaceForm,
          updatedAt: serverTimestamp()
        });
        Alert.alert('Succès', 'Espace mis à jour');
      } else {
        // Création - générer automatiquement le QR Code
        const newEspace = {
          ...espaceForm,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          assignedTo: []
        };
        
        // Ajouter le document
        const docRef = await addDoc(collection(db, 'espaces'), newEspace);
        
        // Générer le QR Code après création
        const qrData = JSON.stringify({
          id: docRef.id,
          type: 'espace',
          nom: espaceForm.nom,
          timestamp: new Date().toISOString()
        });
        
        await updateDoc(docRef, {
          qrCode: qrData
        });
        
        Alert.alert('Succès', 'Espace créé avec QR Code généré');
      }
      setShowEspaceModal(false);
      resetEspaceForm();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder');
    } finally {
      setIsSubmitting(false);
    }
  }, [espaceForm, selectedItem]);

  const handleSaveSousEspace = useCallback(async () => {
    if (!sousEspaceForm.numero.trim() || !sousEspaceForm.parentId) {
      Alert.alert('Erreur', 'Numéro et espace parent requis');
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedItem && 'espaceParentId' in selectedItem) {
        // Mise à jour
        await updateDoc(doc(db, 'sous_espaces', selectedItem.id), {
          ...sousEspaceForm,
          updatedAt: serverTimestamp()
        });
        Alert.alert('Succès', 'Sous-espace mis à jour');
      } else {
        // Création - générer automatiquement le QR Code
        const newSousEspace = {
          ...sousEspaceForm,
          espaceParentId: sousEspaceForm.parentId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          assignedTo: []
        };
        
        // Ajouter le document
        const docRef = await addDoc(collection(db, 'sous_espaces'), newSousEspace);
        
        // Générer le QR Code après création
        const qrData = JSON.stringify({
          id: docRef.id,
          type: 'sous_espace',
          numero: sousEspaceForm.numero,
          timestamp: new Date().toISOString()
        });
        
        await updateDoc(docRef, {
          qrCode: qrData
        });
        
        Alert.alert('Succès', 'Sous-espace créé avec QR Code généré');
      }
      setShowSousEspaceModal(false);
      resetSousEspaceForm();
    } catch (error) {
      console.error('Erreur sauvegarde sous-espace:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder');
    } finally {
      setIsSubmitting(false);
    }
  }, [sousEspaceForm, selectedItem]);

  const handleGenerateQR = useCallback(async (item: EspaceParent | SousEspace) => {
    const itemId = item.id;
    const isEspace = 'nom' in item;
    const nom = isEspace ? item.nom : item.numero;
    
    // Créer une URL unique pour l'espace/sous-espace
    const qrData = JSON.stringify({
      id: itemId,
      type: isEspace ? 'espace' : 'sous_espace',
      nom: nom,
      timestamp: new Date().toISOString()
    });

    setIsSubmitting(true);
    try {
      const collectionName = isEspace ? 'espaces' : 'sous_espaces';
      await updateDoc(doc(db, collectionName, itemId), {
        qrCode: qrData,
        updatedAt: serverTimestamp()
      });
      
      setSelectedQRCode(qrData);
      setSelectedItemName(nom);
      setShowQRModal(true);
      
      Alert.alert('Succès', 'QR Code généré avec succès');
    } catch (error) {
      console.error('Erreur génération QR:', error);
      Alert.alert('Erreur', 'Impossible de générer le QR Code');
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const handleAssignEmployee = useCallback(async (employee: Employee, item: EspaceParent | SousEspace) => {
    const isEspace = 'nom' in item;
    const collectionName = isEspace ? 'espaces' : 'sous_espaces';
    
    const assignment: EmployeeAssignment = {
      employeeId: employee.id,
      employeeName: `${employee.prenom || ''} ${employee.nom || ''}`.trim(),
      employeeRole: employee.role || employee.poste || 'Employé',
      assignedAt: new Date().toISOString()
    };

    setIsSubmitting(true);
    try {
      const itemRef = doc(db, collectionName, item.id);
      const itemSnap = await getDoc(itemRef);
      const currentData = itemSnap.data();
      
      const currentAssignments = currentData?.assignedTo || [];
      const updatedAssignments = [...currentAssignments, assignment];
      
      await updateDoc(itemRef, {
        assignedTo: updatedAssignments,
        updatedAt: serverTimestamp()
      });
      
      Alert.alert('Succès', 'Employé assigné avec succès');
      setShowAssignModal(false);
    } catch (error) {
      console.error('Erreur assignation:', error);
      Alert.alert('Erreur', 'Impossible d\'assigner l\'employé');
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const handleUnassignEmployee = useCallback(async (item: EspaceParent | SousEspace, employeeId: string) => {
    const isEspace = 'nom' in item;
    const collectionName = isEspace ? 'espaces' : 'sous_espaces';
    
    Alert.alert(
      "Retirer l'assignation",
      "Voulez-vous retirer cette assignation ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Retirer",
          style: "destructive",
          onPress: async () => {
            setIsSubmitting(true);
            try {
              const itemRef = doc(db, collectionName, item.id);
              const itemSnap = await getDoc(itemRef);
              const currentData = itemSnap.data();
              
              const currentAssignments = currentData?.assignedTo || [];
              const updatedAssignments = currentAssignments.filter(
                (assignment: EmployeeAssignment) => assignment.employeeId !== employeeId
              );
              
              await updateDoc(itemRef, {
                assignedTo: updatedAssignments,
                updatedAt: serverTimestamp()
              });
              
              Alert.alert('Succès', 'Assignation retirée avec succès');
            } catch (error) {
              console.error('Erreur retrait assignation:', error);
              Alert.alert('Erreur', 'Impossible de retirer l\'assignation');
            } finally {
              setIsSubmitting(false);
            }
          }
        }
      ]
    );
  }, []);

  const resetEspaceForm = useCallback(() => {
    setEspaceForm({ nom: '', type: 'etage', numero: '', categorieId: 'public_client' });
    setSelectedItem(null);
  }, []);

  const resetSousEspaceForm = useCallback(() => {
    setSousEspaceForm({ numero: '', type: 'chambre', parentId: '' });
    setSelectedItem(null);
  }, []);

  const toggleExpanded = useCallback((espaceId: string) => {
    setExpandedEspaces(prev => ({ ...prev, [espaceId]: !prev[espaceId] }));
  }, []);

  const handleEditEspace = useCallback((espace: EspaceParent) => {
    setSelectedItem(espace);
    setEspaceForm({
      nom: espace.nom,
      type: espace.type,
      numero: espace.numero || '',
      categorieId: espace.categorieId
    });
    setShowEspaceModal(true);
  }, []);

  const handleEditSousEspace = useCallback((sousEspace: SousEspace) => {
    setSelectedItem(sousEspace);
    setSousEspaceForm({
      numero: sousEspace.numero,
      type: sousEspace.type,
      parentId: sousEspace.espaceParentId
    });
    setShowSousEspaceModal(true);
  }, []);

  const handleAddSousEspace = useCallback((espaceId: string) => {
    resetSousEspaceForm();
    setSousEspaceForm(prev => ({ ...prev, parentId: espaceId }));
    setShowSousEspaceModal(true);
  }, [resetSousEspaceForm]);

  const handleAssign = useCallback((item: EspaceParent | SousEspace) => {
    setSelectedItem(item);
    setShowAssignModal(true);
  }, []);

  // Filtrage optimisé avec useMemo
  const filteredEspaces = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return espaces;
    
    return espaces.filter(espace => 
      espace.nom.toLowerCase().includes(term) ||
      espace.numero?.toLowerCase().includes(term) ||
      espace.type.toLowerCase().includes(term)
    );
  }, [espaces, searchTerm]);

  // Regroupement des sous-espaces par parent
  const sousEspacesParParent = useMemo(() => {
    return sousEspaces.reduce((acc, se) => {
      if (!acc[se.espaceParentId]) {
        acc[se.espaceParentId] = [];
      }
      acc[se.espaceParentId].push(se);
      return acc;
    }, {} as Record<string, SousEspace[]>);
  }, [sousEspaces]);

  // Render avec FlatList pour optimisation
  const renderEspace = useCallback(({ item: espace }: { item: EspaceParent }) => (
    <EspaceCard
      key={espace.id}
      espace={espace}
      sousEspaces={sousEspacesParParent[espace.id] || []}
      isExpanded={!!expandedEspaces[espace.id]}
      onToggle={() => toggleExpanded(espace.id)}
      onAdd={() => handleAddSousEspace(espace.id)}
      onEdit={() => handleEditEspace(espace)}
      onQR={() => handleGenerateQR(espace)}
      onAssign={() => handleAssign(espace)}
      onDelete={() => handleDeleteEspace(espace)}
      onEditSousEspace={handleEditSousEspace}
      onDeleteSousEspace={handleDeleteSousEspace}
      onQRSousEspace={handleGenerateQR}
      onAssignSousEspace={handleAssign}
      onUnassignEmployee={(employeeId) => handleUnassignEmployee(espace, employeeId)}
      onUnassignSousEspaceEmployee={(sousEspaceId, employeeId) => {
        const sousEspace = sousEspaces.find(se => se.id === sousEspaceId);
        if (sousEspace) {
          handleUnassignEmployee(sousEspace, employeeId);
        }
      }}
    />
  ), [
    sousEspacesParParent,
    expandedEspaces,
    toggleExpanded,
    handleAddSousEspace,
    handleEditEspace,
    handleGenerateQR,
    handleAssign,
    handleDeleteEspace,
    handleEditSousEspace,
    handleDeleteSousEspace,
    handleUnassignEmployee,
    sousEspaces,
  ]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Chargement des espaces...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1E40AF', '#3B82F6']} style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Gestion des Espaces</Text>
    <TouchableOpacity
  style={styles.fabButton}
  onPress={() => setShowQuickActionMenu(true)}
>
  <Ionicons name="add" size={28} color="#3B82F6" />
</TouchableOpacity>
        </View>
        
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un espace..."
            placeholderTextColor="#94A3B8"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <FlatList
        data={filteredEspaces}
        renderItem={renderEspace}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="business-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyText}>
              {searchTerm ? 'Aucun espace trouvé' : 'Aucun espace créé'}
            </Text>
            {!searchTerm && (
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => {
                  resetEspaceForm();
                  setShowEspaceModal(true);
                }}
              >
                <Text style={styles.emptyButtonText}>Créer un espace</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Modal Espace Parent */}
      <Modal
        visible={showEspaceModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowEspaceModal(false);
          resetEspaceForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedItem && 'nom' in selectedItem ? 'Modifier l\'espace' : 'Nouvel espace'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowEspaceModal(false);
                  resetEspaceForm();
                }}
              >
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Nom de l'espace *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Étage 1, Bloc A..."
                  value={espaceForm.nom}
                  onChangeText={(text) => setEspaceForm(prev => ({ ...prev, nom: text }))}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Type d'espace</Text>
                <View style={styles.typeSelector}>
                  {['etage', 'bloc', 'aile', 'batiment'].map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeOption,
                        espaceForm.type === type && styles.typeOptionActive
                      ]}
                      onPress={() => setEspaceForm(prev => ({ ...prev, type }))}
                    >
                      <Text style={[
                        styles.typeText,
                        espaceForm.type === type && styles.typeTextActive
                      ]}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Numéro (optionnel)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: 001, A1..."
                  value={espaceForm.numero}
                  onChangeText={(text) => setEspaceForm(prev => ({ ...prev, numero: text }))}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Catégorie</Text>
                <View style={styles.typeSelector}>
                  {categories.length > 0 ? (
                    categories.map(cat => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.typeOption,
                          espaceForm.categorieId === cat.id && styles.typeOptionActive
                        ]}
                        onPress={() => setEspaceForm(prev => ({ ...prev, categorieId: cat.id }))}
                      >
                        <Text style={[
                          styles.typeText,
                          espaceForm.categorieId === cat.id && styles.typeTextActive
                        ]}>
                          {cat.nom}
                        </Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={styles.noDataText}>Aucune catégorie disponible</Text>
                  )}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => {
                  setShowEspaceModal(false);
                  resetEspaceForm();
                }}
                disabled={isSubmitting}
              >
                <Text style={styles.buttonSecondaryText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={handleSaveEspace}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonPrimaryText}>
                    {selectedItem && 'nom' in selectedItem ? 'Modifier' : 'Créer'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Sous-Espace */}
      <Modal
        visible={showSousEspaceModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowSousEspaceModal(false);
          resetSousEspaceForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedItem && 'espaceParentId' in selectedItem ? 'Modifier le sous-espace' : 'Nouveau sous-espace'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowSousEspaceModal(false);
                  resetSousEspaceForm();
                }}
              >
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Espace parent *</Text>
                <View style={styles.pickerContainer}>
                  <Ionicons name="business" size={20} color="#64748B" />
                  <View style={styles.pickerWrapper}>
                    {espaces.map(espace => (
                      <TouchableOpacity
                        key={espace.id}
                        style={[
                          styles.pickerOption,
                          sousEspaceForm.parentId === espace.id && styles.pickerOptionSelected
                        ]}
                        onPress={() => setSousEspaceForm(prev => ({ ...prev, parentId: espace.id }))}
                      >
                        <Text style={[
                          styles.pickerText,
                          sousEspaceForm.parentId === espace.id && styles.pickerTextSelected
                        ]}>
                          {espace.nom}
                        </Text>
                        {sousEspaceForm.parentId === espace.id && (
                          <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Numéro *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: 101, A12..."
                  value={sousEspaceForm.numero}
                  onChangeText={(text) => setSousEspaceForm(prev => ({ ...prev, numero: text }))}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Type de sous-espace</Text>
                <View style={styles.typeSelector}>
                  {['chambre', 'bureau', 'salle', 'local', 'atelier'].map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeOption,
                        sousEspaceForm.type === type && styles.typeOptionActive
                      ]}
                      onPress={() => setSousEspaceForm(prev => ({ ...prev, type }))}
                    >
                      <Text style={[
                        styles.typeText,
                        sousEspaceForm.type === type && styles.typeTextActive
                      ]}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => {
                  setShowSousEspaceModal(false);
                  resetSousEspaceForm();
                }}
                disabled={isSubmitting}
              >
                <Text style={styles.buttonSecondaryText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={handleSaveSousEspace}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonPrimaryText}>
                    {selectedItem && 'espaceParentId' in selectedItem ? 'Modifier' : 'Créer'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal d'assignation */}
      <Modal
        visible={showAssignModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowAssignModal(false);
          setSelectedItem(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Assigner un employé</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedItem && ('nom' in selectedItem 
                    ? selectedItem.nom 
                    : selectedItem.numero)}
                </Text>
                {selectedItem && selectedItem.assignedTo && selectedItem.assignedTo.length > 0 && (
                  <Text style={styles.currentAssignments}>
                    Déjà assigné à: {selectedItem.assignedTo.map(a => a.employeeName).join(', ')}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowAssignModal(false);
                  setSelectedItem(null);
                }}
              >
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.assignSearchBar}>
              <Ionicons name="search" size={18} color="#94A3B8" />
              <TextInput
                style={styles.assignSearchInput}
                placeholder="Rechercher un employé..."
                placeholderTextColor="#94A3B8"
              />
            </View>

            <ScrollView style={styles.modalBody}>
              {employees.length > 0 ? (
                employees.map(employee => {
                  const isAssigned = selectedItem?.assignedTo?.some(
                    (assignment: EmployeeAssignment) => assignment.employeeId === employee.id
                  );
                  
                  return (
                    <TouchableOpacity
                      key={employee.id}
                      style={[
                        styles.employeeCard,
                        isAssigned && styles.employeeCardAssigned
                      ]}
                      onPress={() => {
                        if (isAssigned) {
                          Alert.alert(
                            'Déjà assigné',
                            'Cet employé est déjà assigné à cet espace.',
                            [{ text: 'OK' }]
                          );
                        } else if (selectedItem) {
                          handleAssignEmployee(employee, selectedItem);
                        }
                      }}
                    >
                      <View style={styles.employeeAvatar}>
                        <Ionicons name="person" size={24} color="#3B82F6" />
                      </View>
                      <View style={styles.employeeInfo}>
                        <Text style={styles.employeeName}>
                          {employee.nom || ''} {employee.prenom || ''}
                        </Text>
                        <Text style={styles.employeeRole}>
                          {employee.role || employee.poste || 'Employé'}
                        </Text>
                        {employee.email && (
                          <Text style={styles.employeeEmail}>{employee.email}</Text>
                        )}
                      </View>
                      {isAssigned ? (
                        <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                      ) : (
                        <Ionicons name="add-circle" size={24} color="#3B82F6" />
                      )}
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.noEmployees}>
                  <Ionicons name="people-outline" size={48} color="#CBD5E1" />
                  <Text style={styles.noEmployeesText}>Aucun employé disponible</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal QR Code */}
      <Modal
        visible={showQRModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setShowQRModal(false);
          setSelectedQRCode('');
          setSelectedItemName('');
        }}
      >
        <View style={styles.qrModalOverlay}>
          <View style={styles.qrModalContent}>
            <View style={styles.qrModalHeader}>
              <Text style={styles.qrModalTitle}>QR Code - {selectedItemName}</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowQRModal(false);
                  setSelectedQRCode('');
                  setSelectedItemName('');
                }}
              >
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.qrCodeContainer}>
              {selectedQRCode ? (
                <QRCode
                  value={selectedQRCode}
                  size={250}
                  color="#000000"
                  backgroundColor="#FFFFFF"
                  logoSize={30}
                  logoMargin={2}
                  logoBorderRadius={15}
                  logoBackgroundColor="#FFFFFF"
                />
              ) : (
                <ActivityIndicator size="large" color="#3B82F6" />
              )}
            </View>
            
            <View style={styles.qrModalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => setShowQRModal(false)}
              >
                <Text style={styles.buttonSecondaryText}>Fermer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={() => {
                  Alert.alert('Info', 'Fonctionnalité de partage à implémenter');
                }}
              >
                <Text style={styles.buttonPrimaryText}>Partager</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


{/* Modal Menu d'Actions Rapides */}
<Modal
  visible={showQuickActionMenu}
  animationType="fade"
  transparent={true}
  onRequestClose={() => setShowQuickActionMenu(false)}
>
  <TouchableOpacity 
    style={styles.quickMenuOverlay} 
    activeOpacity={1} 
    onPress={() => setShowQuickActionMenu(false)}
  >
    <View style={styles.quickMenuContainer}>
      <View style={styles.quickMenuHeader}>
        <Text style={styles.quickMenuTitle}>Actions Rapides</Text>
        <Text style={styles.quickMenuSubtitle}>Que souhaitez-vous créer ?</Text>
      </View>

      <View style={styles.quickActionsGrid}>
        {/* Action 1: Nouvel Espace */}
        <TouchableOpacity
          style={[styles.quickActionCard, { backgroundColor: '#EFF6FF' }]}
          onPress={() => {
            setShowQuickActionMenu(false);
            resetEspaceForm();
            setShowEspaceModal(true);
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.quickIconCircle, { backgroundColor: '#3B82F6' }]}>
            <Ionicons name="business" size={28} color="white" />
          </View>
          <View style={styles.quickActionTextContainer}>
            <Text style={[styles.quickActionTitle, { color: '#3B82F6' }]}>
              Nouvel Espace
            </Text>
            <Text style={styles.quickActionSubtitle}>
              Créer un étage, bloc...
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#3B82F6" />
        </TouchableOpacity>

        {/* Action 2: Nouveau Sous-espace */}
        <TouchableOpacity
          style={[styles.quickActionCard, { backgroundColor: '#ECFDF5' }]}
          onPress={() => {
            if (espaces.length === 0) {
              Alert.alert(
                'Aucun espace disponible',
                'Veuillez d\'abord créer un espace parent avant d\'ajouter un sous-espace.'
              );
              return;
            }
            setShowQuickActionMenu(false);
            resetSousEspaceForm();
            setShowSousEspaceModal(true);
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.quickIconCircle, { backgroundColor: '#10B981' }]}>
            <Ionicons name="bed" size={28} color="white" />
          </View>
          <View style={styles.quickActionTextContainer}>
            <Text style={[styles.quickActionTitle, { color: '#10B981' }]}>
              Nouveau Sous-espace
            </Text>
            <Text style={styles.quickActionSubtitle}>
              Ajouter une chambre...
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#10B981" />
        </TouchableOpacity>

        {/* Action 3: Nouvelle Assignation */}
        <TouchableOpacity
          style={[styles.quickActionCard, { backgroundColor: '#FEF3C7' }]}
          onPress={() => {
            const totalItems = espaces.length + sousEspaces.length;
            if (totalItems === 0) {
              Alert.alert(
                'Aucun espace disponible',
                'Veuillez d\'abord créer des espaces avant d\'assigner des employés.'
              );
              return;
            }
            if (employees.length === 0) {
              Alert.alert(
                'Aucun employé disponible',
                'Veuillez d\'abord ajouter des employés dans la section Staff.'
              );
              return;
            }
            setShowQuickActionMenu(false);
            // Vous pouvez ouvrir un modal de sélection d'espace/sous-espace
            Alert.alert(
              'Assignation',
              'Sélectionnez un espace dans la liste ci-dessous pour assigner un employé.',
              [{ text: 'OK' }]
            );
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.quickIconCircle, { backgroundColor: '#F59E0B' }]}>
            <Ionicons name="person-add" size={28} color="white" />
          </View>
          <View style={styles.quickActionTextContainer}>
            <Text style={[styles.quickActionTitle, { color: '#F59E0B' }]}>
              Nouvelle Assignation
            </Text>
            <Text style={styles.quickActionSubtitle}>
              Assigner un employé
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#F59E0B" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.quickMenuCloseButton}
        onPress={() => setShowQuickActionMenu(false)}
      >
        <Text style={styles.quickMenuCloseText}>Annuler</Text>
      </TouchableOpacity>
    </View>
  </TouchableOpacity>
</Modal>



    </View>
  );
};

// --- COMPOSANT CARTE ESPACE PARENT ---
interface EspaceCardProps {
  espace: EspaceParent;
  sousEspaces: SousEspace[];
  isExpanded: boolean;
  onToggle: () => void;
  onAdd: () => void;
  onEdit: () => void;
  onQR: () => void;
  onAssign: () => void;
  onDelete: () => void;
  onEditSousEspace: (se: SousEspace) => void;
  onDeleteSousEspace: (se: SousEspace) => void;
  onQRSousEspace: (se: SousEspace) => void;
  onAssignSousEspace: (se: SousEspace) => void;
  onUnassignEmployee: (employeeId: string) => void;
  onUnassignSousEspaceEmployee: (sousEspaceId: string, employeeId: string) => void;
}

const EspaceCard = React.memo(({
  espace,
  sousEspaces,
  isExpanded,
  onToggle,
  onAdd,
  onEdit,
  onQR,
  onAssign,
  onDelete,
  onEditSousEspace,
  onDeleteSousEspace,
  onQRSousEspace,
  onAssignSousEspace,
  onUnassignEmployee,
  onUnassignSousEspaceEmployee
}: EspaceCardProps) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <TouchableOpacity onPress={onToggle} style={styles.cardInfo}>
        <View style={styles.iconContainer}>
          <Ionicons name="business" size={24} color="#3B82F6" />
          {espace.qrCode && (
            <View style={styles.qrBadge}>
              <Ionicons name="qr-code" size={10} color="white" />
            </View>
          )}
                      
                      
                          
        </View>
        <View style={styles.cardTextContainer}>
          <Text style={styles.espaceNom}>{espace.nom}</Text>

          <View style={styles.assignmentsContainer}>

            {espace.assignedTo && espace.assignedTo.length > 0 ? (
           
           <View style={styles.assignmentsList}>

                 {espace.assignedTo.slice(0, 2).map((assignment, index) => (
                
                <TouchableOpacity 
                    key={index} 
                    style={styles.assignmentBadge}
                    onPress={() => {
                      Alert.alert(
                        'Détails de l\'assignation',
                        `Employé: ${assignment.employeeName}\nRôle: ${assignment.employeeRole || 'Non spécifié'}\nAssigné le: ${formatDate(assignment.assignedAt)}`,
                        [{ text: 'OK' }]
                      );

}} >



               
                    <Text style={styles.assignmentText}>
                      {assignment.employeeName}
                    </Text>
                    <TouchableOpacity 
                      onPress={(e) => {
                        e.stopPropagation();
                        onUnassignEmployee(assignment.employeeId);
                      }}
                      style={styles.unassignButton}
                    >
                      <Ionicons name="close-circle" size={14} color="#EF4444" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}

                            
                {espace.assignedTo.length > 2 && (
                  <Text style={styles.moreAssignmentsText}>
                    +{espace.assignedTo.length - 2} autres
                  </Text>
                )}



              </View>
            ) : (
              <Text style={styles.noAssignmentText}>Non assigné</Text>
            )}
          </View>
          <Text style={styles.espaceSub}>
            {sousEspaces.length} sous-espace{sousEspaces.length > 1 ? 's' : ''}
            {espace.numero && ` • N°${espace.numero}`}
          </Text>
               
                 
        </View>
        <Ionicons
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={20}
          color="#94A3B8" />

      </TouchableOpacity>

    </View>

    {/* Actions principales */}
    <View style={styles.mainActions}>
      <ActionButton icon="add-circle-outline" label="Ajouter" color="#10B981" onPress={onAdd} />
      <ActionButton icon="create-outline" label="Modifier" color="#3B82F6" onPress={onEdit} />
      <ActionButton 
        icon={espace.qrCode ? "qr-code" : "qr-code-outline"} 
        label="QR Code" 
        color="#64748B" 
        onPress={onQR} 
      />
      <ActionButton icon="person-add-outline" label="Assigner" color="#F59E0B" onPress={onAssign} />
      <ActionButton icon="trash-outline" label="Supprimer" color="#EF4444" onPress={onDelete} />
    </View>

    {/* Liste des sous-espaces */}
    {isExpanded && (
      <View style={styles.expandedArea}>
        {sousEspaces.length === 0 ? (
          <View style={styles.noSousEspaces}>
            <Text style={styles.noSousEspacesText}>Aucun sous-espace</Text>
            <TouchableOpacity onPress={onAdd} style={styles.addSousEspaceButton}>
              <Ionicons name="add" size={16} color="#3B82F6" />
              <Text style={styles.addSousEspaceText}>Ajouter un sous-espace</Text>
            </TouchableOpacity>

                            
          </View>



        ) : (
          sousEspaces.map((se: SousEspace) => (
            <SousEspaceRow
              key={se.id}
              sousEspace={se}
              onEdit={() => onEditSousEspace(se)}
              onDelete={() => onDeleteSousEspace(se)}
              onQR={() => onQRSousEspace(se)}
              onAssign={() => onAssignSousEspace(se)}
              onUnassignEmployee={(employeeId) => onUnassignSousEspaceEmployee(se.id, employeeId)}
            />
          ))
        )}
      </View>
    )}



    
  </View>
));

// --- COMPOSANT LIGNE SOUS-ESPACE ---
interface SousEspaceRowProps {
  sousEspace: SousEspace;
  onEdit: () => void;
  onDelete: () => void;
  onQR: () => void;
  onAssign: () => void;
  onUnassignEmployee: (employeeId: string) => void;
}

const SousEspaceRow = React.memo(({
  sousEspace,
  onEdit,
  onDelete,
  onQR,
  onAssign,
  onUnassignEmployee
}: SousEspaceRowProps) => (
  <View style={styles.sousEspaceRow}>
    <View style={styles.sousEspaceInfo}>
      <View>
        <View style={styles.sousEspaceHeader}>
          <Ionicons name="bed-outline" size={18} color="#64748B" />
          <Text style={styles.seText}>
            {sousEspace.numero} - {sousEspace.type}
          </Text>
          {sousEspace.qrCode && (
            <Ionicons name="qr-code" size={14} color="#10B981" style={styles.qrIndicator} />
          )}
        </View>
        {sousEspace.assignedTo && sousEspace.assignedTo.length > 0 && (
          <View style={styles.sousEspaceAssignments}>
            {sousEspace.assignedTo.map((assignment, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.sousAssignmentBadge}
                onPress={() => {
                  Alert.alert(
                    'Détails de l\'assignation',
                    `Employé: ${assignment.employeeName}\nRôle: ${assignment.employeeRole || 'Non spécifié'}\nAssigné le: ${formatDate(assignment.assignedAt)}`,
                    [{ text: 'OK' }]
                  );
                }}
              >
                <Text style={styles.sousAssignmentText} numberOfLines={1}>
                  {assignment.employeeName}
                </Text>
                <TouchableOpacity 
                  onPress={(e) => {
                    e.stopPropagation();
                    onUnassignEmployee(assignment.employeeId);
                  }}
                  style={styles.sousUnassignButton}
                >
                  <Ionicons name="close-circle" size={12} color="#EF4444" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
    <View style={styles.sousEspaceActions}>
      <ActionIcon icon="create-outline" color="#3B82F6" onPress={onEdit} size={18} />
      <ActionIcon 
        icon={sousEspace.qrCode ? "qr-code" : "qr-code-outline"} 
        color={sousEspace.qrCode ? "#10B981" : "#64748B"} 
        onPress={onQR} 
        size={18} 
      />
      <ActionIcon icon="person-add-outline" color="#F59E0B" onPress={onAssign} size={18} />
      <ActionIcon icon="trash-outline" color="#EF4444" onPress={onDelete} size={18} />
    </View>



  

    
  </View>




));

// --- COMPOSANT BOUTON D'ACTION ---
interface ActionButtonProps {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
}

const ActionButton = ({ icon, label, color, onPress }: ActionButtonProps) => (
  <TouchableOpacity onPress={onPress} style={styles.actionButton}>
    <Ionicons name={icon as any} size={20} color={color} />
    <Text style={[styles.actionButtonText, { color }]}>{label}</Text>
  </TouchableOpacity>
);

// --- COMPOSANT ICÔNE D'ACTION ---
interface ActionIconProps {
  icon: string;
  color: string;
  onPress: () => void;
  size?: number;
}

const ActionIcon = ({ icon, color, onPress, size = 22 }: ActionIconProps) => (
  <TouchableOpacity onPress={onPress} style={styles.iconButton}>
    <Ionicons name={icon as any} size={size} color={color} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B'
  },
  header: {
    padding: 20,
    paddingTop: 50,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold'
  },
  addButton: {
    padding: 4
  },
  searchBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    height: 45
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#1E293B'
  },
  listContent: {
    padding: 15,
    paddingBottom: 30
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  emptyText: {
    fontSize: 16,
    color: '#94A3B8',
    marginTop: 16,
    marginBottom: 24
  },
  emptyButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 15,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden'
  },
  cardHeader: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative'
  },
  qrBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#10B981',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
  cardTextContainer: {
    flex: 1,
    marginLeft: 12
  },
  espaceNom: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#1E293B'
  },
  espaceSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2
  },
  mainActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  actionButton: {
    alignItems: 'center',
    paddingVertical: 4
  },
  actionButtonText: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600'
  },
  iconButton: {
    padding: 6,
    borderRadius: 6
  },

  expandedArea: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 15,
    paddingVertical: 10
  },

  noSousEspaces: {
    alignItems: 'center',
    paddingVertical: 20
  },

  noSousEspacesText: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 12
  },

  addSousEspaceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },

  addSousEspaceText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
    marginLeft: 6
  },

  sousEspaceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },

  sousEspaceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },

  sousEspaceHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },

  seText: {
    fontWeight: '600',
    color: '#475569',
    marginLeft: 8,
    fontSize: 14
  },

  qrIndicator: {
    marginLeft: 4
  },

  sousEspaceActions: {
    flexDirection: 'row',
    gap: 12
  },
  
  // Styles pour les assignations
  assignmentsContainer: {
    marginVertical: 4,
  },
  assignmentsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
  },
  assignmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    maxWidth: 120,
  },
  assignmentText: {
    fontSize: 11,
    color: '#1E40AF',
    fontWeight: '500',
    flexShrink: 1,
  },
  unassignButton: {
    marginLeft: 4,
  },
  sousEspaceAssignments: {
    marginTop: 4,
  },
  sousAssignmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 2,
    maxWidth: 100,
  },
  sousAssignmentText: {
    fontSize: 10,
    color: '#0C4A6E',
    flexShrink: 1,
  },
  sousUnassignButton: {
    marginLeft: 2,
  },
  noAssignmentText: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  moreAssignmentsText: {
    fontSize: 11,
    color: '#64748B',
    marginLeft: 4,
  },
// modal menue
   overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  // Styles des modales
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B'
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4
  },
  modalBody: {
    maxHeight: '60%',
    paddingHorizontal: 20
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 12
  },
  // Formulaires
  formGroup: {
    marginTop: 20
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1E293B'
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  typeOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  typeOptionActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6'
  },
  typeText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500'
  },
  typeTextActive: {
    color: '#3B82F6',
    fontWeight: '600'
  },
  // Boutons
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48
  },
  buttonPrimary: {
    backgroundColor: '#3B82F6'
  },
  buttonSecondary: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  buttonPrimaryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  buttonSecondaryText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '600'
  },
  noDataText: {
    fontSize: 14,
    color: '#94A3B8',
    fontStyle: 'italic',
    paddingVertical: 12
  },
  // Picker personnalisé
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12
  },
  pickerWrapper: {
    flex: 1,
    marginLeft: 10
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 6
  },
  pickerOptionSelected: {
    backgroundColor: '#EFF6FF'
  },
  pickerText: {
    fontSize: 15,
    color: '#475569'
  },
  pickerTextSelected: {
    color: '#3B82F6',
    fontWeight: '600'
  },
  // Modal d'assignation
  assignSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginHorizontal: 20,
    marginTop: 15,
    height: 42
  },
  assignSearchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: '#1E293B'
  },
  employeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 15,
    marginTop: 15
  },
  employeeCardAssigned: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC'
  },
  employeeAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center'
  },
  employeeInfo: {
    flex: 1,
    marginLeft: 12
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B'
  },
  employeeRole: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2
  },
  employeeEmail: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2
  },

  noEmployees: {
    alignItems: 'center',
    paddingVertical: 40
  },

  noEmployeesText: {
    fontSize: 15,
    color: '#94A3B8',
    marginTop: 12
  },

  currentAssignments: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
    fontStyle: 'italic',
  },

  // Styles pour le modal QR Code
  qrModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  qrModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  qrModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    flex: 1,
  },
  qrCodeContainer: {
    padding: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 15,
    marginVertical: 20,
  },
  qrModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 10,
  },


  // Styles pour le nouveau bouton FAB
fabButton: {
  width: 48,
  height: 48,
  borderRadius: 24,
  backgroundColor: 'white',
  justifyContent: 'center',
  alignItems: 'center',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 8
},

// Styles du Menu d'Actions Rapides
quickMenuOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  justifyContent: 'center',
  alignItems: 'center',
  padding: 20
},
quickMenuContainer: {
  backgroundColor: 'white',
  borderRadius: 24,
  padding: 24,
  width: '100%',
  maxWidth: 400,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.3,
  shadowRadius: 20,
  elevation: 10
},
quickMenuHeader: {
  alignItems: 'center',
  marginBottom: 24
},
quickMenuTitle: {
  fontSize: 24,
  fontWeight: 'bold',
  color: '#1E293B',
  marginBottom: 8
},
quickMenuSubtitle: {
  fontSize: 14,
  color: '#64748B',
  textAlign: 'center'
},
quickActionsGrid: {
  gap: 12,
  marginBottom: 20
},
quickActionCard: {
  padding: 16,
  borderRadius: 16,
  alignItems: 'center',
  flexDirection: 'row',
  gap: 12,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 2
},
quickIconCircle: {
  width: 56,
  height: 56,
  borderRadius: 28,
  justifyContent: 'center',
  alignItems: 'center',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.15,
  shadowRadius: 4,
  elevation: 3
},
quickActionTextContainer: {
  flex: 1
},
quickActionTitle: {
  fontSize: 16,
  fontWeight: '700',
  marginBottom: 2
},
quickActionSubtitle: {
  fontSize: 12,
  color: '#64748B'
},
quickMenuCloseButton: {
  backgroundColor: '#F1F5F9',
  paddingVertical: 14,
  borderRadius: 12,
  alignItems: 'center'
},
quickMenuCloseText: {
  fontSize: 16,
  fontWeight: '600',
  color: '#64748B'
}


});

export default GestionEspacesHierarchie;