import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Share,
  Image,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors, fonts } from '../../theme';
import AnimatedButton from '../../components/AnimatedButton';
import {
  Ticket,
  Users,
  DollarSign,
  Share2,
  RefreshCw,
  Search,
  ArrowLeft,
  X,
  Smartphone,
  Settings,
} from 'lucide-react-native';

type Evento = {
  id: number;
  nombre: string;
  lugar: string;
  fecha: string;
  precio_entrada: number;
  estado: string;
  aforo_maximo: number | null;
};

type ColaboradorResumen = {
  nombre: string;
  entradas: number;
  efectivo: number;
  yape: number;
  plin: number;
  otros: number;
  total: number;
  transacciones: number;
};

type VentaAdmin = {
  id: number;
  numero_ticket_inicio: number;
  numero_ticket_fin: number;
  cantidad: number;
  precio_unitario: number;
  monto_total: number;
  metodo_pago: string;
  colaborador_nombre: string;
  nombre_completo?: string;
  dni?: string;
  url_comprobante?: string;
  estado: string;
  fecha: string;
  motivo_anulacion?: string;
};

export default function AdminEventosEntradasScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? colors.dark : colors.light;

  const [loading, setLoading] = useState<boolean>(true);
  const [evento, setEvento] = useState<Evento | null>(null);
  const [ventas, setVentas] = useState<VentaAdmin[]>([]);
  const [colaboradores, setColaboradores] = useState<ColaboradorResumen[]>([]);
  
  // Filtro de Búsqueda
  const [busqueda, setBusqueda] = useState<string>('');

  // Modal Ver Comprobante en Grande
  const [comprobanteUrlGrande, setComprobanteUrlGrande] = useState<string | null>(null);

  // Modal Configuración de Evento / Aforo / Precio Único
  const [modalConfigVisible, setModalConfigVisible] = useState<boolean>(false);
  const [eventoNombreInput, setEventoNombreInput] = useState<string>('');
  const [eventoLugarInput, setEventoLugarInput] = useState<string>('');
  const [eventoPrecioInput, setEventoPrecioInput] = useState<string>('');
  const [eventoAforoInput, setEventoAforoInput] = useState<string>('');
  const [guardandoConfig, setGuardandoConfig] = useState<boolean>(false);

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [])
  );

  const cargarDatos = async () => {
    try {
      setLoading(true);

      // 1. Cargar Evento Activo
      const { data: evs, error: evError } = await supabase
        .from('eventos')
        .select('*')
        .eq('estado', 'ACTIVO')
        .order('id', { ascending: false })
        .limit(1);

      if (evError) throw evError;

      if (!evs || evs.length === 0) {
        setEvento(null);
        setLoading(false);
        return;
      }

      const ev = evs[0];
      setEvento(ev);
      setEventoNombreInput(ev.nombre);
      setEventoLugarInput(ev.lugar || '');
      setEventoPrecioInput(ev.precio_entrada ? ev.precio_entrada.toString() : '10.00');
      setEventoAforoInput(ev.aforo_maximo ? ev.aforo_maximo.toString() : '');

      // 2. Cargar Ventas del Evento
      const { data: vts, error: vtsError } = await supabase
        .from('ventas_entradas')
        .select('*')
        .eq('evento_id', ev.id)
        .order('id', { ascending: false });

      if (vtsError) throw vtsError;

      const todasVentas: VentaAdmin[] = vts || [];
      setVentas(todasVentas);

      // 3. Procesar Resumen por Colaborador
      const activas = todasVentas.filter(v => v.estado === 'COMPLETADA');
      const mapaColabs: Record<string, ColaboradorResumen> = {};

      activas.forEach(v => {
        const nombre = v.colaborador_nombre || 'Colaborador';
        if (!mapaColabs[nombre]) {
          mapaColabs[nombre] = {
            nombre,
            entradas: 0,
            efectivo: 0,
            yape: 0,
            plin: 0,
            otros: 0,
            total: 0,
            transacciones: 0,
          };
        }

        const monto = Number(v.monto_total) || 0;
        mapaColabs[nombre].entradas += v.cantidad || 0;
        mapaColabs[nombre].total += monto;
        mapaColabs[nombre].transacciones += 1;

        if (v.metodo_pago === 'Efectivo') mapaColabs[nombre].efectivo += monto;
        else if (v.metodo_pago === 'Yape') mapaColabs[nombre].yape += monto;
        else if (v.metodo_pago === 'Plin') mapaColabs[nombre].plin += monto;
        else mapaColabs[nombre].otros += monto;
      });

      setColaboradores(Object.values(mapaColabs).sort((a, b) => b.total - a.total));

    } catch (e: any) {
      console.log('Error cargando admin eventos:', e);
      Alert.alert('Error', 'No se pudieron cargar los datos de entradas.');
    } finally {
      setLoading(false);
    }
  };

  // Cálculos Globales
  const ventasActivas = ventas.filter(v => v.estado === 'COMPLETADA');
  const globalTotalEntradas = ventasActivas.reduce((acc, v) => acc + (v.cantidad || 0), 0);
  const globalTotalRecaudado = ventasActivas.reduce((acc, v) => acc + Number(v.monto_total || 0), 0);
  const globalEfectivo = ventasActivas.filter(v => v.metodo_pago === 'Efectivo').reduce((acc, v) => acc + Number(v.monto_total || 0), 0);
  const globalDigital = globalTotalRecaudado - globalEfectivo;
  const aforoMax = evento?.aforo_maximo || 0;
  const aforoRestante = aforoMax > 0 ? Math.max(0, aforoMax - globalTotalEntradas) : null;
  const aforoPorcentaje = aforoMax > 0 ? Math.min(100, Math.round((globalTotalEntradas / aforoMax) * 100)) : 0;

  // Guardar Configuración de Evento / Aforo / Precio Único
  const handleGuardarConfigEvento = async () => {
    if (!eventoNombreInput.trim()) {
      return Alert.alert('Aviso', 'El nombre del evento no puede estar vacío.');
    }

    const precioNum = parseFloat(eventoPrecioInput.replace(',', '.'));
    if (isNaN(precioNum) || precioNum <= 0) {
      return Alert.alert('Aviso', 'Ingresa un precio de entrada válido mayor a 0.');
    }

    const aforoNum = eventoAforoInput.trim() ? parseInt(eventoAforoInput.trim()) : null;

    if (!evento) return;

    try {
      setGuardandoConfig(true);
      const { error } = await supabase
        .from('eventos')
        .update({
          nombre: eventoNombreInput.trim(),
          lugar: eventoLugarInput.trim() || 'Complejo Deportivo',
          precio_entrada: precioNum,
          aforo_maximo: aforoNum,
        })
        .eq('id', evento.id);

      if (error) throw error;

      Alert.alert('Configuración Guardada', 'Los datos del evento y precio han sido actualizados.');
      setModalConfigVisible(false);
      cargarDatos();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo actualizar el evento.');
    } finally {
      setGuardandoConfig(false);
    }
  };

  // Anular Venta desde Admin
  const anularVentaAdmin = (venta: VentaAdmin) => {
    Alert.prompt(
      'Anular Entrada',
      `¿Deseas anular la entrada #${venta.numero_ticket_inicio} emitida a ${venta.nombre_completo || 'Cliente'} por ${venta.colaborador_nombre}?\n\nIngresa el motivo:`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Anular',
          style: 'destructive',
          onPress: async (motivo) => {
            if (!motivo || !motivo.trim()) {
              return Alert.alert('Aviso', 'Debes ingresar un motivo para la anulación.');
            }
            try {
              const { error } = await supabase
                .from('ventas_entradas')
                .update({
                  estado: 'ANULADA',
                  motivo_anulacion: motivo.trim(),
                })
                .eq('id', venta.id);

              if (error) throw error;

              Alert.alert('Éxito', 'Entrada anulada correctamente.');
              cargarDatos();
            } catch (e: any) {
              Alert.alert('Error', e.message || 'No se pudo anular la entrada.');
            }
          },
        },
      ],
      'plain-text',
      'Anulado por Administración'
    );
  };

  // Compartir Reporte Ejecutivo por WhatsApp
  const compartirReporteGlobal = async () => {
    if (!evento) return;
    try {
      let desgloseColabs = '';
      colaboradores.forEach((c, idx) => {
        desgloseColabs += `${idx + 1}. *${c.nombre}*: ${c.entradas} ent. | Efectivo: S/ ${c.efectivo.toFixed(2)} | Digital: S/ ${(c.yape + c.plin + c.otros).toFixed(2)} | *Total: S/ ${c.total.toFixed(2)}*\n`;
      });

      const texto = `📊 *REPORTE DE ENTRADAS — ${evento.nombre}*\n` +
        `📍 *Lugar:* ${evento.lugar}\n` +
        `🎟️ *Precio Entrada:* S/ ${Number(evento.precio_entrada || 10).toFixed(2)}\n` +
        `📅 *Fecha:* ${new Date().toLocaleDateString('es-PE')}\n\n` +
        `🎫 *Total Entradas Vendidas:* ${globalTotalEntradas} ent.\n` +
        (aforoMax > 0 ? `🏟️ *Aforo:* ${aforoPorcentaje}% (Quedan ${aforoRestante} entradas)\n` : '') +
        `💰 *TOTAL RECAUDADO:* S/ ${globalTotalRecaudado.toFixed(2)}\n` +
        `💵 *Efectivo Físico en Mano:* S/ ${globalEfectivo.toFixed(2)}\n` +
        `📱 *Cobros Digitales (Yape/Plin):* S/ ${globalDigital.toFixed(2)}\n\n` +
        `👥 *DESGLOSE POR COLABORADOR:*\n` +
        (desgloseColabs || 'Sin ventas registradas aún.\n') +
        `\nGenerado desde App Campeones Lima`;

      await Share.share({ message: texto });
    } catch (e) {
      console.log('Error compartiendo:', e);
    }
  };

  // Filtrado de Ventas
  const ventasFiltradas = ventas.filter(v => {
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase().trim();
    const tickets = `${v.numero_ticket_inicio} ${v.numero_ticket_fin}`;
    const colab = (v.colaborador_nombre || '').toLowerCase();
    const comp = (v.nombre_completo || '').toLowerCase();
    const dni = (v.dni || '').toLowerCase();
    return tickets.includes(q) || colab.includes(q) || comp.includes(q) || dni.includes(q);
  });

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#0f172a" />
        <Text style={[styles.loadingText, { color: theme.textMuted }]}>Cargando control del evento...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Cabecera */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft color={theme.text} size={22} />
        </TouchableOpacity>

        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Control de Evento & Entradas</Text>
          <Text style={[styles.headerSub, { color: theme.textMuted }]}>
            {evento?.nombre || 'Gran Evento Deportivo'} • S/ {Number(evento?.precio_entrada || 10).toFixed(2)}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => setModalConfigVisible(true)}
        >
          <Settings color={theme.text} size={20} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.headerIconBtn, { marginLeft: 6 }]}
          onPress={cargarDatos}
        >
          <RefreshCw color={theme.text} size={18} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Banner de Acceso Rápido a Boletería */}
        <TouchableOpacity
          style={styles.posBanner}
          onPress={() => router.push('/entradas_venta')}
          activeOpacity={0.88}
        >
          <View style={styles.posBannerIcon}>
            <Ticket color="white" size={24} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.posBannerTitle}>Abrir Boletería de Venta Rápida</Text>
            <Text style={styles.posBannerSub}>Emitir entradas en la fila desde este dispositivo</Text>
          </View>
          <Text style={styles.posBannerArrow}>→</Text>
        </TouchableOpacity>

        {/* Tarjeta Principal de KPIs Globales */}
        <View style={[styles.kpiCard, { backgroundColor: '#1e293b' }]}>
          <View style={styles.kpiHeader}>
            <View>
              <Text style={styles.kpiTotalLabel}>TOTAL RECAUDADO GLOBAL</Text>
              <Text style={styles.kpiTotalVal}>S/ {globalTotalRecaudado.toFixed(2)}</Text>
            </View>
            <TouchableOpacity style={styles.shareKpiBtn} onPress={compartirReporteGlobal}>
              <Share2 color="#94a3b8" size={20} />
            </TouchableOpacity>
          </View>

          <View style={styles.kpiGrid}>
            <View style={styles.kpiGridBox}>
              <Text style={styles.kpiGridLabel}>Entradas Vendidas</Text>
              <Text style={styles.kpiGridVal}>{globalTotalEntradas}</Text>
            </View>

            <View style={styles.kpiGridBox}>
              <Text style={styles.kpiGridLabel}>Efectivo en Mano</Text>
              <Text style={[styles.kpiGridVal, { color: '#4ade80' }]}>S/ {globalEfectivo.toFixed(2)}</Text>
            </View>

            <View style={styles.kpiGridBox}>
              <Text style={styles.kpiGridLabel}>Yape / Digital</Text>
              <Text style={[styles.kpiGridVal, { color: '#c084fc' }]}>S/ {globalDigital.toFixed(2)}</Text>
            </View>
          </View>

          {/* Barra de Aforo */}
          {aforoMax > 0 && (
            <View style={styles.aforoContainer}>
              <View style={styles.aforoHeader}>
                <Text style={styles.aforoLabel}>Aforo: {globalTotalEntradas} de {aforoMax} entradas</Text>
                <Text style={styles.aforoPercent}>{aforoPorcentaje}%</Text>
              </View>
              <View style={styles.aforoTrack}>
                <View style={[styles.aforoFill, { width: `${aforoPorcentaje}%` }]} />
              </View>
              <Text style={styles.aforoRestante}>
                Quedan {aforoRestante} entradas disponibles antes de agotar aforo.
              </Text>
            </View>
          )}
        </View>

        {/* ===================================================================== */}
        {/* MONITOR DE COLABORADORES                                              */}
        {/* ===================================================================== */}
        <View style={styles.sectionHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Users color="#2563eb" size={20} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Monitor de Colaboradores ({colaboradores.length})
            </Text>
          </View>
        </View>

        {colaboradores.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Users color={theme.textMuted} size={28} />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              Ningún colaborador ha registrado ventas aún en este evento.
            </Text>
          </View>
        ) : (
          <View style={[styles.colabsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {colaboradores.map((colab, idx) => (
              <View
                key={colab.nombre}
                style={[
                  styles.colabItem,
                  idx !== colaboradores.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: 1 },
                ]}
              >
                <View style={styles.colabItemHeader}>
                  <View style={styles.colabIndexBox}>
                    <Text style={styles.colabIndexText}>#{idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.colabItemNombre, { color: theme.text }]}>{colab.nombre}</Text>
                    <Text style={[styles.colabItemSub, { color: theme.textMuted }]}>
                      {colab.entradas} entradas vendidas en {colab.transacciones} ventas
                    </Text>
                  </View>

                  <Text style={[styles.colabItemTotal, { color: theme.primary }]}>
                    S/ {colab.total.toFixed(2)}
                  </Text>
                </View>

                {/* Desglose de Caja del Colaborador */}
                <View style={styles.colabMoneyRow}>
                  <View style={styles.colabMoneyPill}>
                    <DollarSign color="#16a34a" size={13} />
                    <Text style={styles.colabMoneyLabel}>Efectivo a Entregar:</Text>
                    <Text style={styles.colabMoneyValGreen}>S/ {colab.efectivo.toFixed(2)}</Text>
                  </View>

                  <View style={styles.colabMoneyPill}>
                    <Smartphone color="#9333ea" size={13} />
                    <Text style={styles.colabMoneyLabel}>Digital (Yape/Plin):</Text>
                    <Text style={styles.colabMoneyValPurple}>
                      S/ {(colab.yape + colab.plin + colab.otros).toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ===================================================================== */}
        {/* LOG COMPLETO DE VENTAS & AUDITORÍA                                    */}
        {/* ===================================================================== */}
        <View style={[styles.sectionHeaderRow, { marginTop: 25 }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Auditoría de Entradas ({ventasFiltradas.length})
          </Text>
        </View>

        {/* Buscador */}
        <View style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Search color={theme.textMuted} size={18} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Buscar por ticket #, DNI, nombre o colaborador..."
            placeholderTextColor={theme.textMuted}
            value={busqueda}
            onChangeText={setBusqueda}
          />
          {busqueda.length > 0 && (
            <TouchableOpacity onPress={() => setBusqueda('')}>
              <X color={theme.textMuted} size={18} />
            </TouchableOpacity>
          )}
        </View>

        {ventasFiltradas.slice(0, 50).map(v => {
          const isAnulada = v.estado === 'ANULADA';
          const ticketsLabel = v.numero_ticket_inicio === v.numero_ticket_fin
            ? `#${v.numero_ticket_inicio}`
            : `#${v.numero_ticket_inicio} al #${v.numero_ticket_fin}`;

          return (
            <View
              key={v.id}
              style={[
                styles.auditCard,
                {
                  backgroundColor: theme.card,
                  borderColor: isAnulada ? '#fca5a5' : theme.border,
                  opacity: isAnulada ? 0.75 : 1,
                },
              ]}
            >
              <View style={styles.auditHeader}>
                <View style={styles.auditTicketBadge}>
                  <Ticket color="#2563eb" size={13} />
                  <Text style={styles.auditTicketText}>{ticketsLabel}</Text>
                </View>

                <Text
                  style={[
                    styles.auditMonto,
                    {
                      color: isAnulada ? theme.textMuted : '#16a34a',
                      textDecorationLine: isAnulada ? 'line-through' : 'none',
                    },
                  ]}
                >
                  S/ {Number(v.monto_total).toFixed(2)}
                </Text>
              </View>

              <View style={styles.auditBody}>
                <Text style={[styles.auditBuyer, { color: theme.text }]}>
                  👤 Titular: {v.nombre_completo || 'Sin nombre'}
                </Text>
                <Text style={[styles.auditDni, { color: theme.textMuted }]}>
                  🪪 DNI: {v.dni || 'Sin DNI'} • {v.cantidad} ent. ({v.metodo_pago})
                </Text>
                <Text style={[styles.auditColab, { color: theme.textMuted }]}>
                  👨‍💼 Emitido por: {v.colaborador_nombre} • {new Date(v.fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>

              {/* Botón ver comprobante si existe */}
              {v.url_comprobante ? (
                <TouchableOpacity
                  style={styles.btnVerComprobante}
                  onPress={() => setComprobanteUrlGrande(v.url_comprobante!)}
                >
                  <Image source={{ uri: v.url_comprobante }} style={styles.miniComprobanteImg} />
                  <Text style={styles.btnVerComprobanteText}>Ver Comprobante de Pago</Text>
                </TouchableOpacity>
              ) : null}

              {isAnulada ? (
                <View style={styles.auditAnuladaBox}>
                  <Text style={styles.auditAnuladaText}>
                    🚫 ANULADA: {v.motivo_anulacion || 'Sin motivo'}
                  </Text>
                </View>
              ) : (
                <View style={styles.auditActionsRow}>
                  <TouchableOpacity
                    style={styles.auditAnularBtn}
                    onPress={() => anularVentaAdmin(v)}
                  >
                    <Text style={styles.auditAnularBtnText}>Anular Entrada</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ===================================================================== */}
      {/* MODAL CONFIGURACIÓN EVENTO / PRECIO ÚNICO / AFORO                    */}
      {/* ===================================================================== */}
      <Modal
        visible={modalConfigVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalConfigVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalBoxTitle, { color: theme.text }]}>Configuración del Evento</Text>
              <TouchableOpacity onPress={() => setModalConfigVisible(false)}>
                <X color={theme.textMuted} size={22} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: theme.textMuted }]}>Nombre del Evento:</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder="Ej: Gran Torneo de Fútbol 2026"
              placeholderTextColor={theme.textMuted}
              value={eventoNombreInput}
              onChangeText={setEventoNombreInput}
            />

            <Text style={[styles.inputLabel, { color: theme.textMuted, marginTop: 12 }]}>Precio por Entrada (S/):</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder="10.00"
              keyboardType="numeric"
              placeholderTextColor={theme.textMuted}
              value={eventoPrecioInput}
              onChangeText={setEventoPrecioInput}
            />

            <Text style={[styles.inputLabel, { color: theme.textMuted, marginTop: 12 }]}>Lugar / Sede:</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder="Ej: Complejo Deportivo Cristo Rey"
              placeholderTextColor={theme.textMuted}
              value={eventoLugarInput}
              onChangeText={setEventoLugarInput}
            />

            <Text style={[styles.inputLabel, { color: theme.textMuted, marginTop: 12 }]}>
              Aforo Máximo de Entradas (Opcional):
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder="Dejar en blanco si no hay límite"
              keyboardType="numeric"
              placeholderTextColor={theme.textMuted}
              value={eventoAforoInput}
              onChangeText={setEventoAforoInput}
            />

            <AnimatedButton
              style={styles.modalSaveBtn}
              onPress={handleGuardarConfigEvento}
              disabled={guardandoConfig}
            >
              {guardandoConfig ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.modalSaveBtnText}>Guardar Cambios del Evento</Text>
              )}
            </AnimatedButton>
          </View>
        </View>
      </Modal>

      {/* ===================================================================== */}
      {/* MODAL VER COMPROBANTE EN GRANDE                                       */}
      {/* ===================================================================== */}
      <Modal
        visible={comprobanteUrlGrande !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setComprobanteUrlGrande(null)}
      >
        <View style={styles.modalOverlayGrande}>
          <TouchableOpacity
            style={styles.closeModalGrandeBtn}
            onPress={() => setComprobanteUrlGrande(null)}
          >
            <X color="white" size={28} />
          </TouchableOpacity>

          {comprobanteUrlGrande ? (
            <Image
              source={{ uri: comprobanteUrlGrande }}
              style={styles.comprobanteGrandeImg}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 12, fontFamily: fonts.medium, fontSize: 14 },
  scroll: { padding: 16 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
  },
  headerSub: {
    fontSize: 12,
    fontFamily: fonts.regular,
  },
  headerIconBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },

  // POS Banner
  posBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 18,
    marginBottom: 16,
    gap: 12,
  },
  posBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  posBannerTitle: {
    color: 'white',
    fontSize: 15,
    fontFamily: fonts.bold,
  },
  posBannerSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  posBannerArrow: {
    color: 'white',
    fontSize: 22,
    fontFamily: fonts.bold,
  },

  // KPI Card
  kpiCard: {
    padding: 18,
    borderRadius: 20,
    marginBottom: 20,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  kpiTotalLabel: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  kpiTotalVal: {
    fontSize: 28,
    fontFamily: fonts.extraBold,
    color: '#ffffff',
    marginTop: 2,
  },
  shareKpiBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 14,
  },
  kpiGridBox: {
    flex: 1,
  },
  kpiGridLabel: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: '#94a3b8',
  },
  kpiGridVal: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: '#ffffff',
    marginTop: 2,
  },

  // Aforo
  aforoContainer: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  aforoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  aforoLabel: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: '#cbd5e1',
  },
  aforoPercent: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: '#38bdf8',
  },
  aforoTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  aforoFill: {
    height: '100%',
    backgroundColor: '#38bdf8',
    borderRadius: 4,
  },
  aforoRestante: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: '#94a3b8',
    marginTop: 6,
  },

  // Secciones
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
  },

  // Colaboradores
  emptyCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    textAlign: 'center',
  },
  colabsCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  colabItem: {
    padding: 14,
  },
  colabItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colabIndexBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colabIndexText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: '#2563eb',
  },
  colabItemNombre: {
    fontSize: 15,
    fontFamily: fonts.bold,
  },
  colabItemSub: {
    fontSize: 12,
    fontFamily: fonts.regular,
    marginTop: 1,
  },
  colabItemTotal: {
    fontSize: 16,
    fontFamily: fonts.bold,
  },
  colabMoneyRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  colabMoneyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  colabMoneyLabel: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: '#64748b',
  },
  colabMoneyValGreen: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: '#16a34a',
  },
  colabMoneyValPurple: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: '#9333ea',
  },

  // Auditoría
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
    marginBottom: 14,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.regular,
  },
  auditCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  auditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  auditTicketBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  auditTicketText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: '#2563eb',
  },
  auditMonto: {
    fontSize: 15,
    fontFamily: fonts.bold,
  },
  auditBody: {
    gap: 2,
  },
  auditBuyer: {
    fontSize: 14,
    fontFamily: fonts.bold,
  },
  auditDni: {
    fontSize: 12,
    fontFamily: fonts.medium,
  },
  auditColab: {
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  btnVerComprobante: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    padding: 6,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  miniComprobanteImg: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#cbd5e1',
  },
  btnVerComprobanteText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: '#2563eb',
  },
  auditAnuladaBox: {
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 6,
  },
  auditAnuladaText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: '#dc2626',
  },
  auditActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 6,
  },
  auditAnularBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#fee2e2',
  },
  auditAnularBtnText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: '#dc2626',
  },

  // Modales
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalBoxTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: fonts.medium,
    marginBottom: 6,
  },
  modalInput: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: fonts.regular,
  },
  modalSaveBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  modalSaveBtnText: {
    color: 'white',
    fontSize: 15,
    fontFamily: fonts.bold,
  },

  // Modal Grande
  modalOverlayGrande: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  closeModalGrandeBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  comprobanteGrandeImg: {
    width: '100%',
    height: '80%',
  },
});
