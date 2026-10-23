import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react-native';

export default function AdminAnulacionesScreen() {
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('anulaciones')
        .select(`
          id, motivo, estado, fecha_solicitud,
          usuarios (nombre_completo),
          ventas (id, monto, descripcion, agua_vendida, gatorade_vendida, sede_id, estado)
        `)
        .order('fecha_solicitud', { ascending: false });

      if (error) throw error;
      setSolicitudes(data || []);
    } catch (e) {
      Alert.alert('Error', 'No se pudieron cargar las solicitudes');
    } finally {
      setLoading(false);
    }
  };

  const procesarSolicitud = async (solicitud: any, accion: 'APROBADA' | 'RECHAZADA') => {
    setProcessing(solicitud.id);
    try {
      if (accion === 'APROBADA') {
        // 1. Marcar venta como ANULADA y asegurar motivo
        try {
          await supabase.from('ventas').update({ 
            estado: 'ANULADA',
            motivo_anulacion: solicitud.motivo
          }).eq('id', solicitud.ventas.id);
        } catch {
          await supabase.from('ventas').update({ estado: 'ANULADA' }).eq('id', solicitud.ventas.id);
        }
        
        // 2. Devolver inventario a la sede (garantiza que la anulación no disminuya material)
        const cantAgua = Number(solicitud.ventas.agua_vendida) || 0;
        const cantGat = Number(solicitud.ventas.gatorade_vendida) || 0;

        if (cantAgua > 0 || cantGat > 0) {
          const { data: inv } = await supabase
            .from('inventario_bebidas')
            .select('*')
            .eq('sede_id', solicitud.ventas.sede_id)
            .maybeSingle();

          if (inv) {
            await supabase.from('inventario_bebidas').update({
              agua_cantidad: inv.agua_cantidad + cantAgua,
              gatorade_cantidad: inv.gatorade_cantidad + cantGat
            }).eq('id', inv.id);
          }
        }
      } else {
        // Si el Administrador la rechaza, la venta vuelve a estado COMPLETADA
        await supabase.from('ventas').update({ estado: 'COMPLETADA' }).eq('id', solicitud.ventas.id);
      }

      // 3. Actualizar estado de la solicitud
      await supabase.from('anulaciones').update({ estado: accion }).eq('id', solicitud.id);
      
      const mensaje = accion === 'APROBADA'
        ? `✅ Solicitud APROBADA.\n\nLa venta pasó a estado ANULADA (no suma a ganancias) y se reintegraron las bebidas al inventario de la sede.`
        : `Solicitud RECHAZADA.\n\nLa venta se mantiene activa en estado COMPLETADA.`;

      Alert.alert('Auditoría de Ventas', mensaje);
      loadData();
    } catch {
      Alert.alert('Error', 'Ocurrió un problema procesando la solicitud');
    } finally {
      setProcessing(null);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.vendedorText}>{item.usuarios.nombre_completo}</Text>
        <View style={[styles.badge, item.estado === 'PENDIENTE' ? styles.badgePendiente : (item.estado === 'APROBADA' ? styles.badgeAprobada : styles.badgeRechazada)]}>
          <Text style={styles.badgeText}>{item.estado}</Text>
        </View>
      </View>
      
      <Text style={styles.motivoLabel}>Motivo del vendedor:</Text>
      <Text style={styles.motivoText}>"{item.motivo}"</Text>

      <View style={styles.ventaBox}>
        <Text style={styles.ventaTitle}>Venta a anular:</Text>
        <Text style={styles.ventaDesc}>{item.ventas.descripcion}</Text>
        <Text style={styles.ventaTotal}>S/ {item.ventas.monto.toFixed(2)}</Text>
      </View>

      {item.estado === 'PENDIENTE' && (
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.btn, styles.btnReject]} onPress={() => procesarSolicitud(item, 'RECHAZADA')} disabled={processing === item.id}>
            {processing === item.id ? <ActivityIndicator color="#ef4444" /> : <XCircle color="#ef4444" size={20} />}
            <Text style={styles.btnRejectText}>Rechazar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnApprove]} onPress={() => procesarSolicitud(item, 'APROBADA')} disabled={processing === item.id}>
            {processing === item.id ? <ActivityIndicator color="white" /> : <CheckCircle color="white" size={20} />}
            <Text style={styles.btnApproveText}>Aprobar y Devolver</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Auditoría de Ventas</Text>
        <Text style={styles.subtitle}>Solicitudes de anulación</Text>
      </View>

      {loading ? <ActivityIndicator size="large" color="#0f172a" style={{ marginTop: 50 }} /> : (
        <FlatList
          data={solicitudes}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.empty}>
              <AlertTriangle color="#cbd5e1" size={50} />
              <Text style={styles.emptyText}>No hay solicitudes de anulación.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20 },
  title: { fontSize: 28, fontWeight: '900', color: '#0f172a' },
  subtitle: { fontSize: 16, color: '#64748b' },
  list: { padding: 20 },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 16, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  vendedorText: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgePendiente: { backgroundColor: '#fef3c7' },
  badgeAprobada: { backgroundColor: '#dcfce7' },
  badgeRechazada: { backgroundColor: '#fee2e2' },
  badgeText: { fontSize: 12, fontWeight: 'bold', color: '#475569' },
  motivoLabel: { fontSize: 12, color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' },
  motivoText: { fontSize: 15, color: '#334155', fontStyle: 'italic', marginBottom: 15, marginTop: 5 },
  ventaBox: { backgroundColor: '#f8fafc', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 15 },
  ventaTitle: { fontSize: 12, color: '#64748b', fontWeight: 'bold', marginBottom: 5 },
  ventaDesc: { fontSize: 14, color: '#334155', marginBottom: 5 },
  ventaTotal: { fontSize: 18, fontWeight: 'bold', color: '#ef4444' },
  actions: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 12, borderRadius: 12, gap: 5 },
  btnReject: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
  btnRejectText: { color: '#ef4444', fontWeight: 'bold' },
  btnApprove: { backgroundColor: '#10b981' },
  btnApproveText: { color: 'white', fontWeight: 'bold' },
  empty: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#94a3b8', marginTop: 10, fontSize: 16 }
});
