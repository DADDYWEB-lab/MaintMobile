//@ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
  Platform,
  Image,
  ActivityIndicator,
  Linking,
  ScrollView,
  StatusBar,
} from "react-native";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  writeBatch,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "../../../firebaseConfig";

import * as ImagePicker from "expo-image-picker";
import ScreenHeader from "../Components/ScreenHeader";
// ==================== TYPES ====================
interface Fournisseur {
  id: string;
  nomEntreprise: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  siteWeb?: string;
  description?: string;
  logo?: string;
  categorieId: string;
  createdAt: any;
  updatedAt?: any;

  nomRepresentant?: string;
  emailRepresentant?: string;
  telRepresentant?: string;
}

interface Produit {
  id: string;
  reference: string;
  nom: string;
  prix: number;
  stock: number;
  seuilMin: number;
  unite: string;
  logo?: string;
  fournisseurId: string;
}

interface Categorie {
  id: string;
  nom: string;
  couleur: string;
  icone: string;
}

// ==================== ICONS ====================
const Icon = ({ name, size = 24, color = "#000" }: any) => {
  const icons: Record<string, string> = {
    search: "🔍",
    close: "✕",
    add: "+",
    business: "🏢",
    cube: "📦",
    trash: "🗑️",
    create: "✏️",
    call: "📞",
    mail: "✉️",
    globe: "🌐",
    upload: "📤",
    alert: "⚠️",
    "chevron-down": "▼",
    "chevron-up": "▲",
    checkmark: "✓",
  };
  return (
    <Text style={{ fontSize: size * 0.8, color }}>{icons[name] || "•"}</Text>
  );
};

// ==================== VALIDATION ====================
const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPhone = (phone: string) => /^[+]?[0-9\s-]{10,}$/.test(phone);
const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// ==================== MAIN COMPONENT ====================
const GestionFournisseurs = ({ navigation }: { navigation: any }) => {
  // --- STATES ---
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategorie, setFilterCategorie] = useState("all");
  const [expandedFournisseurs, setExpandedFournisseurs] = useState<
    Record<string, boolean>
  >({});
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- MODALS ---
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showFournisseurModal, setShowFournisseurModal] = useState(false);
  const [showProduitModal, setShowProduitModal] = useState(false);
  const [showCategorieModal, setShowCategorieModal] = useState(false);

  // --- FORMS ---
  const [selectedFournisseur, setSelectedFournisseur] =
    useState<Fournisseur | null>(null);
  const [selectedProduit, setSelectedProduit] = useState<Produit | null>(null);
  const [fForm, setFForm] = useState({
    nomEntreprise: "",
    telephone: "",
    email: "",
    adresse: "",
    siteWeb: "",
    description: "",
    categorieId: "",
    logo: "",
    nomRepresentant: "",
    emailRepresentant: "",
    telRepresentant: "",
  });

  const [pForm, setPForm] = useState({
    reference: "",
    nom: "",
    prix: "",
    stock: "0",
    seuilMin: "10",
    unite: "unite",
    fournisseurId: "",
    logo: "",
  });
  const [cForm, setCForm] = useState({
    nom: "",
    couleur: "#3B82F6",
    icone: "📦",
  });

  // --- IMAGE UPLOAD STATE ---
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showUnitePicker, setShowUnitePicker] = useState(false);
  const unites = ["kg", "litre", "mètre", "carton", "boîte"];
  // ==================== FIREBASE LISTENERS ====================
  useEffect(() => {
    setLoading(true);

    const unsubF = onSnapshot(
      collection(db, "fournisseurs"),
      (snapshot) => {
        setFournisseurs(
          snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Fournisseur))
        );
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Erreur fournisseurs:", err);
        setError("Impossible de charger les fournisseurs");
        setLoading(false);
      }
    );

    const unsubP = onSnapshot(
      collection(db, "produits"),
      (snapshot) =>
        setProduits(
          snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Produit))
        ),
      (err) => console.error("Erreur produits:", err)
    );

    const unsubC = onSnapshot(
      collection(db, "categories_fournisseurs"),
      (snapshot) =>
        setCategories(
          snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Categorie))
        ),
      (err) => console.error("Erreur catégories:", err)
    );

    return () => {
      unsubF();
      unsubP();
      unsubC();
    };
  }, []);

  // ==================== COMPUTED VALUES ====================
  const filteredData = useMemo(() => {
    return fournisseurs.filter(
      (f) =>
        (filterCategorie === "all" || f.categorieId === filterCategorie) &&
        f.nomEntreprise?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [fournisseurs, searchTerm, filterCategorie]);

  const stats = useMemo(
    () => ({
      totalFournisseurs: fournisseurs.length,
      totalProduits: produits.length,
      valeurStock: produits
        .reduce((s, p) => s + p.prix * p.stock, 0)
        .toFixed(2),
      produitsAlerte: produits.filter((p) => p.stock <= p.seuilMin).length,
    }),
    [fournisseurs, produits]
  );

  // ==================== IMAGE UPLOAD ====================
  const pickAndUploadImage = async (isForFournisseur = true) => {
    try {
      // 1. Demander la permission (Essentiel)
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission requise",
          "Nous avons besoin de votre accès à la galerie."
        );
        return;
      }

      // 2. Lancer la galerie
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7, // Réduire un peu la qualité réduit la taille du fichier et évite les crashs
      });

      if (result.canceled || !result.assets[0].uri) return;

      setUploadingImage(true);

      // 3. Conversion de l'URI en Blob (Compatible Android/iOS)
      const uri = result.assets[0].uri;
      const response = await fetch(uri);
      const blob = await response.blob();

      // 4. Création du chemin de stockage
      const timestamp = Date.now();
      const folder = isForFournisseur ? "fournisseurs" : "produits";
      const storageRef = ref(storage, `${folder}/${timestamp}.jpg`);

      // 5. Upload
      await uploadBytes(storageRef, blob);

      // 6. Récupérer l'URL publique
      const downloadURL = await getDownloadURL(storageRef);

      // 7. Mettre à jour le formulaire correspondant
      if (isForFournisseur) {
        setFForm((prev) => ({ ...prev, logo: downloadURL }));
      } else {
        setPForm((prev) => ({ ...prev, logo: downloadURL }));
      }

      setUploadingImage(false);
      Alert.alert("Succès", "Image téléchargée avec succès");
    } catch (err: any) {
      setUploadingImage(false);
      console.error("Erreur Upload Detail:", err);
      Alert.alert("Erreur", "L'upload a échoué : " + err.message);
    }
  };

  // ==================== VALIDATION ====================
  const validateFournisseur = (data: any): string[] => {
    const errors = [];
    if (!data.nomEntreprise?.trim()) errors.push("Nom de l'entreprise requis");
    if (data.nomEntreprise?.length < 2)
      errors.push("Nom trop court (min 2 caractères)");
    if (!data.categorieId) errors.push("Catégorie requise");
    if (data.email && !isValidEmail(data.email)) errors.push("Email invalide");
    if (data.telephone && !isValidPhone(data.telephone))
      errors.push("Téléphone invalide");
    if (data.siteWeb && !isValidUrl(data.siteWeb))
      errors.push("URL du site invalide");
    return errors;
  };

  const validateProduit = (data: any): string[] => {
    const errors = [];
    if (!data.nom?.trim()) errors.push("Nom du produit requis");
    if (!data.fournisseurId) errors.push("Fournisseur requis");
    if (
      data.prix &&
      (isNaN(parseFloat(data.prix)) || parseFloat(data.prix) < 0)
    ) {
      errors.push("Prix invalide");
    }
    return errors;
  };

  // ==================== CRUD OPERATIONS ====================
  const saveFournisseur = async () => {
    const errors = validateFournisseur(fForm);
    if (errors.length > 0) {
      Alert.alert("Erreur de validation", errors.join("\n"));
      return;
    }

    try {
      if (selectedFournisseur) {
        await updateDoc(doc(db, "fournisseurs", selectedFournisseur.id), {
          ...fForm,
          updatedAt: serverTimestamp(),
        });
        Alert.alert("Succès", "Fournisseur modifié");
      } else {
        await addDoc(collection(db, "fournisseurs"), {
          ...fForm,
          createdAt: serverTimestamp(),
        });
        Alert.alert("Succès", "Fournisseur créé");
      }
      resetFournisseurForm();
    } catch (e: any) {
      Alert.alert("Erreur", e.message);
    }
  };

  const saveProduit = async () => {
    const errors = validateProduit(pForm);
    if (errors.length > 0) {
      Alert.alert("Erreur de validation", errors.join("\n"));
      return;
    }

    try {
      const produitData = {
        ...pForm,
        prix: parseFloat(pForm.prix) || 0,
        stock: parseInt(pForm.stock) || 0,
        seuilMin: parseInt(pForm.seuilMin) || 10,
      };

      if (selectedProduit) {
        await updateDoc(doc(db, "produits", selectedProduit.id), produitData);
        Alert.alert("Succès", "Produit modifié");
      } else {
        await addDoc(collection(db, "produits"), produitData);
        Alert.alert("Succès", "Produit créé");
      }
      resetProduitForm();
    } catch (e: any) {
      Alert.alert("Erreur", e.message);
    }
  };

  const deleteFournisseur = async (fournisseur: Fournisseur) => {
    const supplierProducts = produits.filter(
      (p) => p.fournisseurId === fournisseur.id
    );

    Alert.alert(
      "Confirmer la suppression",
      `Supprimer "${fournisseur.nomEntreprise}" ?\n\n` +
        `${supplierProducts.length} produit(s) associé(s) seront également supprimés.`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              // Supprimer les produits associés
              const batch = writeBatch(db);
              const produitsQuery = query(
                collection(db, "produits"),
                where("fournisseurId", "==", fournisseur.id)
              );
              const produitsSnapshot = await getDocs(produitsQuery);
              produitsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));

              // Supprimer le fournisseur
              batch.delete(doc(db, "fournisseurs", fournisseur.id));
              await batch.commit();

              // Supprimer l'image si elle existe
              if (fournisseur.logo) {
                try {
                  await deleteObject(ref(storage, fournisseur.logo));
                } catch (err) {
                  console.warn("Erreur suppression image:", err);
                }
              }

              Alert.alert("Succès", "Fournisseur supprimé");
            } catch (e: any) {
              Alert.alert("Erreur", e.message);
            }
          },
        },
      ]
    );
  };

  const deleteProduit = async (produit: Produit) => {
    Alert.alert("Confirmer", `Supprimer "${produit.nom}" ?`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "produits", produit.id));
            if (produit.logo) {
              try {
                await deleteObject(ref(storage, produit.logo));
              } catch (err) {
                console.warn("Erreur suppression image:", err);
              }
            }
            Alert.alert("Succès", "Produit supprimé");
          } catch (e: any) {
            Alert.alert("Erreur", e.message);
          }
        },
      },
    ]);
  };

  const saveCategorie = async () => {
    if (!cForm.nom.trim()) {
      Alert.alert("Erreur", "Nom de catégorie requis");
      return;
    }
    try {
      await addDoc(collection(db, "categories_fournisseurs"), cForm);
      Alert.alert("Succès", "Catégorie créée");
      setShowCategorieModal(false);
      setCForm({ nom: "", couleur: "#3B82F6", icone: "📦" });
    } catch (e: any) {
      Alert.alert("Erreur", e.message);
    }
  };

  // ==================== FORM RESET ====================
  const resetFournisseurForm = () => {
    setShowFournisseurModal(false);
    setSelectedFournisseur(null);
    setFForm({
      nomEntreprise: "",
      telephone: "",
      email: "",
      adresse: "",
      siteWeb: "",
      description: "",
      categorieId: "",
      logo: "",
      nomRepresentant: "",
      emailRepresentant: "",
      telRepresentant: "",
    });
  };

  const resetProduitForm = () => {
    setShowProduitModal(false);
    setSelectedProduit(null);
    setPForm({
      reference: "",
      nom: "",
      prix: "",
      stock: "0",
      seuilMin: "10",
      unite: "unite",
      fournisseurId: "",
      logo: "",
    });
  };

  // ==================== QUICK ACTIONS ====================
  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  const handleWebsite = (url: string) => {
    Linking.openURL(url);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  // ==================== STOCK INDICATOR ====================
  const StockIndicator = ({
    stock,
    seuilMin,
  }: {
    stock: number;
    seuilMin: number;
  }) => {
    const niveau =
      stock === 0 ? "rupture" : stock <= seuilMin ? "critique" : "normal";
    const colors = {
      rupture: "#EF4444",
      critique: "#F59E0B",
      normal: "#10B981",
    };
    const labels = { rupture: "Rupture", critique: "Alerte", normal: "OK" };

    return (
      <View style={[styles.stockBadge, { backgroundColor: colors[niveau] }]}>
        <Text style={styles.stockText}>{labels[niveau]}</Text>
      </View>
    );
  };

  // ==================== SUPPLIER CARD ====================
  const SupplierCard = ({ item }: { item: Fournisseur }) => {
    const isExpanded = expandedFournisseurs[item.id];
    const cat = categories.find((c) => c.id === item.categorieId);
    const supplierProducts = produits.filter(
      (p) => p.fournisseurId === item.id
    );

    return (
      <View style={styles.card}>
        {/* Header */}
        <View
          style={[
            styles.cardHeader,
            { borderLeftColor: cat?.couleur || "#CCC", borderLeftWidth: 5 },
          ]}
        >
          <TouchableOpacity
            style={{ flex: 1, flexDirection: "row", alignItems: "center" }}
            onPress={() =>
              setExpandedFournisseurs((p) => ({ ...p, [item.id]: !isExpanded }))
            }
          >
            {item.logo && (
              <Image source={{ uri: item.logo }} style={styles.logo} />
            )}
            <View style={{ flex: 1, marginLeft: item.logo ? 12 : 0 }}>
              <Text style={styles.cardTitle}>{item.nomEntreprise}</Text>
              <Text style={styles.cardSub}>
                {cat?.icone} {cat?.nom || "Sans catégorie"} •{" "}
                {supplierProducts.length} produits
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.cardActions}>
            <TouchableOpacity
              onPress={() => {
                setPForm({ ...pForm, fournisseurId: item.id });
                setShowProduitModal(true);
              }}
              style={styles.miniBtn}
            >
              <Icon name="add" size={14} color="#3B82F6" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setSelectedFournisseur(item);
                setFForm(item);
                setShowFournisseurModal(true);
              }}
              style={styles.miniBtn}
            >
              <Icon name="create" size={14} color="#64748B" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => deleteFournisseur(item)}
              style={styles.miniBtn}
            >
              <Icon name="trash" size={14} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Expanded Details */}
        {isExpanded && (
          <View style={styles.cardDetail}>
            {/* Quick Actions */}
            <View style={styles.quickActions}>
              {item.telephone && (
                <TouchableOpacity
                  onPress={() => handleCall(item.telephone!)}
                  style={styles.quickBtn}
                >
                  <Icon name="call" size={16} color="#3B82F6" />
                  <Text style={styles.quickText}>{item.telephone}</Text>
                </TouchableOpacity>
              )}
              {item.email && (
                <TouchableOpacity
                  onPress={() => handleEmail(item.email!)}
                  style={styles.quickBtn}
                >
                  <Icon name="mail" size={16} color="#3B82F6" />
                  <Text style={styles.quickText}>{item.email}</Text>
                </TouchableOpacity>
              )}
              {item.siteWeb && (
                <TouchableOpacity
                  onPress={() => handleWebsite(item.siteWeb!)}
                  style={styles.quickBtn}
                >
                  <Icon name="globe" size={16} color="#3B82F6" />
                  <Text style={styles.quickText}>Site web</Text>
                </TouchableOpacity>
              )}
            </View>

            {item.adresse && (
              <Text style={styles.infoText}>📍 {item.adresse}</Text>
            )}
            {item.description && (
              <Text style={styles.descText}>{item.description}</Text>
            )}

            {/* Products List */}
            <View style={styles.productList}>
              <Text style={styles.sectionTitle}>
                Produits ({supplierProducts.length})
              </Text>
              {supplierProducts.map((p) => (
                <View key={p.id} style={styles.pItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pName}>
                      {p.nom}{" "}
                      <Text style={{ fontWeight: "400", fontSize: 10 }}>
                        ({p.reference})
                      </Text>
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        marginTop: 4,
                      }}
                    >
                      <Text style={styles.pPrice}>{p.prix}€</Text>
                      <Text style={styles.pStock}>Stock: {p.stock}</Text>
                      <StockIndicator stock={p.stock} seuilMin={p.seuilMin} />
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", gap: 5 }}>
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedProduit(p);
                        setPForm({
                          ...p,
                          prix: p.prix.toString(),
                          stock: p.stock.toString(),
                          seuilMin: p.seuilMin.toString(),
                        });
                        setShowProduitModal(true);
                      }}
                      style={[styles.miniBtn, { backgroundColor: "#3B82F6" }]
                    
                    }
                    >
                      <Icon name="create" size={12} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => deleteProduit(p)}
                      style={[styles.miniBtn, { backgroundColor: "#EF4444" }]}
                    >
                      <Icon name="trash" size={12} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  // ==================== RENDER ====================
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (error) {

    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>

        <TouchableOpacity 
          style={styles.retryBtn}
          onPress={() => window.location.reload()}   >
          <Text style={styles.retryText}>Réessayer</Text>

        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
       

        <ScreenHeader
          title="Fournisseurs"
          subtitle="Gestion des Fournisseurs"
          backgroundColor="#3B82F6"
          onBackPress={() => navigation.goBack()}
          rightButtons={[
            { label: "+ Nouvelle", onPress: () => setShowActionMenu(true) },
          ]}
        />
        {/* Stats Warning */}
        {stats.produitsAlerte > 0 && (
          <View style={styles.alertBanner}>
            <Icon name="alert" size={16} color="#EF4444" />
            <Text style={styles.alertText}>
              {stats.produitsAlerte} produit(s) en alerte de stock
            </Text>
            <TouchableOpacity
              style={styles.alertBtn}
              onPress={() => {
                const alertProducts = produits.filter(
                  (p) => p.stock <= p.seuilMin
                );
                Alert.alert(
                  "Produits en alerte",
                  alertProducts
                    .map((p) => `• ${p.nom}: ${p.stock}/${p.seuilMin}`)
                    .join("\n"),
                  [{ text: "OK" }]
                );
              }}
            >
              <Text style={styles.alertBtnText}>Voir</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Icon name="search" size={16} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un fournisseur..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor="#94A3B8"
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm("")}>
              <Icon name="close" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Categories Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
        >
          <TouchableOpacity
            onPress={() => setFilterCategorie("all")}
            style={[
              styles.chip,
              filterCategorie === "all" && styles.chipActive,
            ]}
          >
            <Text
              style={[
                styles.chipText,
                filterCategorie === "all" && styles.chipTextActive,
              ]}
            >
              Tous ({fournisseurs.length})
            </Text>
          </TouchableOpacity>

          {categories.map((c) => {
            const count = fournisseurs.filter(
              (f) => f.categorieId === c.id
            ).length;
            if (count === 0) return null;

            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => setFilterCategorie(c.id)}
                style={[
                  styles.chip,
                  filterCategorie === c.id && { backgroundColor: c.couleur },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    filterCategorie === c.id && styles.chipTextActive,
                  ]}
                >
                  {c.icone} {c.nom} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* MAIN CONTENT */}
      <FlatList
        data={filteredData}
        renderItem={({ item }) => <SupplierCard item={item} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 15, paddingBottom: 80 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#3B82F6"]}
            tintColor="#3B82F6"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="business" size={64} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>
              {searchTerm || filterCategorie !== "all"
                ? "Aucun résultat"
                : "Aucun fournisseur"}
            </Text>
            <Text style={styles.emptyText}>
              {searchTerm || filterCategorie !== "all"
                ? "Aucun fournisseur ne correspond à votre recherche"
                : "Commencez par créer votre premier fournisseur"}
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => {
                setShowActionMenu(false);
                setShowFournisseurModal(true);
              }}
            >
              <Text style={styles.emptyBtnText}>
                {searchTerm || filterCategorie !== "all"
                  ? "Effacer les filtres"
                  : "Créer un fournisseur"}
              </Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* ACTION MENU MODAL */}
      <Modal visible={showActionMenu} transparent animationType="slide">
        <TouchableOpacity
          style={styles.overlay}
          onPress={() => setShowActionMenu(false)}
          activeOpacity={1}
        >
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Ajouter Nouveau</Text>
              <TouchableOpacity onPress={() => setShowActionMenu(false)}>
                <Icon name="close" size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.rowAround}>
              <TouchableOpacity
                style={styles.sheetBtn}
                onPress={() => {
                  setSelectedFournisseur(null);
                  setFForm({
                    nomEntreprise: "",
                    telephone: "",
                    email: "",
                    adresse: "",
                    siteWeb: "",
                    description: "",
                    categorieId: "",
                    logo: "",
                  });
                  setShowFournisseurModal(true);
                  setShowActionMenu(false);
                }}
              >
                <View
                  style={[styles.sheetEmoji, { backgroundColor: "#3B82F6" }]}
                >
                  <Text style={{ fontSize: 30 }}>🏢</Text>
                </View>
                <Text style={styles.sheetBtnText}>Fournisseur</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sheetBtn}
                onPress={() => {
                  setSelectedProduit(null);
                  setPForm({
                    reference: "",
                    nom: "",
                    prix: "",
                    stock: "0",
                    seuilMin: "10",
                    unite: "unite",
                    fournisseurId: "",
                    logo: "",
                  });
                  setShowProduitModal(true);
                  setShowActionMenu(false);
                }}
              >
                <View
                  style={[styles.sheetEmoji, { backgroundColor: "#10B981" }]}
                >
                  <Text style={{ fontSize: 30 }}>📦</Text>
                </View>
                <Text style={styles.sheetBtnText}>Produit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sheetBtn}
                onPress={() => {
                  setShowCategorieModal(true);
                  setShowActionMenu(false);
                }}
              >
                <View
                  style={[styles.sheetEmoji, { backgroundColor: "#8B5CF6" }]}
                >
                  <Text style={{ fontSize: 30 }}>🏷️</Text>
                </View>
                <Text style={styles.sheetBtnText}>Catégorie</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* FOURNISSEUR MODAL */}
      <Modal visible={showFournisseurModal} animationType="slide">
        <View style={styles.modalView}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedFournisseur ? "Modifier" : "Nouveau"} Fournisseur
            </Text>
            <TouchableOpacity onPress={resetFournisseurForm}>
              <Icon name="close" size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ padding: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Logo Upload */}
            <View style={styles.logoUploadSection}>
              <Text style={styles.label}>Logo</Text>
              <TouchableOpacity
                style={styles.uploadBtn}
                onPress={() => pickAndUploadImage(true)}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <ActivityIndicator size="small" color="#3B82F6" />
                ) : fForm.logo ? (
                  <Image
                    source={{ uri: fForm.logo }}
                    style={styles.logoPreview}
                  />
                ) : (
                  <>
                    <Icon name="upload" size={24} color="#3B82F6" />
                    <Text style={styles.uploadText}>Choisir une image</Text>
                  </>
                )}
              </TouchableOpacity>
              {fForm.logo && !uploadingImage && (
                <TouchableOpacity
                  style={styles.removeLogoBtn}
                  onPress={() => setFForm({ ...fForm, logo: "" })}
                >
                  <Text style={styles.removeLogoText}>Supprimer</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.label}>Nom de l'entreprise *</Text>
            <TextInput
              style={styles.input}
              value={fForm.nomEntreprise}
              onChangeText={(t) => setFForm({ ...fForm, nomEntreprise: t })}
              placeholder="Ex: SARL Dubois & Fils"
            />

            <View style={styles.rowBetween}>
              <View style={{ width: "48%" }}>
                <Text style={styles.label}>Téléphone</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="phone-pad"
                  value={fForm.telephone}
                  onChangeText={(t) => setFForm({ ...fForm, telephone: t })}
                  placeholder="01 23 45 67 89"
                />
              </View>
              <View style={{ width: "48%" }}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={fForm.email}
                  onChangeText={(t) => setFForm({ ...fForm, email: t })}
                  placeholder="contact@entreprise.com"
                />
              </View>
            </View>

            <Text style={styles.label}>Site Web</Text>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              value={fForm.siteWeb}
              onChangeText={(t) => setFForm({ ...fForm, siteWeb: t })}
              placeholder="https://www.entreprise.com"
            />

            <Text style={styles.label}>Adresse</Text>
            <TextInput
              style={styles.input}
              value={fForm.adresse}
              onChangeText={(t) => setFForm({ ...fForm, adresse: t })}
              placeholder="123 Rue Principale, 75000 Paris"
            />

            <Text style={styles.label}>Catégorie *</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoriesGrid}
            >
              {categories.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setFForm({ ...fForm, categorieId: c.id })}
                  style={[
                    styles.categoryOption,
                    { borderColor: c.couleur },
                    fForm.categorieId === c.id && {
                      backgroundColor: c.couleur,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      fForm.categorieId === c.id && styles.categoryTextActive,
                    ]}
                  >
                    {c.icone} {c.nom}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.categoryOption, styles.addCategoryBtn]}
                onPress={() => {
                  setShowFournisseurModal(false);
                  setShowCategorieModal(true);
                }}
              >
                <Text style={styles.addCategoryText}>+ Ajouter</Text>
              </TouchableOpacity>
            </ScrollView>

            <Text style={styles.label}>Description / Notes</Text>
            <TextInput
              style={[styles.input, { height: 100 }]}
              multiline
              value={fForm.description}
              onChangeText={(t) => setFForm({ ...fForm, description: t })}
              placeholder="Informations supplémentaires..."
            />
            {/* ---------------------------- */}
            {/* --- SECTION REPRÉSENTANT --- */}
            <View
              style={{
                marginTop: 20,
                padding: 15,
                backgroundColor: "#F1F5F9",
                borderRadius: 12,
              }}
            >
              <Text style={[styles.label, { marginTop: 0, color: "#3B82F6" }]}>
                👤 Info Représentant
              </Text>

              <Text style={styles.label}>Nom du représentant</Text>
              <TextInput
                style={styles.input}
                value={fForm.nomRepresentant}
                onChangeText={(t) => setFForm({ ...fForm, nomRepresentant: t })}
                placeholder="Nom complet"
              />

              <View style={styles.rowBetween}>
                <View style={{ width: "48%" }}>
                  <Text style={styles.label}>Tél. Direct</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="phone-pad"
                    value={fForm.telRepresentant}
                    onChangeText={(t) =>
                      setFForm({ ...fForm, telRepresentant: t })
                    }
                    placeholder="06..."
                  />
                </View>
                <View style={{ width: "48%" }}>
                  <Text style={styles.label}>Email Direct</Text>
                  <TextInput
                    style={styles.input}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={fForm.emailRepresentant}
                    onChangeText={(t) =>
                      setFForm({ ...fForm, emailRepresentant: t })
                    }
                    placeholder="nom@pro.com"
                  />
                </View>
              </View>
            </View>
            {/* ---------------------------- */}
            <TouchableOpacity style={styles.btnSave} onPress={saveFournisseur}>
              <Text style={styles.btnSaveText}>
                {selectedFournisseur
                  ? "Mettre à jour"
                  : "Enregistrer le fournisseur"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* PRODUIT MODAL */}
      <Modal visible={showProduitModal} animationType="slide">
        <View style={styles.modalView}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedProduit ? "Modifier" : "Nouveau"} Produit
            </Text>
            <TouchableOpacity onPress={resetProduitForm}>
              <Icon name="close" size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ padding: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Logo Upload */}
            <View style={styles.logoUploadSection}>
              <Text style={styles.label}>Image du produit</Text>
              <TouchableOpacity
                style={styles.uploadBtn}
                onPress={() => pickAndUploadImage(false)}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <ActivityIndicator size="small" color="#3B82F6" />
                ) : pForm.logo ? (
                  <Image
                    source={{ uri: pForm.logo }}
                    style={styles.logoPreview}
                  />
                ) : (
                  <>
                    <Icon name="upload" size={24} color="#3B82F6" />
                    <Text style={styles.uploadText}>Choisir une image</Text>
                  </>
                )}
              </TouchableOpacity>
              {pForm.logo && !uploadingImage && (
                <TouchableOpacity
                  style={styles.removeLogoBtn}
                  onPress={() => setPForm({ ...pForm, logo: "" })}
                >
                  <Text style={styles.removeLogoText}>Supprimer</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.label}>Référence produit</Text>
            <TextInput
              style={styles.input}
              placeholder="ex: SKU-100"
              value={pForm.reference}
              onChangeText={(t) => setPForm({ ...pForm, reference: t })}
            />

            <Text style={styles.label}>Nom du produit *</Text>
            <TextInput
              style={styles.input}
              value={pForm.nom}
              onChangeText={(t) => setPForm({ ...pForm, nom: t })}
              placeholder="Ex: Savon liquide 500ml"
            />

            <View style={styles.rowBetween}>
              <View style={{ width: "48%" }}>
                <Text style={styles.label}>Prix d'achat (€)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="decimal-pad"
                  value={pForm.prix}
                  onChangeText={(t) => setPForm({ ...pForm, prix: t })}
                  placeholder="0.00"
                />
              </View>
              <View style={{ width: "48%" }}>
                <Text style={styles.label}>Unité</Text>

                {/* Bouton qui simule l'input pour ouvrir la liste */}
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setShowUnitePicker(!showUnitePicker)}
                >
                  <Text style={styles.dropdownButtonText}>
                    {pForm.unite || "Sélectionner"}
                  </Text>
                  <Icon
                    name={showUnitePicker ? "chevron-up" : "chevron-down"}
                    size={14}
                    color="#64748B"
                  />
                </TouchableOpacity>

                {/* Liste déroulante conditionnelle */}
                {showUnitePicker && (
                  <View style={styles.dropdownContainer}>
                    {unites.map((u) => (
                      <TouchableOpacity
                        key={u}
                        style={[
                          styles.dropdownItem,
                          pForm.unite === u && styles.dropdownItemActive,
                        ]}
                        onPress={() => {
                          setPForm({ ...pForm, unite: u });
                          setShowUnitePicker(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.dropdownItemText,
                            pForm.unite === u && styles.dropdownItemTextActive,
                          ]}
                        >
                          {u}
                        </Text>
                        {pForm.unite === u && (
                          <Icon name="checkmark" size={14} color="#3B82F6" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>

            <View style={styles.rowBetween}>
              <View style={{ width: "48%" }}>
                <Text style={styles.label}>Stock actuel</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={pForm.stock}
                  onChangeText={(t) => setPForm({ ...pForm, stock: t })}
                  placeholder="0"
                />
              </View>
              <View style={{ width: "48%" }}>
                <Text style={styles.label}>Seuil d'alerte</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={pForm.seuilMin}
                  onChangeText={(t) => setPForm({ ...pForm, seuilMin: t })}
                  placeholder="10"
                />
                <Text style={styles.helperText}>
                  Alerte quand stock ≤ seuil
                </Text>
              </View>
            </View>

            <Text style={styles.label}>Fournisseur associé *</Text>
            {pForm.fournisseurId ? (
              <View style={styles.selectedSupplier}>
                <Text style={styles.selectedSupplierText}>
                  {
                    fournisseurs.find((f) => f.id === pForm.fournisseurId)
                      ?.nomEntreprise
                  }
                </Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.suppliersGrid}
              >
                {fournisseurs.slice(0, 5).map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    style={styles.supplierOption}
                    onPress={() => setPForm({ ...pForm, fournisseurId: f.id })}
                  >
                    <Text style={styles.supplierOptionText}>
                      {f.nomEntreprise}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity style={styles.btnSave} onPress={saveProduit}>
              <Text style={styles.btnSaveText}>
                {selectedProduit ? "Mettre à jour" : "Ajouter au stock"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* CATEGORIE MODAL */}
      <Modal visible={showCategorieModal} animationType="fade" transparent>
        <View style={styles.overlayCenter}>
          <View style={styles.dialog}>
            <View style={styles.dialogHeader}>
              <Text style={styles.dialogTitle}>Nouvelle Catégorie</Text>
              <TouchableOpacity onPress={() => setShowCategorieModal(false)}>
                <Icon name="close" size={20} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, { marginTop: 15 }]}
              placeholder="Nom (ex: Boissons)"
              value={cForm.nom}
              onChangeText={(t) => setCForm({ ...cForm, nom: t })}
            />

            <Text style={[styles.label, { marginTop: 20 }]}>Couleur</Text>
            <View style={styles.rowAround}>
              {[
                "#3B82F6",
                "#10B981",
                "#F59E0B",
                "#EF4444",
                "#8B5CF6",
                "#EC4899",
              ].map((color) => (
                <TouchableOpacity
                  key={color}
                  onPress={() => setCForm({ ...cForm, couleur: color })}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: color },
                    cForm.couleur === color && styles.colorActive,
                  ]}
                />
              ))}
            </View>

            <Text style={[styles.label, { marginTop: 20 }]}>Icône</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.iconsScroll}
            >
              {["🏢", "📦", "🍽️", "🧹", "🔧", "👕", "💊", "💡", "🚚", "🏷️"].map(
                (icon) => (
                  <TouchableOpacity
                    key={icon}
                    style={[
                      styles.iconOption,
                      cForm.icone === icon && styles.iconOptionActive,
                    ]}
                    onPress={() => setCForm({ ...cForm, icone: icon })}
                  >
                    <Text style={{ fontSize: 24 }}>{icon}</Text>
                  </TouchableOpacity>
                )
              )}
            </ScrollView>

            <TouchableOpacity style={styles.btnSave} onPress={saveCategorie}>
              <Text style={styles.btnSaveText}>Créer la catégorie</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnCancel}
              onPress={() => setShowCategorieModal(false)}
            >
              <Text style={styles.btnCancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      
    </View>
  );
};

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  // Loading & Error
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 16, color: "#64748B" },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: { color: "white", fontWeight: "600" },

  // Header
  header: {
    backgroundColor: "white",
    padding: 3,
    // Au lieu de Platform.OS === 'ios' ? 100 : 40
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + -40 : 10,
    borderBottomWidth: 1,
    borderBottomColor: "#2072deff",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { fontSize: 28, fontWeight: "900", color: "#1E293B" },
  headerSub: { fontSize: 14, color: "#8b7464ff", marginTop: 4 },
  addBtn: {
    backgroundColor: "#3B82F6",
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  // Alerts
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2f1b96ff",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 12,
  },
  alertText: {
    flex: 1,
    marginLeft: 8,
    color: "#DC2626",
    fontSize: 14,
    fontWeight: "500",
  },
  alertBtn: {
    backgroundColor: "#DC2626",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  alertBtnText: { color: "white", fontSize: 12, fontWeight: "600" },

  // Search
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    marginTop: 15,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: "#1E293B" },

  // Categories Filter
  categoriesScroll: { marginTop: 10 },
  chip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginRight: 8,
  },
  chipActive: { backgroundColor: "#1E293B", borderColor: "#1E293B" },
  chipText: { fontSize: 13, color: "#64748B", fontWeight: "600" },
  chipTextActive: { color: "white" },

  // Empty State
  emptyState: {
    alignItems: "center",
    padding: 40,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  emptyBtn: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyBtnText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },

  // Supplier Card
  card: {
    backgroundColor: "white",
    borderRadius: 15,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: "row",
    padding: 15,
    alignItems: "center",
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#334155",
  },
  cardSub: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  cardActions: {
    flexDirection: "row",
    gap: 6,
  },
  miniBtn: {
    width: 32,
    height: 32,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },

  // Expanded Card Details
  cardDetail: {
    padding: 15,
    backgroundColor: "#F8FAFC",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  quickBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 6,
  },
  quickText: {
    fontSize: 13,
    color: "#3B82F6",
    fontWeight: "500",
  },
  infoText: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 8,
  },
  descText: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 5,
    fontStyle: "italic",
    lineHeight: 18,
  },

  // Products Section
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 10,
  },
  productList: {
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 10,
  },
  pItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    backgroundColor: "white",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  pName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },
  pPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#3B82F6",
  },
  pStock: {
    color: "#94A3B8",
    fontWeight: "400",
    fontSize: 13,
  },
  stockBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stockText: {
    color: "white",
    fontSize: 10,
    fontWeight: "700",
  },

  // Action Menu Modal
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 25,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E293B",
  },
  rowAround: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 15,
  },
  sheetBtn: {
    alignItems: "center",
    width: 90,
  },
  sheetEmoji: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  sheetBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    textAlign: "center",
  },

  // Modals Common
  modalView: {
    flex: 1,
    backgroundColor: "white",
    paddingTop: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
  },

  // Form Elements
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
    marginTop: 15,
    marginBottom: 8,
  },
  helperText: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 4,
    fontStyle: "italic",
  },
  input: {
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: "#1E293B",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  // Logo Upload
  logoUploadSection: {
    marginBottom: 20,
  },
  uploadBtn: {
    backgroundColor: "#F8FAFC",
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    borderRadius: 12,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  uploadText: {
    marginTop: 8,
    color: "#3B82F6",
    fontWeight: "600",
  },
  logoPreview: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  removeLogoBtn: {
    marginTop: 10,
    alignItems: "center",
  },
  removeLogoText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "500",
  },

  // Categories Grid
  categoriesGrid: {
    flexDirection: "row",
    marginBottom: 5,
  },
  categoryOption: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
    marginRight: 8,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  categoryTextActive: {
    color: "white",
  },
  addCategoryBtn: {
    borderColor: "#CBD5E1",
    borderStyle: "dashed",
  },
  addCategoryText: {
    color: "#64748B",
    fontWeight: "600",
  },

  // Unit Selector
  uniteSelector: {
    position: "relative",
  },
  uniteOptions: {
    position: "absolute",
    right: -28,
    top: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  // Suppliers Grid
  suppliersGrid: {
    flexDirection: "row",
    marginBottom: 10,
  },
  supplierOption: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  supplierOptionText: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "500",
  },
  selectedSupplier: {
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 10,
  },
  selectedSupplierText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#3B82F6",
  },

  // Save Button
  btnSave: {
    backgroundColor: "#3B82F6",
    padding: 16,
    borderRadius: 12,
    marginTop: 30,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  btnSaveText: {
    color: "white",
    fontWeight: "800",
    fontSize: 16,
  },

  // Category Modal
  overlayCenter: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  dialog: {
    width: "85%",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
  },
  dialogHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  colorActive: {
    borderWidth: 3,
    borderColor: "#000",
  },
  iconsScroll: {
    flexDirection: "row",
    marginTop: 10,
  },
  iconOption: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    borderWidth: 2,
    borderColor: "transparent",
  },
  iconOptionActive: {
    borderColor: "#3B82F6",
    backgroundColor: "#EFF6FF",
  },
  btnCancel: {
    marginTop: 15,
    alignItems: "center",
    padding: 10,
  },
  btnCancelText: {
    color: "#666",
    fontSize: 14,
  },
  dropdownButton: {
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  dropdownButtonText: {
    fontSize: 15,
    color: "#1E293B",
    textTransform: "capitalize",
  },
  dropdownContainer: {
    backgroundColor: "white",
    borderRadius: 10,
    marginTop: 5,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    // Pour que la liste passe au-dessus des autres éléments
    position: "absolute",
    top: 70,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 5, // Ombre sur Android
    shadowColor: "#000", // Ombre sur iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownItem: {
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  dropdownItemActive: {
    backgroundColor: "#EFF6FF",
  },
  dropdownItemText: {
    fontSize: 14,
    color: "#475569",
  },
  dropdownItemTextActive: {
    color: "#3B82F6",
    fontWeight: "600",
  },
});

export default GestionFournisseurs;
