import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PackagePlus, Droplets, Zap, ShieldAlert, ArrowRight, PackageCheck } from 'lucide-react-native';

type Inventario = {
  id: number;
  sede_id: number;
  agua_cantidad: number;
  gatorade_cantidad: number;
};

export default function InventoryScreen() {
  const [inventario, setInventario] = useState<Inventario | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreador, setIsCreador] = useState(false);
  const [mostrarAjusteAdmin, setMostrarAjusteAdmin] = useState(false);

  const loadInventory = async () => {
    setLoading(true);
    const savedSedeId = await AsyncStorage.getItem('sede_id');
    const savedRol = await AsyncStorage.getItem('usuario_rol');
    setIsCreador(savedRol === 'CREADOR' || savedRol === 'ADMIN');

    if (!savedSedeId) {
      Alert.alert('Error', 'No hay sede seleccionada');
      setLoading(false);
      return;
    }
    const id = parseInt(savedSedeId);

    const { data, error } = await supabase
      .from('inventario_bebidas')
      .select('*')
      .eq('sede_id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      Alert.alert('Error', 'No se pudo cargar el inventario');
    } else if (data) {
      setInventario(data);
    } else {
      const { data: newData, error: insertError } = await supabase
        .from('inventario_bebidas')
        .insert([{ sede_id: id, agua_cantidad: 0, gatorade_cantidad: 0 }])
        .select()
        .single();
        
      if (!insertError && newData) {
        setInventario(newData);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const agregarStock = (tipo: 'agua' | 'gatorade', cantidad: number) => {
    if (!inventario) return;

    Alert.alert(
      'Confirmar Ajuste Manual',
      `¿Seguro que deseas modificar manualmente el stock de ${tipo === 'agua' ? 'Agua' : 'Gatorade'} en ${cantidad > 0 ? '+' + cantidad : cantidad} botellas?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            const nuevoValor = Math.max(0, (tipo === 'agua' ? inventario.agua_cantidad : inventario.gatorade_cantidad) + cantidad);
            const actualizar = tipo === 'agua' ? { agua_cantidad: nuevoValor } : { gatorade_cantidad: nuevoValor };

            const { data, error } = await supabase
              .from('inventario_bebidas')
              .update(actualizar)
              .eq('id', inventario.id)
              .select()
              .single();

            if (error) {
              Alert.alert('Error', 'No se pudo actualizar el stock');
            } else if (data) {
              setInventario(data);
            }
          }
        }
      ]
    );
  };

  const getStockStatus = (qty: number) => {
    if (qty <= 0) return { label: 'Agotado', bg: '#fee2e2', text: '#ef4444' };
    if (qty < 5) return { label: 'Stock Crítico', bg: '#fef3c7', text: '#d97706' };
    if (qty < 12) return { label: 'Stock Moderado', bg: '#e0f2fe', text: '#0284c7' };
    return { label: 'Stock Óptimo', bg: '#dcfce7', text: '#15803d' };
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const aguaStatus = getStockStatus(inventario?.agua_cantidad || 0);
  const gatoradeStatus = getStockStatus(inventario?.gatorade_cantidad || 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Inventario de Sede</Text>
        <Text style={styles.subtitle}>Stock oficial verificado en tiempo real.</Text>

        {/* Tarjeta Agua */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: '#e0f2fe' }]}>
              <Droplets color="#0ea5e9" size={28} />
            </View>
            <View style={styles.cardInfo}>
              <View style={styles.itemTitleRow}>
                <Text style={styles.itemName}>Agua Mineral</Text>
                <View style={[styles.statusBadge, { backgroundColor: aguaStatus.bg }]}>
                  <Text style={[styles.statusBadgeText, { color: aguaStatus.text }]}>{aguaStatus.label}</Text>
                </View>
              </View>
              <Text style={styles.itemStock}>
                {inventario?.agua_cantidad || 0} <Text style={styles.itemUnit}>unidades</Text>
              </Text>
            </View>
          </View>

          {isCreador && mostrarAjusteAdmin && (
            <View style={styles.adminActionsRow}>
              <TouchableOpacity style={[styles.adminBtn, { backgroundColor: '#fee2e2' }]} onPress={() => agregarStock('agua', -1)}>
                <Text style={[styles.adminBtnText, { color: '#ef4444' }]}>-1</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.adminBtn, { backgroundColor: '#e0f2fe' }]} onPress={() => agregarStock('agua', 1)}>
                <Text style={[styles.adminBtnText, { color: '#0284c7' }]}>+1</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.adminBtn, { backgroundColor: '#0ea5e9' }]} onPress={() => agregarStock('agua', 20)}>
                <PackagePlus color="white" size={16} />
                <Text style={[styles.adminBtnText, { color: 'white' }]}>+20</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Tarjeta Gatorade */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: '#fef3c7' }]}>
              <Zap color="#d97706" size={28} />
            </View>
            <View style={styles.cardInfo}>
              <View style={styles.itemTitleRow}>
                <Text style={styles.itemName}>Gatorade</Text>
                <View style={[styles.statusBadge, { backgroundColor: gatoradeStatus.bg }]}>
                  <Text style={[styles.statusBadgeText, { color: gatoradeStatus.text }]}>{gatoradeStatus.label}</Text>
                </View>
              </View>
              <Text style={styles.itemStock}>
                {inventario?.gatorade_cantidad || 0} <Text style={styles.itemUnit}>unidades</Text>
              </Text>
            </View>
          </View>

          {isCreador && mostrarAjusteAdmin && (
            <View style={styles.adminActionsRow}>
              <TouchableOpacity style={[styles.adminBtn, { backgroundColor: '#fee2e2' }]} onPress={() => agregarStock('gatorade', -1)}>
                <Text style={[styles.adminBtnText, { color: '#ef4444' }]}>-1</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.adminBtn, { backgroundColor: '#fef3c7' }]} onPress={() => agregarStock('gatorade', 1)}>
                <Text style={[styles.adminBtnText, { color: '#d97706' }]}>+1</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.adminBtn, { backgroundColor: '#d97706' }]} onPress={() => agregarStock('gatorade', 12)}>
                <PackagePlus color="white" size={16} />
                <Text style={[styles.adminBtnText, { color: 'white' }]}>+12</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Mensaje de Política de Control de Stock */}
        <View style={styles.noticeCard}>
          <View style={styles.noticeHeader}>
            <PackageCheck color="#059669" size={22} />
            <Text style={styles.noticeTitle}>Control de Entradas y Salidas</Text>
          </View>
          <Text style={styles.noticeBody}>
            El stock se descuenta con cada venta. Para sumar botellas a esta sede, se debe recibir y confirmar el despacho enviado desde la matriz.
          </Text>
          <TouchableOpacity 
            style={styles.noticeActionBtn} 
            onPress={() => router.push('/logistica_sede')}
          >
            <Text style={styles.noticeActionText}>Ver Recepción de Entregas y Mermas</Text>
            <ArrowRight color="#059669" size={18} />
          </TouchableOpacity>
        </View>

        {/* Opción para el Creador de abrir el panel de ajuste de emergencia */}
        {isCreador && (
          <TouchableOpacity
            style={styles.emergencyToggleBtn}
            onPress={() => setMostrarAjusteAdmin(prev => !prev)}
          >
            <ShieldAlert color="#64748b" size={18} />
            <Text style={styles.emergencyToggleText}>
              {mostrarAjusteAdmin ? 'Ocultar Ajustes de Emergencia (Creador)' : 'Habilitar Ajustes de Emergencia (Creador)'}
            </Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a', marginBottom: 5 },
  subtitle: { fontSize: 15, color: '#64748b', marginBottom: 25 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  cardInfo: { flex: 1 },
  itemTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  itemName: { fontSize: 18, fontWeight: '700', color: '#334155' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  statusBadgeText: { fontSize: 11, fontWeight: 'bold' },
  itemStock: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  itemUnit: { fontSize: 14, fontWeight: '600', color: '#94a3b8' },

  adminActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  adminBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  adminBtnText: { fontWeight: 'bold', fontSize: 14 },

  noticeCard: {
    backgroundColor: '#ecfdf5',
    borderRadius: 20,
    padding: 18,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  noticeHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  noticeTitle: { fontSize: 16, fontWeight: 'bold', color: '#065f46' },
  noticeBody: { fontSize: 13, color: '#047857', lineHeight: 18 },
  noticeActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#6ee7b7',
  },
  noticeActionText: { color: '#065f46', fontWeight: 'bold', fontSize: 13 },

  emergencyToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 25,
    padding: 12,
  },
  emergencyToggleText: { color: '#64748b', fontSize: 13, fontWeight: '600' },
});
