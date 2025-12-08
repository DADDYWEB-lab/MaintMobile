//@ts-nocheck
import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Video, ResizeMode } from 'expo-av'; // <--- Import depuis expo-av
import { useNavigation } from '@react-navigation/native';
const { width, height } = Dimensions.get('window');

const SplashVideo = ({ onFinish }) => { // onFinish est la fonction pour passer à la suite
  const video = React.useRef(null);
  const navigation = useNavigation();
  return (
    <View style={styles.container}>
      <Video
        ref={video}
        style={styles.backgroundVideo}
        source={require('../../assets/orbeeProVD.mp4')} // Vérifiez votre chemin
        useNativeControls={false}
        resizeMode={ResizeMode.CONTAIN} // Pour voir toute la vidéo sans couper
        isLooping={false}
        shouldPlay={true}
        onPlaybackStatusUpdate={(status) => {
            // <--- 3. Détecter la fin
            if (status.didJustFinish) {
                // Utiliser .replace() au lieu de .navigate() empêche
                // l'utilisateur de revenir à la vidéo en faisant "Retour"
                navigation.replace('Login'); 
            }
          }}
      
      />


      
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff', // Important : mettez la couleur de fond de votre vidéo
    alignItems: 'center',
    justifyContent: 'center',
  },
  backgroundVideo: {
    width: width,
    height: height,
     backgroundColor: '#ffffff', 
  },
});

export default SplashVideo;