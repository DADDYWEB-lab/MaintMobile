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
    icone: 'public'
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
    setCategorieForm({ nom: '', type: 'public', couleur: '#3B82F6', icone: 'public' });
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

  // Composant Carte Statistique ultra compact
  const StatCard = ({ icon, label, value, colors }) => (
    <View style={[styles.statCard, { backgroundColor: colors[0] }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <View style={styles.statTextContainer}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );

  // Composant Carte Espace compact
  const EspaceCard = ({ espace }) => {
    const categorie = getCategorieById(espace.categorieId);
    const sousEspacesEnfants = getSousEspacesByParent(espace.id);
    const isExpanded = expandedEspaces[espace.id];

    return (
      <View style={[styles.espaceCard, { borderColor: categorie?.couleur || '#E5E7EB' }]}>
        {/* Header Espace compact */}
        <TouchableOpacity 
          style={[styles.espaceHeader, { backgroundColor: categorie?.couleur || '#6B7280' }]}
          onPress={() => toggleExpand(espace.id)}
        >
          <View style={styles.espaceHeaderContent}>
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

            {/* Indicateur d'expansion */}
            <Text style={styles.expandIcon}>{isExpanded ? '▲' : '▼'}</Text>
          </View>
        </TouchableOpacity>

        {/* Contenu déplié */}
        {isExpanded && (
          <View style={styles.expandedContent}>
            {/* Actions rapides */}
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.quickAction}
                onPress={() => {
                  setQrCodeData({ valeur: espace.id, titre: espace.nom });
                  setShowQRModal(true);
                }}
              >
                <Text style={styles.quickActionText}>📱 QR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickAction}
                onPress={() => {
                  setSelectedEspace(espace);
                  setSelectedSousEspace(null);
                  setShowAssignModal(true);
                }}
              >
                <Text style={styles.quickActionText}>👤 Assigner</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickAction}
                onPress={() => {
                  setSousEspaceForm({ ...sousEspaceForm, espaceParentId: espace.id });
                  setShowSousEspaceModal(true);
                }}
              >
                <Text style={styles.quickActionText}>➕ Sous-espace</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickAction, styles.deleteAction]}
                onPress={() => handleDeleteEspace(espace)}
                disabled={isSubmitting}
              >
                <Text style={styles.quickActionText}>🗑️</Text>
              </TouchableOpacity>
            </View>

            {/* Assignations */}
            {espace.assignations && espace.assignations.length > 0 && (
              <View style={styles.assignationsContainer}>
                <Text style={styles.assignationsTitle}>Assignations :</Text>
                {espace.assignations.map((assignation, index) => (
                  <View key={index} style={styles.assignationItem}>
                    <Text style={styles.assignationText}>
                      {assignation.employeNom} ({assignation.typeTache})
                    </Text>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemoveAssignation(espace.id, false, index)}
                    >
                      <Text style={styles.removeButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Sous-espaces */}
            {sousEspacesEnfants.length > 0 && (
              <View style={styles.sousEspacesContainer}>
                <Text style={styles.sousEspacesTitle}>Sous-espaces :</Text>
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
      </View>
    );
  };

  // Composant SousEspaceCard séparé
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

          {/* Assignations compactes */}
          {sousEspace.assignations && sousEspace.assignations.length > 0 && (
            <View style={styles.sousEspaceAssignations}>
              {sousEspace.assignations.map((assignation, index) => (
                <View key={index} style={styles.sousEspaceAssignItem}>
                  <Text style={styles.sousEspaceAssignText}>
                    {assignation.employeNom} ({assignation.typeTache})
                  </Text>
                  <TouchableOpacity
                    style={styles.sousEspaceRemoveButton}
                    onPress={() => onRemoveAssignation(sousEspace.id, true, index)}
                  >
                    <Text style={styles.sousEspaceRemoveText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Actions compactes */}
      <View style={styles.sousEspaceActions}>
        <TouchableOpacity
          style={styles.sousEspaceActionBtn}
          onPress={() => onShowQR({
            valeur: sousEspace.id,
            titre: `${sousEspace.numero} - ${sousEspace.nom || ''}`
          })}
        >
          <Text style={styles.sousEspaceActionText}>📱</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sousEspaceActionBtn}
          onPress={() => {
            onAssign(sousEspace);
            setShowAssignModal(true);
          }}
        >
          <Text style={styles.sousEspaceActionText}>👤</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sousEspaceActionBtn, { backgroundColor: '#F59E0B' }]}
          onPress={() => {
            onEdit(sousEspace);
            setShowSousEspaceModal(true);
          }}
        >
          <Text style={styles.sousEspaceActionText}>✏️</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sousEspaceActionBtn, { backgroundColor: '#EF4444' }]}
          onPress={() => onDelete(sousEspace)}
        >
          <Text style={styles.sousEspaceActionText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header compact */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Gestion des Espaces</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => {
                resetEspaceForm();
                setShowEspaceModal(true);
              }}
            >
              <Text style={styles.headerButtonText}>🏢</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setShowCategorieModal(true)}
            >
              <Text style={styles.headerButtonText}>🏷️</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.subtitle}>Organisation hiérarchique</Text>
      </View>

      {/* Stats Cards compactes - ESPACE RÉDUIT */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statsContainer}
      >
        <StatCard icon="👥" label="Publics" value={stats.public} colors={['#DBEAFE', '#3B82F6']} />
        <StatCard icon="🏢" label="Professionnels" value={stats.professionnel} colors={['#FEF3C7', '#F59E0B']} />
        <StatCard icon="🛏️" label="Sous-espaces" value={stats.sousEspaces} colors={['#DCFCE7', '#10B981']} />
        <StatCard icon="👤" label="Assignations" value={stats.assignations} colors={['#F3E8FF', '#8B5CF6']} />
      </ScrollView>

      {/* Barre de recherche - RAPPROCHÉE des stats */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Rechercher un espace..."
          placeholderTextColor="#9CA3AF"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {/* Filtre Catégories - RAPPROCHÉ de la recherche */}
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

      {/* Liste des espaces - COMMENCE IMMÉDIATEMENT après les filtres */}
      <ScrollView
        style={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredEspaces.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏢</Text>
            <Text style={styles.emptyTitle}>Aucun espace trouvé</Text>
            <Text style={styles.emptyText}>
              {searchTerm || filterCategorie !== 'all' 
                ? 'Aucun résultat pour votre recherche'
                : 'Créez votre premier espace pour commencer'
              }
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setShowEspaceModal(true)}
            >
              <Text style={styles.emptyButtonText}>➕ Créer un espace</Text>
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
                }}
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Nom de l'espace *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Rez-de-chaussée"
                  value={espaceForm.nom}
                  onChangeText={(text) => setEspaceForm({ ...espaceForm, nom: text })}
                />
              </View>

              <View style={styles.formRow}>
                <View style={styles.formHalf}>
                  <Text style={styles.label}>Numéro/Identifiant</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: RDC"
                    value={espaceForm.numero}
                    onChangeText={(text) => setEspaceForm({ ...espaceForm, numero: text })}
                  />
                </View>

                <View style={styles.formHalf}>
                  <Text style={styles.label}>Type d'espace</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {typesEspace.map(type => (
                      <TouchableOpacity
                        key={type.value}
                        style={[
                          styles.typeOption,
                          espaceForm.type === type.value && styles.typeOptionActive
                        ]}
                        onPress={() => setEspaceForm({ ...espaceForm, type: type.value })}
                      >
                        <Text style={styles.typeOptionText}>{type.icon} {type.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Catégorie *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {categoriesDefaut.map(cat => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryOption,
                        { backgroundColor: cat.couleur },
                        espaceForm.categorieId === cat.id && styles.categoryOptionActive
                      ]}
                      onPress={() => setEspaceForm({ ...espaceForm, categorieId: cat.id })}
                    >
                      <Text style={styles.categoryOptionText}>{cat.icone} {cat.nom}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textarea]}
                  placeholder="Description de l'espace..."
                  multiline
                  numberOfLines={3}
                  value={espaceForm.description}
                  onChangeText={(text) => setEspaceForm({ ...espaceForm, description: text })}
                />
              </View>
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

      {/* Modal Sous-espace */}
      <Modal visible={showSousEspaceModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedSousEspace ? 'Modifier le sous-espace' : 'Nouveau Sous-espace'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowSousEspaceModal(false);
                  resetSousEspaceForm();
                }}
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Espace parent *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {espaces.map(espace => (
                    <TouchableOpacity
                      key={espace.id}
                      style={[
                        styles.espaceOption,
                        sousEspaceForm.espaceParentId === espace.id && styles.espaceOptionActive
                      ]}
                      onPress={() => setSousEspaceForm({ ...sousEspaceForm, espaceParentId: espace.id })}
                    >
                      <Text style={styles.espaceOptionText}>
                        {espace.nom} ({espace.numero})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formHalf}>
                  <Text style={styles.label}>Numéro *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: 101"
                    value={sousEspaceForm.numero}
                    onChangeText={(text) => setSousEspaceForm({ ...sousEspaceForm, numero: text })}
                  />
                </View>

                <View style={styles.formHalf}>
                  <Text style={styles.label}>Type</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {typesSousEspace.map(type => (
                      <TouchableOpacity
                        key={type.value}
                        style={[
                          styles.typeOption,
                          sousEspaceForm.type === type.value && styles.typeOptionActive
                        ]}
                        onPress={() => setSousEspaceForm({ ...sousEspaceForm, type: type.value })}
                      >
                        <Text style={styles.typeOptionText}>{type.icon}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Nom (optionnel)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Suite Présidentielle"
                  value={sousEspaceForm.nom}
                  onChangeText={(text) => setSousEspaceForm({ ...sousEspaceForm, nom: text })}
                />
              </View>

              <View style={styles.formRow}>
                <View style={styles.formHalf}>
                  <Text style={styles.label}>Superficie (m²)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: 25"
                    keyboardType="numeric"
                    value={sousEspaceForm.superficie}
                    onChangeText={(text) => setSousEspaceForm({ ...sousEspaceForm, superficie: text })}
                  />
                </View>

                <View style={styles.formHalf}>
                  <Text style={styles.label}>Capacité (pers.)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: 2"
                    keyboardType="numeric"
                    value={sousEspaceForm.capacite}
                    onChangeText={(text) => setSousEspaceForm({ ...sousEspaceForm, capacite: text })}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Statut</Text>
                <View style={styles.statusOptions}>
                  {['libre', 'maintenance'].map(status => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusOption,
                        sousEspaceForm.statut === status && styles.statusOptionActive
                      ]}
                      onPress={() => setSousEspaceForm({ ...sousEspaceForm, statut: status })}
                    >
                      <Text style={styles.statusOptionText}>{status}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowSousEspaceModal(false);
                  resetSousEspaceForm();
                }}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleSubmitSousEspace}
                disabled={isSubmitting}
              >
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? 'Enregistrement...' : (selectedSousEspace ? 'Modifier' : 'Créer')}
                </Text>
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
              <TouchableOpacity
                onPress={() => {
                  setShowCategorieModal(false);
                  resetCategorieForm();
                }}
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Nom de la catégorie *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Espace Wellness"
                  value={categorieForm.nom}
                  onChangeText={(text) => setCategorieForm({ ...categorieForm, nom: text })}
                />
              </View>

              <View style={styles.formRow}>
                <View style={styles.formHalf}>
                  <Text style={styles.label}>Type</Text>
                  {['public', 'professionnel'].map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeOption,
                        categorieForm.type === type && styles.typeOptionActive
                      ]}
                      onPress={() => setCategorieForm({ ...categorieForm, type })}
                    >
                      <Text style={styles.typeOptionText}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowCategorieModal(false);
                  resetCategorieForm();
                }}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleSubmitCategorie}
                disabled={isSubmitting}
              >
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? 'Enregistrement...' : 'Créer'}
                </Text>
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
              <Text style={styles.modalTitle}>Assigner un employé</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAssignModal(false);
                  resetAssignForm();
                  setSelectedEspace(null);
                  setSelectedSousEspace(null);
                }}
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Employé *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {employees.map(emp => (
                    <TouchableOpacity
                      key={emp.id}
                      style={[
                        styles.employeeOption,
                        assignForm.employeId === emp.id && styles.employeeOptionActive
                      ]}
                      onPress={() => setAssignForm({ ...assignForm, employeId: emp.id })}
                    >
                      <Text style={styles.employeeOptionText}>{emp.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Type de tâche</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {typesTache.map(tache => (
                    <TouchableOpacity
                      key={tache.value}
                      style={[
                        styles.tacheOption,
                        assignForm.typeTache === tache.value && styles.tacheOptionActive
                      ]}
                      onPress={() => setAssignForm({ ...assignForm, typeTache: tache.value })}
                    >
                      <Text style={styles.tacheOptionText}>{tache.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textarea]}
                  placeholder="Notes supplémentaires..."
                  multiline
                  numberOfLines={3}
                  value={assignForm.notes}
                  onChangeText={(text) => setAssignForm({ ...assignForm, notes: text })}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowAssignModal(false);
                  resetAssignForm();
                  setSelectedEspace(null);
                  setSelectedSousEspace(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleAssign}
                disabled={isSubmitting}
              >
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? 'Assignation...' : 'Assigner'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal QR Code */}
      {showQRModal && (
        <Modal visible={showQRModal} animationType="fade" transparent>
          <View style={styles.qrOverlay}>
            <View style={styles.qrContent}>
              <TouchableOpacity
                style={styles.qrClose}
                onPress={() => setShowQRModal(false)}
              >
                <Text style={styles.qrCloseText}>✕</Text>
              </TouchableOpacity>
              
              <Text style={styles.qrTitle}>{qrCodeData.titre}</Text>
              
              <View style={styles.qrCodeContainer}>
                <Text style={styles.qrPlaceholder}>📱 QR Code</Text>
                <Text style={styles.qrValue}>{qrCodeData.valeur}</Text>
              </View>

              <Text style={styles.qrSubtitle}>
                À implémenter avec react-native-qrcode-svg
              </Text>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  
  // Header avec moins d'espace en bas
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 6,
  },
  headerButton: {
    backgroundColor: '#3B82F6',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  
  // Stats Container - ESPACE VERTICAL RÉDUIT
  statsContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 10,
  },
  
  // StatCard ultra compacte
  statCard: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 100,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 1,
    elevation: 1,
  },
  statIcon: {
    fontSize: 16,
  },
  statTextContainer: {
    flex: 1,
  },
  statLabel: {
    fontSize: 9,
    color: '#6B7280',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  
  // Search Container - RAPPROCHÉ des stats
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
  },
  
  // Categories Filter - RAPPROCHÉ de la recherche
  categoriesFilter: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  filterChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  
  // List Container - COMMENCE IMMÉDIATEMENT après les filtres
  listContainer: {
    flex: 1,
    marginTop: 0,
  },
  
  espacesList: {
    padding: 12,
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6B7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  
  // Carte Espace compacte
  espaceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  espaceHeader: {
    padding: 12,
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
    fontSize: 20,
    marginRight: 10,
  },
  espaceTextContainer: {
    flex: 1,
  },
  espaceNom: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  espaceTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  tagText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '500',
    marginRight: 6,
    opacity: 0.9,
  },
  expandIcon: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  
  // Contenu déplié
  expandedContent: {
    padding: 12,
    backgroundColor: '#F9FAFB',
    gap: 12,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  quickAction: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  assignationsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  assignationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    marginBottom: 4,
  },
  assignationText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  removeButton: {
    backgroundColor: '#EF4444',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sousEspacesContainer: {
    gap: 8,
  },
  sousEspacesTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 4,
  },
  
  // Carte Sous-espace compacte
  sousEspaceCard: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sousEspaceMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sousEspaceIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  sousEspaceDetails: {
    flex: 1,
  },
  sousEspaceNom: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  sousEspaceInfo: {
    fontSize: 11,
    color: '#6B7280',
  },
  sousEspaceAssignations: {
    marginTop: 6,
    gap: 4,
  },
  sousEspaceAssignItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  sousEspaceAssignText: {
    fontSize: 10,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  sousEspaceRemoveButton: {
    backgroundColor: '#EF4444',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  sousEspaceRemoveText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  sousEspaceActions: {
    flexDirection: 'row',
    gap: 4,
    marginLeft: 8,
  },
  sousEspaceActionBtn: {
    backgroundColor: '#3B82F6',
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sousEspaceActionText: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  
  // Modales
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
  modalClose: {
    fontSize: 20,
    color: '#6B7280',
    fontWeight: 'bold',
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
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formHalf: {
    flex: 1,
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
  textarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  typeOption: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  typeOptionActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  typeOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',

  }
  ,

  categoryOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },

  categoryOptionActive: {
    borderColor: '#FFFFFF',
  },


  categoryOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  espaceOption: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  espaceOptionActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  espaceOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  statusOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  statusOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  statusOptionActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  statusOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  employeeOption: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  employeeOptionActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  employeeOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  tacheOption: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  tacheOptionActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  tacheOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
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
  qrOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '85%',
  },
  qrClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#F3F4F6',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrCloseText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  qrCodeContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  qrPlaceholder: {
    fontSize: 48,
    marginBottom: 12,
  },
  qrValue: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    textAlign: 'center',
  },
  qrSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});

export default GestionEspacesHierarchie;