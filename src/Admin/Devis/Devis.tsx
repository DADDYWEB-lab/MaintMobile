// CommandeFournisseurs.tsx
// @ts-nocheck

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert, 
    RefreshControl, Platform, Dimensions, Image, Linking, ActivityIndicator,
    Modal
} from 'react-native';
import {
    collection, query, onSnapshot, addDoc, updateDoc, doc, serverTimestamp
} from 'firebase/firestore';
import { db } from '../../../firebaseConfig';

// --- COULEURS ET CONSTANTES THÉMATIQUES ---
const { width } = Dimensions.get('window');
const isLargeScreen = width > 768;

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
    devis: '#8B5CF6'
};

// --- Fonctions d'icônes/Emoji ---
const getEmoji = (category: string) => {
    switch (category) {
        case 'reference': return '🏷️';
        case 'nom': return '📦';
        case 'description': return '🔍';
        case 'fournisseur': return '🏢';
        case 'prix': return '💰';
        case 'stock': return '📊';
        case 'all': default: return '🔍';
    }
};

const renderLogo = (logoUrl: string, defaultIcon: string, size = 40) => {
    if (logoUrl && logoUrl.startsWith('http')) {
        return (
            <Image 
                source={{ uri: logoUrl }} 
                style={[styles.logoImage, { width: size, height: size }]} 
            />
        );
    }
    return (
        <View style={[styles.logoDefaultContainer, { width: size, height: size }]}>
            <Text style={{ fontSize: size * 0.5, color: COLORS.textSecondary }}>
                {defaultIcon}
            </Text>
        </View>
    );
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
    const [devisDetails, setDevisDetails] = useState({
        objet: 'Demande de devis',
        delaiLivraison: '15 jours',
        conditionsPaiement: '30 jours fin de mois',
        remarques: '',
        nomContact: 'Service Maintenance Hôtel',
        emailContact: 'maintenance@hotel.com',
        telephoneContact: '+33 1 23 45 67 89'
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
            if (newPanier[produitId] > 1) { newPanier[produitId]--; } else { delete newPanier[produitId]; }
            return newPanier;
        });
    };
    const supprimerDuPanier = (produitId: string) => {
        setPanier(prev => { const newPanier = { ...prev }; delete newPanier[produitId]; return newPanier; });
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
                panierParFournisseur[fournisseurId].produits.push({ ...produit, quantite: panier[produitId] });
            }
        });
        return panierParFournisseur;
    };

    // --- Fonctions d'Envoi
    const genererMessageCommande = (fournisseurId: string) => {
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
            message += `   📸 ${produit.logo ? 'Logo disponible' : 'Pas de logo'}\n`;
            message += `   📦 Quantité: ${produit.quantite} ${produit.unite}\n`;
            message += `   💰 Prix unitaire: ${produit.prix}€\n`;
            message += `   🧮 Sous-total: ${(produit.prix * produit.quantite).toFixed(2)}€\n\n`;
        });

        const total = panierFournisseur.produits.reduce((sum, p) => sum + (p.prix * p.quantite), 0);
        message += `💰 TOTAL: ${total.toFixed(2)}€\n\n`;
        message += `Merci de confirmer la disponibilité et les délais de livraison.\n`;
        message += `Cordialement`;

        return message;
    };

    const genererMessageDevis = (fournisseurId: string) => {
        const panierFournisseur = getPanierParFournisseur()[fournisseurId];
        if (!panierFournisseur) return '';

        const fournisseur = panierFournisseur.fournisseur;
        let message = `📋 DEMANDE DE DEVIS - ${fournisseur.nomEntreprise}\n\n`;
        message += `Objet: ${devisDetails.objet}\n`;
        message += `Date: ${new Date().toLocaleDateString('fr-FR')}\n`;
        message += `Référence: DEV-${Date.now().toString().slice(-6)}\n\n`;
        message += `--- INFORMATIONS DU DEMANDEUR ---\n`;
        message += `📞 Contact: ${devisDetails.nomContact}\n`;
        message += `📧 Email: ${devisDetails.emailContact}\n`;
        message += `📱 Téléphone: ${devisDetails.telephoneContact}\n\n`;
        message += `--- DÉTAIL DE LA DEMANDE ---\n`;
        message += '─'.repeat(30) + '\n\n';

        panierFournisseur.produits.forEach((produit, index) => {
            message += `${index + 1}. ${produit.reference} - ${produit.nom}\n`;
            message += `   📦 Quantité estimée: ${produit.quantite} ${produit.unite}\n`;
            message += `   💰 Prix unitaire actuel: ${produit.prix}€\n`;
            message += `   🧮 Sous-total estimé: ${(produit.prix * produit.quantite).toFixed(2)}€\n\n`;
        });

        const totalEstime = panierFournisseur.produits.reduce((sum, p) => sum + (p.prix * p.quantite), 0);
        message += `💰 TOTAL ESTIMÉ: ${totalEstime.toFixed(2)}€\n\n`;
        message += `--- CONDITIONS DEMANDÉES ---\n`;
        message += `⏱️ Délai de livraison souhaité: ${devisDetails.delaiLivraison}\n`;
        message += `💳 Conditions de paiement: ${devisDetails.conditionsPaiement}\n\n`;
        
        if (devisDetails.remarques) {
            message += `📝 Remarques supplémentaires:\n${devisDetails.remarques}\n\n`;
        }
        
        message += `Nous vous remercions de nous faire parvenir votre meilleure proposition commerciale.\n`;
        message += `Cette demande n'engage pas à l'achat.\n\n`;
        message += `Cordialement,\n${devisDetails.nomContact}`;

        return message;
    };

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

    const creerNotification = async (fournisseurId: string, sousCommande: any, type: string = 'nouvelle_commande') => {
        try {
            await addDoc(collection(db, 'notifications'), {
                fournisseurId: fournisseurId,
                type: type,
                titre: type === 'devis' ? 'Nouvelle demande de devis' : 'Nouvelle commande reçue',
                message: type === 'devis' 
                    ? `Vous avez une nouvelle demande de devis` 
                    : `Vous avez une nouvelle commande (${sousCommande.reference})`,
                commandeId: sousCommande.commandeId,
                lu: false,
                date: serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error('Erreur création notification:', error);
            Alert.alert('Erreur', 'Erreur lors de la création de la notification.');
            return false;
        }
    };
                                             
    const envoyerCommande = async (methodeEnvoi: string) => {
        if (Object.keys(panier).length === 0) {
            Alert.alert('Erreur', 'Le panier est vide !');
            return;
        }

        setIsSubmitting(true);
        try {
            const panierParFournisseur = getPanierParFournisseur();
            const referenceCommande = `CMD-${Date.now().toString().slice(-6)}`;

            const commandePrincipale = {
                reference: referenceCommande,
                date: serverTimestamp(),
                statut: 'envoyee',
                total: calculerTotal(),
                methodeEnvoi: methodeEnvoi,
                type: 'commande'
            };
            const commandeDocRef = await addDoc(collection(db, 'commandes'), commandePrincipale);
            let successCount = 0;

            for (const fournisseurId in panierParFournisseur) {
                const panierFournisseur = panierParFournisseur[fournisseurId];
                const fournisseur = panierFournisseur.fournisseur;

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
                    methodeEnvoi: methodeEnvoi,
                    type: 'commande'
                };

                await addDoc(collection(db, 'sous_commandes'), sousCommande);
                successCount++;
                
                const message = genererMessageCommande(fournisseurId);
                switch (methodeEnvoi) {
                    case 'email':
                        await envoyerEmail(fournisseur, message, `Nouvelle Commande - ${fournisseur.nomEntreprise}`);
                        break;
                    case 'whatsapp':
                        await envoyerWhatsApp(fournisseur, message);
                        break;
                    case 'notification':
                        await creerNotification(fournisseurId, sousCommande);
                        break;
                    case 'tous':
                        await envoyerEmail(fournisseur, message, `Nouvelle Commande - ${fournisseur.nomEntreprise}`);
                        await envoyerWhatsApp(fournisseur, message);
                        await creerNotification(fournisseurId, sousCommande);
                        break;
                }
            }

            Alert.alert('Succès', `✅ ${successCount} Commandes envoyées avec succès !`);
            setPanier({});
        } catch (error) {
            console.error('Erreur:', error);
            Alert.alert('Erreur', 'Erreur lors de l\'envoi: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const envoyerDevis = async (methodeEnvoi: string) => {
        if (Object.keys(panier).length === 0) {
            Alert.alert('Erreur', 'Le panier est vide !');
            return;
        }

        setIsSubmitting(true);
        try {
            const panierParFournisseur = getPanierParFournisseur();
            const referenceDevis = `DEV-${Date.now().toString().slice(-6)}`;

            const devisPrincipal = {
                reference: referenceDevis,
                date: serverTimestamp(),
                statut: 'en_attente',
                total: calculerTotal(),
                methodeEnvoi: methodeEnvoi,
                type: 'devis',
                details: devisDetails
            };
            const devisDocRef = await addDoc(collection(db, 'commandes'), devisPrincipal);
            let successCount = 0;

            for (const fournisseurId in panierParFournisseur) {
                const panierFournisseur = panierParFournisseur[fournisseurId];
                const fournisseur = panierFournisseur.fournisseur;

                const sousDevis = {
                    devisId: devisDocRef.id,
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
                    totalEstime: panierFournisseur.produits.reduce((sum, p) => sum + (p.prix * p.quantite), 0),
                    statut: 'en_attente',
                    date: serverTimestamp(),
                    methodeEnvoi: methodeEnvoi,
                    type: 'devis',
                    details: devisDetails
                };

                await addDoc(collection(db, 'sous_commandes'), sousDevis);
                successCount++;
                
                const message = genererMessageDevis(fournisseurId);
                switch (methodeEnvoi) {
                    case 'email':
                        await envoyerEmail(fournisseur, message, `Demande de Devis - ${fournisseur.nomEntreprise}`);
                        break;
                    case 'whatsapp':
                        await envoyerWhatsApp(fournisseur, message);
                        break;
                    case 'notification':
                        await creerNotification(fournisseurId, sousDevis, 'devis');
                        break;
                    case 'tous':
                        await envoyerEmail(fournisseur, message, `Demande de Devis - ${fournisseur.nomEntreprise}`);
                        await envoyerWhatsApp(fournisseur, message);
                        await creerNotification(fournisseurId, sousDevis, 'devis');
                        break;
                }
            }

            Alert.alert('Succès', `✅ ${successCount} Demandes de devis envoyées avec succès !`);
            setPanier({});
            setShowDevisModal(false);
        } catch (error) {
            console.error('Erreur:', error);
            Alert.alert('Erreur', 'Erreur lors de l\'envoi: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Fonctions utilitaires
    const viderRecherche = () => { setSearchTerm(''); setSearchCategory('all'); setSelectedFournisseur('all'); };
    const getSearchPlaceholder = () => {
        switch (searchCategory) {
            case 'reference': return 'Rechercher par référence... (ex: PROD-001)';
            case 'nom': return 'Rechercher par nom de produit...';
            case 'description': return 'Rechercher dans les descriptions...';
            case 'fournisseur': return 'Rechercher par nom de fournisseur...';
            case 'prix': return 'Rechercher par prix... (ex: 10.50 ou 10-20)';
            case 'stock': return 'Rechercher par stock... (ex: >10, <5, 10-50)';
            case 'all': default: return 'Rechercher dans tous les champs...';
        }
    };
    const onRefresh = useCallback(() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 1000); }, []);

    // --- Rendu ---
    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>📦 Passer une Commande / Devis</Text>
                <Text style={styles.subtitle}>
                    Sélectionnez les produits et envoyez commandes ou demandes de devis aux fournisseurs
                </Text>
            </View>
            
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.mainContent}>
                    {/* Section Produits */}
                    <View style={styles.produitsSection}>
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                        >
                            {/* Barre de recherche avancée */}
                            <View style={styles.searchSection}>
                                
                                {/* Filtres (Catégorie & Fournisseur) */}
                                <View style={styles.searchFilters}>
                                    
                                    {/* Filtre par catégorie (Chips scrollables) */}
                                    <View style={styles.filterGroup}>
                                        <Text style={styles.filterGroupIcon}>📊</Text>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsContainer}>
                                            {[
                                                { value: 'all', label: 'Tous critères' }, { value: 'reference', label: 'Référence' },
                                                { value: 'nom', label: 'Nom' }, { value: 'description', label: 'Description' },
                                                { value: 'fournisseur', label: 'Fournisseur' }, { value: 'prix', label: 'Prix' }, { value: 'stock', label: 'Stock' }
                                            ].map(category => (
                                                <TouchableOpacity key={category.value} style={[styles.chip, searchCategory === category.value && styles.chipActiveCategory]} onPress={() => setSearchCategory(category.value)}>
                                                    <Text style={[styles.chipText, searchCategory === category.value && styles.chipTextActive]}>
                                                        {category.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                    
                                    {/* Filtre par fournisseur (Chips scrollables) */}
                                    <View style={styles.filterGroup}>
                                        <Text style={styles.filterGroupIcon}>🏢</Text>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsContainer}>
                                            <TouchableOpacity style={[styles.chip, selectedFournisseur === 'all' && styles.chipActiveFournisseur]} onPress={() => setSelectedFournisseur('all')}>
                                                <Text style={[styles.chipText, selectedFournisseur === 'all' && styles.chipTextActive]}>Tous</Text>
                                            </TouchableOpacity>
                                            {fournisseurs.map(f => (
                                                <TouchableOpacity key={f.id} style={[styles.chip, selectedFournisseur === f.id && styles.chipActiveFournisseur]} onPress={() => setSelectedFournisseur(f.id)}>
                                                    <Text style={[styles.chipText, selectedFournisseur === f.id && styles.chipTextActive]}>
                                                        {f.nomEntreprise}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>

                                    {/* Bouton aide recherche */}
                                    <TouchableOpacity style={styles.helpButton} onPress={() => setShowSearchHelp(!showSearchHelp)}>
                                        <Text style={styles.helpButtonText}>{getEmoji('search')} Aide recherche</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Champ de recherche principal */}
                                <View style={styles.searchInputContainer}>
                                    <Text style={styles.searchIcon}>{getEmoji(searchCategory)}</Text>
                                    <TextInput
                                        style={styles.searchInput}
                                        placeholder={getSearchPlaceholder()}
                                        placeholderTextColor={COLORS.textSecondary}
                                        value={searchTerm}
                                        onChangeText={setSearchTerm}
                                    />
                                    {searchTerm ? (
                                        <TouchableOpacity style={styles.clearButton} onPress={viderRecherche}>
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
                                            <Text style={styles.helpTip}><Text style={styles.helpBold}>Stock :</Text> {'>'}10 (supérieur), {'<'}5 (inférieur), "10-50" (fourchette)</Text>
                                            <Text style={styles.helpTip}><Text style={styles.helpBold}>Référence :</Text> "PROD-001" (numéro exact)</Text>
                                        </View>
                                    </View>
                                )}
                            </View>

                            {/* Compteur de résultats */}
                            <View style={styles.resultsCounter}>
                                <Text style={styles.resultsText}>
                                    {produitsFiltres.length} produit(s) trouvé(s)
                                </Text>
                                {(searchTerm || selectedFournisseur !== 'all' || searchCategory !== 'all') && (
                                    <TouchableOpacity style={styles.resetButton} onPress={viderRecherche}>
                                        <Text style={styles.resetButtonText}>Réinitialiser tout</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Liste des produits */}
                            {produitsFiltres.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyStateIcon}>🔍</Text>
                                    <Text style={styles.emptyStateTitle}>Aucun produit trouvé</Text>
                                    <Text style={styles.emptyStateText}>
                                        {searchTerm ? `Aucun résultat pour "${searchTerm}"` : 'Aucun produit disponible avec les filtres actuels'}
                                    </Text>
                                    {(searchTerm || selectedFournisseur !== 'all' || searchCategory !== 'all') && (
                                        <TouchableOpacity style={styles.showAllButton} onPress={viderRecherche}>
                                            <Text style={styles.showAllButtonText}>Afficher tous les produits</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ) : (
                                produitsFiltres.map(produit => {
                                    const fournisseur = fournisseurs.find(f => f.id === produit.fournisseurId);
                                    const quantitePanier = panier[produit.id] || 0;

                                    return (
                                        <View key={produit.id} style={[styles.produitCard, quantitePanier > 0 && styles.produitCardSelected]}>
                                            
                                            {/* Logo/Image */}
                                            {renderLogo(produit.logo, getEmoji('nom'), 60)}
                                            
                                            {/* Informations */}
                                            <View style={styles.produitInfo}>
                                                <Text style={styles.produitNom}>{produit.reference} - {produit.nom}</Text>
                                                <Text style={styles.produitDetails}>
                                                    {fournisseur?.nomEntreprise} • {produit.prix}€/{produit.unite} • Stock: {produit.stock}
                                                </Text>
                                                {produit.description && <Text style={styles.produitDescription}>{produit.description}</Text>}
                                            </View>

                                            {/* Contrôles de quantité */}
                                            <View style={styles.quantityControls}>
                                                {quantitePanier > 0 && (
                                                    <>
                                                        <TouchableOpacity style={styles.quantityButtonRemove} onPress={() => retirerDuPanier(produit.id)}>
                                                            <Text style={styles.quantityButtonText}>-</Text>
                                                        </TouchableOpacity>
                                                        <Text style={styles.quantityText}>{quantitePanier}</Text>
                                                    </>
                                                )}
                                                <TouchableOpacity 
                                                    style={[styles.quantityButtonAdd, produit.stock <= quantitePanier && styles.quantityButtonDisabled]} 
                                                    onPress={() => ajouterAuPanier(produit.id)} 
                                                    disabled={produit.stock <= quantitePanier} >



                                                    <Text style={styles.quantityButtonText}> + </Text>
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
                        <Text style={styles.panierTitle}>🛒 Panier de Commandes / Devis</Text>

                        {Object.keys(panier).length === 0 ? (
                            <View style={styles.emptyPanier}>
                                <Text style={styles.emptyPanierIcon}>🛒</Text>
                                <Text style={styles.emptyPanierText}>Votre panier est vide</Text>
                                <Text style={styles.emptyPanierSubtext}>Ajoutez des produits pour commencer</Text>
                            </View>
                        ) : (
                            <View style={{ flex: 1 }}>
                                {/* Résumé par fournisseur */}
                                <View style={styles.fournisseursSummary}>
                                    <Text style={styles.summaryTitle}>Commandes/Demis à préparer:</Text>
                                    <ScrollView style={styles.fournisseursList} showsVerticalScrollIndicator={false}>
                                        {Object.entries(getPanierParFournisseur()).map(([fournisseurId, data]) => (
                                            <View key={fournisseurId} style={styles.fournisseurCard}>
                                                <Text style={styles.fournisseurName}>{data.fournisseur.nomEntreprise}</Text>
                                                
                                                <View style={styles.produitsCompactList}>
                                                    {data.produits.map(produit => (
                                                        <View key={produit.id} style={styles.produitRow}>
                                                            {renderLogo(produit.logo, '📦', 40)}
                                                            <View style={styles.produitInfoCompact}>
                                                                <Text style={styles.produitNomCompact}>{produit.reference}</Text>
                                                                <Text style={styles.produitDetailsCompact}>{produit.nom}</Text>
                                                            </View>
                                                            <View style={styles.produitQuantite}>
                                                                <Text style={styles.quantiteText}>{produit.quantite} {produit.unite}</Text>
                                                                <Text style={styles.sousTotalText}>{(produit.prix * produit.quantite).toFixed(2)}€</Text>
                                                            </View>
                                                            <TouchableOpacity onPress={() => supprimerDuPanier(produit.id)} style={{ padding: 4 }}>
                                                                <Text style={{ color: COLORS.danger, fontSize: 16 }}>✕</Text>
                                                            </TouchableOpacity>
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

                                {/* Total Général et Boutons d'envoi */}
                                <View style={{ flex: 1, justifyContent: 'flex-end' }}>

                                    {/* Total Général */}
                                    <View style={styles.totalGeneral}>
                                        <Text style={styles.totalLabel}>Total Général:</Text>
                                        <Text style={styles.totalValue}>{calculerTotal().toFixed(2)}€</Text>
                                    </View>

                                    {/* Boutons d'envoi - Commandes */}
                                    <Text style={styles.sectionSubtitle}>Commandes</Text>

                                    <View style={styles.sendButtons}>
                                        <TouchableOpacity style={[styles.sendButton, { backgroundColor: COLORS.success }]} onPress={() => envoyerCommande('email')} disabled={isSubmitting}>
                                            {isSubmitting ? <ActivityIndicator color={COLORS.headerText} /> : <Text style={styles.sendButtonText}>📧 Envoyer Commande par Email</Text>}
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.sendButton, { backgroundColor: COLORS.whatsapp }]} onPress={() => envoyerCommande('whatsapp')} disabled={isSubmitting}>
                                            {isSubmitting ? <ActivityIndicator color={COLORS.headerText} /> : <Text style={styles.sendButtonText}>💚 Envoyer Commande par WhatsApp</Text>}
                                        </TouchableOpacity> 
                                        <TouchableOpacity style={[styles.sendButton, { backgroundColor: COLORS.warning }]} onPress={() => envoyerCommande('notification')} disabled={isSubmitting}>
                                            {isSubmitting ? <ActivityIndicator color={COLORS.headerText} /> : <Text style={styles.sendButtonText}>🔔 Notification Interne</Text>}
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.sendButton, styles.allChannelsButton]} onPress={() => envoyerCommande('tous')} disabled={isSubmitting}>
                                            {isSubmitting ? <ActivityIndicator color={COLORS.headerText} /> : <Text style={styles.sendButtonText}>🚀 Tous les Canaux</Text>}
                                        </TouchableOpacity>
                                    </View>

                                    {/* Boutons d'envoi - Devis */}
                                    <Text style={[styles.sectionSubtitle, { marginTop: 16, color: COLORS.devis }]}>Demandes de Devis</Text>
                                    <View style={styles.sendButtons}>
                                        <TouchableOpacity 
                                            style={[styles.sendButton, { backgroundColor: COLORS.devis }]} 
                                            onPress={() => setShowDevisModal(true)} 
                                            disabled={isSubmitting} >

                                            {isSubmitting ? <ActivityIndicator color={COLORS.headerText} /> : <Text style={styles.sendButtonText}>📋 Demander un Devis</Text>}
                                        </TouchableOpacity>
                                        <TouchableOpacity 
                                            style={[styles.sendButton, { backgroundColor: '#6D28D9' }]} 
                                            onPress={() => Alert.alert(
                                                'Envoi rapide',
                                                'Voulez-vous envoyer une demande de devis avec les paramètres par défaut?',
                                                [
                                                    { text: 'Annuler', style: 'cancel' },
                                                    { text: 'Envoyer', onPress: () => envoyerDevis('email') }
                                                ]
                                            )} 
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? <ActivityIndicator color={COLORS.headerText} /> : <Text style={styles.sendButtonText}>📨 Devis par Email</Text>}
                                        </TouchableOpacity>
                                    </View>

                                    {/* Bouton vider panier */}
                                    <TouchableOpacity style={[styles.sendButton, { backgroundColor: COLORS.neutral, marginTop: 16 }]} onPress={() => setPanier({})}>
                                        <Text style={styles.sendButtonText}>🗑️ Vider le Panier</Text>
                                    </TouchableOpacity>

                                </View>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Modal pour les détails du devis */}
            <Modal
                visible={showDevisModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowDevisModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>📋 Paramètres du Devis</Text>
                            <TouchableOpacity onPress={() => setShowDevisModal(false)}>
                                <Text style={styles.modalClose}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                            <Text style={styles.modalSubtitle}>Personnalisez votre demande de devis</Text>
                            
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Objet du devis</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={devisDetails.objet}
                                    onChangeText={(text) => setDevisDetails({...devisDetails, objet: text})}
                                    placeholder="Ex: Devis pour pièces de rechange"
                                />
                            </View>
                            
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Délai de livraison souhaité</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={devisDetails.delaiLivraison}
                                    onChangeText={(text) => setDevisDetails({...devisDetails, delaiLivraison: text})}
                                    placeholder="Ex: 15 jours"
                                />
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
                            
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Informations de contact</Text>

                                <TextInput
                                    style={styles.textInput}
                                    value={devisDetails.nomContact}
                                    onChangeText={(text) => setDevisDetails({...devisDetails, nomContact: text})}
                                    placeholder="Nom du contact"
                                />
                                <TextInput
                                    style={[styles.textInput, { marginTop: 8 }]}
                                    value={devisDetails.emailContact}
                                    onChangeText={(text) => setDevisDetails({...devisDetails, emailContact: text})}
                                    placeholder="Email de contact"
                                    keyboardType="email-address"
                                />
                                <TextInput
                                    style={[styles.textInput, { marginTop: 8 }]}
                                    value={devisDetails.telephoneContact}
                                    onChangeText={(text) => setDevisDetails({...devisDetails, telephoneContact: text})}
                                    placeholder="Téléphone de contact"a
                                    keyboardType="phone-pad"  />
                            </View>
                            
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Remarques supplémentaires</Text>
                                <TextInput
                                    style={[styles.textInput, styles.textArea]}
                                    value={devisDetails.remarques}
                                    onChangeText={(text) => setDevisDetails({...devisDetails, remarques: text})}
                                    placeholder="Informations complémentaires..."
                                    multiline
                                    numberOfLines={4}
                                />
                            </View>
                            

                            <View style={styles.modalStats}>
                                <Text style={styles.modalStatsTitle}>Récapitulatif</Text>
                                <View style={styles.statsRow}>
                                    <Text style={styles.statsLabel}>Produits:</Text>
                                    <Text style={styles.statsValue}>{Object.keys(panier).length}</Text>
                                </View>
                                <View style={styles.statsRow}>
                                    <Text style={styles.statsLabel}>Fournisseurs:</Text>
                                    <Text style={styles.statsValue}>{Object.keys(getPanierParFournisseur()).length}</Text>
                                </View>
                                <View style={styles.statsRow}>
                                    <Text style={styles.statsLabel}>Total estimé:</Text>
                                    <Text style={styles.statsValue}>{calculerTotal().toFixed(2)}€</Text>
                                </View>
                            </View>
                            

                            <View style={styles.modalButtons}>
                                <TouchableOpacity 
                                    style={[styles.modalButton, { backgroundColor: COLORS.devis }]} 
                                    onPress={() => envoyerDevis('email')}
                                    disabled={isSubmitting} >

                                    {isSubmitting ? (
                                        <ActivityIndicator color={COLORS.headerText} />
                                    ) : (
                                        <Text style={styles.modalButtonText}>📧 Envoyer Devis par Email</Text>
                                    )}
                                </TouchableOpacity>
                         
                             
                                <TouchableOpacity 
                                    style={[styles.modalButton, { backgroundColor: COLORS.whatsapp }]} 
                                    onPress={() => envoyerDevis('whatsapp')}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <ActivityIndicator color={COLORS.headerText} />
                                    ) : (
                                        <Text style={styles.modalButtonText}>💚 Envoyer Devis par WhatsApp</Text>
                                    )}
                                </TouchableOpacity>
                                               
                                                 
                                <TouchableOpacity 
                                    style={[styles.modalButton, { backgroundColor: COLORS.info }]} 
                                    onPress={() => envoyerDevis('tous')}
                                    disabled={isSubmitting} >

                                    {isSubmitting ? (
                                        <ActivityIndicator color={COLORS.headerText} />
                                    ) : (

                                        <Text style={styles.modalButtonText}>🚀 Tous les Canaux</Text>
                                         )}
                                 
                                </TouchableOpacity>
                                
                                 
                                <TouchableOpacity 
                                    style={[styles.modalButton, { backgroundColor: COLORS.neutral }]} 
                                    onPress={() => setShowDevisModal(false)} >

                                    <Text style={styles.modalButtonText}>Annuler</Text>
                                </TouchableOpacity>
                                                                          
                                                                       
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

// --- STYLESHEET ---
const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },

    // --- HEADER ---
    header: {
        backgroundColor: COLORS.primary,
        padding: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.headerText,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 10,
    },
    sectionSubtitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginTop: 12,
        marginBottom: 8,
    },
    scrollContent: {
        flexGrow: 1,
    },
    mainContent: {
        flexDirection: isLargeScreen ? 'row' : 'column',
        padding: 16,
        gap: 16,
    },
    produitsSection: {
        flex: isLargeScreen ? 1 : undefined,
        minHeight: isLargeScreen ? 'auto' : 500,
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
    panierTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 16,
    },
    // --- SEARCH AND FILTERS ---
    searchSection: {
        marginBottom: 16,
    },
    searchFilters: {
        flexDirection: 'column',
        gap: 12,
        marginBottom: 16,
    },
    filterGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    filterGroupIcon: {
        fontSize: 18,
        marginRight: 8,
        color: COLORS.neutral,
    },
    chipsContainer: {
        flexGrow: 1,
        paddingVertical: 4,
    },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        marginRight: 8,
        backgroundColor: COLORS.surface,
    },
    chipActiveCategory: {
        backgroundColor: COLORS.accent,
        borderColor: COLORS.accent,
    },
    chipActiveFournisseur: {
        backgroundColor: COLORS.success,
        borderColor: COLORS.success,
    },
    chipText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    chipTextActive: {
        color: COLORS.headerText,
    },
    helpButton: {
        padding: 12,
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        borderRadius: 8,
        alignItems: 'center',
    },
    helpButtonText: {
        fontSize: 14,
        color: COLORS.neutral,
        fontWeight: '500',
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.accent,
        borderRadius: 8,
        backgroundColor: COLORS.surface,
    },
    searchIcon: {
        paddingLeft: 12,
        fontSize: 18,
    },
    searchInput: {
        flex: 1,
        padding: 12,
        fontSize: 16,
        fontWeight: '500',
        color: COLORS.textPrimary,
    },
    clearButton: {
        padding: 8,
    },
    clearButtonText: {
        fontSize: 16,
        color: COLORS.neutral,
    },
    helpContainer: {
        marginTop: 12,
        padding: 16,
        backgroundColor: COLORS.selectedBg,
        borderWidth: 1,
        borderColor: COLORS.borderAccent,
        borderRadius: 8,
    },
    helpTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0369A1',
        marginBottom: 8,
    },
    helpTips: { gap: 4, },
    helpTip: { fontSize: 12, color: '#0369A1', },
    helpBold: { fontWeight: '600', },
    resultsCounter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        padding: 12,
        backgroundColor: COLORS.background,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    resultsText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    resetButton: {
        padding: 6,
        paddingHorizontal: 12,
        backgroundColor: COLORS.accent,
        borderRadius: 6,
    },
    resetButtonText: {
        fontSize: 12,
        color: COLORS.headerText,
        fontWeight: '600',
    },
    produitCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        borderRadius: 12,
        backgroundColor: COLORS.surface,
        gap: 16,
        marginBottom: 12,
    },
    produitCardSelected: {
        backgroundColor: COLORS.selectedBg,
        borderColor: COLORS.borderAccent,
    },
    logoImage: {
        borderRadius: 8,
        borderWidth: 2,
        borderColor: COLORS.borderLight,
    },
    logoDefaultContainer: {
        backgroundColor: COLORS.background,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
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
    quantityControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
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
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: COLORS.borderLight,
    },
    emptyStateIcon: { fontSize: 48, marginBottom: 16, },
    emptyStateTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8, },
    emptyStateText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', },
    showAllButton: { marginTop: 16, padding: 8, paddingHorizontal: 16, backgroundColor: COLORS.accent, borderRadius: 6, },
    showAllButtonText: { fontSize: 14, color: COLORS.headerText, fontWeight: '600', },
    emptyPanier: { alignItems: 'center', justifyContent: 'center', padding: 40, },
    emptyPanierIcon: { fontSize: 48, marginBottom: 16, },
    emptyPanierText: { fontSize: 16, color: COLORS.textPrimary, marginBottom: 8, },
    emptyPanierSubtext: { fontSize: 14, color: COLORS.textSecondary, },
    fournisseursSummary: { marginBottom: 16, },
    summaryTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 12, },
    fournisseursList: { maxHeight: 300, },
    fournisseurCard: {
        padding: 16,
        backgroundColor: COLORS.background,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        marginBottom: 12,
    },
    fournisseurName: { fontWeight: '600', color: COLORS.textPrimary, marginBottom: 12, fontSize: 16, },
    produitsCompactList: { gap: 8, },
    produitRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 8,
        backgroundColor: COLORS.surface,
        borderRadius: 6,
    },
    produitInfoCompact: { flex: 1, },
    produitNomCompact: { fontWeight: '600', fontSize: 14, color: COLORS.textPrimary },
    produitDetailsCompact: { fontSize: 13, color: COLORS.textSecondary, },
    produitQuantite: { alignItems: 'flex-end', },
    quantiteText: { fontWeight: '600', fontSize: 14, color: COLORS.textPrimary },
    sousTotalText: { fontSize: 13, color: COLORS.success, fontWeight: '600' },
    fournisseurTotal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.borderLight,
    },
    fournisseurTotalLabel: { fontWeight: '600', color: '#0369A1', },
    fournisseurTotalValue: { fontWeight: '700', color: '#0369A1', },
    totalGeneral: {
        padding: 16,
        backgroundColor: COLORS.selectedBg,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: COLORS.borderAccent,
        marginBottom: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    totalLabel: { fontWeight: '600', color: '#0369A1', },
    totalValue: { fontWeight: '700', fontSize: 18, color: '#0369A1', },
    sendButtons: { gap: 12, },
    sendButton: { padding: 12, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', },
    allChannelsButton: { backgroundColor: '#4F46E5', },
    sendButtonText: { color: COLORS.headerText, fontWeight: '600', fontSize: 16, marginLeft: 8 },
    
    // Modal Styles
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
    modalClose: {
        fontSize: 24,
        color: COLORS.neutral,
        padding: 4,
    },
    modalContent: {
        padding: 20,
    },
    modalSubtitle: {
        fontSize: 16,
        color: COLORS.textSecondary,
        marginBottom: 20,
    },
    inputGroup: {
        marginBottom: 20,
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
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    modalStats: {
        backgroundColor: COLORS.selectedBg,
        borderRadius: 8,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.borderAccent,
    },
    modalStatsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: 12,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    },
    statsLabel: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    statsValue: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    modalButtons: {
        gap: 12,
    },
    modalButton: {
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    modalButtonText: {
        color: COLORS.headerText,
        fontWeight: '600',
        fontSize: 16,
    },
});

export default CommandeFournisseurs;