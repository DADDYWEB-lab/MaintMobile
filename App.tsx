import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "./src/screens/LoginScreen";
import AdminLayout from "./src/Admin/AdminLayout";
import AddStaff from "./src/Admin/gestionPersonnel/Staff";
import Personnel from "./src/Admin/gestionPersonnel/Staff";
import AddStaffScreen from "./src/Admin/gestionPersonnel/AddStaff";
import EditStaffScreen from "./src/Admin/gestionPersonnel/EditStaff";
import DashboardAdmin from "./src/Admin/DashboardAdmin/Dashboard";
import TaskCalendar from "./src/Admin/Calendrier des taches/TasckCalendar";
import NewTask from "./src/Admin/Calendrier des taches/NewTask";
import Reclamations from "./src/Admin/Reclamation/Reclamation";
import Espaces from "./src/Admin/Espaces/Espaces";
import Fournisseurs from "./src/Admin/Fournisseurs/Fournisseurs";
import Devis from "./src/Admin/Devis/Devis";
import Chat from './src/Admin/Chat/Chat'







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
          name="DashboardAdmin"
          component={DashboardAdmin}
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
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="Reclamations"
          component={Reclamations}
          options={{ headerShown: false }}
        />

        {/* Gestion du Personnel */}

        <Stack.Screen 
        name="addStaff" 
        component={AddStaff} 
        />

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
          name="Chat"
          component={Chat}
          options={{ title: "Gestion des Devis" }}
        />


      </Stack.Navigator>
    </NavigationContainer>
  );
}
