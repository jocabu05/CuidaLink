import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

// Screens - Common
import SplashScreen from './src/screens/SplashScreen';
import RoleSelectionScreen from './src/screens/RoleSelectionScreen';

// Screens - Cuidadora
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import CheckinScreen from './src/screens/CheckinScreen';
import PastillaScreen from './src/screens/PastillaScreen';
import PaseoScreen from './src/screens/PaseoScreen';
import ComidaScreen from './src/screens/ComidaScreen';
import LocalizarScreen from './src/screens/LocalizarScreen';
import HistorialScreen from './src/screens/HistorialScreen';
import PerfilAbueloScreen from './src/screens/PerfilAbueloScreen';
import SiestaScreen from './src/screens/SiestaScreen';
import MapaZonaScreen from './src/screens/MapaZonaScreen';

// Screens - Familiar
import FamiliarLoginScreen from './src/screens/FamiliarLoginScreen';
import FamiliarRegisterScreen from './src/screens/FamiliarRegisterScreen';
import FamiliarDashboardScreen from './src/screens/FamiliarDashboardScreen';
import MedicacionScreen from './src/screens/MedicacionScreen';

// Screens - Shared
import ChatScreen from './src/screens/ChatScreen';
import ValorarScreen from './src/screens/ValorarScreen';
import InformeScreen from './src/screens/InformeScreen';
import NotasScreen from './src/screens/NotasScreen';
import CalendarScreen from './src/screens/CalendarScreen';

// Services
import authService from './src/services/authService';

// Types
export type HomeStackParamList = {
  Dashboard: undefined;
  Checkin: { abueloId: number; abueloNombre: string };
  Pastilla: { abueloId: number; medicamento: string };
  Paseo: { abueloId: number };
  Comida: { abueloId: number };
  Siesta: { abueloId: number };
  Valorar: undefined;
};

const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const RootStack = createNativeStackNavigator();
const CuidadoraTab = createBottomTabNavigator();
const FamiliarTab = createBottomTabNavigator();

// ─── CUSTOM TAB ICON ───
const TAB_ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  Inicio:     { active: 'home',            inactive: 'home-outline' },
  Localizar:  { active: 'location',        inactive: 'location-outline' },
  Mapa:       { active: 'map',             inactive: 'map-outline' },
  Historial:  { active: 'time',            inactive: 'time-outline' },
  Chat:       { active: 'chatbubbles',     inactive: 'chatbubbles-outline' },
  Perfil:     { active: 'person-circle',   inactive: 'person-circle-outline' },
  Resumen:    { active: 'stats-chart',     inactive: 'stats-chart-outline' },
  Notas:      { active: 'document-text',   inactive: 'document-text-outline' },
  Informe:    { active: 'trending-up',     inactive: 'trending-up-outline' },
  Calendario: { active: 'calendar',        inactive: 'calendar-outline' },
  Medicación: { active: 'medical',        inactive: 'medical-outline' },
};

const TabBarIcon = ({ name, focused, color }: { name: string; focused: boolean; color: string }) => {
  const icons = TAB_ICONS[name] || { active: 'ellipse', inactive: 'ellipse-outline' };
  const iconName = focused ? icons.active : icons.inactive;
  return (
    <View style={{
      alignItems: 'center',
      justifyContent: 'center',
      top: Platform.OS === 'ios' ? 0 : 2,
    }}>
      {focused && (
        <View style={{
          position: 'absolute',
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: color + '18',
        }} />
      )}
      <Ionicons name={iconName as any} size={24} color={color} />
    </View>
  );
};

// ─── CUIDADORA FLOW ───

function HomeStackScreen({ onLogout }: { onLogout: () => void }) {
  const { colors } = useTheme();
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <HomeStack.Screen name="Dashboard">
        {({ navigation }) => (
          <DashboardScreen
            onNavigate={(screen, params) => navigation.navigate(screen as any, params)}
            onLogout={onLogout}
          />
        )}
      </HomeStack.Screen>
      <HomeStack.Screen
        name="Checkin"
        options={{ headerShown: true, headerTitle: 'Llegada', headerBackTitle: 'Volver', headerTintColor: colors.primary }}
      >
        {({ route, navigation }) => (
          <CheckinScreen route={route as any} onGoBack={() => navigation.goBack()} />
        )}
      </HomeStack.Screen>
      <HomeStack.Screen
        name="Pastilla"
        options={{ headerShown: true, headerTitle: 'Medicamento', headerBackTitle: 'Volver', headerTintColor: colors.primary }}
      >
        {({ route, navigation }) => (
          <PastillaScreen route={route as any} onGoBack={() => navigation.goBack()} />
        )}
      </HomeStack.Screen>
      <HomeStack.Screen
        name="Paseo"
        options={{ headerShown: true, headerTitle: 'Paseo', headerBackTitle: 'Volver', headerTintColor: colors.primary }}
      >
        {({ route, navigation }) => (
          <PaseoScreen route={route as any} onGoBack={() => navigation.goBack()} />
        )}
      </HomeStack.Screen>
      <HomeStack.Screen
        name="Comida"
        options={{ headerShown: true, headerTitle: 'Comida', headerBackTitle: 'Volver', headerTintColor: colors.primary }}
      >
        {({ route, navigation }) => (
          <ComidaScreen route={route as any} onGoBack={() => navigation.goBack()} />
        )}
      </HomeStack.Screen>
      <HomeStack.Screen
        name="Siesta"
        options={{ headerShown: true, headerTitle: 'Siesta', headerBackTitle: 'Volver', headerTintColor: colors.primary }}
      >
        {({ route, navigation }) => (
          <SiestaScreen route={route as any} onGoBack={() => navigation.goBack()} />
        )}
      </HomeStack.Screen>
      <HomeStack.Screen
        name="Valorar"
        options={{ headerShown: true, headerTitle: 'Valorar Jornada', headerBackTitle: 'Volver', headerTintColor: colors.primary }}
      >
        {() => <ValorarScreen />}
      </HomeStack.Screen>
    </HomeStack.Navigator>
  );
}

function CuidadoraTabs({ onLogout }: { onLogout: () => void }) {
  const { colors } = useTheme();
  return (
    <CuidadoraTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 88 : 68,
          backgroundColor: colors.tabBar,
          borderTopWidth: 0,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 12,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.3,
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingTop: 4,
        },
      }}
    >
      <CuidadoraTab.Screen
        name="Inicio"
        options={{ tabBarIcon: ({ focused, color }) => <TabBarIcon name="Inicio" focused={focused} color={color} /> }}
      >
        {() => <HomeStackScreen onLogout={onLogout} />}
      </CuidadoraTab.Screen>
      <CuidadoraTab.Screen
        name="Mapa"
        options={{ tabBarIcon: ({ focused, color }) => <TabBarIcon name="Mapa" focused={focused} color={color} /> }}
      >
        {() => <MapaZonaScreen />}
      </CuidadoraTab.Screen>
      <CuidadoraTab.Screen
        name="Calendario"
        options={{ tabBarIcon: ({ focused, color }) => <TabBarIcon name="Calendario" focused={focused} color={color} /> }}
      >
        {() => <CalendarScreen role="cuidadora" />}
      </CuidadoraTab.Screen>
      <CuidadoraTab.Screen
        name="Historial"
        options={{ tabBarIcon: ({ focused, color }) => <TabBarIcon name="Historial" focused={focused} color={color} /> }}
      >
        {() => <HistorialScreen />}
      </CuidadoraTab.Screen>
      <CuidadoraTab.Screen
        name="Chat"
        options={{ tabBarIcon: ({ focused, color }) => <TabBarIcon name="Chat" focused={focused} color={color} /> }}
      >
        {() => <ChatScreen role="cuidadora" />}
      </CuidadoraTab.Screen>
      <CuidadoraTab.Screen
        name="Perfil"
        options={{ tabBarIcon: ({ focused, color }) => <TabBarIcon name="Perfil" focused={focused} color={color} /> }}
      >
        {() => <PerfilAbueloScreen onLogout={onLogout} />}
      </CuidadoraTab.Screen>
    </CuidadoraTab.Navigator>
  );
}

// ─── FAMILIAR FLOW ───

function FamiliarTabs({ onLogout }: { onLogout: () => void }) {
  const { colors } = useTheme();
  return (
    <FamiliarTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.rolePrimary,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 88 : 68,
          backgroundColor: colors.tabBar,
          borderTopWidth: 0,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 12,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.3,
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingTop: 4,
        },
      }}
    >
      <FamiliarTab.Screen
        name="Resumen"
        options={{ tabBarIcon: ({ focused, color }) => <TabBarIcon name="Resumen" focused={focused} color={color} /> }}
      >
        {() => <FamiliarDashboardScreen onLogout={onLogout} />}
      </FamiliarTab.Screen>
      <FamiliarTab.Screen
        name="Medicación"
        options={{ tabBarIcon: ({ focused, color }) => <TabBarIcon name="Medicación" focused={focused} color={color} /> }}
      >
        {() => <MedicacionScreen />}
      </FamiliarTab.Screen>
      <FamiliarTab.Screen
        name="Calendario"
        options={{ tabBarIcon: ({ focused, color }) => <TabBarIcon name="Calendario" focused={focused} color={color} /> }}
      >
        {() => <CalendarScreen role="familiar" />}
      </FamiliarTab.Screen>
      <FamiliarTab.Screen
        name="Chat"
        options={{ tabBarIcon: ({ focused, color }) => <TabBarIcon name="Chat" focused={focused} color={color} /> }}
      >
        {() => <ChatScreen role="familiar" />}
      </FamiliarTab.Screen>
      <FamiliarTab.Screen
        name="Notas"
        options={{ tabBarIcon: ({ focused, color }) => <TabBarIcon name="Notas" focused={focused} color={color} /> }}
      >
        {() => <NotasScreen role="familiar" />}
      </FamiliarTab.Screen>
      <FamiliarTab.Screen
        name="Informe"
        options={{ tabBarIcon: ({ focused, color }) => <TabBarIcon name="Informe" focused={focused} color={color} /> }}
      >
        {() => <InformeScreen />}
      </FamiliarTab.Screen>
    </FamiliarTab.Navigator>
  );
}

// ─── APP ROOT ───

function AppContent() {
  const { isDark, colors, setRole } = useTheme();
  const [showSplash, setShowSplash] = useState(true);
  const [selectedRole, setSelectedRole] = useState<'cuidadora' | 'familiar' | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  const navTheme = isDark ? {
    ...DarkTheme,
    colors: { ...DarkTheme.colors, background: colors.background, card: colors.card, text: colors.text, border: colors.border, primary: colors.primary },
  } : {
    ...DefaultTheme,
    colors: { ...DefaultTheme.colors, background: colors.background, card: colors.card, text: colors.text, border: colors.border, primary: colors.primary },
  };

  const handleSplashFinish = () => {
    setShowSplash(false);
  };

  const handleSelectRole = (role: 'cuidadora' | 'familiar') => {
    setSelectedRole(role);
    setRole(role);
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    await authService.logout();
    setIsAuthenticated(false);
    setSelectedRole(null);
    setRole('cuidadora');
  };

  const handleGoBack = () => {
    setShowRegister(false);
    setSelectedRole(null);
  };

  const handleShowRegister = () => {
    setShowRegister(true);
  };

  const handleRegisterSuccess = () => {
    setShowRegister(false);
    setIsAuthenticated(true);
  };

  const handleBackToLogin = () => {
    setShowRegister(false);
  };

  // Splash
  if (showSplash) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <SplashScreen onFinish={handleSplashFinish} />
      </SafeAreaProvider>
    );
  }

  // Role Selection
  if (!selectedRole) {
    return (
      <SafeAreaProvider>
        <StatusBar style={colors.statusBar} />
        <RoleSelectionScreen onSelectRole={handleSelectRole} />
      </SafeAreaProvider>
    );
  }

  // Not authenticated yet
  if (!isAuthenticated) {
    return (
      <SafeAreaProvider>
        <StatusBar style={colors.statusBar} />
        {selectedRole === 'cuidadora' ? (
          <NavigationContainer theme={navTheme}>
            <RootStack.Navigator screenOptions={{ headerShown: false }}>
              <RootStack.Screen name="Login">
                {() => <LoginScreen onLoginSuccess={handleLoginSuccess} />}
              </RootStack.Screen>
            </RootStack.Navigator>
          </NavigationContainer>
        ) : showRegister ? (
          <FamiliarRegisterScreen onRegisterSuccess={handleRegisterSuccess} onGoBack={handleBackToLogin} />
        ) : (
          <FamiliarLoginScreen onLoginSuccess={handleLoginSuccess} onGoBack={handleGoBack} onRegister={handleShowRegister} />
        )}
      </SafeAreaProvider>
    );
  }

  // Authenticated → show tabs based on role
  return (
    <SafeAreaProvider>
      <StatusBar style={colors.statusBar} />
      <NavigationContainer theme={navTheme}>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          {selectedRole === 'cuidadora' ? (
            <RootStack.Screen name="CuidadoraTabs">
              {() => <CuidadoraTabs onLogout={handleLogout} />}
            </RootStack.Screen>
          ) : (
            <RootStack.Screen name="FamiliarTabs">
              {() => <FamiliarTabs onLogout={handleLogout} />}
            </RootStack.Screen>
          )}
        </RootStack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
