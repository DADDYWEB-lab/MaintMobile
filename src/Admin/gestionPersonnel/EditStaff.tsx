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
import { doc, updateDoc, onSnapshot, collection } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../../firebaseConfig';
import { Camera, User } from 'lucide-react-native';

const EditStaffScreen = ({ route, navigation }) => {
  const { staff } = route.params;

  const [formData, setFormData] = useState({
    id: staff?.id || '',
    name: staff?.name || '',
    tel: staff?.tel || '',
    role: staff?.role || '',
    specialite: staff?.specialite || '',
  });
  const [imageUri, setImageUri] = useState(staff?.profileImage || null);
  const [hasNewImage, setHasNewImage] = useState(false);
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

  // Demander permissions
  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission refusée',
          'Nous avons besoin de la permission pour accéder à vos photos'
        );
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
      setHasNewImage(true);
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

  // Soumettre les modifications
  const handleSubmit = async () => {
    // Validation
    if (!formData.name || !formData.role) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (formData.role === 'maintenance' && !formData.specialite) {
      Alert.alert(
        'Erreur',
        'Veuillez sélectionner une spécialité pour le rôle maintenance'
      );
      return;
    }

    setLoading(true);

    try {
      // 1. Upload de la nouvelle image si nécessaire
      let profileImageUrl = staff?.profileImage || null;

      if (hasNewImage && imageUri) {
        try {
          profileImageUrl = await uploadImage(imageUri, staff.uid);
        } catch (uploadError) {
          console.error('Erreur upload image:', uploadError);
          Alert.alert(
            'Avertissement',
            "L'image n'a pas pu être uploadée, mais les autres modifications seront sauvegardées"
          );
        }
      }

      // 2. Mettre à jour Firestore
      const staffRef = doc(db, 'staff', formData.id);
      const updateData = {
        name: formData.name,
        role: formData.role,
        tel: formData.tel || '',
        profileImage: profileImageUrl,
      };

      if (formData.role === 'maintenance' && formData.specialite) {
        updateData.specialite = formData.specialite;
      } else {
        updateData.specialite = null;
      }

      await updateDoc(staffRef, updateData);

      Alert.alert(
        'Succès',
        `Les informations de ${formData.name} ont été mises à jour !`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Erreur:', error);
      Alert.alert(
        'Erreur',
        error.message || 'Une erreur est survenue lors de la mise à jour'
      );
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
              <Image
                source={{ uri: imageUri }}
                style={styles.profileImage}
                onError={(e) => {
                  console.log('Image error:', e.nativeEvent.error);
                  setImageUri(null);
                }}
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <User color="#95a5a6" size={50} />
                <Camera color="#3498db" size={25} style={styles.cameraIcon} />
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.imageHint}>
            Appuyez pour {imageUri ? 'changer' : 'ajouter'} la photo
          </Text>
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

          {/* Email (lecture seule) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={staff?.email || ''}
              editable={false}
            />
            <Text style={styles.helperText}>L'email ne peut pas être modifié</Text>
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
                  onPress={() => {
                    setFormData({ ...formData, role: role.id });
                    // Réinitialiser la spécialité si on change de rôle
                    if (role.id !== 'maintenance') {
                      setFormData((prev) => ({ ...prev, specialite: '' }));
                    }
                  }}
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
                <Text style={styles.submitButtonText}>Enregistrer</Text>
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
  inputDisabled: {
    backgroundColor: '#ecf0f1',
    color: '#7f8c8d',
  },
  helperText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 5,
    fontStyle: 'italic',
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

export default EditStaffScreen;