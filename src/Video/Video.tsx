//@ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { View, Text,TouchableOpacity, StyleSheet,StatusBar, Dimensions, ActivityIndicator,} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

const { width, height } = Dimensions.get('window');

type RootStackParamList = {
  SplashVideo: undefined;
  Login: undefined;
};

type SplashVideoNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'SplashVideo'
>;

export default function SplashVideoScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [showSkipButton, setShowSkipButton] = useState(false);
  const videoRef = useRef<Video>(null);
  const navigation = useNavigation<SplashVideoNavigationProp>();

  // Durée en secondes avant de passer à la page de connexion
  const VIDEO_DURATION = 8; 

  useEffect(() => {

    const skipButtonTimer = setTimeout(() => {
      setShowSkipButton(true);
    }, 2000);

    // Timer pour passer automatiquement à la page de connexion
    const navigationTimer = setTimeout(() => {
      navigation.replace('Login');
    },
     VIDEO_DURATION * 1000
    );

    return () => {
      clearTimeout(skipButtonTimer);
      clearTimeout(navigationTimer);
      
    };
  }, [navigation]);

  const handleVideoEnd = () => {
    
    navigation.replace('Login');
  };

  const handleSkip = () => {
    // Passer la vidéo et aller directement à la connexion
    navigation.replace('Login');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Vidéo en plein écran */}
      <Video
        ref={videoRef}
        source={require('../../assets/orbeeProVD.mp4')} 
        style={styles.video}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay
        isLooping={true} // La vidéo boucle pendant la durée définie
        onLoad={() => setIsLoading(false)}
      />

      {/* Overlay avec gradient */}
      <View style={styles.overlay}>
        {/* Logo ou Titre */}
        <View style={styles.header}>
        
        </View>

        {/* Loader pendant le chargement */}
        {isLoading && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        )}


        {/* Bouton Passer */}
        {showSkipButton && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.8}
          >
            <Text style={styles.skipButtonText}>Passer</Text>
          </TouchableOpacity>
        )}


        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.progressBar}>
            <View style={styles.progressFill} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  video: {
  
  width: width * 0.9,     // 90% de la largeur
  height: height * 0.8,   // 80% de la hauteur
  alignSelf: 'center',
  marginTop: 50,
  borderRadius: 20,       // Coins arrondis

  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'space-between',
    paddingVertical: 40,
    paddingHorizontal: 14,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  logoText: {
    fontSize: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  skipButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
  },
  progressBar: {
    width: '60%',
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    width: '40%',
    backgroundColor: '#FFFFFF',
  },
});