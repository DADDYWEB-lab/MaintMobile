// Messenger.tsx - Style Meta Messenger
//@ts-nocheck
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Modal,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  Alert,
} from 'react-native';
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  serverTimestamp,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  where,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth } from '../../../firebaseConfig';
import * as ImagePicker from 'react-native-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

// Types
interface User {
  id: string;
  uid: string;
  name: string;
  photoURL?: string;
  profileImage?: string;
  online: boolean;
  role?: string;
}

interface FileData {                                                                                            
  name: string;
  url: string;
  type: 'image' | 'pdf' | 'other';
  size?: number;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: Date;
  reactions: { [key: string]: string[] };
  readBy: string[];
  file?: FileData;
}

interface Conversation {
  id: string;
  participants: string[];
  lastMessage: string;
  lastMessageTime: Date;
  lastSenderId: string;
  readBy: string[];
  createdAt?: Date;
}

const Messenger = ({ navigation }: any) => {
  // États
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showDeleteMenu, setShowDeleteMenu] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  
  const messagesScrollRef = useRef<FlatList>(null);
  const currentUser = auth.currentUser;
  const storage = getStorage();

  // Optimisation des listeners avec useCallback
  const currentUserUid = currentUser?.uid;

  // Récupération des conversations
  useEffect(() => {
    if (!currentUserUid) return;
    setLoading(true);

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', currentUserUid),
      orderBy('lastMessageTime', 'desc')
    );

    const unsubConversations = onSnapshot(
      q,
      (snapshot) => {
        const convsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          lastMessageTime: doc.data().lastMessageTime?.toDate() || new Date(),
        })) as Conversation[];

        setConversations(convsData);
        setLoading(false);

        if (convsData.length > 0 && !selectedConversation) {
          setSelectedConversation(convsData[0]);
        }
      },
      (error) => {
        console.error('Erreur conversations:', error);
        setLoading(false);
      }
    );

    return unsubConversations;
  }, [currentUserUid]);

  // Récupération des messages
  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'conversations', selectedConversation.id, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubMessages = onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date(),
      })) as Message[];
      
      setMessages(messagesData);
    });

    return unsubMessages;
  }, [selectedConversation?.id]);

  // Scroll automatique vers le dernier message
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        messagesScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Récupération des utilisateurs
  useEffect(() => {
    const unsubUsers = onSnapshot(
      collection(db, 'staff'),
      (snapshot) => {
        const usersData = snapshot.docs
          .map(doc => ({
            id: doc.id,
            uid: doc.data().uid || doc.id,
            name: doc.data().name || 'Inconnu',
            photoURL: doc.data().photoURL || doc.data().profileImage,
            online: doc.data().online || false,
            role: doc.data().role || 'Staff',
          } as User))
          .filter(user => user.uid !== currentUserUid);
        setUsers(usersData);
      }
    );

    return unsubUsers;
  }, [currentUserUid]);

  // Fonction pour uploader un fichier
  const uploadFile = async (fileUri: string, fileName: string, fileType: string): Promise<FileData | null> => {
    try {
      setUploadingFile(true);
      
      // Créer une référence unique pour le fichier
      const fileExtension = fileName.split('.').pop();
      const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
      const storageRef = ref(storage, `conversations/${selectedConversation?.id}/${uniqueFileName}`);
      
      // Convertir le fichier en blob
      const response = await fetch(fileUri);
      const blob = await response.blob();
      
      // Uploader le fichier
      const snapshot = await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      // Déterminer le type de fichier
      let fileDataType: 'image' | 'pdf' | 'other' = 'other';
      if (fileType.startsWith('image/')) {
        fileDataType = 'image';
      } else if (fileName.toLowerCase().endsWith('.pdf')) {
        fileDataType = 'pdf';
      }
      
      return {
        name: fileName,
        url: downloadURL,
        type: fileDataType,
        size: blob.size,
      };
    } catch (error) {
      console.error('Erreur upload fichier:', error);
      Alert.alert('Erreur', 'Impossible d\'uploader le fichier');
      return null;
    } finally {
      setUploadingFile(false);
    }
  };

  // Sélectionner une image depuis la galerie
  const pickImage = async () => {
    try {
      setShowAttachmentMenu(false);
      
      const result = await ImagePicker.launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1024,
        maxHeight: 1024,
      });
      
      if (result.assets && result.assets[0]) {
        const file = result.assets[0];
        await handleSendMessageWithFile(file.uri!, file.fileName || `image_${Date.now()}.jpg`, file.type || 'image/jpeg');
      }
    } catch (error) {
      console.error('Erreur sélection image:', error);
    }
  };

  // Prendre une photo
  const takePhoto = async () => {
    try {
      setShowAttachmentMenu(false);
      
      const result = await ImagePicker.launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1024,
        maxHeight: 1024,
      });
      
      if (result.assets && result.assets[0]) {
        const file = result.assets[0];
        await handleSendMessageWithFile(file.uri!, `photo_${Date.now()}.jpg`, file.type || 'image/jpeg');
      }
    } catch (error) {
      console.error('Erreur prise photo:', error);
    }
  };

  // Sélectionner un document (PDF ou autre)
  const pickDocument = async () => {
    try {
      setShowAttachmentMenu(false);
      
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*', // Tous les types de fichiers
        copyToCacheDirectory: true,
      });
      
      if (result.assets && result.assets[0]) {
        const file = result.assets[0];
        await handleSendMessageWithFile(file.uri, file.name || `document_${Date.now()}`, file.mimeType || 'application/octet-stream');
      }
    } catch (error) {
      console.error('Erreur sélection document:', error);
    }
  };

  // Envoyer un message avec fichier
  const handleSendMessageWithFile = async (fileUri: string, fileName: string, fileType: string) => {
    if (!selectedConversation || !currentUserUid) return;

    setSendingMessage(true);
    try {
      // Uploader le fichier
      const fileData = await uploadFile(fileUri, fileName, fileType);
      
      if (!fileData) {
        throw new Error('Échec de l\'upload du fichier');
      }

      const messageData = {
        senderId: currentUserUid,
        senderName: currentUser?.displayName || 'Utilisateur',
        senderAvatar: currentUser?.photoURL || '',
        text: '', // Texte vide pour les messages avec fichier
        timestamp: serverTimestamp(),
        reactions: {},
        readBy: [currentUserUid],
        file: fileData,
      };

      // Ajouter le message à Firestore
      await addDoc(
        collection(db, 'conversations', selectedConversation.id, 'messages'),
        messageData
      );

      // Mettre à jour la conversation
      const lastMessageText = fileData.type === 'image' ? '📷 Image' : '📄 Document';
      await updateDoc(
        doc(db, 'conversations', selectedConversation.id),
        {
          lastMessage: lastMessageText,
          lastMessageTime: serverTimestamp(),
          lastSenderId: currentUserUid,
          readBy: [currentUserUid],
        }
      );

    } catch (error) {
      console.error('Erreur envoi message avec fichier:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer le fichier');
    } finally {
      setSendingMessage(false);
    }
  };

  // Télécharger et ouvrir un fichier
  const handleOpenFile = async (file: FileData) => {
    try {
      if (file.type === 'image') {
        // Pour les images, on peut les afficher dans un modal ou une vue agrandie
        Alert.alert('Image', `Afficher l'image: ${file.name}`);
        // Ici vous pouvez implémenter une vue modale pour l'image
      } else {
        // Pour les autres fichiers, utiliser expo-sharing
        const fileUri = `${FileSystem.cacheDirectory}${file.name}`;
        
        // Télécharger le fichier
        const { uri } = await FileSystem.downloadAsync(file.url, fileUri);
        
        // Ouvrir avec l'appareil partage
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: file.type === 'pdf' ? 'application/pdf' : '*/*',
            dialogTitle: `Ouvrir ${file.name}`,
          });
        } else {
          Alert.alert('Info', 'La fonction de partage n\'est pas disponible sur cet appareil');
        }
      }
    } catch (error) {
      console.error('Erreur ouverture fichier:', error);
      Alert.alert('Erreur', 'Impossible d\'ouvrir le fichier');
    }
  };

  // Handlers mémoïsés
  const handleSendMessage = useCallback(async (likeMessage: string | null = null) => {
    const messageToSend = likeMessage || newMessage.trim();
    if ((!messageToSend && !uploadingFile) || !selectedConversation || !currentUserUid) return;

    setSendingMessage(true);
    try {
      const messageData = {
        senderId: currentUserUid,
        senderName: currentUser?.displayName || 'Utilisateur',
        senderAvatar: currentUser?.photoURL || '',
        text: messageToSend,
        timestamp: serverTimestamp(),
        reactions: {},
        readBy: [currentUserUid],
      };

      await addDoc(
        collection(db, 'conversations', selectedConversation.id, 'messages'),
        messageData
      );

      await updateDoc(
        doc(db, 'conversations', selectedConversation.id),
        {
          lastMessage: messageToSend,
          lastMessageTime: serverTimestamp(),
          lastSenderId: currentUserUid,
          readBy: [currentUserUid],
        }
      );

      setNewMessage('');
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
    } finally {
      setSendingMessage(false);
    }
  }, [selectedConversation, newMessage, currentUserUid, uploadingFile]);

  const handleReaction = useCallback(async (messageId: string, reaction: string) => {
    if (!selectedConversation || !currentUserUid) return;
    
    try {
      const messageRef = doc(
        db, 'conversations', selectedConversation.id, 'messages', messageId
      );

      const message = messages.find(m => m.id === messageId);
      if (!message) return;

      const reactions = { ...message.reactions };
      
      if (reactions[reaction]?.includes(currentUserUid)) {
        reactions[reaction] = reactions[reaction].filter(uid => uid !== currentUserUid);
        if (reactions[reaction].length === 0) {
          delete reactions[reaction];
        }
      } else {
        if (!reactions[reaction]) {
          reactions[reaction] = [];
        }
        reactions[reaction].push(currentUserUid);
      }

      await updateDoc(messageRef, { reactions });
      setShowDeleteMenu(null);
    } catch (error) {
      console.error('Erreur réaction:', error);
    }
  }, [selectedConversation, messages, currentUserUid]);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    if (!selectedConversation) return;
    
    try {
      await deleteDoc(
        doc(db, 'conversations', selectedConversation.id, 'messages', messageId)
      );
      setShowDeleteMenu(null);
    } catch (error) {
      console.error('Erreur suppression:', error);
    }
  }, [selectedConversation]);

  const handleCreateConversation = useCallback(async (targetUser: User) => {
    const targetUid = targetUser.uid || targetUser.id;
    if (!currentUserUid || targetUid === currentUserUid) return;

    try {
      const existingConv = conversations.find(
        conv => conv.participants?.includes(targetUid) && conv.participants?.includes(currentUserUid)
      );

      if (existingConv) {
        await handleSelectConversation(existingConv);
      } else {
        const participantsUids = [currentUserUid, targetUid].sort();
        
        const convRef = await addDoc(collection(db, 'conversations'), {
          participants: participantsUids,
          createdAt: serverTimestamp(),
          lastMessage: `Conversation démarrée avec ${targetUser.name}.`,
          lastMessageTime: serverTimestamp(),
          lastSenderId: currentUserUid,
          readBy: [currentUserUid],
        });

        const newConv: Conversation = {
          id: convRef.id,
          participants: participantsUids,
          lastMessage: `Conversation démarrée avec ${targetUser.name}.`,
          lastMessageTime: new Date(),
          lastSenderId: currentUserUid,
          readBy: [currentUserUid],
        };

        setConversations(prev => [newConv, ...prev]);
        setSelectedConversation(newConv);
      }

      setShowNewConversation(false);
      setSearchTerm('');
    } catch (error) {
      console.error('Erreur création conversation:', error);
    }
  }, [conversations, currentUserUid]);

  const handleSelectConversation = useCallback(async (conv: Conversation) => {
    setSelectedConversation(conv);
    if (currentUserUid && !conv.readBy?.includes(currentUserUid)) {
      try {
        await updateDoc(doc(db, 'conversations', conv.id), {
          readBy: [...(conv.readBy || []), currentUserUid],
        });
      } catch (error) {
        console.error("Erreur de marquage comme lu:", error);
      }
    }
  }, [currentUserUid]);

  // Données mémoïsées pour les listes
  const { filteredConversations, filteredUsers, listData } = useMemo(() => {
    const filteredConvs = conversations.filter(conv => {
      const participantUid = conv.participants?.find(p => p !== currentUserUid);
      const user = users.find(u => u.uid === participantUid);

      if (!searchTerm.trim()) return true;

      return (
        user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.lastMessage?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
    
    const filteredUsrs = users.filter(user => 
      user.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const data = searchTerm.trim() ? filteredUsrs : filteredConvs;

    return {
      filteredConversations: filteredConvs,
      filteredUsers: filteredUsrs,
      listData: data
    };
  }, [conversations, users, searchTerm, currentUserUid]);

  // Fonction pour générer des clés uniques
  const getUniqueKey = useCallback((item: Conversation | User) => {
    if ('participants' in item) {
      return `conv_${item.id}`;
    } else {
      return `user_${item.uid || item.id}`;
    }
  }, []);

  // Composants internes
  const ConversationItem = useCallback(({ conv }: { conv: Conversation }) => {
    const participant = conv.participants?.find(p => p !== currentUserUid);
    const user = users.find(u => u.uid === participant || u.id === participant);
    const isSelected = selectedConversation?.id === conv.id;
    const isUnread = currentUserUid ? !conv.readBy?.includes(currentUserUid) : false;

    if (!user) return null;

    return (
      <TouchableOpacity
        style={[
          styles.conversationItem,
          isSelected && styles.conversationItemActive,
        ]}
        onPress={() => handleSelectConversation(conv)}
      >
        <View style={styles.conversationItemContent}>
          <View style={styles.avatarContainer}>
            <Image
              source={{
                uri: user.photoURL || user.profileImage || `https://i.pravatar.cc/150?img=${participant}`,
              }}
              style={styles.avatar}
            />
            {user.online && <View style={styles.onlineIndicator} />}
          </View>

          <View style={styles.conversationDetails}>
            <View style={styles.nameRow}>
              <Text
                style={[
                  styles.conversationName,
                  isUnread && styles.conversationNameUnread,
                ]}
              >
                {user.name}
              </Text>
              <Text style={styles.timestamp}>
                {conv.lastMessageTime.toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>

            <Text
              style={[
                styles.lastMessage,
                isUnread && styles.lastMessageUnread,
              ]}
              numberOfLines={1}
            >
              {conv.lastSenderId === currentUserUid ? 'Vous: ' : ''}
              {conv.lastMessage}
            </Text>
          </View>

          {isUnread && <View style={styles.unreadDot} />}
        </View>
      </TouchableOpacity>
    );
  }, [users, selectedConversation, currentUserUid, handleSelectConversation]);

  const QuickUserCard = useCallback(({ user }: { user: User }) => {
    const isExisting = conversations.some(
      conv => conv.participants?.includes(user.uid || user.id) && conv.participants?.includes(currentUserUid || '')
    );
    
    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => handleCreateConversation(user)}
      >
        <View style={styles.conversationItemContent}>
          <View style={styles.avatarContainer}>
            <Image
              source={{
                uri: user.photoURL || user.profileImage || `https://i.pravatar.cc/150?img=${user.uid}`,
              }}
              style={styles.avatar}
            />
            {user.online && <View style={styles.onlineIndicator} />}
          </View>

          <View style={styles.conversationDetails}>
            <View style={styles.nameRow}>
              <Text style={styles.conversationName}>{user.name}</Text>
              <Text style={styles.timestamp}>
                {isExisting ? '💬 Existe' : '🆕 Nouveau'}
              </Text>
            </View>

            <Text style={styles.lastMessage} numberOfLines={1}>
              👤 {user.online ? 'En ligne' : 'Hors ligne'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [conversations, currentUserUid, handleCreateConversation]);

  const FileMessage = ({ file, isOwn }: { file: FileData; isOwn: boolean }) => {
    const getFileIcon = () => {
      switch (file.type) {
        case 'image':
          return '🖼️';
        case 'pdf':
          return '📄';
        default:
          return '📎';
      }
    };

    const formatFileSize = (bytes: number | undefined) => {
      if (!bytes) return '';
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / 1048576).toFixed(1)} MB`;
    };

    return (
      <TouchableOpacity
        style={[
          styles.fileContainer,
          isOwn ? styles.fileContainerOwn : styles.fileContainerOther,
        ]}
        onPress={() => handleOpenFile(file)}
      >
        <View style={styles.fileIconContainer}>
          <Text style={styles.fileIcon}>{getFileIcon()}</Text>
        </View>
        <View style={styles.fileInfo}>
          <Text style={styles.fileName} numberOfLines={1}>
            {file.name}
          </Text>
          <Text style={styles.fileSize}>
            {formatFileSize(file.size)}
          </Text>
        </View>
        <Text style={styles.downloadIcon}>⬇️</Text>
      </TouchableOpacity>
    );
  };

  const MessageBubble = useCallback(({ message }: { message: Message }) => {
    const isOwn = message.senderId === currentUserUid;
    const reactions = message.reactions || {};
    const reactionKeys = Object.keys(reactions);
    
    const menuPosition = isOwn ? { right: 0 } : { left: 0 };
    
    return (
      <View
        style={[
          styles.messageContainer,
          isOwn ? styles.messageContainerOwn : styles.messageContainerOther,
        ]}
      >
        {!isOwn && (
          <Image
            source={{
              uri: message.senderAvatar || `https://i.pravatar.cc/150?img=${message.senderId}`,
            }}
            style={styles.messageAvatar}
          />
        )}

        <View
          style={[
            styles.messageBubble,
            isOwn ? styles.bubbleOwn : styles.bubbleOther,
          ]}
        >
          {/* Afficher le fichier s'il y en a un */}
          {message.file && (
            <FileMessage file={message.file} isOwn={isOwn} />
          )}

          {/* Afficher le texte s'il y en a */}
          {message.text ? (
            <TouchableOpacity
              onLongPress={() => setShowDeleteMenu(message.id)}
              delayLongPress={300}
              activeOpacity={1}
            >
              <Text style={[
                styles.messageText,
                isOwn ? styles.messageTextOwn : styles.messageTextOther,
              ]}>
                {message.text}
              </Text>
            </TouchableOpacity>
          ) : null}

          {/* Réactions */}
          {reactionKeys.length > 0 && (
            <View style={styles.reactionsContainer}>
              {reactionKeys.map(reaction => (
                <TouchableOpacity
                  key={reaction}
                  style={styles.reactionBadge}
                  onPress={() => handleReaction(message.id, reaction)}
                >
                  <Text style={styles.reactionEmoji}>{reaction}</Text>
                  {reactions[reaction].length > 1 && (
                    <Text style={styles.reactionCount}>
                      {reactions[reaction].length}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Menu actions long-press */}
        {showDeleteMenu === message.id && (
          <View style={[styles.messageMenuContainer, menuPosition]}>
            {['❤️', '😂', '😲', '😢', '😡'].map(emoji => (
                <TouchableOpacity
                    key={emoji}
                    style={styles.menuOption}
                    onPress={() => handleReaction(message.id, emoji)}
                >
                    <Text style={styles.menuOptionText}>{emoji}</Text>
                </TouchableOpacity>
            ))}

            {isOwn && (
              <TouchableOpacity
                style={[styles.menuOption, styles.menuOptionDelete]}
                onPress={() => handleDeleteMessage(message.id)}
              >
                <Text style={styles.menuOptionDeleteText}>Supprimer</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  }, [currentUserUid, showDeleteMenu, handleReaction, handleDeleteMessage]);

  const renderItem = useCallback(({ item }: { item: Conversation | User }) => {
    if ('participants' in item) {
      return <ConversationItem conv={item} />;
    } else {
      return <QuickUserCard user={item} />;
    }
  }, [ConversationItem, QuickUserCard]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContainer]}>
        <ActivityIndicator size="large" color="#0084FF" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.mainContainer}>
        {/* Liste des conversations */}
        <View style={[
          styles.conversationsPanel, 
          isMobile && selectedConversation && styles.hiddenOnMobile
        ]}>
          
          <View style={styles.conversationsHeader}>
            <View style={styles.headerTop}>
              <Text style={styles.headerTitle}>💬 Messages</Text>
              <View style={styles.headerActions}>
                <TouchableOpacity 
                  style={styles.headerActionBtn} 
                  onPress={() => setShowNewConversation(true)}
                >
                  <Text style={styles.headerActionIcon}>➕</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerActionBtn}>
                  <Text style={styles.headerActionIcon}>⚙️</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.searchContainer}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Chercher sur Messenger"
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholderTextColor="#B0B3B9"
              />
            </View>
          </View>

          <FlatList
            data={listData}
            renderItem={renderItem}
            keyExtractor={getUniqueKey}
            scrollEnabled={true}
            ListEmptyComponent={
              <View style={styles.emptyList}>
                <Text style={styles.emptyListText}>
                  {searchTerm.trim() ? 'Aucun résultat' : 'Aucune conversation'}
                </Text>
                <Text style={styles.emptyListSubtext}>
                  {searchTerm.trim() ? 'Essayez un autre nom' : 'Utilisez le + pour démarrer'}
                </Text>
              </View>
            }
          />
        </View>

        {/* Fenêtre de chat */}
        {selectedConversation ? (
          <View style={[
            styles.chatPanel, 
            isMobile && !selectedConversation && styles.hiddenOnMobile
          ]}>
            
            <View style={styles.chatHeader}>
              <View style={styles.chatHeaderLeft}>
                {isMobile && (
                    <TouchableOpacity 
                      style={styles.backButton}
                      onPress={() => setSelectedConversation(null)}
                    >
                        <Text style={styles.backButtonText}>{'<'}</Text>
                    </TouchableOpacity>
                )}
                {(() => {
                  const participant = selectedConversation.participants?.find(
                    p => p !== currentUserUid
                  );
                  const user = users.find(u => u.uid === participant || u.id === participant);

                  return (
                    <>
                      <Image
                        source={{
                          uri: user?.photoURL || user?.profileImage ||
                            `https://i.pravatar.cc/150?img=${participant}`,
                        }}
                        style={styles.chatHeaderAvatar}
                      />
                      <View>
                        <Text style={styles.chatHeaderName}>{user?.name}</Text>
                        <Text style={styles.chatHeaderStatus}>
                          {user?.online ? '🟢 Actif' : '⚫ Inactif'}
                        </Text>
                      </View>
                    </>
                  );
                })()}
              </View>

              <View style={styles.chatHeaderActions}>
                <TouchableOpacity style={styles.chatActionBtn}>
                  <Text style={styles.chatActionIcon}>📞</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.chatActionBtn}>
                  <Text style={styles.chatActionIcon}>📹</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.chatActionBtn}>
                  <Text style={styles.chatActionIcon}>ℹ️</Text>
                </TouchableOpacity>
              </View>
            </View>

            <FlatList
              ref={messagesScrollRef}
              data={messages}
              renderItem={({ item }) => <MessageBubble message={item} />}
              keyExtractor={item => `msg_${item.id}`}
              contentContainerStyle={styles.messagesContainer}
              onScrollBeginDrag={() => setShowDeleteMenu(null)}
            />

            {/* Menu d'attachments */}
            {showAttachmentMenu && (
              <View style={styles.attachmentMenu}>
                <TouchableOpacity style={styles.attachmentOption} onPress={pickImage}>
                  <Text style={styles.attachmentIcon}>🖼️</Text>
                  <Text style={styles.attachmentText}>Galerie</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.attachmentOption} onPress={takePhoto}>
                  <Text style={styles.attachmentIcon}>📷</Text>
                  <Text style={styles.attachmentText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.attachmentOption} onPress={pickDocument}>
                  <Text style={styles.attachmentIcon}>📄</Text>
                  <Text style={styles.attachmentText}>Document</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.inputContainer}>
              <TouchableOpacity 
                style={styles.attachBtn}
                onPress={() => setShowAttachmentMenu(!showAttachmentMenu)}
              >
                <Text style={styles.attachIcon}>📎</Text>
              </TouchableOpacity>

              <TextInput
                style={styles.messageInput}
                placeholder="Aa"
                value={newMessage}
                onChangeText={setNewMessage}
                multiline
                maxLength={500}
                placeholderTextColor="#B0B3B9"
                onSubmitEditing={() => handleSendMessage()}
              />

              {(newMessage.trim() || uploadingFile) ? (
                <TouchableOpacity
                  style={styles.sendBtn}
                  onPress={() => handleSendMessage()}
                  disabled={sendingMessage || uploadingFile}
                >
                  {uploadingFile ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.sendIcon}>➤</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={styles.likeBtn} 
                  onPress={() => handleSendMessage('👍')}
                >
                  <Text style={styles.likeIcon}>👍</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatIcon}>💬</Text>
            <Text style={styles.emptyChatText}>Sélectionnez une conversation</Text>
            <TouchableOpacity
              style={styles.startChatBtn}
              onPress={() => setShowNewConversation(true)}
            >
              <Text style={styles.startChatBtnText}>Démarrer une conversation</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Modal nouvelle conversation */}
      <Modal 
        visible={showNewConversation} 
        animationType="slide" 
        transparent
        onRequestClose={() => setShowNewConversation(false)}
      >

      
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouvelle conversation</Text>
              <TouchableOpacity onPress={() => setShowNewConversation(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.usersList}>
              {users.map(user => (
                <TouchableOpacity
                  key={`modal_user_${user.uid || user.id}`}
                  style={styles.userCard}
                  onPress={() => handleCreateConversation(user)}
                >
                  <Image
                    source={{
                      uri: user.photoURL || user.profileImage ||
                        `https://i.pravatar.cc/150?img=${user.uid || user.id}`,
                    }}
                    style={styles.userCardAvatar}
                  />
                  <View style={styles.userCardInfo}>
                    <Text style={styles.userCardName}>{user.name}</Text>
                    <Text style={styles.userCardStatus}>
                      {user.online ? '🟢 Actif' : '⚫ Inactif'}
                    </Text>
                  </View>
                  <Text style={styles.userCardArrow}>→</Text>
                </TouchableOpacity>

                
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  hiddenOnMobile: {
    display: 'none',
  },
  conversationsPanel: {
    width: isMobile ? '100%' : width * 0.35,
    backgroundColor: '#FFFFFF',
    borderRightWidth: isMobile ? 0 : 1,
    borderRightColor: '#E5E5EA',
  },
  conversationsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#000000',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 50,
    backgroundColor: '#F0F2F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionIcon: {
    fontSize: 18,
  },
  searchContainer: {
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    top: 10,
    fontSize: 14,
    zIndex: 1,
    color: '#65676B',
  },
  searchInput: {
    backgroundColor: '#F0F2F5',
    borderRadius: 20,
    paddingHorizontal: 36,
    paddingVertical: 9,
    fontSize: 14,
    color: '#000000',
  },
  conversationItem: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginHorizontal: 8,
    borderRadius: 8,
    marginBottom: 2,
  },
  conversationItemActive: {
    backgroundColor: '#E7F3FF',
  },
  conversationItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 50,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#31A24C',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  conversationDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conversationName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  conversationNameUnread: {
    fontWeight: '700',
  },
  timestamp: {
    fontSize: 12,
    color: '#65676B',
  },
  lastMessage: {
    fontSize: 13,
    color: '#65676B',
    marginTop: 4,
  },
  lastMessageUnread: {
    fontWeight: '600',
    color: '#000000',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0084FF',
    marginLeft: 8,
  },
  emptyList: {
    padding: 20,
    alignItems: 'center',
  },
  emptyListText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
  },
  emptyListSubtext: {
    fontSize: 14,
    color: '#65676B',
    textAlign: 'center',
    marginTop: 8,
  },
  chatPanel: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  chatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: 12,
  },
  backButtonText: {
    fontSize: 24,
    color: '#0084FF',
  },
  chatHeaderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 50,
    marginRight: 12,
  },
  chatHeaderName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  chatHeaderStatus: {
    fontSize: 12,
    color: '#65676B',
    marginTop: 2,
  },
  chatHeaderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  chatActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 50,
    backgroundColor: '#F0F2F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatActionIcon: {
    fontSize: 18,
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-end',
  },
  messageContainerOwn: {
    justifyContent: 'flex-end',
  },
  messageContainerOther: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '70%',
    borderRadius: 18,
  },
  bubbleOwn: {
    backgroundColor: '#0084FF',
  },
  bubbleOther: {
    backgroundColor: '#E4E6EB',
  },
  messageText: {
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  messageTextOwn: {
    color: '#FFFFFF',
  },
  messageTextOther: {
    color: '#000000',
  },
  // Styles pour les fichiers
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    margin: 4,
    borderRadius: 12,
    maxWidth: 250,
  },
  fileContainerOwn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  fileContainerOther: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  fileIconContainer: {
    marginRight: 12,
  },
  fileIcon: {
    fontSize: 24,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 12,
    color: '#666666',
  },
  downloadIcon: {
    fontSize: 16,
    marginLeft: 8,
  },
  // Menu d'attachments
  attachmentMenu: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  attachmentOption: {
    alignItems: 'center',
    padding: 12,
  },
  attachmentIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  attachmentText: {
    fontSize: 12,
    color: '#65676B',
  },
  reactionsContainer: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 4,
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  reactionBadge: {
    backgroundColor: '#F0F2F5',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  reactionEmoji: {
    fontSize: 12,
  },
  reactionCount: {
    fontSize: 10,
    color: '#65676B',
    fontWeight: '600',
  },
  messageMenuContainer: {
    position: 'absolute',
    bottom: 30,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 8,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    gap: 4,
  },
  menuOption: {
    width: 40,
    height: 40,
    borderRadius: 50,
    backgroundColor: '#F0F2F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuOptionText: {
    fontSize: 20,
  },
  menuOptionDelete: {
    backgroundColor: '#FFE4E1',
    width: 60,
  },
  menuOptionDeleteText: {
    fontSize: 10,
    color: '#DC2626',
    fontWeight: '600',
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    gap: 8,
  },
  attachBtn: {
    width: 36,
    height: 36,
    borderRadius: 50,
    backgroundColor: '#F0F2F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachIcon: {
    fontSize: 18,
    color: '#0084FF',
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#F0F2F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#000000',
    maxHeight: 100,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 50,
    backgroundColor: '#0084FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: {
    fontSize: 18,
    color: 'white',
  },
  likeBtn: {
    width: 36,
    height: 36,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  likeIcon: {
    fontSize: 20,
    color: '#0084FF',
  },
  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChatIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyChatText: {
    fontSize: 16,
    color: '#65676B',
    marginBottom: 16,
  },
  startChatBtn: {
    backgroundColor: '#0084FF',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  startChatBtnText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  modalClose: {
    fontSize: 24,
    color: '#65676B',
    fontWeight: '700',
  },
  usersList: {
    maxHeight: 400,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  userCardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  userCardInfo: {
    flex: 1,
  },
  userCardName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  userCardStatus: {
    fontSize: 12,
    color: '#65676B',
    marginTop: 2,
  },
  userCardArrow: {
    fontSize: 18,
    color: '#0084FF',
  },
});

export default Messenger;