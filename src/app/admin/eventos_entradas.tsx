import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import {
  ArrowLeft,
  RefreshCw,
  Settings,
  Plus,
  Calendar,
  CheckCircle2,
  History,
  PlayCircle,
} from 'lucide-react-native';
import { fonts } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import {
  Evento,
  VentaEntrada,
  ColaboradorResumen,
  MetricasVentas,
} from '../../types/entradas';
import {
  fetchTodosLosEventos,
  fetchMetricasYVentas,
  procesarResumenColaboradores,
  guardarConfiguracionEvento,
  crearNuevoEventoYFinalizarAnteriores,
  activarEvento,
  anularVentaEntrada,
} from '../../lib/entradasService';
import EventoHeaderCard from '../../components/entradas/EventoHeaderCard';
import AdminResumenCards from '../../components/entradas/admin/AdminResumenCards';
import MonitorColaboradores from '../../components/entradas/admin/MonitorColaboradores';
import AuditoriaVentas from '../../components/entradas/admin/AuditoriaVentas';
import ModalConfigEvento from '../../components/entradas/admin/ModalConfigEvento';
import ModalVerComprobante from '../../components/entradas/admin/ModalVerComprobante';

export default function AdminEventosEntradasScreen() {
  const { theme } = useAppTheme();

  const [loading, setLoading] = useState<boolean>(true);
  const [todosEventos, setTodosEventos] = useState<Evento[]>([]);
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
  const [modalModoCreacion, setModalModoCreacion] = useState<boolean>(false);
  const [comprobanteUrlGrande, setComprobanteUrlGrande] = useState<string | null>(null);

  const cargarDatosEventoEspecifico = async (ev: Evento | null) => {
    setEvento(ev);
    if (ev) {
      const { metricas: m, todasVentas: tv } = await fetchMetricasYVentas(
        ev.id,
        '',
        ev.aforo_maximo
      );
      setMetricas(m);
      setVentas(tv);
      setColaboradores(procesarResumenColaboradores(tv));
    } else {
      setMetricas({
        misEntradas: 0,
        miTotal: 0,
        globalEntradas: 0,
        globalTotal: 0,
        aforoMaximo: null,
        entradasDisponibles: null,
      });
      setVentas([]);
      setColaboradores([]);
    }
  };

  const cargarDatos = async (eventoIdPreferido?: number) => {
    try {
      setLoading(true);

      const lista = await fetchTodosLosEventos();
      setTodosEventos(lista);

      let seleccionado: Evento | null = null;
      if (eventoIdPreferido) {
        seleccionado = lista.find((e) => e.id === eventoIdPreferido) || null;
      }
      if (!seleccionado) {
        // Priorizar el evento ACTIVO más reciente; si no hay ninguno activo, mostrar el último
        seleccionado = lista.find((e) => e.estado === 'ACTIVO') || lista[0] || null;
      }

      await cargarDatosEventoEspecifico(seleccionado);
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

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const handleSeleccionarEventoHistorial = async (ev: Evento) => {
    if (evento?.id === ev.id) return;
    try {
      setLoading(true);
      await cargarDatosEventoEspecifico(ev);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudieron cargar las ventas de este evento.');
    } finally {
      setLoading(false);
    }
  };

  const abrirModalEditar = () => {
    setModalModoCreacion(false);
    setModalConfigVisible(true);
  };

  const abrirModalCrearNuevo = () => {
    setModalModoCreacion(true);
    setModalConfigVisible(true);
  };

  const handleGuardarConfig = async (datos: {
    id?: number;
    nombre: string;
    lugar?: string;
    precio_entrada: number;
    aforo_maximo?: number | null;
    yape_numero?: string | null;
    yape_titular?: string | null;
    yape_imagen_url?: string | null;
  }) => {
    try {
      if (modalModoCreacion || !datos.id) {
        const nuevo = await crearNuevoEventoYFinalizarAnteriores({
          nombre: datos.nombre,
          lugar: datos.lugar,
          precio_entrada: datos.precio_entrada,
          aforo_maximo: datos.aforo_maximo,
          yape_numero: datos.yape_numero,
          yape_titular: datos.yape_titular,
          yape_imagen_url: datos.yape_imagen_url,
        });
        Alert.alert(
          '¡Nuevo Evento Activado!',
          `"${nuevo.nombre}" ya está ACTIVO en la Boletería y en la Web Pública de padres (iniciando desde el Ticket #1).`
        );
        await cargarDatos(nuevo.id);
      } else {
        const actualizado = await guardarConfiguracionEvento(datos);
        Alert.alert('Éxito', 'Configuración del evento guardada en la base de datos.');
        await cargarDatos(actualizado.id);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo guardar la configuración.');
    }
  };

  const handleReactivarEvento = (ev: Evento) => {
    const ejecutar = async () => {
      try {
        setLoading(true);
        await activarEvento(ev.id);
        Alert.alert(
          'Evento Reactivado',
          `"${ev.nombre}" volvió a estar ACTIVO en la Boletería y en la Web de padres.`
        );
        await cargarDatos(ev.id);
      } catch (err: any) {
        Alert.alert('Error', err?.message || 'No se pudo reactivar el evento.');
      } finally {
        setLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      if (
        typeof window !== 'undefined' &&
        window.confirm(
          `¿Reactivar "${ev.nombre}"? El evento activo actual pasará a FINALIZADO.`
        )
      ) {
        ejecutar();
      }
    } else {
      Alert.alert(
        'Reactivar Evento',
        `¿Deseas reactivar "${ev.nombre}"? El evento activo actual pasará a estado FINALIZADO.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Sí, Reactivar', onPress: ejecutar },
        ]
      );
    }
  };

  const handleAnularVenta = async (ventaId: number, motivo: string) => {
    try {
      await anularVentaEntrada(ventaId, motivo);
      Alert.alert('Venta Anulada', 'Los boletos han sido anulados correctamente.');
      await cargarDatos(evento?.id);
    } catch (err: any) {
      Alert.alert('Error al anular', err.message || 'No se pudo anular la venta.');
    }
  };

  const eventoActivoActual = todosEventos.find((e) => e.estado === 'ACTIVO') || evento;
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {/* Top Bar */}
      <View style={[styles.topBar, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={[styles.topBarContent, isDesktop && styles.topBarContentDesktop]}>
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
            {evento && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: theme.primaryLight }]}
                onPress={abrirModalEditar}
              >
                <Settings size={18} color={theme.primary} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => cargarDatos(evento?.id)}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <RefreshCw size={18} color={theme.textMuted} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, isDesktop && styles.scrollContentDesktop]}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => cargarDatos(evento?.id)}
            colors={[theme.primary]}
          />
        }
      >
        {/* Selector de Historial de Eventos */}
        {todosEventos.length > 0 && (
          <View style={[styles.eventosSelectorSection, isDesktop && { paddingHorizontal: 0 }]}>
            <View style={[styles.eventosSelectorHeader, isDesktop && { paddingHorizontal: 0 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <History size={14} color={theme.textMuted} />
                <Text style={[styles.eventosSelectorLabel, { color: theme.textMuted }]}>
                  Eventos ({todosEventos.length}) — toca para cambiar vista
                </Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.eventosPillsRow, isDesktop && { paddingHorizontal: 0 }]}
            >
              {todosEventos.map((ev) => {
                const isSelected = evento?.id === ev.id;
                const isActivo = ev.estado === 'ACTIVO';
                return (
                  <TouchableOpacity
                    key={ev.id}
                    style={[
                      styles.eventoPill,
                      {
                        backgroundColor: isSelected ? theme.primary : theme.card,
                        borderColor: isSelected
                          ? theme.primary
                          : isActivo
                          ? '#22c55e'
                          : theme.border,
                      },
                    ]}
                    onPress={() => handleSeleccionarEventoHistorial(ev)}
                    activeOpacity={0.75}
                  >
                    {isActivo ? (
                      <CheckCircle2 size={13} color={isSelected ? '#bbf7d0' : '#16a34a'} />
                    ) : (
                      <Calendar size={13} color={isSelected ? '#e2e8f0' : theme.textMuted} />
                    )}
                    <Text
                      style={[
                        styles.eventoPillTitle,
                        { color: isSelected ? '#ffffff' : theme.text },
                      ]}
                      numberOfLines={1}
                    >
                      {ev.nombre}
                    </Text>
                    <View
                      style={[
                        styles.eventoStatusDot,
                        {
                          backgroundColor: isSelected
                            ? 'rgba(255,255,255,0.22)'
                            : isActivo
                            ? '#dcfce7'
                            : theme.background,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.eventoStatusDotText,
                          {
                            color: isSelected
                              ? '#ffffff'
                              : isActivo
                              ? '#15803d'
                              : theme.textMuted,
                          },
                        ]}
                      >
                        {isActivo ? 'ACTIVO' : 'CERRADO'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Banner si se está viendo un evento FINALIZADO */}
        {evento && evento.estado !== 'ACTIVO' && (
          <View style={[styles.finalizadoBanner, isDesktop && { marginHorizontal: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.finalizadoTitle}>Evento Finalizado (Solo Historial)</Text>
              <Text style={styles.finalizadoSub}>
                Este evento ya está cerrado. Las ventas mostradas corresponden a su historial.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.reactivarBtn}
              onPress={() => handleReactivarEvento(evento)}
            >
              <PlayCircle size={15} color="#ffffff" />
              <Text style={styles.reactivarBtnText}>Reactivar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Banner del Evento Seleccionado */}
        <EventoHeaderCard
          evento={evento}
          metricas={metricas}
          theme={theme}
          onRefresh={() => cargarDatos(evento?.id)}
          loading={loading}
          onPressEdit={abrirModalEditar}
          isDesktop={isDesktop}
        />

        {/* Botón destacado para Crear Nuevo Evento */}
        <TouchableOpacity
          style={[
            styles.createEventBtn,
            {
              backgroundColor: evento ? theme.card : theme.primary,
              borderColor: theme.primary,
              borderWidth: evento ? 1.5 : 0,
            },
            isDesktop && styles.createEventBtnDesktop,
          ]}
          onPress={abrirModalCrearNuevo}
          activeOpacity={0.8}
        >
          <Plus size={18} color={evento ? theme.primary : '#ffffff'} />
          <Text
            style={[
              styles.createEventBtnText,
              { color: evento ? theme.primary : '#ffffff' },
            ]}
          >
            {evento ? 'Crear Nuevo Evento (Finaliza el actual)' : 'Crear y Activar Primer Evento'}
          </Text>
        </TouchableOpacity>

        {/* Resumen Global (4 Tarjetas) */}
        <AdminResumenCards
          evento={evento}
          metricas={metricas}
          colaboradoresActivos={colaboradores.length}
          theme={theme}
          isDesktop={isDesktop}
        />

        {/* Sección Principal: En Desktop se divide en 2 Columnas dashboard */}
        {isDesktop ? (
          <View style={styles.desktopSplitRow}>
            <View style={styles.desktopColLeft}>
              <MonitorColaboradores
                colaboradores={colaboradores}
                theme={theme}
                isDesktop={true}
              />
            </View>
            <View style={styles.desktopColRight}>
              <AuditoriaVentas
                ventas={ventas}
                onVerComprobante={setComprobanteUrlGrande}
                onAnularVenta={handleAnularVenta}
                theme={theme}
                isDesktop={true}
              />
            </View>
          </View>
        ) : (
          <>
            <MonitorColaboradores colaboradores={colaboradores} theme={theme} />
            <AuditoriaVentas
              ventas={ventas}
              onVerComprobante={setComprobanteUrlGrande}
              onAnularVenta={handleAnularVenta}
              theme={theme}
            />
          </>
        )}
      </ScrollView>

      {/* Modal Configuración / Creación de Evento */}
      <ModalConfigEvento
        visible={modalConfigVisible}
        evento={evento}
        modoCreacion={modalModoCreacion}
        yapePrevio={
          eventoActivoActual
            ? {
                numero: eventoActivoActual.yape_numero,
                titular: eventoActivoActual.yape_titular,
                imagenUrl: eventoActivoActual.yape_imagen_url,
              }
            : null
        }
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  topBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 8,
  },
  topBarContentDesktop: {
    maxWidth: 1200,
    alignSelf: 'center',
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
    gap: 6,
  },
  newEventHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 34,
    borderRadius: 10,
  },
  newEventHeaderBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: fonts.bold,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 28,
  },
  scrollContentDesktop: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  desktopSplitRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
    marginTop: 4,
  },
  desktopColLeft: {
    width: 380,
  },
  desktopColRight: {
    flex: 1,
  },
  createEventBtnDesktop: {
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    marginHorizontal: 0,
    marginTop: 8,
    marginBottom: 12,
  },
  eventosSelectorSection: {
    paddingTop: 10,
    paddingBottom: 4,
  },
  eventosSelectorHeader: {
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  eventosSelectorLabel: {
    fontSize: 11,
    fontFamily: fonts.medium,
  },
  eventosPillsRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  eventoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.2,
    maxWidth: 260,
  },
  eventoPillTitle: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    maxWidth: 150,
  },
  eventoStatusDot: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  eventoStatusDotText: {
    fontSize: 9,
    fontFamily: fonts.bold,
    letterSpacing: 0.4,
  },
  finalizadoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  finalizadoTitle: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: '#92400e',
  },
  finalizadoSub: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: '#b45309',
  },
  reactivarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#d97706',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  reactivarBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontFamily: fonts.bold,
  },
  createEventBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  createEventBtnText: {
    fontSize: 13,
    fontFamily: fonts.bold,
  },
});
