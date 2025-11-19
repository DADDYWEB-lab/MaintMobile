// GestionEspacesHierarchie.tsx
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
  Alert,
  RefreshControl,
  Platform,
  Dimensions
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

  // Formulaire Espace (parent)
  const [espaceForm, setEspaceForm] = useState({
    nom: '',
    type: 'etage',
    numero: '',
    categorieId: '',
    description: ''
  });

  // Formulaire Sous-espace (enfant)
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

  // Formulaire catégorie personnalisée
  const [categorieForm, setCategorieForm] = useState({
    nom: '',
    type: 'public',
    couleur: '#3B82F6',
    icone: '🏢'
  });

  // Formulaire assignation
  const [assignForm, setAssignForm] = useState({
    employeId: '',
    typeTache: 'nettoyage',
    dateDebut: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Types de tâches disponibles
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

  // Catégories par défaut
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

  // Récupérer les données
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
        
        // Ouvrir la modale QR Code
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

  const toggleExpand = (espaceId) => {
    setExpandedEspaces(prev => ({ ...prev, [espaceId]: !prev[espaceId] }));
  };

  const getSousEspacesByParent = (parentId) => {
    return sousEspaces.filter(se => se.espaceParentId === parentId);
  };

  const getCategorieById = (catId) => {
    return categories.find(c => c.id === catId);
  };

  const filteredEspaces = useMemo(() => {
    return espaces.filter(espace => {
      const matchSearch = espace.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        espace.numero?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategorie = filterCategorie === 'all' || espace.categorieId === filterCategorie;
      return matchSearch && matchCategorie;
    });
  }, [espaces, searchTerm, filterCategorie]);

  // Statistiques
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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  // Composant Carte Statistique
  const StatCard = ({ icon, label, value, colors }) => (
    <View style={[styles.statCard, { backgroundColor: colors[0] }]}>
      <View style={styles.statHeader}>
        <Text style={styles.statIcon}>{icon}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );

  // Composant Carte Espace
  const EspaceCard = ({ espace }) => {
    const categorie = getCategorieById(espace.categorieId);
    const sousEspacesEnfants = getSousEspacesByParent(espace.id);
    const isExpanded = expandedEspaces[espace.id];

    return (
      <View style={[styles.espaceCard, { borderColor: categorie?.couleur || '#E5E7EB' }]}>
        {/* Header Espace */}
        <View style={[styles.espaceHeader, { backgroundColor: categorie?.couleur || '#6B7280' }]}>
          <View style={styles.espaceHeaderContent}>
            <View style={styles.espaceInfo}>
              <Text style={styles.espaceIcon}>{categorie?.icone || '🏢'}</Text>
              <View style={styles.espaceTextContainer}>
                <Text style={styles.espaceNom}>
                  {espace.nom} {espace.numero && `- ${espace.numero}`}
                </Text>
                <View style={styles.espaceTags}>
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{espace.type}</Text>
                  </View>
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{categorie?.nom}</Text>
                  </View>
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{sousEspacesEnfants.length} sous-espace(s)</Text>
                  </View>
                  {espace.assignations && espace.assignations.length > 0 && (
                    <View style={[styles.tag, { backgroundColor: 'rgba(34, 197, 94, 0.3)' }]}>
                      <Text style={styles.tagText}>{espace.assignations.length} assignation(s)</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Boutons d'action */}
            <View style={styles.espaceActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  setQrCodeData({ valeur: espace.id, titre: espace.nom });
                  setShowQRModal(true);
                }}
              >
                <Text style={styles.actionButtonText}>📱 QR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  setSelectedEspace(espace);
                  setSelectedSousEspace(null);
                  setShowAssignModal(true);
                }}
              >
                <Text style={styles.actionButtonText}>👤 Assigner</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  setSousEspaceForm({ ...sousEspaceForm, espaceParentId: espace.id });
                  setShowSousEspaceModal(true);
                }}
              >
                <Text style={styles.actionButtonText}>➕ Sous-espace</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: 'rgba(239,68,68,0.8)' }]}
                onPress={() => handleDeleteEspace(espace)}
                disabled={isSubmitting}
              >
                <Text style={styles.actionButtonText}>🗑️</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => toggleExpand(espace.id)}
              >
                <Text style={styles.actionButtonText}>{isExpanded ? '▲' : '▼'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Assignations Espace */}
          {espace.assignations && espace.assignations.length > 0 && (
            <View style={styles.assignationsContainer}>
              <Text style={styles.assignationsTitle}>Assignations :</Text>
              {espace.assignations.map((assignation, index) => (
                <View key={index} style={styles.assignationItem}>
                  <Text style={styles.assignationText}>
                    ✓ {assignation.employeNom} ({assignation.typeTache})
                  </Text>
                  <Text style={styles.assignationDate}>
                    depuis {new Date(assignation.dateDebut).toLocaleDateString()}
                  </Text>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveAssignation(espace.id, false, index)}
                  >
                    <Text style={styles.removeButtonText}>Retirer</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Liste des sous-espaces */}
        {isExpanded && sousEspacesEnfants.length > 0 && (
          <View style={styles.sousEspacesContainer}>
            {sousEspacesEnfants.map(sousEspace => (
              <View key={sousEspace.id} style={styles.sousEspaceCard}>
                <View style={styles.sousEspaceInfo}>
                  <Text style={styles.sousEspaceIcon}>🛏️</Text>
                  <View style={styles.sousEspaceDetails}>
                    <Text style={styles.sousEspaceNom}>
                      {sousEspace.numero} {sousEspace.nom && `- ${sousEspace.nom}`}
                    </Text>
                    <Text style={styles.sousEspaceType}>
                      {sousEspace.type}
                      {sousEspace.superficie && ` • ${sousEspace.superficie}m²`}
                      {sousEspace.capacite && ` • ${sousEspace.capacite} pers.`}
                      {sousEspace.statut && ` • ${sousEspace.statut}`}
                    </Text>

                    {/* Assignations Sous-espace */}
                    {sousEspace.assignations && sousEspace.assignations.length > 0 && (
                      <View style={styles.sousEspaceAssignations}>
                        <Text style={styles.sousEspaceAssignTitle}>Assignations :</Text>
                        {sousEspace.assignations.map((assignation, index) => (
                          <View key={index} style={styles.sousEspaceAssignItem}>
                            <Text style={styles.sousEspaceAssignText}>
                              ✓ {assignation.employeNom} ({assignation.typeTache})
                            </Text>
                            <TouchableOpacity
                              style={styles.sousEspaceRemoveButton}
                              onPress={() => handleRemoveAssignation(sousEspace.id, true, index)}
                            >
                              <Text style={styles.sousEspaceRemoveText}>×</Text>
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>

                {/* Actions Sous-espace */}
                <View style={styles.sousEspaceActions}>
                  <TouchableOpacity
                    style={styles.sousEspaceActionBtn}
                    onPress={() => {
                      setQrCodeData({
                        valeur: sousEspace.id,
                        titre: `${sousEspace.numero} - ${sousEspace.nom || ''}`
                      });
                      setShowQRModal(true);
                    }}
                  >
                    <Text style={styles.sousEspaceActionText}>📱</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.sousEspaceActionBtn}
                    onPress={() => {
                      setSelectedSousEspace(sousEspace);
                      setSelectedEspace(null);
                      setShowAssignModal(true);
                    }}
                  >
                    <Text style={styles.sousEspaceActionText}>👤</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.sousEspaceActionBtn, { backgroundColor: '#F59E0B' }]}
                    onPress={() => {
                      setSelectedSousEspace(sousEspace);
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
                    <Text style={styles.sousEspaceActionText}>✏️</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.sousEspaceActionBtn, { backgroundColor: '#EF4444' }]}
                    onPress={() => handleDeleteSousEspace(sousEspace)}
                  >
                    <Text style={styles.sousEspaceActionText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* En-tête avec statistiques */}
      <View style={styles.header}>
        <Text style={styles.title}>Gestion des Espaces</Text>
        <Text style={styles.subtitle}>Organisation hiérarchique des locaux</Text>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsContainer}>
          <StatCard 
            icon="🏢" 
            label="Espaces Publics" 
            value={stats.public}
            colors={['#3B82F6', '#1D4ED8']}
          />
          <StatCard 
            icon="🏭" 
            label="Espaces Pro" 
            value={stats.professionnel}
            colors={['#F59E0B', '#D97706']}
          />
          <StatCard 
            icon="🛏️" 
            label="Sous-espaces" 
            value={stats.sousEspaces}
            colors={['#10B981', '#047857']}
          />
          <StatCard 
            icon="👥" 
            label="Assignations" 
            value={stats.assignations}
            colors={['#8B5CF6', '#7C3AED']}
          />
        </ScrollView>
      </View>

      {/* Barre de recherche et filtres */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un espace..."
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          <Text style={styles.searchIcon}>🔍</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesFilter}>
          <TouchableOpacity
            style={[styles.filterChip, filterCategorie === 'all' && styles.filterChipActive]}
            onPress={() => setFilterCategorie('all')}
          >
            <Text style={[styles.filterChipText, filterCategorie === 'all' && styles.filterChipTextActive]}>
              Tous
            </Text>
          </TouchableOpacity>
          
          {categories.map(categorie => (
            <TouchableOpacity
              key={categorie.id}
              style={[
                styles.filterChip,
                { borderColor: categorie.couleur },
                filterCategorie === categorie.id && { backgroundColor: categorie.couleur }
              ]}
              onPress={() => setFilterCategorie(categorie.id)}
            >
              <Text style={[
                styles.filterChipText,
                filterCategorie === categorie.id && styles.filterChipTextActive
              ]}>
                {categorie.icone} {categorie.nom}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Liste des espaces */}
      <ScrollView
        style={styles.espacesList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredEspaces.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🏢</Text>
            <Text style={styles.emptyStateTitle}>Aucun espace trouvé</Text>
            <Text style={styles.emptyStateText}>
              {searchTerm || filterCategorie !== 'all' 
                ? 'Aucun espace ne correspond à votre recherche'
                : 'Commencez par créer votre premier espace'
              }
            </Text>
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={() => setShowEspaceModal(true)}
            >
              <Text style={styles.emptyStateButtonText}>➕ Créer un espace</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredEspaces.map(espace => (
            <EspaceCard key={espace.id} espace={espace} />
          ))
        )}
      </ScrollView>

      {/* Bouton d'action flottant */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowEspaceModal(true)}
        >
          <Text style={styles.fabText}>🏢</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.fab, styles.fabSecondary]}
          onPress={() => setShowCategorieModal(true)}
        >
          <Text style={styles.fabText}>🏷️</Text>
        </TouchableOpacity>
      </View>

      {/* Modal Ajout/Modification Espace */}
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
            <Text style={styles.modalTitle}>
              {selectedEspace ? 'Modifier l\'espace' : 'Nouvel espace'}
            </Text>

            <ScrollView style={styles.formContainer}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Nom de l'espace *</Text>
                <TextInput
                  style={styles.input}
                  value={espaceForm.nom}
                  onChangeText={(text) => setEspaceForm(prev => ({ ...prev, nom: text }))}
                  placeholder="Ex: Étage 1, Bâtiment A..."
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Type d'espace</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typesContainer}>
                  {typesEspace.map(type => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.typeChip,
                        espaceForm.type === type.value && styles.typeChipActive
                      ]}
                      onPress={() => setEspaceForm(prev => ({ ...prev, type: type.value }))}
                    >
                      <Text style={styles.typeChipIcon}>{type.icon}</Text>
                      <Text style={[
                        styles.typeChipText,
                        espaceForm.type === type.value && styles.typeChipTextActive
                      ]}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Numéro/Identifiant</Text>
                <TextInput
                  style={styles.input}
                  value={espaceForm.numero}
                  onChangeText={(text) => setEspaceForm(prev => ({ ...prev, numero: text }))}
                  placeholder="Ex: 101, A1, ZONE-B..."
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Catégorie *</Text>
                <ScrollView style={styles.categoriesGrid}>
                  {categories.map(categorie => (
                    <TouchableOpacity
                      key={categorie.id}
                      style={[
                        styles.categorieCard,
                        { borderColor: categorie.couleur },
                        espaceForm.categorieId === categorie.id && { backgroundColor: categorie.couleur + '20' }
                      ]}
                      onPress={() => setEspaceForm(prev => ({ ...prev, categorieId: categorie.id }))}
                    >
                      <Text style={styles.categorieIcon}>{categorie.icone}</Text>
                      <Text style={styles.categorieName}>{categorie.nom}</Text>
                      <Text style={styles.categorieExemples}>{categorie.exemples}</Text>
                      {espaceForm.categorieId === categorie.id && (
                        <Text style={[styles.checkmark, { color: categorie.couleur }]}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={espaceForm.description}
                  onChangeText={(text) => setEspaceForm(prev => ({ ...prev, description: text }))}
                  placeholder="Description optionnelle..."
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowEspaceModal(false);
                  resetEspaceForm();
                }}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleSubmitEspace}
                disabled={isSubmitting}
              >
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? '...' : (selectedEspace ? 'Modifier' : 'Créer')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Ajout/Modification Sous-espace */}
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
            <Text style={styles.modalTitle}>
              {selectedSousEspace ? 'Modifier le sous-espace' : 'Nouveau sous-espace'}
            </Text>

            <ScrollView style={styles.formContainer}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Espace parent *</Text>
                <View style={styles.dropdown}>
                  <Text style={styles.dropdownText}>
                    {espaces.find(e => e.id === sousEspaceForm.espaceParentId)?.nom || 'Sélectionner un espace'}
                  </Text>
                  <Text style={styles.dropdownIcon}>▼</Text>
                </View>
                <ScrollView style={styles.dropdownOptions}>
                  {espaces.map(espace => (
                    <TouchableOpacity
                      key={espace.id}
                      style={styles.dropdownOption}
                      onPress={() => setSousEspaceForm(prev => ({ ...prev, espaceParentId: espace.id }))}
                    >
                      <Text style={styles.dropdownOptionText}>{espace.nom}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Numéro *</Text>
                <TextInput
                  style={styles.input}
                  value={sousEspaceForm.numero}
                  onChangeText={(text) => setSousEspaceForm(prev => ({ ...prev, numero: text }))}
                  placeholder="Ex: 101, A1, TOIL-1..."
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Nom</Text>
                <TextInput
                  style={styles.input}
                  value={sousEspaceForm.nom}
                  onChangeText={(text) => setSousEspaceForm(prev => ({ ...prev, nom: text }))}
                  placeholder="Ex: Chambre Double, Suite Présidentielle..."
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typesContainer}>
                  {typesSousEspace.map(type => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.typeChip,
                        sousEspaceForm.type === type.value && styles.typeChipActive
                      ]}
                      onPress={() => setSousEspaceForm(prev => ({ ...prev, type: type.value }))}
                    >
                      <Text style={styles.typeChipIcon}>{type.icon}</Text>
                      <Text style={[
                        styles.typeChipText,
                        sousEspaceForm.type === type.value && styles.typeChipTextActive
                      ]}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, styles.formGroupHalf]}>
                  <Text style={styles.label}>Superficie (m²)</Text>
                  <TextInput
                    style={styles.input}
                    value={sousEspaceForm.superficie}
                    onChangeText={(text) => setSousEspaceForm(prev => ({ ...prev, superficie: text }))}
                    placeholder="Ex: 25"
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.formGroup, styles.formGroupHalf]}>
                  <Text style={styles.label}>Capacité</Text>
                  <TextInput
                    style={styles.input}
                    value={sousEspaceForm.capacite}
                    onChangeText={(text) => setSousEspaceForm(prev => ({ ...prev, capacite: text }))}
                    placeholder="Ex: 2"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Statut</Text>
                <View style={styles.statusContainer}>
                  {['libre', 'occupe', 'maintenance', 'nettoyage'].map(statut => (
                    <TouchableOpacity
                      key={statut}
                      style={[
                        styles.statusChip,
                        sousEspaceForm.statut === statut && styles.statusChipActive
                      ]}
                      onPress={() => setSousEspaceForm(prev => ({ ...prev, statut }))}
                    >
                      <Text style={[
                        styles.statusChipText,
                        sousEspaceForm.statut === statut && styles.statusChipTextActive
                      ]}>
                        {statut === 'libre' && '🟢 Libre'}
                        {statut === 'occupe' && '🔴 Occupé'}
                        {statut === 'maintenance' && '🟡 Maintenance'}
                        {statut === 'nettoyage' && '🔵 Nettoyage'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowSousEspaceModal(false);
                  resetSousEspaceForm();
                }}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleSubmitSousEspace}
                disabled={isSubmitting}
              >
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? '...' : (selectedSousEspace ? 'Modifier' : 'Créer')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Catégorie personnalisée */}
      <Modal
        visible={showCategorieModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowCategorieModal(false);
          resetCategorieForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nouvelle catégorie</Text>

            <ScrollView style={styles.formContainer}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Nom de la catégorie *</Text>
                <TextInput
                  style={styles.input}
                  value={categorieForm.nom}
                  onChangeText={(text) => setCategorieForm(prev => ({ ...prev, nom: text }))}
                  placeholder="Ex: Espace Wellness, Zone Technique..."
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Type</Text>
                <View style={styles.typeSelector}>
                  <TouchableOpacity
                    style={[
                      styles.typeOption,
                      categorieForm.type === 'public' && styles.typeOptionActive
                    ]}
                    onPress={() => setCategorieForm(prev => ({ ...prev, type: 'public' }))}
                  >
                    <Text style={styles.typeOptionIcon}>👥</Text>
                    <Text style={styles.typeOptionText}>Public</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.typeOption,
                      categorieForm.type === 'professionnel' && styles.typeOptionActive
                    ]}
                    onPress={() => setCategorieForm(prev => ({ ...prev, type: 'professionnel' }))}
                  >
                    <Text style={styles.typeOptionIcon}>👨‍💼</Text>
                    <Text style={styles.typeOptionText}>Professionnel</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Couleur</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorsContainer}>
                  {['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'].map(color => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        categorieForm.couleur === color && styles.colorOptionActive
                      ]}
                      onPress={() => setCategorieForm(prev => ({ ...prev, couleur: color }))}
                    >
                      {categorieForm.couleur === color && (
                        <Text style={styles.colorCheckmark}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Icône</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconsContainer}>
                  {['🏢', '🛏️', '🍽️', '🚿', '🧺', '🏊', '💼', '🚪', '🛋️', '📊'].map(icon => (
                    <TouchableOpacity
                      key={icon}
                      style={[
                        styles.iconOption,
                        categorieForm.icone === icon && styles.iconOptionActive
                      ]}
                      onPress={() => setCategorieForm(prev => ({ ...prev, icone: icon }))}
                    >
                      <Text style={styles.iconText}>{icon}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowCategorieModal(false);
                  resetCategorieForm();
                }}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleSubmitCategorie}
                disabled={isSubmitting}
              >
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? '...' : 'Créer'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Assignation */}
      <Modal
        visible={showAssignModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowAssignModal(false);
          resetAssignForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Assigner un employé - {selectedEspace?.nom || selectedSousEspace?.numero}
            </Text>

            <ScrollView style={styles.formContainer}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Employé *</Text>
                <View style={styles.dropdown}>
                  <Text style={styles.dropdownText}>
                    {employees.find(e => e.id === assignForm.employeId)?.name || 'Sélectionner un employé'}
                  </Text>
                  <Text style={styles.dropdownIcon}>▼</Text>
                </View>
                <ScrollView style={styles.dropdownOptions}>
                  {employees.map(employe => (
                    <TouchableOpacity
                      key={employe.id}
                      style={styles.dropdownOption}
                      onPress={() => setAssignForm(prev => ({ ...prev, employeId: employe.id }))}
                    >
                      <Text style={styles.dropdownOptionText}>
                        {employe.name} ({employe.role})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Type de tâche *</Text>
                <ScrollView style={styles.tasksGrid}>
                  {typesTache.map(tache => (
                    <TouchableOpacity
                      key={tache.value}
                      style={[
                        styles.taskChip,
                        assignForm.typeTache === tache.value && styles.taskChipActive
                      ]}
                      onPress={() => setAssignForm(prev => ({ ...prev, typeTache: tache.value }))}
                    >
                      <Text style={[
                        styles.taskChipText,
                        assignForm.typeTache === tache.value && styles.taskChipTextActive
                      ]}>
                        {tache.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Date de début</Text>
                <TextInput
                  style={styles.input}
                  value={assignForm.dateDebut}
                  onChangeText={(text) => setAssignForm(prev => ({ ...prev, dateDebut: text }))}
                  placeholder="YYYY-MM-DD"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Notes (optionnel)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={assignForm.notes}
                  onChangeText={(text) => setAssignForm(prev => ({ ...prev, notes: text }))}
                  placeholder="Instructions particulières..."
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAssignModal(false);
                  resetAssignForm();
                }}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleAssign}
                disabled={isSubmitting}
              >
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? '...' : 'Assigner'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal QR Code */}
      <Modal
        visible={showQRModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.qrModalOverlay}>
          <View style={styles.qrModalContent}>
            <Text style={styles.qrModalTitle}>QR Code - {qrCodeData.titre}</Text>
            
            <View style={styles.qrCodeContainer}>
              <Text style={styles.qrPlaceholder}>
                📱 QR Code Generator\n\n
                ID: {qrCodeData.valeur}\n
                {qrCodeData.titre}
              </Text>
            </View>
            
            <Text style={styles.qrInstructions}>
              Scannez ce QR code pour accéder rapidement aux détails de cet espace
            </Text>
            
            <TouchableOpacity
              style={styles.qrCloseButton}
              onPress={() => setShowQRModal(false)}
            >
              <Text style={styles.qrCloseButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#1E40AF',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
  },
  statCard: {
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 20,
    marginRight: 8,
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
  filtersContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    paddingLeft: 40,
    borderRadius: 8,
    fontSize: 16,
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    top: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  categoriesFilter: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginRight: 8,
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
  espacesList: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyStateButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  espaceCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  espaceHeader: {
    padding: 16,
  },
  espaceHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  espaceInfo: {
    flexDirection: 'row',
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
    marginBottom: 8,
  },
  espaceTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
  },
  espaceActions: {
    flexDirection: 'row',
    marginLeft: 12,
  },
  actionButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 6,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  assignationsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.3)',
  },
  assignationsTitle: {
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  assignationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 8,
    borderRadius: 6,
    marginBottom: 6,
  },
  assignationText: {
    color: 'white',
    fontSize: 12,
    flex: 1,
  },
  assignationDate: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    marginHorizontal: 8,
  },
  removeButton: {
    backgroundColor: 'rgba(239,68,68,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  removeButtonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  sousEspacesContainer: {
    backgroundColor: '#F9FAFB',
    padding: 12,
  },
  sousEspaceCard: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  sousEspaceInfo: {
    flexDirection: 'row',
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
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  sousEspaceType: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  sousEspaceAssignations: {
    marginTop: 8,
  },
  sousEspaceAssignTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 4,
  },
  sousEspaceAssignItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    padding: 6,
    borderRadius: 4,
    marginBottom: 4,
  },
  sousEspaceAssignText: {
    fontSize: 12,
    color: '#374151',
    flex: 1,
  },
  sousEspaceRemoveButton: {
    backgroundColor: '#EF4444',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sousEspaceRemoveText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sousEspaceActions: {
    flexDirection: 'row',
    marginLeft: 12,
  },
  sousEspaceActionBtn: {
    backgroundColor: '#3B82F6',
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  sousEspaceActionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    alignItems: 'flex-end',
  },
  fab: {
    backgroundColor: '#3B82F6',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabSecondary: {
    backgroundColor: '#8B5CF6',
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  fabText: {
    fontSize: 20,
    color: 'white',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  formContainer: {
    maxHeight: 400,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  formGroupHalf: {
    width: '48%',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  typesContainer: {
    flexDirection: 'row',
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  typeChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  typeChipIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  typeChipText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  typeChipTextActive: {
    color: 'white',
  },
  categoriesGrid: {
    maxHeight: 200,
  },
  categorieCard: {
    borderWidth: 2,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    position: 'relative',
  },
  categorieIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  categorieName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 2,
  },
  categorieExemples: {
    fontSize: 12,
    color: '#6B7280',
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    fontSize: 16,
    fontWeight: 'bold',
  },
  dropdown: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    color: '#374151',
  },
  dropdownIcon: {
    fontSize: 12,
    color: '#6B7280',
  },
  dropdownOptions: {
    maxHeight: 150,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    marginTop: 4,
  },
  dropdownOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statusChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  statusChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  statusChipText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  statusChipTextActive: {
    color: 'white',
  },
  typeSelector: {
    flexDirection: 'row',
  },
  typeOption: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeOptionActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  typeOptionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  colorsContainer: {
    flexDirection: 'row',
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOptionActive: {
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  colorCheckmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  iconsContainer: {
    flexDirection: 'row',
  },
  iconOption: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconOptionActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#DBEAFE',
  },
  iconText: {
    fontSize: 20,
  },
  tasksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  taskChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  taskChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  taskChipText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  taskChipTextActive: {
    color: 'white',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    marginRight: 12,
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  qrModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    margin: 20,
    maxWidth: 400,
  },
  qrModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  qrCodeContainer: {
    backgroundColor: '#F9FAFB',
    padding: 40,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPlaceholder: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  qrInstructions: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  qrCloseButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  qrCloseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default GestionEspacesHierarchie;