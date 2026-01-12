//@ts-nocheck
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "./src/screens/LoginScreen";
import AdminLayout from "./src/Admin/AdminLayout";
import AddStaff from "./src/Admin/gestionPersonnel/Staff";
import Personnel from "./src/Admin/gestionPersonnel/Staff";
import AddStaffScreen from "./src/Admin/gestionPersonnel/AddStaff";
import EditStaff from "./src/Admin/gestionPersonnel/EditStaff";
import DashboardAdmin from "./src/Admin/DashboardAdmin/Dashboard";
import TaskCalendar from "./src/Admin/Calendrier des taches/TasckCalendar";
import NewTask from "./src/Admin/Calendrier des taches/NewTask";
import Reclamations from "./src/Admin/Reclamation/Reclamation";

import Espaces from "./src/Admin/Espaces/Espaces";
import Fournisseurs from "./src/Admin/Fournisseurs/Fournisseurs";

import Devis from "./src/Admin/Devis/Devis2";
import Commande from "./src/Admin/Devis/Commande";

import Chat from "./src/Admin/Chat/Chat";
import Menu from "./src/Admin/Menue/Menue";

import Dashboard2 from "./src/Admin/DashboardAdmin/Dashboard2";
import Video from "./src/Video/Video";

import NewReclamation from "./src/Admin/Reclamation/AddReclamationModal";
import Parametres from "./src/ParametresApplication/Parametres";

import { FA6Style } from "@expo/vector-icons/build/FontAwesome6";
import Profile from "./src/ParametresApplication/Profile";
import DevisCommande from "./src/Admin/Devis/Devis";

import Employee from './src/Employees/Employee'
import FournisseurPage from './src/Fournisseur/Fournisseur'
import TachesEmployee from './src/Employees/TachesEmployee'
const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>



      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{ headerShown: false }}
      >                

     <Stack.Screen name="Login" component={LoginScreen} />

     
     <Stack.Screen
          name="Parametres"
          component={Parametres}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="Profile"
          component={Profile}
          options={{ headerShown: false }}
        />
       <Stack.Screen
          name="DashboardAdmin"
          component={DashboardAdmin}
          options={{ headerShown: false }}
      />
        <Stack.Screen
          name="Dashboard2"
          component={Dashboard2}
          options={{ headerShown: false }}
        /> 

        {/* gestion des taches */}
        <Stack.Screen
          name="TaskCalendar"
          component={TaskCalendar}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="NewTask"
          component={NewTask}
          options={{
            headerShown: false,
            presentation: "modal",
            animation: "slide_from_bottom", // Optionnel : force l'animation par le bas        />
          }}
        />

        <Stack.Screen
          name="Reclamations"
          component={Reclamations}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="NewReclamation"
          component={NewReclamation}
          options={{
            headerShown: false,
            presentation: "modal",
            animation: "slide_from_bottom", // Optionnel : force l'animation par le bas
          }}
        />

        {/* Gestion du Personnel */}

        <Stack.Screen name="addStaff" component={AddStaff} />

        <Stack.Screen
          name="Personnel"
          component={Personnel}
          options={{ title: "Gestion du Personnel" }}
        />

        <Stack.Screen
          name="AddStaff"
          component={AddStaffScreen}
          options={{ title: "Ajouter un membre" }}
        />
        <Stack.Screen
          name="EditStaff"
          component={EditStaff}
          options={{ title: "modifier un membre" }}
        />
        {/* Gestion des espaces */}
        <Stack.Screen
          name="Espaces"
          component={Espaces}
          options={{ title: "Ajouter un membre" }}
        />

        {/* Fournisseurs */}
        <Stack.Screen
          name="Fournisseurs"
          component={Fournisseurs}
          options={{ title: "Gestion des fournisseurs" }}
        />

        {/* Devis */}
        <Stack.Screen
          name="Devis"
          component={Devis}
          options={{ title: "Gestion des Devis" }}
        />

        <Stack.Screen
          name="Commande"
          component={Commande}
          options={{ title: "Gestion des Commande" }}
        />
        <Stack.Screen
          name="DevisCommande"
          component={DevisCommande}
          options={{ title: "Gestion des Commande" }}
        />

        <Stack.Screen
          name="Chat"
          component={Chat}
          options={{ title: "Gestion des Devis" }}
        />
        <Stack.Screen
          name="menu"
          component={Menu}
          options={{ title: "Gestion des Devis" }}
        />

{/* interfaces employee */}



 <Stack.Screen
          name="Employee"
          component={Employee}
          options={{ title: "interfaces employee" }}
        />

<Stack.Screen
          name="TachesEmployee"
          component={TachesEmployee}
          options={{ title: "interfaces employee" }}
        />







 <Stack.Screen
          name="FournisseurPage"
          component={FournisseurPage}
          options={{ title: "espace fournisseur" }}
        />


      </Stack.Navigator>
    </NavigationContainer>
  );
}
