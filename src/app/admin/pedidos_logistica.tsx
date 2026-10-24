import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  useColorScheme
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors, fonts } from '../../theme';
import AnimatedButton from '../../components/AnimatedButton';
import {
  Inbox,
  Clock,
  MapPin,
  Droplets,
  Zap,
  Truck,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react-native';

export default function PedidosLogisticaScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? colors.dark : colors.light;

  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<'PENDIENTE' | 'EN_RUTA' | 'COMPLETADO' | 'TODOS'>('PENDIENTE');
  const isUpdatingRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      loadPedidos();
    }, [filtro])
  );

  const loadPedidos = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('pedidos_sede')
        .select(`
          id, solicitado_por, fecha_solicitud, agua_solicitada, gatorade_solicitada,
          urgencia, notas, estado, fecha_atencion,
          sedes (id, nombre)
        `)
        .order('fecha_solicitud', { ascending: false });

      if (filtro !== 'TODOS') {
        query = query.eq('estado', filtro);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPedidos(data || []);
    } catch (e: any) {
      Alert.alert('Error', 'No se pudieron cargar los pedidos: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCambiarEstado = async (pedidoId: number, nuevoEstado: string) => {
    if (isUpdatingRef.current) return;
    isUpdatingRef.current = true;
    try {
      const { error } = await supabase
        .from('pedidos_sede')
        .update({
          estado: nuevoEstado,
          fecha_atencion: nuevoEstado === 'COMPLETADO' ? new Date().toISOString() : null
        })
        .eq('id', pedidoId);

      if (error) throw error;
      Alert.alert('Actualizado', `El pedido pasó a estado: ${nuevoEstado}`);
      loadPedidos();
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo actualizar: ' + err.message);
    } finally {
      isUpdatingRef.current = false;
    }
  };

  const dynamicStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    card: {
      backgroundColor: theme.card,
      borderRadius: 20,
      padding: 18,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2
    },
    textTitle: { fontFamily: fonts.bold, color: theme.text, fontSize: 17 },
    textMuted: { fontFamily: fonts.regular, color: theme.textMuted, fontSize: 13 },
  });

  const renderItem = ({ item }: { item: any }) => {
    const urgenciaColor = item.urgencia === 'ALTA' ? '#ef4444' : item.urgencia === 'MEDIA' ? '#f59e0b' : '#10b981';

    return (
      <View style={dynamicStyles.card}>
        <View style={styles.cardTop}>
          <View style={styles.sedeBadge}>
            <MapPin color={theme.primary} size={15} />
            <Text style={[styles.sedeName, { color: theme.primary }]}>{item.sedes?.nombre || 'Sede'}</Text>
          </View>
          <View style={[styles.urgencyBadge, { backgroundColor: urgenciaColor + '20', borderColor: urgenciaColor }]}>
            <Text style={[styles.urgencyText, { color: urgenciaColor }]}>{item.urgencia}</Text>
          </View>
        </View>

        <Text style={[styles.requesterText, { color: theme.textMuted }]}>
          Solicitado por: <Text style={{ color: theme.text, fontFamily: fonts.semiBold }}>{item.solicitado_por}</Text> • {new Date(item.fecha_solicitud).toLocaleDateString()}
        </Text>

        <View style={styles.qtyRow}>
          <View style={[styles.qtyChip, { backgroundColor: '#e0f2fe' }]}>
            <Droplets color="#0ea5e9" size={16} />
            <Text style={styles.qtyChipText}>{item.agua_solicitada} Aguas</Text>
          </View>
          <View style={[styles.qtyChip, { backgroundColor: '#fef3c7' }]}>
            <Zap color="#d97706" size={16} />
            <Text style={styles.qtyChipText}>{item.gatorade_solicitada} Gatorades</Text>
          </View>
        </View>

        {item.notas && (
          <Text style={[styles.notesText, { color: theme.textMuted }]}>
            💬 "{item.notas}"
          </Text>
        )}

        <View style={styles.actionsRow}>
          {item.estado === 'PENDIENTE' && (
            <View style={{ width: '100%' }}>
              <TouchableOpacity
                style={[styles.btnAction, { backgroundColor: '#10b981', width: '100%' }]}
                onPress={() => router.push({
                  pathname: '/delivery',
                  params: {
                    pedido_id: item.id.toString(),
                    sede_id: item.sedes?.id ? item.sedes.id.toString() : '',
                    sede_nombre: item.sedes?.nombre || '',
                    agua_solicitada: (item.agua_solicitada ?? 0).toString(),
                    gatorade_solicitada: (item.gatorade_solicitada ?? 0).toString(),
                    solicitado_por: item.solicitado_por || '',
                    urgencia: item.urgencia || 'MEDIA',
                    notas: item.notas || ''
                  }
                })}
              >
                <Truck color="white" size={17} />
                <Text style={styles.btnActionText}>📦 Despachar Pedido</Text>
              </TouchableOpacity>
            </View>
          )}

          {item.estado === 'EN_RUTA' && (
            <View style={{ width: '100%', gap: 10 }}>
              <View style={styles.enRutaNotice}>
                <Clock color="#2563eb" size={16} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.enRutaTitle}>🚚 En Ruta hacia Sede</Text>
                  <Text style={styles.enRutaSub}>
                    Esperando confirmación física del profesor o auxiliar en la sede para marcarse como COMPLETADO.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.btnAction, { backgroundColor: '#2563eb', width: '100%' }]}
                onPress={() => router.push({
                  pathname: '/delivery',
                  params: {
                    pedido_id: item.id.toString(),
                    sede_id: item.sedes?.id ? item.sedes.id.toString() : '',
                    sede_nombre: item.sedes?.nombre || '',
                    agua_solicitada: (item.agua_solicitada ?? 0).toString(),
                    gatorade_solicitada: (item.gatorade_solicitada ?? 0).toString(),
                    solicitado_por: item.solicitado_por || '',
                    urgencia: item.urgencia || 'MEDIA',
                    notas: item.notas || ''
                  }
                })}
              >
                <Truck color="white" size={17} />
                <Text style={styles.btnActionText}>📦 Despachar Refuerzo / Complemento</Text>
              </TouchableOpacity>
            </View>
          )}

          {item.estado === 'COMPLETADO' && (
            <View style={styles.completedBadgeBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <CheckCircle color="#10b981" size={16} />
                <Text style={styles.completedText}>Pedido Atendido y Confirmado en Sede</Text>
              </View>
              {item.atendido_por && (
                <Text style={[styles.completedSub, { color: theme.textMuted }]}>
                  {item.atendido_por} {item.fecha_atencion ? `• ${new Date(item.fecha_atencion).toLocaleDateString()}` : ''}
                </Text>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Bandeja de Pedidos</Text>
        <Text style={[styles.headerSub, { color: theme.textMuted }]}>
          Requerimientos de reposición enviados por las sedes
        </Text>
      </View>

      {/* Filtros */}
      <View style={styles.filterRow}>
        {(['PENDIENTE', 'EN_RUTA', 'COMPLETADO', 'TODOS'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterChip,
              filtro === f && { backgroundColor: theme.primary, borderColor: theme.primary }
            ]}
            onPress={() => setFiltro(f)}
          >
            <Text style={[styles.filterChipText, filtro === f && { color: 'white', fontFamily: fonts.bold }]}>
              {f === 'PENDIENTE' ? 'Pendientes' : f === 'EN_RUTA' ? 'En Ruta' : f === 'COMPLETADO' ? 'Listos' : 'Todos'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={pedidos}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Inbox color="#cbd5e1" size={48} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>Sin pedidos en esta bandeja</Text>
              <Text style={[styles.emptySub, { color: theme.textMuted }]}>Las sedes no tienen solicitudes en este estado.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 10 },
  headerTitle: { fontSize: 26, fontFamily: fonts.extraBold },
  headerSub: { fontSize: 13, fontFamily: fonts.regular, marginTop: 2 },

  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  filterChipText: { fontSize: 13, fontFamily: fonts.medium, color: '#64748b' },

  list: { paddingHorizontal: 20, paddingBottom: 30 },

  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  sedeBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sedeName: { fontSize: 16, fontFamily: fonts.bold },
  urgencyBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  urgencyText: { fontSize: 11, fontFamily: fonts.bold },

  requesterText: { fontSize: 12, fontFamily: fonts.regular, marginBottom: 10 },

  qtyRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  qtyChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  qtyChipText: { fontSize: 13, fontFamily: fonts.bold, color: '#334155' },

  notesText: { fontSize: 13, fontStyle: 'italic', marginBottom: 12 },

  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btnAction: { flex: 1, height: 44, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  btnActionText: { color: 'white', fontFamily: fonts.bold, fontSize: 13 },

  enRutaNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#eff6ff',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe'
  },
  enRutaTitle: { fontSize: 12, fontFamily: fonts.bold, color: '#1e40af' },
  enRutaSub: { fontSize: 11, fontFamily: fonts.regular, color: '#3b82f6', marginTop: 2 },

  completedBadgeBox: { paddingVertical: 4 },
  completedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  completedText: { color: '#10b981', fontFamily: fonts.bold, fontSize: 13 },
  completedSub: { fontSize: 11, fontFamily: fonts.regular, marginTop: 3, marginLeft: 22 },

  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyTitle: { fontSize: 16, fontFamily: fonts.bold, marginTop: 12 },
  emptySub: { fontSize: 13, fontFamily: fonts.regular, marginTop: 4, textAlign: 'center' }
});
