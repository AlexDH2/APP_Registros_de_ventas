import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  useColorScheme,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { colors, fonts } from '../theme';
import AnimatedButton from '../components/AnimatedButton';
import {
  Send,
  CheckCircle,
  AlertOctagon,
  ArrowRightLeft,
  Droplets,
  Zap,
  Clock,
  MapPin,
  Image as ImageIcon,
  Check,
  Plus,
  Minus,
  RotateCcw,
  Inbox,
  Flame,
  Sparkles
} from 'lucide-react-native';

type TabType = 'PEDIR' | 'CONFIRMAR' | 'MERMA' | 'TRASPASO';

export default function LogisticaSedeScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? colors.dark : colors.light;

  const [activeTab, setActiveTab] = useState<TabType>('PEDIR');
  const [loading, setLoading] = useState(false);

  // Sede actual y usuario
  const [sedeId, setSedeId] = useState<number | null>(null);
  const [sedeNombre, setSedeNombre] = useState('');
  const [usuarioNombre, setUsuarioNombre] = useState('Profesor');

  // Sedes disponibles para transferencias
  const [sedesList, setSedesList] = useState<{ id: number; nombre: string }[]>([]);

  // 1. Estados Form Pedido
  const [aguaPedir, setAguaPedir] = useState(0);
  const [gatoradePedir, setGatoradePedir] = useState(0);
  const [urgencia, setUrgencia] = useState<'BAJA' | 'MEDIA' | 'ALTA'>('MEDIA');
  const [notasPedido, setNotasPedido] = useState('');
  const [misPedidos, setMisPedidos] = useState<any[]>([]);

  // 2. Estados Entregas Pendientes
  const [entregasPendientes, setEntregasPendientes] = useState<any[]>([]);

  // 3. Estados Form Merma
  const [tipoMerma, setTipoMerma] = useState<'ROTURA' | 'VENCIMIENTO' | 'PERDIDA' | 'DEFECTO' | 'CORTESIA'>('ROTURA');
  const [aguaMerma, setAguaMerma] = useState(0);
  const [gatoradeMerma, setGatoradeMerma] = useState(0);
  const [motivoMerma, setMotivoMerma] = useState('');

  // 4. Estados Traspaso
  const [sedeDestinoId, setSedeDestinoId] = useState<number | null>(null);
  const [aguaTraspaso, setAguaTraspaso] = useState(0);
  const [gatoradeTraspaso, setGatoradeTraspaso] = useState(0);
  const [motivoTraspaso, setMotivoTraspaso] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadInitialData();
    }, [])
  );

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const sId = await AsyncStorage.getItem('sede_id');
      const sNombre = await AsyncStorage.getItem('sede_nombre');
      const uNombre = await AsyncStorage.getItem('usuario_nombre');

      if (sId) setSedeId(parseInt(sId));
      if (sNombre) setSedeNombre(sNombre);
      if (uNombre) setUsuarioNombre(uNombre);

      const { data: sData } = await supabase.from('sedes').select('id, nombre').order('nombre');
      if (sData) {
        setSedesList(sData.filter(s => sId && s.id !== parseInt(sId)));
      }

      if (sId) {
        await fetchEntregasPendientes(parseInt(sId));
        await fetchMisPedidos(parseInt(sId));
      }
    } catch (e) {
      console.log('Error inicializando logística sede:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchEntregasPendientes = async (sId: number) => {
    const { data } = await supabase
      .from('entregas')
      .select('*')
      .eq('sede_destino_id', sId)
      .eq('estado', 'PENDIENTE_RECEPCION')
      .order('fecha', { ascending: false });
    setEntregasPendientes(data || []);
  };

  const fetchMisPedidos = async (sId: number) => {
    const { data } = await supabase
      .from('pedidos_sede')
      .select('*')
      .eq('sede_id', sId)
      .order('fecha_solicitud', { ascending: false })
      .limit(10);
    setMisPedidos(data || []);
  };

  // 1. Enviar Pedido
  const handleEnviarPedido = async () => {
    if (!sedeId) return Alert.alert('Error', 'Sede no identificada');
    if (aguaPedir === 0 && gatoradePedir === 0) {
      return Alert.alert('Aviso', 'Indica al menos una cantidad de Agua o Gatorade');
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('pedidos_sede').insert([{
        sede_id: sedeId,
        solicitado_por: usuarioNombre,
        agua_solicitada: aguaPedir,
        gatorade_solicitada: gatoradePedir,
        urgencia,
        notas: notasPedido.trim() || null,
        estado: 'PENDIENTE'
      }]);

      if (error) throw error;

      Alert.alert('¡Pedido Enviado!', 'El área de logística fue notificada de tu requerimiento.');
      setAguaPedir(0);
      setGatoradePedir(0);
      setNotasPedido('');
      await fetchMisPedidos(sedeId);
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo registrar el pedido: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Confirmar Recepción
  const handleConfirmarEntrega = async (entrega: any) => {
    if (!sedeId) return;

    Alert.alert(
      'Confirmar Recepción',
      `¿Confirmas que recibiste físicamente ${entrega.agua_entregada} Aguas y ${entrega.gatorade_entregada} Gatorades?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Conforme',
          onPress: async () => {
            setLoading(true);
            try {
              const { error: updErr } = await supabase
                .from('entregas')
                .update({
                  estado: 'CONFIRMADA',
                  recibido_por: usuarioNombre,
                  fecha_recepcion: new Date().toISOString()
                })
                .eq('id', entrega.id);
              if (updErr) throw updErr;

              const { data: inv } = await supabase
                .from('inventario_bebidas')
                .select('*')
                .eq('sede_id', sedeId)
                .single();

              if (inv) {
                await supabase.from('inventario_bebidas').update({
                  agua_cantidad: inv.agua_cantidad + entrega.agua_entregada,
                  gatorade_cantidad: inv.gatorade_cantidad + entrega.gatorade_entregada
                }).eq('id', inv.id);
              } else {
                await supabase.from('inventario_bebidas').insert([{
                  sede_id: sedeId,
                  agua_cantidad: entrega.agua_entregada,
                  gatorade_cantidad: entrega.gatorade_entregada
                }]);
              }

              Alert.alert('¡Stock Actualizado!', 'Las bebidas han sido agregadas a tu inventario.');
              await fetchEntregasPendientes(sedeId);
            } catch (err: any) {
              Alert.alert('Error', 'No se pudo confirmar: ' + err.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // 3. Reportar Merma
  const handleRegistrarMerma = async () => {
    if (!sedeId) return;
    if (aguaMerma === 0 && gatoradeMerma === 0) {
      return Alert.alert('Aviso', 'Indica cuántas botellas se mermaron/rompieron');
    }
    if (!motivoMerma.trim()) {
      return Alert.alert('Aviso', 'Debes ingresar un motivo o explicación');
    }

    setLoading(true);
    try {
      const { error: insErr } = await supabase.from('mermas').insert([{
        sede_id: sedeId,
        tipo: tipoMerma,
        agua_cantidad: aguaMerma,
        gatorade_cantidad: gatoradeMerma,
        motivo: motivoMerma.trim(),
        reportado_por: usuarioNombre
      }]);
      if (insErr) throw insErr;

      const { data: inv } = await supabase
        .from('inventario_bebidas')
        .select('*')
        .eq('sede_id', sedeId)
        .single();

      if (inv) {
        await supabase.from('inventario_bebidas').update({
          agua_cantidad: Math.max(0, inv.agua_cantidad - aguaMerma),
          gatorade_cantidad: Math.max(0, inv.gatorade_cantidad - gatoradeMerma)
        }).eq('id', inv.id);
      }

      Alert.alert('Merma Registrada', 'El stock de la sede ha sido descontado justificadamente.');
      setAguaMerma(0);
      setGatoradeMerma(0);
      setMotivoMerma('');
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo registrar la merma: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 4. Traspaso entre sedes
  const handleTransferir = async () => {
    if (!sedeId) return;
    if (!sedeDestinoId) return Alert.alert('Aviso', 'Selecciona la sede destino');
    if (aguaTraspaso === 0 && gatoradeTraspaso === 0) {
      return Alert.alert('Aviso', 'Indica las cantidades a transferir');
    }

    setLoading(true);
    try {
      const { data: invOrigen } = await supabase
        .from('inventario_bebidas')
        .select('*')
        .eq('sede_id', sedeId)
        .single();

      if (!invOrigen || invOrigen.agua_cantidad < aguaTraspaso || invOrigen.gatorade_cantidad < gatoradeTraspaso) {
        setLoading(false);
        return Alert.alert('Stock Insuficiente', 'No tienes suficiente stock en esta sede para transferir esa cantidad.');
      }

      const { error: transErr } = await supabase.from('transferencias_sedes').insert([{
        sede_origen_id: sedeId,
        sede_destino_id: sedeDestinoId,
        agua_cantidad: aguaTraspaso,
        gatorade_cantidad: gatoradeTraspaso,
        motivo: motivoTraspaso.trim() || 'Traspaso entre sedes',
        solicitado_por: usuarioNombre,
        estado: 'COMPLETADA'
      }]);
      if (transErr) throw transErr;

      await supabase.from('inventario_bebidas').update({
        agua_cantidad: invOrigen.agua_cantidad - aguaTraspaso,
        gatorade_cantidad: invOrigen.gatorade_cantidad - gatoradeTraspaso
      }).eq('id', invOrigen.id);

      const { data: invDestino } = await supabase
        .from('inventario_bebidas')
        .select('*')
        .eq('sede_id', sedeDestinoId)
        .single();

      if (invDestino) {
        await supabase.from('inventario_bebidas').update({
          agua_cantidad: invDestino.agua_cantidad + aguaTraspaso,
          gatorade_cantidad: invDestino.gatorade_cantidad + gatoradeTraspaso
        }).eq('id', invDestino.id);
      } else {
        await supabase.from('inventario_bebidas').insert([{
          sede_id: sedeDestinoId,
          agua_cantidad: aguaTraspaso,
          gatorade_cantidad: gatoradeTraspaso
        }]);
      }

      Alert.alert('¡Transferencia Exitosa!', 'Las bebidas han sido trasladadas a la otra sede.');
      setAguaTraspaso(0);
      setGatoradeTraspaso(0);
      setMotivoTraspaso('');
      setSedeDestinoId(null);
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo realizar el traspaso: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const dynamicStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    card: {
      backgroundColor: theme.card,
      borderRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 10,
      elevation: 2
    },
    productTile: {
      backgroundColor: colorScheme === 'dark' ? '#1e293b' : '#f8fafc',
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 12,
    },
    textTitle: { fontFamily: fonts.bold, color: theme.text, fontSize: 18 },
    textMuted: { fontFamily: fonts.regular, color: theme.textMuted, fontSize: 13 },
  });

  return (
    <SafeAreaView style={dynamicStyles.container} edges={['bottom', 'left', 'right']}>
      
      {/* Top Banner Informativo */}
      <View style={styles.topInfoBar}>
        <View style={[styles.sedePill, { backgroundColor: theme.primaryLight }]}>
          <MapPin color={theme.primary} size={14} />
          <Text style={[styles.sedePillText, { color: theme.primary }]}>Sede {sedeNombre}</Text>
        </View>
        <Text style={[styles.topSubText, { color: theme.textMuted }]}>
          Gestión de Abastecimiento & Stock
        </Text>
      </View>

      {/* Segmented Pill Tabs */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          <TouchableOpacity
            style={[
              styles.pillTab,
              activeTab === 'PEDIR' && [styles.pillTabActive, { backgroundColor: theme.card, borderColor: theme.primary }]
            ]}
            onPress={() => setActiveTab('PEDIR')}
          >
            <Text style={[styles.pillTabText, activeTab === 'PEDIR' ? { color: theme.primary, fontFamily: fonts.bold } : { color: theme.textMuted }]}>
              📦 Pedir Stock
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.pillTab,
              activeTab === 'CONFIRMAR' && [styles.pillTabActive, { backgroundColor: theme.card, borderColor: '#10b981' }]
            ]}
            onPress={() => setActiveTab('CONFIRMAR')}
          >
            <Text style={[styles.pillTabText, activeTab === 'CONFIRMAR' ? { color: '#10b981', fontFamily: fonts.bold } : { color: theme.textMuted }]}>
              📥 Recibir {entregasPendientes.length > 0 ? `(${entregasPendientes.length})` : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.pillTab,
              activeTab === 'MERMA' && [styles.pillTabActive, { backgroundColor: theme.card, borderColor: '#ef4444' }]
            ]}
            onPress={() => setActiveTab('MERMA')}
          >
            <Text style={[styles.pillTabText, activeTab === 'MERMA' ? { color: '#ef4444', fontFamily: fonts.bold } : { color: theme.textMuted }]}>
              ⚠️ Mermas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.pillTab,
              activeTab === 'TRASPASO' && [styles.pillTabActive, { backgroundColor: theme.card, borderColor: '#8b5cf6' }]
            ]}
            onPress={() => setActiveTab('TRASPASO')}
          >
            <Text style={[styles.pillTabText, activeTab === 'TRASPASO' ? { color: '#8b5cf6', fontFamily: fonts.bold } : { color: theme.textMuted }]}>
              🔄 Traspaso
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {loading && (
        <View style={styles.loadingBar}>
          <ActivityIndicator size="small" color={theme.primary} />
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        {/* ===================== TAB 1: PEDIR STOCK ===================== */}
        {activeTab === 'PEDIR' && (
          <View>
            <View style={dynamicStyles.card}>
              <View style={styles.cardHeader}>
                <Text style={dynamicStyles.textTitle}>Solicitar Reposición</Text>
                <Text style={dynamicStyles.textMuted}>Pide bebidas para abastecer el cooler de tu sede</Text>
              </View>

              {/* Fila Agua */}
              <View style={dynamicStyles.productTile}>
                <View style={styles.productRow}>
                  <View style={[styles.productIcon, { backgroundColor: '#e0f2fe' }]}>
                    <Droplets color="#0ea5e9" size={24} />
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={[styles.productTitle, { color: theme.text }]}>Agua Mineral</Text>
                    <Text style={styles.productSubtitle}>Fardo x 20 unidades</Text>
                  </View>
                  
                  {/* Stepper Rediseñado */}
                  <View style={styles.modernStepper}>
                    <TouchableOpacity
                      style={[styles.stepCircleBtn, { borderColor: theme.border }]}
                      onPress={() => setAguaPedir(Math.max(0, aguaPedir - 5))}
                    >
                      <Minus color={theme.text} size={15} />
                    </TouchableOpacity>

                    <View style={styles.stepDisplay}>
                      <Text style={[styles.stepNum, { color: theme.text }]}>{aguaPedir}</Text>
                      <Text style={styles.stepUnit}>und</Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.stepCircleBtn, { backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' }]}
                      onPress={() => setAguaPedir(aguaPedir + 5)}
                    >
                      <Plus color="white" size={15} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Presets Rápidos */}
                <View style={styles.presetRow}>
                  <TouchableOpacity style={styles.presetChip} onPress={() => setAguaPedir(aguaPedir + 20)}>
                    <Text style={styles.presetText}>+1 Fardo (20)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.presetChip} onPress={() => setAguaPedir(aguaPedir + 40)}>
                    <Text style={styles.presetText}>+2 Fardos (40)</Text>
                  </TouchableOpacity>
                  {aguaPedir > 0 && (
                    <TouchableOpacity style={styles.presetClear} onPress={() => setAguaPedir(0)}>
                      <RotateCcw color="#64748b" size={12} />
                      <Text style={styles.presetClearText}>0</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Fila Gatorade */}
              <View style={dynamicStyles.productTile}>
                <View style={styles.productRow}>
                  <View style={[styles.productIcon, { backgroundColor: '#fef3c7' }]}>
                    <Zap color="#d97706" size={24} />
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={[styles.productTitle, { color: theme.text }]}>Gatorade</Text>
                    <Text style={styles.productSubtitle}>Caja x 12 unidades</Text>
                  </View>
                  
                  {/* Stepper Rediseñado */}
                  <View style={styles.modernStepper}>
                    <TouchableOpacity
                      style={[styles.stepCircleBtn, { borderColor: theme.border }]}
                      onPress={() => setGatoradePedir(Math.max(0, gatoradePedir - 6))}
                    >
                      <Minus color={theme.text} size={15} />
                    </TouchableOpacity>

                    <View style={styles.stepDisplay}>
                      <Text style={[styles.stepNum, { color: theme.text }]}>{gatoradePedir}</Text>
                      <Text style={styles.stepUnit}>und</Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.stepCircleBtn, { backgroundColor: '#d97706', borderColor: '#d97706' }]}
                      onPress={() => setGatoradePedir(gatoradePedir + 6)}
                    >
                      <Plus color="white" size={15} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Presets Rápidos */}
                <View style={styles.presetRow}>
                  <TouchableOpacity style={styles.presetChip} onPress={() => setGatoradePedir(gatoradePedir + 12)}>
                    <Text style={styles.presetText}>+1 Caja (12)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.presetChip} onPress={() => setGatoradePedir(gatoradePedir + 24)}>
                    <Text style={styles.presetText}>+2 Cajas (24)</Text>
                  </TouchableOpacity>
                  {gatoradePedir > 0 && (
                    <TouchableOpacity style={styles.presetClear} onPress={() => setGatoradePedir(0)}>
                      <RotateCcw color="#64748b" size={12} />
                      <Text style={styles.presetClearText}>0</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Nivel de Urgencia */}
              <Text style={[styles.sectionLabel, { color: theme.text }]}>Nivel de Urgencia</Text>
              <View style={styles.urgencyGrid}>
                {[
                  { id: 'BAJA', label: 'Baja', desc: '3 a 5 días', color: '#10b981', bg: '#ecfdf5' },
                  { id: 'MEDIA', label: 'Media', desc: '1 a 2 días', color: '#f59e0b', bg: '#fffbeb' },
                  { id: 'ALTA', label: 'Alta', desc: 'Hoy mismo', color: '#ef4444', bg: '#fef2f2' },
                ].map((item) => {
                  const isSelected = urgencia === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.urgencyCard,
                        { borderColor: isSelected ? item.color : theme.border },
                        isSelected && { backgroundColor: item.bg, borderWidth: 2 }
                      ]}
                      onPress={() => setUrgencia(item.id as any)}
                    >
                      <Text style={[styles.urgencyTitle, { color: isSelected ? item.color : theme.text }]}>
                        {item.label}
                      </Text>
                      <Text style={styles.urgencySub}>{item.desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Comentarios */}
              <Text style={[styles.sectionLabel, { color: theme.text }]}>Comentario / Motivo (Opcional)</Text>
              <TextInput
                style={[styles.inputBox, { borderColor: theme.border, color: theme.text, backgroundColor: colorScheme === 'dark' ? '#1e293b' : '#f8fafc' }]}
                placeholder="Ej. Torneo el sábado, se necesitarán bebidas frías"
                placeholderTextColor={theme.textMuted}
                value={notasPedido}
                onChangeText={setNotasPedido}
                multiline
              />

              <AnimatedButton
                style={[styles.actionBtn, { backgroundColor: theme.primary, marginTop: 20 }]}
                onPress={handleEnviarPedido}
              >
                <Send color="white" size={18} />
                <Text style={styles.actionBtnText}>Enviar Pedido a Logística</Text>
              </AnimatedButton>
            </View>

            {/* Mis Pedidos Recientes */}
            <Text style={[styles.historyHeading, { color: theme.text }]}>Requerimientos Recientes</Text>
            {misPedidos.length === 0 ? (
              <View style={[dynamicStyles.card, { alignItems: 'center', paddingVertical: 25 }]}>
                <Inbox color="#cbd5e1" size={32} />
                <Text style={[styles.emptySub, { color: theme.textMuted }]}>No has realizado pedidos aún.</Text>
              </View>
            ) : (
              misPedidos.map((ped) => (
                <View key={ped.id} style={[dynamicStyles.card, { paddingVertical: 14, paddingHorizontal: 16 }]}>
                  <View style={styles.cardHeaderRow}>
                    <View style={[styles.statusBadge, {
                      backgroundColor: ped.estado === 'COMPLETADO' ? '#ecfdf5' : ped.estado === 'EN_RUTA' ? '#eff6ff' : '#fffbeb'
                    }]}>
                      <Text style={[styles.statusText, {
                        color: ped.estado === 'COMPLETADO' ? '#10b981' : ped.estado === 'EN_RUTA' ? '#2563eb' : '#d97706'
                      }]}>
                        • {ped.estado} ({ped.urgencia})
                      </Text>
                    </View>
                    <Text style={[styles.dateText, { color: theme.textMuted }]}>
                      {new Date(ped.fecha_solicitud).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={[styles.orderDetail, { color: theme.text }]}>
                    {ped.agua_solicitada} Aguas • {ped.gatorade_solicitada} Gatorades
                  </Text>
                  {ped.notas && (
                    <Text style={[styles.orderNotes, { color: theme.textMuted }]}>💬 "{ped.notas}"</Text>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* ===================== TAB 2: RECIBIR ENTREGAS ===================== */}
        {activeTab === 'CONFIRMAR' && (
          <View>
            <View style={dynamicStyles.card}>
              <Text style={dynamicStyles.textTitle}>Entregas por Confirmar</Text>
              <Text style={dynamicStyles.textMuted}>
                Verifica físicamente las bebidas antes de confirmar su ingreso a tu stock.
              </Text>
            </View>

            {entregasPendientes.length === 0 ? (
              <View style={[dynamicStyles.card, { alignItems: 'center', paddingVertical: 40 }]}>
                <CheckCircle color="#10b981" size={44} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>¡Todo al día!</Text>
                <Text style={[styles.emptySub, { color: theme.textMuted }]}>
                  No tienes entregas pendientes de confirmación en este momento.
                </Text>
              </View>
            ) : (
              entregasPendientes.map((item) => {
                const isExtra = item.condicion_envio === 'CON_EXTRA' || (item.descripcion && item.descripcion.includes('[EXTRA'));
                const isParcial = item.condicion_envio === 'PARCIAL' || (item.descripcion && item.descripcion.includes('[PARCIAL'));
                const isCompleto = item.condicion_envio === 'COMPLETO' || (item.descripcion && item.descripcion.includes('[COMPLETO'));

                return (
                  <View key={item.id} style={dynamicStyles.card}>
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.pendingBadge}>
                        <Clock color="#d97706" size={13} />
                        <Text style={styles.pendingBadgeText}>Esperando tu Visto Bueno</Text>
                      </View>
                      <Text style={[styles.dateText, { color: theme.textMuted }]}>
                        {new Date(item.fecha).toLocaleDateString()}
                      </Text>
                    </View>

                    {/* Badge de Condición de Despacho */}
                    {isExtra && (
                      <View style={[styles.condBadge, { backgroundColor: '#f5f3ff', borderColor: '#c4b5fd' }]}>
                        <Sparkles color="#7c3aed" size={14} />
                        <Text style={[styles.condBadgeText, { color: '#6d28d9' }]}>
                          🎁 Con Material Extra de Refuerzo
                          {item.agua_diferencia > 0 || item.gatorade_diferencia > 0
                            ? ` (+${item.agua_diferencia || 0} Agua, +${item.gatorade_diferencia || 0} Gat)`
                            : ''}
                        </Text>
                      </View>
                    )}

                    {isParcial && (
                      <View style={[styles.condBadge, { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]}>
                        <AlertOctagon color="#d97706" size={14} />
                        <Text style={[styles.condBadgeText, { color: '#b45309' }]}>
                          ⚠️ Despacho Parcial (Incompleto)
                          {item.agua_diferencia > 0 || item.gatorade_diferencia > 0
                            ? ` (Faltan: ${item.agua_diferencia > 0 ? `-${item.agua_diferencia} Agua ` : ''}${item.gatorade_diferencia > 0 ? `-${item.gatorade_diferencia} Gat` : ''})`
                            : ''}
                        </Text>
                      </View>
                    )}

                    {isCompleto && (
                      <View style={[styles.condBadge, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }]}>
                        <CheckCircle color="#059669" size={14} />
                        <Text style={[styles.condBadgeText, { color: '#047857' }]}>
                          ✅ Despacho 100% Conforme y Completo
                        </Text>
                      </View>
                    )}

                    <Text style={[styles.deliveryDesc, { color: theme.text }]}>
                      {item.descripcion || 'Entrega de logística'}
                    </Text>

                    {item.motivo_condicion ? (
                      <Text style={[styles.motivoCondicionText, { color: theme.textMuted }]}>
                        💬 Motivo logística: "{item.motivo_condicion}"
                      </Text>
                    ) : null}

                    <View style={styles.quantitiesRow}>
                      <View style={[styles.qtyBox, { backgroundColor: '#e0f2fe' }]}>
                        <Droplets color="#0ea5e9" size={18} />
                        <Text style={styles.qtyText}>+{item.agua_entregada} Agua</Text>
                      </View>
                      <View style={[styles.qtyBox, { backgroundColor: '#fef3c7' }]}>
                        <Zap color="#d97706" size={18} />
                        <Text style={styles.qtyText}>+{item.gatorade_entregada} Gatorade</Text>
                      </View>
                    </View>

                    {item.url_foto && (
                      <TouchableOpacity
                        style={styles.photoLink}
                        onPress={() => Linking.openURL(item.url_foto)}
                      >
                        <ImageIcon color={theme.primary} size={15} />
                        <Text style={[styles.photoLinkText, { color: theme.primary }]}>Ver foto de constancia</Text>
                      </TouchableOpacity>
                    )}

                    <AnimatedButton
                      style={[styles.actionBtn, { backgroundColor: '#10b981', marginTop: 10 }]}
                      onPress={() => handleConfirmarEntrega(item)}
                    >
                      <Check color="white" size={18} />
                      <Text style={styles.actionBtnText}>Confirmar y Sumar a Stock</Text>
                    </AnimatedButton>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ===================== TAB 3: REPORTAR MERMA ===================== */}
        {activeTab === 'MERMA' && (
          <View>
            <View style={dynamicStyles.card}>
              <View style={styles.cardHeader}>
                <Text style={dynamicStyles.textTitle}>Reportar Bajas o Mermas</Text>
                <Text style={dynamicStyles.textMuted}>
                  Descuenta botellas rotas o vencidas de forma justificada sin descuadrar la caja.
                </Text>
              </View>

              <Text style={[styles.sectionLabel, { color: theme.text }]}>Tipo de Merma</Text>
              <View style={styles.chipsWrap}>
                {(['ROTURA', 'VENCIMIENTO', 'CORTESIA', 'DEFECTO'] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.choiceChip,
                      tipoMerma === t && { backgroundColor: '#ef4444', borderColor: '#ef4444' }
                    ]}
                    onPress={() => setTipoMerma(t)}
                  >
                    <Text style={[styles.choiceChipText, tipoMerma === t && { color: 'white', fontFamily: fonts.bold }]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Agua mermada */}
              <View style={dynamicStyles.productTile}>
                <View style={styles.productRow}>
                  <View style={[styles.productIcon, { backgroundColor: '#fee2e2' }]}>
                    <Droplets color="#ef4444" size={24} />
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={[styles.productTitle, { color: theme.text }]}>Agua Mineral</Text>
                    <Text style={styles.productSubtitle}>Unidades dañadas</Text>
                  </View>

                  <View style={styles.modernStepper}>
                    <TouchableOpacity
                      style={[styles.stepCircleBtn, { borderColor: theme.border }]}
                      onPress={() => setAguaMerma(Math.max(0, aguaMerma - 1))}
                    >
                      <Minus color={theme.text} size={15} />
                    </TouchableOpacity>
                    <View style={styles.stepDisplay}>
                      <Text style={[styles.stepNum, { color: theme.text }]}>{aguaMerma}</Text>
                      <Text style={styles.stepUnit}>und</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.stepCircleBtn, { backgroundColor: '#ef4444', borderColor: '#ef4444' }]}
                      onPress={() => setAguaMerma(aguaMerma + 1)}
                    >
                      <Plus color="white" size={15} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Gatorade mermado */}
              <View style={dynamicStyles.productTile}>
                <View style={styles.productRow}>
                  <View style={[styles.productIcon, { backgroundColor: '#fee2e2' }]}>
                    <Zap color="#ef4444" size={24} />
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={[styles.productTitle, { color: theme.text }]}>Gatorade</Text>
                    <Text style={styles.productSubtitle}>Unidades dañadas</Text>
                  </View>

                  <View style={styles.modernStepper}>
                    <TouchableOpacity
                      style={[styles.stepCircleBtn, { borderColor: theme.border }]}
                      onPress={() => setGatoradeMerma(Math.max(0, gatoradeMerma - 1))}
                    >
                      <Minus color={theme.text} size={15} />
                    </TouchableOpacity>
                    <View style={styles.stepDisplay}>
                      <Text style={[styles.stepNum, { color: theme.text }]}>{gatoradeMerma}</Text>
                      <Text style={styles.stepUnit}>und</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.stepCircleBtn, { backgroundColor: '#ef4444', borderColor: '#ef4444' }]}
                      onPress={() => setGatoradeMerma(gatoradeMerma + 1)}
                    >
                      <Plus color="white" size={15} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <Text style={[styles.sectionLabel, { color: theme.text }]}>Motivo o Explicación *</Text>
              <TextInput
                style={[styles.inputBox, { borderColor: theme.border, color: theme.text, backgroundColor: colorScheme === 'dark' ? '#1e293b' : '#f8fafc' }]}
                placeholder="Ej. Se cayó una botella durante el entrenamiento"
                placeholderTextColor={theme.textMuted}
                value={motivoMerma}
                onChangeText={setMotivoMerma}
                multiline
              />

              <AnimatedButton
                style={[styles.actionBtn, { backgroundColor: '#ef4444', marginTop: 20 }]}
                onPress={handleRegistrarMerma}
              >
                <AlertOctagon color="white" size={18} />
                <Text style={styles.actionBtnText}>Registrar Baja y Descontar</Text>
              </AnimatedButton>
            </View>
          </View>
        )}

        {/* ===================== TAB 4: TRASPASO ENTRE SEDES ===================== */}
        {activeTab === 'TRASPASO' && (
          <View>
            <View style={dynamicStyles.card}>
              <View style={styles.cardHeader}>
                <Text style={dynamicStyles.textTitle}>Transferir a Otra Sede</Text>
                <Text style={dynamicStyles.textMuted}>
                  Envía bebidas directamente a otra sede hermana sin descuadrar inventarios.
                </Text>
              </View>

              <Text style={[styles.sectionLabel, { color: theme.text }]}>Sede Destino</Text>
              <View style={styles.chipsWrap}>
                {sedesList.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      styles.choiceChip,
                      sedeDestinoId === s.id && { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' }
                    ]}
                    onPress={() => setSedeDestinoId(s.id)}
                  >
                    <Text style={[styles.choiceChipText, sedeDestinoId === s.id && { color: 'white', fontFamily: fonts.bold }]}>
                      {s.nombre}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Agua a transferir */}
              <View style={dynamicStyles.productTile}>
                <View style={styles.productRow}>
                  <View style={[styles.productIcon, { backgroundColor: '#f3e8ff' }]}>
                    <Droplets color="#8b5cf6" size={24} />
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={[styles.productTitle, { color: theme.text }]}>Agua a Transferir</Text>
                    <Text style={styles.productSubtitle}>Unidades</Text>
                  </View>

                  <View style={styles.modernStepper}>
                    <TouchableOpacity
                      style={[styles.stepCircleBtn, { borderColor: theme.border }]}
                      onPress={() => setAguaTraspaso(Math.max(0, aguaTraspaso - 1))}
                    >
                      <Minus color={theme.text} size={15} />
                    </TouchableOpacity>
                    <View style={styles.stepDisplay}>
                      <Text style={[styles.stepNum, { color: theme.text }]}>{aguaTraspaso}</Text>
                      <Text style={styles.stepUnit}>und</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.stepCircleBtn, { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' }]}
                      onPress={() => setAguaTraspaso(aguaTraspaso + 1)}
                    >
                      <Plus color="white" size={15} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Gatorade a transferir */}
              <View style={dynamicStyles.productTile}>
                <View style={styles.productRow}>
                  <View style={[styles.productIcon, { backgroundColor: '#f3e8ff' }]}>
                    <Zap color="#8b5cf6" size={24} />
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={[styles.productTitle, { color: theme.text }]}>Gatorade a Transferir</Text>
                    <Text style={styles.productSubtitle}>Unidades</Text>
                  </View>

                  <View style={styles.modernStepper}>
                    <TouchableOpacity
                      style={[styles.stepCircleBtn, { borderColor: theme.border }]}
                      onPress={() => setGatoradeTraspaso(Math.max(0, gatoradeTraspaso - 1))}
                    >
                      <Minus color={theme.text} size={15} />
                    </TouchableOpacity>
                    <View style={styles.stepDisplay}>
                      <Text style={[styles.stepNum, { color: theme.text }]}>{gatoradeTraspaso}</Text>
                      <Text style={styles.stepUnit}>und</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.stepCircleBtn, { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' }]}
                      onPress={() => setGatoradeTraspaso(gatoradeTraspaso + 1)}
                    >
                      <Plus color="white" size={15} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <Text style={[styles.sectionLabel, { color: theme.text }]}>Motivo del Traspaso</Text>
              <TextInput
                style={[styles.inputBox, { borderColor: theme.border, color: theme.text, backgroundColor: colorScheme === 'dark' ? '#1e293b' : '#f8fafc' }]}
                placeholder="Ej. Préstamo de botellas para jornada de partidos"
                placeholderTextColor={theme.textMuted}
                value={motivoTraspaso}
                onChangeText={setMotivoTraspaso}
              />

              <AnimatedButton
                style={[styles.actionBtn, { backgroundColor: '#8b5cf6', marginTop: 20 }]}
                onPress={handleTransferir}
              >
                <ArrowRightLeft color="white" size={18} />
                <Text style={styles.actionBtnText}>Realizar Transferencia</Text>
              </AnimatedButton>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topInfoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  sedePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 5,
  },
  sedePillText: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  topSubText: {
    fontFamily: fonts.medium,
    fontSize: 12,
  },

  tabContainer: {
    marginVertical: 10,
    paddingHorizontal: 20,
  },
  tabScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  pillTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  pillTabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  pillTabText: {
    fontSize: 13,
    fontFamily: fonts.medium,
  },

  loadingBar: {
    paddingVertical: 6,
    alignItems: 'center',
  },

  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  cardHeader: {
    marginBottom: 16,
  },

  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
  },
  productSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: '#64748b',
    marginTop: 1,
  },

  modernStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  stepDisplay: {
    alignItems: 'center',
    minWidth: 42,
  },
  stepNum: {
    fontSize: 17,
    fontFamily: fonts.bold,
  },
  stepUnit: {
    fontSize: 10,
    fontFamily: fonts.medium,
    color: '#64748b',
    marginTop: -2,
  },

  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.15)',
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
  },
  presetText: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    color: '#475569',
  },
  presetClear: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    marginLeft: 'auto',
  },
  presetClearText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: '#64748b',
  },

  sectionLabel: {
    fontSize: 14,
    fontFamily: fonts.bold,
    marginTop: 16,
    marginBottom: 8,
  },
  urgencyGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  urgencyCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  urgencyTitle: {
    fontSize: 14,
    fontFamily: fonts.bold,
  },
  urgencySub: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: '#64748b',
    marginTop: 2,
  },

  inputBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    fontSize: 14,
    minHeight: 70,
    textAlignVertical: 'top',
    fontFamily: fonts.regular,
  },

  actionBtn: {
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  actionBtnText: {
    color: 'white',
    fontFamily: fonts.bold,
    fontSize: 15,
  },

  historyHeading: {
    fontSize: 17,
    fontFamily: fonts.bold,
    marginTop: 10,
    marginBottom: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 12,
    fontFamily: fonts.bold,
  },
  dateText: {
    fontSize: 12,
    fontFamily: fonts.regular,
  },
  orderDetail: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    marginTop: 2,
  },
  orderNotes: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },

  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  pendingBadgeText: {
    color: '#d97706',
    fontSize: 12,
    fontFamily: fonts.bold,
  },
  deliveryDesc: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    marginBottom: 12,
  },
  quantitiesRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  qtyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
    flex: 1,
  },
  qtyText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: '#334155',
  },
  photoLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  photoLinkText: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    textDecorationLine: 'underline',
  },

  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  choiceChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  choiceChipText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: '#64748b',
  },

  emptyTitle: {
    fontSize: 17,
    fontFamily: fonts.bold,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 13,
    fontFamily: fonts.regular,
    textAlign: 'center',
    marginTop: 4,
  },

  condBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  condBadgeText: {
    fontSize: 12,
    fontFamily: fonts.bold,
  },
  motivoCondicionText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    fontStyle: 'italic',
    marginBottom: 10,
  },
});
