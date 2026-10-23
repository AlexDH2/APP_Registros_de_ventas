import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LogOut, Users, MapPin, DollarSign, TrendingUp, AlertTriangle, Truck, Building2, Inbox, Tag, Download, Plus, X } from 'lucide-react-native';
import { confirmAndLogout } from '../../lib/auth';

type SedeGlobal = {
  id: number;
  nombre: string;
  total_dia: number;
};

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState('');
  const [sedesData, setSedesData] = useState<SedeGlobal[]>([]);
  const [ingresosGlobales, setIngresosGlobales] = useState(0);

  // Modal Nueva Sede
  const [modalSedeVisible, setModalSedeVisible] = useState(false);
  const [nuevaSedeNombre, setNuevaSedeNombre] = useState('');
  const [nuevaSedePin, setNuevaSedePin] = useState('1234');
  const [creandoSede, setCreandoSede] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const nombreUsuario = await AsyncStorage.getItem('usuario_nombre');
      if (nombreUsuario) setNombre(nombreUsuario);

      // Obtener todas las sedes
      const { data: sedes, error: sedesError } = await supabase.from('sedes').select('*');
      if (sedesError) throw sedesError;

      // Calcular ingresos de hoy para todas las sedes
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const { data: ventas, error: ventasError } = await supabase
        .from('ventas')
        .select('sede_id, monto, estado')
        .gte('fecha', hoy.toISOString())
        .neq('estado', 'ANULADA');
      
      if (ventasError) throw ventasError;

      let globalTotal = 0;
      const sedesProcesadas = (sedes || []).map(sede => {
        const ventasSede = (ventas || []).filter(v => v.sede_id === sede.id);
        const total = ventasSede.reduce((acc, curr) => acc + (Number(curr.monto) || 0), 0);
        globalTotal += total;
        return {
          id: sede.id,
          nombre: sede.nombre,
          total_dia: total
        };
      });

      setSedesData(sedesProcesadas);
      setIngresosGlobales(globalTotal);

    } catch (e) {
      Alert.alert('Error', 'No se pudo cargar el dashboard de administrador.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuardarSede = async () => {
    if (!nuevaSedeNombre.trim()) {
      return Alert.alert('Aviso', 'Ingresa el nombre de la sede o colegio');
    }

    setCreandoSede(true);
    try {
      const { data: sedeCreada, error: sedeError } = await supabase
        .from('sedes')
        .insert([{
          nombre: nuevaSedeNombre.trim(),
          pin: nuevaSedePin.trim() || '1234'
        }])
        .select()
        .single();

      if (sedeError) throw sedeError;

      if (sedeCreada) {
        await supabase.from('inventario_bebidas').insert([{
          sede_id: sedeCreada.id,
          agua_cantidad: 0,
          gatorade_cantidad: 0
        }]);
      }

      Alert.alert('Éxito', `Sede "${nuevaSedeNombre.trim()}" agregada correctamente.`);
      setNuevaSedeNombre('');
      setNuevaSedePin('1234');
      setModalSedeVisible(false);
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo agregar la sede');
    } finally {
      setCreandoSede(false);
    }
  };

  const selectSede = async (sede: SedeGlobal) => {
    await AsyncStorage.setItem('sede_id', sede.id.toString());
    await AsyncStorage.setItem('sede_nombre', sede.nombre);
    router.push('/home');
  };

  const logout = () => {
    confirmAndLogout();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0f172a" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        
        <View style={styles.header}>
          <Text style={styles.greeting}>Panel Maestro</Text>
          <Text style={styles.subtitle}>Creador: {nombre}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>👑 NIVEL: CREADOR (ACCESO TOTAL)</Text>
          </View>
        </View>

        <View style={styles.globalCard}>
          <View style={styles.globalIcon}>
            <DollarSign color="#ffffff" size={32} />
          </View>
          <Text style={styles.globalLabel}>Ingresos Globales (Hoy)</Text>
          <Text style={styles.globalValue}>S/ {ingresosGlobales.toFixed(2)}</Text>
        </View>

        {/* Acceso Directo: Ventas por Sedes y Descargar en Excel */}
        <TouchableOpacity 
          style={styles.reportBanner} 
          onPress={() => router.push('/admin/ventas_sedes' as any)}
          activeOpacity={0.85}
        >
          <View style={styles.reportIconBox}>
            <Download color="#ffffff" size={26} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.reportBannerTitle}>Registro de Ventas & Excel</Text>
            <Text style={styles.reportBannerSub}>
              Ver historial separado por sedes y exportar a Excel (.csv)
            </Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Gestión & Operaciones</Text>
        <View style={styles.grid}>
          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => router.push('/admin/users')}
            activeOpacity={0.75}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#f3e8ff' }]}>
              <Users color="#7c3aed" size={22} />
            </View>
            <Text style={styles.actionTitle} numberOfLines={1}>Personal</Text>
            <Text style={styles.actionSubtitle} numberOfLines={1}>Cuentas y accesos</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => router.push('/admin/prices')}
            activeOpacity={0.75}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#fef3c7' }]}>
              <DollarSign color="#d97706" size={22} />
            </View>
            <Text style={styles.actionTitle} numberOfLines={1}>Precios</Text>
            <Text style={styles.actionSubtitle} numberOfLines={1}>Tarifas por sede</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Logística & Abastecimiento</Text>
        <View style={styles.grid}>
          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => router.push('/admin/almacen_central')}
            activeOpacity={0.75}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#e0f2fe' }]}>
              <Building2 color="#0284c7" size={22} />
            </View>
            <Text style={styles.actionTitle} numberOfLines={1}>Almacén Matriz</Text>
            <Text style={styles.actionSubtitle} numberOfLines={1}>Stock & compras</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => router.push('/delivery')}
            activeOpacity={0.75}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#dcfce7' }]}>
              <Truck color="#16a34a" size={22} />
            </View>
            <Text style={styles.actionTitle} numberOfLines={1}>Despachar Envío</Text>
            <Text style={styles.actionSubtitle} numberOfLines={1}>Reparto con foto</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => router.push('/admin/pedidos_logistica')}
            activeOpacity={0.75}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#ecfdf5' }]}>
              <Inbox color="#059669" size={22} />
            </View>
            <Text style={styles.actionTitle} numberOfLines={1}>Pedidos Sedes</Text>
            <Text style={styles.actionSubtitle} numberOfLines={1}>Bandeja de pedidos</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => router.push('/admin/logistics_history')}
            activeOpacity={0.75}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#fef3c7' }]}>
              <Truck color="#d97706" size={22} />
            </View>
            <Text style={styles.actionTitle} numberOfLines={1}>Historial Envíos</Text>
            <Text style={styles.actionSubtitle} numberOfLines={1}>Fotos de entrega</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Auditoría & Catálogo</Text>
        <View style={styles.grid}>
          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => router.push('/admin/catalogo')}
            activeOpacity={0.75}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#fffbeb' }]}>
              <Tag color="#b45309" size={22} />
            </View>
            <Text style={styles.actionTitle} numberOfLines={1}>Catálogo</Text>
            <Text style={styles.actionSubtitle} numberOfLines={1}>Snacks y artículos</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => router.push('/admin/metricas_logistica')}
            activeOpacity={0.75}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#eef2ff' }]}>
              <TrendingUp color="#4f46e5" size={22} />
            </View>
            <Text style={styles.actionTitle} numberOfLines={1}>Proyección</Text>
            <Text style={styles.actionSubtitle} numberOfLines={1}>Autonomía y mermas</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => router.push('/admin/anulaciones')}
            activeOpacity={0.75}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#fee2e2' }]}>
              <AlertTriangle color="#dc2626" size={22} />
            </View>
            <Text style={styles.actionTitle} numberOfLines={1}>Anulaciones</Text>
            <Text style={styles.actionSubtitle} numberOfLines={1}>Aprobar errores</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sedesHeaderRow}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.sectionTitleNoMargin}>Sedes Registradas</Text>
            <Text style={styles.sectionSubtitle}>Toca una sede para entrar al terminal de ventas</Text>
          </View>
          <TouchableOpacity 
            style={styles.btnAddSede} 
            onPress={() => setModalSedeVisible(true)}
            activeOpacity={0.8}
          >
            <Plus color="#2563eb" size={15} />
            <Text style={styles.btnAddSedeText}>Nueva Sede</Text>
          </TouchableOpacity>
        </View>

        {sedesData.map((sede) => {
          const isOficina = sede.nombre.trim().toLowerCase() === 'oficina';
          return (
            <TouchableOpacity 
              key={sede.id} 
              style={[
                styles.sedeCard, 
                isOficina && { borderColor: '#bfdbfe', backgroundColor: '#f8fafc' }
              ]} 
              onPress={() => selectSede(sede)}
              activeOpacity={0.8}
            >
              <View style={styles.sedeInfo}>
                <View style={[styles.sedeAvatar, isOficina && { backgroundColor: '#dbeafe' }]}>
                  {isOficina ? <Building2 color="#2563eb" size={22} /> : <MapPin color="#0f172a" size={22} />}
                </View>
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.sedeName} numberOfLines={1}>{sede.nombre}</Text>
                    {isOficina && (
                      <View style={styles.matrizBadge}>
                        <Text style={styles.matrizBadgeText}>🏢 MATRIZ</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
              <View style={styles.sedeStats}>
                <TrendingUp color="#10b981" size={15} />
                <Text style={styles.sedeTotal}>S/ {sede.total_dia.toFixed(2)}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={logout}
          activeOpacity={0.7}
        >
          <LogOut color="#ef4444" size={20} />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Modal Crear Sede */}
      <Modal visible={modalSedeVisible} animationType="fade" transparent onRequestClose={() => setModalSedeVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Agregar Nueva Sede</Text>
              <TouchableOpacity onPress={() => setModalSedeVisible(false)}>
                <X color="#64748b" size={22} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Nombre del Colegio o Sede *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ej. San Agustín / Colegio Militar"
              placeholderTextColor="#94a3b8"
              value={nuevaSedeNombre}
              onChangeText={setNuevaSedeNombre}
            />

            <Text style={styles.modalLabel}>PIN de Seguridad (Default: 1234)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="1234"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              maxLength={6}
              value={nuevaSedePin}
              onChangeText={setNuevaSedePin}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.btnCancelModal}
                onPress={() => setModalSedeVisible(false)}
              >
                <Text style={styles.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnSaveSede}
                onPress={handleGuardarSede}
                disabled={creandoSede}
              >
                {creandoSede ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.btnSaveSedeText}>Crear Sede</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20, paddingBottom: 45 },
  header: { marginBottom: 30 },
  greeting: { fontSize: 32, fontWeight: '900', color: '#0f172a' },
  subtitle: { fontSize: 16, color: '#64748b', marginTop: 5 },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#d97706',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    marginTop: 10,
  },
  roleBadgeText: { color: 'white', fontSize: 11, fontWeight: 'bold', letterSpacing: 0.5 },
  
  globalCard: { backgroundColor: '#0f172a', padding: 25, borderRadius: 24, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 6 },
  globalIcon: { backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'flex-start', padding: 12, borderRadius: 16, marginBottom: 15 },
  globalLabel: { color: '#94a3b8', fontSize: 16, fontWeight: '600' },
  globalValue: { color: '#ffffff', fontSize: 40, fontWeight: '900', marginTop: 5 },

  reportBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    padding: 16,
    borderRadius: 20,
    marginBottom: 26,
    gap: 14,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  reportIconBox: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 10,
    borderRadius: 14,
  },
  reportBannerTitle: {
    color: 'white',
    fontSize: 17,
    fontWeight: '800',
  },
  reportBannerSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#1e293b', marginBottom: 12 },
  grid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  actionCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIconBox: {
    alignSelf: 'flex-start',
    padding: 9,
    borderRadius: 12,
    marginBottom: 10,
  },
  actionTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800',
  },
  actionSubtitle: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },

  sedeCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    backgroundColor: 'white', 
    paddingHorizontal: 15, 
    paddingVertical: 14, 
    borderRadius: 16, 
    marginBottom: 10, 
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    shadowColor: '#64748b', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.04, 
    shadowRadius: 6, 
    elevation: 1 
  },
  sedeInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 10 },
  sedeAvatar: { backgroundColor: '#f1f5f9', padding: 10, borderRadius: 12, marginRight: 10, flexShrink: 0 },
  sedeName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  matrizBadge: { backgroundColor: '#eff6ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#bfdbfe', flexShrink: 0 },
  matrizBadgeText: { fontSize: 10, fontWeight: '800', color: '#1d4ed8' },
  sedeStats: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', backgroundColor: '#ecfdf5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, gap: 4 },
  sedeTotal: { color: '#10b981', fontWeight: '800', fontSize: 14 },

  sedesHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 14 },
  sectionTitleNoMargin: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  sectionSubtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  btnAddSede: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#bfdbfe', flexShrink: 0 },
  btnAddSedeText: { color: '#2563eb', fontWeight: '700', fontSize: 13 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { backgroundColor: 'white', borderRadius: 24, padding: 22, width: '100%', maxWidth: 420, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  modalLabel: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6, marginTop: 12 },
  modalInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, paddingHorizontal: 14, height: 48, fontSize: 15, color: '#0f172a' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  btnCancelModal: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#f1f5f9', alignItems: 'center' },
  btnCancelText: { color: '#64748b', fontWeight: 'bold', fontSize: 15 },
  btnSaveSede: { flex: 1.4, paddingVertical: 14, borderRadius: 14, backgroundColor: '#2563eb', alignItems: 'center' },
  btnSaveSedeText: { color: 'white', fontWeight: 'bold', fontSize: 15 },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
    marginTop: 32,
    marginBottom: 20,
  },
  logoutText: { color: '#ef4444', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
});
