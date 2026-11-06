import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  useColorScheme,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { ArrowLeft, RefreshCw, Settings, Plus } from 'lucide-react-native';
import { colors, fonts } from '../../theme';
import {
  Evento,
  VentaEntrada,
  ColaboradorResumen,
  MetricasVentas,
} from '../../types/entradas';
import {
  fetchEventoActivo,
  fetchMetricasYVentas,
  procesarResumenColaboradores,
  guardarConfiguracionEvento,
  anularVentaEntrada,
} from '../../lib/entradasService';
import EventoHeaderCard from '../../components/entradas/EventoHeaderCard';
import AdminResumenCards from '../../components/entradas/admin/AdminResumenCards';
import MonitorColaboradores from '../../components/entradas/admin/MonitorColaboradores';
import AuditoriaVentas from '../../components/entradas/admin/AuditoriaVentas';
import ModalConfigEvento from '../../components/entradas/admin/ModalConfigEvento';
import ModalVerComprobante from '../../components/entradas/admin/ModalVerComprobante';

export default function AdminEventosEntradasScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? colors.dark : colors.light;

  const [loading, setLoading] = useState<boolean>(true);
  const [evento, setEvento] = useState<Evento | null>(null);
  const [ventas, setVentas] = useState<VentaEntrada[]>([]);
  const [colaboradores, setColaboradores] = useState<ColaboradorResumen[]>([]);
  const [metricas, setMetricas] = useState<MetricasVentas>({
    misEntradas: 0,
    miTotal: 0,
    globalEntradas: 0,
    globalTotal: 0,
    aforoMaximo: null,
    entradasDisponibles: null,
  });

  // Modales
  const [modalConfigVisible, setModalConfigVisible] = useState<boolean>(false);
  const [comprobanteUrlGrande, setComprobanteUrlGrande] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [])
  );

  const cargarDatos = async () => {
    try {
      setLoading(true);

      // 1. Obtener Evento Activo DIRECTAMENTE de la Base de Datos
      const ev = await fetchEventoActivo();
      setEvento(ev);

      if (ev) {
        // 2. Obtener Métricas y Ventas de todos los colaboradores
        const { metricas: m, todasVentas: tv } = await fetchMetricasYVentas(
          ev.id,
          '',
          ev.aforo_maximo
        );
        setMetricas(m);
        setVentas(tv);

        // 3. Procesar ranking de colaboradores
        const colabs = procesarResumenColaboradores(tv);
        setColaboradores(colabs);
      } else {
        setVentas([]);
        setColaboradores([]);
      }
    } catch (e: any) {
      console.error('Error al cargar datos en panel de administración:', e);
      Alert.alert(
        'Aviso de Conexión',
        'No se pudieron cargar los datos de administración de eventos.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGuardarConfig = async (datos: {
    id?: number;
    nombre: string;
    lugar?: string;
    precio_entrada: number;
    aforo_maximo?: number | null;
  }) => {
    try {
      await guardarConfiguracionEvento(datos);
      Alert.alert('Éxito', 'Configuración del evento guardada en la base de datos.');
      await cargarDatos();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo guardar la configuración.');
    }
  };

  const handleAnularVenta = async (ventaId: number, motivo: string) => {
    try {
      await anularVentaEntrada(ventaId, motivo);
      Alert.alert('Venta Anulada', 'Los boletos han sido anulados correctamente.');
      await cargarDatos();
    } catch (err: any) {
      Alert.alert('Error al anular', err.message || 'No se pudo anular la venta.');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {/* Top Bar */}
      <View style={[styles.topBar, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.topBarCenter}>
          <Text style={[styles.topBarTitle, { color: theme.text }]}>
            Control de Entradas & Eventos
          </Text>
          <Text style={[styles.topBarSub, { color: theme.textMuted }]}>
            Panel Administrativo en Vivo
          </Text>
        </View>

        <View style={styles.topBarActions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.primaryLight }]}
            onPress={() => setModalConfigVisible(true)}
          >
            <Settings size={18} color={theme.primary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={cargarDatos} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <RefreshCw size={18} color={theme.textMuted} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={cargarDatos} colors={[theme.primary]} />
        }
      >
        {/* Banner del Evento Activo */}
        <EventoHeaderCard
          evento={evento}
          metricas={metricas}
          theme={theme}
          onRefresh={cargarDatos}
          loading={loading}
        />

        {/* Botón para Configurar Evento si no existe */}
        {!evento && (
          <TouchableOpacity
            style={[styles.createEventBtn, { backgroundColor: theme.primary }]}
            onPress={() => setModalConfigVisible(true)}
          >
            <Plus size={18} color="#ffffff" />
            <Text style={styles.createEventBtnText}>Crear y Activar Evento en Base de Datos</Text>
          </TouchableOpacity>
        )}

        {/* Resumen Global (4 Tarjetas) */}
        <AdminResumenCards
          evento={evento}
          metricas={metricas}
          colaboradoresActivos={colaboradores.length}
          theme={theme}
        />

        {/* Monitor en Vivo de los Colaboradores */}
        <MonitorColaboradores colaboradores={colaboradores} theme={theme} />

        {/* Auditoría Completa de Ventas */}
        <AuditoriaVentas
          ventas={ventas}
          onVerComprobante={setComprobanteUrlGrande}
          onAnularVenta={handleAnularVenta}
          theme={theme}
        />
      </ScrollView>

      {/* Modal Configuración del Evento (Precios, Nombre, Aforo) */}
      <ModalConfigEvento
        visible={modalConfigVisible}
        evento={evento}
        theme={theme}
        onClose={() => setModalConfigVisible(false)}
        onSave={handleGuardarConfig}
      />

      {/* Modal Ver Comprobante en Grande */}
      <ModalVerComprobante
        visible={!!comprobanteUrlGrande}
        imageUrl={comprobanteUrlGrande}
        onClose={() => setComprobanteUrlGrande(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  backBtn: {
    padding: 6,
  },
  topBarCenter: {
    flex: 1,
  },
  topBarTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
  },
  topBarSub: {
    fontSize: 11,
    fontFamily: fonts.regular,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  createEventBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginVertical: 10,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  createEventBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: fonts.bold,
  },
});
