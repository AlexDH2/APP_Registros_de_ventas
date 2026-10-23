import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  useColorScheme
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors, fonts } from '../../theme';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Droplets,
  Zap,
  MapPin,
  Trash2,
  Hourglass
} from 'lucide-react-native';

type SedeMetric = {
  id: number;
  nombre: string;
  stockAgua: number;
  stockGatorade: number;
  consumoDiarioAgua: number;
  consumoDiarioGatorade: number;
  diasAutonomiaAgua: number;
  diasAutonomiaGatorade: number;
};

export default function MetricasLogisticaScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? colors.dark : colors.light;

  const [loading, setLoading] = useState(true);
  const [metricas, setMetricas] = useState<SedeMetric[]>([]);
  const [resumenMermas, setResumenMermas] = useState<{ roturas: number; vencimientos: number; cortesias: number; total: number }>({
    roturas: 0,
    vencimientos: 0,
    cortesias: 0,
    total: 0
  });

  useFocusEffect(
    useCallback(() => {
      calcularMetricas();
    }, [])
  );

  const calcularMetricas = async () => {
    setLoading(true);
    try {
      // 1. Obtener sedes
      const { data: sedes } = await supabase.from('sedes').select('id, nombre');
      if (!sedes) return;

      // 2. Obtener inventario actual por sede
      const { data: inventarios } = await supabase.from('inventario_bebidas').select('*');

      // 3. Obtener ventas de los últimos 14 días
      const hace14Dias = new Date();
      hace14Dias.setDate(hace14Dias.getDate() - 14);

      const { data: ventas } = await supabase
        .from('ventas')
        .select('sede_id, agua_vendida, gatorade_vendida, estado')
        .gte('fecha', hace14Dias.toISOString())
        .neq('estado', 'ANULADA');

      // 4. Obtener mermas
      const { data: mermas } = await supabase.from('mermas').select('tipo, agua_cantidad, gatorade_cantidad');

      let r = 0;
      let v = 0;
      let c = 0;
      mermas?.forEach((m) => {
        const qty = (m.agua_cantidad || 0) + (m.gatorade_cantidad || 0);
        if (m.tipo === 'ROTURA' || m.tipo === 'DEFECTO') r += qty;
        else if (m.tipo === 'VENCIMIENTO') v += qty;
        else if (m.tipo === 'CORTESIA') c += qty;
      });
      setResumenMermas({ roturas: r, vencimientos: v, cortesias: c, total: r + v + c });

      // 5. Procesar métricas por sede
      const metricasProcesadas: SedeMetric[] = sedes.map((sede) => {
        const inv = inventarios?.find((i) => i.sede_id === sede.id);
        const stockA = inv?.agua_cantidad || 0;
        const stockG = inv?.gatorade_cantidad || 0;

        const ventasSede = ventas?.filter((vt) => vt.sede_id === sede.id) || [];
        const totalAgua14 = ventasSede.reduce((acc, curr) => acc + (curr.agua_vendida || 0), 0);
        const totalGatorade14 = ventasSede.reduce((acc, curr) => acc + (curr.gatorade_vendida || 0), 0);

        // Promedio diario (mínimo 0.5 para no dividir por 0)
        const diarioAgua = totalAgua14 / 14;
        const diarioGatorade = totalGatorade14 / 14;

        const diasA = diarioAgua > 0 ? Math.round(stockA / diarioAgua) : stockA > 0 ? 30 : 0;
        const diasG = diarioGatorade > 0 ? Math.round(stockG / diarioGatorade) : stockG > 0 ? 30 : 0;

        return {
          id: sede.id,
          nombre: sede.nombre,
          stockAgua: stockA,
          stockGatorade: stockG,
          consumoDiarioAgua: Number(diarioAgua.toFixed(1)),
          consumoDiarioGatorade: Number(diarioGatorade.toFixed(1)),
          diasAutonomiaAgua: diasA,
          diasAutonomiaGatorade: diasG
        };
      });

      setMetricas(metricasProcesadas);
    } catch (e) {
      console.log('Error calculando métricas logísticas:', e);
      Alert.alert('Error', 'No se pudieron calcular las métricas predictivas.');
    } finally {
      setLoading(false);
    }
  };

  const dynamicStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    card: {
      backgroundColor: theme.card,
      borderRadius: 22,
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

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Logística Predictiva</Text>
        <Text style={[styles.headerSub, { color: theme.textMuted }]}>
          Monitoreo de consumo y proyección de stock por sede
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 50 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Tarjeta Resumen Mermas */}
          <View style={[dynamicStyles.card, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
            <View style={styles.mermaHeader}>
              <Trash2 color="#ef4444" size={20} />
              <Text style={styles.mermaTitle}>Resumen de Pérdidas y Bajas</Text>
            </View>
            <View style={styles.mermaStatsGrid}>
              <View style={styles.mermaStatItem}>
                <Text style={styles.mermaVal}>{resumenMermas.roturas}</Text>
                <Text style={styles.mermaLbl}>Roturas / Defectos</Text>
              </View>
              <View style={styles.mermaStatItem}>
                <Text style={styles.mermaVal}>{resumenMermas.vencimientos}</Text>
                <Text style={styles.mermaLbl}>Vencimientos</Text>
              </View>
              <View style={styles.mermaStatItem}>
                <Text style={styles.mermaVal}>{resumenMermas.cortesias}</Text>
                <Text style={styles.mermaLbl}>Cortesías</Text>
              </View>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>Autonomía de Stock por Sede</Text>

          {metricas.map((m) => {
            const riesgoAgua = m.diasAutonomiaAgua <= 2;
            const riesgoGatorade = m.diasAutonomiaGatorade <= 2;
            const tieneRiesgo = riesgoAgua || riesgoGatorade;

            return (
              <View
                key={m.id}
                style={[
                  dynamicStyles.card,
                  tieneRiesgo && { borderColor: '#f59e0b', borderWidth: 1.5 }
                ]}
              >
                <View style={styles.cardHeaderRow}>
                  <View style={styles.sedeBadge}>
                    <MapPin color={theme.primary} size={16} />
                    <Text style={[styles.sedeName, { color: theme.text }]}>{m.nombre}</Text>
                  </View>

                  {tieneRiesgo ? (
                    <View style={styles.alertChip}>
                      <AlertTriangle color="#d97706" size={14} />
                      <Text style={styles.alertChipText}>Reabastecer Pronto</Text>
                    </View>
                  ) : (
                    <View style={styles.okChip}>
                      <CheckCircle color="#10b981" size={14} />
                      <Text style={styles.okChipText}>Stock Saludable</Text>
                    </View>
                  )}
                </View>

                {/* Fila Agua */}
                <View style={styles.metricRow}>
                  <View style={styles.metricItem}>
                    <View style={styles.drinkTitle}>
                      <Droplets color="#0ea5e9" size={16} />
                      <Text style={[styles.drinkName, { color: theme.text }]}>Agua Mineral</Text>
                    </View>
                    <Text style={[styles.metricDetail, { color: theme.textMuted }]}>
                      Stock: <Text style={{ fontFamily: fonts.bold, color: theme.text }}>{m.stockAgua}</Text> • Venta: {m.consumoDiarioAgua}/día
                    </Text>
                  </View>

                  <View style={[styles.autonomiaBadge, { backgroundColor: m.diasAutonomiaAgua <= 2 ? '#fee2e2' : '#ecfdf5' }]}>
                    <Hourglass color={m.diasAutonomiaAgua <= 2 ? '#ef4444' : '#10b981'} size={14} />
                    <Text style={[styles.autonomiaText, { color: m.diasAutonomiaAgua <= 2 ? '#ef4444' : '#10b981' }]}>
                      {m.diasAutonomiaAgua} días
                    </Text>
                  </View>
                </View>

                {/* Fila Gatorade */}
                <View style={[styles.metricRow, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 10, marginTop: 10 }]}>
                  <View style={styles.metricItem}>
                    <View style={styles.drinkTitle}>
                      <Zap color="#d97706" size={16} />
                      <Text style={[styles.drinkName, { color: theme.text }]}>Gatorade</Text>
                    </View>
                    <Text style={[styles.metricDetail, { color: theme.textMuted }]}>
                      Stock: <Text style={{ fontFamily: fonts.bold, color: theme.text }}>{m.stockGatorade}</Text> • Venta: {m.consumoDiarioGatorade}/día
                    </Text>
                  </View>

                  <View style={[styles.autonomiaBadge, { backgroundColor: m.diasAutonomiaGatorade <= 2 ? '#fee2e2' : '#ecfdf5' }]}>
                    <Hourglass color={m.diasAutonomiaGatorade <= 2 ? '#ef4444' : '#10b981'} size={14} />
                    <Text style={[styles.autonomiaText, { color: m.diasAutonomiaGatorade <= 2 ? '#ef4444' : '#10b981' }]}>
                      {m.diasAutonomiaGatorade} días
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 10 },
  headerTitle: { fontSize: 26, fontFamily: fonts.extraBold },
  headerSub: { fontSize: 13, fontFamily: fonts.regular, marginTop: 2 },

  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 18, fontFamily: fonts.bold, marginVertical: 12 },

  mermaHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  mermaTitle: { fontSize: 15, fontFamily: fonts.bold, color: '#ef4444' },
  mermaStatsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  mermaStatItem: { alignItems: 'center', flex: 1 },
  mermaVal: { fontSize: 22, fontFamily: fonts.extraBold, color: '#991b1b' },
  mermaLbl: { fontSize: 11, fontFamily: fonts.medium, color: '#b91c1c', marginTop: 2 },

  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sedeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sedeName: { fontSize: 17, fontFamily: fonts.bold },

  alertChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  alertChipText: { fontSize: 12, fontFamily: fonts.bold, color: '#d97706' },

  okChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ecfdf5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  okChipText: { fontSize: 12, fontFamily: fonts.bold, color: '#10b981' },

  metricRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricItem: { flex: 1 },
  drinkTitle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  drinkName: { fontSize: 14, fontFamily: fonts.bold },
  metricDetail: { fontSize: 12, fontFamily: fonts.regular },

  autonomiaBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, gap: 4 },
  autonomiaText: { fontSize: 13, fontFamily: fonts.bold }
});
