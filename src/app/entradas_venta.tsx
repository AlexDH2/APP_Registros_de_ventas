import React, { useState, useCallback, useRef } from 'react';
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
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { colors, fonts } from '../theme';
import AnimatedButton from '../components/AnimatedButton';
import {
  Ticket,
  DollarSign,
  Smartphone,
  CreditCard,
  Plus,
  Minus,
  CheckCircle2,
  RefreshCw,
  Share2,
  Users,
  FileText,
  ArrowLeft,
  Wallet,
} from 'lucide-react-native';

type TipoEntrada = {
  id: number;
  nombre: string;
  precio: number;
  color: string;
  activo: boolean;
};

type EventoActivo = {
  id: number;
  nombre: string;
  lugar: string;
  aforo_maximo: number | null;
  estado: string;
};

type ItemSeleccionado = {
  tipo_entrada_id: number;
  nombre: string;
  precio: number;
  cantidad: number;
  subtotal: number;
};

type VentaRealizada = {
  id: number;
  numero_ticket_inicio: number;
  numero_ticket_fin: number;
  cantidad_total: number;
  monto_total: number;
  metodo_pago: string;
  colaborador_nombre: string;
  estado: string;
  fecha: string;
  nombre_comprador?: string;
  detalle_venta_entradas?: {
    nombre_tipo: string;
    cantidad: number;
    precio_unitario: number;
  }[];
};

export default function EntradasVentaScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? colors.dark : colors.light;

  // Sesión y Colaborador
  const [colaboradorId, setColaboradorId] = useState<number | null>(null);
  const [colaboradorNombre, setColaboradorNombre] = useState<string>('Colaborador');
  const [activeTab, setActiveTab] = useState<'VENTA' | 'HISTORIAL' | 'CUADRE'>('VENTA');

  // Evento y Tipos de Entrada
  const [evento, setEvento] = useState<EventoActivo | null>(null);
  const [tiposEntradas, setTiposEntradas] = useState<TipoEntrada[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [cantidades, setCantidades] = useState<Record<number, number>>({});

  // Datos de Pago
  const [metodoPago, setMetodoPago] = useState<'Efectivo' | 'Yape' | 'Plin' | 'Tarjeta' | 'Transferencia'>('Efectivo');
  const [montoRecibido, setMontoRecibido] = useState<string>('');
  
  // Datos Opcionales del Comprador
  const [mostrarOpcionales, setMostrarOpcionales] = useState<boolean>(false);
  const [nombreComprador, setNombreComprador] = useState<string>('');
  const [dniComprador, setDniComprador] = useState<string>('');
  const [notas, setNotas] = useState<string>('');

  // Estados de Transacción & Concurrencia
  const [procesandoVenta, setProcesandoVenta] = useState<boolean>(false);
  const isSavingRef = useRef<boolean>(false);

  // Modal de Venta Exitosa
  const [modalExitoVisible, setModalExitoVisible] = useState<boolean>(false);
  const [ultimaVentaExito, setUltimaVentaExito] = useState<{
    ticketInicio: number;
    ticketFin: number;
    cantidad: number;
    total: number;
    metodo: string;
    vuelto: number;
  } | null>(null);

  // Historial de Mis Ventas & Cuadre
  const [misVentas, setMisVentas] = useState<VentaRealizada[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState<boolean>(false);

  // Métricas Rápidas
  const [stats, setStats] = useState({
    misEntradas: 0,
    miTotal: 0,
    globalEntradas: 0,
    globalTotal: 0,
  });

  useFocusEffect(
    useCallback(() => {
      cargarDatosIniciales();
    }, [])
  );

  const cargarDatosIniciales = async () => {
    try {
      setLoading(true);
      // 1. Obtener usuario de sesión
      const savedUserId = await AsyncStorage.getItem('usuario_id');
      const savedUserNombre = await AsyncStorage.getItem('usuario_nombre');
      if (savedUserId) setColaboradorId(parseInt(savedUserId));
      if (savedUserNombre) setColaboradorNombre(savedUserNombre);

      const nombreActual = savedUserNombre || 'Colaborador';

      // 2. Obtener evento activo
      const { data: eventos, error: eventoError } = await supabase
        .from('eventos')
        .select('*')
        .eq('estado', 'ACTIVO')
        .order('id', { ascending: false })
        .limit(1);

      if (eventoError) throw eventoError;

      if (!eventos || eventos.length === 0) {
        // Si no hay evento activo, crear uno básico por defecto
        const { data: nuevoEvento } = await supabase
          .from('eventos')
          .insert([{
            nombre: 'Gran Evento Deportivo 2026',
            lugar: 'Sede Principal',
            estado: 'ACTIVO',
            aforo_maximo: 1000,
          }])
          .select()
          .single();

        if (nuevoEvento) {
          setEvento(nuevoEvento);
          await inicializarTiposEntrada(nuevoEvento.id);
        }
      } else {
        const ev = eventos[0];
        setEvento(ev);
        await cargarTiposEntrada(ev.id);
        await cargarMetricasYVentas(ev.id, nombreActual);
      }
    } catch (e: any) {
      console.log('Error cargando evento:', e);
      Alert.alert(
        'Aviso de Conexión',
        'No se pudo conectar con el módulo de entradas. Asegúrate de haber ejecutado el script "modulo_ventas_entradas.sql" en Supabase.'
      );
    } finally {
      setLoading(false);
    }
  };

  const inicializarTiposEntrada = async (eventoId: number) => {
    try {
      const tiposDefecto = [
        { evento_id: eventoId, nombre: 'Entrada General', precio: 10.00, color: '#2563eb' },
        { evento_id: eventoId, nombre: 'Entrada Niños / Alumnos', precio: 5.00, color: '#10b981' },
        { evento_id: eventoId, nombre: 'Entrada VIP / Preferencial', precio: 20.00, color: '#8b5cf6' },
      ];
      const { data } = await supabase.from('tipos_entradas').insert(tiposDefecto).select();
      if (data) setTiposEntradas(data);
    } catch (e) {
      console.log('Error inicializando tipos:', e);
    }
  };

  const cargarTiposEntrada = async (eventoId: number) => {
    try {
      const { data, error } = await supabase
        .from('tipos_entradas')
        .select('*')
        .eq('evento_id', eventoId)
        .eq('activo', true)
        .order('id', { ascending: true });

      if (error) throw error;
      if (data && data.length > 0) {
        setTiposEntradas(data);
      } else {
        await inicializarTiposEntrada(eventoId);
      }
    } catch (e) {
      console.log('Error cargando tipos de entradas:', e);
    }
  };

  const cargarMetricasYVentas = async (eventoId: number, nombreColab: string) => {
    try {
      setCargandoHistorial(true);
      // Obtener todas las ventas del evento para estadísticas
      const { data: ventas, error } = await supabase
        .from('ventas_entradas')
        .select('*, detalle_venta_entradas(*)')
        .eq('evento_id', eventoId)
        .order('id', { ascending: false });

      if (error) throw error;

      if (ventas) {
        const activas = ventas.filter(v => v.estado === 'COMPLETADA');
        const misActivas = activas.filter(v => v.colaborador_nombre === nombreColab);

        const totalMisEntradas = misActivas.reduce((acc, v) => acc + (v.cantidad_total || 0), 0);
        const totalMiMonto = misActivas.reduce((acc, v) => acc + Number(v.monto_total || 0), 0);

        const totalGlobalEntradas = activas.reduce((acc, v) => acc + (v.cantidad_total || 0), 0);
        const totalGlobalMonto = activas.reduce((acc, v) => acc + Number(v.monto_total || 0), 0);

        setStats({
          misEntradas: totalMisEntradas,
          miTotal: totalMiMonto,
          globalEntradas: totalGlobalEntradas,
          globalTotal: totalGlobalMonto,
        });

        // Filtrar mis ventas para la pestaña de historial
        setMisVentas(ventas.filter(v => v.colaborador_nombre === nombreColab));
      }
    } catch (e) {
      console.log('Error cargando métricas:', e);
    } finally {
      setCargandoHistorial(false);
    }
  };

  // Gestión de Cantidades
  const modificarCantidad = (tipoId: number, delta: number) => {
    setCantidades(prev => {
      const actual = prev[tipoId] || 0;
      const nuevo = Math.max(0, actual + delta);
      return { ...prev, [tipoId]: nuevo };
    });
  };

  const setCantidadDirecta = (tipoId: number, valor: number) => {
    setCantidades(prev => ({
      ...prev,
      [tipoId]: Math.max(0, valor),
    }));
  };

  // Cálculos de Totales
  const calcularItems = (): ItemSeleccionado[] => {
    const items: ItemSeleccionado[] = [];
    tiposEntradas.forEach(tipo => {
      const cant = cantidades[tipo.id] || 0;
      if (cant > 0) {
        items.push({
          tipo_entrada_id: tipo.id,
          nombre: tipo.nombre,
          precio: Number(tipo.precio),
          cantidad: cant,
          subtotal: Number(tipo.precio) * cant,
        });
      }
    });
    return items;
  };

  const itemsSeleccionados = calcularItems();
  const totalCantidad = itemsSeleccionados.reduce((acc, it) => acc + it.cantidad, 0);
  const totalMonto = itemsSeleccionados.reduce((acc, it) => acc + it.subtotal, 0);

  // Vuelto en Efectivo
  const montoRecibidoNum = parseFloat(montoRecibido.replace(',', '.')) || 0;
  const vueltoCalculado = metodoPago === 'Efectivo' && montoRecibidoNum > totalMonto
    ? montoRecibidoNum - totalMonto
    : 0;

  // Reiniciar formulario para la siguiente venta
  const resetearFormulario = () => {
    setCantidades({});
    setMontoRecibido('');
    setNombreComprador('');
    setDniComprador('');
    setNotas('');
    setMetodoPago('Efectivo');
  };

  // EMISIÓN DE ENTRADAS (ATÓMICA Y CONCURRENTE)
  const emitirEntradas = async () => {
    if (isSavingRef.current || procesandoVenta) return;

    if (!evento) {
      return Alert.alert('Aviso', 'No hay ningún evento activo configurado.');
    }

    if (totalCantidad <= 0 || totalMonto <= 0) {
      return Alert.alert('Aviso', 'Selecciona al menos una entrada para vender.');
    }

    if (metodoPago === 'Efectivo' && montoRecibidoNum > 0 && montoRecibidoNum < totalMonto) {
      return Alert.alert(
        'Monto Insuficiente',
        `El cliente debe pagar S/ ${totalMonto.toFixed(2)}. El monto ingresado (S/ ${montoRecibidoNum.toFixed(2)}) es menor.`
      );
    }

    try {
      isSavingRef.current = true;
      setProcesandoVenta(true);

      const itemsPayload = itemsSeleccionados.map(it => ({
        tipo_entrada_id: it.tipo_entrada_id,
        nombre: it.nombre,
        precio: it.precio,
        cantidad: it.cantidad,
        subtotal: it.subtotal,
      }));

      // Intentar primero mediante función RPC atómica (100% thread-safe)
      const { data: rpcResult, error: rpcError } = await supabase.rpc(
        'registrar_venta_entradas_atomica',
        {
          p_evento_id: evento.id,
          p_colaborador_id: colaboradorId,
          p_colaborador_nombre: colaboradorNombre,
          p_metodo_pago: metodoPago,
          p_monto_total: totalMonto,
          p_monto_recibido: montoRecibidoNum > 0 ? montoRecibidoNum : totalMonto,
          p_vuelto: vueltoCalculado,
          p_nombre_comprador: nombreComprador.trim() || null,
          p_dni_comprador: dniComprador.trim() || null,
          p_notas: notas.trim() || null,
          p_items: itemsPayload,
        }
      );

      let ticketInicio = 0;
      let ticketFin = 0;

      if (!rpcError && rpcResult && rpcResult.ticket_inicio) {
        ticketInicio = rpcResult.ticket_inicio;
        ticketFin = rpcResult.ticket_fin;
      } else {
        // Fallback directo si la función RPC aún no se ejecutó en la base de datos
        console.warn('Fallback a inserción directa:', rpcError?.message);

        // Obtener último número de ticket asignado
        const { data: ultVenta } = await supabase
          .from('ventas_entradas')
          .select('numero_ticket_fin')
          .order('numero_ticket_fin', { ascending: false })
          .limit(1);

        const ultimoNumero = ultVenta && ultVenta[0]?.numero_ticket_fin ? ultVenta[0].numero_ticket_fin : 0;
        ticketInicio = ultimoNumero + 1;
        ticketFin = ticketInicio + totalCantidad - 1;

        const { data: ventaDirecta, error: directError } = await supabase
          .from('ventas_entradas')
          .insert([{
            evento_id: evento.id,
            numero_ticket_inicio: ticketInicio,
            numero_ticket_fin: ticketFin,
            cantidad_total: totalCantidad,
            monto_total: totalMonto,
            metodo_pago: metodoPago,
            monto_recibido: montoRecibidoNum > 0 ? montoRecibidoNum : totalMonto,
            vuelto: vueltoCalculado,
            colaborador_id: colaboradorId,
            colaborador_nombre: colaboradorNombre,
            nombre_comprador: nombreComprador.trim() || null,
            dni_comprador: dniComprador.trim() || null,
            notas: notas.trim() || null,
            estado: 'COMPLETADA',
          }])
          .select()
          .single();

        if (directError) throw directError;

        if (ventaDirecta) {
          const detallePayload = itemsSeleccionados.map(it => ({
            venta_entrada_id: ventaDirecta.id,
            tipo_entrada_id: it.tipo_entrada_id,
            nombre_tipo: it.nombre,
            precio_unitario: it.precio,
            cantidad: it.cantidad,
            subtotal: it.subtotal,
          }));
          await supabase.from('detalle_venta_entradas').insert(detallePayload);
        }
      }

      // Preparar modal de éxito
      setUltimaVentaExito({
        ticketInicio,
        ticketFin,
        cantidad: totalCantidad,
        total: totalMonto,
        metodo: metodoPago,
        vuelto: vueltoCalculado,
      });

      setModalExitoVisible(true);
      resetearFormulario();

      // Recargar métricas en segundo plano
      if (evento) {
        cargarMetricasYVentas(evento.id, colaboradorNombre);
      }
    } catch (e: any) {
      console.log('Error emitiendo entradas:', e);
      Alert.alert('Error al Registrar Venta', e.message || 'Ocurrió un error inesperado.');
    } finally {
      setProcesandoVenta(false);
      setTimeout(() => {
        isSavingRef.current = false;
      }, 750);
    }
  };

  // Compartir comprobante rápido por WhatsApp / Mensajes
  const compartirComprobante = async () => {
    if (!ultimaVentaExito) return;
    try {
      const ticketsTexto = ultimaVentaExito.ticketInicio === ultimaVentaExito.ticketFin
        ? `#${ultimaVentaExito.ticketInicio}`
        : `#${ultimaVentaExito.ticketInicio} al #${ultimaVentaExito.ticketFin}`;

      const texto = `🎟️ *COMPROBANTE DE ENTRADA — ${evento?.nombre || 'CAMPEONES LIMA'}*\n\n` +
        `🎫 *Tickets:* ${ticketsTexto}\n` +
        `🔢 *Cantidad:* ${ultimaVentaExito.cantidad} entrada(s)\n` +
        `💰 *Total Pagado:* S/ ${ultimaVentaExito.total.toFixed(2)} (${ultimaVentaExito.metodo})\n` +
        `👤 *Atendido por:* ${colaboradorNombre}\n` +
        `📅 *Fecha:* ${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}\n\n` +
        `¡Gracias por asistir al evento! Presenta este comprobante en la puerta de acceso.`;

      await Share.share({ message: texto });
    } catch (e) {
      console.log('Error al compartir:', e);
    }
  };

  // Anulación de Venta (Con motivo obligatorio)
  const solicitarAnulacion = (venta: VentaRealizada) => {
    Alert.prompt(
      'Anular Venta de Entradas',
      `¿Deseas anular la venta de ${venta.cantidad_total} entrada(s) (Tickets #${venta.numero_ticket_inicio} al #${venta.numero_ticket_fin})?\n\nIngresa el motivo de la anulación:`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Anular Venta',
          style: 'destructive',
          onPress: async (motivo) => {
            if (!motivo || !motivo.trim()) {
              return Alert.alert('Aviso', 'Debes ingresar un motivo para anular la venta.');
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

              Alert.alert('Venta Anulada', 'La venta fue anulada correctamente y se ha descontado de tu caja.');
              if (evento) cargarMetricasYVentas(evento.id, colaboradorNombre);
            } catch (e: any) {
              Alert.alert('Error', e.message || 'No se pudo anular la venta.');
            }
          },
        },
      ],
      'plain-text',
      'Error en cantidad / cancelación de cliente'
    );
  };

  // Desglose de Cuadre Personal
  const calcularCuadrePersonal = () => {
    const activas = misVentas.filter(v => v.estado === 'COMPLETADA');
    const efectivo = activas.filter(v => v.metodo_pago === 'Efectivo').reduce((acc, v) => acc + Number(v.monto_total), 0);
    const yape = activas.filter(v => v.metodo_pago === 'Yape').reduce((acc, v) => acc + Number(v.monto_total), 0);
    const plin = activas.filter(v => v.metodo_pago === 'Plin').reduce((acc, v) => acc + Number(v.monto_total), 0);
    const otros = activas.filter(v => v.metodo_pago !== 'Efectivo' && v.metodo_pago !== 'Yape' && v.metodo_pago !== 'Plin').reduce((acc, v) => acc + Number(v.monto_total), 0);
    const totalEntradas = activas.reduce((acc, v) => acc + (v.cantidad_total || 0), 0);
    const totalRecaudado = efectivo + yape + plin + otros;

    return {
      totalEntradas,
      efectivo,
      yape,
      plin,
      otros,
      totalRecaudado,
      totalTransacciones: activas.length,
    };
  };

  const cuadre = calcularCuadrePersonal();

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={[styles.loadingText, { color: theme.textMuted }]}>Cargando boletería del evento...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* 1. Header con Información de Evento y Colaborador */}
      <View style={[styles.topBar, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={styles.topBarRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft color={theme.text} size={22} />
          </TouchableOpacity>

          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={[styles.eventoTitulo, { color: theme.text }]} numberOfLines={1}>
              {evento?.nombre || 'Gran Evento Deportivo'}
            </Text>
            <Text style={[styles.eventoSub, { color: theme.textMuted }]}>
              📍 {evento?.lugar || 'Sede Principal'}
            </Text>
          </View>

          <View style={styles.colabBadge}>
            <Users color="#2563eb" size={14} />
            <Text style={styles.colabText} numberOfLines={1}>
              {colaboradorNombre}
            </Text>
          </View>
        </View>

        {/* 2. Barra de Navegación de Pestañas */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'VENTA' && styles.tabBtnActive]}
            onPress={() => setActiveTab('VENTA')}
          >
            <Ticket color={activeTab === 'VENTA' ? '#2563eb' : theme.textMuted} size={16} />
            <Text style={[styles.tabBtnText, { color: activeTab === 'VENTA' ? '#2563eb' : theme.textMuted }]}>
              Boletería
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'HISTORIAL' && styles.tabBtnActive]}
            onPress={() => setActiveTab('HISTORIAL')}
          >
            <FileText color={activeTab === 'HISTORIAL' ? '#2563eb' : theme.textMuted} size={16} />
            <Text style={[styles.tabBtnText, { color: activeTab === 'HISTORIAL' ? '#2563eb' : theme.textMuted }]}>
              Mis Ventas ({misVentas.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'CUADRE' && styles.tabBtnActive]}
            onPress={() => setActiveTab('CUADRE')}
          >
            <Wallet color={activeTab === 'CUADRE' ? '#2563eb' : theme.textMuted} size={16} />
            <Text style={[styles.tabBtnText, { color: activeTab === 'CUADRE' ? '#2563eb' : theme.textMuted }]}>
              Mi Caja
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ========================================================================= */}
      {/* PESTAÑA 1: BOLETERÍA RÁPIDA (VENTA EN EL MOMENTO)                         */}
      {/* ========================================================================= */}
      {activeTab === 'VENTA' && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {/* Banner de Estadísticas Rápidas */}
            <View style={[styles.statsBanner, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Mis Ventas Hoy</Text>
                <Text style={styles.statValBlue}>
                  {stats.misEntradas} ent. (S/ {stats.miTotal.toFixed(2)})
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Total Global Evento</Text>
                <Text style={styles.statValGreen}>
                  {stats.globalEntradas} ent. (S/ {stats.globalTotal.toFixed(2)})
                </Text>
              </View>
            </View>

            {/* Listado de Tipos de Entradas */}
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Selecciona Entradas</Text>

            {tiposEntradas.map(tipo => {
              const cant = cantidades[tipo.id] || 0;
              const subtotal = cant * Number(tipo.precio);
              const isSelected = cant > 0;

              return (
                <View
                  key={tipo.id}
                  style={[
                    styles.ticketCard,
                    {
                      backgroundColor: theme.card,
                      borderColor: isSelected ? '#2563eb' : theme.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                >
                  <View style={styles.ticketCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.ticketNombre, { color: theme.text }]}>{tipo.nombre}</Text>
                      <Text style={[styles.ticketPrecio, { color: theme.primary }]}>
                        S/ {Number(tipo.precio).toFixed(2)} c/u
                      </Text>
                    </View>

                    {isSelected && (
                      <View style={styles.subtotalPill}>
                        <Text style={styles.subtotalPillText}>S/ {subtotal.toFixed(2)}</Text>
                      </View>
                    )}
                  </View>

                  {/* Controles de Cantidad */}
                  <View style={styles.counterRow}>
                    <TouchableOpacity
                      style={[styles.counterBtn, cant === 0 && styles.counterBtnDisabled]}
                      onPress={() => modificarCantidad(tipo.id, -1)}
                      disabled={cant === 0}
                    >
                      <Minus color={cant === 0 ? '#94a3b8' : '#2563eb'} size={20} />
                    </TouchableOpacity>

                    <Text style={[styles.counterNumber, { color: theme.text }]}>{cant}</Text>

                    <TouchableOpacity
                      style={styles.counterBtn}
                      onPress={() => modificarCantidad(tipo.id, 1)}
                    >
                      <Plus color="#2563eb" size={20} />
                    </TouchableOpacity>

                    {/* Botones de Atajo Rápido */}
                    <View style={styles.shortcutsRow}>
                      <TouchableOpacity
                        style={[styles.shortcutBtn, cant === 1 && styles.shortcutBtnActive]}
                        onPress={() => setCantidadDirecta(tipo.id, 1)}
                      >
                        <Text style={[styles.shortcutText, cant === 1 && styles.shortcutTextActive]}>1</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.shortcutBtn, cant === 2 && styles.shortcutBtnActive]}
                        onPress={() => setCantidadDirecta(tipo.id, 2)}
                      >
                        <Text style={[styles.shortcutText, cant === 2 && styles.shortcutTextActive]}>2</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.shortcutBtn, cant === 5 && styles.shortcutBtnActive]}
                        onPress={() => setCantidadDirecta(tipo.id, 5)}
                      >
                        <Text style={[styles.shortcutText, cant === 5 && styles.shortcutTextActive]}>+5</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}

            {/* Selector de Método de Pago */}
            <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 15 }]}>Método de Pago</Text>
            <View style={styles.payMethodsGrid}>
              <TouchableOpacity
                style={[
                  styles.payMethodBtn,
                  metodoPago === 'Efectivo' && { backgroundColor: '#dcfce7', borderColor: '#16a34a' },
                ]}
                onPress={() => setMetodoPago('Efectivo')}
              >
                <DollarSign color={metodoPago === 'Efectivo' ? '#16a34a' : theme.textMuted} size={22} />
                <Text
                  style={[
                    styles.payMethodText,
                    { color: metodoPago === 'Efectivo' ? '#16a34a' : theme.text },
                  ]}
                >
                  Efectivo
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.payMethodBtn,
                  metodoPago === 'Yape' && { backgroundColor: '#f3e8ff', borderColor: '#9333ea' },
                ]}
                onPress={() => setMetodoPago('Yape')}
              >
                <Smartphone color={metodoPago === 'Yape' ? '#9333ea' : theme.textMuted} size={22} />
                <Text
                  style={[
                    styles.payMethodText,
                    { color: metodoPago === 'Yape' ? '#9333ea' : theme.text },
                  ]}
                >
                  Yape
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.payMethodBtn,
                  metodoPago === 'Plin' && { backgroundColor: '#e0f2fe', borderColor: '#0284c7' },
                ]}
                onPress={() => setMetodoPago('Plin')}
              >
                <Smartphone color={metodoPago === 'Plin' ? '#0284c7' : theme.textMuted} size={22} />
                <Text
                  style={[
                    styles.payMethodText,
                    { color: metodoPago === 'Plin' ? '#0284c7' : theme.text },
                  ]}
                >
                  Plin
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.payMethodBtn,
                  metodoPago === 'Tarjeta' && { backgroundColor: '#fef3c7', borderColor: '#d97706' },
                ]}
                onPress={() => setMetodoPago('Tarjeta')}
              >
                <CreditCard color={metodoPago === 'Tarjeta' ? '#d97706' : theme.textMuted} size={22} />
                <Text
                  style={[
                    styles.payMethodText,
                    { color: metodoPago === 'Tarjeta' ? '#d97706' : theme.text },
                  ]}
                >
                  Tarjeta/Transf
                </Text>
              </TouchableOpacity>
            </View>

            {/* Calculadora Rápida de Vuelto si es Efectivo */}
            {metodoPago === 'Efectivo' && totalMonto > 0 && (
              <View style={[styles.cashBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.cashBoxTitle, { color: theme.text }]}>Calculadora Rápida de Vuelto</Text>

                {/* Billetes rápidos */}
                <View style={styles.quickBillsRow}>
                  <TouchableOpacity
                    style={styles.quickBillBtn}
                    onPress={() => setMontoRecibido(totalMonto.toString())}
                  >
                    <Text style={styles.quickBillText}>Exacto (S/ {totalMonto})</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickBillBtn}
                    onPress={() => setMontoRecibido('20')}
                  >
                    <Text style={styles.quickBillText}>S/ 20</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickBillBtn}
                    onPress={() => setMontoRecibido('50')}
                  >
                    <Text style={styles.quickBillText}>S/ 50</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickBillBtn}
                    onPress={() => setMontoRecibido('100')}
                  >
                    <Text style={styles.quickBillText}>S/ 100</Text>
                  </TouchableOpacity>
                </View>

                {/* Input Manual y Vuelto */}
                <View style={styles.cashInputRow}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={[styles.inputLabel, { color: theme.textMuted }]}>Paga con (S/):</Text>
                    <TextInput
                      style={[styles.cashInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                      keyboardType="numeric"
                      placeholder="0.00"
                      placeholderTextColor={theme.textMuted}
                      value={montoRecibido}
                      onChangeText={setMontoRecibido}
                    />
                  </View>

                  <View style={styles.vueltoBox}>
                    <Text style={styles.vueltoLabel}>Vuelto a Entregar:</Text>
                    <Text style={styles.vueltoVal}>S/ {vueltoCalculado.toFixed(2)}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Sección Opcional: Datos del Comprador (Colapsable para no demorar la cola) */}
            <TouchableOpacity
              style={[styles.optionalHeader, { borderColor: theme.border }]}
              onPress={() => setMostrarOpcionales(!mostrarOpcionales)}
            >
              <Text style={[styles.optionalHeaderText, { color: theme.textMuted }]}>
                {mostrarOpcionales ? '▲ Ocultar datos del comprador' : '▼ Opcional: Nombre / DNI del comprador'}
              </Text>
            </TouchableOpacity>

            {mostrarOpcionales && (
              <View style={[styles.optionalBody, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <TextInput
                  style={[styles.optionalInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                  placeholder="Nombre o Apellido del Comprador"
                  placeholderTextColor={theme.textMuted}
                  value={nombreComprador}
                  onChangeText={setNombreComprador}
                />
                <TextInput
                  style={[styles.optionalInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, marginTop: 8 }]}
                  placeholder="DNI (Opcional)"
                  keyboardType="numeric"
                  placeholderTextColor={theme.textMuted}
                  value={dniComprador}
                  onChangeText={setDniComprador}
                />
                <TextInput
                  style={[styles.optionalInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, marginTop: 8 }]}
                  placeholder="Notas adicionales (Opcional)"
                  placeholderTextColor={theme.textMuted}
                  value={notas}
                  onChangeText={setNotas}
                />
              </View>
            )}

            <View style={{ height: 100 }} />
          </ScrollView>

          {/* 3. Barra Fija Inferior con Total y Botón de Emisión */}
          <View style={[styles.bottomBar, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
            <View style={styles.bottomBarInfo}>
              <Text style={[styles.bottomBarCount, { color: theme.textMuted }]}>
                {totalCantidad} {totalCantidad === 1 ? 'entrada' : 'entradas'}
              </Text>
              <Text style={[styles.bottomBarTotal, { color: theme.primary }]}>
                S/ {totalMonto.toFixed(2)}
              </Text>
            </View>

            <AnimatedButton
              style={[
                styles.emitirBtn,
                (totalCantidad === 0 || procesandoVenta) && styles.emitirBtnDisabled,
              ]}
              onPress={emitirEntradas}
              disabled={totalCantidad === 0 || procesandoVenta}
            >
              {procesandoVenta ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Ticket color="white" size={20} />
                  <Text style={styles.emitirBtnText}>
                    EMITIR ({totalCantidad})
                  </Text>
                </>
              )}
            </AnimatedButton>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 2: HISTORIAL DE MIS VENTAS                                        */}
      {/* ========================================================================= */}
      {activeTab === 'HISTORIAL' && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.tabHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>
              Mis Ventas ({misVentas.length})
            </Text>
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={() => evento && cargarMetricasYVentas(evento.id, colaboradorNombre)}
              disabled={cargandoHistorial}
            >
              {cargandoHistorial ? (
                <ActivityIndicator size="small" color="#2563eb" />
              ) : (
                <RefreshCw size={16} color={theme.textMuted} />
              )}
            </TouchableOpacity>
          </View>

          {misVentas.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ticket size={32} color={theme.textMuted} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No has registrado ventas aún</Text>
              <Text style={[styles.emptySub, { color: theme.textMuted }]}>
                Las entradas que emitas aparecerán aquí con su número de ticket asignado.
              </Text>
            </View>
          ) : (
            misVentas.map(venta => {
              const isAnulada = venta.estado === 'ANULADA';
              const ticketsLabel = venta.numero_ticket_inicio === venta.numero_ticket_fin
                ? `#${venta.numero_ticket_inicio}`
                : `#${venta.numero_ticket_inicio} al #${venta.numero_ticket_fin}`;

              return (
                <View
                  key={venta.id}
                  style={[
                    styles.historyCard,
                    {
                      backgroundColor: theme.card,
                      borderColor: isAnulada ? '#fca5a5' : theme.border,
                      opacity: isAnulada ? 0.75 : 1,
                    },
                  ]}
                >
                  <View style={styles.historyCardHeader}>
                    <View style={styles.ticketBadge}>
                      <Ticket color="#2563eb" size={14} />
                      <Text style={styles.ticketBadgeText}>{ticketsLabel}</Text>
                    </View>

                    <Text
                      style={[
                        styles.historyMonto,
                        {
                          color: isAnulada ? theme.textMuted : '#16a34a',
                          textDecorationLine: isAnulada ? 'line-through' : 'none',
                        },
                      ]}
                    >
                      S/ {Number(venta.monto_total).toFixed(2)}
                    </Text>
                  </View>

                  <View style={styles.historyCardBody}>
                    <Text style={[styles.historyItems, { color: theme.text }]}>
                      🎫 {venta.cantidad_total} {venta.cantidad_total === 1 ? 'Entrada' : 'Entradas'} ({venta.metodo_pago})
                    </Text>
                    {venta.nombre_comprador ? (
                      <Text style={[styles.historyBuyer, { color: theme.textMuted }]}>
                        👤 Comprador: {venta.nombre_comprador}
                      </Text>
                    ) : null}
                    <Text style={[styles.historyTime, { color: theme.textMuted }]}>
                      🕒 {new Date(venta.fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>

                  {isAnulada ? (
                    <View style={styles.anuladaBadge}>
                      <Text style={styles.anuladaBadgeText}>🚫 VENTA ANULADA</Text>
                    </View>
                  ) : (
                    <View style={styles.historyActionsRow}>
                      <TouchableOpacity
                        style={styles.anularBtn}
                        onPress={() => solicitarAnulacion(venta)}
                      >
                        <Text style={styles.anularBtnText}>Anular</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 3: CUADRE DE CAJA PERSONAL DEL COLABORADOR                        */}
      {/* ========================================================================= */}
      {activeTab === 'CUADRE' && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Cuadre Personal de Caja</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
            Resumen de dinero recaudado para entregar a la administración al finalizar tu turno.
          </Text>

          {/* Tarjeta de Efectivo en Mano (Crítico para entrega de caja) */}
          <View style={[styles.cashHighlightCard, { backgroundColor: '#dcfce7', borderColor: '#86efac' }]}>
            <View style={styles.cashHighlightHeader}>
              <DollarSign color="#16a34a" size={26} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.cashHighlightLabel}>EFECTIVO EN MANO A ENTREGAR</Text>
                <Text style={styles.cashHighlightVal}>S/ {cuadre.efectivo.toFixed(2)}</Text>
              </View>
            </View>
            <Text style={styles.cashHighlightSub}>
              Monto físico exacto que debes entregar al administrador/organizador.
            </Text>
          </View>

          {/* Tarjeta de Desglose Completo */}
          <View style={[styles.cuadreCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.cuadreCardTitle, { color: theme.text }]}>Desglose por Método de Pago</Text>

            <View style={styles.cuadreRow}>
              <View style={styles.cuadreRowLeft}>
                <DollarSign color="#16a34a" size={18} />
                <Text style={[styles.cuadreRowLabel, { color: theme.text }]}>Efectivo Físico</Text>
              </View>
              <Text style={[styles.cuadreRowVal, { color: '#16a34a' }]}>S/ {cuadre.efectivo.toFixed(2)}</Text>
            </View>

            <View style={styles.cuadreRow}>
              <View style={styles.cuadreRowLeft}>
                <Smartphone color="#9333ea" size={18} />
                <Text style={[styles.cuadreRowLabel, { color: theme.text }]}>Yape</Text>
              </View>
              <Text style={[styles.cuadreRowVal, { color: '#9333ea' }]}>S/ {cuadre.yape.toFixed(2)}</Text>
            </View>

            <View style={styles.cuadreRow}>
              <View style={styles.cuadreRowLeft}>
                <Smartphone color="#0284c7" size={18} />
                <Text style={[styles.cuadreRowLabel, { color: theme.text }]}>Plin</Text>
              </View>
              <Text style={[styles.cuadreRowVal, { color: '#0284c7' }]}>S/ {cuadre.plin.toFixed(2)}</Text>
            </View>

            <View style={styles.cuadreRow}>
              <View style={styles.cuadreRowLeft}>
                <CreditCard color="#d97706" size={18} />
                <Text style={[styles.cuadreRowLabel, { color: theme.text }]}>Tarjeta / Transf.</Text>
              </View>
              <Text style={[styles.cuadreRowVal, { color: '#d97706' }]}>S/ {cuadre.otros.toFixed(2)}</Text>
            </View>

            <View style={[styles.cuadreDivider, { backgroundColor: theme.border }]} />

            <View style={styles.cuadreRow}>
              <Text style={[styles.cuadreTotalLabel, { color: theme.text }]}>Gran Total Recaudado:</Text>
              <Text style={[styles.cuadreTotalVal, { color: theme.primary }]}>
                S/ {cuadre.totalRecaudado.toFixed(2)}
              </Text>
            </View>

            <View style={styles.cuadreRow}>
              <Text style={[styles.cuadreSubText, { color: theme.textMuted }]}>Total Entradas Emitidas:</Text>
              <Text style={[styles.cuadreSubText, { color: theme.text, fontFamily: fonts.bold }]}>
                {cuadre.totalEntradas} entradas
              </Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE CONFIRMACIÓN DE VENTA EXITOSA (VENTA RÁPIDA)                     */}
      {/* ========================================================================= */}
      <Modal
        visible={modalExitoVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalExitoVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalSuccessIconBox}>
              <CheckCircle2 color="#16a34a" size={56} />
            </View>

            <Text style={[styles.modalTitle, { color: theme.text }]}>¡Venta Registrada!</Text>
            <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>
              {evento?.nombre || 'Evento Deportivo'}
            </Text>

            {/* Número de Tickets Asignados */}
            <View style={styles.ticketBadgeBig}>
              <Text style={styles.ticketBadgeBigLabel}>TICKETS ASIGNADOS</Text>
              <Text style={styles.ticketBadgeBigVal}>
                {ultimaVentaExito?.ticketInicio === ultimaVentaExito?.ticketFin
                  ? `#${ultimaVentaExito?.ticketInicio}`
                  : `#${ultimaVentaExito?.ticketInicio} al #${ultimaVentaExito?.ticketFin}`}
              </Text>
            </View>

            {/* Resumen Monetario */}
            <View style={[styles.modalSummaryBox, { backgroundColor: theme.background }]}>
              <View style={styles.modalSummaryRow}>
                <Text style={[styles.modalSummaryLabel, { color: theme.textMuted }]}>Cantidad:</Text>
                <Text style={[styles.modalSummaryVal, { color: theme.text }]}>
                  {ultimaVentaExito?.cantidad} entrada(s)
                </Text>
              </View>

              <View style={styles.modalSummaryRow}>
                <Text style={[styles.modalSummaryLabel, { color: theme.textMuted }]}>Total Pagado:</Text>
                <Text style={[styles.modalSummaryVal, { color: '#16a34a', fontFamily: fonts.bold }]}>
                  S/ {ultimaVentaExito?.total.toFixed(2)} ({ultimaVentaExito?.metodo})
                </Text>
              </View>

              {ultimaVentaExito?.vuelto && ultimaVentaExito.vuelto > 0 ? (
                <View style={styles.modalSummaryRow}>
                  <Text style={[styles.modalSummaryLabel, { color: '#dc2626' }]}>Vuelto Entregado:</Text>
                  <Text style={[styles.modalSummaryVal, { color: '#dc2626', fontFamily: fonts.bold }]}>
                    S/ {ultimaVentaExito.vuelto.toFixed(2)}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Botones de Acción */}
            <TouchableOpacity
              style={styles.shareBtn}
              onPress={compartirComprobante}
            >
              <Share2 color="#2563eb" size={18} />
              <Text style={styles.shareBtnText}>Compartir por WhatsApp</Text>
            </TouchableOpacity>

            <AnimatedButton
              style={styles.nextSaleBtn}
              onPress={() => setModalExitoVisible(false)}
            >
              <Text style={styles.nextSaleBtnText}>⚡ Siguiente Venta</Text>
            </AnimatedButton>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 12, fontFamily: fonts.medium, fontSize: 14 },
  scrollContent: { padding: 16, paddingBottom: 30 },

  // Top Bar
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
    marginRight: 4,
  },
  eventoTitulo: {
    fontSize: 16,
    fontFamily: fonts.bold,
  },
  eventoSub: {
    fontSize: 12,
    fontFamily: fonts.regular,
  },
  colabBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4,
  },
  colabText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: '#2563eb',
    maxWidth: 90,
  },

  // Tabs
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: '#eff6ff',
  },
  tabBtnText: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
  },

  // Banner Stats
  statsBanner: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: 'center',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#bfdbfe',
  },
  statLabel: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: '#1e40af',
  },
  statValBlue: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: '#1d4ed8',
    marginTop: 2,
  },
  statValGreen: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: '#059669',
    marginTop: 2,
  },

  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
    marginBottom: 10,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: fonts.regular,
    marginBottom: 16,
  },

  // Ticket Card
  ticketCard: {
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
  },
  ticketCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  ticketNombre: {
    fontSize: 16,
    fontFamily: fonts.bold,
  },
  ticketPrecio: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    marginTop: 2,
  },
  subtotalPill: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  subtotalPillText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: '#2563eb',
  },

  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  counterBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  counterBtnDisabled: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
  },
  counterNumber: {
    width: 44,
    textAlign: 'center',
    fontSize: 20,
    fontFamily: fonts.bold,
  },
  shortcutsRow: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 'auto',
  },
  shortcutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  shortcutBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  shortcutText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: '#475569',
  },
  shortcutTextActive: {
    color: 'white',
  },

  // Métodos de Pago
  payMethodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  payMethodBtn: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    gap: 8,
  },
  payMethodText: {
    fontSize: 14,
    fontFamily: fonts.bold,
  },

  // Calculadora de Vuelto
  cashBox: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  cashBoxTitle: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    marginBottom: 10,
  },
  quickBillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  quickBillBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  quickBillText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: '#1e293b',
  },
  cashInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 11,
    fontFamily: fonts.medium,
    marginBottom: 4,
  },
  cashInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
    fontFamily: fonts.bold,
  },
  vueltoBox: {
    flex: 1,
    backgroundColor: '#ecfdf5',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    alignItems: 'center',
  },
  vueltoLabel: {
    fontSize: 10,
    fontFamily: fonts.medium,
    color: '#065f46',
  },
  vueltoVal: {
    fontSize: 18,
    fontFamily: fonts.extraBold,
    color: '#059669',
  },

  // Datos Opcionales
  optionalHeader: {
    paddingVertical: 10,
    borderTopWidth: 1,
    alignItems: 'center',
    marginBottom: 8,
  },
  optionalHeaderText: {
    fontSize: 12,
    fontFamily: fonts.medium,
  },
  optionalBody: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  optionalInput: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 13,
    fontFamily: fonts.regular,
  },

  // Barra Fija Inferior
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 5,
  },
  bottomBarInfo: {
    flex: 1,
  },
  bottomBarCount: {
    fontSize: 12,
    fontFamily: fonts.medium,
  },
  bottomBarTotal: {
    fontSize: 24,
    fontFamily: fonts.extraBold,
  },
  emitirBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 8,
  },
  emitirBtnDisabled: {
    backgroundColor: '#94a3b8',
  },
  emitirBtnText: {
    color: 'white',
    fontSize: 15,
    fontFamily: fonts.bold,
  },

  // Historial
  tabHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  refreshBtn: {
    padding: 6,
    borderRadius: 8,
  },
  emptyCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 13,
    fontFamily: fonts.regular,
    textAlign: 'center',
    marginTop: 4,
  },
  historyCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  historyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ticketBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  ticketBadgeText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: '#2563eb',
  },
  historyMonto: {
    fontSize: 16,
    fontFamily: fonts.bold,
  },
  historyCardBody: {
    gap: 2,
  },
  historyItems: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
  },
  historyBuyer: {
    fontSize: 12,
    fontFamily: fonts.regular,
  },
  historyTime: {
    fontSize: 11,
    fontFamily: fonts.regular,
  },
  historyActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  anularBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
  },
  anularBtnText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: '#dc2626',
  },
  anuladaBadge: {
    marginTop: 6,
    paddingVertical: 4,
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 8,
  },
  anuladaBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: '#dc2626',
  },

  // Cuadre
  cashHighlightCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  cashHighlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cashHighlightLabel: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: '#15803d',
  },
  cashHighlightVal: {
    fontSize: 26,
    fontFamily: fonts.extraBold,
    color: '#16a34a',
  },
  cashHighlightSub: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: '#166534',
    marginTop: 6,
  },
  cuadreCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  cuadreCardTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    marginBottom: 12,
  },
  cuadreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  cuadreRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cuadreRowLabel: {
    fontSize: 13,
    fontFamily: fonts.medium,
  },
  cuadreRowVal: {
    fontSize: 14,
    fontFamily: fonts.bold,
  },
  cuadreDivider: {
    height: 1,
    marginVertical: 10,
  },
  cuadreTotalLabel: {
    fontSize: 15,
    fontFamily: fonts.bold,
  },
  cuadreTotalVal: {
    fontSize: 18,
    fontFamily: fonts.extraBold,
  },
  cuadreSubText: {
    fontSize: 12,
    fontFamily: fonts.regular,
  },

  // Modal Éxito
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalSuccessIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: fonts.extraBold,
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: fonts.regular,
    marginBottom: 16,
  },
  ticketBadgeBig: {
    width: '100%',
    backgroundColor: '#eff6ff',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#93c5fd',
    alignItems: 'center',
    marginBottom: 16,
  },
  ticketBadgeBigLabel: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: '#1e40af',
    letterSpacing: 0.5,
  },
  ticketBadgeBigVal: {
    fontSize: 24,
    fontFamily: fonts.extraBold,
    color: '#1d4ed8',
    marginTop: 2,
  },
  modalSummaryBox: {
    width: '100%',
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
    gap: 6,
  },
  modalSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalSummaryLabel: {
    fontSize: 13,
    fontFamily: fonts.regular,
  },
  modalSummaryVal: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    gap: 8,
    marginBottom: 10,
  },
  shareBtnText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: '#2563eb',
  },
  nextSaleBtn: {
    width: '100%',
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  nextSaleBtnText: {
    color: 'white',
    fontSize: 16,
    fontFamily: fonts.bold,
  },
});
