// useMessengerLogic.js
// @ts-nocheck
import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
    collection, query, where, onSnapshot, addDoc, orderBy, updateDoc, doc, 
    serverTimestamp, getDocs, setDoc 
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../../../firebaseConfig'; // ⚠️ Assurez-vous que ce chemin est correct

export const useMessengerLogic = (selectedChat) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [staff, setStaff] = useState([]);
    const [groups, setGroups] = useState([]);
    const [messages, setMessages] = useState([]);
    const [unreadCounts, setUnreadCounts] = useState({});
    
    // --- 1. GESTION DE L'UTILISATEUR ET STATUT EN LIGNE ---
    
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Chercher les données complètes de l'utilisateur dans la collection 'staff'
                const staffQuery = query(collection(db, 'staff'), where('uid', '==', user.uid));
                const staffSnapshot = await getDocs(staffQuery);
                
                if (!staffSnapshot.empty) {
                    const userData = { id: staffSnapshot.docs[0].id, ...staffSnapshot.docs[0].data() };
                    setCurrentUser(userData);
                    
                    // Marquer l'utilisateur comme en ligne
                    await updateDoc(doc(db, 'staff', staffSnapshot.docs[0].id), {
                        online: true,
                        lastSeen: serverTimestamp()
                    });
                }
            } else {
                setCurrentUser(null);
            }
        });

        // Nettoyage de l'écoute d'authentification
        return () => unsubscribe();
    }, []);

    // --- 2. CHARGEMENT DES MEMBRES DU STAFF (StaffList) ---
    
    useEffect(() => {
        const q = query(collection(db, 'staff'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const staffData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setStaff(staffData);
        });

        // Nettoyage de l'écoute du staff
        return () => unsubscribe();
    }, []);

    // --- 3. CHARGEMENT DES GROUPES DE L'UTILISATEUR COURANT ---
    
    useEffect(() => {
        if (!currentUser) return;

        const q = query(
            collection(db, 'groups'),
            where('members', 'array-contains', currentUser.id)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const groupsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                isGroup: true
            }));
            setGroups(groupsData);
        });

        // Nettoyage de l'écoute des groupes
        return () => unsubscribe();
    }, [currentUser]);

    // --- 4. CHARGEMENT DES MESSAGES EN TEMPS RÉEL ---
    
    // Écoute des messages pertinents pour le chat sélectionné ou l'utilisateur courant
    useEffect(() => {
        if (!currentUser) return;

        // Écouter tous les messages où l'utilisateur courant est participant
        const q = query(
            collection(db, 'messages'),
            where('participants', 'array-contains', currentUser.id),
            orderBy('timestamp', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            // Filtrer les messages côté client pour ne conserver que ceux du chat sélectionné
            const messagesData = snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    timestamp: doc.data().timestamp?.toDate()
                }))
                .filter(msg => {
                    if (!selectedChat) return false;

                    if (selectedChat.isGroup) {
                        return msg.groupId === selectedChat.id;
                    }
                    // Pour les chats 1:1, les participants doivent inclure l'utilisateur sélectionné ET l'utilisateur courant
                    return msg.participants?.includes(selectedChat.id) && msg.participants?.includes(currentUser.id);
                });

            setMessages(messagesData);
        });

        // Nettoyage de l'écoute des messages
        return () => unsubscribe();
    }, [selectedChat, currentUser]);


    // --- 5. CALCUL DES MESSAGES NON LUS (UNREAD COUNTS) ---
    
    useEffect(() => {
        if (!currentUser) return;

        // Écouter tous les messages non lus pour l'utilisateur courant
        const q = query(
            collection(db, 'messages'),
            where('participants', 'array-contains', currentUser.id),
            where('read', '==', false)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const counts = {};
            snapshot.docs.forEach(doc => {
                const msg = doc.data();
                if (msg.senderId !== currentUser.id) {
                    
                    let chatId;
                    if (msg.groupId) {
                        chatId = msg.groupId; // Message de groupe
                    } else {
                        // Message 1:1, trouver l'autre participant
                        chatId = msg.participants.find(id => id !== currentUser.id);
                    }
                    
                    if (chatId) {
                        counts[chatId] = (counts[chatId] || 0) + 1;
                    }
                }
            });
            setUnreadCounts(counts);
            
            // NOTE: Le marquage 'read: true' est géré dans MessengerApp.tsx
            // lorsque le chat est sélectionné, afin d'assurer que l'utilisateur
            // voit le chat ouvert avant de marquer la lecture.
        });

        return () => unsubscribe();
    }, [currentUser]);
    
    // --- 6. HELPER : TROUVER LE DERNIER MESSAGE (pour Sidebar) ---
    const getLastMessage = useCallback((chatId) => {
        // La recherche est complexe sur le state local. 
        // Idéalement, Firebase maintiendrait une collection 'chats' avec le 'lastMessage'.
        
        const chatMessages = messages.filter(msg => {
            if (msg.groupId && msg.groupId === chatId) return true;
            if (msg.participants && msg.participants.includes(chatId) && msg.participants.includes(currentUser?.id)) return true;
            return false;
        }).sort((a, b) => b.timestamp - a.timestamp); // Trie du plus récent au plus ancien

        return chatMessages[0];
    }, [messages, currentUser]);


    return {
        currentUser,
        staff,
        groups,
        messages,
        unreadCounts,
        getLastMessage
    };
};






