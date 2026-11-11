import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ticket, Users, Wallet, ArrowLeft, RefreshCw, X } from 'lucide-react-native';
import { colors, fonts } from '../theme';
import {
  Evento,
  VentaEntrada,
  MetricasVentas,
  DatosEmisionEntrada,
  ResultadoEmision,
} from '../types/entradas';
import {
  fetchEventoActivo,
  fetchMetricasYVentas,
  emitirVentaEntradas,
} from '../lib/entradasService';
import { supabase } from '../lib/supabase';
import EventoHeaderCard from '../components/entradas/EventoHeaderCard';
import BoleteriaForm from '../components/entradas/BoleteriaForm';
import MisVentasTab from '../components/entradas/MisVentasTab';
import CuadreCajaTab from '../components/entradas/CuadreCajaTab';
import VentaExitosaModal from '../components/entradas/VentaExitosaModal';
import ModalVerComprobante from '../components/entradas/admin/ModalVerComprobante';

export default function EntradasVentaScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? colors.dark : colors.light;

  // Sesión y Colaborador
  const [colaboradorId, setColaboradorId] = useState<number | null>(null);
  const [colaboradorNombre, setColaboradorNombre] = useState<string>('Colaborador');
  const [usuarioRol, setUsuarioRol] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'VENTA' | 'HISTORIAL' | 'CUADRE'>('VENTA');

  // Datos en Vivo desde la Base de Datos
  const [evento, setEvento] = useState<Evento | null>(null);
  const [misVentas, setMisVentas] = useState<VentaEntrada[]>([]);
  const [metricas, setMetricas] = useState<MetricasVentas>({
    misEntradas: 0,
    miTotal: 0,
    globalEntradas: 0,
    globalTotal: 0,
    aforoMaximo: null,
    entradasDisponibles: null,
  });

  // Estados de Carga y Concurrencia
  const [loading, setLoading] = useState<boolean>(true);
  const [procesando, setProcesando] = useState<boolean>(false);
  const isSavingRef = useRef<boolean>(false);

  // Modales
  const [resultadoModal, setResultadoModal] = useState<ResultadoEmision | null>(null);
  const [comprobanteUrlModal, setComprobanteUrlModal] = useState<string | null>(null);
  const [modalEditarNombreVisible, setModalEditarNombreVisible] = useState<boolean>(false);
  const [nuevoNombreInput, setNuevoNombreInput] = useState<string>('');

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const cargarDatos = async () => {
    try {
      setLoading(true);

      const savedUserId = await AsyncStorage.getItem('usuario_id');
      const savedUserNombre = await AsyncStorage.getItem('usuario_nombre');
      const savedUserRol = await AsyncStorage.getItem('usuario_rol');
      if (savedUserId) setColaboradorId(parseInt(savedUserId, 10));
      if (savedUserNombre) setColaboradorNombre(savedUserNombre);

      let rolFinal = savedUserRol ? savedUserRol.toUpperCase().trim() : '';

      // Si no existe rol en almacenamiento local, consultar usuarios en Supabase para auto-sincronizar
      if (!rolFinal && (savedUserId || savedUserNombre)) {
        try {
          let q = supabase.from('usuarios').select('rol');
          if (savedUserId) {
            q = q.eq('id', parseInt(savedUserId, 10));
          } else if (savedUserNombre) {
            q = q.ilike('nombre_completo', savedUserNombre);
          }
          const { data: uData } = await q.maybeSingle();
          if (uData?.rol) {
            rolFinal = uData.rol.toUpperCase().trim();
            await AsyncStorage.setItem('usuario_rol', rolFinal);
          }
        } catch (e) {
          console.warn('No se pudo verificar rol en Supabase:', e);
        }
      }

      setUsuarioRol(rolFinal);
      if (rolFinal === 'AUXILIAR' && activeTab === 'CUADRE') {
        setActiveTab('VENTA');
      }

      const nombreActual = savedUserNombre || 'Colaborador';

      // 1. Obtener Evento Activo DIRECTAMENTE de la Base de Datos (Sin precios fijos en código)
      const ev = await fetchEventoActivo();
      setEvento(ev);

      if (ev) {
        // 2. Obtener Métricas y Ventas
        const { metricas: m, misVentas: mv } = await fetchMetricasYVentas(
          ev.id,
          nombreActual,
          ev.aforo_maximo
        );
        setMetricas(m);
        setMisVentas(mv);
      }
    } catch (e: any) {
      console.error('Error al cargar datos de entradas:', e);
      Alert.alert(
        'Aviso de Conexión',
        'No se pudo conectar con el módulo de entradas. Asegúrate de haber ejecutado el script SQL en Supabase.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEmitirVenta = async (datos: DatosEmisionEntrada) => {
    if (isSavingRef.current || procesando) return;
    try {
      isSavingRef.current = true;
      setProcesando(true);

      const resultado = await emitirVentaEntradas(datos);
      setResultadoModal(resultado);

      // Recargar métricas y ventas actualizadas desde la base de datos
      if (evento) {
        const { metricas: m, misVentas: mv } = await fetchMetricasYVentas(
          evento.id,
          colaboradorNombre,
          evento.aforo_maximo
        );
        setMetricas(m);
        setMisVentas(mv);
      }
    } catch (err: any) {
      Alert.alert('Error al emitir boletos', err.message || 'No se pudo registrar la venta.');
    } finally {
      setProcesando(false);
      isSavingRef.current = false;
    }
  };

  const handleCambiarNombreColaborador = () => {
    setNuevoNombreInput(colaboradorNombre === 'Colaborador' ? '' : colaboradorNombre);
    setModalEditarNombreVisible(true);
  };

  const handleGuardarNuevoNombre = async () => {
    if (nuevoNombreInput && nuevoNombreInput.trim()) {
      const limpio = nuevoNombreInput.trim();
      setColaboradorNombre(limpio);
      await AsyncStorage.setItem('usuario_nombre', limpio);
      if (evento) {
        const { metricas: m, misVentas: mv } = await fetchMetricasYVentas(
          evento.id,
          limpio,
          evento.aforo_maximo
        );
        setMetricas(m);
        setMisVentas(mv);
      }
    }
    setModalEditarNombreVisible(false);
  };

  const puedeVerCuadre = Boolean(
    usuarioRol &&
    usuarioRol !== 'AUXILIAR' &&
    (usuarioRol === 'CREADOR' || usuarioRol === 'ADMIN' || usuarioRol === 'LOGISTICA')
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header Superior */}
        <View style={[styles.topBar, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={22} color={theme.text} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.topBarCenter} onPress={handleCambiarNombreColaborador}>
            <Text style={[styles.topBarTitle, { color: theme.text }]}>Venta de Entradas</Text>
            <Text style={[styles.topBarSub, { color: theme.textMuted }]} numberOfLines={1}>
              Colaborador: {colaboradorNombre} ✎
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.refreshIconBtn} onPress={cargarDatos} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <RefreshCw size={18} color={theme.textMuted} />
            )}
          </TouchableOpacity>
        </View>

        {/* Tarjeta de Información del Evento (Extraída de BD) */}
        <EventoHeaderCard
          evento={evento}
          metricas={metricas}
          theme={theme}
          onRefresh={cargarDatos}
          loading={loading}
        />

        {/* Selector de Pestañas (Tabs) */}
        <View style={[styles.tabsRow, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'VENTA' && { borderBottomColor: theme.primary }]}
            onPress={() => setActiveTab('VENTA')}
          >
            <Ticket size={16} color={activeTab === 'VENTA' ? theme.primary : theme.textMuted} />
            <Text
              style={[
                styles.tabBtnText,
                { color: activeTab === 'VENTA' ? theme.primary : theme.textMuted },
              ]}
            >
              Boletería
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'HISTORIAL' && { borderBottomColor: theme.primary }]}
            onPress={() => setActiveTab('HISTORIAL')}
          >
            <Users size={16} color={activeTab === 'HISTORIAL' ? theme.primary : theme.textMuted} />
            <Text
              style={[
                styles.tabBtnText,
                { color: activeTab === 'HISTORIAL' ? theme.primary : theme.textMuted },
              ]}
            >
              Mis Ventas ({misVentas.length})
            </Text>
          </TouchableOpacity>

          {puedeVerCuadre && (
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'CUADRE' && { borderBottomColor: theme.primary }]}
              onPress={() => setActiveTab('CUADRE')}
            >
              <Wallet size={16} color={activeTab === 'CUADRE' ? theme.primary : theme.textMuted} />
              <Text
                style={[
                  styles.tabBtnText,
                  { color: activeTab === 'CUADRE' ? theme.primary : theme.textMuted },
                ]}
              >
                Mi Cuadre
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Contenido de la Pestaña Activa */}
        {activeTab === 'VENTA' && (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {evento ? (
              <BoleteriaForm
                evento={evento}
                colaboradorId={colaboradorId}
                colaboradorNombre={colaboradorNombre}
                theme={theme}
                procesando={procesando}
                onEmitir={handleEmitirVenta}
              />
            ) : (
              <View style={styles.noEventoBox}>
                <Text style={[styles.noEventoText, { color: theme.textMuted }]}>
                  Espera a que el Administrador active un evento en la base de datos para comenzar a
                  vender entradas.
                </Text>
              </View>
            )}
          </ScrollView>
        )}

        {activeTab === 'HISTORIAL' && (
          <MisVentasTab
            ventas={misVentas}
            loading={loading}
            onRefresh={cargarDatos}
            onVerComprobante={setComprobanteUrlModal}
            theme={theme}
          />
        )}

        {activeTab === 'CUADRE' && puedeVerCuadre && evento && (
          <CuadreCajaTab
            evento={evento}
            colaboradorNombre={colaboradorNombre}
            misVentas={misVentas}
            theme={theme}
          />
        )}
      </KeyboardAvoidingView>

      {/* Modal de Éxito al Emitir Ticket */}
      <VentaExitosaModal
        visible={!!resultadoModal}
        venta={resultadoModal}
        evento={evento}
        theme={theme}
        onClose={() => setResultadoModal(null)}
      />

      {/* Modal de Ver Foto de Comprobante */}
      <ModalVerComprobante
        visible={!!comprobanteUrlModal}
        imageUrl={comprobanteUrlModal}
        onClose={() => setComprobanteUrlModal(null)}
      />

      {/* Modal Identificación de Colaborador (100% Android & iOS) */}
      <Modal
        visible={modalEditarNombreVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalEditarNombreVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.modalTopRow}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Identificación de Colaborador
              </Text>
              <TouchableOpacity
                onPress={() => setModalEditarNombreVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSub, { color: theme.textMuted }]}>
              Indica tu nombre o puesto para registrar tus ventas y cuadre (ej: Rosario - Puerta Norte):
            </Text>

            <TextInput
              style={[
                styles.nombreInput,
                {
                  backgroundColor: theme.background,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              value={nuevoNombreInput}
              onChangeText={setNuevoNombreInput}
              placeholder="Nombre o puesto..."
              placeholderTextColor={theme.textMuted}
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtnCancel, { borderColor: theme.border }]}
                onPress={() => setModalEditarNombreVisible(false)}
              >
                <Text style={[styles.modalBtnCancelText, { color: theme.text }]}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtnConfirm, { backgroundColor: theme.primary }]}
                onPress={handleGuardarNuevoNombre}
              >
                <Text style={styles.modalBtnConfirmText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 6,
    marginRight: 6,
  },
  topBarCenter: {
    flex: 1,
  },
  topBarTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
  },
  topBarSub: {
    fontSize: 11,
    fontFamily: fonts.regular,
  },
  refreshIconBtn: {
    padding: 8,
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  noEventoBox: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noEventoText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    gap: 12,
  },
  modalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
  },
  modalSub: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.regular,
  },
  nombreInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: fonts.medium,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancelText: {
    fontSize: 13,
    fontFamily: fonts.medium,
  },
  modalBtnConfirm: {
    flex: 1.4,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnConfirmText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: '#ffffff',
  },
});
