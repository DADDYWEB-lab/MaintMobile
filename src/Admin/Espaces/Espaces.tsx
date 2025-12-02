// GestionEspacesHierarchie.tsx
// @ts-nocheck

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
  Platform,
  Dimensions,
  Animated
} from 'react-native';
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const GestionEspacesHierarchie = ({ navigation }: any) => {
  const [espaces, setEspaces] = useState([]);
  const [sousEspaces, setSousEspaces] = useState([]);
  const [categories, setCategories] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategorie, setFilterCategorie] = useState('all');
  const [expandedEspaces, setExpandedEspaces] = useState({});

  const [showEspaceModal, setShowEspaceModal] = useState(false);
  const [showSousEspaceModal, setShowSousEspaceModal] = useState(false);
  const [showCategorieModal, setShowCategorieModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  const [selectedEspace, setSelectedEspace] = useState(null);
  const [selectedSousEspace, setSelectedSousEspace] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [qrCodeData, setQrCodeData] = useState({ valeur: '', titre: '' });

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  // Formulaires (inchangés)
  const [espaceForm, setEspaceForm] = useState({
    nom: '',
    type: 'etage',
    numero: '',
    categorieId: '',
    description: ''
  });

  const [sousEspaceForm, setSousEspaceForm] = useState({
    nom: '',
    numero: '',
    type: 'chambre',
    espaceParentId: '',
    superficie: '',
    capacite: '',
    statut: 'libre',
    equipements: []
  });

  const [categorieForm, setCategorieForm] = useState({
    nom: '',
    type: 'public',
    couleur: '#3B82F6',
    icone: '🏢'
  });

  const [assignForm, setAssignForm] = useState({
    employeId: '',
    typeTache: 'nettoyage',
    dateDebut: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Données statiques (inchangées)
  const typesTache = [
    { value: 'nettoyage', label: 'Nettoyage' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'electricite', label: 'Électricité' },
    { value: 'plomberie', label: 'Plomberie' },
    { value: 'reception', label: 'Réception' },
    { value: 'securite', label: 'Sécurité' },
    { value: 'menage', label: 'Femme de ménage' },
    { value: 'technique', label: 'Technique' }
  ];

  const categoriesDefaut = [
    {
      id: 'public_client',
      nom: 'Public - Client',
      type: 'public',
      couleur: '#3B82F6',
      icone: '👥',
      exemples: 'Chambres, Restaurant, Piscine, Spa'
    },
    {
      id: 'public_commun',
      nom: 'Public - Commun',
      type: 'public',
      couleur: '#10B981',
      icone: '🚪',
      exemples: 'Hall, Couloirs, Toilettes publiques, Parking'
    },
    {
      id: 'professionnel_technique',
      nom: 'Professionnel - Technique',
      type: 'professionnel',
      couleur: '#F59E0B',
      icone: '🏢',
      exemples: 'Cuisine, Lingerie, Local technique, Chaufferie'
    },
    {
      id: 'professionnel_personnel',
      nom: 'Professionnel - Personnel',
      type: 'professionnel',
      couleur: '#8B5CF6',
      icone: '🚿',
      exemples: 'Vestiaires, Douches staff, Salle de pause, Bureau'
    }
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
    { value: 'lingerie', label: 'Lingerie', icon: '🧺' },
    { value: 'douche_personnel', label: 'Douche Personnel', icon: '🚿' }
  ];

  // Récupérer les données (inchangé)
  useEffect(() => {
    const unsubEspaces = onSnapshot(query(collection(db, 'espaces')), (snapshot) => {
      setEspaces(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubSousEspaces = onSnapshot(query(collection(db, 'sous_espaces')), (snapshot) => {
      setSousEspaces(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubCategories = onSnapshot(query(collection(db, 'categories_espaces')), (snapshot) => {
      const customCats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCategories([...categoriesDefaut, ...customCats]);
    });

    const unsubEmployees = onSnapshot(query(collection(db, 'staff')), (snapshot) => {
      setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubEspaces();
      unsubSousEspaces();
      unsubCategories();
      unsubEmployees();
    };
  }, []);

  // Fonctions métier (inchangées)
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const getSousEspacesByParent = (parentId) => {
    return sousEspaces.filter(se => se.espaceParentId === parentId);
  };

  const getCategorieById = (catId) => {
    return categories.find(c => c.id === catId);
  };

  const toggleExpand = (espaceId) => {
    setExpandedEspaces(prev => ({ ...prev, [espaceId]: !prev[espaceId] }));
  };

  const resetEspaceForm = () => {
    setEspaceForm({ nom: '', type: 'etage', numero: '', categorieId: '', description: '' });
    setSelectedEspace(null);
  };

  const resetSousEspaceForm = () => {
    setSousEspaceForm({
      nom: '',
      numero: '',
      type: 'chambre',
      espaceParentId: '',
      superficie: '',
      capacite: '',
      statut: 'libre',
      equipements: []
    });
    setSelectedSousEspace(null);
  };

  const resetCategorieForm = () => {
    setCategorieForm({ nom: '', type: 'public', couleur: '#3B82F6', icone: '🏢' });
  };

  const resetAssignForm = () => {
    setAssignForm({
      employeId: '',
      typeTache: 'nettoyage',
      dateDebut: new Date().toISOString().split('T')[0],
      notes: ''
    });
  };

  // Fonctions de gestion (handleSubmitEspace, handleSubmitSousEspace, etc.) restent inchangées
  // ... (conserver toutes les fonctions métier existantes)

  // Ajouter/Modifier Espace parent
  const handleSubmitEspace = async () => {
    if (!espaceForm.nom || !espaceForm.categorieId) {
      Alert.alert('Erreur', 'Veuillez remplir les champs obligatoires');
      return;
    }

    setIsSubmitting(true);
    try {
      const espaceData = {
        ...espaceForm,
        updatedAt: serverTimestamp()
      };

      if (selectedEspace) {
        await updateDoc(doc(db, 'espaces', selectedEspace.id), espaceData);
        Alert.alert('Succès', 'Espace modifié !');
      } else {
        const docRef = await addDoc(collection(db, 'espaces'), {
          ...espaceData,
          createdAt: serverTimestamp()
        });
        Alert.alert('Succès', 'Espace créé !');

        setQrCodeData({
          valeur: docRef.id,
          titre: espaceForm.nom
        });
        setShowQRModal(true);
      }

      setShowEspaceModal(false);
      resetEspaceForm();
    } catch (error) {
      console.error('Erreur:', error);
      Alert.alert('Erreur', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ajouter/Modifier Sous-espace
  const handleSubmitSousEspace = async () => {
    if (!sousEspaceForm.numero || !sousEspaceForm.espaceParentId) {
      Alert.alert('Erreur', 'Veuillez remplir les champs obligatoires');
      return;
    }

    setIsSubmitting(true);
    try {
      const sousEspaceData = {
        ...sousEspaceForm,
        updatedAt: serverTimestamp()
      };

      if (selectedSousEspace) {
        await updateDoc(doc(db, 'sous_espaces', selectedSousEspace.id), sousEspaceData);
        Alert.alert('Succès', 'Sous-espace modifié !');
      } else {
        const docRef = await addDoc(collection(db, 'sous_espaces'), {
          ...sousEspaceData,
          createdAt: serverTimestamp()
        });
        Alert.alert('Succès', 'Sous-espace créé !');

        setQrCodeData({
          valeur: docRef.id,
          titre: `${sousEspaceForm.numero} - ${sousEspaceForm.nom || ''}`
        });
        setShowQRModal(true);
      }

      setShowSousEspaceModal(false);
      resetSousEspaceForm();
    } catch (error) {
      console.error('Erreur:', error);
      Alert.alert('Erreur', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ajouter catégorie personnalisée
  const handleSubmitCategorie = async () => {
    if (!categorieForm.nom) {
      Alert.alert('Erreur', 'Veuillez entrer un nom');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'categories_espaces'), {
        ...categorieForm,
        custom: true,
        createdAt: serverTimestamp()
      });
      Alert.alert('Succès', 'Catégorie ajoutée !');
      setShowCategorieModal(false);
      resetCategorieForm();
    } catch (error) {
      console.error('Erreur:', error);
      Alert.alert('Erreur', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Assigner un employé
  const handleAssign = async () => {
    if (!assignForm.employeId) {
      Alert.alert('Erreur', 'Veuillez sélectionner un employé');
      return;
    }

    setIsSubmitting(true);
    try {
      const employe = employees.find(e => e.id === assignForm.employeId);
      const nouvelleAssignation = {
        employeId: employe.id,
        employeUid: employe.uid,
        employeNom: employe.name,
        employeRole: employe.role,
        typeTache: assignForm.typeTache,
        dateDebut: assignForm.dateDebut,
        notes: assignForm.notes,
        assigneLe: new Date().toISOString()
      };

      if (selectedEspace) {
        const espaceDoc = espaces.find(e => e.id === selectedEspace.id);
        const assignationsExistantes = espaceDoc.assignations || [];

        const dejaAssigné = assignationsExistantes.some(
          assign => assign.employeId === employe.id && assign.typeTache === assignForm.typeTache
        );

        if (dejaAssigné) {
          Alert.alert('Attention', 'Cet employé est déjà assigné à cette tâche pour cet espace');
          return;
        }

        await updateDoc(doc(db, 'espaces', selectedEspace.id), {
          assignations: [...assignationsExistantes, nouvelleAssignation],
          updatedAt: serverTimestamp()
        });
      } else if (selectedSousEspace) {
        const sousEspaceDoc = sousEspaces.find(se => se.id === selectedSousEspace.id);
        const assignationsExistantes = sousEspaceDoc.assignations || [];

        const dejaAssigné = assignationsExistantes.some(
          assign => assign.employeId === employe.id && assign.typeTache === assignForm.typeTache
        );

        if (dejaAssigné) {
          Alert.alert('Attention', 'Cet employé est déjà assigné à cette tâche pour ce sous-espace');
          return;
        }

        await updateDoc(doc(db, 'sous_espaces', selectedSousEspace.id), {
          assignations: [...assignationsExistantes, nouvelleAssignation],
          updatedAt: serverTimestamp()
        });
      }

      Alert.alert('Succès', 'Assignation réussie !');
      setShowAssignModal(false);
      setSelectedEspace(null);
      setSelectedSousEspace(null);
      resetAssignForm();
    } catch (error) {
      console.error('Erreur:', error);
      Alert.alert('Erreur', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Retirer une assignation
  const handleRemoveAssignation = async (espaceId, isSousEspace = false, assignationIndex) => {
    Alert.alert(
      'Confirmation',
      'Retirer cette assignation ?',
      [
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

              const nouvellesAssignations = docData.assignations.filter((_, index) => index !== assignationIndex);

              await updateDoc(docRef, {
                assignations: nouvellesAssignations,
                updatedAt: serverTimestamp()
              });

              Alert.alert('Succès', 'Assignation retirée !');
            } catch (error) {
              console.error('Erreur:', error);
              Alert.alert('Erreur', error.message);
            }
          }
        }
      ]
    );
  };

  // Supprimer un espace
  const handleDeleteEspace = async (espace) => {
    const sousEspacesCount = getSousEspacesByParent(espace.id).length;

    Alert.alert(
      'Confirmer la suppression',
      `Êtes-vous sûr de vouloir supprimer l'espace "${espace.nom}" ?\n\n` +
      `Cette action supprimera :\n` +
      `• L'espace parent\n` +
      `• ${sousEspacesCount} sous-espace(s)\n` +
      `• Toutes les assignations\n\n` +
      `Cette action est irréversible !`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSubmitting(true);

              const sousEspacesAssocies = getSousEspacesByParent(espace.id);
              const deletePromises = sousEspacesAssocies.map(sousEspace =>
                deleteDoc(doc(db, 'sous_espaces', sousEspace.id))
              );

              deletePromises.push(deleteDoc(doc(db, 'espaces', espace.id)));

              await Promise.all(deletePromises);

              Alert.alert('Succès', 'Espace et sous-espaces supprimés !');
            } catch (error) {
              console.error('Erreur:', error);
              Alert.alert('Erreur', error.message);
            } finally {
              setIsSubmitting(false);
            }
          }
        }
      ]
    );
  };

  // Supprimer un sous-espace
  const handleDeleteSousEspace = async (sousEspace) => {
    Alert.alert(
      'Confirmer la suppression',
      `Supprimer le sous-espace "${sousEspace.numero}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'sous_espaces', sousEspace.id));
              Alert.alert('Succès', 'Sous-espace supprimé !');
            } catch (error) {
              Alert.alert('Erreur', error.message);
            }
          }
        }
      ]
    );
  };

  // Filtrage et statistiques
  const filteredEspaces = useMemo(() => {
    return espaces.filter(espace => {
      const matchSearch = espace.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        espace.numero?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategorie = filterCategorie === 'all' || espace.categorieId === filterCategorie;
      return matchSearch && matchCategorie;
    });
  }, [espaces, searchTerm, filterCategorie]);

  const totalAssignations = useMemo(() => {
    return [...espaces, ...sousEspaces].reduce((total, item) =>
      total + (item.assignations ? item.assignations.length : 0), 0
    );
  }, [espaces, sousEspaces]);

  const stats = useMemo(() => {
    return {
      public: espaces.filter(e => {
        const cat = getCategorieById(e.categorieId);
        return cat?.type === 'public';
      }).length,
      professionnel: espaces.filter(e => {
        const cat = getCategorieById(e.categorieId);
        return cat?.type === 'professionnel';
      }).length,
      sousEspaces: sousEspaces.length,
      assignations: totalAssignations
    };
  }, [espaces, sousEspaces, totalAssignations, categories]);

  // Composants UI améliorés
  const StatCard = ({ icon, label, value, colors }) => (
    <Animated.View
      style={[
        styles.statCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <LinearGradient
        colors={colors}
        style={styles.statGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.statContent}>
          <Text style={styles.statIcon}>{icon}</Text>
          <View style={styles.statTextContainer}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const EspaceCard = ({ espace }) => {
    const categorie = getCategorieById(espace.categorieId);
    const sousEspacesEnfants = getSousEspacesByParent(espace.id);
    const isExpanded = expandedEspaces[espace.id];

    return (
      <Animated.View
        style={[
          styles.espaceCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <LinearGradient
          colors={[categorie?.couleur || '#6B7280', darkenColor(categorie?.couleur || '#6B7280', 20)]}
          style={styles.espaceHeader}
        >
          <TouchableOpacity
            style={styles.espaceHeaderContent}
            onPress={() => toggleExpand(espace.id)}
          >
            <View style={styles.espaceInfo}>
              <Text style={styles.espaceIcon}>{categorie?.icone || '🏢'}</Text>
              <View style={styles.espaceTextContainer}>
                <Text style={styles.espaceNom}>
                  {espace.nom} {espace.numero && `- ${espace.numero}`}
                </Text>
                <View style={styles.espaceTags}>
                  <Text style={styles.tagText}>{espace.type}</Text>
                  <Text style={styles.tagText}>•</Text>
                  <Text style={styles.tagText}>{categorie?.nom}</Text>
                  <Text style={styles.tagText}>•</Text>
                  <Text style={styles.tagText}>{sousEspacesEnfants.length} sous-espaces</Text>
                  {espace.assignations && espace.assignations.length > 0 && (
                    <>
                      <Text style={styles.tagText}>•</Text>
                      <Text style={styles.tagText}>{espace.assignations.length} assign.</Text>
                    </>
                  )}
                </View>
              </View>
            </View>

            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={20}
              color="white"
            />
          </TouchableOpacity>
        </LinearGradient>

        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.quickAction}
                onPress={() => {
                  setQrCodeData({ valeur: espace.id, titre: espace.nom });
                  setShowQRModal(true);
                }}
              >
                <Ionicons name="qr-code" size={16} color="#3B82F6" />
                <Text style={styles.quickActionText}>QR Code</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickAction}
                onPress={() => {
                  setSelectedEspace(espace);
                  setSelectedSousEspace(null);
                  setShowAssignModal(true);
                }}
              >
                <Ionicons name="person-add" size={16} color="#10B981" />
                <Text style={styles.quickActionText}>Assigner</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickAction}
                onPress={() => {
                  resetSousEspaceForm();
                  setSousEspaceForm(prev => ({ ...prev, espaceParentId: espace.id }));
                  setShowSousEspaceModal(true);
                }}
              >
                <Ionicons name="add-circle" size={16} color="#F59E0B" />
                <Text style={styles.quickActionText}>Sous-espace</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickAction, styles.deleteAction]}
                onPress={() => handleDeleteEspace(espace)}
                disabled={isSubmitting}
              >
                <Ionicons name="trash" size={16} color="#EF4444" />
                <Text style={styles.quickActionText}>Supprimer</Text>
              </TouchableOpacity>
            </View>

            {espace.assignations && espace.assignations.length > 0 && (
              <View style={styles.assignationsContainer}>
                <Text style={styles.assignationsTitle}>Assignations en cours</Text>
                {espace.assignations.map((assignation, index) => (
                  <View key={index} style={styles.assignationItem}>
                    <View style={styles.assignationInfo}>
                      <Ionicons name="person" size={14} color="#6B7280" />
                      <Text style={styles.assignationText}>
                        {assignation.employeNom} - {assignation.typeTache}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemoveAssignation(espace.id, false, index)}
                    >
                      <Ionicons name="close" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {sousEspacesEnfants.length > 0 && (
              <View style={styles.sousEspacesContainer}>
                <Text style={styles.sousEspacesTitle}>Sous-espaces</Text>
                {sousEspacesEnfants.map(sousEspace => (
                  <SousEspaceCard
                    key={sousEspace.id}
                    sousEspace={sousEspace}
                    onEdit={setSelectedSousEspace}
                    onAssign={setSelectedSousEspace}
                    onShowQR={setQrCodeData}
                    onDelete={handleDeleteSousEspace}
                    onRemoveAssignation={handleRemoveAssignation}
                  />
                ))}
              </View>
            )}
          </View>
        )}
      </Animated.View>
    );
  };

  const SousEspaceCard = ({ sousEspace, onEdit, onAssign, onShowQR, onDelete, onRemoveAssignation }) => (
    <View style={styles.sousEspaceCard}>
      <View style={styles.sousEspaceMain}>
        <Text style={styles.sousEspaceIcon}>
          {typesSousEspace.find(t => t.value === sousEspace.type)?.icon || '🛏️'}
        </Text>

        <View style={styles.sousEspaceDetails}>
          <Text style={styles.sousEspaceNom}>
            {sousEspace.numero} {sousEspace.nom && `- ${sousEspace.nom}`}
          </Text>
          <Text style={styles.sousEspaceInfo}>
            {sousEspace.type}
            {sousEspace.superficie && ` • ${sousEspace.superficie}m²`}
            {sousEspace.capacite && ` • ${sousEspace.capacite} pers.`}
            {sousEspace.statut && ` • ${sousEspace.statut}`}
          </Text>

          {sousEspace.assignations && sousEspace.assignations.length > 0 && (
            <View style={styles.sousEspaceAssignations}>
              {sousEspace.assignations.map((assignation, index) => (
                <View key={index} style={styles.sousEspaceAssignItem}>
                  <View style={styles.assignationInfo}>
                    <Ionicons name="person" size={12} color="#6B7280" />
                    <Text style={styles.sousEspaceAssignText}>
                      {assignation.employeNom} ({assignation.typeTache})
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.sousEspaceRemoveButton}
                    onPress={() => onRemoveAssignation(sousEspace.id, true, index)}
                  >
                    <Ionicons name="close" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      <View style={styles.sousEspaceActions}>
        <TouchableOpacity
          style={styles.sousEspaceActionBtn}
          onPress={() => onShowQR({
            valeur: sousEspace.id,
            titre: `${sousEspace.numero} - ${sousEspace.nom || ''}`
          })} >
            
          <Ionicons name="qr-code" size={14} color="#FFFFFF" />
        </TouchableOpacity>


        <TouchableOpacity
          style={styles.sousEspaceActionBtn}
          onPress={() => {
            onAssign(sousEspace);
            setShowAssignModal(true);
          }} >

          <Ionicons name="person-add" size={14} color="#FFFFFF" />

        </TouchableOpacity>


        <TouchableOpacity
          style={[styles.sousEspaceActionBtn, { backgroundColor: '#F59E0B' }]}
          onPress={() => {
            onEdit(sousEspace);
            setSousEspaceForm({
              nom: sousEspace.nom || '',
              numero: sousEspace.numero || '',
              type: sousEspace.type || 'chambre',
              espaceParentId: sousEspace.espaceParentId || '',
              superficie: sousEspace.superficie || '',
              capacite: sousEspace.capacite || '',
              statut: sousEspace.statut || 'libre',
              equipements: sousEspace.equipements || []
            });
            setShowSousEspaceModal(true);
          }}
        >
          <Ionicons name="create" size={14} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sousEspaceActionBtn, { backgroundColor: '#EF4444' }]}
          onPress={() => onDelete(sousEspace)}
        >
          <Ionicons name="trash" size={14} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Fonction utilitaire
  const darkenColor = (color, percent) => {
    return color;
  };

  return (
    <View style={styles.container}>
      {/* Header avec dégradé */}
      <LinearGradient
        colors={['#1E40AF', '#3B82F6']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.title}>Gestion des Espaces</Text>
              <Text style={styles.subtitle}>Organisation hiérarchique</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => {
                  resetEspaceForm();
                  setShowEspaceModal(true);
                }}
              >
                <Ionicons name="business" size={20} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => setShowCategorieModal(true)}
              >
                <Ionicons name="pricetag" size={18} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats Cards */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsContainer}
          >
            <StatCard icon="👥" label="Publics" value={stats.public} colors={['#6366F1', '#8B5CF6']} />
            <StatCard icon="🏢" label="Professionnels" value={stats.professionnel} colors={['#F59E0B', '#D97706']} />
            <StatCard icon="🛏️" label="Sous-espaces" value={stats.sousEspaces} colors={['#10B981', '#059669']} />
            <StatCard icon="👤" label="Assignations" value={stats.assignations} colors={['#8B5CF6', '#7C3AED']} />
          </ScrollView>
        </View>
      </LinearGradient>

      {/* Barre de recherche et filtres */}
      <View style={styles.filtersSection}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un espace..."
            placeholderTextColor="#9CA3AF"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesFilter}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              filterCategorie === 'all' && styles.filterChipActive
            ]}
            onPress={() => setFilterCategorie('all')}
          >
            <Text style={[
              styles.filterChipText,
              filterCategorie === 'all' && styles.filterChipTextActive
            ]}>
              Toutes
            </Text>
          </TouchableOpacity>

          {categoriesDefaut.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.filterChip,
                { borderColor: cat.couleur },
                filterCategorie === cat.id && { backgroundColor: cat.couleur }
              ]}
              onPress={() => setFilterCategorie(cat.id)}
            >
              <Text style={[
                styles.filterChipText,
                filterCategorie === cat.id && styles.filterChipTextActive
              ]}>
                {cat.icone} {cat.nom}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Liste des espaces */}
      <ScrollView
        style={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3B82F6']}
            tintColor="#3B82F6"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredEspaces.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="business-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>Aucun espace trouvé</Text>
            <Text style={styles.emptyText}>
              {
                searchTerm || filterCategorie !== 'all'
                  ? 'Aucun résultat pour votre recherche'
                  : 'Créez votre premier espace pour commencer'
              }
            </Text>


            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => {
                resetEspaceForm();
                setShowEspaceModal(true);
              }}   >


              <Text style={styles.emptyButtonText}>Créer un espace</Text>
            </TouchableOpacity>
          </View>

        ) : (
          <View style={styles.espacesList}>
            {filteredEspaces.map(espace => (
              <EspaceCard key={espace.id} espace={espace} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modals avec style amélioré */}
      {/* Les modals conservent la même structure mais avec le nouveau style */}



      {/* Modal Espace Parent */}
      <Modal visible={showEspaceModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedEspace ? 'Modifier l\'espace' : 'Nouvel Espace'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowEspaceModal(false);
                  resetEspaceForm();
                }}  >


                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>


            <ScrollView style={styles.modalBody}>
              {/* Formulaire espace avec style amélioré */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Nom de l'espace *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Rez-de-chaussée"
                  value={espaceForm.nom}
                  onChangeText={(text) => setEspaceForm({ ...espaceForm, nom: text })}
                />
              </View>

              {/* ... reste du formulaire inchangé mais avec le nouveau style */}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowEspaceModal(false);
                  resetEspaceForm();
                }}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleSubmitEspace}
                disabled={isSubmitting}
              >
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? 'Enregistrement...' : (selectedEspace ? 'Modifier' : 'Créer')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Autres modals (SousEspace, Catégorie, Assignation, QR) avec le même style moderne */}
    </View>
  );
};



// Styles modernisés
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  header: {
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },

  headerContent: {
    marginTop: 10,
  },

  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  statGradient: {
    padding: 16,
    borderRadius: 16,
    minWidth: 120,
    height: 80,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  statTextContainer: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  filtersSection: {
    backgroundColor: 'white',
    padding: 20,
    marginHorizontal: 20,
    marginTop: -20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  categoriesFilter: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: 'white',
  },
  filterChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterChipText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: 'white',
  },
  listContainer: {
    flex: 1,
    padding: 20,
  },
  espacesList: {
    gap: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: 'white',
    borderRadius: 16,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  emptyButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  espaceCard: {
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },

  espaceHeader: {
    padding: 20,
  },

  espaceHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  espaceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  espaceIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  espaceTextContainer: {
    flex: 1,
  },
  espaceNom: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 6,
  },
  espaceTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  tagText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
    marginRight: 8,
    opacity: 0.9,
  },
  expandedContent: {
    padding: 20,
    backgroundColor: '#F9FAFB',
    gap: 16,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  quickAction: {
    flex: 1,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  deleteAction: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  assignationsContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  assignationsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 12,
  },
  assignationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    marginBottom: 8,
  },
  assignationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  assignationText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  removeButton: {
    backgroundColor: '#EF4444',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sousEspacesContainer: {
    gap: 12,
  },
  sousEspacesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  sousEspaceCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sousEspaceMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sousEspaceIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  sousEspaceDetails: {
    flex: 1,
  },
  sousEspaceNom: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  sousEspaceInfo: {
    fontSize: 12,
    color: '#6B7280',
  },
  sousEspaceAssignations: {
    marginTop: 8,
    gap: 6,
  },
  sousEspaceAssignItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  sousEspaceAssignText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
    marginLeft: 4,
  },
  sousEspaceRemoveButton: {
    backgroundColor: '#EF4444',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sousEspaceActions: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 12,
  },
  sousEspaceActionBtn: {
    backgroundColor: '#3B82F6',
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Styles pour les modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    maxHeight: 400,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1F2937',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#6B7280',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default GestionEspacesHierarchie;