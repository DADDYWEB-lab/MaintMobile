import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  Image,
  Alert,
} from 'react-native';
import { auth, db } from '../../firebaseConfig'; // Votre fichier de config
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import AddReclamationModal from '../Admin/Reclamation/AddReclamationModal'

const { width } = Dimensions.get('window');


interface UserProfile {
  name: string;
  avatar: string;
  role?: string;   
  points?: number;
  online?: boolean;
  uid?: string;
}
const App = () => {
  const [time, setTime] = useState(new Date());
  const [isPlaying, setIsPlaying] = useState(false);
  const [battery, setBattery] = useState(62);
  const navigation = useNavigation();



 // On dit à useState d'accepter le format UserProfile
const [user, setUser] = useState<UserProfile>({
  name: 'Chargement...',
  avatar: 'https://via.placeholder.com/150',

});


const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);

useEffect(() => {
  const unsubscribeAuth = onAuthStateChanged(auth, async (authenticatedUser) => {
    if (authenticatedUser) {
      const staffRef = collection(db, "staff");
      const q = query(staffRef, where("uid", "==", authenticatedUser.uid));

      const unsubscribeFirestore = onSnapshot(q, (querySnapshot) => {
        if (!querySnapshot.empty) {
          const docData = querySnapshot.docs[0].data();
          
          // TypeScript accepte maintenant role, points et online !
          setUser({
            name: docData.name || 'Utilisateur',
            avatar: docData.profileImage || docData.photoURL || 'https://via.placeholder.com/150',
            role: docData.role,
            points: docData.points,
            online: docData.online,
            uid: docData.uid
          });
        }
        setLoading(false);
      });

      return () => unsubscribeFirestore();
    }
  });

  return () => unsubscribeAuth();
}, []);

  // --- ANIMATIONS (Toutes conservées) ---
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const heartbeat1 = useRef(new Animated.Value(1)).current;
  const heartbeat2 = useRef(new Animated.Value(1)).current;
  const heartbeat3 = useRef(new Animated.Value(1)).current;
  const waveAnimation = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const flowerRotate = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);


  useEffect(() => {
    const heartbeatSequence = (anim: Animated.Value | Animated.ValueXY, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1.3, duration: 400, easing: Easing.ease, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 1, duration: 400, easing: Easing.ease, useNativeDriver: true }),
        ])
      ).start();
    };
    heartbeatSequence(heartbeat1, 0);
    heartbeatSequence(heartbeat2, 500);
    heartbeatSequence(heartbeat3, 1000);
  }, []);

  useEffect(() => {
    if (isPlaying) {
      Animated.loop(
        Animated.timing(waveAnimation, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: false })
      ).start();
    } else {
      waveAnimation.setValue(0);
    }
  }, [isPlaying]);

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true })
    ).start();
    
    Animated.loop(
      Animated.sequence([
        Animated.timing(flowerRotate, { toValue: 1, duration: 2000, easing: Easing.ease, useNativeDriver: true }),
        Animated.timing(flowerRotate, { toValue: 0, duration: 2000, easing: Easing.ease, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, easing: Easing.ease, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, easing: Easing.ease, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // --- FONCTIONS UTILITAIRES ---
  const formatTime = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const getDate = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[time.getMonth()]} ${String(time.getDate()).padStart(2, '0')}, ${days[time.getDay()]}`;
  };

  const getGreeting = () => {
    const hour = time.getHours();
    if (hour < 12) return 'Bonjour';
    if (hour >18) return 'Bonsoir';
    return 'Bonjour';
  };

  const getWeekDays = () => {
  const current = new Date();
  const week = [];
  
  // On remonte au dimanche de la semaine actuelle
  current.setDate(current.getDate() - current.getDay());

  for (let i = 0; i < 7; i++) {
    week.push({
      dayNum: current.getDate(),
      isToday: new Date().toDateString() === current.toDateString(),
    });
    current.setDate(current.getDate() + 1);
  }
  return week;
};

const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const currentMonth = monthNames[new Date().getMonth()];

  const handlePlayPress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.9, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    setIsPlaying(!isPlaying);
  };

  const spin = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const flowerSpin = flowerRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '10deg'] });

  return (
    <ScrollView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Image source={{ uri: user.avatar }} style={styles.avatar} />
          <View>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.headerDate}>{getDate()}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Text style={styles.notificationIcon}>🔔</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* RANGEE 1: Horloge & Fleur */}
        <View style={styles.row}>
          <Animated.View style={[styles.widget, styles.clockWidget]}>
            <Text style={styles.moonEmoji}>🌙</Text>
            <Text style={styles.greeting}>{getGreeting()}~</Text>
            <Text style={styles.digitalTime}>{formatTime(time)}</Text>
            <Text style={styles.date}>{getDate()} 😊</Text>
          </Animated.View>

          <View style={[styles.widget, styles.distanceWidget]}>
            <View style={styles.progressBar}>
              <Animated.View style={[styles.progressFill, { transform: [{ scaleX: waveAnimation.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) }] }]} />
            </View>
            <Text style={styles.distanceLabel}>Objectifs du jour</Text>
            <Animated.View style={[styles.flowerContainer, { transform: [{ rotate: flowerSpin }] }]}>
              <View style={[styles.flowerPetal, styles.petal1]} />
              <View style={[styles.flowerPetal, styles.petal2]} />
              <View style={[styles.flowerPetal, styles.petal3]} />
              <View style={styles.flowerCenter}><Text style={styles.heartEmoji}>❤️</Text></View>
              <View style={styles.flowerStem} />

            </Animated.View>
            <View style={styles.daysContainer}>
              <Text style={styles.daysNumber}>12</Text>
              <Text style={styles.daysLabel}>Tâches</Text>
            </View>
          </View>
        </View>

        {/* RANGEE 2: NOUVEAU WIDGET TACHES & METEO/SABLIER */}
        <View style={styles.row}>
          
          {/* REMPLACEMENT DE L'HORLOGE ANALOGIQUE PAR LE LIEN VERS TACHES */}

          <TouchableOpacity 
            style={[styles.widget, styles.tasksWidget]} 
            activeOpacity={0.8}
            onPress={() => navigation.navigate('TachesEmployee')}    >


   <Animated.View style={{ transform: [{ scale: pulseAnim }], alignItems: 'center' }}>
                <View style={styles.taskIconCircle}>

                    <Text style={styles.taskEmoji}>📋</Text>

                    <View style={styles.taskBadge}>
                        <Text style={styles.taskBadgeText}>3</Text>
                    </View>

                </View>
            </Animated.View>
            <Text style={styles.taskTitle}>Mes Tâches</Text>
            <Text style={styles.taskStatus}>En cours...</Text>
          </TouchableOpacity>

          <View style={styles.rightColumn}>
            {/* <View style={styles.iconRow}>
              <View style={[styles.smallWidget, styles.weatherWidget]}><View style={styles.cloud} /></View>
              <View style={[styles.smallWidget, styles.clothesWidget]}><View style={styles.tshirt} /></View>
            </View> */}

         <View style={styles.iconRow}>
  {/* Bouton Nouvelle Réclamation */}

  <TouchableOpacity 
    style={[styles.smallWidget, styles.complaintWidget]} 
    activeOpacity={0.7}
onPress={() => setIsModalVisible(true)}     >


    <Text style={styles.actionEmoji}>📢</Text>
    <Text style={styles.actionLabel}>+ Nouvelle Réclamation </Text>

  </TouchableOpacity>

  {/* Bouton Passer une Commande */}
  <TouchableOpacity 
    style={[styles.smallWidget, styles.orderWidget]} 
    activeOpacity={0.7}
    onPress={() => Alert.alert("Action", "Direction la boutique...")}  > 
    <Text style={styles.actionEmoji}>📦</Text>
    <Text style={styles.actionLabel}>Commande</Text>

  </TouchableOpacity>
</View>
            <View style={[styles.widget, styles.countdownWidget]}>
              <Text style={styles.countdownTitle}>Mes réclamations</Text>
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <View style={styles.hourglassCircle}><Text style={styles.hourglassIcon}>⏳</Text></View>
              </Animated.View>
            </View>
          </View>
        </View>

        {/* RANGEE 3: CALENDRIER & CHAT (Anciennement Musique) */}
        <View style={styles.row}>
         <TouchableOpacity style={[styles.widget, styles.calendarWidget]} activeOpacity={0.9}>
  {/* Affichage dynamique du mois */}
  <Text style={styles.monthText}>{currentMonth}</Text>
  
  <View style={styles.calendarHeader}>
    {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, i) => (
      <Text key={i} style={styles.dayLabel}>{day}</Text>
    ))}
  </View>
  
  <View style={styles.calendarDays}>
    {getWeekDays().map((dateObj, i) => (
      <View 
        key={i} 
        style={[
          styles.dayCell, 
          dateObj.isToday && styles.highlightDay // S'applique seulement au jour réel 
        ]}
      >
        <Text style={[
          styles.dayNumber, 
          dateObj.isToday && styles.highlightDayText
        ]}>
          {dateObj.dayNum}
        </Text>
      </View>
    ))}
  </View>

</TouchableOpacity>

          <View style={[styles.widget, styles.musicWidget]}>
            <Text style={styles.musicTitle}>Chat Équipe</Text>
            <View style={styles.musicControls}>
              <TouchableOpacity onPress={handlePlayPress}>
                <Animated.View style={[styles.playButton, { transform: [{ scale: scaleAnim }] }]}>
                  <Text style={styles.playIcon}>{isPlaying ? '💬' : '✉️'}</Text>
                </Animated.View>  
              </TouchableOpacity>
            </View>
            <View style={styles.waveform}>
              {[...Array(15)].map((_, i) => (
                <Animated.View key={i} style={[styles.waveLine, isPlaying && { height: Math.random() * 20 + 5 }, i > 5 && i < 10 && styles.waveLineActive]} />
              ))}
            </View>
          </View>
        </View>

        {/* RANGEE 4: BATTERIE */}
        <View style={styles.bottomRow}>
          <TouchableOpacity 
            style={[styles.widget, styles.batteryWidget]} 
            onPress={() => setBattery(prev => (prev >= 100 ? 10 : prev + 10))}
          >
            <View style={styles.batteryBar}>
              <View style={[styles.batteryFill, { width: `${battery}%` }, battery < 20 && { backgroundColor: '#FF6B6B' }]} />
            </View>
            <Text style={styles.batteryText}>{battery}%</Text>
          </TouchableOpacity>
        </View>

        {/* DECORATION COUERS ANIMES */}
        <View style={styles.decorativeHearts}>
          {/* <Animated.Text style={[styles.heart, { transform: [{ scale: heartbeat1 }] }]}>💗</Animated.Text>
          <Animated.Text style={[styles.heart, { transform: [{ scale: heartbeat2 }] }]}>💗</Animated.Text> */}
        </View>
      </View>


        <AddReclamationModal
                visible={isModalVisible}
                onClose={() => setIsModalVisible(false)}
              />
    </ScrollView>
  );
};
const styles = StyleSheet.create({
  // --- STRUCTURE GÉNÉRALE ---
  container: {
    flex: 1,
    backgroundColor: '#F0EDE8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#A8D5BA',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerDate: {
    fontSize: 12,
    color: '#999',
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationIcon: {
    fontSize: 20,
  },
  content: {
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  widget: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },

  // --- WIDGET HORLOGE DIGITALE ---
  clockWidget: {
    flex: 1.2,
    alignItems: 'flex-start',
  },
  moonEmoji: {
    fontSize: 20,
    marginBottom: 8,
  },
  greeting: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  digitalTime: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#333',
  },
  date: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },

  // --- WIDGET DISTANCE / FLEUR ---
  distanceWidget: {
    flex: 1,
    alignItems: 'center',
  },
  progressBar: {
    width: '80%',
    height: 8,
    backgroundColor: '#E8F5E9',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    width: '100%',
    height: '100%',
    backgroundColor: '#A8D5BA',
  },
  distanceLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 10,
  },
  flowerContainer: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowerPetal: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFB3BA',
    borderWidth: 2,
    borderColor: '#FF8B94',
  },
  petal1: { top: -5 },
  petal2: { bottom: 0, left: -5 },
  petal3: { bottom: 0, right: -5 },
  flowerCenter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFF',
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartEmoji: { fontSize: 12 },
  flowerStem: {
    position: 'absolute',
    bottom: -15,
    width: 4,
    height: 25,
    backgroundColor: '#A8D5BA',
    borderRadius: 2,
  },
  daysContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  daysNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  daysLabel: {
    fontSize: 12,
    color: '#666',
  },

  // --- NOUVEAU WIDGET TACHES (Remplace l'Horloge Analogique) ---
  tasksWidget: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0F9F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  taskEmoji: {
    fontSize: 32,
  },
  taskBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF8B94',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  taskBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  taskStatus: {
    fontSize: 12,
    color: '#A8D5BA',
    fontWeight: '600',
    marginTop: 2,
  },

  // --- COLONNE DROITE (Météo, Countdown) ---
  rightColumn: {
    flex: 1,
    gap: 12,
  },
  iconRow: {
    flexDirection: 'row',
    gap: 12,
  },
  smallWidget: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  weatherWidget: {}, // Correction TS
  clothesWidget: {}, // Correction TS
  cloud: {
    width: 30,
    height: 18,
    backgroundColor: '#A8D5BA',
    borderRadius: 10,
  },
  tshirt: {
    width: 25,
    height: 25,
    backgroundColor: '#FFD19A',
    borderRadius: 5,
  },
  countdownWidget: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  hourglassCircle: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    borderWidth: 2,
    borderColor: '#A8D5BA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hourglassIcon: {
    fontSize: 20,
  },

  // --- CALENDRIER ---
  calendarWidget: {
    flex: 1.2,
  },
  monthText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  calendarHeader: {
    flexDirection: 'row',
    backgroundColor: '#A8D5BA',
    borderRadius: 8,
    padding: 6,
  },
  dayLabel: {
    flex: 1,
    fontSize: 9,
    color: '#FFF',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  calendarDays: {
    flexDirection: 'row',
    marginTop: 10,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 5,
  },
  dayNumber: {
    fontSize: 13,
    color: '#333',
  },
  highlightDay: {
    backgroundColor: '#FFE5CC',
    borderRadius: 6,
  },
  highlightDayText: {
    fontWeight: 'bold',
    color: '#FF8B94',
  },

  // --- CHAT / MUSIQUE ---
  musicWidget: {
    flex: 1,
    alignItems: 'center',
  },
  musicTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  musicControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  playButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#FFB3BA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    fontSize: 20,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 25,
    marginTop: 15,
  },
  waveLine: {
    width: 3,
    height: 10,
    backgroundColor: '#DDD',
    borderRadius: 2,
  },
  waveLineActive: {
    backgroundColor: '#FFB3BA',
  },

  // --- BAS DE PAGE ET BATTERIE ---
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  batteryWidget: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  batteryBar: {
    flex: 1,
    height: 12,
    backgroundColor: '#E8E8E8',
    borderRadius: 6,
    overflow: 'hidden',
  },
  batteryFill: {
    height: '100%',
    backgroundColor: '#A8D5BA',
  },
  batteryText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  decorativeHearts: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 20,
    marginBottom: 30,
  },
  heart: {
    fontSize: 24,
  },
  // Inclus pour éviter toute erreur si vous les utilisez encore
  heart1: {},
  heart2: {},
  heart3: {},
  sparkle: {
    position: 'absolute',
    right: 10,
    top: 10,
  },
  // Styles pour les nouveaux boutons d'action
  complaintWidget: {
    backgroundColor: '#FFF5F5', // Un léger fond rosé pour la réclamation
    borderWidth: 1,
    borderColor: '#FFD1D1',
  },
  orderWidget: {
    backgroundColor: '#F0F9F4', // Un léger fond vert pour la commande
    borderWidth: 1,
    borderColor: '#D1EAD9',
  },
  actionEmoji: {
    fontSize: 24, // Taille adaptée au petit carré
    marginBottom: 4,
  },
  actionLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#555',
    textAlign: 'center',
  },
  
  // Assurez-vous que smallWidget a toujours ces propriétés de base
 
});

export default App;