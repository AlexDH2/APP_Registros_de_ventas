import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  useColorScheme
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors, fonts } from '../../theme';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
  Download,
  Building2,
  DollarSign,
  Droplets,
  Zap,
  TrendingUp,
  Search,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react-native';

type Sede = {
  id: number;
  nombre: string;
};

type VentaItem = {
  id: number;
  fecha: string;
  monto: number;
  metodo_pago: string;
  vendedor: string;
  estado: string;
  motivo_anulacion?: string;
  agua_vendida: number;
  gatorade_vendida: number;
  sede_id: number;
  sedes?: any;
};

export default function VentasPorSedesScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? colors.dark : colors.light;

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [selectedSedeId, setSelectedSedeId] = useState<number | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'HOY' | '7DIAS' | 'MES' | 'TODO'>('HOY');
  const [ventas, setVentas] = useState<VentaItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadSedesAndSales();
    }, [selectedSedeId, selectedPeriod])
  );

  const loadSedesAndSales = async () => {
    setLoading(true);
    try {
      if (sedes.length === 0) {
        const { data: sedesData } = await supabase.from('sedes').select('id, nombre').order('id');
        if (sedesData) setSedes(sedesData);
      }

      let dateFilter: Date | null = new Date();
      if (selectedPeriod === 'HOY') {
        dateFilter.setHours(0, 0, 0, 0);
      } else if (selectedPeriod === '7DIAS') {
        dateFilter.setDate(dateFilter.getDate() - 7);
        dateFilter.setHours(0, 0, 0, 0);
      } else if (selectedPeriod === 'MES') {
        dateFilter.setDate(dateFilter.getDate() - 30);
        dateFilter.setHours(0, 0, 0, 0);
      } else {
        dateFilter = null;
      }

      let query = supabase
        .from('ventas')
        .select('id, fecha, monto, metodo_pago, vendedor, estado, motivo_anulacion, agua_vendida, gatorade_vendida, sede_id, sedes(nombre)')
        .order('fecha', { ascending: false });

      if (selectedSedeId !== null) {
        query = query.eq('sede_id', selectedSedeId);
      }

      if (dateFilter) {
        query = query.gte('fecha', dateFilter.toISOString());
      }

      const { data, error } = await query.limit(200);
      if (error) {
        // Fallback por si la columna motivo_anulacion aún se propaga en el esquema
        const { data: fbData, error: fbError } = await supabase
          .from('ventas')
          .select('id, fecha, monto, metodo_pago, vendedor, estado, agua_vendida, gatorade_vendida, sede_id, sedes(nombre)')
          .order('fecha', { ascending: false })
          .limit(200);
        if (fbError) throw fbError;
        setVentas(fbData || []);
      } else {
        setVentas(data || []);
      }

    } catch (e) {
      console.log('Error loading ventas por sedes:', e);
      Alert.alert('Error', 'No se pudieron cargar las ventas');
    } finally {
      setLoading(false);
    }
  };

  // Neutralidad de datos: las ventas ANULADAS no incrementan ganancia ni disminuyen material
  const ventasActivas = ventas.filter(v => v.estado !== 'ANULADA');
  const totalRecaudado = ventasActivas.reduce((acc, curr) => acc + (Number(curr.monto) || 0), 0);
  const totalAgua = ventasActivas.reduce((acc, curr) => acc + (Number(curr.agua_vendida) || 0), 0);
  const totalGatorade = ventasActivas.reduce((acc, curr) => acc + (Number(curr.gatorade_vendida) || 0), 0);
  const totalTickets = ventasActivas.length;

  const handleExportExcel = async () => {
    if (ventas.length === 0) {
      return Alert.alert('Aviso', 'No hay ventas registradas para exportar en el filtro actual.');
    }

    setExporting(true);
    try {
      let csv = '\uFEFFTicket ID,Sede,Fecha,Hora,Vendedor,Metodo de Pago,Monto (S/),Agua (Und),Gatorade (Und),Estado\n';

      ventas.forEach((v) => {
        const d = new Date(v.fecha);
        const fechaStr = d.toLocaleDateString();
        const horaStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const sedeNombre = Array.isArray(v.sedes) ? (v.sedes[0]?.nombre || `Sede #${v.sede_id}`) : (v.sedes?.nombre || `Sede #${v.sede_id}`);
        const vendedorStr = (v.vendedor || 'Vendedor').replace(/,/g, ' ');
        const metodoStr = (v.metodo_pago || 'Efectivo').replace(/,/g, ' ');
        const estadoStr = (v.estado || 'COMPLETADA').replace(/,/g, ' ');

        csv += `"${v.id}","${sedeNombre}","${fechaStr}","${horaStr}","${vendedorStr}","${metodoStr}","${Number(v.monto).toFixed(2)}","${v.agua_vendida || 0}","${v.gatorade_vendida || 0}","${estadoStr}"\n`;
      });

      const sedeTag = selectedSedeId 
        ? (sedes.find(s => s.id === selectedSedeId)?.nombre.replace(/\s+/g, '_') || 'Sede') 
        : 'Todas_Las_Sedes';
      const fileName = `Ventas_${sedeTag}_${Date.now()}.csv`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Descargar / Compartir Registro de Ventas (Excel)',
          UTI: 'public.comma-separated-values-text'
        });
      } else {
        Alert.alert('Aviso', `Archivo guardado en: ${fileUri}`);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo generar el reporte en Excel.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Selector de Período */}
      <View style={styles.periodRow}>
        {(['HOY', '7DIAS', 'MES', 'TODO'] as const).map((period) => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodChip,
              selectedPeriod === period && styles.periodChipActive
            ]}
            onPress={() => setSelectedPeriod(period)}
          >
            <Text
              style={[
                styles.periodChipText,
                selectedPeriod === period && styles.periodChipTextActive
              ]}
            >
              {period === 'HOY' ? 'Hoy' : period === '7DIAS' ? '7 Días' : period === 'MES' ? '30 Días' : 'Todo'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Selector Horizontal de Sedes */}
      <View style={styles.sedeFilterWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sedeFilterScroll}>
          <TouchableOpacity
            style={[
              styles.sedeChip,
              selectedSedeId === null && styles.sedeChipActive
            ]}
            onPress={() => setSelectedSedeId(null)}
          >
            <Building2 color={selectedSedeId === null ? 'white' : '#64748b'} size={15} />
            <Text style={[styles.sedeChipText, selectedSedeId === null && styles.sedeChipTextActive]}>
              Todas las Sedes
            </Text>
          </TouchableOpacity>

          {sedes.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[
                styles.sedeChip,
                selectedSedeId === s.id && styles.sedeChipActive
              ]}
              onPress={() => setSelectedSedeId(s.id)}
            >
              <Text style={[styles.sedeChipText, selectedSedeId === s.id && styles.sedeChipTextActive]}>
                {s.nombre}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Resumen KPIs Card */}
        <View style={styles.kpiCard}>
          <View style={styles.kpiTopRow}>
            <View>
              <Text style={styles.kpiLabel}>Total Recaudado</Text>
              <Text style={styles.kpiTotal}>S/ {totalRecaudado.toFixed(2)}</Text>
            </View>
            <View style={styles.ticketBadge}>
              <TrendingUp color="#10b981" size={16} />
              <Text style={styles.ticketBadgeText}>{totalTickets} ventas</Text>
            </View>
          </View>

          <View style={styles.kpiGrid}>
            <View style={styles.kpiItem}>
              <Droplets color="#38bdf8" size={20} />
              <Text style={styles.kpiItemVal}>{totalAgua}</Text>
              <Text style={styles.kpiItemLbl}>Aguas</Text>
            </View>
            <View style={styles.kpiItem}>
              <Zap color="#f59e0b" size={20} />
              <Text style={styles.kpiItemVal}>{totalGatorade}</Text>
              <Text style={styles.kpiItemLbl}>Gatorades</Text>
            </View>
          </View>

          {/* Botón Descargar Excel */}
          <TouchableOpacity
            style={styles.btnExcel}
            onPress={handleExportExcel}
            disabled={exporting}
            activeOpacity={0.8}
          >
            {exporting ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Download color="white" size={20} />
                <Text style={styles.btnExcelText}>Descargar en Excel (.CSV)</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Encabezado de la lista */}
        <View style={styles.listHeaderRow}>
          <Text style={[styles.listHeaderTitle, { color: theme.text }]}>
            Detalle de Ventas ({ventas.length})
          </Text>
          <Text style={[styles.listHeaderSub, { color: theme.textMuted }]}>
            {selectedSedeId ? sedes.find(s => s.id === selectedSedeId)?.nombre : 'Consolidado general'}
          </Text>
        </View>

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={{ marginTop: 10, color: '#64748b' }}>Cargando ventas...</Text>
          </View>
        ) : ventas.length === 0 ? (
          <View style={styles.emptyBox}>
            <Search color="#94a3b8" size={40} />
            <Text style={styles.emptyTitle}>Sin ventas en este período</Text>
            <Text style={styles.emptySubtitle}>No hay registros para la sede y rango seleccionado.</Text>
          </View>
        ) : (
          ventas.map((v) => {
            const fechaD = new Date(v.fecha);
            const isYape = v.metodo_pago === 'Yape';
            const isPlin = v.metodo_pago === 'Plin';
            const isEfectivo = v.metodo_pago === 'Efectivo';
            const isAnulada = v.estado === 'ANULADA';
            const isSolicitada = v.estado === 'SOLICITADA_ANULACION';

            return (
              <View 
                key={v.id} 
                style={[
                  styles.ventaCard, 
                  isAnulada && styles.ventaCardAnulada,
                  isSolicitada && styles.ventaCardSolicitada
                ]}
              >
                <View style={styles.ventaCardHeader}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.ventaSede}>
                      {Array.isArray(v.sedes) ? (v.sedes[0]?.nombre || `Sede #${v.sede_id}`) : (v.sedes?.nombre || `Sede #${v.sede_id}`)}
                    </Text>
                    <Text style={styles.ventaFecha}>
                      {fechaD.toLocaleDateString()} • {fechaD.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.ventaMonto, isAnulada && styles.ventaMontoAnulada]}>
                      S/ {Number(v.monto).toFixed(2)}
                    </Text>
                    {isAnulada && (
                      <Text style={styles.ventaMontoNetoCero}>S/ 0.00 neto</Text>
                    )}
                  </View>
                </View>

                {/* Badges de Estado */}
                <View style={styles.estadoRow}>
                  {isAnulada && (
                    <View style={styles.badgeAnulada}>
                      <XCircle color="#b91c1c" size={12} />
                      <Text style={styles.badgeAnuladaText}>VENTA ANULADA</Text>
                    </View>
                  )}
                  {isSolicitada && (
                    <View style={styles.badgeSolicitada}>
                      <Clock color="#b45309" size={12} />
                      <Text style={styles.badgeSolicitadaText}>SOLICITUD DE ANULACIÓN</Text>
                    </View>
                  )}
                  {!isAnulada && !isSolicitada && (
                    <View style={styles.badgeCompletada}>
                      <CheckCircle color="#15803d" size={12} />
                      <Text style={styles.badgeCompletadaText}>VENTA REALIZADA</Text>
                    </View>
                  )}
                </View>

                {/* Motivo escrito para Anulada o Solicitada */}
                {(isAnulada || isSolicitada) && v.motivo_anulacion && (
                  <View style={[styles.motivoRow, isAnulada ? styles.motivoRowAnulada : styles.motivoRowSolicitada]}>
                    <Text style={isAnulada ? styles.motivoTitleAnulada : styles.motivoTitleSolicitada}>
                      {isAnulada ? 'Motivo de anulación:' : 'Motivo de solicitud:'}
                    </Text>
                    <Text style={styles.motivoTextAdmin}>"{v.motivo_anulacion}"</Text>
                  </View>
                )}

                <View style={styles.ventaCardFooter}>
                  <View style={styles.ventaBadgesRow}>
                    <View style={[
                      styles.metodoBadge,
                      isYape ? { backgroundColor: '#701a75' } :
                      isPlin ? { backgroundColor: '#0284c7' } :
                      isEfectivo ? { backgroundColor: '#15803d' } : { backgroundColor: '#475569' }
                    ]}>
                      <Text style={styles.metodoText}>{v.metodo_pago}</Text>
                    </View>

                    {v.agua_vendida > 0 && (
                      <View style={[styles.itemBadge, isAnulada && styles.itemBadgeAnulado]}>
                        <Droplets color={isAnulada ? "#94a3b8" : "#0284c7"} size={13} />
                        <Text style={[styles.itemBadgeText, isAnulada && styles.itemBadgeTextAnulado]}>
                          {v.agua_vendida} Agua {isAnulada ? '(Reintegrada)' : ''}
                        </Text>
                      </View>
                    )}

                    {v.gatorade_vendida > 0 && (
                      <View style={[styles.itemBadge, isAnulada && styles.itemBadgeAnulado]}>
                        <Zap color={isAnulada ? "#94a3b8" : "#d97706"} size={13} />
                        <Text style={[styles.itemBadgeText, isAnulada && styles.itemBadgeTextAnulado]}>
                          {v.gatorade_vendida} Gat. {isAnulada ? '(Reintegrada)' : ''}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.ventaVendedor}>Por: {v.vendedor || 'Vendedor'}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 60 },

  periodRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, gap: 8 },
  periodChip: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: '#e2e8f0', alignItems: 'center' },
  periodChipActive: { backgroundColor: '#2563eb' },
  periodChipText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  periodChipTextActive: { color: 'white' },

  sedeFilterWrapper: { borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 10 },
  sedeFilterScroll: { paddingHorizontal: 16, gap: 8 },
  sedeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  sedeChipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  sedeChipText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  sedeChipTextActive: { color: 'white' },

  kpiCard: { backgroundColor: '#0f172a', borderRadius: 20, padding: 18, marginTop: 14, marginBottom: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  kpiTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  kpiLabel: { color: '#94a3b8', fontSize: 13, fontWeight: '500' },
  kpiTotal: { color: 'white', fontSize: 30, fontWeight: '900', marginTop: 2 },
  ticketBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  ticketBadgeText: { color: '#10b981', fontSize: 13, fontWeight: '700' },

  kpiGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  kpiItem: { flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 14, padding: 12, alignItems: 'center' },
  kpiItemVal: { color: 'white', fontSize: 20, fontWeight: '800', marginVertical: 2 },
  kpiItemLbl: { color: '#cbd5e1', fontSize: 11, fontWeight: '500' },

  btnExcel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#10b981', paddingVertical: 14, borderRadius: 14 },
  btnExcelText: { color: 'white', fontSize: 15, fontWeight: 'bold' },

  listHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  listHeaderTitle: { fontSize: 18, fontWeight: '800' },
  listHeaderSub: { fontSize: 13, fontWeight: '500' },

  centerLoading: { paddingVertical: 40, alignItems: 'center' },
  emptyBox: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#334155', marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 4 },

  ventaCard: { backgroundColor: 'white', borderRadius: 16, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#64748b', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 5, elevation: 1 },
  ventaCardAnulada: { backgroundColor: '#f8fafc', borderColor: '#fca5a5', opacity: 0.85 },
  ventaCardSolicitada: { backgroundColor: '#fffdf5', borderColor: '#fde68a' },
  ventaCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  ventaSede: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  ventaFecha: { fontSize: 12, color: '#64748b', marginTop: 2 },
  ventaMonto: { fontSize: 18, fontWeight: '900', color: '#10b981' },
  ventaMontoAnulada: { color: '#94a3b8', textDecorationLine: 'line-through' },
  ventaMontoNetoCero: { fontSize: 10, color: '#ef4444', fontWeight: '700', marginTop: 1 },

  estadoRow: { flexDirection: 'row', marginBottom: 8 },
  badgeAnulada: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fee2e2', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  badgeAnuladaText: { color: '#b91c1c', fontSize: 10, fontWeight: 'bold' },
  badgeSolicitada: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fef3c7', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  badgeSolicitadaText: { color: '#b45309', fontSize: 10, fontWeight: 'bold' },
  badgeCompletada: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#dcfce7', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  badgeCompletadaText: { color: '#15803d', fontSize: 10, fontWeight: 'bold' },

  motivoRow: { padding: 8, borderRadius: 8, marginBottom: 8 },
  motivoRowAnulada: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
  motivoRowSolicitada: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fef3c7' },
  motivoTitleAnulada: { fontSize: 11, fontWeight: 'bold', color: '#b91c1c' },
  motivoTitleSolicitada: { fontSize: 11, fontWeight: 'bold', color: '#b45309' },
  motivoTextAdmin: { fontSize: 12, color: '#475569', fontStyle: 'italic', marginTop: 2 },

  ventaCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 },
  ventaBadgesRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1 },
  metodoBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  metodoText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  itemBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f8fafc', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  itemBadgeAnulado: { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' },
  itemBadgeText: { fontSize: 11, fontWeight: '600', color: '#334155' },
  itemBadgeTextAnulado: { color: '#94a3b8' },
  ventaVendedor: { fontSize: 11, color: '#64748b', fontWeight: '500', marginLeft: 8 }
});
