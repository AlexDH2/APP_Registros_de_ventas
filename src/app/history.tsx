import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, TouchableOpacity, Linking, Modal, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Clock, Smartphone, User, FileText, Image as ImageIcon, XCircle, RefreshCw } from 'lucide-react-native';

type Venta = {
  id: number;
  fecha: string;
  monto: number;
  descripcion: string;
  vendedor: string;
  metodo_pago: string;
  url_captura: string;
  estado: string;
  agua_vendida?: number;
  gatorade_vendida?: number;
  sede_id?: number;
};

export default function HistoryScreen() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [precios, setPrecios] = useState({ agua: 2, gatorade: 3 });
  const [swappingId, setSwappingId] = useState<number | null>(null);

  // Filtros
  const [metodoFiltro, setMetodoFiltro] = useState<string>('Todos');
  
  // Modal de anulación
  const [ventaAnular, setVentaAnular] = useState<Venta | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [solicitando, setSolicitando] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const savedSedeId = await AsyncStorage.getItem('sede_id');
      const sedeId = parseInt(savedSedeId || '0');

      // Precios configurados
      const { data: config } = await supabase.from('configuracion_precios').select('precio_agua, precio_gatorade').single();
      if (config) setPrecios({ agua: config.precio_agua, gatorade: config.precio_gatorade });

      // Cargar ventas de la sede
      const query = supabase
        .from('ventas')
        .select('*')
        .eq('sede_id', sedeId)
        .order('fecha', { ascending: false })
        .limit(100);

      const { data, error } = await query;
      if (error) throw error;
      setVentas(data || []);
    } catch {
      Alert.alert('Error', 'No se pudo cargar el historial');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const openImage = (url: string) => {
    if(url) Linking.openURL(url).catch(() => Alert.alert('Error', 'No se pudo abrir la imagen'));
  };

  const solicitarCambioProducto = (venta: Venta, direccion: 'agua_a_gatorade' | 'gatorade_a_agua') => {
    const diff = (precios.gatorade || 3) - (precios.agua || 2);
    if (direccion === 'agua_a_gatorade') {
      Alert.alert(
        '¿Cambiar Agua por Gatorade?',
        `El alumno devuelve el Agua y se lleva un Gatorade.\n\n• Cobrar al alumno: +S/ ${diff.toFixed(2)} en efectivo\n• Inventario sede: +1 Agua / -1 Gatorade`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: `Confirmar (+S/ ${diff.toFixed(2)})`,
            onPress: () => ejecutarCambioProducto(venta, 'agua_a_gatorade'),
          },
        ]
      );
    } else {
      Alert.alert(
        '¿Cambiar Gatorade por Agua?',
        `El alumno devuelve el Gatorade y se lleva un Agua.\n\n• Devolver al alumno: S/ ${diff.toFixed(2)}\n• Inventario sede: -1 Agua / +1 Gatorade`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: `Confirmar (Devolver S/ ${diff.toFixed(2)})`,
            onPress: () => ejecutarCambioProducto(venta, 'gatorade_a_agua'),
          },
        ]
      );
    }
  };

  const ejecutarCambioProducto = async (venta: Venta, direccion: 'agua_a_gatorade' | 'gatorade_a_agua') => {
    setSwappingId(venta.id);
    try {
      const savedSedeId = await AsyncStorage.getItem('sede_id');
      const sedeId = venta.sede_id || parseInt(savedSedeId || '0');

      const { data: inv, error: invErr } = await supabase
        .from('inventario_bebidas')
        .select('*')
        .eq('sede_id', sedeId)
        .single();

      if (invErr || !inv) {
        return Alert.alert('Error', 'No se pudo obtener el inventario de la sede.');
      }

      const diff = (precios.gatorade || 3) - (precios.agua || 2);

      if (direccion === 'agua_a_gatorade') {
        if (inv.gatorade_cantidad <= 0) {
          return Alert.alert('Stock Agotado', 'No queda Gatorade en stock en esta sede para realizar el cambio.');
        }

        const nuevoAgua = Math.max(0, (venta.agua_vendida || 0) - 1);
        const nuevoGatorade = (venta.gatorade_vendida || 0) + 1;
        const nuevoMonto = Number(venta.monto) + diff;
        const nuevaDesc = `${venta.descripcion || 'Venta'} | 🔄 Cambio: Agua ➔ Gatorade (+S/ ${diff.toFixed(2)})`;

        const { error: vErr } = await supabase
          .from('ventas')
          .update({
            agua_vendida: nuevoAgua,
            gatorade_vendida: nuevoGatorade,
            monto: nuevoMonto,
            descripcion: nuevaDesc,
          })
          .eq('id', venta.id);

        if (vErr) throw vErr;

        await supabase
          .from('inventario_bebidas')
          .update({
            agua_cantidad: inv.agua_cantidad + 1,
            gatorade_cantidad: Math.max(0, inv.gatorade_cantidad - 1),
          })
          .eq('id', inv.id);

        Alert.alert(
          '¡Cambio Realizado!',
          `✅ Se ajustó el inventario (+1 Agua, -1 Gatorade).\n\n💵 COBRASTE S/ ${diff.toFixed(2)} ADICIONAL AL ALUMNO.`
        );
      } else {
        if (inv.agua_cantidad <= 0) {
          return Alert.alert('Stock Agotado', 'No queda Agua en stock en esta sede para realizar el cambio.');
        }

        const nuevoAgua = (venta.agua_vendida || 0) + 1;
        const nuevoGatorade = Math.max(0, (venta.gatorade_vendida || 0) - 1);
        const nuevoMonto = Math.max(0, Number(venta.monto) - diff);
        const nuevaDesc = `${venta.descripcion || 'Venta'} | 🔄 Cambio: Gatorade ➔ Agua (-S/ ${diff.toFixed(2)})`;

        const { error: vErr } = await supabase
          .from('ventas')
          .update({
            agua_vendida: nuevoAgua,
            gatorade_vendida: nuevoGatorade,
            monto: nuevoMonto,
            descripcion: nuevaDesc,
          })
          .eq('id', venta.id);

        if (vErr) throw vErr;

        await supabase
          .from('inventario_bebidas')
          .update({
            agua_cantidad: Math.max(0, inv.agua_cantidad - 1),
            gatorade_cantidad: inv.gatorade_cantidad + 1,
          })
          .eq('id', inv.id);

        Alert.alert(
          '¡Cambio Realizado!',
          `✅ Se ajustó el inventario (-1 Agua, +1 Gatorade).\n\n💵 DEVUELVE S/ ${diff.toFixed(2)} AL ALUMNO.`
        );
      }

      fetchHistory();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo realizar el cambio');
    } finally {
      setSwappingId(null);
    }
  };

  const solicitarAnulacion = async () => {
    if (!motivoAnulacion.trim()) return Alert.alert('Aviso', 'Escribe el motivo de la anulación');
    setSolicitando(true);
    try {
      const usuarioIdStr = await AsyncStorage.getItem('usuario_id');
      const usuarioId = parseInt(usuarioIdStr || '0');

      const { error } = await supabase.from('anulaciones').insert([{
        venta_id: ventaAnular?.id,
        usuario_solicitante_id: usuarioId,
        motivo: motivoAnulacion
      }]);

      if (error && error.code === '23505') {
        throw new Error('Esta venta ya tiene una solicitud de anulación pendiente.');
      } else if (error) throw error;

      Alert.alert('Éxito', 'Solicitud enviada al administrador.');
      setVentaAnular(null);
      setMotivoAnulacion('');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSolicitando(false);
    }
  };

  const ventasFiltradas = ventas.filter(v => 
    metodoFiltro === 'Todos' || v.metodo_pago === metodoFiltro
  );

  const renderItem = ({ item }: { item: Venta }) => (
    <View style={[styles.card, item.estado === 'ANULADA' && styles.cardAnulada]}>
      <View style={styles.cardHeader}>
        <View style={styles.timeBadge}>
          <Clock color="#64748b" size={14} />
          <Text style={styles.timeText}>
            {new Date(item.fecha).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
          </Text>
        </View>
        <Text style={[styles.monto, item.estado === 'ANULADA' && { textDecorationLine: 'line-through', color: '#94a3b8' }]}>
          S/ {item.monto?.toFixed(2) || '0.00'}
        </Text>
      </View>
      
      {item.estado === 'ANULADA' && <Text style={styles.anuladaBadge}>ANULADA</Text>}

      <Text style={styles.descripcion}>{item.descripcion}</Text>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <User color="#94a3b8" size={16} />
          <Text style={styles.metaText}>{item.vendedor}</Text>
        </View>
        <View style={styles.metaItem}>
          <Smartphone color="#94a3b8" size={16} />
          <Text style={styles.metaText}>{item.metodo_pago}</Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.imageButton} onPress={() => openImage(item.url_captura)}>
          <ImageIcon color="#2563eb" size={16} />
          <Text style={styles.imageButtonText}>Comprobante</Text>
        </TouchableOpacity>

        {item.estado !== 'ANULADA' && (item.agua_vendida || 0) > 0 && (
          <TouchableOpacity 
            style={[styles.swapButtonGatorade, swappingId === item.id && { opacity: 0.5 }]}
            onPress={() => solicitarCambioProducto(item, 'agua_a_gatorade')}
            disabled={swappingId === item.id}
            activeOpacity={0.7}
          >
            <RefreshCw color="#d97706" size={14} />
            <Text style={styles.swapButtonTextGatorade}>A Gatorade (+S/ 1)</Text>
          </TouchableOpacity>
        )}

        {item.estado !== 'ANULADA' && (item.gatorade_vendida || 0) > 0 && (
          <TouchableOpacity 
            style={[styles.swapButtonAgua, swappingId === item.id && { opacity: 0.5 }]}
            onPress={() => solicitarCambioProducto(item, 'gatorade_a_agua')}
            disabled={swappingId === item.id}
            activeOpacity={0.7}
          >
            <RefreshCw color="#0284c7" size={14} />
            <Text style={styles.swapButtonTextAgua}>A Agua (-S/ 1)</Text>
          </TouchableOpacity>
        )}

        {item.estado !== 'ANULADA' && (
          <TouchableOpacity style={styles.anularButton} onPress={() => setVentaAnular(item)}>
            <XCircle color="#ef4444" size={18} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Historial de Ventas</Text>
        <Text style={styles.subtitle}>{ventasFiltradas.length} registros recientes</Text>
      </View>

      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
          {['Todos', 'Efectivo', 'Yape', 'Plin', 'Transferencia'].map(metodo => (
            <TouchableOpacity 
              key={metodo} 
              style={[styles.filterBadge, metodoFiltro === metodo && styles.filterBadgeActive]}
              onPress={() => setMetodoFiltro(metodo)}
            >
              <Text style={[styles.filterText, metodoFiltro === metodo && styles.filterTextActive]}>{metodo}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={ventasFiltradas}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.centerEmpty}>
              <FileText color="#cbd5e1" size={60} />
              <Text style={styles.emptyText}>No hay ventas registradas</Text>
            </View>
          }
        />
      )}

      {/* Modal Anulación */}
      <Modal visible={!!ventaAnular} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Solicitar Anulación</Text>
            <Text style={styles.modalSubtitle}>Esta solicitud será enviada al administrador para su aprobación.</Text>
            
            <TextInput
              style={styles.motivoInput}
              placeholder="Escribe el motivo del error..."
              value={motivoAnulacion}
              onChangeText={setMotivoAnulacion}
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setVentaAnular(null)}>
                <Text style={styles.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSubmit} onPress={solicitarAnulacion} disabled={solicitando}>
                {solicitando ? <ActivityIndicator color="white" /> : <Text style={styles.btnSubmitText}>Enviar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingBottom: 10 },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 15, color: '#64748b', marginTop: 5 },
  
  filtersContainer: { paddingHorizontal: 20, marginBottom: 10 },
  filtersScroll: { flexDirection: 'row' },
  filterBadge: { backgroundColor: 'white', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  filterBadgeActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  filterText: { color: '#64748b', fontWeight: '600' },
  filterTextActive: { color: 'white' },

  list: { padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centerEmpty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#94a3b8', fontSize: 16, marginTop: 15 },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 16, marginBottom: 15, shadowColor: '#64748b', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardAnulada: { backgroundColor: '#f8fafc', opacity: 0.7 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  timeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 5 },
  timeText: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  monto: { fontSize: 20, fontWeight: '800', color: '#10b981' },
  anuladaBadge: { color: '#ef4444', fontWeight: 'bold', marginBottom: 5, fontSize: 12 },
  descripcion: { fontSize: 16, color: '#334155', fontWeight: '500', marginBottom: 15 },
  metaRow: { flexDirection: 'row', gap: 15, marginBottom: 15 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: '#64748b', fontSize: 14 },
  
  actionsRow: { flexDirection: 'row', gap: 10 },
  imageButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#eff6ff', padding: 12, borderRadius: 12, gap: 8 },
  imageButtonText: { color: '#2563eb', fontWeight: 'bold' },
  anularButton: { backgroundColor: '#fef2f2', padding: 12, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  swapButtonGatorade: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fef3c7',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 6,
  },
  swapButtonTextGatorade: {
    color: '#b45309',
    fontWeight: 'bold',
    fontSize: 12,
  },
  swapButtonAgua: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#e0f2fe',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 6,
  },
  swapButtonTextAgua: {
    color: '#0369a1',
    fontWeight: 'bold',
    fontSize: 12,
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', padding: 25, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginBottom: 5 },
  modalSubtitle: { fontSize: 14, color: '#64748b', marginBottom: 20 },
  motivoInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 15, height: 100, textAlignVertical: 'top', fontSize: 16, marginBottom: 20 },
  modalButtons: { flexDirection: 'row', gap: 10 },
  btnCancel: { flex: 1, padding: 15, backgroundColor: '#f1f5f9', borderRadius: 12, alignItems: 'center' },
  btnCancelText: { color: '#64748b', fontWeight: 'bold' },
  btnSubmit: { flex: 1, padding: 15, backgroundColor: '#ef4444', borderRadius: 12, alignItems: 'center' },
  btnSubmitText: { color: 'white', fontWeight: 'bold' }
});
