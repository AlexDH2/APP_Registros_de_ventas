import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { Save, Droplets, Zap } from 'lucide-react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function EditPricesScreen() {
  const [precioAgua, setPrecioAgua] = useState('');
  const [precioGatorade, setPrecioGatorade] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkRole();
    loadPrices();
  }, []);

  const checkRole = async () => {
    const rol = await AsyncStorage.getItem('usuario_rol');
    if (rol !== 'CREADOR' && rol !== 'ADMIN') {
      Alert.alert('Acceso Denegado', 'Esta pantalla es exclusiva para el Creador.');
      router.replace('/');
    }
  };

  const loadPrices = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('configuracion_precios').select('*').eq('id', 1).single();
    if (!error && data) {
      setPrecioAgua(data.precio_agua.toString());
      setPrecioGatorade(data.precio_gatorade.toString());
    } else if (error && error.code !== 'PGRST116') {
      Alert.alert('Error', 'No se pudieron cargar los precios');
    }
    setLoading(false);
  };

  const savePrices = async () => {
    if (!precioAgua || !precioGatorade) return Alert.alert('Aviso', 'Completa ambos precios');
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('configuracion_precios')
        .update({
          precio_agua: parseFloat(precioAgua),
          precio_gatorade: parseFloat(precioGatorade)
        })
        .eq('id', 1);

      if (error) throw error;
      Alert.alert('Éxito', 'Precios actualizados para todas las sedes.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#f59e0b" /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Configurar Precios</Text>
          <Text style={styles.subtitle}>Estos precios aplicarán a todas las nuevas ventas.</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.inputRow}>
            <View style={styles.iconBoxAgua}>
              <Droplets color="#0ea5e9" size={24} />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Precio Agua Mineral (S/)</Text>
              <TextInput
                style={styles.input}
                value={precioAgua}
                onChangeText={setPrecioAgua}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.inputRow}>
            <View style={styles.iconBoxGatorade}>
              <Zap color="#d97706" size={24} />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Precio Gatorade (S/)</Text>
              <TextInput
                style={styles.input}
                value={precioGatorade}
                onChangeText={setPrecioGatorade}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]} 
          onPress={savePrices}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="white" /> : <Save color="white" size={24} />}
          <Text style={styles.saveBtnText}>Guardar Cambios</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20 },
  header: { marginBottom: 30 },
  title: { fontSize: 28, fontWeight: '900', color: '#0f172a' },
  subtitle: { fontSize: 16, color: '#64748b', marginTop: 5 },
  card: { backgroundColor: 'white', borderRadius: 20, padding: 20, shadowColor: '#64748b', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4, marginBottom: 30 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  iconBoxAgua: { backgroundColor: '#e0f2fe', width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  iconBoxGatorade: { backgroundColor: '#fef3c7', width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  inputContainer: { flex: 1 },
  label: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 5 },
  input: { fontSize: 22, fontWeight: '800', color: '#0f172a', borderBottomWidth: 1, borderBottomColor: '#cbd5e1', paddingVertical: 5 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 20 },
  saveBtn: { backgroundColor: '#f59e0b', flexDirection: 'row', padding: 18, borderRadius: 16, justifyContent: 'center', alignItems: 'center', gap: 10, shadowColor: '#f59e0b', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});
