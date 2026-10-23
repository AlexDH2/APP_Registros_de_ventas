import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DollarSign, Smartphone, Droplets, Zap, CalendarDays, Download } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

type Resumen = {
  total: number;
  yape: number;
  plin: number;
  transferencia: number;
  efectivo: number;
  agua: number;
  gatorade: number;
};

export default function SummaryScreen() {
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [fechas] = useState<Date[]>(() => {
    const dates = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d);
    }
    return dates;
  });
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date>(new Date());
  const [exporting, setExporting] = useState(false);

  const fetchSummary = async (date: Date) => {
    setLoading(true);
    setFechaSeleccionada(date);
    try {
      const savedSedeId = await AsyncStorage.getItem('sede_id');
      const sedeId = parseInt(savedSedeId || '0');

      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('ventas')
        .select('*')
        .eq('sede_id', sedeId)
        .gte('fecha', start.toISOString())
        .lte('fecha', end.toISOString())
        .neq('estado', 'ANULADA');

      if (error) throw error;

      const res = { total: 0, yape: 0, plin: 0, transferencia: 0, efectivo: 0, agua: 0, gatorade: 0 };
      
      data?.forEach(v => {
        const m = Number(v.monto) || 0;
        res.total += m;
        if (v.metodo_pago === 'Yape') res.yape += m;
        if (v.metodo_pago === 'Plin') res.plin += m;
        if (v.metodo_pago === 'Transferencia') res.transferencia += m;
        if (v.metodo_pago === 'Efectivo') res.efectivo += m;
        
        res.agua += Number(v.agua_vendida) || 0;
        res.gatorade += Number(v.gatorade_vendida) || 0;
      });

      setResumen(res);
    } catch {
      Alert.alert('Error', 'No se pudo cargar el resumen');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary(fechas[0]);
  }, []);

  const formatearFecha = (d: Date) => {
    return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const exportCSV = async () => {
    setExporting(true);
    try {
      const savedSedeId = await AsyncStorage.getItem('sede_id');
      const sedeId = parseInt(savedSedeId || '0');

      // Descargamos TODAS las ventas de la quincena para exportarlas
      const start = new Date(fechas[fechas.length - 1]);
      start.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('ventas')
        .select('*')
        .eq('sede_id', sedeId)
        .gte('fecha', start.toISOString())
        .order('fecha', { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) return Alert.alert('Aviso', 'No hay datos para exportar.');

      // Crear CSV
      let csvString = 'Fecha,Hora,Metodo de Pago,Vendedor,Estado,Monto,Agua (Unidades),Gatorade (Unidades)\n';
      
      data.forEach(v => {
        const d = new Date(v.fecha);
        const fechaFormat = d.toLocaleDateString();
        const horaFormat = d.toLocaleTimeString();
        csvString += `${fechaFormat},${horaFormat},${v.metodo_pago},${v.vendedor},${v.estado},${v.monto},${v.agua_vendida},${v.gatorade_vendida}\n`;
      });

      const fileName = `Reporte_Ventas_${Date.now()}.csv`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Exportar Reporte' });
      } else {
        Alert.alert('Error', 'Compartir archivos no está disponible en este dispositivo');
      }
    } catch (e: any) {
      Alert.alert('Error', 'No se pudo generar el reporte.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Resumen de Caja</Text>
          <Text style={styles.subtitle}>Selecciona un día para ver los ingresos</Text>
        </View>
        <TouchableOpacity style={styles.exportBtn} onPress={exportCSV} disabled={exporting}>
          {exporting ? <ActivityIndicator color="#10b981" /> : <Download color="#10b981" size={24} />}
        </TouchableOpacity>
      </View>

      <View style={styles.dateSelectorContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateSelector}>
          {fechas.map((fecha, idx) => {
            const isSelected = fecha.toDateString() === fechaSeleccionada.toDateString();
            return (
              <TouchableOpacity
                key={idx}
                style={[styles.dateBtn, isSelected && styles.dateBtnActive]}
                onPress={() => fetchSummary(fecha)}
              >
                <CalendarDays color={isSelected ? "white" : "#64748b"} size={20} />
                <Text style={[styles.dateText, isSelected && styles.dateTextActive]}>
                  {idx === 0 ? 'Hoy' : formatearFecha(fecha)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.totalCard}>
            <View style={styles.totalIconBox}>
              <DollarSign color="#2563eb" size={32} />
            </View>
            <Text style={styles.totalLabel}>Ingresos del Día</Text>
            <Text style={styles.totalAmount}>S/ {resumen?.total.toFixed(2)}</Text>
          </View>

          <Text style={styles.sectionTitle}>Por Método de Pago</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#7e22ce' }]}><Smartphone color="white" size={20}/></View>
              <Text style={styles.statLabel}>Yape</Text>
              <Text style={styles.statValue}>S/ {resumen?.yape.toFixed(2)}</Text>
            </View>
            
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#0ea5e9' }]}><Smartphone color="white" size={20}/></View>
              <Text style={styles.statLabel}>Plin</Text>
              <Text style={styles.statValue}>S/ {resumen?.plin.toFixed(2)}</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#10b981' }]}><Smartphone color="white" size={20}/></View>
              <Text style={styles.statLabel}>Transf.</Text>
              <Text style={styles.statValue}>S/ {resumen?.transferencia.toFixed(2)}</Text>
            </View>
            
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#f59e0b' }]}><DollarSign color="white" size={20}/></View>
              <Text style={styles.statLabel}>Efectivo</Text>
              <Text style={styles.statValue}>S/ {resumen?.efectivo.toFixed(2)}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Bebidas Vendidas</Text>
          <View style={styles.drinksContainer}>
            <View style={styles.drinkRow}>
              <View style={styles.drinkInfo}>
                <View style={[styles.drinkIcon, { backgroundColor: '#e0f2fe' }]}><Droplets color="#0ea5e9" size={24}/></View>
                <Text style={styles.drinkName}>Agua Mineral</Text>
              </View>
              <Text style={styles.drinkValue}>{resumen?.agua} un.</Text>
            </View>
            <View style={styles.drinkDivider} />
            <View style={styles.drinkRow}>
              <View style={styles.drinkInfo}>
                <View style={[styles.drinkIcon, { backgroundColor: '#fef3c7' }]}><Zap color="#d97706" size={24}/></View>
                <Text style={styles.drinkName}>Gatorade</Text>
              </View>
              <Text style={styles.drinkValue}>{resumen?.gatorade} un.</Text>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 15, color: '#64748b', marginTop: 5 },
  exportBtn: { backgroundColor: '#ecfdf5', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#d1fae5' },
  
  dateSelectorContainer: { height: 60, marginBottom: 10 },
  dateSelector: { paddingHorizontal: 20, alignItems: 'center', gap: 10 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 45, borderRadius: 12, backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', gap: 8 },
  dateBtnActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  dateText: { color: '#64748b', fontWeight: '600', textTransform: 'capitalize' },
  dateTextActive: { color: 'white' },
  
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20, paddingBottom: 40 },
  
  totalCard: { backgroundColor: '#ffffff', borderRadius: 24, padding: 25, alignItems: 'center', shadowColor: '#64748b', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 4, marginBottom: 30 },
  totalIconBox: { backgroundColor: '#eff6ff', padding: 15, borderRadius: 50, marginBottom: 15 },
  totalLabel: { fontSize: 16, color: '#64748b', fontWeight: '600', marginBottom: 5 },
  totalAmount: { fontSize: 40, fontWeight: '900', color: '#0f172a' },
  
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#334155', marginBottom: 15 },
  
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15, marginBottom: 30 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: 'white', padding: 20, borderRadius: 20, shadowColor: '#64748b', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  statIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  statLabel: { fontSize: 14, color: '#64748b', fontWeight: '600', marginBottom: 5 },
  statValue: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  
  drinksContainer: { backgroundColor: 'white', borderRadius: 20, padding: 20, shadowColor: '#64748b', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  drinkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  drinkInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  drinkIcon: { width: 45, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  drinkName: { fontSize: 16, fontWeight: '600', color: '#334155' },
  drinkValue: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  drinkDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 15 }
});
