import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Building2, Inbox, TrendingUp, Truck, LogOut, PackageCheck, AlertCircle, RefreshCw, Boxes } from 'lucide-react-native';
import { colors, fonts } from '../theme';
import AnimatedButton from '../components/AnimatedButton';
import { confirmAndLogout } from '../lib/auth';

export default function LogisticaDashboardScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? colors.dark : colors.light;

  const [nombre, setNombre] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // KPIs
  const [pedidosPendientes, setPedidosPendientes] = useState(0);
  const [entregasEnTransito, setEntregasEnTransito] = useState(0);
  const [stockMatriz, setStockMatriz] = useState({ fardos: 0, cajas: 0 });

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const savedRol = await AsyncStorage.getItem('usuario_rol');
      if (savedRol !== 'LOGISTICA' && savedRol !== 'CREADOR' && savedRol !== 'ADMIN') {
        Alert.alert('Acceso Denegado', 'Esta pantalla es exclusiva para el Gestor de Logística.');
        router.replace('/');
        return;
      }
      const savedNombre = await AsyncStorage.getItem('usuario_nombre');
      if (savedNombre) setNombre(savedNombre);

      // Pedidos pendientes de sedes
      const { count: pedidosCount } = await supabase
        .from('pedidos_sede')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'PENDIENTE');
      setPedidosPendientes(pedidosCount || 0);

      // Entregas en tránsito / pendientes de recepción
      const { count: entregasCount } = await supabase
        .from('entregas')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'PENDIENTE_RECEPCION');
      setEntregasEnTransito(entregasCount || 0);

      // Stock de almacén matriz
      const { data: central } = await supabase
        .from('almacen_central')
        .select('agua_stock, gatorade_stock')
        .eq('id', 1)
        .single();
      if (central) {
        const fardosCalc = Math.floor((central.agua_stock || 0) / 20);
        const cajasCalc = Math.floor((central.gatorade_stock || 0) / 12);
        setStockMatriz({ fardos: fardosCalc, cajas: cajasCalc });
      }
    } catch (e) {
      console.log('Error loading logistica dashboard data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const cerrarSesion = () => {
    confirmAndLogout('¿Seguro que deseas salir del Panel de Logística?');
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        
        {/* Cabecera */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={[styles.greeting, { color: theme.text }]}>Centro Logístico</Text>
              <Text style={[styles.subtitle, { color: theme.textMuted }]}>Gestor: {nombre || 'Logística'}</Text>
            </View>
            <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh} disabled={refreshing}>
              <RefreshCw color="#059669" size={20} />
            </TouchableOpacity>
          </View>

          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>🚚 NIVEL: GESTOR DE LOGÍSTICA</Text>
          </View>
        </View>

        {/* Alerta de Pedidos si hay pendientes */}
        {pedidosPendientes > 0 && (
          <AnimatedButton
            style={styles.alertCard}
            onPress={() => router.push('/admin/pedidos_logistica' as any)}
          >
            <View style={styles.alertIconBox}>
              <AlertCircle color="white" size={24} />
            </View>
            <View style={styles.alertTexts}>
              <Text style={styles.alertTitle}>¡Tienes {pedidosPendientes} Pedido(s) de Sedes!</Text>
              <Text style={styles.alertSub}>Toca aquí para revisar y preparar el despacho</Text>
            </View>
          </AnimatedButton>
        )}

        {/* Tarjeta de Stock Almacén Central */}
        <View style={[styles.kpiCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.kpiHeader}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#ecfdf5' }]}>
              <Building2 color="#059669" size={24} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.kpiTitle, { color: theme.text }]}>Stock en Almacén Matriz</Text>
              <Text style={[styles.kpiSub, { color: theme.textMuted }]}>Inventario central disponible</Text>
            </View>
          </View>

          <View style={styles.kpiValuesRow}>
            <View style={styles.kpiValueItem}>
              <Text style={[styles.kpiNumber, { color: '#0ea5e9' }]}>{stockMatriz.fardos}</Text>
              <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>Fardos de Agua (x20)</Text>
            </View>
            <View style={styles.kpiDivider} />
            <View style={styles.kpiValueItem}>
              <Text style={[styles.kpiNumber, { color: '#d97706' }]}>{stockMatriz.cajas}</Text>
              <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>Cajas de Gatorade (x12)</Text>
            </View>
          </View>
        </View>

        {/* Acciones de Operación Logística */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Operaciones Logísticas</Text>

        <View style={styles.grid}>
          {/* Almacén Matriz */}
          <AnimatedButton
            style={[styles.actionCard, { backgroundColor: '#0284c7' }]}
            onPress={() => router.push('/admin/almacen_central' as any)}
          >
            <Building2 color="white" size={30} />
            <Text style={styles.actionTitle}>Almacén Matriz</Text>
            <Text style={styles.actionSubtitle}>Stock central & compras mayoristas</Text>
          </AnimatedButton>

          {/* Bandeja de Pedidos */}
          <AnimatedButton
            style={[styles.actionCard, { backgroundColor: '#059669' }]}
            onPress={() => router.push('/admin/pedidos_logistica' as any)}
          >
            <Inbox color="white" size={30} />
            <Text style={styles.actionTitle}>Bandeja de Pedidos</Text>
            <Text style={styles.actionSubtitle}>
              {pedidosPendientes > 0 ? `${pedidosPendientes} pendientes de atención` : 'Solicitudes de sedes al día'}
            </Text>
          </AnimatedButton>
        </View>

        <View style={styles.grid}>
          {/* Métricas y Proyecciones */}
          <AnimatedButton
            style={[styles.actionCard, { backgroundColor: '#4f46e5' }]}
            onPress={() => router.push('/admin/metricas_logistica' as any)}
          >
            <TrendingUp color="white" size={30} />
            <Text style={styles.actionTitle}>Métricas & Proyección</Text>
            <Text style={styles.actionSubtitle}>Autonomía de sedes y mermas</Text>
          </AnimatedButton>

          {/* Registrar Entrega / Despacho */}
          <AnimatedButton
            style={[styles.actionCard, { backgroundColor: '#d97706' }]}
            onPress={() => router.push('/delivery')}
          >
            <Truck color="white" size={30} />
            <Text style={styles.actionTitle}>Registrar Entrega</Text>
            <Text style={styles.actionSubtitle}>Despachar fardos/cajas con foto</Text>
          </AnimatedButton>
        </View>

        {/* Inventario de Materiales & Indumentaria por Sede */}
        <AnimatedButton
          style={[styles.rowActionCard, { backgroundColor: '#064e3b', borderColor: '#10b981', borderWidth: 1.5, marginBottom: 12 }]}
          onPress={() => router.push('/inventario_materiales')}
        >
          <View style={[styles.rowIconBox, { backgroundColor: '#10b981' }]}>
            <Boxes color="#ffffff" size={24} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: '#ffffff' }]}>Inventario de Materiales & Tallas</Text>
            <Text style={[styles.rowSubtitle, { color: '#a7f3d0' }]}>
              Control mensual de conos, aros, varillas y uniformes por sede
            </Text>
          </View>
        </AnimatedButton>

        {/* Historial de Entregas */}
        <AnimatedButton
          style={[styles.rowActionCard, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={() => router.push('/admin/logistics_history' as any)}
        >
          <View style={[styles.rowIconBox, { backgroundColor: '#ecfdf5' }]}>
            <PackageCheck color="#059669" size={24} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: theme.text }]}>Historial de Entregas</Text>
            <Text style={[styles.rowSubtitle, { color: theme.textMuted }]}>
              {entregasEnTransito > 0 ? `${entregasEnTransito} entregas en tránsito` : 'Seguimiento de despachos a sedes'}
            </Text>
          </View>
        </AnimatedButton>

        {/* Cerrar Sesión */}
        <View style={styles.bottomSection}>
          <AnimatedButton
            style={[styles.logoutBtn, { backgroundColor: theme.dangerLight, borderColor: theme.dangerLight }]}
            onPress={cerrarSesion}
          >
            <LogOut color={theme.danger} size={20} />
            <Text style={[styles.logoutText, { color: theme.danger }]}>Cerrar Sesión</Text>
          </AnimatedButton>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 20, marginTop: 10 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 28, fontFamily: fonts.extraBold },
  subtitle: { fontSize: 15, fontFamily: fonts.medium, marginTop: 2 },
  refreshBtn: { padding: 10, borderRadius: 12, backgroundColor: '#ecfdf5' },
  
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    marginTop: 10,
  },
  roleBadgeText: { color: 'white', fontSize: 11, fontFamily: fonts.bold, letterSpacing: 0.5 },

  alertCard: {
    backgroundColor: '#f59e0b',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  alertIconBox: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 12, marginRight: 14 },
  alertTexts: { flex: 1 },
  alertTitle: { color: 'white', fontFamily: fonts.bold, fontSize: 15 },
  alertSub: { color: 'rgba(255,255,255,0.9)', fontFamily: fonts.regular, fontSize: 12, marginTop: 2 },

  kpiCard: {
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  kpiHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  kpiIconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  kpiTitle: { fontSize: 16, fontFamily: fonts.bold },
  kpiSub: { fontSize: 12, fontFamily: fonts.regular, marginTop: 1 },
  kpiValuesRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  kpiValueItem: { flex: 1, alignItems: 'center' },
  kpiNumber: { fontSize: 24, fontFamily: fonts.extraBold },
  kpiLabel: { fontSize: 12, fontFamily: fonts.medium, marginTop: 2 },
  kpiDivider: { width: 1, height: 35, backgroundColor: '#e2e8f0' },

  sectionTitle: { fontSize: 18, fontFamily: fonts.bold, marginBottom: 15 },
  grid: { flexDirection: 'row', gap: 14, marginBottom: 14 },
  actionCard: {
    flex: 1,
    padding: 20,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionTitle: { color: 'white', fontSize: 17, fontFamily: fonts.bold, marginTop: 14 },
  actionSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontFamily: fonts.regular, marginTop: 4 },

  rowActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 6,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  rowIconBox: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  rowTitle: { fontSize: 16, fontFamily: fonts.bold },
  rowSubtitle: { fontSize: 12, fontFamily: fonts.regular, marginTop: 2 },

  bottomSection: { marginTop: 10 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
  },
  logoutText: { fontSize: 15, fontFamily: fonts.semiBold },
});
