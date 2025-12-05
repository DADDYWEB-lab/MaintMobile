//@ts-nocheck
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator, Dimensions } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

const { width, height } = Dimensions.get('window');

type RootStackParamList = {
  SplashVideo: undefined;
  Login: undefined;
};

type SplashVideoNavigationProp = NativeStackNavigationProp<
  RootStackParamList,'SplashVideo'
>;

export default function SplashVideoScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [showSkipButton, setShowSkipButton] = useState(false);
  const [playing, setPlaying] = useState(true);
  const navigation = useNavigation<SplashVideoNavigationProp>();

  // ID de votre vidéo YouTube
  const YOUTUBE_VIDEO_ID = 'vC9a5w7Ve5Q';

  const VIDEO_DURATION = 18;

  useEffect(() => {
    const skipButtonTimer = setTimeout(() => {
      setShowSkipButton(true);
    }, 2000);

    const navigationTimer = setTimeout(() => {
      navigation.replace('Login');
    }, VIDEO_DURATION * 1000);

    return () => {
      clearTimeout(skipButtonTimer);
      clearTimeout(navigationTimer);
    };
  }, [navigation]);

  const handleSkip = () => {
    setPlaying(false);
    navigation.replace('Login');
  };

  const onStateChange = (state: string) => {
    if (state === 'ended') {
      navigation.replace('Login');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* YouTube Player */}
      <YoutubePlayer
        height={height}
        width={width}
        play={playing}
        videoId={YOUTUBE_VIDEO_ID}
        onChangeState={onStateChange}
        onReady={() => setIsLoading(false)}
        webViewProps={{
          injectedJavaScript: `
            var element = document.getElementsByClassName('container')[0];
            element.style.position = 'unset';
            true;
          `,
        }}
        initialPlayerParams={{
          controls: false,
          modestbranding: true,
          rel: false,
          showinfo: false,
        }}
      />

      {/* Overlay pour les contrôles */}
      <View style={styles.controlsOverlay}>
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

        {/* Loader pendant le chargement */}
        {isLoading && (
          <View style={styles.loaderOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 20 : 50,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  skipButton: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  skipButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },
});