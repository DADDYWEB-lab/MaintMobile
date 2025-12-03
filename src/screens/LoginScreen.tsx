import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ImageBackground,
} from "react-native";
import { auth, db } from "../../firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";
import { getDocs, collection, query, where } from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

const { width } = Dimensions.get("window");

// Définition des routes de navigation
type RootStackParamList = {
  Login: undefined;
  Dashboard2: undefined;
  ChefMaintenance: undefined;
  AgentMaintenance: undefined;
  FemmeChambre: undefined;
  Reservations: undefined;
  Accueil: undefined;
};

type LoginScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Login"
>;

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const navigation = useNavigation<LoginScreenNavigationProp>();

  const handleSubmit = async () => {
    // Validation
    if (!email.trim() || !password.trim()) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);

    try {
      // Connexion Firebase
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Récupérer le rôle dans Firestore
      const q = query(collection(db, "staff"), where("uid", "==", user.uid));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        Alert.alert("Erreur", "Aucun rôle assigné à cet utilisateur.");
        return;
      }

      const userRole = querySnapshot.docs[0].data().role;

      // Redirection selon le rôle
      switch (userRole) {
        case "admin":
          navigation.navigate("Dashboard2");
          break;
        case "chef-maintenance":
          navigation.navigate("ChefMaintenance");
          break;
        case "maintenance":
          navigation.navigate("AgentMaintenance");
          break;
        case "menage":
          navigation.navigate("FemmeChambre");
          break;
        case "receptionniste":
          navigation.navigate("Reservations");
          break;
        default:
          navigation.navigate("Accueil");
      }
    } catch (error: any) {
      let errorMessage = "Email ou mot de passe incorrect";

      if (error.code === "auth/user-not-found") {
        errorMessage = "Aucun compte trouvé avec cet email";
      } else if (error.code === "auth/wrong-password") {
        errorMessage = "Mot de passe incorrect";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Format d'email invalide";
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Trop de tentatives. Réessayez plus tard";
      }

      Alert.alert("Erreur de connexion", errorMessage);
      console.error("Erreur de connexion:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#6366F1" />
      <ImageBackground
        source={{ uri: 'https://i.pinimg.com/736x/fd/d1/6d/fdd16d2774171ef875bbcef29f66fe8b.jpg', }}
        style={styles.backgroundImage}
        resizeMode="cover" >

        {/* Overlay sombre */}
        <View style={styles.overlay} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.container} >

          <View style={styles.backgroundTop} />
          <View style={styles.backgroundBottom} />

          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Text style={styles.iconText}>🔐</Text>
              </View>
              <Text style={styles.title}>Bienvenue</Text>
              <Text style={styles.subtitle}>
                Connectez-vous pour continuer
              </Text>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    emailFocused && styles.inputWrapperFocused,]} >

                  <Text style={styles.inputIcon}>📧</Text>

                  <TextInput
                    style={styles.input}
                    placeholder="votre@email.com"
                    placeholderTextColor="#94A3B8"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)} />


                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Mot de passe</Text>

                <View
                  style={[
                    styles.inputWrapper,
                    passwordFocused && styles.inputWrapperFocused,
                  ]} >

                  <Text style={styles.inputIcon}>🔒</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="#94A3B8"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                      />

                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon} >


                    <Text style={styles.eyeIconText}>
                      {showPassword ? "🤓​​" : "😎​"}
                    </Text>

                  </TouchableOpacity>
                </View>
              </View>

              {/* Forgot Password */}
              <TouchableOpacity style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>
                  Mot de passe oublié ?
                </Text>
              </TouchableOpacity>

              {/* Login Button */}
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.8} >
                        


                        
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Se connecter</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Pas encore de compte ?</Text>
              <TouchableOpacity>
                <Text style={styles.footerLink}>S'inscrire</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </ImageBackground>
    </>
  );
}

const styles = StyleSheet.create({

  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',

  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(99, 102, 241, 0.35)',
  },

  container: {
    flex: 1,
  },

  backgroundTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "40%",
    backgroundColor: "transparent",
  },

  backgroundBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "60%",
    backgroundColor: "transparent",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  iconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  iconText: {
    fontSize: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
  },
  formContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    borderRadius: 28,
    padding: 28,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
  },

  inputGroup: {
    marginBottom: 20,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
  },
  inputWrapperFocused: {
    borderColor: "#6366F1",
    backgroundColor: "#FFFFFF",
  },
  inputIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1E293B",
  },
  eyeIcon: {
    padding: 4,
  },
  eyeIconText: {
    fontSize: 20,
  },

  forgotPassword: {
    alignItems: "flex-end",
    marginBottom: 24,
  },

  forgotPasswordText: {
    fontSize: 14,
    color: "#6366F1",
    fontWeight: "600",
  },

  button: {
    backgroundColor: "#6366F1",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#6366F1",
    shadowOffset: {
      width: 0,
      height: 4,
    },

    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },

  footerText: {
    fontSize: 14,
    color: "#ccd4e1ff",
    marginRight: 4,
  },

  footerLink: {
    fontSize: 14,
    color: "#723525ff",
    fontWeight: "600",
  },
});