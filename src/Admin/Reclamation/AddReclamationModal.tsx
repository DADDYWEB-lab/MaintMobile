//@ts-nocheck
// AddReclamationModal.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { 
  Camera, 
  Upload, 
  X, 
  Send, 
  CheckCircle2, 
  Info,
  MapPin,
  Wrench,
  AlertTriangle,
  FileText,
  Trash2,
  Image as ImageIcon
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as CameraModule from 'expo-camera';

const AddReclamationModal = ({ 
  visible, 
  onClose,
  onSubmit 
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit?: (formData: any) => void;
}) => {
  const [reclamationForm, setReclamationForm] = useState({
    roomNumber: '',
    service: '',
    urgency: '',
    description: '',
    photo: null as string | null,
    photoBase64: null as string | null,
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [hasMediaLibraryPermission, setHasMediaLibraryPermission] = useState<boolean | null>(null);

  // Demander les permissions au démarrage
  useEffect(() => {
    (async () => {
      if (visible) {
        const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
        setHasCameraPermission(cameraPermission.status === 'granted');
        
        const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        setHasMediaLibraryPermission(mediaLibraryPermission.status === 'granted');
      }
    })();
  }, [visible]);

  // Données pour les services
  const services = [
    { id: 'plomberie', label: 'Plomberie', icon: '💧' },
    { id: 'electricite', label: 'Électricité', icon: '⚡' },
    { id: 'climatisation', label: 'Climatisation', icon: '❄️' },
    { id: 'menager', label: 'Ménager', icon: '🧹' },
    { id: 'technique', label: 'Technique', icon: '🔧' },
    { id: 'autre', label: 'Autre', icon: '📝' }
  ];

  // Niveaux d'urgence
  const urgencyLevels = [
    { 
      id: 'low', 
      label: 'Faible', 
      description: 'Problème non urgent' 
    },
    { 
      id: 'medium', 
      label: 'Moyen', 
      description: 'Problème à traiter sous 24h' 
    },
    { 
      id: 'high', 
      label: 'Élevé', 
      description: 'Intervention rapide nécessaire' 
    },
    { 
      id: 'critical', 
      label: 'Critique', 
      description: 'Urgence - Intervention immédiate' 
    }
  ];

  // Couleurs pour les niveaux d'urgence
  const getUrgencyColor = (urgency: string) => {
    const colors: {[key: string]: string} = {
      low: '#10B981',
      medium: '#F59E0B',
      high: '#EF4444',
      critical: '#DC2626'
    };
    return colors[urgency] || '#6B7280';
  };

  // Prendre une photo avec la caméra
  const takePhoto = async () => {
    if (hasCameraPermission === false) {
      Alert.alert(
        'Permission refusée',
        'Vous devez autoriser l\'accès à la caméra pour prendre une photo.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Paramètres', onPress: () => Platform.OS === 'ios' ? 
            Linking.openURL('app-settings:') : 
            Linking.openSettings() 
          }
        ]
      );
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true, // Pour obtenir la photo en base64
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        const photoUri = result.assets[0].uri;
        const photoBase64 = result.assets[0].base64;
        
        setPhotoPreview(photoUri);
        setReclamationForm({ 
          ...reclamationForm, 
          photo: photoUri,
          photoBase64: photoBase64 || null
        });
        
        // Optionnel: Sauvegarder dans la galerie
        if (Platform.OS === 'ios' || Platform.OS === 'android') {
          try {
            await MediaLibrary.saveToLibraryAsync(photoUri);
          } catch (saveError) {
            console.log('Photo non sauvegardée dans la galerie:', saveError);
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors de la prise de photo:', error);
      Alert.alert('Erreur', 'Impossible d\'accéder à la caméra');
    }
  };

  // Sélectionner une photo depuis la galerie
  const pickImage = async () => {
    if (hasMediaLibraryPermission === false) {
      Alert.alert(
        'Permission refusée',
        'Vous devez autoriser l\'accès à la galerie pour sélectionner une photo.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Paramètres', onPress: () => Platform.OS === 'ios' ? 
            Linking.openURL('app-settings:') : 
            Linking.openSettings() 
          }
        ]
      );
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true, // Pour obtenir la photo en base64
      });

      if (!result.canceled && result.assets[0]) {
        const photoUri = result.assets[0].uri;
        const photoBase64 = result.assets[0].base64;
        
        setPhotoPreview(photoUri);
        setReclamationForm({ 
          ...reclamationForm, 
          photo: photoUri,
          photoBase64: photoBase64 || null
        });
      }
    } catch (error) {
      console.error('Erreur lors de la sélection de photo:', error);
      Alert.alert('Erreur', 'Impossible d\'accéder à la galerie');
    }
  };

  // Afficher le menu de sélection de photo
  const showPhotoOptions = () => {
    Alert.alert(
      'Ajouter une photo',
      'Comment voulez-vous ajouter une photo ?',
      [
        {
          text: 'Prendre une photo',
          onPress: takePhoto,
          style: 'default'
        },
        {
          text: 'Choisir depuis la galerie',
          onPress: pickImage,
          style: 'default'
        },
        {
          text: 'Annuler',
          style: 'cancel'
        }
      ],
      { cancelable: true }
    );
  };

  // Supprimer la photo
  const deletePhoto = () => {
    Alert.alert(
      'Supprimer la photo',
      'Êtes-vous sûr de vouloir supprimer cette photo ?',
      [
        {
          text: 'Annuler',
          style: 'cancel'
        },
        {
          text: 'Supprimer',
          onPress: () => {
            setPhotoPreview(null);
            setReclamationForm({ 
              ...reclamationForm, 
              photo: null,
              photoBase64: null
            });
          },
          style: 'destructive'
        }
      ]
    );
  };

  // Soumission du formulaire
  const submitReclamation = async () => {
    if (!reclamationForm.roomNumber || !reclamationForm.service || !reclamationForm.urgency) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Préparer les données pour l'envoi
      const formData = {
        ...reclamationForm,
        createdAt: new Date().toISOString(),
        // Si vous voulez envoyer la photo en base64
        ...(reclamationForm.photoBase64 && {
          photoBase64: reclamationForm.photoBase64
        })
      };

      // Simulation d'envoi (remplacez par votre logique d'API)
      console.log('Données à envoyer:', {
        roomNumber: formData.roomNumber,
        service: formData.service,
        urgency: formData.urgency,
        description: formData.description,
        hasPhoto: !!formData.photo,
        photoSize: formData.photoBase64 ? formData.photoBase64.length : 0
      });

      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        closeAddModal();
        
        if (onSubmit) {
          onSubmit(formData);
        }
        
        // Réinitialiser le formulaire
        setReclamationForm({
          roomNumber: '',
          service: '',
          urgency: '',
          description: '',
          photo: null,
          photoBase64: null,
        });
        setPhotoPreview(null);
      }, 2000);
      
    } catch (error) {
      console.error('Erreur lors de l\'envoi:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer la réclamation');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fermeture de la modale
  const closeAddModal = () => {
    if (isSubmitting) {
      Alert.alert(
        'Envoi en cours',
        'L\'envoi est en cours. Voulez-vous vraiment annuler ?',
        [
          { text: 'Continuer l\'envoi', style: 'cancel' },
          { 
            text: 'Annuler', 
            onPress: () => {
              setIsSubmitting(false);
              onClose();
              resetForm();
            },
            style: 'destructive'
          }
        ]
      );
    } else {
      onClose();
      resetForm();
    }
  };

  // Réinitialiser le formulaire
  const resetForm = () => {
    setReclamationForm({
      roomNumber: '',
      service: '',
      urgency: '',
      description: '',
      photo: null,
      photoBase64: null,
    });
    setPhotoPreview(null);
    setShowSuccess(false);
  };

  // Afficher un avertissement si les permissions sont refusées
  const showPermissionWarning = () => {
    Alert.alert(
      'Permissions requises',
      'Pour ajouter une photo, vous devez autoriser l\'accès à la caméra et à la galerie.',
      [
        { text: 'Plus tard', style: 'cancel' },
        { 
          text: 'Paramètres', 
          onPress: () => {
            if (Platform.OS === 'ios') {
              Linking.openURL('app-settings:');
            } else {
              Linking.openSettings();
            }
          }
        }
      ]
    );
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={closeAddModal}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          
          {showSuccess ? (
            <View style={styles.successModal}>
              <View style={styles.successContent}>
                <View style={styles.successIcon}>
                  <CheckCircle2 size={64} color="#FFFFFF" />
                </View>
                <Text style={styles.successTitle}>Réclamation Envoyée !</Text>
                <Text style={styles.successMessage}>
                  Le service de maintenance a été notifié et interviendra rapidement.
                </Text>
                {reclamationForm.photo && (
                  <View style={styles.successPhotoPreview}>
                    <Text style={styles.successPhotoText}>📸 Photo incluse</Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <>
              {/* Header amélioré */}
              <View style={styles.modalHeader}>
                <View style={styles.headerContent}>
                  <View style={styles.headerTitle}>
                    <View style={styles.headerIcon}>
                      <Wrench size={32} color="#3B82F6" />
                    </View>
                    <Text style={styles.headerTitleText}>Nouvelle Réclamation</Text>
                  </View>
                  <Text style={styles.headerSubtitle}>Signaler un problème de maintenance</Text>
                </View>
                
                <TouchableOpacity onPress={closeAddModal} style={styles.closeButton}>
                  <X size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Contenu du formulaire */}
              <ScrollView 
                style={styles.formContent}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.formContentContainer}
              >
                {/* Numéro de Chambre */}
                <View style={styles.formSection}>
                  <View style={styles.formLabel}>
                    <MapPin size={20} color="#3B82F6" />
                    <Text style={styles.formLabelText}>
                      Numéro de Chambre <Text style={styles.required}>*</Text>
                    </Text>
                  </View>
                  <TextInput
                    value={reclamationForm.roomNumber}
                    onChangeText={(text) => setReclamationForm({ 
                      ...reclamationForm, 
                      roomNumber: text 
                    })}
                    placeholder="Ex: 204, Suite 301, Espace Commun..."
                    style={styles.input}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                {/* Service de Maintenance */}
                <View style={styles.formSection}>
                  <View style={styles.formLabel}>
                    <Wrench size={20} color="#3B82F6" />
                    <Text style={styles.formLabelText}>
                      Service de Maintenance <Text style={styles.required}>*</Text>
                    </Text>
                  </View>
                  <View style={styles.servicesGrid}>
                    {services.map((service) => (
                      <TouchableOpacity
                        key={service.id}
                        onPress={() => setReclamationForm({ 
                          ...reclamationForm, 
                          service: service.id 
                        })}
                        style={[
                          styles.serviceButton,
                          reclamationForm.service === service.id && styles.serviceButtonSelected
                        ]}
                      >
                        <Text style={styles.serviceIcon}>{service.icon}</Text>
                        <Text style={[
                          styles.serviceLabel,
                          reclamationForm.service === service.id && styles.serviceLabelSelected
                        ]}>
                          {service.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Niveau d'Urgence */}
                <View style={styles.formSection}>
                  <View style={styles.formLabel}>
                    <AlertTriangle size={20} color="#3B82F6" />
                    <Text style={styles.formLabelText}>
                      Niveau d'Urgence <Text style={styles.required}>*</Text>
                    </Text>
                  </View>
                  <View style={styles.urgencyLevels}>
                    {urgencyLevels.map((level) => {
                      const isSelected = reclamationForm.urgency === level.id;
                      const urgencyColor = getUrgencyColor(level.id);
                      
                      return (
                        <TouchableOpacity
                          key={level.id}
                          onPress={() => setReclamationForm({ 
                            ...reclamationForm, 
                            urgency: level.id 
                          })}
                          style={[
                            styles.urgencyButton,
                            isSelected && { borderColor: urgencyColor }
                          ]}
                        >
                          <View style={styles.urgencyInfo}>
                            <View 
                              style={[
                                styles.urgencyDot,
                                { backgroundColor: urgencyColor }
                              ]}
                            />
                            <View style={styles.urgencyText}>
                              <Text style={[
                                styles.urgencyLabel,
                                isSelected && { color: urgencyColor }
                              ]}>
                                {level.label}
                              </Text>
                              <Text style={styles.urgencyDescription}>
                                {level.description}
                              </Text>
                            </View>
                          </View>
                          {isSelected && (
                            <CheckCircle2 
                              size={24} 
                              color={urgencyColor} 
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Description */}
                <View style={styles.formSection}>
                  <View style={styles.formLabel}>
                    <FileText size={20} color="#3B82F6" />
                    <Text style={styles.formLabelText}>Description du problème</Text>
                  </View>
                  <TextInput
                    value={reclamationForm.description}
                    onChangeText={(text) => setReclamationForm({ 
                      ...reclamationForm, 
                      description: text 
                    })}
                    placeholder="Décrivez le problème en détail... (optionnel)"
                    style={[styles.input, styles.textarea]}
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                {/* Photo */}
                <View style={styles.formSection}>
                  <View style={styles.formLabel}>
                    <Camera size={20} color="#3B82F6" />
                    <Text style={styles.formLabelText}>Photo du problème</Text>
                    <Text style={styles.optionalText}> (optionnel)</Text>
                  </View>
                  
                  {photoPreview ? (
                    <View style={styles.photoPreviewContainer}>
                      <Image 
                        source={{ uri: photoPreview }} 
                        style={styles.photoPreview} 
                        resizeMode="cover"
                      />
                      <View style={styles.photoPreviewActions}>
                        <TouchableOpacity
                          onPress={deletePhoto}
                          style={styles.deletePhotoButton}
                        >
                          <Trash2 size={20} color="#FFFFFF" />
                          <Text style={styles.deletePhotoText}>Supprimer</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={showPhotoOptions}
                          style={styles.changePhotoButton}
                        >
                          <Camera size={20} color="#3B82F6" />
                          <Text style={styles.changePhotoText}>Changer</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      onPress={showPhotoOptions}
                      style={styles.photoUploadZone}
                    >
                      <View style={styles.photoUploadContent}>
                        <View style={styles.photoIconsContainer}>
                          <View style={styles.cameraIconContainer}>
                            <Camera size={48} color="#3B82F6" />
                          </View>
                          <View style={styles.galleryIconContainer}>
                            <ImageIcon size={36} color="#10B981" />
                          </View>
                        </View>
                        <Text style={styles.photoUploadTitle}>Ajouter une photo</Text>
                        <Text style={styles.photoUploadDescription}>
                          Prenez une photo ou choisissez depuis votre galerie
                        </Text>
                        <View style={styles.photoOptions}>
                          <TouchableOpacity 
                            onPress={takePhoto}
                            style={styles.photoOptionButton}
                          >
                            <Camera size={20} color="#3B82F6" />
                            <Text style={styles.photoOptionText}>Prendre une photo</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            onPress={pickImage}
                            style={styles.photoOptionButton}
                          >
                            <ImageIcon size={20} color="#10B981" />
                            <Text style={styles.photoOptionText}>Choisir une photo</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableOpacity>
                  )}
                  
                  {/* Avertissement permissions */}
                  {(hasCameraPermission === false || hasMediaLibraryPermission === false) && (
                    <View style={styles.permissionWarning}>
                      <Text style={styles.permissionWarningText}>
                        ⚠️ Les permissions caméra/galerie sont requises pour ajouter des photos
                      </Text>
                    </View>
                  )}
                </View>

                {/* Info Box améliorée */}
                <View style={styles.infoBox}>
                  <View style={styles.infoContent}>
                    <View style={styles.infoIcon}>
                      <Info size={20} color="#FFFFFF" />
                    </View>
                    <View style={styles.infoText}>
                      <Text style={styles.infoTitle}>💡 Conseil important</Text>
                      <Text style={styles.infoDescription}>
                        Une photo claire aide nos techniciens à diagnostiquer et résoudre le problème plus rapidement.
                      </Text>
                      {reclamationForm.urgency === 'critical' && (
                        <Text style={styles.urgentTip}>
                          ⚠️ Pour les urgences critiques, une photo est fortement recommandée.
                        </Text>
                      )}
                    </View>
                  </View>
                </View>

                {/* Boutons d'action */}
                <View style={styles.formActions}>
                  <TouchableOpacity
                    onPress={closeAddModal}
                    style={styles.cancelButton}
                    disabled={isSubmitting}
                  >
                    <X size={20} color="#6B7280" />
                    <Text style={styles.cancelButtonText}>Annuler</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={submitReclamation}
                    disabled={isSubmitting}
                    style={[
                      styles.submitButton,
                      isSubmitting && styles.submitButtonDisabled,
                      (!reclamationForm.roomNumber || !reclamationForm.service || !reclamationForm.urgency) && 
                        styles.submitButtonIncomplete
                    ]}
                  >
                    {isSubmitting ? (
                      <>
                        <ActivityIndicator color="#FFFFFF" size="small" />
                        <Text style={styles.submitButtonText}>Envoi en cours...</Text>
                      </>
                    ) : (
                      <>
                        <Send size={20} color="#FFFFFF" />
                        <Text style={styles.submitButtonText}>
                          {reclamationForm.urgency === 'critical' ? '🚨 Envoyer Urgence' : 'Envoyer'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    minHeight: '60%',
  },
  
  // Header
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerIcon: {
    marginRight: 12,
  },
  headerTitleText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  closeButton: {
    padding: 4,
  },
  
  // Form Content
  formContent: {
    flex: 1,
  },
  formContentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 10,
  },
  
  // Form Sections
  formSection: {
    marginBottom: 24,
  },
  formLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  formLabelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  optionalText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  required: {
    color: '#EF4444',
  },
  
  // Input
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#374151',
  },
  textarea: {
    minHeight: 100,
    paddingTop: 14,
  },
  
  // Services Grid
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  serviceButton: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  serviceButtonSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#3B82F6',
  },
  serviceIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  serviceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  serviceLabelSelected: {
    color: '#3B82F6',
  },
  
  // Urgency Levels
  urgencyLevels: {
    gap: 12,
  },
  urgencyButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  urgencyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  urgencyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  urgencyText: {
    flex: 1,
  },
  urgencyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  urgencyDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  
  // Photo Upload Zone
  photoUploadZone: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 16,
    overflow: 'hidden',
  },
  photoUploadContent: {
    padding: 32,
    alignItems: 'center',
  },
  photoIconsContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  cameraIconContainer: {
    position: 'absolute',
    top: 0,
    left: 10,
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  galleryIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 10,
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  photoUploadTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  photoUploadDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  photoOptions: {
    flexDirection: 'row',
    gap: 16,
  },
  photoOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  photoOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  
  // Photo Preview
  photoPreviewContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  photoPreview: {
    width: '100%',
    height: 200,
  },
  photoPreviewActions: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 12,
    gap: 12,
  },
  deletePhotoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  deletePhotoText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  changePhotoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  changePhotoText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Permission Warning
  permissionWarning: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  permissionWarningText: {
    fontSize: 12,
    color: '#92400E',
    textAlign: 'center',
  },
  
  // Info Box
  infoBox: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIcon: {
    backgroundColor: '#3B82F6',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  urgentTip: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 8,
    fontWeight: '600',
  },
  
  // Form Actions
  formActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonIncomplete: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  
  // Success Modal
  successModal: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
  },
  successContent: {
    alignItems: 'center',
  },
  successIcon: {
    backgroundColor: '#10B981',
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 12,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  successPhotoPreview: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
  },
  successPhotoText: {
    color: '#065F46',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AddReclamationModal;