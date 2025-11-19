// CommandeFournisseurs.tsx
// @ts-nocheck

import React, { useState, useEffect } from 'react';
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
  Linking
} from 'react-native';
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../../firebaseConfig';

const { width } = Dimensions.get('window');

const CommandeFournisseurs = ({ navigation }: any) => {
  const [fournisseurs, setFournisseurs] = useState([]);
  const [produits, setProduits] = useState([]);
  const [commandes, setCommandes] = useState([]);
  const [panier, setPanier] = useState({});
  const [selectedFournisseur, setSelectedFournisseur] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchCategory, setSearchCategory] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSearchHelp, setShowSearchHelp] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Récupérer les données
  useEffect(() => {
    const unsubFournisseurs = onSnapshot(query(collection(db, 'fournisseurs')), (snapshot) => {
      setFournisseurs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubProduits = onSnapshot(query(collection(db, 'produits')), (snapshot) => {
      setProduits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubCommandes = onSnapshot(query(collection(db, 'commandes')), (snapshot) => {
      setCommandes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubFournisseurs();
      unsubProduits();
      unsubCommandes();
    };
  }, []);

  // Fonction pour afficher le logo ou une icône par défaut
  const renderLogo = (logoUrl, defaultIcon, size = 40) => {
    if (logoUrl) {
      return (
        <Image 
          source={{ uri: logoUrl }} 
          style={{ 
            width: size, 
            height: size, 
            borderRadius: 8,
            borderWidth: 2,
            borderColor: '#E5E7EB'
          }} 
        />
      );
    }
    return (
      <View style={{
        width: size,
        height: size,
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Text style={{ fontSize: size * 0.5, color: '#9CA3AF' }}>
          {defaultIcon}
        </Text>
      </View>
    );
  };

  // Filtrer les produits par fournisseur et recherche multi-critères
  const produitsFiltres = produits.filter(produit => {
    const matchFournisseur = selectedFournisseur === 'all' || produit.fournisseurId === selectedFournisseur;
    
    if (searchTerm === '') return matchFournisseur;

    const searchLower = searchTerm.toLowerCase();
    const fournisseur = fournisseurs.find(f => f.id === produit.fournisseurId);

    switch (searchCategory) {
      case 'reference':
        return matchFournisseur && produit.reference?.toLowerCase().includes(searchLower);
      
      case 'nom':
        return matchFournisseur && produit.nom?.toLowerCase().includes(searchLower);
      
      case 'description':
        return matchFournisseur && produit.description?.toLowerCase().includes(searchLower);
      
      case 'fournisseur':
        return matchFournisseur && fournisseur?.nomEntreprise.toLowerCase().includes(searchLower);
      
      case 'prix':
        if (searchLower.includes('-')) {
          const [min, max] = searchLower.split('-').map(p => parseFloat(p.trim()));
          return matchFournisseur && 
                 produit.prix >= (min || 0) && 
                 produit.prix <= (max || Infinity);
        }
        const prixRecherche = parseFloat(searchLower);
        return matchFournisseur && !isNaN(prixRecherche) && produit.prix === prixRecherche;
      
      case 'stock':
        if (searchLower.startsWith('>')) {
          const minStock = parseInt(searchLower.slice(1));
          return matchFournisseur && produit.stock > minStock;
        } else if (searchLower.startsWith('<')) {
          const maxStock = parseInt(searchLower.slice(1));
          return matchFournisseur && produit.stock < maxStock;
        } else if (searchLower.includes('-')) {
          const [min, max] = searchLower.split('-').map(s => parseInt(s.trim()));
          return matchFournisseur && 
                 produit.stock >= (min || 0) && 
                 produit.stock <= (max || Infinity);
        }
        const stockRecherche = parseInt(searchLower);
        return matchFournisseur && !isNaN(stockRecherche) && produit.stock === stockRecherche;
      
      case 'all':
      default:
        return matchFournisseur && (
          produit.reference?.toLowerCase().includes(searchLower) ||
          produit.nom?.toLowerCase().includes(searchLower) ||
          produit.description?.toLowerCase().includes(searchLower) ||
          fournisseur?.nomEntreprise.toLowerCase().includes(searchLower) ||
          produit.prix?.toString().includes(searchLower) ||
          produit.stock?.toString().includes(searchLower)
        );
    }
  });

  // Gérer l'ajout au panier
  const ajouterAuPanier = (produitId) => {
    setPanier(prev => ({
      ...prev,
      [produitId]: (prev[produitId] || 0) + 1
    }));
  };

  // Gérer la suppression du panier
  const retirerDuPanier = (produitId) => {
    setPanier(prev => {
      const newPanier = { ...prev };
      if (newPanier[produitId] > 1) {
        newPanier[produitId]--;
      } else {
        delete newPanier[produitId];
      }
      return newPanier;
    });
  };

  // Supprimer un produit du panier
  const supprimerDuPanier = (produitId) => {
    setPanier(prev => {
      const newPanier = { ...prev };
      delete newPanier[produitId];
      return newPanier;
    });
  };

  // Obtenir les produits du panier groupés par fournisseur
  const getPanierParFournisseur = () => {
    const panierParFournisseur = {};
    
    Object.keys(panier).forEach(produitId => {
      const produit = produits.find(p => p.id === produitId);
      if (produit) {
        const fournisseurId = produit.fournisseurId;
        if (!panierParFournisseur[fournisseurId]) {
          panierParFournisseur[fournisseurId] = {
            fournisseur: fournisseurs.find(f => f.id === fournisseurId),
            produits: []
          };
        }
        panierParFournisseur[fournisseurId].produits.push({
          ...produit,
          quantite: panier[produitId]
        });
      }
    });

    return panierParFournisseur;
  };

  // Calculer le total de la commande
  const calculerTotal = () => {
    return Object.keys(panier).reduce((total, produitId) => {
      const produit = produits.find(p => p.id === produitId);
      return total + (produit?.prix || 0) * panier[produitId];
    }, 0);
  };

  // Générer le contenu du message pour WhatsApp
  const genererMessageCommande = (fournisseurId) => {
    const panierFournisseur = getPanierParFournisseur()[fournisseurId];
    if (!panierFournisseur) return '';

    const fournisseur = panierFournisseur.fournisseur;
    let message = `📦 COMMANDE - ${fournisseur.nomEntreprise}\n\n`;
    message += `Date: ${new Date().toLocaleDateString('fr-FR')}\n`;
    message += `Référence: CMD-${Date.now().toString().slice(-6)}\n\n`;
    message += `DÉTAIL DE LA COMMANDE:\n`;
    message += '─'.repeat(30) + '\n\n';

    panierFournisseur.produits.forEach((produit, index) => {
      message += `${index + 1}. ${produit.reference} - ${produit.nom}\n`;
      message += `   📸 ${produit.logo ? 'Logo disponible' : 'Pas de logo'}\n`;
      message += `   📦 Quantité: ${produit.quantite} ${produit.unite}\n`;
      message += `   💰 Prix unitaire: ${produit.prix}€\n`;
      message += `   🧮 Sous-total: ${(produit.prix * produit.quantite).toFixed(2)}€\n\n`;
    });

    const total = panierFournisseur.produits.reduce((sum, p) => sum + (p.prix * p.quantite), 0);
    message += `💰 TOTAL: ${total.toFixed(2)}€\n\n`;
    message += `Merci de confirmer la disponibilité et les délais de livraison.\n`;
    message += `Cordialement`;

    return message;
  };

  // Envoyer la commande
  const envoyerCommande = async (methodeEnvoi) => {
    if (Object.keys(panier).length === 0) {
      Alert.alert('Erreur', 'Le panier est vide !');
      return;
    }

    setIsSubmitting(true);
    try {
      const panierParFournisseur = getPanierParFournisseur();
      const referenceCommande = `CMD-${Date.now().toString().slice(-6)}`;

      // Créer une commande principale
      const commandePrincipale = {
        reference: referenceCommande,
        date: serverTimestamp(),
        statut: 'envoyee',
        total: calculerTotal(),
        methodeEnvoi: methodeEnvoi
      };

      const commandeDocRef = await addDoc(collection(db, 'commandes'), commandePrincipale);

      // Créer des sous-commandes pour chaque fournisseur
      for (const fournisseurId in panierParFournisseur) {
        const panierFournisseur = panierParFournisseur[fournisseurId];
        const fournisseur = panierFournisseur.fournisseur;

        // Créer la sous-commande dans Firestore
        const sousCommande = {
          commandeId: commandeDocRef.id,
          fournisseurId: fournisseurId,
          fournisseurNom: fournisseur.nomEntreprise,
          fournisseurEmail: fournisseur.email,
          fournisseurTelephone: fournisseur.telephone,
          produits: panierFournisseur.produits.map(p => ({
            produitId: p.id,
            reference: p.reference,
            nom: p.nom,
            logo: p.logo,
            quantite: p.quantite,
            unite: p.unite,
            prix: p.prix
          })),
          total: panierFournisseur.produits.reduce((sum, p) => sum + (p.prix * p.quantite), 0),
          statut: 'en_attente',
          date: serverTimestamp(),
          methodeEnvoi: methodeEnvoi
        };

        await addDoc(collection(db, 'sous_commandes'), sousCommande);

        // Envoyer selon la méthode choisie
        switch (methodeEnvoi) {
          case 'email':
            await envoyerEmail(fournisseur, sousCommande);
            break;
          case 'whatsapp':
            await envoyerWhatsApp(fournisseur, sousCommande);
            break;
          case 'notification':
            await creerNotification(fournisseurId, sousCommande);
            break;
          case 'tous':
            await envoyerEmail(fournisseur, sousCommande);
            await envoyerWhatsApp(fournisseur, sousCommande);
            await creerNotification(fournisseurId, sousCommande);
            break;
        }
      }

      Alert.alert('Succès', 'Commandes envoyées avec succès !');
      setPanier({});
    } catch (error) {
      console.error('Erreur:', error);
      Alert.alert('Erreur', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Simuler l'envoi d'email
  const envoyerEmail = async (fournisseur, sousCommande) => {
    console.log('Email envoyé à:', fournisseur.email);
    // Dans une vraie app, vous utiliseriez un service d'email
  };

  // Ouvrir WhatsApp
  const envoyerWhatsApp = async (fournisseur, sousCommande) => {
    const message = genererMessageCommande(fournisseur.id);
    const phone = fournisseur.telephone?.replace(/\s/g, '');
    
    if (phone) {
      const whatsappUrl = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
      
      try {
        const supported = await Linking.canOpenURL(whatsappUrl);
        if (supported) {
          await Linking.openURL(whatsappUrl);
        } else {
          Alert.alert('Erreur', 'WhatsApp n\'est pas installé sur cet appareil');
        }
      } catch (error) {
        Alert.alert('Erreur', 'Impossible d\'ouvrir WhatsApp');
      }
    } else {
      Alert.alert('Erreur', `Numéro de téléphone non disponible pour ${fournisseur.nomEntreprise}`);
    }
  };

  // Créer une notification dans la base de données
  const creerNotification = async (fournisseurId, sousCommande) => {
    try {
      await addDoc(collection(db, 'notifications'), {
        fournisseurId: fournisseurId,
        type: 'nouvelle_commande',
        titre: 'Nouvelle commande reçue',
        message: `Vous avez une nouvelle commande (${sousCommande.reference})`,
        commandeId: sousCommande.commandeId,
        lu: false,
        date: serverTimestamp()
      });
    } catch (error) {
      console.error('Erreur création notification:', error);
    }
  };

   
  
  // Vider la recherche
  const viderRecherche = () => {
    setSearchTerm('');
    setSearchCategory('all');
  };

  // Obtenir le placeholder dynamique selon la catégorie
  const getSearchPlaceholder = () => {
    switch (searchCategory) {
      case 'reference':
        return 'Rechercher par référence... (ex: PROD-001)';
      case 'nom':
        return 'Rechercher par nom de produit...';
      case 'description':
        return 'Rechercher dans les descriptions...';
      case 'fournisseur':
        return 'Rechercher par nom de fournisseur...';
      case 'prix':
        return 'Rechercher par prix... (ex: 10.50 ou 10-20)';
      case 'stock':
        return 'Rechercher par stock... (ex: >10, <5, 10-50)';
      case 'all':
      default:
        return 'Rechercher dans tous les champs...';
    }
  };

  // Obtenir l'icône selon la catégorie
  const getSearchIcon = () => {
    switch (searchCategory) {
      case 'reference':
        return '🏷️';
      case 'nom':
        return '📦';
      case 'description':
        return '🔍';
      case 'fournisseur':
        return '🏢';
      case 'prix':
        return '💰';
      case 'stock':
        return '📊';
      case 'all':
      default:
        return '🔍';
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>📦 Passer une Commande</Text>
        <Text style={styles.subtitle}>
          Sélectionnez les produits et envoyez les commandes aux fournisseurs
        </Text>
      </View>

      <View style={styles.mainContent}>
        {/* Section Produits */}
        <View style={styles.produitsSection}>
          {/* Barre de recherche avancée */}
          <View style={styles.searchSection}>
            <View style={styles.searchFilters}>
              {/* Sélecteur de catégorie de recherche */}
              <View style={styles.filterContainer}>
                <Text style={styles.filterIcon}>📊</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryFilter}>
                  {[
                    { value: 'all', label: 'Tous critères' },
                    { value: 'reference', label: 'Référence' },
                    { value: 'nom', label: 'Nom' },
                    { value: 'description', label: 'Description' },
                    { value: 'fournisseur', label: 'Fournisseur' },
                    { value: 'prix', label: 'Prix' },
                    { value: 'stock', label: 'Stock' }
                  ].map(category => (
                    <TouchableOpacity
                      key={category.value}
                      style={[
                        styles.categoryChip,
                        searchCategory === category.value && styles.categoryChipActive
                      ]}
                      onPress={() => setSearchCategory(category.value)}
                    >
                      <Text style={[
                        styles.categoryChipText,
                        searchCategory === category.value && styles.categoryChipTextActive
                      ]}>
                        {category.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Filtre par fournisseur */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fournisseurFilter}>
                <TouchableOpacity
                  style={[
                    styles.fournisseurChip,
                    selectedFournisseur === 'all' && styles.fournisseurChipActive
                  ]}
                  onPress={() => setSelectedFournisseur('all')}
                >
                  <Text style={[
                    styles.fournisseurChipText,
                    selectedFournisseur === 'all' && styles.fournisseurChipTextActive
                  ]}>
                    Tous
                  </Text>

                </TouchableOpacity>
                {fournisseurs.map(f => (
                  <TouchableOpacity
                    key={f.id}
                    style={[
                      styles.fournisseurChip,
                      selectedFournisseur === f.id && styles.fournisseurChipActive
                    ]}
                    onPress={() => setSelectedFournisseur(f.id)}
                  >
                    <Text style={[
                      styles.fournisseurChipText,
                      selectedFournisseur === f.id && styles.fournisseurChipTextActive
                    ]}>
                      {f.nomEntreprise}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Bouton aide recherche */}
              <TouchableOpacity
                style={styles.helpButton}
                onPress={() => setShowSearchHelp(!showSearchHelp)}
              >
                <Text style={styles.helpButtonText}>🔍 Aide recherche</Text>
              </TouchableOpacity>
            </View>

            {/* Champ de recherche principal */}
            <View style={styles.searchInputContainer}>
              <Text style={styles.searchIcon}>{getSearchIcon()}</Text>
              <TextInput
                style={styles.searchInput}
                placeholder={getSearchPlaceholder()}
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
              {searchTerm ? (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={viderRecherche}
                >
                  <Text style={styles.clearButtonText}>✕</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Aide à la recherche */}
            {showSearchHelp && (
              <View style={styles.helpContainer}>
                <Text style={styles.helpTitle}>🔍 Astuces de recherche :</Text>
                <View style={styles.helpTips}>
                  <Text style={styles.helpTip}><Text style={styles.helpBold}>Prix :</Text> "10.50" (exact) ou "10-20" (fourchette)</Text>
                  <Text style={styles.helpTip}><Text style={styles.helpBold}>Stock :</Text> "10" (supérieur), "&lt;5" (inférieur), "10-50" (fourchette)</Text>
                  <Text style={styles.helpTip}><Text style={styles.helpBold}>Référence :</Text> "PROD-001" (numéro exact)</Text>
                  <Text style={styles.helpTip}><Text style={styles.helpBold}>Tous critères :</Text> Recherche dans tous les champs</Text>
                </View>
              </View>
            )}
          </View>

          {/* Compteur de résultats */}
          <View style={styles.resultsCounter}>
            <Text style={styles.resultsText}>
              {produitsFiltres.length} produit(s) trouvé(s)
              {(searchCategory !== 'all' || searchTerm) && (
                <Text style={styles.filterInfo}>
                  {searchCategory !== 'all' && ` (filtre: ${searchCategory})`}
                </Text>
              )}
            </Text>
            {(searchTerm || selectedFournisseur !== 'all' || searchCategory !== 'all') && (
              <TouchableOpacity
                style={styles.resetButton}
                onPress={viderRecherche}
              >
                <Text style={styles.resetButtonText}>Réinitialiser tout</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Liste des produits */}
          <ScrollView
            style={styles.produitsList}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
          >
            {produitsFiltres.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>🔍</Text>
                <Text style={styles.emptyStateTitle}>Aucun produit trouvé</Text>
                <Text style={styles.emptyStateText}>
                  {searchTerm ? 
                    `Aucun résultat pour "${searchTerm}" dans ${searchCategory !== 'all' ? searchCategory : 'tous les critères'}` : 
                    'Aucun produit disponible avec les filtres actuels'
                  }
                </Text>


                {(searchTerm || selectedFournisseur !== 'all' || searchCategory !== 'all') && (
                  <TouchableOpacity
                    style={styles.showAllButton}
                    onPress={viderRecherche}
                  >

                    <Text style={styles.showAllButtonText}>Afficher tous les produits</Text>
                  </TouchableOpacity>

                )}
              </View>
            ) 
            :       
             (
              produitsFiltres.map(produit => {
                const fournisseur = fournisseurs.find(f => f.id === produit.fournisseurId);
                const quantitePanier = panier[produit.id] || 0;

                return (
                  <View key={produit.id} style={[
                    styles.produitCard,
                    quantitePanier > 0 && styles.produitCardSelected
                  ]}>
                    
                    {/* Logo du produit */}
                    <View style={styles.produitLogo}>

                      {renderLogo(produit.logo, '📦', 60)}
                                    
                   
                    </View>
                       
                           
                    {/* Informations du produit */}
                    <View style={styles.produitInfo}>
                      <Text style={styles.produitNom}>
                        {produit.reference} - {produit.nom}
                      </Text>
                      <Text style={styles.produitDetails}>
                        {fournisseur?.nomEntreprise} • {produit.prix}€/{produit.unite} • Stock: {produit.stock}
                      </Text>
                      {produit.description && (
                        <Text style={styles.produitDescription}>
                          {produit.description}
                        </Text>
                      )}
                    </View>

                    {/* Contrôles de quantité */}
                    <View style={styles.quantityControls}>
                      {quantitePanier > 0 && (
                        <>
                          <TouchableOpacity
                            style={styles.quantityButtonRemove}
                            onPress={() => retirerDuPanier(produit.id)}
                          >
                            <Text style={styles.quantityButtonText}>-</Text>
                          </TouchableOpacity>
                          
                          <Text style={styles.quantityText}>
                            {quantitePanier}
                          </Text>
                        </>
                      )}
                      
                      <TouchableOpacity
                        style={[
                          styles.quantityButtonAdd,
                          produit.stock <= quantitePanier && styles.quantityButtonDisabled
                        ]}
                        onPress={() => ajouterAuPanier(produit.id)}
                        disabled={produit.stock <= quantitePanier}
                      >
                        <Text style={styles.quantityButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>

        {/* Section Panier */}
        <View style={styles.panierSection}>
          <Text style={styles.panierTitle}>🛒 Panier de Commandes</Text>

          {Object.keys(panier).length === 0 ? (
            <View style={styles.emptyPanier}>
              <Text style={styles.emptyPanierIcon}>🛒</Text>
              <Text style={styles.emptyPanierText}>Votre panier est vide</Text>
              <Text style={styles.emptyPanierSubtext}>Ajoutez des produits pour commencer</Text>
            </View>
          ) : (
            <>
              {/* Résumé par fournisseur */}
              <View style={styles.fournisseursSummary}>
                <Text style={styles.summaryTitle}>Commandes à préparer:</Text>
                
                <ScrollView style={styles.fournisseursList}>
                  {Object.entries(getPanierParFournisseur()).map(([fournisseurId, data]) => (
                    <View key={fournisseurId} style={styles.fournisseurCard}>
                      <Text style={styles.fournisseurName}>
                        {data.fournisseur.nomEntreprise}
                      </Text>
                      <View style={styles.produitsList}>
                        {data.produits.map(produit => (
                          <View key={produit.id} style={styles.produitRow}>
                            {renderLogo(produit.logo, '📦', 40)}
                            <View style={styles.produitInfoCompact}>
                              <Text style={styles.produitNomCompact}>
                                {produit.reference}
                              </Text>
                              <Text style={styles.produitDetailsCompact}>
                                {produit.nom}
                              </Text>
                            </View>
                            <View style={styles.produitQuantite}>
                              <Text style={styles.quantiteText}>
                                {produit.quantite} {produit.unite}
                              </Text>
                              <Text style={styles.sousTotalText}>
                                {(produit.prix * produit.quantite).toFixed(2)}€
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                      <View style={styles.fournisseurTotal}>
                        <Text style={styles.fournisseurTotalLabel}>Total:</Text>
                        <Text style={styles.fournisseurTotalValue}>
                          {data.produits.reduce((sum, p) => sum + (p.prix * p.quantite), 0).toFixed(2)}€
                        </Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>

              {/* Total Général */}
              <View style={styles.totalGeneral}>
                <Text style={styles.totalLabel}>Total Général:</Text>
                <Text style={styles.totalValue}>
                  {calculerTotal().toFixed(2)}€
                </Text>
              </View>

              {/* Boutons d'envoi */}
              <View style={styles.sendButtons}>
                <TouchableOpacity
                  style={[styles.sendButton, styles.emailButton]}
                  onPress={() => envoyerCommande('email')}
                  disabled={isSubmitting}
                >
                  <Text style={styles.sendButtonText}>📧 Envoyer par Email</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sendButton, styles.whatsappButton]}
                  onPress={() => envoyerCommande('whatsapp')}
                  disabled={isSubmitting}
                >
                  <Text style={styles.sendButtonText}>💚 Envoyer par WhatsApp</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sendButton, styles.notificationButton]}
                  onPress={() => envoyerCommande('notification')}
                  disabled={isSubmitting}
                >
                  <Text style={styles.sendButtonText}>🔔 Notification Interne</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sendButton, styles.allChannelsButton]}
                  onPress={() => envoyerCommande('tous')}
                  disabled={isSubmitting}
                >
                  <Text style={styles.sendButtonText}>🚀 Tous les Canaux</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sendButton, styles.clearButton]}
                  onPress={() => setPanier({})}
                >
                  <Text style={styles.sendButtonText}>🗑️ Vider le Panier</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
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
  mainContent: {
    flex: 1,
    flexDirection: width > 768 ? 'row' : 'column',
    padding: 16,
    gap: 16,
  },
  produitsSection: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchSection: {
    marginBottom: 16,
  },
  searchFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  filterIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  categoryFilter: {
    flex: 1,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginRight: 8,
    backgroundColor: 'white',
  },
  categoryChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  categoryChipText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: 'white',
  },
  fournisseurFilter: {
    flex: 1,
  },
  fournisseurChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginRight: 8,
    backgroundColor: 'white',
  },
  fournisseurChipActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  fournisseurChipText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  fournisseurChipTextActive: {
    color: 'white',
  },
  helpButton: {
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 8,
  },
  helpButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    padding: 12,
    paddingLeft: 40,
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: '500',
    backgroundColor: 'white',
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    padding: 4,
    zIndex: 1,
  },
  clearButtonText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  helpContainer: {
    marginTop: 12,
    padding: 16,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 8,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369A1',
    marginBottom: 8,
  },
  helpTips: {
    gap: 4,
  },
  helpTip: {
    fontSize: 12,
    color: '#0369A1',
  },
  helpBold: {
    fontWeight: '600',
  },
  resultsCounter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  resultsText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
  },
  filterInfo: {
    color: '#3B82F6',
  },
  resetButton: {
    padding: 6,
    paddingHorizontal: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 6,
  },
  resetButtonText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  produitsList: {
    maxHeight: 600,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  showAllButton: {
    marginTop: 16,
    padding: 8,
    paddingHorizontal: 16,
    backgroundColor: '#3B82F6',
    borderRadius: 6,
  },
  showAllButtonText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
  },
  produitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: 'white',
    gap: 16,
    marginBottom: 12,
  },
  produitCardSelected: {
    backgroundColor: '#F0F9FF',
  },
  produitLogo: {
    // Styles pour le logo
  },
  produitInfo: {
    flex: 1,
  },
  produitNom: {
    fontWeight: '700',
    fontSize: 16,
    color: '#111827',
  },
  produitDetails: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  produitDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityButtonRemove: {
    padding: 8,
    paddingHorizontal: 12,
    backgroundColor: '#EF4444',
    borderRadius: 6,
  },
  quantityButtonAdd: {
    padding: 8,
    paddingHorizontal: 12,
    backgroundColor: '#10B981',
    borderRadius: 6,
  },
  quantityButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  quantityButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  quantityText: {
    fontWeight: '700',
    fontSize: 16,
    minWidth: 30,
    textAlign: 'center',
  },
  panierSection: {
    width: width > 768 ? 400 : '100%',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  panierTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  emptyPanier: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyPanierIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyPanierText: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
  },
  emptyPanierSubtext: {
    fontSize: 14,
    color: '#6B7280',
  },
  fournisseursSummary: {
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  fournisseursList: {
    maxHeight: 300,
  },
  fournisseurCard: {
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  fournisseurName: {
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
    fontSize: 16,
  },
  produitsList: {
    gap: 8,
  },
  produitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 8,
    backgroundColor: 'white',
    borderRadius: 6,
  },
  produitInfoCompact: {
    flex: 1,
  },
  produitNomCompact: {
    fontWeight: '600',
    fontSize: 14,
  },
  produitDetailsCompact: {
    fontSize: 13,
    color: '#6B7280',
  },
  produitQuantite: {
    alignItems: 'flex-end',
  },
  quantiteText: {
    fontWeight: '600',
    fontSize: 14,
  },
  sousTotalText: {
    fontSize: 13,
    color: '#059669',
  },
  fournisseurTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  fournisseurTotalLabel: {
    fontWeight: '600',
    color: '#0369A1',
  },
  fournisseurTotalValue: {
    fontWeight: '700',
    color: '#0369A1',
  },
  totalGeneral: {
    padding: 16,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#BAE6FD',
    marginBottom: 16,
  },
  totalLabel: {
    fontWeight: '600',
    color: '#0369A1',
  },
  totalValue: {
    fontWeight: '700',
    fontSize: 18,
    color: '#0369A1',
  },
  sendButtons: {
    gap: 12,
  },
  sendButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  emailButton: {
    backgroundColor: '#10B981',
  },
  whatsappButton: {
    backgroundColor: '#25D366',
  },
  notificationButton: {
    backgroundColor: '#F59E0B',
  },
  allChannelsButton: {
    backgroundColor: '#4F46E5',
  },
  clearButton: {
    backgroundColor: '#6B7280',
  },
  sendButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default CommandeFournisseurs;