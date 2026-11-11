import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
} from '@expo-google-fonts/poppins';
import { ThemeProvider, useAppTheme } from '../context/ThemeContext';

function NavigationStack() {
  const { theme, isDark } = useAppTheme();

  return (
    <>
      <Stack
        screenOptions={{
          headerTitleStyle: { fontFamily: 'Poppins_600SemiBold' },
          headerStyle: { backgroundColor: theme.navBg },
          headerTintColor: theme.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Login', headerShown: false }} />
        <Stack.Screen name="home" options={{ title: 'Dashboard', headerBackVisible: false, headerShown: false }} />
        <Stack.Screen name="sale" options={{ title: 'Registrar Venta' }} />
        <Stack.Screen name="inventory" options={{ title: 'Inventario de Sede' }} />
        <Stack.Screen name="caja" options={{ title: 'Gestión de Caja' }} />
        <Stack.Screen name="history" options={{ title: 'Historial de Hoy' }} />
        <Stack.Screen name="summary" options={{ title: 'Resumen de Caja' }} />
        <Stack.Screen name="delivery" options={{ title: 'Reparto Logístico' }} />
        <Stack.Screen name="seller_sedes" options={{ title: 'Mis Sedes', headerBackVisible: false }} />
        <Stack.Screen name="logistica_sede" options={{ title: 'Logística de Sede' }} />
        <Stack.Screen name="logistica_dashboard" options={{ title: 'Panel de Logística', headerBackVisible: false }} />
        <Stack.Screen name="admin/dashboard" options={{ title: 'Panel Maestro', headerBackVisible: false }} />
        <Stack.Screen name="admin/almacen_central" options={{ title: 'Almacén Central' }} />
        <Stack.Screen name="admin/pedidos_logistica" options={{ title: 'Pedidos de Sedes' }} />
        <Stack.Screen name="admin/metricas_logistica" options={{ title: 'Métricas & Proyección' }} />
        <Stack.Screen name="admin/catalogo" options={{ title: 'Catálogo de Productos' }} />
        <Stack.Screen name="admin/users" options={{ title: 'Gestión de Personal' }} />
        <Stack.Screen name="admin/prices" options={{ title: 'Configurar Precios' }} />
        <Stack.Screen name="admin/anulaciones" options={{ title: 'Auditoría Anulaciones' }} />
        <Stack.Screen name="admin/logistics_history" options={{ title: 'Historial de Entregas' }} />
        <Stack.Screen name="admin/ventas_sedes" options={{ title: 'Reporte de Ventas por Sede' }} />
        <Stack.Screen name="entradas_venta" options={{ title: 'Boletería de Entradas', headerShown: false }} />
        <Stack.Screen name="admin/eventos_entradas" options={{ title: 'Control de Evento & Entradas', headerShown: false }} />
        <Stack.Screen name="entrevistas" options={{ title: 'Entrevistas & Staff', headerShown: false }} />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

export default function Layout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0d1b2a' }}>
        <ActivityIndicator size="large" color="#f59e0b" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <NavigationStack />
    </ThemeProvider>
  );
}
