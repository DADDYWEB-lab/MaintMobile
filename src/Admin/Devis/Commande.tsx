// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, TextInput, 
    Image, FlatList, SafeAreaView, Alert, Dimensions, ScrollView, Modal, Linking 
} from 'react-native';
import { collection, query, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

const COLORS = {
    primary: '#1E40AF',
    secondary: '#60A5FA',
    success: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
    background: '#F1F5F9',
    surface: '#FFFFFF',
    textDark: '#1E293B',
    textMuted: '#64748B',
};

const CATEGORIES = [
    { id: 'all', label: 'Tout', icon: 'apps' },
    { id: 'Alimentaire', label: 'Alimentaire', icon: 'food-apple' },
    { id: 'Nettoyage', label: 'Nettoyage', icon: 'broom' },
    { id: 'Maintenance', label: 'Maintenance', icon: 'wrench' },
    { id: 'Fourniture', label: 'Fourniture', icon: 'paperclip' },
];

const STATUT_COLORS = {
    envoyee: { bg: '#FEF3C7', text: '#F59E0B', icon: 'clock-outline' },
    confirmee: { bg: '#DBEAFE', text: '#3B82F6', icon: 'check-circle-outline' },
    en_preparation: { bg: '#E0E7FF', text: '#6366F1', icon: 'package-variant' },
    en_livraison: { bg: '#FCE7F3', text: '#EC4899', icon: 'truck-delivery' },
    livree: { bg: '#D1FAE5', text: '#10B981', icon: 'check-all' },
    annulee: { bg: '#FEE2E2', text: '#EF4444', icon: 'close-circle-outline' }
};

const CommandeFournisseurs = () => {
    const [produits, setProduits] = useState([]);
    const [fournisseurs, setFournisseurs] = useState([]);
    const [commandes, setCommandes] = useState([]);
    const [panier, setPanier] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCat, setSelectedCat] = useState('all');
    const [selectedFournisseur, setSelectedFournisseur] = useState('all');
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showTrackingModal, setShowTrackingModal] = useState(false);
    const [selectedCommande, setSelectedCommande] = useState(null);
    const [orderDetails, setOrderDetails] = useState(null);
    const [activeTab, setActiveTab] = useState('produits'); // produits | historique

    // Charger les produits
    useEffect(() => {
        const unsub = onSnapshot(query(collection(db, 'produits')), (snap) => {
            setProduits(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsub();
    }, []);

    // Charger les fournisseurs
    useEffect(() => {
        const unsub = onSnapshot(query(collection(db, 'fournisseurs')), (snap) => {
            setFournisseurs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsub();
    }, []);

    // Charger les commandes
    useEffect(() => {
        const q = query(collection(db, 'commandes'), orderBy('dateCommande', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            setCommandes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsub();
    }, []);

    const handleQty = (id, delta) => {
        setPanier(prev => {
            const current = prev[id] || 0;
            const next = current + delta;
            if (next <= 0) { const { [id]: _, ...rest } = prev; return rest; }
            return { ...prev, [id]: next };
        });
    };

    // Filtrage combiné
    const filtered = useMemo(() => {
        return produits.filter(p => {
            const matchSearch = p.nom?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchCat = selectedCat === 'all' || p.categorie === selectedCat;
            const matchFourn = selectedFournisseur === 'all' || p.fournisseurId === selectedFournisseur;
            return matchSearch && matchCat && matchFourn;
        });
    }, [produits, searchTerm, selectedCat, selectedFournisseur]);

    // Organiser le panier par fournisseur
    const panierParFournisseur = useMemo(() => {
        const organise = {};
        Object.keys(panier).forEach(produitId => {
            const produit = produits.find(p => p.id === produitId);
            if (produit && produit.fournisseurId) {
                if (!organise[produit.fournisseurId]) {
                    organise[produit.fournisseurId] = {
                        produits: [],
                        total: 0
                    };
                }
                const prix = Number(produit.prix || 0) * panier[produitId];
                organise[produit.fournisseurId].produits.push({
                    ...produit,
                    quantite: panier[produitId],
                    sousTotal: prix
                });
                organise[produit.fournisseurId].total += prix;
            }
        });
        return organise;
    }, [panier, produits]);

    const totalPrix = Object.values(panierParFournisseur).reduce((sum, f) => sum + f.total, 0);

    const getFournisseur = (id) => fournisseurs.find(f => f.id === id);

    const prepareOrder = () => {
        if (Object.keys(panier).length === 0) {
            Alert.alert('Panier vide', 'Ajoutez des produits avant de commander');
            return;
        }
        setOrderDetails(panierParFournisseur);
        setShowOrderModal(true);
    };

    const sendOrderByWhatsApp = async (fournisseurId, produitsList, total) => {
        const fournisseur = getFournisseur(fournisseurId);
        if (!fournisseur) return;

        let message = `🏨 *Nouvelle Commande Hôtel*\n\n`;
        message += `📋 *Détails de la commande:*\n\n`;
        
        produitsList.forEach((p, index) => {
            message += `${index + 1}. ${p.nom}\n`;
            message += `   Quantité: ${p.quantite}\n`;
            message += `   Prix unitaire: ${Number(p.prix).toFixed(2)}€\n`;
            message += `   Sous-total: ${p.sousTotal.toFixed(2)}€\n\n`;
        });

        message += `💰 *Total: ${total.toFixed(2)}€*\n\n`;
        message += `Date: ${new Date().toLocaleDateString('fr-FR')}`;

        const whatsappUrl = `whatsapp://send?phone=${fournisseur.telephone}&text=${encodeURIComponent(message)}`;
        
        try {
            const supported = await Linking.canOpenURL(whatsappUrl);
            if (supported) {
                await Linking.openURL(whatsappUrl);
                await saveOrderToFirebase(fournisseurId, produitsList, total, 'whatsapp');
                // Vider le panier après envoi
                setPanier({});
                setShowOrderModal(false);
                Alert.alert('✅ Succès', 'Commande envoyée par WhatsApp');
            } else {
                Alert.alert('Erreur', 'WhatsApp non disponible sur cet appareil');
            }
        } catch (error) {
            Alert.alert('Erreur', 'Impossible d\'ouvrir WhatsApp');
        }
    };

    const sendOrderByEmail = async (fournisseurId, produitsList, total) => {
        const fournisseur = getFournisseur(fournisseurId);
        if (!fournisseur) return;

        const subject = `Commande Hôtel - ${new Date().toLocaleDateString('fr-FR')}`;
        
        let body = `Bonjour,\n\nVoici notre commande:\n\n`;
        produitsList.forEach((p, index) => {
            body += `${index + 1}. ${p.nom} - Qté: ${p.quantite} - ${p.sousTotal.toFixed(2)}€\n`;
        });
        body += `\nTotal: ${total.toFixed(2)}€\n\n`;
        body += `Cordialement,\nL'équipe de l'hôtel`;

        const emailUrl = `mailto:${fournisseur.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        
        try {
            const supported = await Linking.canOpenURL(emailUrl);
            if (supported) {
                await Linking.openURL(emailUrl);
                await saveOrderToFirebase(fournisseurId, produitsList, total, 'email');
                setPanier({});
                setShowOrderModal(false);
                Alert.alert('✅ Succès', 'Commande envoyée par Email');
            } else {
                Alert.alert('Erreur', 'Client email non disponible');
            }
        } catch (error) {
            Alert.alert('Erreur', 'Impossible d\'ouvrir le client email');
        }
    };

    const saveOrderToFirebase = async (fournisseurId, produitsList, total, methode) => {
        try {
            await addDoc(collection(db, 'commandes'), {
                fournisseurId,
                nomEntreprise: getFournisseur(fournisseurId)?.nom,
                produits: produitsList.map(p => ({
                    id: p.id,
                    nom: p.nom,
                    quantite: p.quantite,
                    prix: p.prix,
                    sousTotal: p.sousTotal
                })),
                total,
                methodeEnvoi: methode,
                statut: 'envoyee',
                dateCommande: serverTimestamp(),
                dateLivraison: null,
                historique: [{
                    statut: 'envoyee',
                    date: serverTimestamp(),
                    commentaire: 'Commande envoyée au fournisseur'
                }]
            });
        } catch (error) {
            console.error('Erreur sauvegarde commande:', error);
            Alert.alert('Erreur', 'Impossible de sauvegarder la commande');
        }
    };

    const updateCommandeStatut = async (commandeId, newStatut, commentaire = '') => {
        try {
            const commandeRef = doc(db, 'commandes', commandeId);
            const commande = commandes.find(c => c.id === commandeId);
            
            const updatedHistorique = [
                ...(commande.historique || []),
                {
                    statut: newStatut,
                    date: new Date(),
                    commentaire
                }
            ];

            await updateDoc(commandeRef, {
                statut: newStatut,
                historique: updatedHistorique,
                ...(newStatut === 'livree' ? { dateLivraison: serverTimestamp() } : {})
            });

            Alert.alert('✅ Mis à jour', `Statut changé en "${getStatutLabel(newStatut)}"`);
        } catch (error) {
            Alert.alert('Erreur', 'Impossible de mettre à jour le statut');
        }
    };

    const getStatutLabel = (statut) => {
        const labels = {
            envoyee: 'Envoyée',
            confirmee: 'Confirmée',
            en_preparation: 'En préparation',
            en_livraison: 'En livraison',
            livree: 'Livrée',
            annulee: 'Annulée'
        };
        return labels[statut] || statut;
    };

    const openTracking = (commande) => {
        setSelectedCommande(commande);
        setShowTrackingModal(true);
    };

    const StatutBadge = ({ statut }) => {
        const config = STATUT_COLORS[statut] || STATUT_COLORS.envoyee;
        return (
            <View style={[styles.statutBadge, { backgroundColor: config.bg }]}>
                <Icon name={config.icon} size={14} color={config.text} />
                <Text style={[styles.statutText, { color: config.text }]}>{getStatutLabel(statut)}</Text>
            </View>
        );
    };

    const renderProduitsTab = () => (
        <>
            {/* Filtres */}
            <View style={styles.filtersContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
                    {CATEGORIES.map(cat => (
                        <TouchableOpacity 
                            key={cat.id} 
                            onPress={() => setSelectedCat(cat.id)}
                            style={[styles.filterChip, selectedCat === cat.id && styles.filterChipActive]} >
                            <Icon name={cat.icon} size={16} color={selectedCat === cat.id ? 'white' : COLORS.primary} />
                            <Text style={[styles.filterText, selectedCat === cat.id && styles.filterTextActive]}>{cat.label}</Text>
                        </TouchableOpacity>
                    ))}

                </ScrollView>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
                    <TouchableOpacity 
                        onPress={() => setSelectedFournisseur('all')}
                        style={[styles.filterChip, styles.supplierChip, selectedFournisseur === 'all' && styles.supplierChipActive]}
                    >
                        <Icon name="store" size={16} color={selectedFournisseur === 'all' ? 'white' : COLORS.success} />
                        <Text style={[styles.filterText, selectedFournisseur === 'all' && styles.supplierTextActive]}>Tous</Text>
                    </TouchableOpacity>
                    {fournisseurs.map(f => (
                        <TouchableOpacity 
                            key={f.id} 
                            onPress={() => setSelectedFournisseur(f.id)}
                            style={[styles.filterChip, styles.supplierChip, selectedFournisseur === f.id && styles.supplierChipActive]}
                        >
                            <Icon name="store" size={16} color={selectedFournisseur === f.id ? 'white' : COLORS.success} />
                            <Text style={[styles.filterText, selectedFournisseur === f.id && styles.supplierTextActive]}>{f.nomEntreprise}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Grille de Produits */}
            <FlatList
                data={filtered}
                numColumns={2}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.gridContent}
                renderItem={({ item }) => {
                    const fournisseur = getFournisseur(item.fournisseurId);
                    return (
                        <View style={styles.productCard}>
                            {fournisseur && (
                                <View style={styles.supplierBadge}>
                                    <Icon name="store" size={10} color="white" />
                                    <Text style={styles.supplierBadgeText} numberOfLines={1}>{fournisseur.nom}</Text>
                                </View>
                            )}
                            
                            <View style={styles.imageContainer}>
                                {item.logo ? 
                                    <Image source={{ uri: item.logo }} style={styles.productImg} /> : 
                                    <View style={styles.placeholderImg}>
                                        <Icon name="package-variant" size={40} color="#E2E8F0" />
                                    </View>
                                }
                            </View>
                            
                            <Text style={styles.productName} numberOfLines={2}>{item.nom}</Text>
                            <Text style={styles.productPrice}>{Number(item.prix || 0).toFixed(2)}€</Text>
                            
                            <View style={styles.cardActions}>
                                {panier[item.id] ? (
                                    <View style={styles.qtySelector}>
                                        <TouchableOpacity onPress={() => handleQty(item.id, -1)} style={styles.qtyBtn}>
                                            <Icon name="minus" size={14} color="white" />
                                        </TouchableOpacity>
                                        <Text style={styles.qtyValue}>{panier[item.id]}</Text>
                                        <TouchableOpacity onPress={() => handleQty(item.id, 1)} style={styles.qtyBtn}>
                                            <Icon name="plus" size={14} color="white" />
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <TouchableOpacity onPress={() => handleQty(item.id, 1)} style={styles.addBtn}>
                                        <Text style={styles.addBtnText}>Ajouter</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    );
                }}
            />
        </>
    );

    const renderHistoriqueTab = () => (
        <FlatList
            data={commandes}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.historyContent}
            renderItem={({ item }) => (
                <TouchableOpacity 
                    style={styles.historyCard}
                    onPress={() => openTracking(item)}
                >
                    <View style={styles.historyHeader}>
                        <View style={styles.historyHeaderLeft}>
                            <Icon name="receipt" size={20} color={COLORS.primary} />
                            <Text style={styles.historyTitle}>{item.fournisseurNom}</Text>
                        </View>
                        <StatutBadge statut={item.statut} />
                    </View>

                    <View style={styles.historyDetails}>
                        <View style={styles.historyRow}>
                            <Icon name="calendar" size={16} color={COLORS.textMuted} />
                            <Text style={styles.historyText}>
                                {item.dateCommande?.toDate?.().toLocaleDateString('fr-FR')}
                            </Text>
                        </View>
                        <View style={styles.historyRow}>
                            <Icon name="package-variant-closed" size={16} color={COLORS.textMuted} />
                            <Text style={styles.historyText}>{item.produits?.length} produit(s)</Text>
                        </View>
                        <View style={styles.historyRow}>
                            <Icon name={item.methodeEnvoi === 'whatsapp' ? 'whatsapp' : 'email'} size={16} color={COLORS.textMuted} />
                            <Text style={styles.historyText}>{item.methodeEnvoi === 'whatsapp' ? 'WhatsApp' : 'Email'}</Text>
                        </View>
                    </View>

                    <View style={styles.historyFooter}>
                        <Text style={styles.historyTotal}>{item.total?.toFixed(2)}€</Text>
                        <TouchableOpacity style={styles.trackingBtn} onPress={() => openTracking(item)}>
                            <Text style={styles.trackingBtnText}>Suivre</Text>
                            <Icon name="arrow-right" size={16} color={COLORS.primary} />
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            )}
        />
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <LinearGradient colors={[COLORS.primary, '#1e3a8a']} style={styles.header}>
                <View style={styles.headerTop}>
                    <Text style={styles.headerTitle}>Commande</Text>
                    <View style={styles.headerIcons}>
                        <TouchableOpacity style={styles.notifIcon}>
                            <Icon name="bell" size={24} color="white" />
                            {commandes.filter(c => c.statut === 'en_livraison').length > 0 && (
                                <View style={styles.notifBadge}>
                                    <Text style={styles.notifBadgeText}>
                                        {commandes.filter(c => c.statut === 'en_livraison').length}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={styles.searchWrapper}>
                    <Icon name="magnify" size={20} color={COLORS.textMuted} />
                    <TextInput 
                        placeholder="Rechercher un produit..." 
                        style={styles.searchInput}
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                    />
                </View>

                {/* Tabs */}
                <View style={styles.tabsContainer}>
                    <TouchableOpacity 
                        style={[styles.tab, activeTab === 'produits' && styles.tabActive]}
                        onPress={() => setActiveTab('produits')}
                    >
                        <Icon name="basket" size={20} color={activeTab === 'produits' ? COLORS.primary : 'white'} />
                        <Text style={[styles.tabText, activeTab === 'produits' && styles.tabTextActive]}>Produits</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.tab, activeTab === 'historique' && styles.tabActive]}
                        onPress={() => setActiveTab('historique')} >


                        <Icon name="history" size={20} color={activeTab === 'historique' ? COLORS.primary : 'white'} />
                        <Text style={[styles.tabText, activeTab === 'historique' && styles.tabTextActive]}>Historique</Text>
                        {commandes.length > 0 && (
                            <View style={styles.tabBadge}>
                                <Text style={styles.tabBadgeText}>{commandes.length}</Text>
                            </View>
                        )}


                        
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {/* Contenu selon l'onglet actif */}
            {activeTab === 'produits' ? renderProduitsTab() : renderHistoriqueTab()}

            {/* Panier Flottant */}
            {totalPrix > 0 && activeTab === 'produits' && (
                <View style={styles.floatingCart}>
                    <LinearGradient colors={['#10B981', '#059669']} style={styles.cartGradient}>
                        <View>
                            <Text style={styles.totalText}>{totalPrix.toFixed(2)} €</Text>
                            <Text style={styles.totalSubtext}>{Object.keys(panierParFournisseur).length} fournisseur(s)</Text>
                        </View>
                        <TouchableOpacity style={styles.checkoutBtn} onPress={prepareOrder}>
                            <Text style={styles.checkoutText}>Commander</Text>
                            <Icon name="arrow-right" size={18} color="white" />
                        </TouchableOpacity>
                    </LinearGradient>
                </View>
            )}



            {/* Modal de Commande */}
            <Modal visible={showOrderModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Récapitulatif Commande</Text>
                            <TouchableOpacity onPress={() => setShowOrderModal(false)}>
                                <Icon name="close" size={24} color={COLORS.textDark} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            {Object.keys(panierParFournisseur).map(fournisseurId => {
                                const fournisseur = getFournisseur(fournisseurId);
                                const commande = panierParFournisseur[fournisseurId];
                                
                                return (
                                    <View key={fournisseurId} style={styles.orderSection}>
                                        <View style={styles.supplierHeader}>
                                            <View style={styles.supplierInfo}>
                                                <Icon name="store" size={20} color={COLORS.success} />
                                                <Text style={styles.supplierName}>{fournisseur?.nomEntreprise}</Text>
                                            </View>
                                            <Text style={styles.supplierTotal}>{commande.total.toFixed(2)}€</Text>
                                        </View>

                                        {commande.produits.map((p, idx) => (
                                            <View key={idx} style={styles.orderItem}>
                                                <Text style={styles.orderItemName}>{p.nom}</Text>
                                                <Text style={styles.orderItemQty}>x{p.quantite}</Text>
                                                <Text style={styles.orderItemPrice}>{p.sousTotal.toFixed(2)}€</Text>
                                            </View>
                                        ))}

                                        <View style={styles.contactButtons}>
                                            {fournisseur?.telephone && (
                                                <TouchableOpacity 
                                                    style={styles.contactBtn}
                                                    onPress={() => sendOrderByWhatsApp(fournisseurId, commande.produits, commande.total)}
                                                >
                                                    <Icon name="whatsapp" size={20} color="white" />
                                                    <Text style={styles.contactBtnText}>WhatsApp</Text>
                                                </TouchableOpacity>
                                            )}
                                            {fournisseur?.email && (
                                                <TouchableOpacity 
                                                    style={[styles.contactBtn, styles.emailBtn]}
                                                    onPress={() => sendOrderByEmail(fournisseurId, commande.produits, commande.total)}
                                                >
                                                    <Icon name="email" size={20} color="white" />
                                                    <Text style={styles.contactBtnText}>Email</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
                                );
                            })}
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <Text style={styles.modalTotal}>Total: {totalPrix.toFixed(2)}€</Text>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal de Suivi */}
            <Modal visible={showTrackingModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Suivi de commande</Text>
                            <TouchableOpacity onPress={() => setShowTrackingModal(false)}>
                                <Icon name="close" size={24} color={COLORS.textDark} />
                            </TouchableOpacity>

                    
                    
                        </View>

                        <ScrollView style={styles.modalBody}>
                            {selectedCommande && (
                                <>
                                    {/* Info Commande */}
                                    <View style={styles.trackingInfo}>
                                        <View style={styles.trackingRow}>
                                            <Text style={styles.trackingLabel}>Fournisseur:</Text>
                                            <Text style={styles.trackingValue}>{selectedCommande.fournisseurNom}</Text>
                                        </View>
                                        <View style={styles.trackingRow}>
                                            <Text style={styles.trackingLabel}>Date:</Text>
                                            <Text style={styles.trackingValue}>
                                                {selectedCommande.dateCommande?.toDate?.().toLocaleDateString('fr-FR')}
                                            </Text>
                                        </View>
                                        <View style={styles.trackingRow}>
                                            <Text style={styles.trackingLabel}>Total:</Text>
                                            <Text style={styles.trackingValue}>{selectedCommande.total?.toFixed(2)}€</Text>
                                        </View>
                                        <View style={styles.trackingRow}>
                                            <Text style={styles.trackingLabel}>Statut:</Text>
                                            <StatutBadge statut={selectedCommande.statut} />
                                        </View>
                                    </View>

                                    {/* Timeline */}
                                    <View style={styles.timeline}>
                                        <Text style={styles.timelineTitle}>Historique</Text>
                                        {selectedCommande.historique?.map((h, idx) => (
                                            <View key={idx} style={styles.timelineItem}>
                                                <View style={styles.timelineDot} />
                                                <View style={styles.timelineContent}>
                                                    <View style={styles.timelineHeader}>
                                                        <Text style={styles.timelineStatut}>{getStatutLabel(h.statut)}</Text>
                                                        <Text style={styles.timelineDate}>
                                                            {h.date?.toDate?.().toLocaleDateString('fr-FR')}
                                                        </Text>
                                                    </View>
                                                    {h.commentaire && (
                                                        <Text style={styles.timelineComment}>{h.commentaire}</Text>
                                                    )}
                                                </View>
                                            </View>
                                        ))}
                                    </View>

                                    {/* Actions de Statut */}
                                    {selectedCommande.statut !== 'livree' && selectedCommande.statut !== 'annulee' && (
                                        <View style={styles.statutActions}>
                                            <Text style={styles.statutActionsTitle}>Changer le statut:</Text>
                                            <View style={styles.statutButtonsGrid}>
                                                {selectedCommande.statut === 'envoyee' && (
                                                    <TouchableOpacity 
                                                        style={styles.statutActionBtn}
                                                        onPress={() => updateCommandeStatut(selectedCommande.id, 'confirmee', 'Commande confirmée par le fournisseur')}
                                                    >
                                                        <Icon name="check-circle" size={20} color={COLORS.secondary} />
                                                        <Text style={styles.statutActionText}>Confirmée</Text>
                                                    </TouchableOpacity>
                                                )}
                                                {(selectedCommande.statut === 'confirmee' || selectedCommande.statut === 'envoyee') && (
                                                    <TouchableOpacity 
                                                        style={styles.statutActionBtn}
                                                        onPress={() => updateCommandeStatut(selectedCommande.id, 'en_preparation', 'Commande en cours de préparation')}
                                                    >
                                                        <Icon name="package-variant" size={20} color="#6366F1" />
                                                        <Text style={styles.statutActionText}>En préparation</Text>
                                                    </TouchableOpacity>
                                                )}
                                                {(selectedCommande.statut === 'en_preparation' || selectedCommande.statut === 'confirmee') && (
                                                    <TouchableOpacity 
                                                        style={styles.statutActionBtn}
                                                        onPress={() => updateCommandeStatut(selectedCommande.id, 'en_livraison', 'Commande en cours de livraison')}
                                                    >
                                                        <Icon name="truck-delivery" size={20} color="#EC4899" />
                                                        <Text style={styles.statutActionText}>En livraison</Text>
                                                    </TouchableOpacity>
                                                )}
                                                {selectedCommande.statut === 'en_livraison' && (
                                                    <TouchableOpacity 
                                                        style={styles.statutActionBtn}
                                                        onPress={() => updateCommandeStatut(selectedCommande.id, 'livree', 'Commande livrée avec succès')}
                                                    >
                                                        <Icon name="check-all" size={20} color={COLORS.success} />
                                                        <Text style={styles.statutActionText}>Livrée</Text>
                                                    </TouchableOpacity>
                                                )}
                                                <TouchableOpacity 
                                                    style={[styles.statutActionBtn, styles.cancelBtn]}
                                                    onPress={() => {
                                                        Alert.alert(
                                                            'Annuler la commande',
                                                            'Êtes-vous sûr de vouloir annuler cette commande?',
                                                            [
                                                                { text: 'Non', style: 'cancel' },
                                                                { text: 'Oui', onPress: () => updateCommandeStatut(selectedCommande.id, 'annulee', 'Commande annulée') }
                                                            ]
                                                        );
                                                    }}
                                                >
                                                    <Icon name="close-circle" size={20} color={COLORS.danger} />
                                                    <Text style={[styles.statutActionText, styles.cancelText]}>Annuler</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    )}
                                                                        {/* Détails des produits */}
                                    <View style={styles.productsList}>
                                        <Text style={styles.productsListTitle}>Détails des produits</Text>
                                        {selectedCommande.produits?.map((p, idx) => (
                                            <View key={idx} style={styles.productItem}>
                                                <View style={styles.productItemLeft}>
                                                    <Text style={styles.productItemName}>{p.nom}</Text>
                                                    <Text style={styles.productItemUnit}>Prix unitaire: {Number(p.prix).toFixed(2)}€</Text>
                                                </View>
                                                <View style={styles.productItemRight}>
                                                    <Text style={styles.productItemQty}>x {p.quantite}</Text>
                                                    <Text style={styles.productItemSubtotal}>{p.sousTotal.toFixed(2)}€</Text>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                </>
                            )}
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity 
                                style={styles.closeBtn}
                                onPress={() => setShowTrackingModal(false)}
                            >
                                <Text style={styles.closeBtnText}>Fermer</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 16,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: 'white',
    },
    headerIcons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    notifIcon: {
        position: 'relative',
        padding: 4,
    },
    notifBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        backgroundColor: COLORS.danger,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notifBadgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    searchWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 44,
        marginBottom: 16,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        color: COLORS.textDark,
    },
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 12,
        padding: 4,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8,
    },
    tabActive: {
        backgroundColor: 'white',
    },
    tabText: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '600',
        color: 'white',
    },
    tabTextActive: {
        color: COLORS.primary,
    },
    tabBadge: {
        backgroundColor: COLORS.danger,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    tabBadgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    filtersContainer: {
        backgroundColor: 'white',
        paddingVertical: 12,
    },
    filterRow: {
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    filterChipActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    supplierChip: {
        borderColor: '#D1FAE5',
        backgroundColor: '#ECFDF5',
    },
    supplierChipActive: {
        backgroundColor: COLORS.success,
        borderColor: COLORS.success,
    },
    filterText: {
        marginLeft: 6,
        fontSize: 13,
        fontWeight: '500',
        color: COLORS.textDark,
    },
    filterTextActive: {
        color: 'white',
    },
    supplierTextActive: {
        color: 'white',
    },
    gridContent: {
        padding: 16,
        paddingBottom: 100,
    },
    productCard: {
        width: cardWidth,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 12,
        marginBottom: 16,
        marginRight: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
        position: 'relative',
    },
    supplierBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.success,
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 4,
        zIndex: 1,
    },
    supplierBadgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '600',
        marginLeft: 4,
        maxWidth: cardWidth - 40,
    },
    imageContainer: {
        height: 100,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    productImg: {
        width: '100%',
        height: '100%',
        borderRadius: 12,
    },
    placeholderImg: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    productName: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textDark,
        marginBottom: 4,
        height: 40,
    },
    productPrice: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.primary,
        marginBottom: 12,
    },
    cardActions: {
        height: 36,
    },
    qtySelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.primary,
        borderRadius: 18,
        paddingHorizontal: 12,
        height: 36,
    },
    qtyBtn: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    qtyValue: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        marginHorizontal: 12,
    },
    addBtn: {
        backgroundColor: COLORS.primary,
        borderRadius: 18,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addBtnText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    historyContent: {
        padding: 16,
        paddingBottom: 100,
    },
    historyCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    historyHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    historyTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textDark,
        marginLeft: 8,
    },
    statutBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    statutText: {
        marginLeft: 4,
        fontSize: 12,
        fontWeight: '600',
    },
    historyDetails: {
        marginBottom: 12,
    },
    historyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    historyText: {
        marginLeft: 8,
        fontSize: 14,
        color: COLORS.textMuted,
    },
    historyFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    historyTotal: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.primary,
    },
    trackingBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#EFF6FF',
        borderRadius: 12,
    },
    trackingBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.primary,
        marginRight: 4,
    },
    floatingCart: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    cartGradient: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderRadius: 16,
    },
    totalText: {
        fontSize: 24,
        fontWeight: '700',
        color: 'white',
    },
    totalSubtext: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.9)',
        marginTop: 2,
    },
    checkoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
    },
    checkoutText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        marginRight: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.textDark,
    },
    modalBody: {
        padding: 20,
        maxHeight: 500,
    },
    orderSection: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    supplierHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    supplierInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    supplierName: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textDark,
        marginLeft: 8,
    },
    supplierTotal: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.primary,
    },
    orderItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    orderItemName: {
        flex: 2,
        fontSize: 14,
        color: COLORS.textDark,
    },
    orderItemQty: {
        flex: 1,
        textAlign: 'center',
        fontSize: 14,
        color: COLORS.textMuted,
    },
    orderItemPrice: {
        flex: 1,
        textAlign: 'right',
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.primary,
    },
    contactButtons: {
        flexDirection: 'row',
        marginTop: 12,
    },
    contactBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#25D366',
        borderRadius: 12,
        paddingVertical: 12,
        marginRight: 8,
    },
    emailBtn: {
        backgroundColor: COLORS.primary,
        marginRight: 0,
    },
    contactBtnText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
    modalFooter: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    modalTotal: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.textDark,
        textAlign: 'center',
    },
    trackingInfo: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
    },
    trackingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    trackingLabel: {
        fontSize: 14,
        color: COLORS.textMuted,
    },
    trackingValue: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textDark,
    },
    timeline: {
        marginBottom: 20,
    },
    timelineTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textDark,
        marginBottom: 16,
    },
    timelineItem: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    timelineDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: COLORS.primary,
        marginRight: 12,
        marginTop: 4,
    },
    timelineContent: {
        flex: 1,
    },
    timelineHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    timelineStatut: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textDark,
    },
    timelineDate: {
        fontSize: 12,
        color: COLORS.textMuted,
    },
    timelineComment: {
        fontSize: 13,
        color: COLORS.textMuted,
        fontStyle: 'italic',
    },
    statutActions: {
        marginBottom: 20,
    },
    statutActionsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textDark,
        marginBottom: 12,
    },
    statutButtonsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -4,
    },
    statutActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        margin: 4,
        flex: 1,
        minWidth: '45%',
    },
    cancelBtn: {
        backgroundColor: '#FEE2E2',
    },
    statutActionText: {
        marginLeft: 8,
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textDark,
    },
    cancelText: {
        color: COLORS.danger,
    },
    productsList: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
    },
    productsListTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textDark,
        marginBottom: 12,
    },
    productItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    productItemLeft: {
        flex: 2,
    },
    productItemName: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.textDark,
        marginBottom: 2,
    },
    productItemUnit: {
        fontSize: 12,
        color: COLORS.textMuted,
    },
    productItemRight: {
        flex: 1,
        alignItems: 'flex-end',
    },
    productItemQty: {
        fontSize: 14,
        color: COLORS.textMuted,
        marginBottom: 2,
    },
    productItemSubtotal: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.primary,
    },
    closeBtn: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    closeBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default CommandeFournisseurs;