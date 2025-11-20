// MessageBubble.tsx
// @ts-nocheck
import React, { useCallback } from 'react';
import { 
    View, 
    Text, 
    Image, 
    StyleSheet, 
    TouchableOpacity, 
    Linking,
    Alert 
} from 'react-native';

import Icon from 'react-native-vector-icons/MaterialIcons'; 
import Avatar from './Avatar'; 

// --- COULEURS MESSENGER ADAPTÉES ---
const COLORS = {
    primary: '#0084ff', 
    bubbleOther: '#E5E7EB', 
    bubbleCurrent: '#0084ff', 
    textDark: '#111827',
    textLight: 'white',
    metaDark: '#6B7280',
    metaLight: 'rgba(255, 255, 255, 0.8)',
};

// Utilitaire pour générer une couleur cohérente basée sur le nom (pour les groupes)
const stringToColor = (str) => {
    if (!str) return '#000000';
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00ffffff).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
};

// --- COMPOSANT MESSAGE BUBBLE ---

const MessageBubble = ({ msg, isCurrentUser, senderInfo, isGroupChat, formatTime }) => {
    
    const renderStatusIcon = useCallback(() => {
        if (!isCurrentUser) return null;
        // La double coche lue prend une couleur bleue distincte
        const iconColor = msg.read ? '#3B82F6' : COLORS.metaLight; 
        const iconName = msg.read ? 'done-all' : 'done'; 

        return <Icon name={iconName} size={14} color={iconColor} style={{ marginLeft: 2 }} />;
    }, [isCurrentUser, msg.read]);

    const handleFilePress = () => {
        if (msg.fileURL) {
            Linking.openURL(msg.fileURL).catch(err => Alert.alert("Erreur", "Impossible d'ouvrir le lien."));
        }
    };

    const bubbleStyle = isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble;
    const metaColor = isCurrentUser ? COLORS.metaLight : COLORS.metaDark;
    const textColor = isCurrentUser ? COLORS.textLight : COLORS.textDark;

    return (
        <View style={[styles.messageRow, isCurrentUser ? styles.currentUserRow : styles.otherUserRow]}>
            
            {/* Avatar */}
            {!isCurrentUser && (
                <View style={styles.messageAvatarContainer}>
                    <Avatar user={senderInfo} size="small" />
                </View>
            )}

            <View style={[styles.messageBubble, bubbleStyle]}>
                {/* Nom de l'expéditeur dans les groupes */}
                {isGroupChat && !isCurrentUser && (
                    <Text 
                        style={[styles.senderName, { color: stringToColor(senderInfo.name) }]}
                    >
                        {senderInfo.name}
                    </Text>
                )}

                {/* Contenu */}
                {msg.type === 'file' ? (
                    msg.fileType === 'image' ? (
                        <Image 
                            source={{ uri: msg.fileURL }} 
                            style={styles.messageImage}
                            resizeMode="cover" 
                        />
                    ) : (
                        // Fichier Card
                        <TouchableOpacity onPress={handleFilePress} style={[styles.fileCard, isCurrentUser && styles.fileCardCurrentUser]}>
                            <View style={styles.fileIcon}>
                                <Icon name="insert-drive-file" size={24} color={isCurrentUser ? COLORS.textLight : COLORS.textDark} />
                            </View>
                            <View style={styles.fileInfo}>
                                <Text style={[styles.fileName, { color: textColor }]} numberOfLines={1}>{msg.fileName}</Text>
                                <Text style={styles.fileType}>Document</Text>
                            </View>
                            <View style={styles.downloadIconWrapper}>
                                <Icon name="file-download" size={16} color={metaColor} />
                            </View>
                        </TouchableOpacity>
                    )
                ) : (
                    // Texte
                    <Text style={[styles.messageText, { color: textColor }]}>{msg.text}</Text>
                )}

                {/* Méta-données */}
                <View style={styles.messageMeta}>
                    <Text style={[styles.timestamp, { color: metaColor }]}>
                        {formatTime(msg.timestamp)}
                    </Text>
                    {renderStatusIcon()}
                </View>
            </View>
        </View>
    );
};

// --- STYLESHEET RN ---

const styles = StyleSheet.create({
    messageRow: {
        flexDirection: 'row',
        marginBottom: 8,
        paddingHorizontal: 10,
        maxWidth: '100%',
        alignItems: 'flex-end',
    },
    currentUserRow: {
        justifyContent: 'flex-end',
    },
    otherUserRow: {
        justifyContent: 'flex-start',
    },
    messageAvatarContainer: {
        marginRight: 8,
        marginBottom: 4, 
        alignSelf: 'flex-end', 
        flexShrink: 0,
    },
    messageBubble: {
        padding: 8,
        paddingHorizontal: 12,
        borderRadius: 20, // Très arrondi comme Messenger
        maxWidth: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    otherUserBubble: {
        backgroundColor: COLORS.bubbleOther,
        borderBottomLeftRadius: 4, // Pointe Messenger
    },
    currentUserBubble: {
        backgroundColor: COLORS.bubbleCurrent,
        borderBottomRightRadius: 4, // Pointe Messenger
    },
    senderName: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 20,
    },
    messageMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 4,
        marginTop: 4,
    },
    timestamp: {
        fontSize: 11,
    },
    messageImage: {
        width: 200, 
        height: 150,
        borderRadius: 12,
        marginBottom: 4,
    },
    fileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        padding: 10,
        borderRadius: 12,
        minWidth: 200,
    },
    fileCardCurrentUser: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)', 
    },
    fileIcon: {
        marginRight: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fileInfo: {
        flex: 1,
        flexDirection: 'column',
        overflow: 'hidden',
    },
    fileName: {
        fontWeight: '600',
        fontSize: 14,
    },
    fileType: {
        fontSize: 11,
        opacity: 0.8,
        color: COLORS.metaDark,
    },
    downloadIconWrapper: {
        marginLeft: 10, 
        opacity: 0.7,
        justifyContent: 'center',
    }
});

export default React.memo(MessageBubble);



