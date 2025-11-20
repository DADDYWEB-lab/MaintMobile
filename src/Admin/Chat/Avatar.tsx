// Avatar.tsx
// @ts-nocheck
import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
// Note: Utilisation des icônes MaterialIcons pour l'indicateur de statut (si non masqué)

// --- COULEURS MESSENGER ADAPTÉES ---
const COLORS = {
    primary: '#0084ff', // Bleu Messenger
    surface: 'white',
    online: '#31a24c', // Vert statut
};

const Avatar = ({ user, size = 'default', showStatus = false }) => {
    const [imageError, setImageError] = useState(false);
    
    // Définitions des tailles en RN
    const sizeStyle = {
        small: { width: 36, height: 36, borderRadius: 18, fontSize: 12 },
        default: { width: 48, height: 48, borderRadius: 24, fontSize: 18 },
        large: { width: 80, height: 80, borderRadius: 40, fontSize: 32 }
    };
    const sizeMap = sizeStyle[size];

    if (!user) return <View style={[sizeMap, styles.avatarFallback]}><Text style={{ fontSize: sizeMap.fontSize, color: 'white' }}>?</Text></View>;

    // Gestion Groupe
    if (user.isGroup) {
        return (
            <View style={[sizeMap, styles.groupAvatar]}>
                <Text style={{ fontSize: sizeMap.fontSize, color: 'white' }}>
                    {user.avatar || '👥'}
                </Text>
            </View>
        );
    }

    // Gestion Utilisateur (Image ou Initiales)
    const shouldShowImage = user.profileImage && !imageError;
    const initials = user.name 
        ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) 
        : '?';

    return (
        <View style={styles.chatAvatarWrapper}>
            {shouldShowImage ? (
                <Image
                    source={{ uri: user.profileImage }}
                    style={[sizeMap, styles.avatarImage]}
                    onError={() => setImageError(true)}
                />
            ) : (
                <View style={[sizeMap, styles.avatarFallback]}>
                    <Text style={{ fontSize: sizeMap.fontSize, color: 'white' }}>
                        {initials}
                    </Text>
                </View>
            )}
            
            {/* Indicateur de statut en ligne (point vert) */}
            {showStatus && user.online && (
                <View style={styles.statusIndicator} />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    chatAvatarWrapper: {
        position: 'relative',
    },
    avatarImage: {
        resizeMode: 'cover',
        backgroundColor: COLORS.surface,
    },
    avatarFallback: {
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    groupAvatar: {
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusIndicator: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: COLORS.online,
        borderWidth: 2,
        borderColor: COLORS.surface,
    },
});

export default React.memo(Avatar);