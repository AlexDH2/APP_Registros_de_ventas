import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LogOut, Users, MapPin, DollarSign, TrendingUp, AlertTriangle, Truck, Building2, Inbox, Tag, Download, Ticket, Plus, X, Presentation, Settings, Boxes, ChevronRight } from 'lucide-react-native';
import { confirmAndLogout } from '../../lib/auth';
import { useAppTheme } from '../../context/ThemeContext';
import ModalAjustes from '../../components/ModalAjustes';

type SedeGlobal = {
  id: number;
  nombre: string;
  total_dia: number;
};

export default function AdminDashboard() {
  const { theme, isDark } = useAppTheme();
  const [modalAjustesVisible, setModalAjustesVisible] = useState(false);
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

  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const isWide = width >= 1100;
  const sedesActivasCount = sedesData.filter(s => s.total_dia > 0).length;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scroll, isDesktop && styles.scrollDesktop]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.innerContent, isDesktop && styles.innerContentDesktop]}>
          
          {/* Header Superior */}
          <View style={[styles.header, isDesktop && styles.headerDesktop]}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <Text style={[styles.greeting, { color: theme.text }, isDesktop && { fontSize: 32 }]}>Panel Maestro</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>👑 CREADOR</Text>
              </View>
            </View>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              Creador: <Text style={{ color: theme.text, fontWeight: '700' }}>{nombre || 'Administrador'}</Text> • Control central multisede
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {isDesktop && (
              <TouchableOpacity
                style={[
                  styles.desktopLogoutBtn, 
                  { 
                    borderColor: isDark ? 'rgba(239, 68, 68, 0.35)' : '#fee2e2', 
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2' 
                  }
                ]}
                onPress={logout}
                activeOpacity={0.7}
              >
                <LogOut color="#ef4444" size={16} />
                <Text style={{ color: '#ef4444', fontWeight: '700', fontSize: 13 }}>Cerrar Sesión</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.settingsTopBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => setModalAjustesVisible(true)}
              activeOpacity={0.7}
            >
              <Settings color={theme.text} size={22} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero / KPI Grid */}
        <View style={isDesktop ? styles.heroGridDesktop : undefined}>
          {/* Tarjeta: Ingresos Globales */}
          <View style={[styles.globalCard, isDesktop && styles.globalCardDesktop]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={styles.globalIcon}>
                <DollarSign color="#ffffff" size={26} />
              </View>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                <Text style={{ color: '#a7f3d0', fontSize: 11, fontWeight: '800' }}>TIEMPO REAL</Text>
              </View>
            </View>
            <Text style={styles.globalLabel}>Ingresos Globales (Hoy)</Text>
            <Text style={styles.globalValue}>S/ {ingresosGlobales.toFixed(2)}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 4 }}>
              Calculado en vivo en todas las sedes
            </Text>
          </View>

          {/* Tarjeta 2: Sedes Activas (Desktop) */}
          {isDesktop && (
            <View style={[styles.kpiCardDesktop, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={[styles.kpiIconDesktop, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff' }]}>
                  <Building2 color="#3b82f6" size={24} />
                </View>
                <View style={[styles.kpiBadgeDesktop, { backgroundColor: sedesActivasCount > 0 ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5') : (isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9') }]}>
                  <Text style={{ color: sedesActivasCount > 0 ? '#10b981' : theme.textMuted, fontSize: 11, fontWeight: '800' }}>
                    {sedesActivasCount > 0 ? `${sedesActivasCount} ACTIVAS` : 'SIN VENTAS HOY'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.kpiLabelDesktop, { color: theme.textMuted }]}>Sedes con Ventas Hoy</Text>
              <Text style={[styles.kpiValDesktop, { color: theme.text }]}>
                {sedesActivasCount} <Text style={{ fontSize: 18, color: theme.textMuted, fontWeight: '500' }}>/ {sedesData.length} sedes</Text>
              </Text>
              <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 4 }}>
                Puntos de venta sincronizados
              </Text>
            </View>
          )}

          {/* Tarjeta 3: Boletería en Vivo (Desktop) */}
          {isDesktop && (
            <TouchableOpacity 
              style={[styles.kpiCardDesktop, { backgroundColor: '#1e3a8a', borderColor: '#3b82f6' }]}
              onPress={() => router.push('/admin/eventos_entradas')}
              activeOpacity={0.85}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={[styles.kpiIconDesktop, { backgroundColor: '#2563eb' }]}>
                  <Ticket color="#ffffff" size={24} />
                </View>
                <View style={{ backgroundColor: '#10b981', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                  <Text style={{ color: 'white', fontSize: 10, fontWeight: '800' }}>EN VIVO</Text>
                </View>
              </View>
              <Text style={{ color: '#93c5fd', fontSize: 13, fontWeight: '600', marginTop: 14 }}>Boletería & Entradas</Text>
              <Text style={{ color: 'white', fontSize: 19, fontWeight: '900', marginTop: 2 }}>Monitor en Directo →</Text>
              <Text style={{ color: '#bfdbfe', fontSize: 12, marginTop: 4 }}>
                Aforo, colaboradores y auditoría
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Portales Estratégicos (Banners 2x2 en Desktop) */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Módulos Estratégicos</Text>
        <View style={isDesktop ? styles.bannerGridDesktop : undefined}>
          
          {/* Banner 1: Registro de Ventas & Excel */}
          <TouchableOpacity 
            style={[styles.reportBanner, isDesktop && styles.reportBannerDesktop]} 
            onPress={() => router.push('/admin/ventas_sedes' as any)}
            activeOpacity={0.85}
          >
            <View style={styles.reportIconBox}>
              <Download color="#ffffff" size={24} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <Text style={[styles.reportBannerTitle, { flex: 1 }]} numberOfLines={1}>Registro de Ventas & Excel</Text>
                <View style={styles.excelBadge}>
                  <Text style={styles.excelBadgeText}>EXCEL</Text>
                </View>
              </View>
              <Text style={styles.reportBannerSub} numberOfLines={2}>
                Historial separado por sedes y exportación en formato .CSV
              </Text>
            </View>
            {isDesktop && <ChevronRight color="rgba(255,255,255,0.7)" size={20} />}
          </TouchableOpacity>

          {/* Banner 2: Control de Entradas & Eventos (En Vivo) */}
          <TouchableOpacity 
            style={[styles.reportBanner, { backgroundColor: '#1e3a8a', shadowColor: '#1e3a8a' }, isDesktop && styles.reportBannerDesktop]} 
            onPress={() => router.push('/admin/eventos_entradas')}
            activeOpacity={0.85}
          >
            <View style={[styles.reportIconBox, { backgroundColor: '#2563eb' }]}>
              <Ticket color="#ffffff" size={24} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <Text style={[styles.reportBannerTitle, { flex: 1 }]} numberOfLines={1}>Control de Entradas & Eventos</Text>
                <View style={styles.liveBadge}>
                  <Text style={styles.liveBadgeText}>EN VIVO</Text>
                </View>
              </View>
              <Text style={styles.reportBannerSub} numberOfLines={2}>
                Monitoreo simultáneo de 5 colaboradores, aforo y boletería
              </Text>
            </View>
            {isDesktop && <ChevronRight color="rgba(255,255,255,0.7)" size={20} />}
          </TouchableOpacity>

          {/* Banner 3: Entrevistas & Staff Deportivo */}
          <TouchableOpacity 
            style={[styles.reportBanner, { backgroundColor: isDark ? '#1e293b' : '#0f172a', borderColor: '#f59e0b', borderWidth: 1.5, shadowColor: '#f59e0b' }, isDesktop && styles.reportBannerDesktop]} 
            onPress={() => router.push('/entrevistas')}
            activeOpacity={0.85}
          >
            <View style={[styles.reportIconBox, { backgroundColor: '#f59e0b' }]}>
              <Presentation color="#0d1b2a" size={24} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <Text style={[styles.reportBannerTitle, { color: '#ffffff', flex: 1 }]} numberOfLines={1}>Entrevistas & Staff Deportivo</Text>
                <View style={styles.staffBadge}>
                  <Text style={styles.staffBadgeText}>STAFF</Text>
                </View>
              </View>
              <Text style={[styles.reportBannerSub, { color: '#94a3b8' }]} numberOfLines={2}>
                Pitch interactivo, asignador de turnos anti-cruces y postulantes
              </Text>
            </View>
            {isDesktop && <ChevronRight color="rgba(255,255,255,0.7)" size={20} />}
          </TouchableOpacity>

          {/* Banner 4: Inventario de Materiales & Tallas */}
          <TouchableOpacity 
            style={[styles.reportBanner, { backgroundColor: isDark ? '#064e3b' : '#047857', borderColor: '#10b981', borderWidth: 1.5, shadowColor: '#10b981' }, isDesktop && styles.reportBannerDesktop]} 
            onPress={() => router.push('/inventario_materiales')}
            activeOpacity={0.85}
          >
            <View style={[styles.reportIconBox, { backgroundColor: '#10b981' }]}>
              <Boxes color="#ffffff" size={24} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <Text style={[styles.reportBannerTitle, { color: '#ffffff', flex: 1 }]} numberOfLines={1}>Inventario de Materiales & Tallas</Text>
                <View style={styles.sedesBadge}>
                  <Text style={styles.sedesBadgeText}>SEDES</Text>
                </View>
              </View>
              <Text style={[styles.reportBannerSub, { color: '#a7f3d0' }]} numberOfLines={2}>
                Control mensual de conos, aros, balones y uniformes por sede
              </Text>
            </View>
            {isDesktop && <ChevronRight color="rgba(255,255,255,0.7)" size={20} />}
          </TouchableOpacity>
        </View>

        {/* Operaciones, Logística & Auditoría (3 columnas en Desktop) */}
        <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 8 }]}>Operaciones, Logística & Auditoría</Text>
        <View style={isDesktop ? styles.actionGridDesktop : styles.actionGridMobile}>
          
          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: theme.card, borderColor: theme.border }, isDesktop && styles.actionCardDesktop]} 
            onPress={() => router.push('/admin/users')}
            activeOpacity={0.75}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#f3e8ff' }]}>
              <Users color="#7c3aed" size={22} />
            </View>
            <Text style={[styles.actionTitle, { color: theme.text }]} numberOfLines={1}>Personal</Text>
            <Text style={[styles.actionSubtitle, { color: theme.textMuted }]} numberOfLines={1}>Cuentas y accesos</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: theme.card, borderColor: theme.border }, isDesktop && styles.actionCardDesktop]} 
            onPress={() => router.push('/admin/prices')}
            activeOpacity={0.75}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#fef3c7' }]}>
              <DollarSign color="#d97706" size={22} />
            </View>
            <Text style={[styles.actionTitle, { color: theme.text }]} numberOfLines={1}>Precios</Text>
            <Text style={[styles.actionSubtitle, { color: theme.textMuted }]} numberOfLines={1}>Tarifas por sede</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: theme.card, borderColor: theme.border }, isDesktop && styles.actionCardDesktop]} 
            onPress={() => router.push('/admin/almacen_central')}
            activeOpacity={0.75}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#e0f2fe' }]}>
              <Building2 color="#0284c7" size={22} />
            </View>
            <Text style={[styles.actionTitle, { color: theme.text }]} numberOfLines={1}>Almacén Matriz</Text>
            <Text style={[styles.actionSubtitle, { color: theme.textMuted }]} numberOfLines={1}>Stock & compras</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: theme.card, borderColor: theme.border }, isDesktop && styles.actionCardDesktop]} 
            onPress={() => router.push('/delivery')}
            activeOpacity={0.75}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#dcfce7' }]}>
              <Truck color="#16a34a" size={22} />
            </View>
            <Text style={[styles.actionTitle, { color: theme.text }]} numberOfLines={1}>Despachar Envío</Text>
            <Text style={[styles.actionSubtitle, { color: theme.textMuted }]} numberOfLines={1}>Reparto con foto</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: theme.card, borderColor: theme.border }, isDesktop && styles.actionCardDesktop]} 
            onPress={() => router.push('/admin/pedidos_logistica')}
            activeOpacity={0.75}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#ecfdf5' }]}>
              <Inbox color="#059669" size={22} />
            </View>
            <Text style={[styles.actionTitle, { color: theme.text }]} numberOfLines={1}>Pedidos Sedes</Text>
            <Text style={[styles.actionSubtitle, { color: theme.textMuted }]} numberOfLines={1}>Bandeja de pedidos</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: theme.card, borderColor: theme.border }, isDesktop && styles.actionCardDesktop]} 
            onPress={() => router.push('/admin/logistics_history')}
            activeOpacity={0.75}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#fef3c7' }]}>
              <Truck color="#d97706" size={22} />
            </View>
            <Text style={[styles.actionTitle, { color: theme.text }]} numberOfLines={1}>Historial Envíos</Text>
            <Text style={[styles.actionSubtitle, { color: theme.textMuted }]} numberOfLines={1}>Fotos de entrega</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: theme.card, borderColor: theme.border }, isDesktop && styles.actionCardDesktop]} 
            onPress={() => router.push('/admin/catalogo')}
            activeOpacity={0.75}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#fffbeb' }]}>
              <Tag color="#b45309" size={22} />
            </View>
            <Text style={[styles.actionTitle, { color: theme.text }]} numberOfLines={1}>Catálogo</Text>
            <Text style={[styles.actionSubtitle, { color: theme.textMuted }]} numberOfLines={1}>Snacks y artículos</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: theme.card, borderColor: theme.border }, isDesktop && styles.actionCardDesktop]} 
            onPress={() => router.push('/admin/metricas_logistica')}
            activeOpacity={0.75}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#eef2ff' }]}>
              <TrendingUp color="#4f46e5" size={22} />
            </View>
            <Text style={[styles.actionTitle, { color: theme.text }]} numberOfLines={1}>Proyección</Text>
            <Text style={[styles.actionSubtitle, { color: theme.textMuted }]} numberOfLines={1}>Autonomía y mermas</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: theme.card, borderColor: theme.border }, isDesktop && styles.actionCardDesktop]} 
            onPress={() => router.push('/admin/anulaciones')}
            activeOpacity={0.75}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#fee2e2' }]}>
              <AlertTriangle color="#dc2626" size={22} />
            </View>
            <Text style={[styles.actionTitle, { color: theme.text }]} numberOfLines={1}>Anulaciones</Text>
            <Text style={[styles.actionSubtitle, { color: theme.textMuted }]} numberOfLines={1}>Aprobar errores</Text>
          </TouchableOpacity>
        </View>

        {/* Cabecera de Sedes Registradas */}
        <View style={styles.sedesHeaderRow}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={[styles.sectionTitleNoMargin, { color: theme.text }]}>Sedes Registradas</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
              Toca una sede para entrar al terminal de ventas
            </Text>
          </View>
          <TouchableOpacity 
            style={[
              styles.btnAddSede, 
              { 
                backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#eff6ff', 
                borderColor: isDark ? 'rgba(37, 99, 235, 0.4)' : '#bfdbfe' 
              }
            ]} 
            onPress={() => setModalSedeVisible(true)}
            activeOpacity={0.8}
          >
            <Plus color={isDark ? '#60a5fa' : '#2563eb'} size={15} />
            <Text style={[styles.btnAddSedeText, { color: isDark ? '#60a5fa' : '#2563eb' }]}>Nueva Sede</Text>
          </TouchableOpacity>
        </View>

        {/* Cuadrícula de Sedes (2 columnas en Desktop) */}
        <View style={isDesktop ? styles.sedesGridDesktop : undefined}>
          {sedesData.map((sede) => {
            const isOficina = sede.nombre.trim().toLowerCase() === 'oficina';
            return (
              <TouchableOpacity 
                key={sede.id} 
                style={[
                  styles.sedeCard, 
                  { backgroundColor: theme.card, borderColor: theme.border },
                  isOficina && (isDark 
                    ? { borderColor: '#3b82f6', backgroundColor: '#132238' } 
                    : { borderColor: '#bfdbfe', backgroundColor: '#f8fafc' }
                  ),
                  isDesktop && (isWide ? styles.sedeCardWide : styles.sedeCardDesktop)
                ]} 
                onPress={() => selectSede(sede)}
                activeOpacity={0.8}
              >
                <View style={styles.sedeInfo}>
                  <View style={[
                    styles.sedeAvatar, 
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : (isOficina ? '#dbeafe' : '#f1f5f9') }
                  ]}>
                    {isOficina ? <Building2 color="#2563eb" size={22} /> : <MapPin color={isDark ? '#93c5fd' : '#0f172a'} size={22} />}
                  </View>
                  <View style={{ flex: 1, justifyContent: 'center', minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.sedeName, { color: theme.text }]} numberOfLines={1}>{sede.nombre}</Text>
                      {isOficina && (
                        <View style={styles.matrizBadge}>
                          <Text style={styles.matrizBadgeText}>🏢 MATRIZ</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>Terminal de ventas</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[styles.sedeStats, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5' }]}>
                    <TrendingUp color="#10b981" size={15} />
                    <Text style={styles.sedeTotal}>S/ {sede.total_dia.toFixed(2)}</Text>
                  </View>
                  {isDesktop && <ChevronRight color={theme.textMuted} size={18} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Botón Cerrar Sesión (Visible solo en móvil ya que en Desktop está en el header superior) */}
        {!isDesktop && (
          <TouchableOpacity
            style={[
              styles.logoutButton,
              { 
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2', 
                borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#fee2e2' 
              }
            ]}
            onPress={logout}
            activeOpacity={0.7}
          >
            <LogOut color="#ef4444" size={20} />
            <Text style={styles.logoutText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        )}

        </View>
      </ScrollView>

      {/* Modal Crear Sede */}
      <Modal visible={modalSedeVisible} animationType="fade" transparent onRequestClose={() => setModalSedeVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Agregar Nueva Sede</Text>
              <TouchableOpacity onPress={() => setModalSedeVisible(false)}>
                <X color={theme.textMuted} size={22} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalLabel, { color: theme.textMuted }]}>Nombre del Colegio o Sede *</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
              placeholder="Ej. San Agustín / Colegio Militar"
              placeholderTextColor={theme.textMuted}
              value={nuevaSedeNombre}
              onChangeText={setNuevaSedeNombre}
            />

            <Text style={[styles.modalLabel, { color: theme.textMuted }]}>PIN de Seguridad (Default: 1234)</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
              placeholder="1234"
              placeholderTextColor={theme.textMuted}
              keyboardType="numeric"
              maxLength={6}
              value={nuevaSedePin}
              onChangeText={setNuevaSedePin}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.btnCancelModal, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }]}
                onPress={() => setModalSedeVisible(false)}
              >
                <Text style={[styles.btnCancelText, { color: theme.textMuted }]}>Cancelar</Text>
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

      {/* Modal Ajustes & Selector de Tema */}
      <ModalAjustes
        visible={modalAjustesVisible}
        onClose={() => setModalAjustesVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1, width: '100%' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 45 },
  scrollDesktop: {
    paddingHorizontal: 32,
    paddingTop: 28,
    paddingBottom: 64,
  },
  innerContent: {
    width: '100%',
  },
  innerContentDesktop: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },

  header: { marginBottom: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerDesktop: { marginBottom: 28, alignItems: 'center' },
  settingsTopBtn: {
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  desktopLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  greeting: { fontSize: 26, fontWeight: '900' },
  subtitle: { fontSize: 13, marginTop: 4 },
  roleBadge: {
    backgroundColor: '#d97706',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
  },
  roleBadgeText: { color: 'white', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  
  // Hero / KPI Row Desktop
  heroGridDesktop: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 26,
  },
  globalCard: { 
    backgroundColor: '#0f172a', 
    padding: 20, 
    borderRadius: 20, 
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 16, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 6 }, 
    shadowOpacity: 0.2, 
    shadowRadius: 10, 
    elevation: 4 
  },
  globalCardDesktop: {
    flex: 1.2,
    marginBottom: 0,
    justifyContent: 'space-between',
  },
  globalIcon: { backgroundColor: 'rgba(255,255,255,0.12)', alignSelf: 'flex-start', padding: 10, borderRadius: 14, marginBottom: 10 },
  globalLabel: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  globalValue: { color: '#ffffff', fontSize: 32, fontWeight: '900', marginTop: 2 },

  kpiCardDesktop: {
    flex: 1,
    padding: 22,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  kpiIconDesktop: {
    padding: 10,
    borderRadius: 14,
  },
  kpiBadgeDesktop: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  kpiLabelDesktop: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
  },
  kpiValDesktop: {
    fontSize: 28,
    fontWeight: '900',
    marginTop: 2,
  },

  // Featured Banner Grid
  bannerGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  reportBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    padding: 14,
    borderRadius: 18,
    marginBottom: 10,
    gap: 12,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  reportBannerDesktop: {
    width: '48.9%',
    marginBottom: 0,
    minHeight: 88,
  },
  reportIconBox: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 9,
    borderRadius: 13,
    flexShrink: 0,
  },
  reportBannerTitle: {
    color: 'white',
    fontSize: 15,
    fontWeight: '800',
  },
  reportBannerSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  excelBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    flexShrink: 0,
  },
  excelBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '800',
  },
  liveBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    flexShrink: 0,
  },
  liveBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '800',
  },
  staffBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    flexShrink: 0,
  },
  staffBadgeText: {
    color: '#0d1b2a',
    fontSize: 10,
    fontWeight: '800',
  },
  sedesBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    flexShrink: 0,
  },
  sedesBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10, marginTop: 8 },
  
  // Action Grid
  actionGridMobile: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 20,
  },
  actionGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 26,
  },
  actionCard: {
    width: '48.2%',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  actionCardDesktop: {
    width: '31.8%',
  },
  actionIconBox: {
    alignSelf: 'flex-start',
    padding: 9,
    borderRadius: 12,
    marginBottom: 10,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  actionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },

  // Sedes Grid
  sedesGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 10,
  },
  sedeCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 14, 
    borderRadius: 16, 
    marginBottom: 10, 
    borderWidth: 1, 
    shadowColor: '#64748b', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.04, 
    shadowRadius: 6, 
    elevation: 1 
  },
  sedeCardDesktop: {
    width: '48.9%',
    marginBottom: 0,
  },
  sedeCardWide: {
    width: '31.8%',
    marginBottom: 0,
  },
  sedeInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 10, minWidth: 0 },
  sedeAvatar: { padding: 9, borderRadius: 12, marginRight: 10, flexShrink: 0 },
  sedeName: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  matrizBadge: { backgroundColor: '#eff6ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#bfdbfe', flexShrink: 0 },
  matrizBadgeText: { fontSize: 10, fontWeight: '800', color: '#1d4ed8' },
  sedeStats: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, gap: 4 },
  sedeTotal: { color: '#10b981', fontWeight: '800', fontSize: 14 },

  sedesHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 14 },
  sectionTitleNoMargin: { fontSize: 18, fontWeight: '800' },
  sectionSubtitle: { fontSize: 12, marginTop: 2 },
  btnAddSede: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, flexShrink: 0 },
  btnAddSedeText: { fontWeight: '700', fontSize: 13 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { borderRadius: 24, padding: 24, width: '100%', maxWidth: 440, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  modalLabel: { fontSize: 13, fontWeight: '700', marginBottom: 6, marginTop: 12 },
  modalInput: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, height: 48, fontSize: 15 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  btnCancelModal: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  btnCancelText: { fontWeight: 'bold', fontSize: 15 },
  btnSaveSede: { flex: 1.4, paddingVertical: 14, borderRadius: 14, backgroundColor: '#2563eb', alignItems: 'center' },
  btnSaveSedeText: { color: 'white', fontWeight: 'bold', fontSize: 15 },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 28,
    marginBottom: 20,
  },
  logoutButtonDesktop: {
    maxWidth: 280,
    width: '100%',
    alignSelf: 'center',
    marginTop: 36,
  },
  logoutText: { color: '#ef4444', fontSize: 15, fontWeight: 'bold', marginLeft: 8 },
});
