// GestionFournisseurs.tsx
// @ts-nocheck

import React, { useState, useEffect, useRef } from 'react';
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
  Image,
  Animated
} from 'react-native';
import {
  collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../../firebaseConfig';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// Composant Icon personnalisé avec des emojis
const Icon = ({ name, size = 24, color = '#000' }) => {
  const icons = {
    'search': '🔍',
    'filter': '⚙️',
    'close': '✕',
    'add': '+',
    'business': '🏢',
    'cube': '📦',
    'pricetag': '🏷️',
    'chevron-down': '▼',
    'chevron-up': '▲',
    'call': '📞',
    'mail': '✉️',
    'create': '✏️',
    'trash': '🗑️',
    'add-circle': '➕',
    'close-circle': '❌',
    'eye': '🔍',
    'eye-off': '🔍',
    'download': '📥',
    'cloud-upload': '📤',
    'globe': '🌐',
    'checkmark-circle': '✅',
    'close-circle': '❌',
    'business-outline': '🏢'
  };
  
  return <Text style={{ fontSize: size * 0.8, color }}>{icons[name] || '•'}</Text>;
};

const GestionFournisseurs = ({ navigation }: any) => {
  const [fournisseurs, setFournisseurs] = useState([]);
  const [produits, setProduits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategorie, setFilterCategorie] = useState('all');
  const [expandedFournisseurs, setExpandedFournisseurs] = useState({});

  const [showFournisseurModal, setShowFournisseurModal] = useState(false);
  const [showProduitModal, setShowProduitModal] = useState(false);
  const [showCategorieModal, setShowCategorieModal] = useState(false);

  const [selectedFournisseur, setSelectedFournisseur] = useState(null);
  const [selectedProduit, setSelectedProduit] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [afficherRecherche, setAfficherRecherche] = useState(true);

  // Nouvel état pour le menu FAB
  const [showActionMenu, setShowActionMenu] = useState(false);

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

  // Formulaires
  const [fournisseurForm, setFournisseurForm] = useState({
    nomEntreprise: '',
    logo: '',
    telephone: '',
    email: '',
    siteWeb: '',
    adresse: '',
    categorieId: '',
    description: '',
    statut: 'actif'
  });

  const [produitForm, setProduitForm] = useState({
    reference: '',
    nom: '',
    unite: 'unite',
    prix: '',
    logo: '',
    fournisseurId: '',
    categorieId: '',
    description: '',
    stock: 0
  });

  const [categorieForm, setCategorieForm] = useState({
    nom: '',
    couleur: '#3B82F6',
    icone: '📦'
  });

  // Données statiques
  const typesUnite = [
    { value: 'unite', label: 'Unité' },
    { value: 'kg', label: 'Kilogramme' },
    { value: 'litre', label: 'Litre' },
    { value: 'metre', label: 'Mètre' },
    { value: 'carton', label: 'Carton' },
    { value: 'paquet', label: 'Paquet' }
  ];

  const categoriesDefaut = [
    {
      id: 'alimentaire',
      nom: 'Alimentaire',
      couleur: '#10B981',
      icone: '🍽️',
      exemples: 'Fruits, Légumes, Produits laitiers'
    },
    {
      id: 'nettoyage',
      nom: 'Produits de nettoyage',
      couleur: '#3B82F6',
      icone: '🧹',
      exemples: 'Détergents, Désinfectants, Matériel'
    },
    {
      id: 'equipement',
      nom: 'Équipement',
      couleur: '#F59E0B',
      icone: '🏢',
      exemples: 'Mobilier, Machines, Équipements'
    },
    {
      id: 'fournitures',
      nom: 'Fournitures',
      couleur: '#8B5CF6',
      icone: '📦',
      exemples: 'Papeterie, Consommables, Matériel bureau'
    }
  ];

  const iconesDisponibles = [
    { value: '🍽️', label: 'Restaurant' },
    { value: '🧹', label: 'Nettoyage' },
    { value: '🏢', label: 'Business' },
    { value: '📦', label: 'Inventaire' },
    { value: '🚚', label: 'Livraison' },
    { value: '🏷️', label: 'Catégorie' },
    { value: '💊', label: 'Médical' },
    { value: '👕', label: 'Textile' },
    { value: '🔧', label: 'Outils' },
    { value: '💡', label: 'Éclairage' }
  ];

  // Récupérer les données
  useEffect(() => {
    const unsubFournisseurs = onSnapshot(query(collection(db, 'fournisseurs')), (snapshot) => {
      setFournisseurs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubProduits = onSnapshot(query(collection(db, 'produits')), (snapshot) => {
      setProduits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubCategories = onSnapshot(query(collection(db, 'categories_fournisseurs')), (snapshot) => {
      const customCats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCategories([...categoriesDefaut, ...customCats]);
    });

    return () => {
      unsubFournisseurs();
      unsubProduits();
      unsubCategories();
    };
  }, []);

  // Fonction de rafraîchissement
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  // Fonctions utilitaires
  const getProduitsByFournisseur = (fournisseurId) => {
    return produits.filter(p => p.fournisseurId === fournisseurId);
  };

  const getCategorieById = (catId) => {
    return categories.find(c => c.id === catId);
  };

  const toggleExpand = (fournisseurId) => {
    setExpandedFournisseurs(prev => ({ 
      ...prev, 
      [fournisseurId]: !prev[fournisseurId] 
    }));
  };

  const resetFournisseurForm = () => {
    setFournisseurForm({ 
      nomEntreprise: '', logo: '', telephone: '', email: '', 
      siteWeb: '', adresse: '', categorieId: '', description: '', statut: 'actif' 
    });
    setSelectedFournisseur(null);
  };

  const resetProduitForm = () => {
    setProduitForm({ 
      reference: '', nom: '', unite: 'unite', prix: '', logo: '', 
      fournisseurId: '', categorieId: '', description: '', stock: 0 
    });
    setSelectedProduit(null);
  };

  const resetCategorieForm = () => {
    setCategorieForm({ nom: '', couleur: '#3B82F6', icone: '📦' });
  };

  // Fonction pour uploader une image
  const uploadImage = async (uri, folder) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const timestamp = Date.now();
      const fileName = `${folder}/${timestamp}.jpg`;
      const storageRef = ref(storage, fileName);
      
      const snapshot = await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return downloadURL;
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error);
      throw error;
    }
  };

  const pickImage = async (isFournisseur = true) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'L\'accès à la galerie est nécessaire pour sélectionner une image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setUploadingLogo(true);
        const imageUrl = await uploadImage(result.assets[0].uri, isFournisseur ? 'fournisseurs' : 'produits');
        
        if (isFournisseur) {
          setFournisseurForm(prev => ({ ...prev, logo: imageUrl }));
        } else {
          setProduitForm(prev => ({ ...prev, logo: imageUrl }));
        }
      }
    } catch (error) {
      Alert.alert('Erreur', 'Erreur lors de la sélection de l\'image: ' + error.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  // Supprimer les logos
  const handleRemoveLogoFournisseur = () => {
    setFournisseurForm(prev => ({ ...prev, logo: '' }));
  };

  const handleRemoveLogoProduit = () => {
    setProduitForm(prev => ({ ...prev, logo: '' }));
  };

  // Fonction pour assombrir les couleurs
  const darkenColor = (color, percent) => {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = ((num >> 8) & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return "#" + (
      0x1000000 +
      (R < 255 ? (R < 0 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 0 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 0 ? 0 : B) : 255)
    ).toString(16).slice(1);
  };

  // Validation des formulaires
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateFournisseurForm = () => {
    if (!fournisseurForm.nomEntreprise.trim()) {
      Alert.alert('Erreur', 'Le nom de l\'entreprise est obligatoire');
      return false;
    }
    if (!fournisseurForm.categorieId) {
      Alert.alert('Erreur', 'Veuillez sélectionner une catégorie');
      return false;
    }
    if (fournisseurForm.email && !isValidEmail(fournisseurForm.email)) {
      Alert.alert('Erreur', 'L\'adresse email n\'est pas valide');
      return false;
    }
    return true;
  };

  const validateProduitForm = () => {
    if (!produitForm.reference.trim()) {
      Alert.alert('Erreur', 'La référence du produit est obligatoire');
      return false;
    }
    if (!produitForm.fournisseurId) {
      Alert.alert('Erreur', 'Veuillez sélectionner un fournisseur');
      return false;
    }
    if (produitForm.prix && isNaN(parseFloat(produitForm.prix))) {
      Alert.alert('Erreur', 'Le prix doit être un nombre valide');
      return false;
    }
    return true;
  };

  // Gestion des fournisseurs
  const handleSubmitFournisseur = async () => {
    if (!validateFournisseurForm()) return;

    setIsSubmitting(true);
    try {
      const fournisseurData = {
        ...fournisseurForm,
        updatedAt: serverTimestamp()
      };

      if (selectedFournisseur) {
        // Modification
        await updateDoc(doc(db, 'fournisseurs', selectedFournisseur.id), fournisseurData);
        Alert.alert('Succès', 'Fournisseur modifié avec succès !');
      } else {
        // Création
        await addDoc(collection(db, 'fournisseurs'), {
          ...fournisseurData,
          createdAt: serverTimestamp()
        });
        Alert.alert('Succès', 'Fournisseur créé avec succès !');
      }

      setShowFournisseurModal(false);
      resetFournisseurForm();
    } catch (error) {
      console.error('Erreur:', error);
      Alert.alert('Erreur', 'Une erreur est survenue: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Gestion des produits
  const handleSubmitProduit = async () => {
    if (!validateProduitForm()) return;

    setIsSubmitting(true);
    try {
      const produitData = {
        ...produitForm,
        prix: produitForm.prix ? parseFloat(produitForm.prix) : 0,
        stock: parseInt(produitForm.stock) || 0,
        updatedAt: serverTimestamp()
      };

      if (selectedProduit) {
        // Modification
        await updateDoc(doc(db, 'produits', selectedProduit.id), produitData);
        Alert.alert('Succès', 'Produit modifié avec succès !');
      } else {
        // Création
        await addDoc(collection(db, 'produits'), {
          ...produitData,
          createdAt: serverTimestamp()
        });
        Alert.alert('Succès', 'Produit créé avec succès !');
      }

      setShowProduitModal(false);
      resetProduitForm();
    } catch (error) {
      console.error('Erreur:', error);
      Alert.alert('Erreur', 'Une erreur est survenue: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Gestion des catégories
  const handleSubmitCategorie = async () => {
    if (!categorieForm.nom) {
      Alert.alert('Erreur', 'Veuillez entrer un nom pour la catégorie');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'categories_fournisseurs'), {
        ...categorieForm,
        custom: true,
        createdAt: serverTimestamp()
      });
      Alert.alert('Succès', 'Catégorie créée avec succès !');
      setShowCategorieModal(false);
      resetCategorieForm();
    } catch (error) {
      console.error('Erreur:', error);
      Alert.alert('Erreur', 'Une erreur est survenue: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Suppression
  const handleDeleteFournisseur = async (fournisseur) => {
    Alert.alert(
      'Confirmer la suppression',
      `Êtes-vous sûr de vouloir supprimer le fournisseur "${fournisseur.nomEntreprise}" ?\n\n` +
      `Cette action supprimera :\n` +
      `• Le fournisseur\n` +
      `• Tous les produits associés (${getProduitsByFournisseur(fournisseur.id).length} produit(s))\n\n` +
      `Cette action est irréversible !`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSubmitting(true);

              const produitsAssocies = getProduitsByFournisseur(fournisseur.id);
              const deletePromises = produitsAssocies.map(produit =>
                deleteDoc(doc(db, 'produits', produit.id))
              );

              deletePromises.push(deleteDoc(doc(db, 'fournisseurs', fournisseur.id)));

              await Promise.all(deletePromises);

              Alert.alert('Succès', 'Fournisseur et produits supprimés avec succès !');
            } catch (error) {
              console.error('Erreur lors de la suppression:', error);
              Alert.alert('Erreur', error.message);
            } finally {
              setIsSubmitting(false);
            }
          }
        }
      ]
    );
  };

  const handleDeleteProduit = async (produit) => {
    Alert.alert(
      'Confirmer la suppression',
      `Supprimer le produit "${produit.reference} - ${produit.nom}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'produits', produit.id));
              Alert.alert('Succès', 'Produit supprimé avec succès !');
            } catch (error) {
              Alert.alert('Erreur', error.message);
            }
          }
        }
      ]
    );
  };

  const renderLogo = (logoUrl, defaultIcon, size = 24) => {
    if (logoUrl) {
      return (
        <Image 
          source={{ uri: logoUrl }} 
          style={{ 
            width: size, 
            height: size, 
            borderRadius: 8,
            resizeMode: 'cover'
          }} 
        />
      );
    }
    return (
      <View style={[styles.defaultLogo, { width: size, height: size }]}>
        <Text style={{ fontSize: size * 0.6 }}>{defaultIcon}</Text>
      </View>
    );
  };

  // Filtrage des fournisseurs
  const filteredFournisseurs = fournisseurs.filter(fournisseur => {
    const matchSearch = fournisseur.nomEntreprise?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fournisseur.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategorie = filterCategorie === 'all' || fournisseur.categorieId === filterCategorie;
    return matchSearch && matchCategorie;
  });

  // Statistiques
  const totalProduits = produits.length;
  const fournisseursActifs = fournisseurs.filter(f => f.statut === 'actif').length;

  // Composant FAB avec menu
  const FloatingActionMenu = () => (
    <View style={styles.fabContainer}>
      {showActionMenu && (
        <Animated.View style={[styles.fabMenu, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={[styles.fabMenuItem, { backgroundColor: '#10b981' }]}
            onPress={() => {
              setShowCategorieModal(true);
              setShowActionMenu(false);
            }}
          >
            <Icon name="pricetag" size={20} color="white" />
            <Text style={styles.fabMenuText}>Catégorie</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.fabMenuItem, { backgroundColor: '#F59E0B' }]}
            onPress={() => {
              resetProduitForm();
              setShowProduitModal(true);
              setShowActionMenu(false);
            }}
          >
            <Icon name="cube" size={20} color="white" />
            <Text style={styles.fabMenuText}>Produit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.fabMenuItem, { backgroundColor: '#3B82F6' }]}
            onPress={() => {
              resetFournisseurForm();
              setShowFournisseurModal(true);
              setShowActionMenu(false);
            }}
          >
            <Icon name="business" size={20} color="white" />
            <Text style={styles.fabMenuText}>Fournisseur</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
      
      <TouchableOpacity
        style={styles.fabButton}
        onPress={() => setShowActionMenu(!showActionMenu)}
      >
        <Icon 
          name={showActionMenu ? "close" : "add"} 
          size={24} 
          color="white" 
        />
      </TouchableOpacity>
    </View>
  );

  // Composants UI
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
          <Text style={styles.statLabel}>{label}</Text>
          <Text style={styles.statValue}>{value}</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const FournisseurCard = ({ fournisseur }) => {
    const categorie = getCategorieById(fournisseur.categorieId);
    const produitsFournisseur = getProduitsByFournisseur(fournisseur.id);
    const isExpanded = expandedFournisseurs[fournisseur.id];

    return (
      <Animated.View 
        style={[
          styles.fournisseurCard,
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <LinearGradient
          colors={[categorie?.couleur || '#6B7280', darkenColor(categorie?.couleur || '#6B7280', 20)]}
          style={styles.fournisseurHeader}
        >
          <View style={styles.fournisseurHeaderContent}>
            <View style={styles.fournisseurInfo}>
              <View style={styles.logoContainer}>
                {renderLogo(fournisseur.logo, '🏢', 40)}
              </View>
              <View style={styles.fournisseurTextContainer}>
                <Text style={styles.fournisseurNom}>{fournisseur.nomEntreprise}</Text>
                <View style={styles.fournisseurTags}>
                  <View style={[styles.tag, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
                    <Text style={styles.tagText}>{categorie?.nom}</Text>
                  </View>
                  <View style={[styles.tag, { 
                    backgroundColor: fournisseur.statut === 'actif' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)' 
                  }]}>
                    <Text style={styles.tagText}>
                      {fournisseur.statut === 'actif' ? 'Actif' : 'Inactif'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.fournisseurActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  resetProduitForm();
                  setProduitForm(prev => ({ ...prev, fournisseurId: fournisseur.id }));
                  setShowProduitModal(true);
                }}
              >
                <Icon name="add-circle" size={20} color="white" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  setSelectedFournisseur(fournisseur);
                  setFournisseurForm({
                    nomEntreprise: fournisseur.nomEntreprise || '',
                    logo: fournisseur.logo || '',
                    telephone: fournisseur.telephone || '',
                    email: fournisseur.email || '',
                    siteWeb: fournisseur.siteWeb || '',
                    adresse: fournisseur.adresse || '',
                    categorieId: fournisseur.categorieId || '',
                    description: fournisseur.description || '',
                    statut: fournisseur.statut || 'actif'
                  });
                  setShowFournisseurModal(true);
                }}
              >
                <Icon name="create" size={18} color="white" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: 'rgba(239,68,68,0.8)' }]}
                onPress={() => handleDeleteFournisseur(fournisseur)}
              >
                <Icon name="trash" size={16} color="white" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => toggleExpand(fournisseur.id)}
              >
                <Icon name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.contactInfo}>
            {fournisseur.telephone && (
              <View style={styles.contactItem}>
                <Icon name="call" size={14} color="white" />
                <Text style={styles.contactText}>{fournisseur.telephone}</Text>
              </View>
            )}
            {fournisseur.email && (
              <View style={styles.contactItem}>
                <Icon name="mail" size={14} color="white" />
                <Text style={styles.contactText}>{fournisseur.email}</Text>
              </View>
            )}
          </View>

          {fournisseur.description && (
            <Text style={styles.fournisseurDescription}>{fournisseur.description}</Text>
          )}

          <View style={styles.fournisseurFooter}>
            <Text style={styles.produitCount}>{produitsFournisseur.length} produit(s)</Text>
          </View>
        </LinearGradient>

        {isExpanded && produitsFournisseur.length > 0 && (
          <View style={styles.produitsContainer}>
            {produitsFournisseur.map(produit => (
              <View key={produit.id} style={styles.produitCard}>
                <View style={styles.produitInfo}>
                  <View style={styles.produitLogo}>
                    {renderLogo(produit.logo, '📦', 32)}
                  </View>
                  <View style={styles.produitDetails}>
                    <Text style={styles.produitNom}>
                      {produit.reference} - {produit.nom}
                    </Text>
                    <Text style={styles.produitDetailsText}>
                      {produit.unite} • {produit.prix}€ • Stock: {produit.stock}
                    </Text>
                    {produit.description && (
                      <Text style={styles.produitDescription}>{produit.description}</Text>
                    )}
                  </View>
                </View>

                <View style={styles.produitActions}>
                  <TouchableOpacity
                    style={[styles.produitActionBtn, { backgroundColor: '#F59E0B' }]}
                    onPress={() => {
                      setSelectedProduit(produit);
                      setProduitForm({
                        reference: produit.reference || '',
                        nom: produit.nom || '',
                        unite: produit.unite || 'unite',
                        prix: produit.prix?.toString() || '',
                        logo: produit.logo || '',
                        fournisseurId: produit.fournisseurId || '',
                        categorieId: produit.categorieId || '',
                        description: produit.description || '',
                        stock: produit.stock || 0
                      });
                      setShowProduitModal(true);
                    }}
                  >
                    <Icon name="create" size={14} color="white" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.produitActionBtn, { backgroundColor: '#EF4444' }]}
                    onPress={() => handleDeleteProduit(produit)}
                  >
                    <Icon name="trash" size={14} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </Animated.View>
    );
  };

  // Actions rapides
  const QuickActions = () => (
    <View style={styles.quickActions}>
      <TouchableOpacity 
        style={styles.quickAction} 
        onPress={() => setAfficherRecherche(!afficherRecherche)}
      >
        <Icon 
          name={afficherRecherche ? "eye-off" : "eye"} 
          size={20} 
          color="white" 
        />
        <Text style={styles.quickActionText}>
          {afficherRecherche ? 'Masquer' : 'Afficher'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header avec dégradé */}
      <LinearGradient
        colors={['#1E40AF', '#3B82F6']}
        style={styles.header}
      > 
        {/* Menu d'actions flottant */}
        <FloatingActionMenu />

        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>Gestion des Fournisseurs</Text>
              <Text style={styles.subtitle}>Gérez vos fournisseurs et leurs produits</Text>
            </View>
            
            {/* Actions rapides */}
            <QuickActions />
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsContainer}>
            <StatCard 
              icon="🏢" 
              label="Fournisseurs" 
              value={fournisseurs.length}
              colors={['#8B5CF6', '#7C3AED']}
            />
            <StatCard 
              icon="📦" 
              label="Produits" 
              value={totalProduits}
              colors={['#10B981', '#059669']}
            />
            <StatCard 
              icon="✅" 
              label="Actifs" 
              value={fournisseursActifs}
              colors={['#F59E0B', '#D97706']}
            />
            <StatCard 
              icon="📊" 
              label="Catégories" 
              value={categories.length}
              colors={['#EC4899', '#DB2777']}
            />
          </ScrollView>
        </View>
      </LinearGradient>

      {/* Barre de recherche et filtres */}
      {afficherRecherche && (
        <View style={styles.filtersSection}>
          <View style={styles.searchBox}>
            <Icon name="search" size={20} color="#6B7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un fournisseur..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholderTextColor="#9CA3AF"
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity onPress={() => setSearchTerm('')}>
                <Icon name="close-circle" size={20} color="#6B7280" />
              </TouchableOpacity>
            )}
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
      )}

      {/* Liste des fournisseurs */}
      <ScrollView
        style={styles.fournisseursList}
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
        {filteredFournisseurs.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="business-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyStateTitle}>Aucun fournisseur trouvé</Text>
            <Text style={styles.emptyStateText}>
              {searchTerm || filterCategorie !== 'all' 
                ? 'Aucun fournisseur ne correspond à votre recherche'
                : 'Commencez par créer votre premier fournisseur'
              }
            </Text>
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={() => {
                resetFournisseurForm();
                setShowFournisseurModal(true);
              }}
            >
              <Text style={styles.emptyStateButtonText}>Créer un fournisseur</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredFournisseurs.map(fournisseur => (
            <FournisseurCard key={fournisseur.id} fournisseur={fournisseur} />
          ))
        )}
        
        {/* Espace pour le FAB */}
        <View style={styles.fabSpacer} />
      </ScrollView>

      {/* Modal Fournisseur */}
      <Modal
        visible={showFournisseurModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowFournisseurModal(false);
          resetFournisseurForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedFournisseur ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
            </Text>

            <ScrollView style={styles.formContainer}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Nom de l'entreprise *</Text>
                <TextInput
                  style={styles.input}
                  value={fournisseurForm.nomEntreprise}
                  onChangeText={(text) => setFournisseurForm(prev => ({ ...prev, nomEntreprise: text }))}
                  placeholder="Ex: SARL Dubois & Fils"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Logo</Text>
                <View style={styles.imageUploadContainer}>
                  <TouchableOpacity
                    style={[styles.uploadButton, uploadingLogo && styles.uploadButtonDisabled]}
                    onPress={() => pickImage(true)}
                    disabled={uploadingLogo}
                  >
                    <Text style={styles.uploadButtonText}>
                      {uploadingLogo ? '📤 Upload...' : '📷 Choisir une image'}
                    </Text>
                  </TouchableOpacity>
                  
                  {fournisseurForm.logo && (
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={handleRemoveLogoFournisseur}
                    >
                      <Text style={styles.removeButtonText}>🗑️ Supprimer</Text>
                    </TouchableOpacity>
                  )}
                </View>
                
                {fournisseurForm.logo && (
                  <View style={styles.imagePreview}>
                    <Text style={styles.imagePreviewText}>Aperçu :</Text>
                    {renderLogo(fournisseurForm.logo, '🏢', 80)}
                  </View>
                )}
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, styles.formGroupHalf]}>
                  <Text style={styles.label}>Téléphone</Text>
                  <TextInput
                    style={styles.input}
                    value={fournisseurForm.telephone}
                    onChangeText={(text) => setFournisseurForm(prev => ({ ...prev, telephone: text }))}
                    placeholder="Ex: 01 23 45 67 89"
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={[styles.formGroup, styles.formGroupHalf]}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    value={fournisseurForm.email}
                    onChangeText={(text) => setFournisseurForm(prev => ({ ...prev, email: text }))}
                    placeholder="Ex: contact@entreprise.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Catégorie *</Text>
                <ScrollView style={styles.categoriesGrid} nestedScrollEnabled={true}>
                  {categories.map(categorie => (
                    <TouchableOpacity
                      key={categorie.id}
                      style={[
                        styles.categorieCard,
                        { borderColor: categorie.couleur },
                        fournisseurForm.categorieId === categorie.id && { backgroundColor: categorie.couleur + '20' }
                      ]}
                      onPress={() => setFournisseurForm(prev => ({ ...prev, categorieId: categorie.id }))}
                    >
                      <Text style={styles.categorieIcon}>{categorie.icone}</Text>
                      <Text style={styles.categorieName}>{categorie.nom}</Text>
                      <Text style={styles.categorieExemples}>{categorie.exemples}</Text>
                      {fournisseurForm.categorieId === categorie.id && (
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
                  value={fournisseurForm.description}
                  onChangeText={(text) => setFournisseurForm(prev => ({ ...prev, description: text }))}
                  placeholder="Description du fournisseur..."
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowFournisseurModal(false);
                  resetFournisseurForm();
                }}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleSubmitFournisseur}
                disabled={isSubmitting}
              >
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? '...' : (selectedFournisseur ? 'Modifier' : 'Créer')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Produit */}
      <Modal
        visible={showProduitModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowProduitModal(false);
          resetProduitForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedProduit ? 'Modifier le produit' : 'Nouveau produit'}
            </Text>

            <ScrollView style={styles.formContainer}>
              <View style={styles.formRow}>
                <View style={[styles.formGroup, styles.formGroupHalf]}>
                  <Text style={styles.label}>Référence *</Text>
                  <TextInput
                    style={styles.input}
                    value={produitForm.reference}
                    onChangeText={(text) => setProduitForm(prev => ({ ...prev, reference: text }))}
                    placeholder="Ex: PROD-001"
                  />
                </View>

                <View style={[styles.formGroup, styles.formGroupHalf]}>
                  <Text style={styles.label}>Unité</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitesContainer}>
                    {typesUnite.map(unite => (
                      <TouchableOpacity
                        key={unite.value}
                        style={[
                          styles.uniteChip,
                          produitForm.unite === unite.value && styles.uniteChipActive
                        ]}
                        onPress={() => setProduitForm(prev => ({ ...prev, unite: unite.value }))}
                      >
                        <Text style={[
                          styles.uniteChipText,
                          produitForm.unite === unite.value && styles.uniteChipTextActive
                        ]}>
                          {unite.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Nom du produit</Text>
                <TextInput
                  style={styles.input}
                  value={produitForm.nom}
                  onChangeText={(text) => setProduitForm(prev => ({ ...prev, nom: text }))}
                  placeholder="Ex: Savon liquide"
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, styles.formGroupHalf]}>
                  <Text style={styles.label}>Prix (€)</Text>
                  <TextInput
                    style={styles.input}
                    value={produitForm.prix}
                    onChangeText={(text) => setProduitForm(prev => ({ ...prev, prix: text }))}
                    placeholder="Ex: 12.50"
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={[styles.formGroup, styles.formGroupHalf]}>
                  <Text style={styles.label}>Stock</Text>
                  <TextInput
                    style={styles.input}
                    value={produitForm.stock.toString()}
                    onChangeText={(text) => setProduitForm(prev => ({ ...prev, stock: parseInt(text) || 0 }))}
                    placeholder="Ex: 100"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Fournisseur *</Text>
                <ScrollView style={styles.fournisseursGrid} nestedScrollEnabled={true}>
                  {fournisseurs.map(fournisseur => (
                    <TouchableOpacity
                      key={fournisseur.id}
                      style={[
                        styles.fournisseurOption,
                        produitForm.fournisseurId === fournisseur.id && styles.fournisseurOptionActive
                      ]}
                      onPress={() => setProduitForm(prev => ({ ...prev, fournisseurId: fournisseur.id }))}
                    >
                      {renderLogo(fournisseur.logo, '🏢', 24)}
                      <Text style={styles.fournisseurOptionText}>{fournisseur.nomEntreprise}</Text>
                      {produitForm.fournisseurId === fournisseur.id && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={produitForm.description}
                  onChangeText={(text) => setProduitForm(prev => ({ ...prev, description: text }))}
                  placeholder="Description du produit..."
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowProduitModal(false);
                  resetProduitForm();
                }}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleSubmitProduit}
                disabled={isSubmitting}
              >
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? '...' : (selectedProduit ? 'Modifier' : 'Créer')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Catégorie */}
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
                  placeholder="Ex: Équipement sportif"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Couleur</Text>
                <View style={styles.colorsContainer}>
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
                </View> 

              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Icône</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconsContainer}>
                  {iconesDisponibles.map(icone => (
                    <TouchableOpacity
                      key={icone.value}
                      style={[
                        styles.iconOption,
                        categorieForm.icone === icone.value && styles.iconOptionActive
                      ]}
                      onPress={() => setCategorieForm(prev => ({ ...prev, icone: icone.value }))}
                    >
                      <Text style={styles.iconText}>{icone.value}</Text>
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
                  {isSubmitting ? '...' : 'Créer la catégorie'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};


// Les styles restent exactement les mêmes que dans le code précédent
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
  }    
  ,
  
  headerContent: {
    marginTop: 10,
  },

  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 24,
  },

  statsContainer: {
    flexDirection: 'row',
  },


  statCard: {
    marginRight: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,

  },
  statGradient: {
    padding: 20,
    borderRadius: 16,
    minWidth: 140,
  },
  statContent: {
    alignItems: 'flex-start',
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 28,
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
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    fontSize: 16,
    color: '#1F2937',
  },
  categoriesFilter: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
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
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  quickAction: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 60,
  },
  quickActionText: {
    color: 'white',
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
  // Styles pour le FAB
  fabContainer: {
    position: 'absolute',
    bottom: 210,
    right: 30,
    alignItems: 'flex-end',
    zIndex: 1000,
  },
  fabButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#dcbde8ff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabMenu: {
    position: 'absolute',
    bottom: -140,
    right: 60,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    minWidth: 150,
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  fabMenuText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 14,
  },
  fournisseursList: {
    flex: 1,
    padding: 20,
  },
  fabSpacer: {
    height: 100,
  },
  fournisseurCard: {
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  fournisseurHeader: {
    padding: 20,
  },
  fournisseurHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  fournisseurInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  logoContainer: {
    marginRight: 12,
  },
  defaultLogo: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fournisseurTextContainer: {
    flex: 1,
  },
  fournisseurNom: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  fournisseurTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
  },
  fournisseurActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactText: {
    color: 'white',
    fontSize: 14,
  },
  fournisseurDescription: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  fournisseurFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  produitCount: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  produitsContainer: {
    backgroundColor: '#F9FAFB',
    padding: 16,
  },
  produitCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  produitInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  produitLogo: {
    marginRight: 12,
  },
  produitDetails: {
    flex: 1,
  },
  produitNom: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  produitDetailsText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  produitDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  produitActions: {
    flexDirection: 'row',
    gap: 6,
  },
  produitActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: 'white',
    borderRadius: 16,
    marginTop: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
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
  // Styles pour les modals
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
  imageUploadContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  uploadButton: {
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
  },
  uploadButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  uploadButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  removeButton: {
    backgroundColor: '#EF4444',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
  },
  removeButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  imagePreview: {
    marginTop: 12,
  },
  imagePreviewText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
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
  unitesContainer: {
    flexDirection: 'row',
  },
  uniteChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  uniteChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  uniteChipText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  uniteChipTextActive: {
    color: 'white',
  },
  fournisseursGrid: {
    maxHeight: 150,
  },
  fournisseurOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  fournisseurOptionActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#DBEAFE',
  },
  fournisseurOptionText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
    flex: 1,
  },
  colorsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
});

export default GestionFournisseurs;