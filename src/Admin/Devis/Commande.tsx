// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, TextInput, 
    Image, FlatList, SafeAreaView, Alert, Dimensions, ScrollView 
} from 'react-native';
import { collection, query, onSnapshot } from 'firebase/firestore';
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
    background: '#F1F5F9',
    surface: '#FFFFFF',
    textDark: '#1E293B',
    textMuted: '#64748B',
    cart: '#F59E0B'
};

const CATEGORIES = [
    { id: 'all', label: 'Tout', icon: 'apps' },
    { id: 'Alimentaire', label: 'Alimentaire', icon: 'food-apple' },
    { id: 'Nettoyage', label: 'Nettoyage', icon: 'broom' },
    { id: 'Maintenance', label: 'Maintenance', icon: 'wrench' },
    { id: 'Fourniture', label: 'Fourniture', icon: 'paperclip' },
];

const CommandeFournisseurs = () => {
    const [produits, setProduits] = useState([]);
    const [panier, setPanier] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCat, setSelectedCat] = useState('all');

    useEffect(() => {
        const unsub = onSnapshot(query(collection(db, 'produits')), (snap) => {
            setProduits(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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

    // Filtrage combiné (Recherche + Catégorie)
    const filtered = useMemo(() => {
        return produits.filter(p => {
            const matchSearch = p.nom?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchCat = selectedCat === 'all' || p.categorie === selectedCat;
            return matchSearch && matchCat;
        });
    }, [produits, searchTerm, selectedCat]);

    const totalPrix = Object.keys(panier).reduce((sum, id) => {
        const p = produits.find(item => item.id === id);
        return sum + (Number(p?.prix || 0)) * panier[id];
    }, 0);

    return (
        <SafeAreaView style={styles.container}>
            {/* Header avec recherche */}
            <LinearGradient colors={[COLORS.primary, '#1e3a8a']} style={styles.header}>
                <View style={styles.headerTop}>
                    <Text style={styles.headerTitle}>Approvisionnement</Text>
                    <Icon name="basket" size={26} color="white" />
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
            </LinearGradient>

            {/* Puces de Catégories Horizontales */}
            <View style={styles.categoriesWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
                    {CATEGORIES.map(cat => (
                        <TouchableOpacity 
                            key={cat.id} 
                            onPress={() => setSelectedCat(cat.id)}
                            style={[styles.catChip, selectedCat === cat.id && styles.catChipActive]}
                        >
                            <Icon name={cat.icon} size={16} color={selectedCat === cat.id ? 'white' : COLORS.primary} />
                            <Text style={[styles.catText, selectedCat === cat.id && styles.catTextActive]}>{cat.label}</Text>
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
                renderItem={({ item }) => (
                    <View style={styles.productCard}>
                        <View style={styles.imageContainer}>
                            {item.logo ? <Image source={{ uri: item.logo }} style={styles.productImg} /> : 
                            <View style={styles.placeholderImg}><Icon name="package-variant" size={40} color="#E2E8F0" /></View>}
                        </View>
                        <Text style={styles.productName} numberOfLines={1}>{item.nom}</Text>
                        {/* Sécurité .toFixed(2) ajoutée ici */}
                        <Text style={styles.productPrice}>{Number(item.prix || 0).toFixed(2)}€</Text>
                        
                        <View style={styles.cardActions}>
                            {panier[item.id] ? (
                                <View style={styles.qtySelector}>
                                    <TouchableOpacity onPress={() => handleQty(item.id, -1)} style={styles.qtyBtn}><Icon name="minus" size={14} color="white" /></TouchableOpacity>
                                    <Text style={styles.qtyValue}>{panier[item.id]}</Text>
                                    <TouchableOpacity onPress={() => handleQty(item.id, 1)} style={styles.qtyBtn}><Icon name="plus" size={14} color="white" /></TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity onPress={() => handleQty(item.id, 1)} style={styles.addBtn}>
                                    <Text style={styles.addBtnText}>Ajouter</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}
            />

            {/* Panier Flottant */}
            {totalPrix > 0 && (
                <View style={styles.floatingCart}>
                    <LinearGradient colors={['#10B981', '#059669']} style={styles.cartGradient}>
                        <Text style={styles.totalText}>Total: {totalPrix.toFixed(2)} €</Text>
                        <TouchableOpacity style={styles.checkoutBtn}>
                            <Text style={styles.checkoutText}>Commander</Text>
                        </TouchableOpacity>
                    </LinearGradient>
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { padding: 20, paddingTop: 40, borderBottomLeftRadius: 25, borderBottomRightRadius: 25 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
    searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 15, height: 45 },
    searchInput: { flex: 1, marginLeft: 10 },
    
    categoriesWrapper: { marginVertical: 10 },
    catScroll: { paddingHorizontal: 16 },
    catChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: COLORS.primary },
    catChipActive: { backgroundColor: COLORS.primary },
    catText: { marginLeft: 6, fontWeight: '600', color: COLORS.primary },
    catTextActive: { color: 'white' },

    gridContent: { padding: 8, paddingBottom: 100 },
    productCard: { width: cardWidth, backgroundColor: 'white', borderRadius: 15, padding: 12, margin: 8, elevation: 3 },
    imageContainer: { width: '100%', height: 80, borderRadius: 10, overflow: 'hidden', marginBottom: 8 },
    productImg: { width: '100%', height: '100%' },
    placeholderImg: { width: '100%', height: '100%', backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
    productName: { fontSize: 14, fontWeight: 'bold', color: COLORS.textDark },
    productPrice: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary, marginVertical: 4 },
    
    cardActions: { marginTop: 5 },
    addBtn: { backgroundColor: COLORS.primary, padding: 8, borderRadius: 8, alignItems: 'center' },
    addBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
    qtySelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F1F5F9', borderRadius: 8, padding: 2 },
    qtyBtn: { backgroundColor: COLORS.primary, width: 25, height: 25, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
    qtyValue: { fontWeight: 'bold' },

    floatingCart: { position: 'absolute', bottom: 20, left: 20, right: 20 },
    cartGradient: { borderRadius: 15, padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    checkoutBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10 },
    checkoutText: { color: 'white', fontWeight: 'bold' }
});

export default CommandeFournisseurs;