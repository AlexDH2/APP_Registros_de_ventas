import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme, View, ActivityIndicator } from 'react-native';
import * as Updates from 'expo-updates';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
} from '@expo-google-fonts/poppins';
import { colors } from '../theme';

export default function Layout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? colors.dark : colors.light;

  useEffect(() => {
    async function checkAutoUpdates() {
      if (__DEV__ || !Updates.isEnabled) return;
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch (e) {
        // Silencioso si no hay conexión
      }
    }
    checkAutoUpdates();
  }, []);
  
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{
        headerTitleStyle: { fontFamily: 'Poppins_600SemiBold' },
        headerStyle: { backgroundColor: colors.light.navBg },
        headerTintColor: colors.light.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.light.background },
      }}>
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
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
