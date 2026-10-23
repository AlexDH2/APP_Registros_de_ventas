import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Lock, Unlock, DollarSign } from 'lucide-react-native';

export default function CajaScreen() {
  const [loading, setLoading] = useState(true);
  const [caja, setCaja] = useState<any>(null);
  
  const [montoApertura, setMontoApertura] = useState('');
  const [montoFisico, setMontoFisico] = useState('');
  const [ventasEfectivo, setVentasEfectivo] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkCaja();
  }, []);

  const checkCaja = async () => {
    setLoading(true);
    try {
      const sedeId = await AsyncStorage.getItem('sede_id');
      const usuarioId = await AsyncStorage.getItem('usuario_id');

      if (!sedeId || !usuarioId) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('cajas')
        .select('*')
        .eq('sede_id', parseInt(sedeId))
        .eq('usuario_id', parseInt(usuarioId))
        .eq('estado', 'ABIERTA')
        .maybeSingle();

      if (data) {
        setCaja(data);
        // Si la caja está abierta, calcular cuánto efectivo debió entrar hoy
        const { data: ventas } = await supabase
          .from('ventas')
          .select('monto')
          .eq('caja_id', data.id)
          .eq('metodo_pago', 'Efectivo')
          .neq('estado', 'ANULADA');

        let totalEfectivo = 0;
        ventas?.forEach(v => totalEfectivo += Number(v.monto));
        setVentasEfectivo(totalEfectivo);
      }
    } catch {
      // Ignorar, asume que no hay caja abierta
    } finally {
      setLoading(false);
    }
  };

  const abrirCaja = async () => {
    const apertura = parseFloat(montoApertura);
    if (isNaN(apertura) || apertura < 0) return Alert.alert('Aviso', 'Ingresa un monto de apertura válido');
    
    setSaving(true);
    try {
      const sedeId = await AsyncStorage.getItem('sede_id');
      const usuarioId = await AsyncStorage.getItem('usuario_id');

      const { data, error } = await supabase
        .from('cajas')
        .insert([{
          sede_id: parseInt(sedeId || '0'),
          usuario_id: parseInt(usuarioId || '0'),
          monto_apertura: apertura,
          estado: 'ABIERTA'
        }])
        .select()
        .single();
        
      if (error) throw error;
      
      await AsyncStorage.setItem('caja_id', data.id.toString());
      Alert.alert('Éxito', 'Caja abierta correctamente.', [{ text: 'OK', onPress: () => router.replace('/home') }]);
    } catch {
      Alert.alert('Error', 'No se pudo abrir la caja');
    } finally {
      setSaving(false);
    }
  };

  const cerrarCaja = async () => {
    const declarado = parseFloat(montoFisico);
    if (isNaN(declarado) || declarado < 0) return Alert.alert('Aviso', 'Ingresa un monto físico válido');
    
    setSaving(true);
    try {
      const sistema = Number(caja.monto_apertura) + ventasEfectivo;
      
      const { error } = await supabase
        .from('cajas')
        .update({
          estado: 'CERRADA',
          fecha_cierre: new Date().toISOString(),
          monto_cierre_declarado: declarado,
          monto_cierre_sistema: sistema
        })
        .eq('id', caja.id);
        
      if (error) throw error;
      
      await AsyncStorage.removeItem('caja_id');
      
      const diferencia = declarado - sistema;
      let msj = 'Caja cerrada cuadrada perfectamente.';
      if (diferencia > 0) msj = `Caja cerrada. Hay un SOBRANTE de S/ ${diferencia.toFixed(2)}`;
      if (diferencia < 0) msj = `Caja cerrada. Hay un FALTANTE de S/ ${Math.abs(diferencia).toFixed(2)}`;

      Alert.alert('Arqueo Finalizado', msj, [{ text: 'OK', onPress: () => router.replace('/home') }]);
    } catch (e) {
      Alert.alert('Error', 'No se pudo cerrar la caja');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#f59e0b" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        
        {!caja ? (
          // APERTURA DE CAJA
          <View>
            <View style={styles.header}>
              <View style={[styles.iconBox, { backgroundColor: '#fef3c7' }]}><Unlock color="#f59e0b" size={40} /></View>
              <Text style={styles.title}>Apertura de Caja</Text>
              <Text style={styles.subtitle}>Declara tu saldo inicial en monedas y billetes (sencillo) para poder empezar a vender.</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>Efectivo Inicial (S/)</Text>
              <View style={styles.inputGroup}>
                <DollarSign color="#64748b" size={24} />
                <TextInput
                  style={styles.input}
                  placeholder="Ej. 50.00"
                  value={montoApertura}
                  onChangeText={setMontoApertura}
                  keyboardType="decimal-pad"
                  autoFocus
                />
              </View>
            </View>

            <TouchableOpacity style={[styles.btn, { backgroundColor: '#f59e0b' }]} onPress={abrirCaja} disabled={saving}>
              {saving ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Abrir Caja</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          // CIERRE DE CAJA
          <View>
            <View style={styles.header}>
              <View style={[styles.iconBox, { backgroundColor: '#fee2e2' }]}><Lock color="#ef4444" size={40} /></View>
              <Text style={styles.title}>Cierre de Caja</Text>
              <Text style={styles.subtitle}>Cuenta tu dinero físico y compáralo con el sistema.</Text>
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Efectivo Inicial (Apertura):</Text>
                <Text style={styles.summaryValue}>S/ {Number(caja.monto_apertura).toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>+ Ventas en Efectivo Hoy:</Text>
                <Text style={styles.summaryValue}>S/ {ventasEfectivo.toFixed(2)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { fontWeight: 'bold', color: '#0f172a' }]}>Efectivo Esperado (Sistema):</Text>
                <Text style={[styles.summaryValue, { fontWeight: 'bold', color: '#2563eb', fontSize: 18 }]}>
                  S/ {(Number(caja.monto_apertura) + ventasEfectivo).toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>¿Cuánto efectivo físico tienes realmente? (S/)</Text>
              <View style={styles.inputGroup}>
                <DollarSign color="#64748b" size={24} />
                <TextInput
                  style={styles.input}
                  placeholder="Ej. 120.00"
                  value={montoFisico}
                  onChangeText={setMontoFisico}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <TouchableOpacity style={[styles.btn, { backgroundColor: '#ef4444' }]} onPress={cerrarCaja} disabled={saving}>
              {saving ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Finalizar Arqueo y Cerrar</Text>}
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 25 },
  header: { alignItems: 'center', marginBottom: 30, marginTop: 10 },
  iconBox: { padding: 20, borderRadius: 50, marginBottom: 15 },
  title: { fontSize: 28, fontWeight: '900', color: '#0f172a', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#64748b', textAlign: 'center' },
  
  card: { backgroundColor: 'white', padding: 20, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, marginBottom: 25 },
  label: { fontSize: 16, fontWeight: '700', color: '#334155', marginBottom: 15 },
  inputGroup: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', paddingHorizontal: 15, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  input: { flex: 1, height: 60, fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginLeft: 10 },
  
  summaryCard: { backgroundColor: '#eff6ff', padding: 20, borderRadius: 20, marginBottom: 25, borderWidth: 1, borderColor: '#bfdbfe' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryLabel: { fontSize: 15, color: '#475569' },
  summaryValue: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  divider: { height: 1, backgroundColor: '#bfdbfe', marginVertical: 10 },

  btn: { padding: 20, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  btnText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});
