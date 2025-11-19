// @ts-nocheck

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../../../firebaseConfig';
import { Camera, User } from 'lucide-react-native';

const AddStaffScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    tel: '',
    role: '',
    specialite: '',
  });
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rolesList, setRolesList] = useState([]);

  // Récupérer les rôles
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'roles'), (snapshot) => {
      const roles = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRolesList(roles);
    });
    return () => unsubscribe();
  }, []);

  // Demander permissions caméra
  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Nous avons besoin de la permission pour accéder à vos photos');
      }
    })();
  }, []);

  // Sélectionner une image
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  // Upload image vers Firebase Storage
  const uploadImage = async (uri, userId) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      const timestamp = Date.now();
      const filename = `${userId}_${timestamp}.jpg`;
      const storageRef = ref(storage, `profileImages/${filename}`);

      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      return downloadURL;
    } catch (error) {
      console.error('Erreur upload:', error);
      throw error;
    }
  };

  // Soumettre le formulaire
  const handleSubmit = async () => {
    // Validation
    if (!formData.name || !formData.email || !formData.password || !formData.role) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }



    if (formData.password.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
      return;
    }



    if (formData.role === 'maintenance' && !formData.specialite) {
      Alert.alert('Erreur', 'Veuillez sélectionner une spécialité pour le rôle maintenance');
      return;
    }



    setLoading(true);



    try {
      // 1. Créer l'utilisateur dans Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password


      );




 const user = userCredential.user;

      // 2. Upload de l'image si présente
      let profileImageUrl = null;
      if (imageUri) {
        try {
          profileImageUrl = await uploadImage(imageUri, user.uid);
        } catch (uploadError) {
          console.error('Erreur upload image:', uploadError);
        }
      }

      // 3. Enregistrer dans Firestore
      const staffData = {
        uid: user.uid,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        tel: formData.tel || '',
        profileImage: profileImageUrl,
        createdAt: new Date().toISOString(),
      };

      if (formData.role === 'maintenance' && formData.specialite) {
        staffData.specialite = formData.specialite;
      }

      await addDoc(collection(db, 'staff'), staffData);

      Alert.alert(
        'Succès',
        `Le compte de ${formData.name} a été créé avec succès !`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Erreur:', error);

      if (error.code === 'auth/email-already-in-use') {
        Alert.alert('Erreur', 'Cette adresse email est déjà utilisée');
      } else if (error.code === 'auth/weak-password') {
        Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
      } else if (error.code === 'auth/invalid-email') {
        Alert.alert('Erreur', 'Adresse email invalide');
      } else {
        Alert.alert('Erreur', error.message || 'Une erreur est survenue');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Image de profil */}
        <View style={styles.imageSection}>
          <TouchableOpacity style={styles.imageContainer} onPress={pickImage}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.profileImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <User color="#95a5a6" size={50} />
                <Camera
                  color="#3498db"
                  size={25}
                  style={styles.cameraIcon}
                />
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.imageHint}>Appuyez pour ajouter une photo</Text>
        </View>

        {/* Formulaire */}
        <View style={styles.form}>
          {/* Nom */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom complet *</Text>
            <TextInput
              style={styles.input}
              placeholder="Jean Dupont"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              editable={!loading}
            />
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              placeholder="email@exemple.com"
              value={formData.email}
              onChangeText={(text) =>
                setFormData({ ...formData, email: text })
              }
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          {/* Mot de passe */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mot de passe *</Text>
            <TextInput
              style={styles.input}
              placeholder="Min. 6 caractères"
              value={formData.password}
              onChangeText={(text) =>
                setFormData({ ...formData, password: text })
              }
              secureTextEntry
              editable={!loading}
            />
          </View>

          {/* Téléphone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Téléphone</Text>
            <TextInput
              style={styles.input}
              placeholder="+216 12 345 678"
              value={formData.tel}
              onChangeText={(text) => setFormData({ ...formData, tel: text })}
              keyboardType="phone-pad"
              editable={!loading}
            />
          </View>

          {/* Rôle */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Rôle *</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.rolesList}
            >
              {rolesList.map((role) => (
                <TouchableOpacity
                  key={role.id}
                  style={[
                    styles.roleChip,
                    formData.role === role.id && styles.roleChipActive,
                  ]}
                  onPress={() =>
                    setFormData({ ...formData, role: role.id })
                  }          




                  
                  disabled={loading}
                >
                  <Text
                    style={[
                      styles.roleText,
                      formData.role === role.id && styles.roleTextActive,
                    ]}
                  >
                    {role.nom}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Spécialité (si maintenance) */}
          {formData.role === 'maintenance' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Spécialité *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.rolesList}
              >
                {[
                  'Plomberie',
                  'Électricité',
                  'Climatisation',
                  'Chauffage',
                  'Menuiserie',
                  'Peinture',
                  'Généraliste',
                ].map((spec) => (
                  <TouchableOpacity
                    key={spec}
                    style={[
                      styles.roleChip,
                      formData.specialite === spec && styles.roleChipActive,
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, specialite: spec })
                    }
                    disabled={loading}
                  >
                    <Text
                      style={[
                        styles.roleText,
                        formData.specialite === spec && styles.roleTextActive,
                      ]}
                    >
                      {spec}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Boutons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => navigation.goBack()}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.submitButton,
                loading && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Créer le compte</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  imageContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: 'hidden',
    marginBottom: 12,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ecf0f1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#bdc3c7',
    borderStyle: 'dashed',
    position: 'relative',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 5,
  },
  imageHint: {
    fontSize: 13,
    color: '#7f8c8d',
    fontStyle: 'italic',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#2c3e50',
  },
  rolesList: {
    maxHeight: 50,
    marginTop: 8,
  },
  roleChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    marginRight: 10,
  },
  roleChipActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  roleTextActive: {
    color: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#ecf0f1',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  submitButton: {
    backgroundColor: '#667eea',
    elevation: 4,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default AddStaffScreen;