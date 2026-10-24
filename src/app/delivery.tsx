import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  TextInput,
  Modal,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decode } from 'base64-arraybuffer';
import {
  Camera,
  CheckCircle2,
  Droplets,
  Zap,
  MapPin,
  ChevronDown,
  FileText,
  Building2,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  Package
} from 'lucide-react-native';

type Sede = {
  id: number;
  nombre: string;
};

type CondicionEnvio = 'COMPLETO' | 'PARCIAL' | 'CON_EXTRA';

export default function DeliveryScreen() {
  const params = useLocalSearchParams<{
    pedido_id?: string;
    sede_id?: string;
    sede_nombre?: string;
    agua_solicitada?: string;
    gatorade_solicitada?: string;
    solicitado_por?: string;
    urgencia?: string;
    notas?: string;
  }>();

  const [sedes, setSedes] = useState<Sede[]>([]);
  const [sedeDestino, setSedeDestino] = useState<Sede | null>(null);
  const [showSedes, setShowSedes] = useState(false);

  // Datos de pedido vinculado
  const [pedidoId, setPedidoId] = useState<number | null>(null);
  const [aguaSolicitada, setAguaSolicitada] = useState<number>(0);
  const [gatoradeSolicitada, setGatoradeSolicitada] = useState<number>(0);
  const [solicitadoPor, setSolicitadoPor] = useState<string>('');
  const [urgenciaPedido, setUrgenciaPedido] = useState<string>('');
  const [notasPedido, setNotasPedido] = useState<string>('');

  // Pedidos pendientes de la sede seleccionada (cuando entra sin params)
  const [pedidosPendientesSede, setPedidosPendientesSede] = useState<any[]>([]);

  // Condición de Envío
  const [condicion, setCondicion] = useState<CondicionEnvio>('COMPLETO');
  const [motivoCondicion, setMotivoCondicion] = useState('');

  // Cantidades entregadas / a despachar
  const [aguaEntregada, setAguaEntregada] = useState(0);
  const [gatoradeEntregada, setGatoradeEntregada] = useState(0);

  // Almacén central
  const [centralStock, setCentralStock] = useState<{ agua: number; gatorade: number } | null>(null);

  // Form general
  const [descripcion, setDescripcion] = useState('');
  const [usuarioNombre, setUsuarioNombre] = useState('Logística Central');
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    inicializar();
  }, []);

  const inicializar = async () => {
    setLoading(true);
    try {
      const uNombre = await AsyncStorage.getItem('usuario_nombre');
      if (uNombre) setUsuarioNombre(uNombre);

      await Promise.all([fetchSedes(), fetchCentralStock()]);

      // Si viene por parámetro desde pedidos_logistica.tsx
      if (params.sede_id && params.sede_nombre) {
        const sId = parseInt(params.sede_id);
        setSedeDestino({ id: sId, nombre: params.sede_nombre });

        if (params.pedido_id) {
          const pId = parseInt(params.pedido_id);
          const reqAgua = params.agua_solicitada ? parseInt(params.agua_solicitada) : 0;
          const reqGat = params.gatorade_solicitada ? parseInt(params.gatorade_solicitada) : 0;

          setPedidoId(pId);
          setAguaSolicitada(reqAgua);
          setGatoradeSolicitada(reqGat);
          setSolicitadoPor(params.solicitado_por || '');
          setUrgenciaPedido(params.urgencia || 'MEDIA');
          setNotasPedido(params.notas || '');

          // En modo completo por defecto, pre-cargar cantidades solicitadas
          setAguaEntregada(reqAgua);
          setGatoradeEntregada(reqGat);
          setDescripcion(`Atención a Pedido #${pId} de ${params.sede_nombre}`);
        }
      }
    } catch (e) {
      console.log('Error inicializando delivery:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCentralStock = async () => {
    const { data } = await supabase.from('almacen_central').select('*').eq('id', 1).single();
    if (data) {
      setCentralStock({ agua: data.agua_stock, gatorade: data.gatorade_stock });
    }
  };

  const fetchSedes = async () => {
    const { data, error } = await supabase.from('sedes').select('id, nombre').order('id', { ascending: true });
    if (!error && data) {
      setSedes(data.filter((s: any) => s.nombre.trim().toLowerCase() !== 'oficina'));
    }
  };

  // Al seleccionar sede en el dropdown, buscar si tiene pedidos pendientes
  const handleSelectSede = async (sede: Sede) => {
    setSedeDestino(sede);
    setShowSedes(false);

    // Si no venía con un pedido ya cargado
    if (!params.pedido_id) {
      try {
        const { data: pData } = await supabase
          .from('pedidos_sede')
          .select('*')
          .eq('sede_id', sede.id)
          .eq('estado', 'PENDIENTE')
          .order('fecha_solicitud', { ascending: false });

        if (pData && pData.length > 0) {
          setPedidosPendientesSede(pData);
        } else {
          setPedidosPendientesSede([]);
        }
      } catch (err) {
        console.log('Error buscando pedidos pendientes de sede:', err);
      }
    }
  };

  const handleVincularPedido = (ped: any) => {
    setPedidoId(ped.id);
    setAguaSolicitada(ped.agua_solicitada);
    setGatoradeSolicitada(ped.gatorade_solicitada);
    setSolicitadoPor(ped.solicitado_por);
    setUrgenciaPedido(ped.urgencia);
    setNotasPedido(ped.notas || '');

    // Aplicar a cantidades si está en COMPLETO
    if (condicion === 'COMPLETO') {
      setAguaEntregada(ped.agua_solicitada);
      setGatoradeEntregada(ped.gatorade_solicitada);
    }
    setDescripcion(`Atención a Pedido #${ped.id} de ${sedeDestino?.nombre || 'Sede'}`);
    Alert.alert('Pedido Vinculado', `Se vinculó el pedido #${ped.id} de ${ped.agua_solicitada} Aguas y ${ped.gatorade_solicitada} Gatorades.`);
  };

  // Cambio de condición: COMPLETO / PARCIAL / CON_EXTRA
  const handleCambiarCondicion = (nuevaCond: CondicionEnvio) => {
    setCondicion(nuevaCond);

    if (nuevaCond === 'COMPLETO') {
      // Se marca en automático las cantidades solicitadas
      setAguaEntregada(aguaSolicitada);
      setGatoradeEntregada(gatoradeSolicitada);
    } else if (nuevaCond === 'PARCIAL') {
      // Si antes eran iguales, deja las mismas o permite ajustar
      if (aguaEntregada === 0 && aguaSolicitada > 0) {
        setAguaEntregada(Math.floor(aguaSolicitada / 2) || 1);
      }
      if (gatoradeEntregada === 0 && gatoradeSolicitada > 0) {
        setGatoradeEntregada(Math.floor(gatoradeSolicitada / 2) || 1);
      }
    } else if (nuevaCond === 'CON_EXTRA') {
      // En extra, se inicializa al menos con lo solicitado para que el usuario sume el total que va a mandar
      if (aguaEntregada < aguaSolicitada) setAguaEntregada(aguaSolicitada);
      if (gatoradeEntregada < gatoradeSolicitada) setGatoradeEntregada(gatoradeSolicitada);
    }
  };

  // Cálculos en tiempo real
  const difAgua = aguaEntregada - aguaSolicitada;
  const difGat = gatoradeEntregada - gatoradeSolicitada;

  // En caso PARCIAL: déficit
  const faltanteAgua = Math.max(0, aguaSolicitada - aguaEntregada);
  const faltanteGat = Math.max(0, gatoradeSolicitada - gatoradeEntregada);

  // En caso CON_EXTRA: extra adicional
  const extraAgua = Math.max(0, aguaEntregada - aguaSolicitada);
  const extraGat = Math.max(0, gatoradeEntregada - gatoradeSolicitada);

  // Validación de stock de oficina
  const stockInsuficienteAgua = centralStock ? aguaEntregada > centralStock.agua : false;
  const stockInsuficienteGat = centralStock ? gatoradeEntregada > centralStock.gatorade : false;

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Aviso', 'Necesitas dar permisos de cámara para tomar la foto.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0]);
    }
  };

  const guardarEntrega = async () => {
    if (!sedeDestino) return Alert.alert('Aviso', 'Selecciona la sede receptora del despacho');
    if (!descripcion.trim()) return Alert.alert('Aviso', 'Ingresa una descripción del despacho');
    if (aguaEntregada === 0 && gatoradeEntregada === 0) {
      return Alert.alert('Aviso', 'No has indicado cantidades a entregar (mínimo 1 botella)');
    }
    if (!image) return Alert.alert('Aviso', 'Es obligatorio tomar una foto de la mercadería para la constancia');

    // Validación según condición
    if (condicion === 'PARCIAL' && (faltanteAgua > 0 || faltanteGat > 0)) {
      if (!motivoCondicion.trim()) {
        return Alert.alert(
          'Falta Justificación',
          'Al realizar un despacho parcial, ingresa el motivo o justificación (ej. falta de stock, vehículo con espacio limitado).'
        );
      }
    }

    if (condicion === 'CON_EXTRA' && extraAgua === 0 && extraGat === 0) {
      Alert.alert(
        'Atención: No hay Material Extra',
        'Has seleccionado "Con Material Extra" pero las cantidades son iguales o menores a lo solicitado. Si el despacho es exacto, selecciona la condición "Completo".'
      );
      return;
    }

    // Validación stock Almacén Central
    if (centralStock) {
      if (stockInsuficienteAgua) {
        return Alert.alert(
          '⚠️ Stock Insuficiente en Oficina',
          `En el Almacén Central solo hay ${centralStock.agua} botellas de Agua disponibles. No puedes despachar ${aguaEntregada}.`
        );
      }
      if (stockInsuficienteGat) {
        return Alert.alert(
          '⚠️ Stock Insuficiente en Oficina',
          `En el Almacén Central solo hay ${centralStock.gatorade} botellas de Gatorade disponibles. No puedes despachar ${gatoradeEntregada}.`
        );
      }
    }

    setSaving(true);
    try {
      // 1. Re-validar stock fresco en Almacén Central
      const { data: centralFresco } = await supabase.from('almacen_central').select('*').eq('id', 1).single();
      if (centralFresco) {
        if (aguaEntregada > centralFresco.agua_stock || gatoradeEntregada > centralFresco.gatorade_stock) {
          setSaving(false);
          return Alert.alert('Stock Insuficiente', 'El stock de oficina cambió recientemente y no cubre esta cantidad.');
        }
      }

      const fileName = `entrega_${Date.now()}.jpg`;
      const filePath = `logistica/${fileName}`;
      if (!image.base64) throw new Error('Imagen inválida o corrupta');

      // 2. Subir foto de constancia
      const { error: uploadError } = await supabase.storage
        .from('comprobantes')
        .upload(filePath, decode(image.base64), { contentType: 'image/jpeg' });
      if (uploadError) throw new Error('No se pudo subir la foto: ' + uploadError.message);

      const { data: urlData } = supabase.storage.from('comprobantes').getPublicUrl(filePath);

      // 3. Formular descripción enriquecida con condición
      let descripcionFinal = descripcion.trim();
      if (condicion === 'CON_EXTRA') {
        const extraTxt = `[EXTRA: ${extraAgua > 0 ? `+${extraAgua} Aguas ` : ''}${extraGat > 0 ? `+${extraGat} Gat` : ''}]`;
        descripcionFinal = `${extraTxt} ${descripcionFinal}`;
      } else if (condicion === 'PARCIAL') {
        const parcTxt = `[PARCIAL: ${faltanteAgua > 0 ? `Faltan -${faltanteAgua} Aguas ` : ''}${faltanteGat > 0 ? `Faltan -${faltanteGat} Gat` : ''}]`;
        descripcionFinal = `${parcTxt} ${descripcionFinal}`;
      } else {
        descripcionFinal = `[COMPLETO 100%] ${descripcionFinal}`;
      }

      // 4. Guardar en entregas (con fallback si las columnas no están aún)
      const basePayload = {
        sede_destino_id: sedeDestino.id,
        descripcion: descripcionFinal,
        agua_entregada: aguaEntregada,
        gatorade_entregada: gatoradeEntregada,
        url_foto: urlData.publicUrl,
        estado: 'PENDIENTE_RECEPCION'
      };

      const fullPayload = {
        ...basePayload,
        condicion_envio: condicion,
        agua_solicitada: aguaSolicitada,
        gatorade_solicitada: gatoradeSolicitada,
        agua_diferencia: condicion === 'CON_EXTRA' ? extraAgua : condicion === 'PARCIAL' ? faltanteAgua : 0,
        gatorade_diferencia: condicion === 'CON_EXTRA' ? extraGat : condicion === 'PARCIAL' ? faltanteGat : 0,
        motivo_condicion: motivoCondicion.trim() || null,
        pedido_id: pedidoId || null,
        entregado_por: usuarioNombre
      };

      const { error: insertFullError } = await supabase.from('entregas').insert([fullPayload]);
      if (insertFullError) {
        console.log('Fallo insert completo, intentando con campos base:', insertFullError.message);
        const { error: fallbackError } = await supabase.from('entregas').insert([basePayload]);
        if (fallbackError) throw fallbackError;
      }

      // 5. Descontar del Almacén Central (Oficina)
      if (centralFresco) {
        const nuevoAgua = Math.max(0, centralFresco.agua_stock - aguaEntregada);
        const nuevoGatorade = Math.max(0, centralFresco.gatorade_stock - gatoradeEntregada);

        await supabase.from('almacen_central').update({
          agua_stock: nuevoAgua,
          gatorade_stock: nuevoGatorade,
          ultima_actualizacion: new Date().toISOString()
        }).eq('id', 1);

        const { data: sedeOficina } = await supabase
          .from('sedes')
          .select('id')
          .ilike('nombre', 'oficina')
          .single();

        if (sedeOficina) {
          await supabase.from('inventario_bebidas').update({
            agua_cantidad: nuevoAgua,
            gatorade_cantidad: nuevoGatorade
          }).eq('sede_id', sedeOficina.id);
        }
      }

      // 6. Si hay un pedido vinculado, actualizar su estado a EN_RUTA (esperando confirmación en sede)
      if (pedidoId) {
        await supabase.from('pedidos_sede').update({
          estado: 'EN_RUTA',
          fecha_atencion: new Date().toISOString(),
          atendido_por: `Despachado por ${usuarioNombre}`
        }).eq('id', pedidoId);
      }

      // Mensaje de éxito descriptivo
      let mensajeExito = `Se despacharon ${aguaEntregada} Aguas y ${gatoradeEntregada} Gatorades hacia ${sedeDestino.nombre}.`;
      if (condicion === 'CON_EXTRA') {
        mensajeExito += `\n\n🎁 ¡Incluye material extra de refuerzo (+${extraAgua} Aguas, +${extraGat} Gatorades)!`;
      } else if (condicion === 'PARCIAL') {
        mensajeExito += `\n\n⚠️ Despacho parcial registrado en ruta (faltantes: ${faltanteAgua} Aguas, ${faltanteGat} Gatorades).`;
      } else {
        mensajeExito += `\n\n✅ Despacho 100% completo puesto en ruta.`;
      }
      mensajeExito += '\n\nEl pedido se marcará como COMPLETADO y las bebidas se sumarán al inventario cuando el profesor o auxiliar de la sede confirme la recepción física.';

      Alert.alert(
        '¡Despacho Puesto en Ruta!',
        mensajeExito,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert('Error al Registrar', error.message || 'Ocurrió un problema inesperado.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Subtítulo informativo */}
        <View style={styles.headerSubtitleBox}>
          <Text style={styles.subtitle}>Despacho con control de condiciones y stock central</Text>
        </View>

        {/* Tarjeta de Origen y Stock de Almacén Central */}
        <View style={styles.originCard}>
          <View style={styles.originTop}>
            <View style={styles.originIconBox}>
              <Building2 color="#0284c7" size={18} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.originTitle}>Origen del Despacho</Text>
              <Text style={styles.originSub}>🏢 Oficina (Almacén Central)</Text>
            </View>
          </View>
          {centralStock && (
            <View style={styles.stockChipRow}>
              <View style={[styles.stockMiniChip, { backgroundColor: '#e0f2fe', borderColor: '#bae6fd' }]}>
                <Droplets color="#0ea5e9" size={14} />
                <Text style={styles.stockMiniText} numberOfLines={1}>
                  Stock: <Text style={styles.stockBold}>{centralStock.agua}</Text> Aguas
                </Text>
              </View>
              <View style={[styles.stockMiniChip, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}>
                <Zap color="#d97706" size={14} />
                <Text style={styles.stockMiniText} numberOfLines={1}>
                  Stock: <Text style={styles.stockBold}>{centralStock.gatorade}</Text> Gat
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Pedido Vinculado (si existe) */}
        {pedidoId ? (
          <View style={styles.pedidoCard}>
            <View style={styles.pedidoHeader}>
              <View style={styles.pedidoBadge}>
                <Package color="#2563eb" size={16} />
                <Text style={styles.pedidoBadgeText}>Atendiendo Pedido #{pedidoId}</Text>
              </View>
              <View style={[styles.urgencyBadge, {
                backgroundColor: urgenciaPedido === 'ALTA' ? '#fef2f2' : urgenciaPedido === 'MEDIA' ? '#fffbeb' : '#ecfdf5',
                borderColor: urgenciaPedido === 'ALTA' ? '#ef4444' : urgenciaPedido === 'MEDIA' ? '#f59e0b' : '#10b981'
              }]}>
                <Text style={[styles.urgencyText, {
                  color: urgenciaPedido === 'ALTA' ? '#ef4444' : urgenciaPedido === 'MEDIA' ? '#d97706' : '#10b981'
                }]}>
                  Urgencia: {urgenciaPedido}
                </Text>
              </View>
            </View>

            <Text style={styles.pedidoSolicitante}>
              Solicitado por: <Text style={{ fontWeight: '700', color: '#0f172a' }}>{solicitadoPor}</Text>
            </Text>

            <View style={styles.pedidoQtyRow}>
              <View style={styles.pedidoQtyItem}>
                <Droplets color="#0ea5e9" size={16} />
                <Text style={styles.pedidoQtyLabel}>Solicitado:</Text>
                <Text style={styles.pedidoQtyValue}>{aguaSolicitada} Aguas</Text>
              </View>
              <View style={styles.pedidoQtyItem}>
                <Zap color="#d97706" size={16} />
                <Text style={styles.pedidoQtyLabel}>Solicitado:</Text>
                <Text style={styles.pedidoQtyValue}>{gatoradeSolicitada} Gatorades</Text>
              </View>
            </View>

            {notasPedido ? (
              <Text style={styles.pedidoNotas}>💬 "{notasPedido}"</Text>
            ) : null}
          </View>
        ) : null}

        {/* Selector de Sede Destino */}
        <Text style={styles.sectionTitle}>Sede Destino (Receptora)</Text>
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setShowSedes(true)}
          disabled={!!params.sede_id}
        >
          <MapPin color="#64748b" size={20} />
          <Text style={[styles.dropdownText, !sedeDestino && { color: '#94a3b8' }]}>
            {sedeDestino ? sedeDestino.nombre : 'Seleccionar sede destino...'}
          </Text>
          {!params.sede_id && <ChevronDown color="#64748b" size={20} />}
        </TouchableOpacity>

        {/* Sugerencias de Pedidos Pendientes de la Sede (si no vino con param) */}
        {!pedidoId && pedidosPendientesSede.length > 0 && (
          <View style={styles.pendingSuggestions}>
            <Text style={styles.pendingSuggestionsTitle}>
              📋 Esta sede tiene {pedidosPendientesSede.length} pedido(s) pendiente(s):
            </Text>
            {pedidosPendientesSede.map((ped) => (
              <TouchableOpacity
                key={ped.id}
                style={styles.pendingSuggestionCard}
                onPress={() => handleVincularPedido(ped)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.pendingSugText}>
                    Pedido #{ped.id}: {ped.agua_solicitada} Aguas • {ped.gatorade_solicitada} Gat
                  </Text>
                  <Text style={styles.pendingSugSub}>
                    Por: {ped.solicitado_por} • {new Date(ped.fecha_solicitud).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.btnVincular}>
                  <Text style={styles.btnVincularText}>Vincular</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ======================================================== */}
        {/* SELECTOR DE CONDICIONES DE ENVÍO                         */}
        {/* ======================================================== */}
        <Text style={styles.sectionTitle}>Condición del Despacho</Text>
        <Text style={styles.sectionSub}>
          Selecciona si enviarás el pedido completo, parcial o con material de refuerzo extra
        </Text>

        <View style={styles.conditionTabs}>
          {/* OPCIÓN 1: COMPLETO */}
          <TouchableOpacity
            style={[
              styles.conditionTab,
              condicion === 'COMPLETO' && styles.conditionTabActiveCompleto
            ]}
            onPress={() => handleCambiarCondicion('COMPLETO')}
          >
            <View style={[styles.condIconWrap, { backgroundColor: condicion === 'COMPLETO' ? '#10b981' : '#f1f5f9' }]}>
              <CheckCircle2 color={condicion === 'COMPLETO' ? 'white' : '#64748b'} size={20} />
            </View>
            <Text style={[styles.condTabTitle, condicion === 'COMPLETO' && { color: '#047857' }]}>
              Completo
            </Text>
            <Text style={styles.condTabDesc}>100% Exacto</Text>
          </TouchableOpacity>

          {/* OPCIÓN 2: PARCIAL */}
          <TouchableOpacity
            style={[
              styles.conditionTab,
              condicion === 'PARCIAL' && styles.conditionTabActiveParcial
            ]}
            onPress={() => handleCambiarCondicion('PARCIAL')}
          >
            <View style={[styles.condIconWrap, { backgroundColor: condicion === 'PARCIAL' ? '#f59e0b' : '#f1f5f9' }]}>
              <AlertCircle color={condicion === 'PARCIAL' ? 'white' : '#64748b'} size={20} />
            </View>
            <Text style={[styles.condTabTitle, condicion === 'PARCIAL' && { color: '#b45309' }]}>
              Parcial
            </Text>
            <Text style={styles.condTabDesc}>Envío incompleto</Text>
          </TouchableOpacity>

          {/* OPCIÓN 3: CON MATERIAL EXTRA */}
          <TouchableOpacity
            style={[
              styles.conditionTab,
              condicion === 'CON_EXTRA' && styles.conditionTabActiveExtra
            ]}
            onPress={() => handleCambiarCondicion('CON_EXTRA')}
          >
            <View style={[styles.condIconWrap, { backgroundColor: condicion === 'CON_EXTRA' ? '#8b5cf6' : '#f1f5f9' }]}>
              <Sparkles color={condicion === 'CON_EXTRA' ? 'white' : '#64748b'} size={20} />
            </View>
            <Text style={[styles.condTabTitle, condicion === 'CON_EXTRA' && { color: '#6d28d9' }]}>
              Con Extra
            </Text>
            <Text style={styles.condTabDesc}>Refuerzo mayor</Text>
          </TouchableOpacity>
        </View>

        {/* FEEDBACK Y CÁLCULOS DINÁMICOS SEGÚN CONDICIÓN */}
        {condicion === 'COMPLETO' && (
          <View style={styles.feedbackCompleto}>
            <CheckCircle2 color="#10b981" size={20} />
            <View style={{ flex: 1 }}>
              <Text style={styles.feedbackTitleCompleto}>Despacho Completo (Exacto)</Text>
              <Text style={styles.feedbackDescCompleto}>
                {aguaSolicitada > 0 || gatoradeSolicitada > 0
                  ? `Se marcaron en automático las ${aguaSolicitada} Aguas y ${gatoradeSolicitada} Gatorades solicitadas por la sede (0 diferencias).`
                  : 'Se despachará exactamente la cantidad configurada abajo sin diferencias ni faltantes.'}
              </Text>
            </View>
          </View>
        )}

        {condicion === 'PARCIAL' && (
          <View style={styles.feedbackParcial}>
            <AlertCircle color="#f59e0b" size={20} />
            <View style={{ flex: 1 }}>
              <Text style={styles.feedbackTitleParcial}>Despacho Parcial (Incompleto)</Text>
              <Text style={styles.feedbackDescParcial}>
                Indica la cantidad real que estás mandando. El pedido se mantendrá abierto en ruta hasta que se entregue el restante.
              </Text>
              {(faltanteAgua > 0 || faltanteGat > 0) && (
                <View style={styles.difBadgeParcial}>
                  <Text style={styles.difTextParcial}>
                    ⚠️ Faltante pendiente:{' '}
                    {faltanteAgua > 0 ? `-${faltanteAgua} Aguas ` : ''}
                    {faltanteGat > 0 ? `-${faltanteGat} Gatorades` : ''}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {condicion === 'CON_EXTRA' && (
          <View style={styles.feedbackExtra}>
            <Sparkles color="#8b5cf6" size={22} />
            <View style={{ flex: 1 }}>
              <Text style={styles.feedbackTitleExtra}>Despacho con Material Extra (Refuerzo)</Text>
              <Text style={styles.feedbackDescExtra}>
                Indica el total que vas a enviar. Se calculará automáticamente el excedente respecto a lo solicitado.
              </Text>
              <View style={styles.difBadgeExtra}>
                <Text style={styles.difTextExtra}>
                  🎁 Extra a favor de la sede:{' '}
                  {extraAgua > 0 ? `+${extraAgua} Aguas Extra ` : ''}
                  {extraGat > 0 ? `+${extraGat} Gatorades Extra` : ''}
                  {extraAgua === 0 && extraGat === 0 ? '(Aumenta la cantidad abajo para reflejar el extra)' : ''}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Motivo según condición (Obligatorio en Parcial, Opcional en Extra) */}
        {(condicion === 'PARCIAL' || condicion === 'CON_EXTRA') && (
          <View style={styles.motivoCard}>
            <Text style={styles.motivoLabel}>
              {condicion === 'PARCIAL' ? 'Motivo del Despacho Parcial (Requerido)' : 'Motivo del Material Extra (Opcional)'}
            </Text>
            <TextInput
              style={styles.motivoInput}
              placeholder={
                condicion === 'PARCIAL'
                  ? 'Ej. Quiebre temporal de stock en oficina, se completa mañana'
                  : 'Ej. Refuerzo solicitado telefónicamente por alta afluencia o torneo'
              }
              placeholderTextColor="#94a3b8"
              value={motivoCondicion}
              onChangeText={setMotivoCondicion}
            />
          </View>
        )}

        {/* ======================================================== */}
        {/* CANTIDADES A DESPACHAR                                  */}
        {/* ======================================================== */}
        <View style={styles.cantidadesHeader}>
          <Text style={styles.sectionTitle}>
            {condicion === 'CON_EXTRA' ? 'Total que vas a Enviar (Bebidas)' : 'Cantidades a Enviar (Unidades)'}
          </Text>
          {condicion === 'COMPLETO' && (aguaSolicitada > 0 || gatoradeSolicitada > 0) && (
            <View style={styles.autoBadge}>
              <Text style={styles.autoBadgeText}>⚡ Auto-completado</Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          {/* Fila Agua */}
          <View style={styles.beverageRow}>
            <View style={styles.beverageInfo}>
              <View style={[styles.iconBox, { backgroundColor: '#e0f2fe' }]}>
                <Droplets color="#0ea5e9" size={20} />
              </View>
              <View>
                <Text style={styles.beverageText}>Agua Mineral</Text>
                {aguaSolicitada > 0 && (
                  <Text style={styles.beverageSubtext}>
                    Solicitado: {aguaSolicitada} und
                    {condicion === 'CON_EXTRA' && extraAgua > 0 ? ` (+${extraAgua} extra)` : ''}
                    {condicion === 'PARCIAL' && faltanteAgua > 0 ? ` (-${faltanteAgua} falta)` : ''}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.counter}>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => setAguaEntregada(Math.max(0, aguaEntregada - 1))}
              >
                <Text style={styles.counterText}>-</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.counterInput}
                keyboardType="numeric"
                value={aguaEntregada.toString()}
                onChangeText={(t) => setAguaEntregada(parseInt(t) || 0)}
              />
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => setAguaEntregada(aguaEntregada + 1)}
              >
                <Text style={styles.counterText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Presets rápidos de Agua */}
          <View style={styles.quickPresetRow}>
            <TouchableOpacity style={styles.quickChip} onPress={() => setAguaEntregada(aguaEntregada + 5)}>
              <Text style={styles.quickChipText}>+5</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickChip} onPress={() => setAguaEntregada(aguaEntregada + 10)}>
              <Text style={styles.quickChipText}>+10</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickChip} onPress={() => setAguaEntregada(aguaEntregada + 20)}>
              <Text style={styles.quickChipText}>+20 (1 Fardo)</Text>
            </TouchableOpacity>
            {aguaSolicitada > 0 && (
              <TouchableOpacity style={styles.quickChipReset} onPress={() => setAguaEntregada(aguaSolicitada)}>
                <Text style={styles.quickChipResetText}>Pedidas ({aguaSolicitada})</Text>
              </TouchableOpacity>
            )}
          </View>

          {stockInsuficienteAgua && (
            <View style={styles.stockWarning}>
              <AlertTriangle color="#ef4444" size={14} />
              <Text style={styles.stockWarningText}>
                Excede el stock central ({centralStock?.agua || 0} disponibles).
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          {/* Fila Gatorade */}
          <View style={styles.beverageRow}>
            <View style={styles.beverageInfo}>
              <View style={[styles.iconBox, { backgroundColor: '#fef3c7' }]}>
                <Zap color="#d97706" size={20} />
              </View>
              <View>
                <Text style={styles.beverageText}>Gatorade</Text>
                {gatoradeSolicitada > 0 && (
                  <Text style={styles.beverageSubtext}>
                    Solicitado: {gatoradeSolicitada} und
                    {condicion === 'CON_EXTRA' && extraGat > 0 ? ` (+${extraGat} extra)` : ''}
                    {condicion === 'PARCIAL' && faltanteGat > 0 ? ` (-${faltanteGat} falta)` : ''}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.counter}>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => setGatoradeEntregada(Math.max(0, gatoradeEntregada - 1))}
              >
                <Text style={styles.counterText}>-</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.counterInput}
                keyboardType="numeric"
                value={gatoradeEntregada.toString()}
                onChangeText={(t) => setGatoradeEntregada(parseInt(t) || 0)}
              />
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => setGatoradeEntregada(gatoradeEntregada + 1)}
              >
                <Text style={styles.counterText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Presets rápidos de Gatorade */}
          <View style={styles.quickPresetRow}>
            <TouchableOpacity style={styles.quickChip} onPress={() => setGatoradeEntregada(gatoradeEntregada + 6)}>
              <Text style={styles.quickChipText}>+6</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickChip} onPress={() => setGatoradeEntregada(gatoradeEntregada + 12)}>
              <Text style={styles.quickChipText}>+12 (1 Caja)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickChip} onPress={() => setGatoradeEntregada(gatoradeEntregada + 24)}>
              <Text style={styles.quickChipText}>+24 (2 Cajas)</Text>
            </TouchableOpacity>
            {gatoradeSolicitada > 0 && (
              <TouchableOpacity style={styles.quickChipReset} onPress={() => setGatoradeEntregada(gatoradeSolicitada)}>
                <Text style={styles.quickChipResetText}>Pedidas ({gatoradeSolicitada})</Text>
              </TouchableOpacity>
            )}
          </View>

          {stockInsuficienteGat && (
            <View style={styles.stockWarning}>
              <AlertTriangle color="#ef4444" size={14} />
              <Text style={styles.stockWarningText}>
                Excede el stock central ({centralStock?.gatorade || 0} disponibles).
              </Text>
            </View>
          )}
        </View>

        {/* Resumen Comparativo de Envío */}
        {(aguaSolicitada > 0 || gatoradeSolicitada > 0) && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>📊 Balance del Pedido vs Despacho</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Agua Mineral:</Text>
              <Text style={styles.summaryValue}>
                {aguaSolicitada} pedidas ➔ {aguaEntregada} enviadas{' '}
                <Text style={{
                  color: difAgua > 0 ? '#10b981' : difAgua < 0 ? '#ef4444' : '#64748b',
                  fontWeight: 'bold'
                }}>
                  ({difAgua > 0 ? `+${difAgua} extra` : difAgua < 0 ? `${difAgua} falta` : 'exacto'})
                </Text>
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Gatorade:</Text>
              <Text style={styles.summaryValue}>
                {gatoradeSolicitada} pedidas ➔ {gatoradeEntregada} enviadas{' '}
                <Text style={{
                  color: difGat > 0 ? '#10b981' : difGat < 0 ? '#ef4444' : '#64748b',
                  fontWeight: 'bold'
                }}>
                  ({difGat > 0 ? `+${difGat} extra` : difGat < 0 ? `${difGat} falta` : 'exacto'})
                </Text>
              </Text>
            </View>
          </View>
        )}

        {/* Descripción general */}
        <Text style={styles.sectionTitle}>Descripción o Referencia</Text>
        <View style={styles.inputCard}>
          <View style={styles.inputGroup}>
            <FileText color="#94a3b8" size={20} />
            <TextInput
              style={styles.input}
              placeholder="Descripción (Ej. Despacho matutino con camioneta)"
              value={descripcion}
              onChangeText={setDescripcion}
            />
          </View>
        </View>

        {/* Evidencia Fotográfica */}
        <Text style={styles.sectionTitle}>Evidencia Fotográfica (Obligatorio)</Text>
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage} activeOpacity={0.8}>
          {image ? (
            <Image source={{ uri: image.uri }} style={styles.imagePreview} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Camera color="#94a3b8" size={40} />
              <Text style={styles.imagePickerText}>Toca para tomar foto de la mercadería</Text>
              <Text style={styles.imagePickerSubtext}>Constancia fotográfica obligatoria</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Botón de Enviar Despacho */}
        <TouchableOpacity
          style={[styles.submitButton, saving && styles.submitButtonDisabled]}
          onPress={guardarEntrega}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <CheckCircle2 color="white" size={24} />
              <Text style={styles.submitButtonText}>
                {condicion === 'CON_EXTRA'
                  ? 'Registrar Despacho con Extra'
                  : condicion === 'PARCIAL'
                    ? 'Registrar Despacho Parcial'
                    : 'Registrar Despacho Completo'}
              </Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>

      {/* Modal Selección de Sede */}
      <Modal visible={showSedes} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seleccionar Sede Destino</Text>
            <FlatList
              data={sedes}
              keyExtractor={(s) => s.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.sedeOption}
                  onPress={() => handleSelectSede(item)}
                >
                  <MapPin color="#2563eb" size={20} />
                  <Text style={styles.sedeOptionText}>{item.nombre}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowSedes(false)}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { padding: 18, paddingBottom: 50 },

  headerSubtitleBox: { marginBottom: 14, marginTop: 2 },
  subtitle: { fontSize: 13, color: '#64748b', fontWeight: '500' },

  originCard: {
    backgroundColor: '#eff6ff',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginBottom: 16
  },
  originTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  originIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center'
  },
  originTitle: { fontSize: 11, fontWeight: '700', color: '#1e40af', textTransform: 'uppercase', letterSpacing: 0.5 },
  originSub: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginTop: 1 },
  stockChipRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  stockMiniChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 6,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1
  },
  stockMiniText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  stockBold: { fontWeight: '800', color: '#0f172a' },

  pedidoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#93c5fd',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2
  },
  pedidoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  pedidoBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pedidoBadgeText: { fontSize: 14, fontWeight: '800', color: '#1e40af' },
  urgencyBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  urgencyText: { fontSize: 11, fontWeight: '700' },
  pedidoSolicitante: { fontSize: 13, color: '#64748b', marginBottom: 10 },
  pedidoQtyRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  pedidoQtyItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, flex: 1 },
  pedidoQtyLabel: { fontSize: 11, color: '#64748b' },
  pedidoQtyValue: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  pedidoNotas: { fontSize: 12, fontStyle: 'italic', color: '#64748b', marginTop: 4 },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 8, marginTop: 6 },
  sectionSub: { fontSize: 12, color: '#64748b', marginBottom: 14, marginTop: -4 },

  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14
  },
  dropdownText: { flex: 1, marginLeft: 12, fontSize: 15, color: '#0f172a', fontWeight: '500' },

  pendingSuggestions: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16 },
  pendingSuggestionsTitle: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 8 },
  pendingSuggestionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', marginBottom: 6 },
  pendingSugText: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  pendingSugSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  btnVincular: { backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  btnVincularText: { color: 'white', fontSize: 12, fontWeight: 'bold' },

  // Condición tabs
  conditionTabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  conditionTab: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0'
  },
  conditionTabActiveCompleto: { borderColor: '#10b981', backgroundColor: '#f0fdf4' },
  conditionTabActiveParcial: { borderColor: '#f59e0b', backgroundColor: '#fffbeb' },
  conditionTabActiveExtra: { borderColor: '#8b5cf6', backgroundColor: '#f5f3ff' },
  condIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  condTabTitle: { fontSize: 13, fontWeight: '800', color: '#334155' },
  condTabDesc: { fontSize: 10, color: '#64748b', marginTop: 2 },

  // Feedbacks de condición
  feedbackCompleto: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#ecfdf5',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    marginBottom: 16
  },
  feedbackTitleCompleto: { fontSize: 13, fontWeight: '700', color: '#065f46' },
  feedbackDescCompleto: { fontSize: 12, color: '#047857', marginTop: 2 },

  feedbackParcial: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#fffbeb',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fde68a',
    marginBottom: 16
  },
  feedbackTitleParcial: { fontSize: 13, fontWeight: '700', color: '#92400e' },
  feedbackDescParcial: { fontSize: 12, color: '#b45309', marginTop: 2 },
  difBadgeParcial: { marginTop: 8, backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  difTextParcial: { fontSize: 12, fontWeight: '700', color: '#b45309' },

  feedbackExtra: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#f5f3ff',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ddd6fe',
    marginBottom: 16
  },
  feedbackTitleExtra: { fontSize: 13, fontWeight: '700', color: '#5b21b6' },
  feedbackDescExtra: { fontSize: 12, color: '#6d28d9', marginTop: 2 },
  difBadgeExtra: { marginTop: 8, backgroundColor: '#ede9fe', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  difTextExtra: { fontSize: 12, fontWeight: '800', color: '#6d28d9' },

  motivoCard: { backgroundColor: '#ffffff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16 },
  motivoLabel: { fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 6 },
  motivoInput: { backgroundColor: '#f8fafc', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', fontSize: 14, color: '#0f172a' },

  cantidadesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  autoBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  autoBadgeText: { fontSize: 11, fontWeight: '700', color: '#15803d' },

  card: { backgroundColor: '#ffffff', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16 },
  beverageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  beverageInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconBox: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  beverageText: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  beverageSubtext: { fontSize: 12, color: '#64748b', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 14 },

  counter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  counterBtn: { backgroundColor: '#f1f5f9', width: 36, height: 36, justifyContent: 'center', alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  counterText: { fontSize: 18, fontWeight: '700', color: '#334155' },
  counterInput: { fontSize: 17, fontWeight: '800', color: '#0f172a', width: 45, textAlign: 'center', backgroundColor: '#f8fafc', paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1' },

  quickPresetRow: { flexDirection: 'row', gap: 6, marginTop: 10, paddingLeft: 50 },
  quickChip: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  quickChipText: { fontSize: 11, fontWeight: '600', color: '#475569' },
  quickChipReset: { backgroundColor: '#e0f2fe', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#bae6fd' },
  quickChipResetText: { fontSize: 11, fontWeight: '700', color: '#0284c7' },

  stockWarning: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: '#fef2f2', padding: 8, borderRadius: 8 },
  stockWarningText: { fontSize: 11, color: '#ef4444', fontWeight: '600' },

  summaryCard: { backgroundColor: '#f8fafc', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16 },
  summaryTitle: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  summaryLabel: { fontSize: 12, color: '#64748b' },
  summaryValue: { fontSize: 12, fontWeight: '600', color: '#0f172a' },

  inputCard: { backgroundColor: '#ffffff', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16 },
  inputGroup: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, marginLeft: 12, fontSize: 14, color: '#0f172a' },

  imagePicker: { height: 200, backgroundColor: '#ffffff', borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: '#cbd5e1', borderStyle: 'dashed', marginBottom: 24 },
  imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  imagePickerText: { color: '#334155', fontSize: 14, fontWeight: '600', marginTop: 12 },
  imagePickerSubtext: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },

  submitButton: { backgroundColor: '#10b981', flexDirection: 'row', padding: 16, borderRadius: 14, justifyContent: 'center', alignItems: 'center', gap: 10, shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 3 },
  submitButtonDisabled: { backgroundColor: '#94a3b8', shadowOpacity: 0 },
  submitButtonText: { color: 'white', fontSize: 16, fontWeight: '800' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 16 },
  sedeOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  sedeOptionText: { marginLeft: 14, fontSize: 15, color: '#334155', fontWeight: '500' },
  cancelBtn: { marginTop: 16, padding: 14, backgroundColor: '#f1f5f9', borderRadius: 12, alignItems: 'center' },
  cancelBtnText: { color: '#64748b', fontWeight: 'bold', fontSize: 15 }
});
