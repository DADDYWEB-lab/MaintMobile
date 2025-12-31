// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
    View, Text, ScrollView, StyleSheet, TouchableOpacity, 
    TextInput, SafeAreaView, Alert, Linking, KeyboardAvoidingView, Platform 
} from 'react-native';
import { collection, query, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const COLORS = {
    primary: '#8B5CF6', // Violet pour différencier du bleu de la commande
    accent: '#A78BFA', 
    success: '#10B981',
    whatsapp: '#25D366',
    danger: '#EF4444',
    background: '#F8FAFC',
    surface: 'white',
    border: '#E2E8F0',
    textSecondary: '#64748B'
};

const DevisFournisseurs = () => {
    const [produits, setProduits] = useState([]);
    const [panier, setPanier] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [form, setForm] = useState({
        objet: 'Demande de prix standard',
        delaiSouhaite: 'Sous 48h',
        remarques: ''
    });

    // Chargement indépendant des produits
    useEffect(() => {
        const unsub = onSnapshot(query(collection(db, 'produits')), (snap) => {
            setProduits(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsub();
    }, []);

    const ajouter = (id) => setPanier(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    const retirer = (id) => setPanier(prev => {
        const newQty = (prev[id] || 0) - 1;
        if (newQty <= 0) { const { [id]: _, ...rest } = prev; return rest; }
        return { ...prev, [id]: newQty };
    });

    const articlesSelectionnes = Object.values(panier).reduce((a, b) => a + b, 0);

    const genererMessageWhatsApp = () => {
        let message = `📋 *DEMANDE DE DEVIS*\nObjet: ${form.objet}\nDélai souhaité: ${form.delaiSouhaite}\n\n*Articles demandés :*\n`;
        Object.keys(panier).forEach(id => {
            const p = produits.find(item => item.id === id);
            message += `• ${p?.nom} (Réf: ${p?.reference}) - Qté: ${panier[id]} ${p?.unite || 'unité'}\n`;
        });
        if (form.remarques) message += `\n*Note :* ${form.remarques}`;
        return message;
    };

    const envoyerDevis = async (methode) => {
        if (articlesSelectionnes === 0) return Alert.alert("Panier vide", "Sélectionnez au moins un article.");
        
        try {
            const message = genererMessageWhatsApp();
            
            if (methode === 'whatsapp') {
                Linking.openURL(`whatsapp://send?text=${encodeURIComponent(message)}`);
            } else {
                Linking.openURL(`mailto:?subject=${form.objet}&body=${encodeURIComponent(message)}`);
            }

            // Enregistrement dans Firestore pour historique
            await addDoc(collection(db, 'commandes'), {
                type: 'demande_devis',
                ...form,
                articles: panier,
                createdAt: serverTimestamp(),
                statut: 'en_negociation'
            });

            Alert.alert("Envoyé", "Votre demande a été transmise.");
            setPanier({});
        } catch (e) {
            Alert.alert("Erreur", "Problème lors de l'envoi.");
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex:1}}>
                
                {/* Header Devis */}
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <Text style={styles.headerTitle}>📋 Demande de Devis</Text>
                        <View style={styles.cartIconContainer}>
                            <Icon name="file-document-edit" size={28} color="white" />
                            {articlesSelectionnes > 0 && (
                                <View style={styles.badge}><Text style={styles.badgeText}>{articlesSelectionnes}</Text></View>
                            )}
                        </View>
                    </View>
                    <View style={styles.searchBar}>
                        <Icon name="magnify" size={20} color={COLORS.textSecondary} />
                        <TextInput 
                            placeholder="Rechercher pour devis..." 
                            style={styles.searchInput}
                            value={searchTerm}
                            onChangeText={setSearchTerm}
                        />
                    </View>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Liste Produits */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Cocher les articles à chiffrer</Text>
                        {produits.filter(p => p.nom?.toLowerCase().includes(searchTerm.toLowerCase())).map(produit => (
                            <View key={produit.id} style={[styles.productCard, panier[produit.id] && styles.cardActive]}>
                                <View style={styles.productInfo}>
                                    <Text style={styles.productName}>{produit.nom}</Text>
                                    <Text style={styles.productRef}>Ref: {produit.reference}</Text>
                                </View>
                                <View style={styles.controls}>
                                    <TouchableOpacity onPress={() => retirer(produit.id)} style={styles.btnAction}>
                                        <Icon name="minus" size={18} color={COLORS.danger} />
                                    </TouchableOpacity>
                                    <Text style={styles.qtyText}>{panier[produit.id] || 0}</Text>
                                    <TouchableOpacity onPress={() => ajouter(produit.id)} style={styles.btnAction}>
                                        <Icon name="plus" size={18} color={COLORS.success} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* Formulaire Devis (Seulement si sélection) */}
                    {articlesSelectionnes > 0 && (
                        <View style={styles.formSection}>
                            <Text style={styles.formTitle}>Informations de la demande</Text>
                            
                            <Text style={styles.label}>Objet du devis</Text>
                            <TextInput style={styles.input} value={form.objet} onChangeText={(t) => setForm({...form, objet:t})} />
                            
                            <Text style={styles.label}>Délai de réponse souhaité</Text>
                            <TextInput style={styles.input} value={form.delaiSouhaite} onChangeText={(t) => setForm({...form, delaiSouhaite:t})} />

                            <Text style={styles.label}>Précisions techniques / Remarques</Text>
                            <TextInput 
                                style={[styles.input, styles.textArea]} 
                                multiline 
                                placeholder="Indiquez ici des détails particuliers..."
                                onChangeText={(t) => setForm({...form, remarques:t})} 
                            />

                            <View style={styles.actionRow}>
                                <TouchableOpacity style={[styles.sendBtn, {backgroundColor: COLORS.whatsapp}]} onPress={() => envoyerDevis('whatsapp')}>
                                    <Icon name="whatsapp" size={20} color="white" />
                                    <Text style={styles.sendBtnText}>WhatsApp</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.sendBtn, {backgroundColor: COLORS.primary}]} onPress={() => envoyerDevis('email')}>
                                    <Icon name="email-outline" size={20} color="white" />
                                    <Text style={styles.sendBtnText}>Email</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { backgroundColor: COLORS.primary, padding: 20, paddingTop: 40, borderBottomLeftRadius: 25, borderBottomRightRadius: 25 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
    cartIconContainer: { position: 'relative' },
    badge: { position: 'absolute', right: -8, top: -8, backgroundColor: COLORS.danger, borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
    badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 15, height: 45 },
    searchInput: { flex: 1, marginLeft: 10 },
    section: { padding: 20 },
    sectionTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 15, color: COLORS.primary, textTransform: 'uppercase' },
    productCard: { backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
    cardActive: { borderColor: COLORS.accent, backgroundColor: '#F5F3FF' },
    productInfo: { flex: 1 },
    productName: { fontWeight: 'bold', fontSize: 15 },
    productRef: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4 },
    controls: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 10, padding: 5 },
    btnAction: { padding: 5 },
    qtyText: { marginHorizontal: 10, fontWeight: 'bold' },
    // Form Styles
    formSection: { backgroundColor: 'white', margin: 20, borderRadius: 20, padding: 20, elevation: 4 },
    formTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary, marginBottom: 20 },
    label: { fontSize: 12, fontWeight: 'bold', color: COLORS.textSecondary, marginBottom: 5, marginTop: 10 },
    input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, fontSize: 15 },
    textArea: { height: 80, textAlignVertical: 'top' },
    actionRow: { flexDirection: 'row', gap: 10, marginTop: 25 },
    sendBtn: { flex: 1, padding: 15, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    sendBtnText: { color: 'white', fontWeight: 'bold' }
});

export default DevisFournisseurs;