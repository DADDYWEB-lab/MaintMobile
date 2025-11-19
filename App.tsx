import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "./src/screens/LoginScreen";
import AdminLayout from "./src/Admin/AdminLayout";
import AddStaff from "./src/Admin/gestionPersonnel/Staff";
import StaffScreen from "./src/Admin/gestionPersonnel/Staff";
import AddStaffScreen from "./src/Admin/gestionPersonnel/AddStaff";
import EditStaffScreen from "./src/Admin/gestionPersonnel/EditStaff";
import DashboardAdmin from "./src/Admin/DashboardAdmin/Dashboard"
import TaskCalendar from './src/Admin/Calendrier des taches/TasckCalendar'
import NewTask from './src/Admin/Calendrier des taches/NewTask'



const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />

        {/* <Stack.Screen name="espaceAdmin" component={AdminLayout} /> */}

        <Stack.Screen name="addStaff" component={AddStaff} />

        <Stack.Screen
          name="AdminLayout"
          component={AdminLayout}
          options={{ headerShown: false }}
        />

       <Stack.Screen
          name="DashboardAdmin"
          component={DashboardAdmin}
          options={{ headerShown: false }}
         />
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



        {/* Gestion du Personnel */}
        <Stack.Screen
          name="staff"
          component={StaffScreen}
          options={{ title: "Gestion du Personnel" }}
        />

        <Stack.Screen
          name="AddStaff"
          component={AddStaffScreen}
          options={{ title: "Ajouter un membre" }}
        />
        
       

        {/* <Stack.Screen
          name="GesionPersonnel"
          component={StaffScreen}
          options={{ title: "Gestion du Personnel" }}
        />



        <Stack.Screen
          name="AddStaff"
          component={AddStaffScreen}
          options={{ title: "Ajouter un membre" }}
        />

        <Stack.Screen
          name="EditStaff"
          component={EditStaffScreen}
          options={{ title: "Modifier le membre" }}
        /> */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
