import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert } from "react-native";
import { auth, db } from "../../firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";
import { getDocs, collection, query, where } from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

// Définition des routes de navigation
type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  ChefMaintenance: undefined;
  AgentMaintenance: undefined;
  FemmeChambre: undefined;
  Reservations: undefined;
  Accueil: undefined;
};

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigation = useNavigation<LoginScreenNavigationProp>();

  const handleSubmit = async () => {
    setLoading(true);

    try {
      // Connexion Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
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
      switch(userRole) {
        case "admin":
          navigation.navigate("Dashboard");
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
      Alert.alert("Erreur", "Email ou mot de passe incorrect");
      console.error("Erreur de connexion:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connexion</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Button 
        title={loading ? "Connexion..." : "Se connecter"} 
        onPress={handleSubmit} 
        disabled={loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    marginBottom: 15,
    borderRadius: 6,
  },
});
