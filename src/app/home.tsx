import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator, useColorScheme, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ShoppingCart, Package, LogOut, MapPin, Truck, AlertTriangle, BarChart2, WifiOff, Droplets, Zap, RefreshCw, Clock, Ticket, X } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { getOfflineSales, syncOfflineSales, saveOfflineSale } from '../lib/offlineSync';
import { colors, fonts } from '../theme';
import AnimatedButton from '../components/AnimatedButton';
import { confirmAndLogout } from '../lib/auth';

type LowStockAlert = {
  sede_nombre: string;
  agua: number;
  gatorade: number;
};

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? colors.dark : colors.light;

  const [sedeNombre, setSedeNombre] = useState<string>('');
  const [usuarioNombre, setUsuarioNombre] = useState<string>('');
  const [usuarioRol, setUsuarioRol] = useState<string>('');
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([]);
  const [offlineCount, setOfflineCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [fastSelling, setFastSelling] = useState(false);

  const [stock, setStock] = useState({ agua: 0, gatorade: 0 });
  const [precios, setPrecios] = useState({ agua: 2, gatorade: 3 });
  const [entregasPendientesCount, setEntregasPendientesCount] = useState(0);
  const [ultimasVentas, setUltimasVentas] = useState<any[]>([]);
  const [refreshingVentas, setRefreshingVentas] = useState(false);
  const [swappingId, setSwappingId] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadData();
      checkOfflineQueue();
    }, [])
  );

  const loadData = async () => {
    const nombre = await AsyncStorage.getItem('sede_nombre');
    const uNombre = await AsyncStorage.getItem('usuario_nombre');
    const uRol = await AsyncStorage.getItem('usuario_rol');
    if (nombre) setSedeNombre(nombre);
    if (uNombre) setUsuarioNombre(uNombre);
    if (uRol) setUsuarioRol(uRol);
    checkLowStock();
    loadStockAndPrices();
    checkEntregasPendientes();
    loadUltimasVentas();
  };

  const loadUltimasVentas = async () => {
    try {
      setRefreshingVentas(true);
      const savedSedeId = await AsyncStorage.getItem('sede_id');
      if (!savedSedeId) {
        setUltimasVentas([]);
        return;
      }

      const { data, error } = await supabase
        .from('ventas')
        .select('*')
        .eq('sede_id', parseInt(savedSedeId))
        .neq('estado', 'ANULADA')
        .order('id', { ascending: false })
        .limit(15);

      if (error) throw error;

      if (data && data.length > 0) {
        // Filtrar ventas del día o recientes (máximo 16 horas) que contengan bebidas y estén COMPLETADAS
        const valid = data.filter(v => {
          const diffHours = (Date.now() - new Date(v.fecha).getTime()) / (1000 * 60 * 60);
          const isCompletada = v.estado === 'COMPLETADA' || !v.estado;
          return isCompletada && diffHours < 16 && ((v.agua_vendida || 0) > 0 || (v.gatorade_vendida || 0) > 0);
        }).slice(0, 5);

        setUltimasVentas(valid);
      } else {
        setUltimasVentas([]);
      }
    } catch (e) {
      console.log('Error loading ultimas ventas:', e);
      setUltimasVentas([]);
    } finally {
      setRefreshingVentas(false);
    }
  };

  const checkEntregasPendientes = async () => {
    try {
      const savedSedeId = await AsyncStorage.getItem('sede_id');
      if (savedSedeId) {
        const { count } = await supabase
          .from('entregas')
          .select('*', { count: 'exact', head: true })
          .eq('sede_destino_id', parseInt(savedSedeId))
          .eq('estado', 'PENDIENTE_RECEPCION');
        setEntregasPendientesCount(count || 0);
      }
    } catch (e) {
      console.log('Error checking entregas pendientes:', e);
    }
  };

  const loadStockAndPrices = async () => {
    const savedSedeId = await AsyncStorage.getItem('sede_id');
    if (savedSedeId) {
      const { data: inv } = await supabase.from('inventario_bebidas').select('agua_cantidad, gatorade_cantidad').eq('sede_id', parseInt(savedSedeId)).single();
      if (inv) setStock({ agua: inv.agua_cantidad, gatorade: inv.gatorade_cantidad });
    }
    const { data: config } = await supabase.from('configuracion_precios').select('precio_agua, precio_gatorade').single();
    if (config) setPrecios({ agua: config.precio_agua, gatorade: config.precio_gatorade });
  };

  const checkOfflineQueue = async () => {
    const queue = await getOfflineSales();
    setOfflineCount(queue.length);
  };

  const handleSync = async () => {
    setSyncing(true);
    const synced = await syncOfflineSales();
    setSyncing(false);
    if (synced > 0) {
      Alert.alert('Éxito', `Se subieron ${synced} ventas pendientes a la nube.`);
    } else {
      Alert.alert('Aviso', 'No se pudo sincronizar. Revisa tu conexión a Internet.');
    }
    checkOfflineQueue();
    loadData();
  };

  const checkLowStock = async () => {
    try {
      const uRol = await AsyncStorage.getItem('usuario_rol');
      // Solo Creador, Administradores y Gestor de Logística deben ver alertas globales de stock
      if (uRol !== 'CREADOR' && uRol !== 'ADMIN' && uRol !== 'LOGISTICA') {
        setLowStockAlerts([]);
        return;
      }

      const { data, error } = await supabase.from('inventario_bebidas').select('agua_cantidad, gatorade_cantidad, sedes(nombre)');
      if (error) throw error;
      const alerts: LowStockAlert[] = [];
      data?.forEach((inv: any) => {
        if (inv.agua_cantidad < 5 || inv.gatorade_cantidad < 5) {
          alerts.push({
            sede_nombre: inv.sedes?.nombre || 'Sede sin nombre',
            agua: inv.agua_cantidad,
            gatorade: inv.gatorade_cantidad
          });
        }
      });
      setLowStockAlerts(alerts);
    } catch (e) {
      console.log('Error checking stock:', e);
    }
  };

  const handleFastSale = async (tipo: 'agua' | 'gatorade') => {
    if (tipo === 'agua' && stock.agua <= 0) return Alert.alert('Agotado', 'No te queda Agua');
    if (tipo === 'gatorade' && stock.gatorade <= 0) return Alert.alert('Agotado', 'No te queda Gatorade');

    setFastSelling(true);
    try {
      const savedSedeId = await AsyncStorage.getItem('sede_id');
      const nombreVendedor = await AsyncStorage.getItem('usuario_nombre');
      const cajaIdStr = await AsyncStorage.getItem('caja_id');
      const sedeId = parseInt(savedSedeId || '0');
      const cajaId = cajaIdStr ? parseInt(cajaIdStr) : null;
      
      const aguaV = tipo === 'agua' ? 1 : 0;
      const gatV = tipo === 'gatorade' ? 1 : 0;
      const monto = tipo === 'agua' ? precios.agua : precios.gatorade;

      const { data: ventaCreada, error: insertError } = await supabase.from('ventas').insert([{
        sede_id: sedeId,
        caja_id: cajaId,
        fecha: new Date().toISOString(),
        metodo_pago: 'Efectivo',
        banco: null,
        agua_vendida: aguaV,
        gatorade_vendida: gatV,
        url_captura: null,
        monto: monto,
        descripcion: `Venta Rápida 1 Clic (Efectivo Exacto)`,
        vendedor: nombreVendedor || 'Vendedor Desconocido',
        estado: 'COMPLETADA'
      }]).select().single();
      
      if (insertError) throw insertError;
      if (ventaCreada) {
        setUltimasVentas(prev => [ventaCreada, ...prev.filter(v => v.id !== ventaCreada.id)].slice(0, 5));
      }

      // Descontar inventario de forma atómica en Supabase
      const { error: rpcError } = await supabase.rpc('decrementar_stock_sede', {
        p_sede_id: sedeId,
        p_agua: aguaV,
        p_gatorade: gatV
      });

      if (rpcError) {
        // Fallback de compatibilidad
        const { data: inventario } = await supabase.from('inventario_bebidas').select('*').eq('sede_id', sedeId).single();
        if (inventario) {
          await supabase.from('inventario_bebidas').update({
            agua_cantidad: Math.max(0, inventario.agua_cantidad - aguaV),
            gatorade_cantidad: Math.max(0, inventario.gatorade_cantidad - gatV)
          }).eq('id', inventario.id);
        }
      }
      setStock(prev => ({ agua: Math.max(0, prev.agua - aguaV), gatorade: Math.max(0, prev.gatorade - gatV) }));
      loadUltimasVentas();
    } catch (e) {
      try {
        const savedSedeId = await AsyncStorage.getItem('sede_id');
        const nombreVendedor = await AsyncStorage.getItem('usuario_nombre');
        const cajaIdStr = await AsyncStorage.getItem('caja_id');
        const cajaId = cajaIdStr ? parseInt(cajaIdStr) : null;
        const aguaV = tipo === 'agua' ? 1 : 0;
        const gatV = tipo === 'gatorade' ? 1 : 0;
        const monto = tipo === 'agua' ? precios.agua : precios.gatorade;

        await saveOfflineSale({
          sede_id: parseInt(savedSedeId || '0'),
          caja_id: cajaId,
          fecha: new Date().toISOString(),
          metodo_pago: 'Efectivo',
          banco: null,
          agua_vendida: aguaV,
          gatorade_vendida: gatV,
          monto: monto,
          descripcion: `Venta Rápida 1 Clic (Efectivo Exacto)`,
          vendedor: nombreVendedor || 'Vendedor Desconocido',
          estado: 'COMPLETADA',
          imageUri: null
        });

        setStock(prev => ({ agua: prev.agua - aguaV, gatorade: prev.gatorade - gatV }));
        checkOfflineQueue();
      } catch (offlineErr) {
        Alert.alert('Error', 'No se pudo procesar la venta rápida');
      }
    } finally {
      setFastSelling(false);
    }
  };

  const formatRelativeTime = (isoDate: string) => {
    if (!isoDate) return '';
    try {
      const date = new Date(isoDate);
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
      if (diffSec < 60) return 'Hace un momento';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `Hace ${diffMin} min`;
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  const getMetodoPagoBg = (metodo: string) => {
    if (!metodo) return '#f1f5f9';
    const m = metodo.toLowerCase();
    if (m.includes('efectivo')) return '#dcfce7';
    if (m.includes('yape')) return '#f3e8ff';
    if (m.includes('plin')) return '#cffafe';
    return '#f1f5f9';
  };

  const getMetodoPagoColor = (metodo: string) => {
    if (!metodo) return '#475569';
    const m = metodo.toLowerCase();
    if (m.includes('efectivo')) return '#15803d';
    if (m.includes('yape')) return '#7e22ce';
    if (m.includes('plin')) return '#0891b2';
    return '#475569';
  };

  const confirmarCambioProducto = (venta: any, direccion: 'agua_a_gatorade' | 'gatorade_a_agua') => {
    if (!venta) return;
    const diff = (precios.gatorade || 3) - (precios.agua || 2);
    const hora = formatRelativeTime(venta.fecha);

    if (direccion === 'agua_a_gatorade') {
      if (stock.gatorade <= 0) {
        return Alert.alert('Stock Agotado', 'No te queda Gatorade en stock para realizar el cambio.');
      }
      Alert.alert(
        '¿Cambiar Agua por Gatorade?',
        `Venta #${venta.id} (${hora})\n\nEl alumno devuelve el Agua y se lleva un Gatorade.\n\n• Cobrar al alumno: +S/ ${diff.toFixed(2)} en efectivo\n• Stock: Se suma +1 Agua y se descuenta -1 Gatorade`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: `Confirmar (+S/ ${diff.toFixed(2)})`,
            onPress: () => ejecutarCambioProducto(venta, 'agua_a_gatorade', diff),
          },
        ]
      );
    } else {
      if (stock.agua <= 0) {
        return Alert.alert('Stock Agotado', 'No te queda Agua en stock para realizar el cambio.');
      }
      Alert.alert(
        '¿Cambiar Gatorade por Agua?',
        `Venta #${venta.id} (${hora})\n\nEl alumno devuelve el Gatorade y se lleva un Agua.\n\n• Devolver al alumno: S/ ${diff.toFixed(2)}\n• Stock: Se suma +1 Gatorade y se descuenta -1 Agua`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: `Confirmar (Devolver S/ ${diff.toFixed(2)})`,
            onPress: () => ejecutarCambioProducto(venta, 'gatorade_a_agua', diff),
          },
        ]
      );
    }
  };

  const ejecutarCambioProducto = async (
    venta: any,
    direccion: 'agua_a_gatorade' | 'gatorade_a_agua',
    diff: number
  ) => {
    if (!venta) return;
    setSwappingId(venta.id);
    try {
      const savedSedeId = await AsyncStorage.getItem('sede_id');
      const sedeId = parseInt(savedSedeId || '0');

      if (direccion === 'agua_a_gatorade') {
        const nuevoAgua = Math.max(0, (venta.agua_vendida || 0) - 1);
        const nuevoGatorade = (venta.gatorade_vendida || 0) + 1;
        const nuevoMonto = Number(venta.monto) + diff;
        const nuevaDesc = `${venta.descripcion || 'Venta'} | 🔄 Cambio: Agua ➔ Gatorade (+S/ ${diff.toFixed(2)})`;

        const { data: updatedVenta, error: vErr } = await supabase
          .from('ventas')
          .update({
            agua_vendida: nuevoAgua,
            gatorade_vendida: nuevoGatorade,
            monto: nuevoMonto,
            descripcion: nuevaDesc,
          })
          .eq('id', venta.id)
          .select()
          .single();

        if (vErr) throw vErr;

        const { data: inv } = await supabase
          .from('inventario_bebidas')
          .select('*')
          .eq('sede_id', sedeId)
          .single();

        if (inv) {
          await supabase
            .from('inventario_bebidas')
            .update({
              agua_cantidad: inv.agua_cantidad + 1,
              gatorade_cantidad: Math.max(0, inv.gatorade_cantidad - 1),
            })
            .eq('id', inv.id);
        }

        setStock(prev => ({
          agua: prev.agua + 1,
          gatorade: Math.max(0, prev.gatorade - 1),
        }));

        setUltimasVentas(prev => prev.map(v => v.id === venta.id ? updatedVenta : v));

        Alert.alert(
          '¡Cambio Registrado con Éxito!',
          `✅ Se ajustó el stock (+1 Agua, -1 Gatorade).\n\n💵 COBRASTE S/ ${diff.toFixed(2)} ADICIONAL AL ALUMNO.`
        );
      } else {
        const nuevoAgua = (venta.agua_vendida || 0) + 1;
        const nuevoGatorade = Math.max(0, (venta.gatorade_vendida || 0) - 1);
        const nuevoMonto = Math.max(0, Number(venta.monto) - diff);
        const nuevaDesc = `${venta.descripcion || 'Venta'} | 🔄 Cambio: Gatorade ➔ Agua (-S/ ${diff.toFixed(2)})`;

        const { data: updatedVenta, error: vErr } = await supabase
          .from('ventas')
          .update({
            agua_vendida: nuevoAgua,
            gatorade_vendida: nuevoGatorade,
            monto: nuevoMonto,
            descripcion: nuevaDesc,
          })
          .eq('id', venta.id)
          .select()
          .single();

        if (vErr) throw vErr;

        const { data: inv } = await supabase
          .from('inventario_bebidas')
          .select('*')
          .eq('sede_id', sedeId)
          .single();

        if (inv) {
          await supabase
            .from('inventario_bebidas')
            .update({
              agua_cantidad: Math.max(0, inv.agua_cantidad - 1),
              gatorade_cantidad: inv.gatorade_cantidad + 1,
            })
            .eq('id', inv.id);
        }

        setStock(prev => ({
          agua: Math.max(0, prev.agua - 1),
          gatorade: prev.gatorade + 1,
        }));

        setUltimasVentas(prev => prev.map(v => v.id === venta.id ? updatedVenta : v));

        Alert.alert(
          '¡Cambio Registrado con Éxito!',
          `✅ Se ajustó el stock (-1 Agua, +1 Gatorade).\n\n💵 DEVUELVE S/ ${diff.toFixed(2)} AL ALUMNO.`
        );
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo realizar el cambio');
    } finally {
      setSwappingId(null);
    }
  };

  const cambiarSede = async () => {
    const rol = await AsyncStorage.getItem('usuario_rol');
    if (rol === 'CREADOR' || rol === 'ADMIN') router.replace('/admin/dashboard' as any);
    else if (rol === 'LOGISTICA') router.replace('/logistica_dashboard' as any);
    else router.replace('/seller_sedes' as any);
  };

  const cerrarSesionTotal = () => {
    confirmAndLogout();
  };

  const dynamicStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    card: {
      backgroundColor: theme.card,
      padding: 20,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 10,
      elevation: 2,
    },
    rowCard: {
      backgroundColor: theme.card,
      padding: 16,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    smallCard: {
      backgroundColor: theme.card,
      padding: 16,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      flex: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    cardTitle: {
      fontSize: 18,
      fontFamily: fonts.bold,
      color: theme.text,
    },
    cardSubtitle: {
      fontSize: 13,
      fontFamily: fonts.regular,
      color: theme.textMuted,
      marginTop: 2,
    },
    fastCard: {
      flex: 1,
      backgroundColor: theme.card,
      padding: 18,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.03,
      shadowRadius: 10,
      elevation: 1,
    },
    greeting: { fontSize: 32, fontFamily: fonts.extraBold, color: theme.text, marginBottom: 10 },
    sectionTitle: { fontSize: 18, fontFamily: fonts.bold, color: theme.text, marginBottom: 15 },
    iconWrapper: {
      width: 50,
      height: 50,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    iconWrapperSmall: {
      width: 42,
      height: 42,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 10,
    },
    iconWrapperRow: {
      width: 44,
      height: 44,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 14,
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        
        <View style={styles.header}>
          <Text style={dynamicStyles.greeting}>Hola{usuarioNombre ? `, ${usuarioNombre}` : ''}!</Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 }}>
            <View style={[styles.locationBadge, { backgroundColor: theme.primaryLight }]}>
              <MapPin color={theme.primary} size={16} />
              <Text style={[styles.locationText, { color: theme.primary }]}>{sedeNombre}</Text>
            </View>
            <View style={[styles.roleBadgeSmall, { backgroundColor: usuarioRol === 'CREADOR' || usuarioRol === 'ADMIN' ? '#fef3c7' : usuarioRol === 'LOGISTICA' ? '#ecfdf5' : '#eff6ff' }]}>
              <Text style={[styles.roleBadgeSmallText, { color: usuarioRol === 'CREADOR' || usuarioRol === 'ADMIN' ? '#b45309' : usuarioRol === 'LOGISTICA' ? '#059669' : '#2563eb' }]}>
                {usuarioRol === 'CREADOR' || usuarioRol === 'ADMIN' ? '👑 Creador' : usuarioRol === 'LOGISTICA' ? '🚚 Logística' : '👨‍🏫 Auxiliar / Profesor'}
              </Text>
            </View>
          </View>
        </View>

        {offlineCount > 0 && (
          <AnimatedButton style={[styles.offlineAlert, { backgroundColor: theme.warning }]} onPress={handleSync} disabled={syncing}>
            <View style={styles.offlineIconBox}>
              <WifiOff color="white" size={20} />
            </View>
            <View style={styles.offlineTextContainer}>
              <Text style={styles.offlineTitle}>Ventas Pendientes ({offlineCount})</Text>
              <Text style={styles.offlineSub}>Toca aquí para sincronizarlas</Text>
            </View>
            {syncing && <ActivityIndicator color="white" />}
          </AnimatedButton>
        )}

        {entregasPendientesCount > 0 && (
          <AnimatedButton
            style={[styles.offlineAlert, { backgroundColor: '#10b981' }]}
            onPress={() => router.push('/logistica_sede')}
          >
            <View style={styles.offlineIconBox}>
              <Package color="white" size={24} />
            </View>
            <View style={styles.offlineTextContainer}>
              <Text style={styles.offlineTitle}>¡Tienes {entregasPendientesCount} Entrega(s) por Recibir!</Text>
              <Text style={styles.offlineSub}>Toca aquí para verificar y sumar a tu stock</Text>
            </View>
          </AnimatedButton>
        )}

        {(usuarioRol === 'CREADOR' || usuarioRol === 'ADMIN' || usuarioRol === 'LOGISTICA') && lowStockAlerts.length > 0 && (
          <View style={[styles.alertContainer, { backgroundColor: theme.dangerLight, borderColor: theme.danger }]}>
            <View style={styles.alertHeader}>
              <AlertTriangle color={theme.danger} size={20} />
              <Text style={[styles.alertTitle, { color: theme.danger }]}>¡Atención! Stock Bajo</Text>
            </View>
            {lowStockAlerts.map((alerta, idx) => (
              <Text key={idx} style={[styles.alertText, { color: theme.danger }]}>
                • {alerta.sede_nombre}: {alerta.agua < 5 ? `Agua (${alerta.agua}) ` : ''}{alerta.gatorade < 5 ? `Gatorade (${alerta.gatorade})` : ''}
              </Text>
            ))}
          </View>
        )}

        <Text style={dynamicStyles.sectionTitle}>Venta Rápida (Efectivo)</Text>
        <View style={styles.fastGrid}>
          <AnimatedButton style={dynamicStyles.fastCard} onPress={() => handleFastSale('agua')} disabled={fastSelling}>
            <View style={[styles.fastIconBox, { backgroundColor: '#e0f2fe' }]}><Droplets color="#0ea5e9" size={28} /></View>
            <Text style={[styles.fastTitle, { color: theme.text }]}>+1 Agua</Text>
            <Text style={styles.fastStock}>S/ {precios.agua.toFixed(2)} | Quedan: {stock.agua}</Text>
          </AnimatedButton>
          
          <AnimatedButton style={dynamicStyles.fastCard} onPress={() => handleFastSale('gatorade')} disabled={fastSelling}>
            <View style={[styles.fastIconBox, { backgroundColor: '#fef3c7' }]}><Zap color="#d97706" size={28} /></View>
            <Text style={[styles.fastTitle, { color: theme.text }]}>+1 Gatorade</Text>
            <Text style={styles.fastStock}>S/ {precios.gatorade.toFixed(2)} | Quedan: {stock.gatorade}</Text>
          </AnimatedButton>
        </View>

        {/* Sección: Últimas 5 Ventas (Cambio Rápido de Producto) */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderTitleGroup}>
            <Text style={[dynamicStyles.sectionTitle, { marginBottom: 0 }]}>Últimas 5 Ventas</Text>
            {ultimasVentas.length > 0 && (
              <View style={styles.badgeCount}>
                <Text style={styles.badgeCountText}>{ultimasVentas.length}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.refreshIconBtn}
            onPress={loadUltimasVentas}
            disabled={refreshingVentas}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {refreshingVentas ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <RefreshCw size={16} color={theme.textMuted} />
            )}
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
          Cambia el producto (Agua ⇄ Gatorade) con 1 clic si el alumno cambió de opinión
        </Text>

        {ultimasVentas.length === 0 ? (
          <View style={[styles.emptyRecentCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Clock size={18} color={theme.textMuted} />
            <Text style={[styles.emptyRecentText, { color: theme.textMuted }]}>
              No hay ventas de bebidas registradas hoy.
            </Text>
          </View>
        ) : (
          <View style={styles.recentSalesList}>
            {ultimasVentas.map((venta) => {
              const isSwappingThis = swappingId === venta.id;
              const diff = (precios.gatorade || 3) - (precios.agua || 2);
              const isCambiada = venta.descripcion && venta.descripcion.includes('🔄 Cambio');

              return (
                <View
                  key={venta.id}
                  style={[styles.recentSaleCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                >
                  <View style={styles.recentSaleHeader}>
                    <View style={styles.recentSaleMeta}>
                      <View style={styles.recentTimeBadge}>
                        <Clock color="#2563eb" size={11} />
                        <Text style={styles.recentTimeText}>{formatRelativeTime(venta.fecha)}</Text>
                      </View>
                      <View style={[styles.recentPayBadge, { backgroundColor: getMetodoPagoBg(venta.metodo_pago) }]}>
                        <Text style={[styles.recentPayText, { color: getMetodoPagoColor(venta.metodo_pago) }]}>
                          {venta.metodo_pago || 'Efectivo'}
                        </Text>
                      </View>
                      {isCambiada && (
                        <View style={styles.recentChangedBadge}>
                          <Text style={styles.recentChangedText}>Cambiado</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.recentSalePrice, { color: theme.primary }]}>
                      S/ {Number(venta.monto).toFixed(2)}
                    </Text>
                  </View>

                  <View style={styles.recentSaleBody}>
                    <Text style={[styles.recentSaleProduct, { color: theme.text }]}>
                      {venta.agua_vendida > 0 && venta.gatorade_vendida > 0
                        ? `🥤 ${venta.agua_vendida} Agua + ${venta.gatorade_vendida} Gatorade`
                        : venta.agua_vendida > 0
                        ? `💧 ${venta.agua_vendida}x Agua Mineral`
                        : venta.gatorade_vendida > 0
                        ? `⚡ ${venta.gatorade_vendida}x Gatorade`
                        : venta.descripcion || 'Venta'}
                    </Text>
                  </View>

                  <View style={styles.recentSaleActions}>
                    {venta.agua_vendida > 0 && (
                      <TouchableOpacity
                        style={[styles.swapBtnGatorade, swappingId !== null && { opacity: 0.6 }]}
                        onPress={() => confirmarCambioProducto(venta, 'agua_a_gatorade')}
                        disabled={swappingId !== null}
                        activeOpacity={0.7}
                      >
                        {isSwappingThis ? (
                          <ActivityIndicator size="small" color="#b45309" />
                        ) : (
                          <>
                            <RefreshCw color="#d97706" size={13} />
                            <Text style={styles.swapBtnGatoradeText}>
                              A Gatorade (+S/ {diff.toFixed(2)})
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}

                    {venta.gatorade_vendida > 0 && (
                      <TouchableOpacity
                        style={[styles.swapBtnAgua, swappingId !== null && { opacity: 0.6 }]}
                        onPress={() => confirmarCambioProducto(venta, 'gatorade_a_agua')}
                        disabled={swappingId !== null}
                        activeOpacity={0.7}
                      >
                        {isSwappingThis ? (
                          <ActivityIndicator size="small" color="#0369a1" />
                        ) : (
                          <>
                            <RefreshCw color="#0284c7" size={13} />
                            <Text style={styles.swapBtnAguaText}>
                              A Agua (-S/ {diff.toFixed(2)})
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <Text style={dynamicStyles.sectionTitle}>Operaciones</Text>

        <View style={styles.grid}>
          {/* Módulo de Venta de Entradas (Evento) */}
          <AnimatedButton
            style={[dynamicStyles.rowCard, { borderColor: '#93c5fd', backgroundColor: '#f0f9ff', marginBottom: 12 }]}
            onPress={() => router.push('/entradas_venta')}
          >
            <View style={[dynamicStyles.iconWrapperRow, { backgroundColor: '#dbeafe' }]}>
              <Ticket color="#2563eb" size={24} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[dynamicStyles.cardTitle, { color: '#1e40af' }]}>Venta de Entradas</Text>
                <View style={{ backgroundColor: '#2563eb', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ color: 'white', fontSize: 10, fontFamily: fonts.bold }}>EVENTO</Text>
                </View>
              </View>
              <Text style={[dynamicStyles.cardSubtitle, { color: '#3b82f6' }]}>
                Boletería rápida, tickets correlativos y cuadre personal
              </Text>
            </View>
          </AnimatedButton>

          <AnimatedButton style={dynamicStyles.card} onPress={() => router.push('/sale')}>
            <View style={[dynamicStyles.iconWrapper, { backgroundColor: '#eff6ff' }]}>
              <ShoppingCart color="#2563eb" size={26} />
            </View>
            <Text style={dynamicStyles.cardTitle}>Venta Detallada</Text>
            <Text style={dynamicStyles.cardSubtitle}>Yape, Plin, Transferencias o Vuelto</Text>
          </AnimatedButton>

          <View style={styles.row}>
            <AnimatedButton style={dynamicStyles.smallCard} onPress={() => router.push('/inventory')}>
              <View style={[dynamicStyles.iconWrapperSmall, { backgroundColor: '#f3e8ff' }]}>
                <Package color="#9333ea" size={22} />
              </View>
              <Text style={[dynamicStyles.cardTitle, { fontSize: 16 }]}>Inventario</Text>
              <Text style={dynamicStyles.cardSubtitle}>Stock de sede</Text>
            </AnimatedButton>

            <AnimatedButton style={dynamicStyles.smallCard} onPress={() => router.push('/history')}>
              <View style={[dynamicStyles.iconWrapperSmall, { backgroundColor: '#e0e7ff' }]}>
                <ShoppingCart color="#4f46e5" size={22} />
              </View>
              <Text style={[dynamicStyles.cardTitle, { fontSize: 16 }]}>Ventas de Hoy</Text>
              <Text style={dynamicStyles.cardSubtitle}>Historial del día</Text>
            </AnimatedButton>
          </View>
          
          <AnimatedButton style={dynamicStyles.rowCard} onPress={() => router.push('/summary')}>
            <View style={[dynamicStyles.iconWrapperRow, { backgroundColor: '#f1f5f9' }]}>
              <BarChart2 color="#2563eb" size={22} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={dynamicStyles.cardTitle}>Resumen de Ventas</Text>
              <Text style={dynamicStyles.cardSubtitle}>Reporte y balance de últimos 14 días</Text>
            </View>
          </AnimatedButton>

          <AnimatedButton style={dynamicStyles.rowCard} onPress={() => router.push('/delivery')}>
            <View style={[dynamicStyles.iconWrapperRow, { backgroundColor: '#ecfdf5' }]}>
              <Truck color="#10b981" size={22} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={dynamicStyles.cardTitle}>Registrar Entrega</Text>
              <Text style={dynamicStyles.cardSubtitle}>Abastecer bebidas con foto</Text>
            </View>
          </AnimatedButton>

          <AnimatedButton style={[dynamicStyles.rowCard, { borderColor: '#ddd6fe' }]} onPress={() => router.push('/logistica_sede')}>
            <View style={[dynamicStyles.iconWrapperRow, { backgroundColor: '#f5f3ff' }]}>
              <Package color="#8b5cf6" size={22} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={dynamicStyles.cardTitle}>Logística de Sede</Text>
              <Text style={dynamicStyles.cardSubtitle}>Pedir stock, recepciones y mermas</Text>
            </View>
          </AnimatedButton>
        </View>

        <View style={styles.bottomActions}>
          <AnimatedButton style={[styles.actionBtn, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={cambiarSede}>
            <MapPin color={theme.textMuted} size={20} />
            <Text style={[styles.actionText, { color: theme.textMuted }]}>Cambiar Sede</Text>
          </AnimatedButton>

          <AnimatedButton style={[styles.actionBtn, { backgroundColor: theme.dangerLight, borderColor: theme.dangerLight }]} onPress={cerrarSesionTotal}>
            <LogOut color={theme.danger} size={20} />
            <Text style={[styles.actionText, { color: theme.danger }]}>Cerrar Sesión</Text>
          </AnimatedButton>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 30, marginTop: 10 },
  locationBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  locationText: { fontFamily: fonts.semiBold, marginLeft: 6, fontSize: 14 },
  roleBadgeSmall: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  roleBadgeSmallText: { fontFamily: fonts.bold, fontSize: 13 },
  
  offlineAlert: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 20, marginBottom: 20, minHeight: 80 },
  offlineIconBox: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 12, borderRadius: 14, marginRight: 15 },
  offlineTextContainer: { flex: 1 },
  offlineTitle: { color: 'white', fontFamily: fonts.bold, fontSize: 16 },
  offlineSub: { color: 'rgba(255,255,255,0.9)', fontFamily: fonts.regular, fontSize: 13 },

  alertContainer: { padding: 15, borderRadius: 20, marginBottom: 20, borderWidth: 1 },
  alertHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  alertTitle: { fontFamily: fonts.bold, fontSize: 16 },
  alertText: { fontFamily: fonts.medium, fontSize: 13, marginBottom: 4, marginLeft: 30 },

  fastGrid: { flexDirection: 'row', gap: 15, marginBottom: 20 },
  fastIconBox: { padding: 15, borderRadius: 18, marginBottom: 10 },
  fastTitle: { fontSize: 17, fontFamily: fonts.bold },
  fastStock: { fontSize: 12, fontFamily: fonts.medium, color: '#64748b', marginTop: 4 },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionHeaderTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeCount: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  badgeCountText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: '#2563eb',
  },
  refreshIconBtn: {
    padding: 6,
    borderRadius: 8,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: fonts.medium,
    marginBottom: 12,
  },
  emptyRecentCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  emptyRecentText: {
    fontSize: 13,
    fontFamily: fonts.regular,
  },
  recentSalesList: {
    gap: 10,
    marginBottom: 25,
  },
  recentSaleCard: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  recentSaleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentSaleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  recentTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  recentTimeText: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: '#475569',
  },
  recentPayBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  recentPayText: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
  },
  recentChangedBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recentChangedText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: '#b45309',
  },
  recentSalePrice: {
    fontSize: 15,
    fontFamily: fonts.extraBold,
  },
  recentSaleBody: {
    marginVertical: 8,
  },
  recentSaleProduct: {
    fontSize: 14,
    fontFamily: fonts.bold,
  },
  recentSaleActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  swapBtnGatorade: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fef3c7',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  swapBtnGatoradeText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: '#b45309',
  },
  swapBtnAgua: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#e0f2fe',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  swapBtnAguaText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: '#0369a1',
  },

  grid: { gap: 15 },
  row: { flexDirection: 'row', gap: 15 },
  
  bottomActions: { flexDirection: 'row', gap: 10, marginTop: 30 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 20, borderWidth: 1, minHeight: 60 },
  actionText: { fontSize: 15, fontFamily: fonts.semiBold, marginLeft: 8 },
});
