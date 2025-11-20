// MessengerApp.tsx
// @ts-nocheck
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
    View, 
    Text, 
    ScrollView, 
    TouchableOpacity, 
    TextInput, 
    StyleSheet, 
    Dimensions, 
    Platform, 
    Modal,
    ActivityIndicator,
    Alert,
    Image 
} from 'react-native';

import Icon from 'react-native-vector-icons/MaterialIcons'; 

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebaseConfig'

// Les sous-composants et hooks doivent être importés
import { useMessengerLogic } from './useMessengerLogic'; 
import Avatar from './Avatar'; 
import MessageBubble from './MessageBubble'; 

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

// --- COULEURS MESSENGER ADAPTÉES ---
const COLORS = {
    primary: '#0084ff', // Bleu Messenger
    secondary: '#f0f2f5', // Fond de recherche/saisie
    background: '#F3F4F6',
    surface: 'white',
    textPrimary: '#111827',
    textSecondary: '#6B7280',
    border: '#D1D5DB',
    online: '#31a24c',
    badge: '#F59E0B',
    headerText: 'white',
    neutral: '#6B7280',
};

const MessengerApp = () => {
    // UI States
    const [selectedChat, setSelectedChat] = useState(null);
    const [messageInput, setMessageInput] = useState('');
    const [showSidebar, setShowSidebar] = useState(isTablet); 
    const [searchQuery, setSearchQuery] = useState('');
    const [uploadingFile, setUploadingFile] = useState(false);
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false); 

    // Group creation states
    const [groupName, setGroupName] = useState('');
    const [selectedMembers, setSelectedMembers] = useState([]);

    // Refs
    const messagesScrollViewRef = useRef(null);

    // Custom Hook (Logique Firebase/état global - NON FOURNI mais supposé exister)
    const { currentUser, staff, groups, messages, unreadCounts, getLastMessage } = useMessengerLogic(selectedChat);

    // Scroll automatique
    useEffect(() => {
        if (messagesScrollViewRef.current) {
            messagesScrollViewRef.current.scrollToEnd({ animated: true });
        }
    }, [messages]);

    // Helper: Format Time (utilisé par MessageBubble)
    const formatTime = (date) => {
        if (!date) return '';
        const d = new Date(date);
        if (isNaN(d)) return '';
        return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    };

    // Helper: Filtrage des chats
    const allChats = useMemo(() => {
        const filteredStaff = staff.filter(u => 
            u.id !== currentUser?.id && u.name?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        const filteredGroups = groups.filter(g => 
            g.name?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        return [...filteredStaff, ...filteredGroups];
    }, [staff, groups, currentUser, searchQuery]);

    // Action: Envoyer Message
    const sendMessage = async () => {
        if (!messageInput.trim() || !selectedChat || !currentUser) return;
        try {
            const msgData = {
                senderId: currentUser.id,
                senderName: currentUser.name,
                senderImage: currentUser.profileImage || null,
                text: messageInput,
                timestamp: serverTimestamp(),
                read: false,
                type: 'text',
                participants: selectedChat.isGroup ? selectedChat.members : [currentUser.id, selectedChat.id].sort(),
                ...(selectedChat.isGroup && { groupId: selectedChat.id })
            };
            await addDoc(collection(db, 'messages'), msgData);
            setMessageInput('');
        } catch (err) {
            console.error("Erreur envoi:", err);
            Alert.alert("Erreur d'envoi", "Échec de l'envoi du message.");
        }
    };

    // Action: Upload Fichier (Simulé pour RN)
    const handleFileUpload = async () => {
        if (!selectedChat || !currentUser) return;

        Alert.alert(
            "Upload de Fichier",
            "La sélection de fichiers est simulée en React Native. Voulez-vous simuler l'envoi d'une image?",
            [
                { text: "Annuler", style: "cancel" },
                { 
                    text: "Simuler Image", 
                    onPress: async () => {
                        setUploadingFile(true);
                        try {
                            const url = 'https://picsum.photos/200/300';
                            const fileType = 'image';
                            const fileName = 'simulated_image.jpg';

                            const msgData = {
                                senderId: currentUser.id,
                                senderName: currentUser.name,
                                senderImage: currentUser.profileImage || null,
                                fileURL: url,
                                fileName: fileName,
                                fileType: fileType,
                                timestamp: serverTimestamp(),
                                read: false,
                                type: 'file',
                                participants: selectedChat.isGroup ? selectedChat.members : [currentUser.id, selectedChat.id].sort(),
                                ...(selectedChat.isGroup && { groupId: selectedChat.id })
                            };
                            await addDoc(collection(db, 'messages'), msgData);
                        } catch (err) {
                            Alert.alert("Erreur upload", "Erreur lors de la simulation d'upload.");
                        } finally {
                            setUploadingFile(false);
                        }
                    } 
                },
            ]
        );
    };

    // Action: Créer Groupe
    const createGroup = async () => {
        if (!groupName.trim() || selectedMembers.length === 0 || !currentUser) {
            Alert.alert("Erreur", "Veuillez nommer le groupe et sélectionner au moins un membre.");
            return;
        }
        try {
            await addDoc(collection(db, 'groups'), {
                name: groupName,
                members: [...selectedMembers, currentUser.id],
                createdBy: currentUser.id,
                createdAt: serverTimestamp(),
                avatar: '👥'
            });
            setShowGroupModal(false);
            setGroupName('');
            setSelectedMembers([]);
            Alert.alert("Succès", `Le groupe "${groupName}" a été créé !`);
        } catch (err) {
            console.error(err);
            Alert.alert("Erreur", "Échec de la création du groupe.");
        }
    };

    // Helper: Sélection/Désélection de chat
    const handleSelectChat = (chat) => {
        setSelectedChat(chat);
        if (!isTablet) {
            setShowSidebar(false);
        }
    };
    
    // Helper: Toggle Membres pour la Modal
    const toggleMemberSelection = useCallback((memberId) => {
        setSelectedMembers(prev => 
            prev.includes(memberId) 
            ? prev.filter(id => id !== memberId) 
            : [...prev, memberId]
        );
    }, []);

    // Rendu Loading
    if (!currentUser) return (
        <View style={styles.loadingScreen}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{ marginTop: 10 }}>Chargement...</Text>
        </View>
    );

    return (
        <View style={styles.messengerContainer}>
            {/* Sidebar (Liste des chats) */}
            {(showSidebar || isTablet) && (
                <View style={[styles.sidebar, !isTablet && !showSidebar && { width: 0 }]}>
                    <View style={styles.sidebarHeader}>
                        <View style={styles.headerTop}>
                            <Text style={styles.title}>Messagerie</Text>
                            <View style={styles.headerIcons}>
                                <TouchableOpacity style={styles.iconButton} onPress={() => setNotificationsEnabled(prev => !prev)}>
                                    <Icon name={notificationsEnabled ? 'notifications' : 'notifications-off'} size={20} color={COLORS.textPrimary} />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.iconButton} onPress={() => setShowGroupModal(true)}>
                                    <Icon name="group-add" size={20} color={COLORS.textPrimary} />
                                </TouchableOpacity>
                            </View>
                        </View>
                        {/* Barre de recherche */}
                        <View style={styles.searchWrapper}>
                            <Icon name="search" size={18} color={COLORS.textSecondary} style={styles.searchIconStyled} />
                            <TextInput 
                                placeholder="Rechercher..." 
                                value={searchQuery} 
                                onChangeText={setSearchQuery} 
                                style={styles.searchInput}
                                placeholderTextColor={COLORS.textSecondary}
                            />
                        </View>
                    </View>

                    {/* Liste des conversations */}
                    <ScrollView style={styles.chatList}>
                        {allChats.map(chat => (
                            <TouchableOpacity 
                                key={chat.id} 
                                onPress={() => handleSelectChat(chat)}
                                style={[styles.chatItem, selectedChat?.id === chat.id && styles.selectedChatItem]}
                            >
                                <Avatar user={chat} size="default" showStatus={!chat.isGroup} />
                                <View style={styles.chatInfo}>
                                    <View style={styles.chatInfoTop}>
                                        <Text style={styles.chatName}>{chat.name}</Text>
                                        {unreadCounts[chat.id] > 0 && (
                                            <View style={styles.unreadBadge}>
                                                <Text style={styles.unreadBadgeText}>{unreadCounts[chat.id]}</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.chatSnippet} numberOfLines={1}>
                                        {chat.isGroup ? 'Groupe' : chat.role || 'Staff'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Main Chat Area */}
            <View style={styles.mainChatArea}>
                {selectedChat ? (
                    <>
                        {/* Header du Chat */}
                        <View style={styles.chatHeader}>
                            <View style={styles.chatHeaderInfo}>
                                <TouchableOpacity onPress={() => setShowSidebar(prev => !prev)} style={[styles.iconButton, styles.menuButton]}>
                                    <Icon name={showSidebar ? 'close' : 'menu'} size={24} color={COLORS.textPrimary} />
                                </TouchableOpacity>
                                <Avatar user={selectedChat} size="default" showStatus={!selectedChat.isGroup} />
                                <View style={styles.headerNameStatus}>
                                    <Text style={styles.headerName}>{selectedChat.name}</Text>
                                    <Text style={styles.headerStatus}>
                                        {selectedChat.isGroup ? `${selectedChat.members?.length || 0} membres` : (selectedChat.online ? 'En ligne' : 'Hors ligne')}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Messages */}
                        <ScrollView 
                            ref={messagesScrollViewRef}
                            style={styles.messageContainer}
                            contentContainerStyle={styles.messageScrollViewContent}
                        >
                            {messages.length === 0 ? (
                                <View style={styles.emptyMessageArea}>
                                    <Text style={styles.emptyChatSubtitle}>Commencez la conversation</Text>
                                </View>
                            ) : (
                                messages.map(msg => {
                                    const isCurrentUser = msg.senderId === currentUser.id;
                                    const senderInfo = staff.find(s => s.id === msg.senderId) || {
                                        id: msg.senderId, name: msg.senderName || 'Inconnu', profileImage: msg.senderImage || null, isGroup: false
                                    };
                                    return (
                                        <MessageBubble 
                                            key={msg.id}
                                            msg={msg}
                                            isCurrentUser={isCurrentUser}
                                            senderInfo={senderInfo}
                                            isGroupChat={selectedChat.isGroup}
                                            formatTime={formatTime}
                                        />
                                    );
                                })
                            )}
                        </ScrollView>

                        {/* Zone de saisie */}
                        <View style={styles.inputArea}>
                            {uploadingFile && (
                                <View style={styles.uploadingTextWrapper}>
                                    <ActivityIndicator size="small" color={COLORS.primary} />
                                    <Text style={styles.uploadingText}>Envoi de fichier en cours...</Text>
                                </View>
                            )}
                            <View style={styles.inputWrapper}>
                                <TouchableOpacity onPress={handleFileUpload} style={styles.iconButton} disabled={uploadingFile}>
                                    <Icon name="attach-file" size={24} color={COLORS.textSecondary}/>
                                </TouchableOpacity>
                                
                                <TextInput 
                                    value={messageInput} 
                                    onChangeText={setMessageInput} 
                                    onSubmitEditing={sendMessage} 
                                    style={styles.messageInput}
                                    placeholder="Votre message..."
                                    placeholderTextColor={COLORS.textSecondary}
                                    multiline
                                />
                                <TouchableOpacity 
                                    onPress={sendMessage} 
                                    disabled={!messageInput.trim() || uploadingFile} 
                                    style={[styles.sendButton, (!messageInput.trim() || uploadingFile) && styles.disabledSendButton]}
                                >
                                    <Icon name="send" size={20} color={COLORS.surface}/>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </>
                ) : (
                    <View style={styles.emptyChat}>
                        <Icon name="chat" size={48} color={COLORS.textSecondary} style={{marginBottom: 10}}/>
                        <Text style={styles.emptyChatTitle}>Sélectionnez une conversation</Text>
                    </View>
                )}
            </View>

            {/* Modal création groupe */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={showGroupModal}
                onRequestClose={() => setShowGroupModal(false)}
            >
                 <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Nouveau Groupe</Text>
                            <TouchableOpacity onPress={() => setShowGroupModal(false)} style={styles.iconButton}>
                                <Icon name="close" size={24} color={COLORS.textPrimary} />
                            </TouchableOpacity>
                        </View>
                        
                        <TextInput
                            value={groupName}
                            onChangeText={setGroupName}
                            placeholder="Nom du groupe"
                            style={styles.modalInput}
                            placeholderTextColor={COLORS.textSecondary}
                        />

                        <Text style={styles.modalSubtitle}>Sélectionner les membres:</Text>
                        <ScrollView style={styles.modalMemberList}>
                            {staff.filter(s => s.id !== currentUser.id).map(member => (
                                <TouchableOpacity 
                                    key={member.id} 
                                    style={styles.memberLabel}
                                    onPress={() => toggleMemberSelection(member.id)}
                                >
                                    <View style={[styles.memberCheckbox, selectedMembers.includes(member.id) && styles.memberCheckboxSelected]}>
                                        {selectedMembers.includes(member.id) && <Icon name="check" size={16} color={COLORS.surface} />}
                                    </View>
                                    <Avatar user={member} size="small" />
                                    <Text style={styles.memberName}>{member.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <TouchableOpacity
                            onPress={createGroup}
                            disabled={!groupName.trim() || selectedMembers.length === 0}
                            style={[styles.modalButton, (!groupName.trim() || selectedMembers.length === 0) && styles.disabledModalButton]}
                        >
                            <Text style={styles.modalButtonText}>Créer</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

// --- STYLESHEET RN ---

const styles = StyleSheet.create({
    messengerContainer: {
        flex: 1,
        flexDirection: isTablet ? 'row' : 'column',
        backgroundColor: COLORS.background,
    },
    sidebar: {
        width: isTablet ? 300 : '100%',
        height: isTablet ? '100%' : '100%', 
        backgroundColor: COLORS.surface,
        borderRightWidth: isTablet ? 1 : 0,
        borderColor: COLORS.border,
    },
    sidebarHeader: {
        padding: 16,
        paddingTop: Platform.OS === 'ios' ? 40 : 16,
        borderBottomWidth: 1,
        borderColor: COLORS.border,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    headerIcons: {
        flexDirection: 'row',
        gap: 10,
    },
    iconButton: {
        padding: 5,
    },
    searchWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.secondary,
        borderRadius: 8,
        paddingHorizontal: 10,
    },
    searchIconStyled: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: COLORS.textPrimary,
        paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    },
    chatList: {
        flex: 1,
    },
    chatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderColor: COLORS.border,
    },
    selectedChatItem: {
        backgroundColor: COLORS.secondary,
    },
    chatInfo: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'center',
    },
    chatInfoTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    chatName: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    unreadBadge: {
        backgroundColor: COLORS.badge,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    unreadBadgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    chatSnippet: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    mainChatArea: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    chatHeader: {
        padding: 12,
        borderBottomWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.surface,
    },
    chatHeaderInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuButton: {
        paddingRight: 10,
        display: isTablet ? 'none' : 'flex',
    },
    headerNameStatus: {
        marginLeft: 10,
    },
    headerName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    headerStatus: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    messageContainer: {
        flex: 1,
    },
    messageScrollViewContent: {
        flexGrow: 1,
        justifyContent: 'flex-end',
        paddingHorizontal: 10,
        paddingVertical: 15,
    },
    emptyMessageArea: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    inputArea: {
        padding: 10,
        borderTopWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.surface,
    },
    uploadingTextWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 5,
        marginBottom: 5,
        gap: 5,
    },
    uploadingText: {
        fontSize: 14,
        color: COLORS.primary,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 25,
        paddingHorizontal: 5,
        backgroundColor: COLORS.secondary,
    },
    messageInput: {
        flex: 1,
        maxHeight: 100,
        fontSize: 16,
        color: COLORS.textPrimary,
        paddingVertical: Platform.OS === 'ios' ? 10 : 8,
        paddingHorizontal: 5,
    },
    sendButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 20,
        padding: 8,
        marginLeft: 5,
        marginBottom: 3,
    },
    disabledSendButton: {
        backgroundColor: COLORS.neutral,
        opacity: 0.6,
    },
    loadingScreen: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    emptyChat: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    emptyChatTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginTop: 10,
    },
    emptyChatSubtitle: {
        fontSize: 16,
        color: COLORS.textSecondary,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: isTablet ? '50%' : '85%',
        backgroundColor: COLORS.surface,
        borderRadius: 10,
        padding: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    modalInput: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        padding: 10,
        marginBottom: 15,
        fontSize: 16,
    },
    modalSubtitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 10,
    },
    modalMemberList: {
        maxHeight: 200,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        paddingVertical: 5,
    },
    memberLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderBottomWidth: 1,
        borderColor: COLORS.border,
    },
    memberName: {
        marginLeft: 10,
        fontSize: 16,
    },
    memberCheckbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: COLORS.neutral,
        marginRight: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    memberCheckboxSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    modalButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
    },
    disabledModalButton: {
        backgroundColor: COLORS.neutral,
    },
    modalButtonText: {
        color: COLORS.headerText,
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default MessengerApp;