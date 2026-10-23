import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { Truck, MapPin, Image as ImageIcon, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react-native';

export default function AdminLogisticsScreen() {
  const [entregas, setEntregas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('entregas')
        .select(`
          id, fecha, agua_entregada, gatorade_entregada, url_foto, descripcion,
          condicion_envio, agua_solicitada, gatorade_solicitada, agua_diferencia, gatorade_diferencia, motivo_condicion,
          sedes (nombre)
        `)
        .order('fecha', { ascending: false });

      if (error) {
        // Fallback defensivo si columnas aún no están en la tabla
        const { data: fallbackData } = await supabase
          .from('entregas')
          .select(`id, fecha, agua_entregada, gatorade_entregada, url_foto, descripcion, sedes (nombre)`)
          .order('fecha', { ascending: false });
        setEntregas(fallbackData || []);
      } else {
        setEntregas(data || []);
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo cargar el historial logístico');
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isExtra = item.condicion_envio === 'CON_EXTRA' || (item.descripcion && item.descripcion.includes('[EXTRA'));
    const isParcial = item.condicion_envio === 'PARCIAL' || (item.descripcion && item.descripcion.includes('[PARCIAL'));
    const isCompleto = item.condicion_envio === 'COMPLETO' || (item.descripcion && item.descripcion.includes('[COMPLETO'));

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.sedeBadge}>
            <MapPin color="#2563eb" size={16} />
            <Text style={styles.sedeText}>{item.sedes?.nombre || 'Sede'}</Text>
          </View>
          <Text style={styles.dateText}>
            {new Date(item.fecha).toLocaleDateString()} {new Date(item.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        {/* Badge de Condición */}
        {isExtra && (
          <View style={[styles.condBadge, { backgroundColor: '#f5f3ff', borderColor: '#ddd6fe' }]}>
            <Sparkles color="#7c3aed" size={14} />
            <Text style={[styles.condBadgeText, { color: '#6d28d9' }]}>
              🎁 Con Material Extra ({item.agua_diferencia > 0 ? `+${item.agua_diferencia} Agua ` : ''}{item.gatorade_diferencia > 0 ? `+${item.gatorade_diferencia} Gat` : ''})
            </Text>
          </View>
        )}

        {isParcial && (
          <View style={[styles.condBadge, { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]}>
            <AlertCircle color="#d97706" size={14} />
            <Text style={[styles.condBadgeText, { color: '#b45309' }]}>
              ⚠️ Despacho Parcial ({item.agua_diferencia > 0 ? `Faltan -${item.agua_diferencia} Agua ` : ''}{item.gatorade_diferencia > 0 ? `Faltan -${item.gatorade_diferencia} Gat` : ''})
            </Text>
          </View>
        )}

        {isCompleto && (
          <View style={[styles.condBadge, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }]}>
            <CheckCircle2 color="#059669" size={14} />
            <Text style={[styles.condBadgeText, { color: '#047857' }]}>
              ✅ Despacho 100% Completo
            </Text>
          </View>
        )}

        {item.descripcion && (
          <Text style={styles.descText}>
            {item.descripcion}
          </Text>
        )}

        {item.motivo_condicion && (
          <Text style={styles.motivoText}>
            💬 Motivo: "{item.motivo_condicion}"
          </Text>
        )}

        <View style={styles.itemsRow}>
          <View style={styles.itemBox}>
            <Text style={styles.itemLabel}>Agua</Text>
            <Text style={styles.itemValue}>+{item.agua_entregada}</Text>
          </View>
          <View style={styles.itemBox}>
            <Text style={styles.itemLabel}>Gatorade</Text>
            <Text style={styles.itemValue}>+{item.gatorade_entregada}</Text>
          </View>
        </View>

        {item.url_foto && (
          <TouchableOpacity style={styles.btnFoto} onPress={() => Linking.openURL(item.url_foto)}>
            <ImageIcon color="#10b981" size={20} />
            <Text style={styles.btnFotoText}>Ver Constancia Fotográfica</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Auditoría Logística</Text>
        <Text style={styles.subtitle}>Historial de abastecimiento a sedes</Text>
      </View>

      {loading ? <ActivityIndicator size="large" color="#0f172a" style={{ marginTop: 50 }} /> : (
        <FlatList
          data={entregas}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Truck color="#cbd5e1" size={50} />
              <Text style={styles.emptyText}>No hay entregas registradas.</Text>
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
  sedeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, gap: 5 },
  sedeText: { color: '#2563eb', fontWeight: 'bold' },
  dateText: { color: '#64748b', fontSize: 13 },
  itemsRow: { flexDirection: 'row', gap: 15, marginBottom: 15 },
  itemBox: { flex: 1, backgroundColor: '#f8fafc', padding: 15, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  itemLabel: { fontSize: 14, color: '#64748b', fontWeight: 'bold' },
  itemValue: { fontSize: 24, fontWeight: '900', color: '#0f172a', marginTop: 5 },
  btnFoto: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#ecfdf5', padding: 12, borderRadius: 12, gap: 8, borderWidth: 1, borderColor: '#d1fae5' },
  btnFotoText: { color: '#10b981', fontWeight: 'bold' },
  empty: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#94a3b8', marginTop: 10, fontSize: 16 },

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
    fontWeight: 'bold',
  },
  descText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
    marginBottom: 6,
  },
  motivoText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#64748b',
    marginBottom: 8,
  },
});
