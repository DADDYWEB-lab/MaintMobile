//@ts-nocheck

import React, { useState, useEffect } from "react";

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import {
  Cloud,Settings ,
  User,
  Menu,
  Search,
  Folder,
  Wrench,
  AlertTriangle,
  FileText,
  BarChart3,
  Users,
  Home,
  Clock,
  Building,
  Truck,
  MessageSquare,
  LucideIcon,
} from "lucide-react-native";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  where,
} from "firebase/firestore";
import { db } from "../../../firebaseConfig";

const { width, height } = Dimensions.get("window");
import AddReclamationModal from "../Reclamation/AddReclamationModal";

interface DataItem {
  id: string;
  name: string;
  type: string;
  icon: LucideIcon;
  backgroundColor: string;
  iconColor: string;
  count: number;
  status?: string;
  navigationRoute: string;
}

type RootStackParamList = {
  Tasks: undefined;
  Reclamations: undefined;
  Personnel: undefined;
  Statistics: undefined;
  Fournisseurs: undefined;
  Espaces: undefined;
  Devis: undefined;
  Chat: undefined;
  Parametres: undefined;
};

type FileManagerUIProps = {
  navigation: any; // Vous pouvez remplacer par le type spécifique
};

export default function FileManagerUI({ navigation }: FileManagerUIProps) {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    pendingTasks: 0,
    totalReclamations: 0,
    urgentReclamations: 0,
    activeStaff: 0,
    reclamationsResolues: 0,
    totalFournisseurs: 0,
    totalEspaces: 0,
    totalDevis: 0,
  });

  const [dataItems, setDataItems] = useState<DataItem[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Récupération des données depuis Firebase
  useEffect(() => {
    setLoading(true);
    let active = true;

    const unsubscribers: (() => void)[] = [];

    // Tâches
    const qTasks = query(collection(db, "tasks"));
    const unsubTasks = onSnapshot(qTasks, (snapshot) => {
      if (!active) return;

      const tasks = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const completedTasks = tasks.filter(
        (t: any) => t.status === "completed"
      ).length;
      const inProgressTasks = tasks.filter(
        (t: any) => t.status === "in-progress"
      ).length;
      const pendingTasks = tasks.filter(
        (t: any) => t.status === "pending"
      ).length;

      setStats((prev) => ({
        ...prev,
        totalTasks: tasks.length,
        completedTasks,
        inProgressTasks,
        pendingTasks,
      }));
    });
    unsubscribers.push(unsubTasks);

    // Réclamations
    const qReclamations = query(collection(db, "reclamations"));
    const unsubReclamations = onSnapshot(qReclamations, (snapshot) => {
      if (!active) return;

      const reclamations = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      const urgentReclamations = reclamations.filter(
        (r: any) =>
          r.urgency === "tres_urgent" ||
          r.urgency === "urgent" ||
          r.urgency === "high"
      ).length;
      const reclamationsResolues = reclamations.filter(
        (r: any) => r.status === "résolu" || r.status === "clôturé"
      ).length;

      setStats((prev) => ({
        ...prev,
        totalReclamations: reclamations.length,
        urgentReclamations,
        reclamationsResolues,
      }));
    });
    unsubscribers.push(unsubReclamations);

    // Staff
    const qStaff = query(collection(db, "staff"));
    const unsubStaff = onSnapshot(qStaff, (snapshot) => {
      if (!active) return;

      const staff = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      // Pour activeStaff, on aurait besoin des données de tâches déjà chargées
      // Cette logique pourrait être déplacée dans un effet séparé
      const activeStaff = staff.length; // Version simplifiée

      setStats((prev) => ({
        ...prev,
        activeStaff,
      }));
    });
    unsubscribers.push(unsubStaff);

    // Fournisseurs
    const qFournisseurs = query(collection(db, "fournisseurs"));
    const unsubFournisseurs = onSnapshot(qFournisseurs, (snapshot) => {
      if (!active) return;

      setStats((prev) => ({
        ...prev,
        totalFournisseurs: snapshot.size,
      }));
    });
    unsubscribers.push(unsubFournisseurs);

    // Espaces
    const qEspaces = query(collection(db, "espaces"));
    const unsubEspaces = onSnapshot(qEspaces, (snapshot) => {
      if (!active) return;

      setStats((prev) => ({
        ...prev,
        totalEspaces: snapshot.size,
      }));
    });
    unsubscribers.push(unsubEspaces);

    // Devis
    const qDevis = query(collection(db, "devis"));
    const unsubDevis = onSnapshot(qDevis, (snapshot) => {
      if (!active) return;

      setStats((prev) => ({
        ...prev,
        totalDevis: snapshot.size,
      }));

      // Toutes les données sont chargées
      setLoading(false);
    });
    unsubscribers.push(unsubDevis);

    return () => {
      active = false;
      unsubscribers.forEach((unsub) => unsub());
    };
  }, []);

  // Mise à jour des items de données quand les stats changent
  useEffect(() => {
    const items: DataItem[] = [
      {
        id: "tasks",
        name: "Tâches",
        type: "maintenance",
        icon: Wrench,
        backgroundColor: "#FED7AA",
        iconColor: "#F97316",
        count: stats.totalTasks,
        status: `${stats.completedTasks}/${stats.totalTasks} `,
        navigationRoute: "TaskCalendar",
      },
      {
        id: "reclamations",
        name: "Réclamations",
        type: "urgent",
        icon: AlertTriangle,
        backgroundColor: "#FBCFE8",
        iconColor: "#EC4899",
        count: stats.totalReclamations,
        status: `${stats.urgentReclamations} urgentes`,
        navigationRoute: "Reclamations",
      }
      ,
      {
        id: "personnel",
        name: "Personnel",
        type: "equipe",
        icon: Users,
        backgroundColor: "#BFDBFE",
        iconColor: "#3B82F6",
        count: stats.activeStaff,
        status: `${stats.activeStaff} actifs`,
        navigationRoute: "Personnel",
      },

      {
        id: "fournisseurs",
        name: "Fournisseurs",
        type: "providers",
        icon: Truck,
        backgroundColor: "#D9F99D",
        iconColor: "#65A30D",
        count: stats.totalFournisseurs,
        status: "fournisseurs",
        navigationRoute: "Fournisseurs",
      },
      {
        id: "espaces",
        name: "Espaces",
        type: "locations",
        icon: Building,
        backgroundColor: "#F0ABFC",
        iconColor: "#C026D3",
        count: stats.totalEspaces,
        status: "espaces",
        navigationRoute: "Espaces",
      },
       {
        id: "Commande",
        name: "Commande",
        type: "Commande",
        icon: BarChart3,
        backgroundColor: "#A5F3FC",
        iconColor: "#06B6D4",
        count: Math.round(
          (stats.completedTasks / Math.max(stats.totalTasks, 1)) * 100
        ),
        status: "% ",
        navigationRoute: "Commande",
      },
      {
        id: "devis",
        name: "Devis",
        type: "quotes",
        icon: FileText,
        backgroundColor: "#BDE0FE",
        iconColor: "#1D4ED8",
        count: stats.totalDevis,
        status: "devis",
        navigationRoute: "Devis",
      },
      {
        id: "chat",
        name: "Chat",
        type: "messages",
        icon: MessageSquare,
        backgroundColor: "#FFD6A5",
        iconColor: "#E85D04",
        count: 0, // Vous pouvez ajouter le compteur de messages non lus
        status: "messages",
        navigationRoute: "Chat",
      },
      {
        id: "parametres",
        name: "Paramètres",
        type: "settings",
        icon: Settings,
        backgroundColor: "#D1D5DB",
        iconColor: "#4B5563",
        count: 0,
        status: "configuration",
        navigationRoute: "DevisCommande",
      },
     
    ];

    setDataItems(items);
  }, [stats]);

  const filteredItems = dataItems.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderDataCard = (item: DataItem, index: number) => {
    const Icon = item.icon;
    return (
      <TouchableOpacity
        key={index}
        style={styles.fileCard}
        activeOpacity={0.7}
        accessibilityLabel={`${item.name} ${item.type}`}
        accessibilityRole="button"
        onPress={() => navigation.navigate(item.navigationRoute)}
      >
        <View
          style={[
            styles.fileCardContainer,
            { backgroundColor: item.backgroundColor },
          ]}
        >
          <View style={styles.fileIconContainer}>
            <Icon size={28} color={item.iconColor} />
          </View>
          <Text style={styles.fileName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.fileCount}>{item.count}</Text>
          <Text style={styles.fileType}>{item.status || item.type}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#1e3b23ff" />
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Chargement des données...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#1E293B" />

      {/* Container principal sans effet téléphone */}
      <View style={styles.mainContainer}>
        {/* Top Dark Section */}
        <View style={styles.topSection}>
          {/* Header Icons */}
          <View style={styles.headerIcons}>
            <TouchableOpacity
              style={styles.iconButton}
              accessibilityLabel="Reclamation"
              accessibilityRole="button"
onPress={() => setIsModalVisible(true)}            >
              <AlertTriangle size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconButton, styles.userButton]}
              accessibilityLabel="tasks"
              accessibilityRole="button"
              onPress={() => navigation.navigate("NewTask")}
            >
              <Clock size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              accessibilityLabel="Menu"
              accessibilityRole="button"
              onPress={() => navigation.navigate("Parametres")}
            >
              <Settings   size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              accessibilityLabel="Rechercher dans l'application"
              accessibilityRole="search"
            />
            <View style={styles.searchIcon}>
              <Search size={16} color="#94A3B8" />
            </View>
          </View>

          {/* Stats Card */}
          <View style={styles.myDocsCard}>
            <View style={styles.myDocsHeader}>
              <View style={styles.myDocsIcon}>
                <Folder size={24} color="#FFFFFF" />
              </View>
              <View style={styles.myDocsInfo}>
                <Text style={styles.myDocsTitle}>Tableau de Bord</Text>
                <Text style={styles.myDocsSubtitle}>
                  {stats.totalTasks} tâches, {stats.totalReclamations}{" "}
                  réclamations
                </Text>
              </View>
              <TouchableOpacity
                style={styles.moreButton}
                accessibilityLabel="Rafraîchir"
                accessibilityRole="button"
                onPress={() => setLoading(true)}
              >
                <Text style={styles.moreButtonText}>↻</Text>
              </TouchableOpacity>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.round(
                        (stats.completedTasks / Math.max(stats.totalTasks, 1)) *
                          100
                      )}%`,
                    },
                  ]}
                />
              </View>
              <View style={styles.storageInfo}>
                <Text style={styles.storageText}>
                  {Math.round(
                    (stats.completedTasks / Math.max(stats.totalTasks, 1)) * 100
                  )}
                  % complétion
                </Text>
              </View>
            </View>
          </View>
        </View>

        <AddReclamationModal
          visible={isModalVisible}
          onClose={() => setIsModalVisible(false)}
        />

        {/* Bottom Light Section */}
        <ScrollView
          style={styles.bottomSection}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Data Grid */}
          <View style={styles.filesGrid}>
            {filteredItems.map((item, index) => renderDataCard(item, index))}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#1E293B",
  },

  // Container principal simplifié
  mainContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },

  // Top section reste identique
  topSection: {
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 128,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: "#1E293B",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },

  // Bottom section reste identique
  bottomSection: {
    marginTop: -80,
    paddingHorizontal: 24,
    flex: 1,
  },

  // Tous les autres styles restent identiques
  headerIcons: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    marginTop: 10,
  },

  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },

  userButton: {
    borderRadius: 20,
  },

  searchContainer: {
    marginBottom: 24,
    position: "relative",
  },

  searchInput: {
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "400",
    paddingRight: 40,
  },

  searchIcon: {
    position: "absolute",
    right: 16,
    top: 14,
    pointerEvents: "none",
  },

  myDocsCard: {
    backgroundColor: "rgba(51, 65, 85, 0.4)",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },

  myDocsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  myDocsIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#A855F7",
  },

  myDocsInfo: {
    flex: 1,
    marginLeft: 12,
  },

  myDocsTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 2,
  },

  myDocsSubtitle: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "400",
  },

  moreButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(15, 23, 42, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },

  moreButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
  },

  progressContainer: {
    marginTop: 6,
  },

  progressBar: {
    height: 6,
    backgroundColor: "rgba(15, 23, 42, 0.3)",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 6,
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#3B82F6",
  },

  storageInfo: {
    alignItems: "flex-end",
  },

  storageText: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "400",
  },

  scrollContent: {
    paddingBottom: 120,
  },

  filesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  fileCard: {
    width: "31%",
    marginBottom: 12,
  },

  fileCardContainer: {
    borderRadius: 24,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  fileIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },

  fileName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
    textAlign: "center",
    marginBottom: 2,
  },

  fileCount: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1E293B",
    textAlign: "center",
    marginVertical: 4,
  },

  fileType: {
    fontSize: 10,
    color: "#64748B",
    textAlign: "center",
    fontWeight: "400",
  },

  quickStatsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },

  quickStat: {
    alignItems: "center",
  },

  quickStatValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 4,
  },

  quickStatLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },

  bottomNav: {
    position: "absolute",
    bottom: 20,
    left: 24,
    right: 24,
  },

  navBar: {
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },

  navButtonActive: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "#6366F1",
  },

  navButton: {
    padding: 8,
    borderRadius: 12,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },

  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
  },
});
