// CommandeFournisseurs.tsx
// @ts-nocheck

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert, 
    RefreshControl, Platform, Dimensions, Image, Linking, ActivityIndicator,
    Modal, KeyboardAvoidingView
} from 'react-native';
import {
    collection, query, onSnapshot, addDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// --- COULEURS ET CONSTANTES THÉMATIQUES ---
const { width, height } = Dimensions.get('window');
const isLargeScreen = width > 768;
const isMediumScreen = width > 480;

const COLORS = {
    primary: '#1E40AF', 
    accent: '#3B82F6', 
    success: '#10B981',
    whatsapp: '#25D366',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#0EA5E9',
    neutral: '#6B7280',
    background: '#F3F4F6',
    surface: 'white',
    textPrimary: '#111827',
    textSecondary: '#6B7280',
    borderLight: '#E5E7EB',
    borderAccent: '#BAE6FD',
    selectedBg: '#F0F9FF',
    headerText: 'white',
    devis: '#8B5CF6',
    devisLight: '#DDD6FE'
};

// --- COMPOSANT PRINCIPAL ---

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
    const [showDevisModal, setShowDevisModal] = useState(false);
    const [showFournisseurModal, setShowFournisseurModal] = useState(false);
    const [selectedFournisseurForDevis, setSelectedFournisseurForDevis] = useState(null);
    const [customFournisseur, setCustomFournisseur] = useState({
        nomEntreprise: '',
        email: '',
        telephone: '',
        adresse: ''
    });
    const [devisDetails, setDevisDetails] = useState({
        objet: 'Demande de devis',
        delaiLivraison: '15 jours',
        conditionsPaiement: '30 jours fin de mois',
        remarques: '',
        nomContact: 'Service Maintenance Hôtel',
        emailContact: 'maintenance@hotel.com',
        telephoneContact: '+33 1 23 45 67 89',
        validiteDevis: '30 jours',
        reference: `DEV-${Date.now().toString().slice(-6)}`
    });

    // --- Récupérer les données (Listeners Firebase)
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

    // --- Logique de Filtrage (Optimisé avec useMemo)
    const produitsFiltres = useMemo(() => {
        return produits.filter(produit => {
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
                        return matchFournisseur && produit.prix >= (min || 0) && produit.prix <= (max || Infinity);
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
                        return matchFournisseur && produit.stock >= (min || 0) && produit.stock <= (max || Infinity);
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
    }, 
    [produits, selectedFournisseur, searchTerm, searchCategory, fournisseurs]);
    
    // --- Fonctions Panier
    const ajouterAuPanier = (produitId: string) => {
        setPanier(prev => ({ ...prev, [produitId]: (prev[produitId] || 0) + 1 }));
    };
    const retirerDuPanier = (produitId: string) => {
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
    const supprimerDuPanier = (produitId: string) => {
        setPanier(prev => { 
            const newPanier = { ...prev }; 
            delete newPanier[produitId]; 
            return newPanier; 
        });
    };

    const calculerTotal = () => {
        return Object.keys(panier).reduce((total, produitId) => {
            const produit = produits.find(p => p.id === produitId);
            return total + (produit?.prix || 0) * panier[produitId];
        }, 0);
    };

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

    // --- Fonction pour ouvrir le modal de sélection de fournisseur
    const ouvrirModalDevis = () => {
        // if (Object.keys(panier).length === 0) {
        //     Alert.alert('Erreur', 'Le panier est vide ! Ajoutez des produits avant de demander un devis.');
        //     return;
        // }
        setShowFournisseurModal(true);
    };

    // --- Fonction pour continuer avec un fournisseur sélectionné
    const continuerAvecFournisseur = (fournisseur = null) => {
        setSelectedFournisseurForDevis(fournisseur);
        setShowFournisseurModal(false);
        setShowDevisModal(true);
        
        // Si c'est un fournisseur personnalisé, initialiser les champs
        if (fournisseur === null) {
            setCustomFournisseur({
                nomEntreprise: '',
                email: '',
                telephone: '',
                adresse: ''
            });
        }
    };

    // --- Génération du message devis amélioré
    const genererMessageDevis = () => {
        let message = '';
        
        if (selectedFournisseurForDevis === null) {
            // Fournisseur personnalisé
            message = `📋 DEMANDE DE DEVIS - ${customFournisseur.nomEntreprise}\n\n`;
        } else {
            // Fournisseur existant
            message = `📋 DEMANDE DE DEVIS - ${selectedFournisseurForDevis.nomEntreprise}\n\n`;
        }
        
        message += `Objet: ${devisDetails.objet}\n`;
        message += `Référence: ${devisDetails.reference}\n`;
        message += `Date: ${new Date().toLocaleDateString('fr-FR')}\n`;
        message += `Validité du devis: ${devisDetails.validiteDevis}\n\n`;
        
        message += `--- INFORMATIONS DU DEMANDEUR ---\n`;
        message += `👤 Contact: ${devisDetails.nomContact}\n`;
        message += `📧 Email: ${devisDetails.emailContact}\n`;
        message += `📱 Téléphone: ${devisDetails.telephoneContact}\n\n`;
        
        message += `--- DÉTAIL DES ARTICLES DEMANDÉS ---\n`;
        message += '─'.repeat(40) + '\n\n';

        // Récupérer tous les produits du panier
        const allProduits = Object.keys(panier).map(produitId => {
            const produit = produits.find(p => p.id === produitId);
            return {
                ...produit,
                quantite: panier[produitId]
            };
        });

        allProduits.forEach((produit, index) => {
            message += `ARTICLE ${index + 1}:\n`;
            message += `🔹 Référence: ${produit.reference}\n`;
            message += `🔹 Désignation: ${produit.nom}\n`;
            if (produit.description) {
                message += `🔹 Description: ${produit.description}\n`;
            }
            message += `🔹 Quantité: ${produit.quantite} ${produit.unite}\n`;
            message += `🔹 Prix unitaire actuel: ${produit.prix}€\n`;
            message += `🔹 Sous-total: ${(produit.prix * produit.quantite).toFixed(2)}€\n\n`;
        });

        const totalEstime = allProduits.reduce((sum, p) => sum + (p.prix * p.quantite), 0);
        message += `💰 TOTAL ESTIMÉ: ${totalEstime.toFixed(2)}€\n\n`;
        
        message += `--- CONDITIONS DEMANDÉES ---\n`;
        message += `⏱️ Délai de livraison souhaité: ${devisDetails.delaiLivraison}\n`;
        message += `💳 Conditions de paiement: ${devisDetails.conditionsPaiement}\n`;
        message += `📅 Validité de l'offre: ${devisDetails.validiteDevis}\n\n`;
        
        if (devisDetails.remarques) {
            message += `📝 REMARQUES SUPPLÉMENTAIRES:\n${devisDetails.remarques}\n\n`;
        }
        
        message += `--- INSTRUCTIONS ---\n`;
        message += `Merci de nous faire parvenir votre meilleure proposition commerciale incluant:\n`;
        message += `✅ Prix unitaire et total TTC\n`;
        message += `✅ Délais de livraison exacts\n`;
        message += `✅ Conditions de paiement détaillées\n`;
        message += `✅ Garanties et conditions de retour\n`;
        message += `✅ Fiche technique si applicable\n\n`;
        
        message += `Cette demande n'engage pas à l'achat.\n\n`;
        message += `Dans l'attente de votre retour,\n`;
        message += `Cordialement,\n`;
        message += `${devisDetails.nomContact}\n`;
        message += `${devisDetails.emailContact}\n`;
        message += `${devisDetails.telephoneContact}`;

        return message;
    };

    // --- Fonction pour rendre le logo du produit
    const renderProduitLogo = (produit) => {
        if (produit.logo) {
            return (
                <Image 
                    source={{ uri: produit.logo }} 
                    style={styles.produitLogo}
                />
            );
        }
        
        return (
            <View style={[styles.produitLogo, styles.defaultLogo]}>
                <Icon name="package-variant" size={24} color="#6B7280" />
            </View>
        );
    };

    // --- Envoi du devis
    const envoyerDevis = async (methodeEnvoi: string) => {
        setIsSubmitting(true);
        
        try {
            const referenceDevis = devisDetails.reference;
            const message = genererMessageDevis();
            
            // Créer l'enregistrement du devis dans Firestore
            const devisData = {
                reference: referenceDevis,
                date: serverTimestamp(),
                statut: 'en_attente',
                type: 'devis',
                details: devisDetails,
                totalEstime: calculerTotal(),
                produits: Object.keys(panier).map(produitId => {
                    const produit = produits.find(p => p.id === produitId);
                    return {
                        produitId: produit.id,
                        reference: produit.reference,
                        nom: produit.nom,
                        quantite: panier[produitId],
                        unite: produit.unite,
                        prix: produit.prix
                    };
                })
            };

            if (selectedFournisseurForDevis !== null) {
                // Fournisseur existant
                devisData.fournisseurId = selectedFournisseurForDevis.id;
                devisData.fournisseurNom = selectedFournisseurForDevis.nomEntreprise;
                devisData.fournisseurEmail = selectedFournisseurForDevis.email;
                devisData.fournisseurTelephone = selectedFournisseurForDevis.telephone;
                
                // Envoyer selon la méthode choisie
                switch (methodeEnvoi) {
                    case 'email':
                        await envoyerEmail(selectedFournisseurForDevis, message, `Demande de Devis - ${referenceDevis}`);
                        break;
                    case 'whatsapp':
                        await envoyerWhatsApp(selectedFournisseurForDevis, message);
                        break;
                    case 'tous':
                        await envoyerEmail(selectedFournisseurForDevis, message, `Demande de Devis - ${referenceDevis}`);
                        await envoyerWhatsApp(selectedFournisseurForDevis, message);
                        break;
                }
            } else {
                // Fournisseur personnalisé
                devisData.fournisseurPersonnalise = customFournisseur;
                
                // Envoyer par email uniquement pour les fournisseurs personnalisés
                if (methodeEnvoi === 'email' || methodeEnvoi === 'tous') {
                    const emailUrl = `mailto:${customFournisseur.email}?subject=${encodeURIComponent(`Demande de Devis - ${referenceDevis}`)}&body=${encodeURIComponent(message)}`;
                    await Linking.openURL(emailUrl);
                }
            }

            // Sauvegarder dans Firestore
            await addDoc(collection(db, 'commandes'), devisData);
            
            Alert.alert(
                'Succès ✅', 
                `Demande de devis envoyée avec succès à ${selectedFournisseurForDevis ? selectedFournisseurForDevis.nomEntreprise : customFournisseur.nomEntreprise}`,
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            setPanier({});
                            setShowDevisModal(false);
                            setSelectedFournisseurForDevis(null);
                            setCustomFournisseur({
                                nomEntreprise: '',
                                email: '',
                                telephone: '',
                                adresse: ''
                            });
                        }
                    }
                ]
            );

        } catch (error) {
            console.error('Erreur:', error);
            Alert.alert('Erreur', 'Erreur lors de l\'envoi: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Fonctions d'envoi (existantes)
    const envoyerEmail = async (fournisseur: any, message: string, sujet: string) => {
        const url = `mailto:${fournisseur.email}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(message)}`;

        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
                return true;
            } else {
                Alert.alert("Erreur d'email", `Impossible d'ouvrir l'application mail pour ${fournisseur.email}`);
                return false;
            }
        } catch (error) {
            console.error('Erreur ouverture mail:', error);
            Alert.alert('Erreur', 'Impossible d\'ouvrir l\'application mail.');
            return false;
        }
    };

    const envoyerWhatsApp = async (fournisseur: any, message: string) => {
        const phone = fournisseur.telephone?.replace(/[\s-()]/g, ''); 
        
        if (phone) {
            const whatsappUrl = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
            
            try {
                const supported = await Linking.canOpenURL(whatsappUrl);
                if (supported) {
                    await Linking.openURL(whatsappUrl);
                    return true;
                } else {
                    const webUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
                    await Linking.openURL(webUrl);
                    return true;
                }
            } catch (error) {
                Alert.alert('Erreur', 'Impossible d\'ouvrir WhatsApp');
                return false;
            }
        } else {
            Alert.alert('Erreur', `Numéro de téléphone non disponible pour ${fournisseur.nomEntreprise}`);
            return false;
        }
    };

    // --- Fonctions utilitaires
    const viderRecherche = () => { 
        setSearchTerm(''); 
        setSearchCategory('all'); 
        setSelectedFournisseur('all'); 
    };

    const onRefresh = useCallback(() => { 
        setRefreshing(true); 
        setTimeout(() => setRefreshing(false), 1000); 
    }, []);

    // --- Rendu ---
    return (
        <View style={styles.container}>
            {/* Header avec icône devis */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <Text style={styles.title}>📦 Commandes & Devis</Text>
                    <TouchableOpacity 
                        style={styles.devisHeaderButton}
                        onPress={ouvrirModalDevis}
                    >
                        <Icon name="file-document-outline" size={24} color={COLORS.headerText} />
                        <Text style={styles.devisHeaderButtonText}>Devis</Text>
                    </TouchableOpacity>
                </View>
                <Text style={styles.subtitle}>
                    Sélectionnez les produits et envoyez commandes ou demandes de devis
                </Text>
            </View>
            
            <ScrollView 
                contentContainerStyle={styles.scrollContent} 
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl 
                        refreshing={refreshing} 
                        onRefresh={onRefresh} 
                        colors={[COLORS.primary]} 
                    />
                }
            >
                <View style={styles.mainContent}>
                    {/* Section Produits */}
                    <View style={styles.produitsSection}>
                        {/* Barre de recherche et filtres */}
                        <View style={styles.searchSection}>
                            {/* Ici vous pouvez ajouter votre code de recherche existant */}
                        </View>

                        {/* Liste des produits avec bouton devis rapide */}
                        {produitsFiltres.map(produit => {
                            const fournisseur = fournisseurs.find(f => f.id === produit.fournisseurId);
                            const quantitePanier = panier[produit.id] || 0;

                            return (
                                <View key={produit.id} style={[styles.produitCard, quantitePanier > 0 && styles.produitCardSelected]}>
                                    {/* Logo/Image */}
                                    {renderProduitLogo(produit)}
                                    
                                    {/* Informations */}
                                    <View style={styles.produitInfo}>
                                        <Text style={styles.produitNom}>{produit.reference} - {produit.nom}</Text>
                                        <Text style={styles.produitDetails}>
                                            {fournisseur?.nomEntreprise} • {produit.prix}€/{produit.unite} • Stock: {produit.stock}
                                        </Text>
                                        {produit.description && (
                                            <Text style={styles.produitDescription}>{produit.description}</Text>
                                        )}
                                    </View>

                                    {/* Actions */}
                                    <View style={styles.produitActions}>
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
                                                    <Text style={styles.quantityText}>{quantitePanier}</Text>
                                                </>
                                            )}
                                            <TouchableOpacity 
                                                style={[styles.quantityButtonAdd, produit.stock <= quantitePanier && styles.quantityButtonDisabled]} 
                                                onPress={() => ajouterAuPanier(produit.id)} 
                                                disabled={produit.stock <= quantitePanier}
                                            >
                                                <Text style={styles.quantityButtonText}>+</Text>
                                            </TouchableOpacity>
                                        </View>
                                        
                                        {/* Bouton devis rapide */}
                                        <TouchableOpacity 
                                            style={styles.quickDevisButton}
                                            onPress={() => {
                                                ajouterAuPanier(produit.id);
                                                setTimeout(() => ouvrirModalDevis(), 300);
                                            }}
                                        >
                                            <Icon name="file-document-outline" size={16} color={COLORS.devis} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })}
                    </View>

                    {/* Section Panier améliorée */}
                    <View style={styles.panierSection}>
                        {/* En-tête avec bouton devis visible */}
                        <View style={styles.panierHeader}>
                            <Text style={styles.panierTitle}>🛒 Panier</Text>
                            <TouchableOpacity 
                                style={[styles.devisFloatingButton, Object.keys(panier).length === 0 && styles.buttonDisabled]}
                                onPress={ouvrirModalDevis}
                                disabled={Object.keys(panier).length === 0}
                            >
                                <Icon name="file-document-outline" size={20} color={COLORS.headerText} />
                                <Text style={styles.devisFloatingButtonText}>Demander un Devis</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Contenu du panier */}
                        {Object.keys(panier).length === 0 ? (
                            <View style={styles.emptyPanier}>
                                <Icon name="cart-outline" size={60} color={COLORS.neutral} />
                                <Text style={styles.emptyPanierText}>Votre panier est vide</Text>
                                <Text style={styles.emptyPanierSubtext}>Ajoutez des produits pour commencer</Text>
                            </View>
                        ) : (
                            <View style={{ flex: 1 }}>
                                {/* Liste des produits dans le panier */}
                                <ScrollView style={styles.panierList} showsVerticalScrollIndicator={false}>
                                    {Object.entries(getPanierParFournisseur()).map(([fournisseurId, data]) => (
                                        <View key={fournisseurId} style={styles.fournisseurPanierCard}>
                                            <Text style={styles.fournisseurPanierName}>
                                                {data.fournisseur?.nomEntreprise || 'Fournisseur inconnu'}
                                            </Text>
                                            
                                            {data.produits.map(produit => (
                                                <View key={produit.id} style={styles.panierItem}>
                                                    <View style={styles.panierItemInfo}>
                                                        <Text style={styles.panierItemName}>{produit.nom}</Text>
                                                        <Text style={styles.panierItemDetails}>
                                                            {produit.reference} • {produit.quantite} {produit.unite} • {produit.prix}€/unité
                                                        </Text>
                                                    </View>
                                                    <View style={styles.panierItemActions}>
                                                        <Text style={styles.panierItemTotal}>
                                                            {(produit.prix * produit.quantite).toFixed(2)}€
                                                        </Text>
                                                        <TouchableOpacity 
                                                            onPress={() => supprimerDuPanier(produit.id)}
                                                            style={styles.deleteButton}
                                                        >
                                                            <Icon name="close" size={18} color={COLORS.danger} />
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            ))}
                                        </View>
                                    ))}
                                </ScrollView>

                                {/* Total et boutons d'action */}
                                <View style={styles.panierFooter}>
                                    <View style={styles.totalContainer}>
                                        <Text style={styles.totalLabel}>Total estimé:</Text>
                                        <Text style={styles.totalValue}>{calculerTotal().toFixed(2)}€</Text>
                                    </View>

                                    {/* Boutons d'envoi */}
                                    <View style={styles.actionButtons}>
                                        <TouchableOpacity 
                                            style={[styles.actionButton, styles.devisButton]}
                                            onPress={ouvrirModalDevis}
                                        >
                                            <Icon name="file-document-outline" size={18} color={COLORS.headerText} />
                                            <Text style={styles.actionButtonText}>Demander un Devis</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity 
                                            style={[styles.actionButton, styles.commandeButton]}
                                            onPress={() => Alert.alert('Commande', 'Fonctionnalité de commande à implémenter')}
                                        >
                                            <Icon name="email-outline" size={18} color={COLORS.headerText} />
                                            <Text style={styles.actionButtonText}>Commander</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Modal de sélection du fournisseur pour devis */}
            <Modal
                visible={showFournisseurModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowFournisseurModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView 
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.modalContainer}
                    >
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>👥 Sélectionnez un fournisseur</Text>
                            <TouchableOpacity onPress={() => setShowFournisseurModal(false)}>
                                <Icon name="close" size={24} color={COLORS.neutral} />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                            <Text style={styles.modalSubtitle}>
                                Choisissez un fournisseur existant ou entrez les coordonnées d'un nouveau fournisseur
                            </Text>

                            {/* Liste des fournisseurs existants */}
                            <Text style={styles.sectionTitle}>Fournisseurs enregistrés</Text>
                            <View style={styles.fournisseursList}>
                                {fournisseurs.map(fournisseur => (
                                    <TouchableOpacity
                                        key={fournisseur.id}
                                        style={styles.fournisseurItem}
                                        onPress={() => continuerAvecFournisseur(fournisseur)}
                                    >
                                        <View style={styles.fournisseurInfo}>
                                            <Text style={styles.fournisseurName}>{fournisseur.nomEntreprise}</Text>
                                            <Text style={styles.fournisseurDetails}>
                                                {fournisseur.email} • {fournisseur.telephone}
                                            </Text>
                                        </View>
                                        <Icon name="chevron-right" size={24} color={COLORS.neutral} />
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Fournisseur personnalisé */}
                            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
                                Ou entrez les coordonnées d'un nouveau fournisseur
                            </Text>
                            
                            <View style={styles.customFournisseurForm}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Nom de l'entreprise *"
                                    value={customFournisseur.nomEntreprise}
                                    onChangeText={(text) => setCustomFournisseur({...customFournisseur, nomEntreprise: text})}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Email *"
                                    value={customFournisseur.email}
                                    onChangeText={(text) => setCustomFournisseur({...customFournisseur, email: text})}
                                    keyboardType="email-address"
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Téléphone"
                                    value={customFournisseur.telephone}
                                    onChangeText={(text) => setCustomFournisseur({...customFournisseur, telephone: text})}
                                    keyboardType="phone-pad"
                                />
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Adresse (optionnel)"
                                    value={customFournisseur.adresse}
                                    onChangeText={(text) => setCustomFournisseur({...customFournisseur, adresse: text})}
                                    multiline
                                />
                                
                                <TouchableOpacity
                                    style={[styles.continueButton, 
                                        (!customFournisseur.nomEntreprise || !customFournisseur.email) && 
                                        styles.continueButtonDisabled
                                    ]}
                                    onPress={() => continuerAvecFournisseur(null)}
                                    disabled={!customFournisseur.nomEntreprise || !customFournisseur.email}
                                >
                                    <Text style={styles.continueButtonText}>
                                        Continuer avec ce fournisseur
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            {/* Modal des détails du devis */}
            <Modal
                visible={showDevisModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowDevisModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView 
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.modalContainer}
                    >
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>📋 Détails du devis</Text>
                            <TouchableOpacity onPress={() => setShowDevisModal(false)}>
                                <Icon name="close" size={24} color={COLORS.neutral} />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                            {/* Info fournisseur */}
                            <View style={styles.devisFournisseurInfo}>
                                <Text style={styles.devisFournisseurTitle}>Destinataire:</Text>
                                <Text style={styles.devisFournisseurName}>
                                    {selectedFournisseurForDevis ? 
                                        selectedFournisseurForDevis.nomEntreprise : 
                                        customFournisseur.nomEntreprise}
                                </Text>
                            </View>

                            {/* Détails du devis */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Objet du devis *</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={devisDetails.objet}
                                    onChangeText={(text) => setDevisDetails({...devisDetails, objet: text})}
                                    placeholder="Ex: Devis pour pièces de rechange hôtel"
                                />
                            </View>

                            <View style={styles.inputRow}>
                                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                                    <Text style={styles.inputLabel}>Délai souhaité</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        value={devisDetails.delaiLivraison}
                                        onChangeText={(text) => setDevisDetails({...devisDetails, delaiLivraison: text})}
                                        placeholder="Ex: 15 jours"
                                    />
                                </View>
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={styles.inputLabel}>Validité devis</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        value={devisDetails.validiteDevis}
                                        onChangeText={(text) => setDevisDetails({...devisDetails, validiteDevis: text})}
                                        placeholder="Ex: 30 jours"
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Conditions de paiement</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={devisDetails.conditionsPaiement}
                                    onChangeText={(text) => setDevisDetails({...devisDetails, conditionsPaiement: text})}
                                    placeholder="Ex: 30 jours fin de mois"
                                />
                            </View>

                            {/* Informations de contact */}
                            <Text style={styles.sectionTitle}>Vos informations</Text>
                            <View style={styles.inputRow}>
                                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                                    <Text style={styles.inputLabel}>Nom du contact *</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        value={devisDetails.nomContact}
                                        onChangeText={(text) => setDevisDetails({...devisDetails, nomContact: text})}
                                        placeholder="Votre nom"
                                    />
                                </View>
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={styles.inputLabel}>Téléphone *</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        value={devisDetails.telephoneContact}
                                        onChangeText={(text) => setDevisDetails({...devisDetails, telephoneContact: text})}
                                        placeholder="Votre téléphone"
                                        keyboardType="phone-pad"
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Email *</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={devisDetails.emailContact}
                                    onChangeText={(text) => setDevisDetails({...devisDetails, emailContact: text})}
                                    placeholder="Votre email"
                                    keyboardType="email-address"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Remarques supplémentaires</Text>
                                <TextInput
                                    style={[styles.textInput, styles.textArea]}
                                    value={devisDetails.remarques}
                                    onChangeText={(text) => setDevisDetails({...devisDetails, remarques: text})}
                                    placeholder="Informations complémentaires, spécifications techniques..."
                                    multiline
                                    numberOfLines={4}
                                />
                            </View>

                            {/* Récapitulatif */}
                            <View style={styles.devisRecap}>
                                <Text style={styles.devisRecapTitle}>Récapitulatif</Text>
                                <View style={styles.recapRow}>
                                    <Text style={styles.recapLabel}>Produits:</Text>
                                    <Text style={styles.recapValue}>{Object.keys(panier).length}</Text>
                                </View>
                                <View style={styles.recapRow}>
                                    <Text style={styles.recapLabel}>Total estimé:</Text>
                                    <Text style={styles.recapValue}>{calculerTotal().toFixed(2)}€</Text>
                                </View>
                            </View>

                            {/* Boutons d'envoi */}
                            <View style={styles.devisButtons}>
                                <TouchableOpacity 
                                    style={[styles.devisActionButton, { backgroundColor: COLORS.devis }]}
                                    onPress={() => envoyerDevis('email')}
                                    disabled={isSubmitting || !devisDetails.objet || !devisDetails.nomContact || !devisDetails.emailContact}
                                >
                                    {isSubmitting ? (
                                        <ActivityIndicator color={COLORS.headerText} />
                                    ) : (
                                        <>
                                            <Icon name="email-outline" size={20} color={COLORS.headerText} />
                                            <Text style={styles.devisActionButtonText}>Envoyer par Email</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                                
                                {selectedFournisseurForDevis && selectedFournisseurForDevis.telephone && (
                                    <TouchableOpacity 
                                        style={[styles.devisActionButton, { backgroundColor: COLORS.whatsapp }]}
                                        onPress={() => envoyerDevis('whatsapp')}
                                        disabled={isSubmitting}
                                    >
                                        <Icon name="whatsapp" size={20} color={COLORS.headerText} />
                                        <Text style={styles.devisActionButtonText}>Envoyer par WhatsApp</Text>
                                    </TouchableOpacity>
                                )}
                                
                                <TouchableOpacity 
                                    style={[styles.devisActionButton, { backgroundColor: COLORS.neutral }]}
                                    onPress={() => setShowDevisModal(false)}
                                >
                                    <Text style={styles.devisActionButtonText}>Annuler</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </View>
    );
};

// --- STYLESHEET AMÉLIORÉ ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    // Header
    header: {
        backgroundColor: COLORS.primary,
        padding: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.headerText,
        flex: 1,
    },
    devisHeaderButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.devis,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 8,
    },
    devisHeaderButtonText: {
        color: COLORS.headerText,
        fontWeight: '600',
        fontSize: 16,
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
    },
    // Layout principal
    scrollContent: {
        flexGrow: 1,
    },
    mainContent: {
        flexDirection: isLargeScreen ? 'row' : 'column',
        padding: 16,
        gap: 16,
        minHeight: height - 200,
    },
    produitsSection: {
        flex: isLargeScreen ? 2 : undefined,
        minHeight: 500,
        backgroundColor: COLORS.surface,
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    panierSection: {
        width: isLargeScreen ? 400 : '100%',
        backgroundColor: COLORS.surface,
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    // Panier Header
    panierHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    panierTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    devisFloatingButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.devis,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        gap: 8,
        shadowColor: COLORS.devis,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    buttonDisabled: {
        backgroundColor: COLORS.neutral,
        opacity: 0.5,
    },
    devisFloatingButtonText: {
        color: COLORS.headerText,
        fontWeight: '600',
        fontSize: 14,
    },
    // Produit card
    produitCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        borderRadius: 12,
        backgroundColor: COLORS.surface,
        marginBottom: 12,
        gap: 16,
    },
    produitCardSelected: {
        backgroundColor: COLORS.selectedBg,
        borderColor: COLORS.borderAccent,
    },
    produitLogo: {
        width: 60,
        height: 60,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    defaultLogo: {
        backgroundColor: '#F3F4F6',
        borderColor: '#E5E7EB',
    },
    produitInfo: {
        flex: 1,
    },
    produitNom: {
        fontWeight: '700',
        fontSize: 16,
        color: COLORS.textPrimary,
    },
    produitDetails: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 4,
    },
    produitDescription: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 4,
    },
    produitActions: {
        alignItems: 'flex-end',
        gap: 8,
    },
    quantityControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    quantityButtonRemove: {
        padding: 8,
        paddingHorizontal: 12,
        backgroundColor: COLORS.danger,
        borderRadius: 6,
    },
    quantityButtonAdd: {
        padding: 8,
        paddingHorizontal: 12,
        backgroundColor: COLORS.success,
        borderRadius: 6,
    },
    quantityButtonDisabled: {
        backgroundColor: COLORS.neutral,
        opacity: 0.8,
    },
    quantityButtonText: {
        color: COLORS.headerText,
        fontSize: 16,
        fontWeight: 'bold',
    },
    quantityText: {
        fontWeight: '700',
        fontSize: 16,
        minWidth: 30,
        textAlign: 'center',
    },
    quickDevisButton: {
        padding: 6,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: COLORS.devis,
        backgroundColor: COLORS.devisLight,
    },
    // Panier vide
    emptyPanier: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyPanierText: {
        fontSize: 18,
        color: COLORS.textPrimary,
        marginTop: 16,
        fontWeight: '600',
    },
    emptyPanierSubtext: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 8,
    },
    // Panier items
    panierList: {
        maxHeight: isMediumScreen ? 400 : 300,
    },
    fournisseurPanierCard: {
        marginBottom: 16,
    },
    fournisseurPanierName: {
        fontWeight: '600',
        fontSize: 16,
        color: COLORS.textPrimary,
        marginBottom: 12,
    },
    panierItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        backgroundColor: COLORS.background,
        borderRadius: 8,
        marginBottom: 8,
    },
    panierItemInfo: {
        flex: 1,
    },
    panierItemName: {
        fontWeight: '600',
        fontSize: 14,
        color: COLORS.textPrimary,
    },
    panierItemDetails: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    panierItemActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    panierItemTotal: {
        fontWeight: '600',
        fontSize: 14,
        color: COLORS.success,
    },
    deleteButton: {
        padding: 4,
    },
    // Panier footer
    panierFooter: {
        marginTop: 20,
    },
    totalContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: COLORS.selectedBg,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: COLORS.borderAccent,
        marginBottom: 16,
    },
    totalLabel: {
        fontWeight: '600',
        fontSize: 16,
        color: '#0369A1',
    },
    totalValue: {
        fontWeight: '700',
        fontSize: 20,
        color: '#0369A1',
    },
    actionButtons: {
        gap: 12,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 8,
        gap: 12,
    },
    devisButton: {
        backgroundColor: COLORS.devis,
    },
    commandeButton: {
        backgroundColor: COLORS.primary,
    },
    actionButtonText: {
        color: COLORS.headerText,
        fontWeight: '600',
        fontSize: 16,
    },
    // Modals
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        width: '100%',
        maxWidth: 500,
        maxHeight: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    modalContent: {
        padding: 20,
    },
    modalSubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 20,
        lineHeight: 20,
    },
    // Fournisseur selection modal
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 12,
    },
    fournisseursList: {
        gap: 8,
    },
    fournisseurItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: COLORS.background,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    fournisseurInfo: {
        flex: 1,
    },
    fournisseurName: {
        fontWeight: '600',
        fontSize: 14,
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    fournisseurDetails: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    customFournisseurForm: {
        gap: 12,
        marginTop: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: COLORS.textPrimary,
        backgroundColor: COLORS.background,
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    continueButton: {
        backgroundColor: COLORS.devis,
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 8,
    },
    continueButtonDisabled: {
        backgroundColor: COLORS.neutral,
        opacity: 0.5,
    },
    continueButtonText: {
        color: COLORS.headerText,
        fontWeight: '600',
        fontSize: 16,
    },
    // Devis modal
    devisFournisseurInfo: {
        backgroundColor: COLORS.devisLight,
        padding: 16,
        borderRadius: 8,
        marginBottom: 20,
    },
    devisFournisseurTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.devis,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    devisFournisseurName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.devis,
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputRow: {
        flexDirection: 'row',
        gap: 8,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 8,
    },
    textInput: {
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: COLORS.textPrimary,
        backgroundColor: COLORS.background,
    },
    devisRecap: {
        backgroundColor: COLORS.selectedBg,
        borderRadius: 8,
        padding: 16,
        marginTop: 8,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.borderAccent,
    },
    devisRecapTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: 12,
    },
    recapRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    },
    recapLabel: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    recapValue: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    devisButtons: {
        gap: 12,
    },
    devisActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 8,
        gap: 12,
    },
    devisActionButtonText: {
        color: COLORS.headerText,
        fontWeight: '600',
        fontSize: 16,
    },
});

export default CommandeFournisseurs;


