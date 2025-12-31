import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Image, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { auth, db } from '../../firebaseConfig'; 
import { doc, onSnapshot,collection, query, where } from 'firebase/firestore';
import { Mail, Shield, Phone, Star, Trophy, ArrowLeft, Flame } from 'lucide-react-native';

export default function ProfileScreen({ navigation }: any) {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const currentUser = auth.currentUser;
useEffect(() => {
  if (!currentUser) {
    console.log("Désolé, aucun utilisateur n'est connecté à Firebase Auth");
    return;
  }

//   console.log("Tentative de lecture du document pour l'UID :", currentUser.uid);

  const userDocRef = doc(db, 'staff', currentUser.uid);

  const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
    if (docSnap.exists()) {
      console.log("Données trouvées :", docSnap.data());
      setUserData(docSnap.data());
    } else {
      console.log("Le document n'existe pas dans Firestore. Vérifiez la collection et l'UID.");
      // Optionnel : si le doc n'existe pas, on peut utiliser les infos de base d'Auth
      setUserData({
        name: currentUser.displayName || "Utilisateur",
        email: currentUser.email,
        uid: currentUser.uid
      });
    }
    setLoading(false);
  }, (error) => {
    console.error("Erreur Firestore :", error);
    setLoading(false);
  });

  return () => unsubscribe();
}, [currentUser]);




useEffect(() => {
  if (!currentUser) return;

  // 1. On pointe vers la collection
  const staffRef = collection(db, 'staff');

  // 2. On crée une requête : "où le champ 'uid' == l'ID de l'user connecté"
  const q = query(staffRef, where('uid', '==', currentUser.uid));

  // 3. On écoute le résultat
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    if (!querySnapshot.empty) {
      // On récupère les données du premier document trouvé
      const data = querySnapshot.docs[0].data();
      console.log("Données récupérées avec succès :", data);
      setUserData(data);
    } else {
      console.log("Aucun document trouvé avec cet UID dans le champ 'uid'");
      setUserData(null);
    }
    setLoading(false);
  }, (error) => {
    console.error("Erreur Firestore :", error);
    setLoading(false);
  });

  return () => unsubscribe();
}, [currentUser]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil Staff</Text>
        <View style={styles.onlineBadge}>
           <View style={[styles.dot, { backgroundColor: userData?.online ? '#10B981' : '#94A3B8' }]} />
           <Text style={styles.onlineText}>{userData?.online ? 'En ligne' : 'Hors-ligne'}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Section Image et Nom */}
        <View style={styles.profileSection}>
          <View style={styles.imageContainer}>
            {userData?.profileImage ? (
              <Image source={{ uri: userData.profileImage }} style={styles.profileImage} />
            ) : (
              <View style={styles.placeholderImage}>
                <Text style={styles.placeholderText}>{userData?.name?.charAt(0)}</Text>
              </View>
            )}
            <View style={styles.streakBadge}>
              <Flame size={16} color="#FFF" />
              <Text style={styles.streakText}>{userData?.streak || 0}</Text>
            </View>
          </View>
          
          <Text style={styles.nameText}>{userData?.name || 'Utilisateur'}</Text>
          <Text style={styles.roleText}>{userData?.role?.toUpperCase() || 'Staff'}</Text>
        </View>

        {/* Statistiques (Points et Streak) */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Trophy size={24} color="#F59E0B" />
            <Text style={styles.statValue}>{userData?.points || 0}</Text>
            <Text style={styles.statLabel}>Points Gagnés</Text>
          </View>
          <View style={styles.statCard}>
            <Star size={24} color="#3B82F6" />
            <Text style={styles.statValue}>{userData?.specialite || 'Général'}</Text>
            <Text style={styles.statLabel}>Spécialité</Text>
          </View>
        </View>

        {/* Informations de contact */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Coordonnées</Text>
          
          <View style={styles.infoRow}>
            <View style={styles.iconBox}><Mail size={20} color="#3B82F6" /></View>
            <View>
              <Text style={styles.infoLabel}>Email Professionnel</Text>
              <Text style={styles.infoValue}>{userData?.email}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconBox}><Phone size={20} color="#10B981" /></View>
            <View>
              <Text style={styles.infoLabel}>Téléphone</Text>
              <Text style={styles.infoValue}>{userData?.tel || 'Non renseigné'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconBox}><Shield size={20} color="#6366F1" /></View>
            <View>
              <Text style={styles.infoLabel}>Identifiant Unique (UID)</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{userData?.uid}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#FFF' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  onlineText: { fontSize: 12, color: '#64748B' },
  profileSection: { alignItems: 'center', paddingVertical: 30, backgroundColor: '#FFF' },
  imageContainer: { position: 'relative' },
  profileImage: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: '#F1F5F9' },
  placeholderImage: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 50, color: '#FFF', fontWeight: 'bold' },
  streakBadge: { position: 'absolute', bottom: 5, right: 5, backgroundColor: '#F97316', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 2, borderColor: '#FFF' },
  streakText: { color: '#FFF', fontWeight: 'bold', fontSize: 12, marginLeft: 4 },
  nameText: { fontSize: 24, fontWeight: 'bold', color: '#1E293B', marginTop: 15 },
  roleText: { fontSize: 14, color: '#3B82F6', fontWeight: '600', marginTop: 4, letterSpacing: 1 },
  statsContainer: { flexDirection: 'row', padding: 20, justifyContent: 'space-between' },
  statCard: { backgroundColor: '#FFF', width: '48%', padding: 20, borderRadius: 20, alignItems: 'center', elevation: 2 },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginTop: 10 },
  statLabel: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  infoSection: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginBottom: 15 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, backgroundColor: '#FFF', padding: 12, borderRadius: 15 },
  iconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  infoLabel: { fontSize: 12, color: '#94A3B8' },
  infoValue: { fontSize: 15, color: '#1E293B', fontWeight: '500' }
});