import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { decode } from 'base64-arraybuffer';
import { Camera, CheckCircle2, Droplets, Zap, Building2, Smartphone, CircleDollarSign } from 'lucide-react-native';
import { saveOfflineSale } from '../lib/offlineSync';

export default function SaleScreen() {
  const [metodoPago, setMetodoPago] = useState<'Yape' | 'Plin' | 'Transferencia' | 'Efectivo' | null>(null);
  const [banco, setBanco] = useState<'BCP' | 'BBVA' | 'Scotiabank' | 'Interbank' | null>(null);
  
  const [pagoCliente, setPagoCliente] = useState('');
  
  const [aguaVendida, setAguaVendida] = useState(0);
  const [gatoradeVendida, setGatoradeVendida] = useState(0);
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [saving, setSaving] = useState(false);

  // Precios dinámicos e Inventario
  const [PRECIO_AGUA, setPrecioAgua] = useState(2);
  const [PRECIO_GATORADE, setPrecioGatorade] = useState(3);
  const [stockAgua, setStockAgua] = useState(0);
  const [stockGatorade, setStockGatorade] = useState(0);
  
  const totalCobrar = (aguaVendida * PRECIO_AGUA) + (gatoradeVendida * PRECIO_GATORADE);

  const pagoNum = parseFloat(pagoCliente) || 0;
  const vueltoCalculado = pagoNum > totalCobrar ? pagoNum - totalCobrar : 0;

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data } = await supabase.from('configuracion_precios').select('precio_agua, precio_gatorade').single();
      if (data) {
        setPrecioAgua(data.precio_agua);
        setPrecioGatorade(data.precio_gatorade);
      }

      // Cargar inventario actual de la sede
      const savedSedeId = await AsyncStorage.getItem('sede_id');
      if (savedSedeId) {
        const { data: inv } = await supabase.from('inventario_bebidas').select('agua_cantidad, gatorade_cantidad').eq('sede_id', parseInt(savedSedeId)).single();
        if (inv) {
          setStockAgua(inv.agua_cantidad);
          setStockGatorade(inv.gatorade_cantidad);
        }
      }
    } catch (e) {
      console.log('Error loading config/inventory');
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.5,
      base64: true
    });
    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  const guardarVenta = async () => {
    if (totalCobrar === 0) return Alert.alert('Aviso', 'Añade al menos una bebida');
    if (!metodoPago) return Alert.alert('Aviso', 'Selecciona un método de pago');
    if (metodoPago === 'Transferencia' && !banco) return Alert.alert('Aviso', 'Selecciona el banco destino');
    if (metodoPago !== 'Efectivo' && !image) return Alert.alert('Aviso', 'Falta el comprobante fotográfico');

    // Validación preventiva de stock
    if (aguaVendida > 0 && stockAgua <= 0) {
      return Alert.alert('⚠️ Sin Stock', 'No queda Agua Mineral disponible en esta sede.');
    }
    if (gatoradeVendida > 0 && stockGatorade <= 0) {
      return Alert.alert('⚠️ Sin Stock', 'No queda Gatorade disponible en esta sede.');
    }
    if (stockAgua > 0 && aguaVendida > stockAgua) {
      return Alert.alert('⚠️ Stock Insuficiente', `Intentas vender ${aguaVendida} botellas de Agua, pero solo quedan ${stockAgua} en stock.`);
    }
    if (stockGatorade > 0 && gatoradeVendida > stockGatorade) {
      return Alert.alert('⚠️ Stock Insuficiente', `Intentas vender ${gatoradeVendida} botellas de Gatorade, pero solo quedan ${stockGatorade} en stock.`);
    }

    setSaving(true);
    try {
      const savedSedeId = await AsyncStorage.getItem('sede_id');
      const nombreVendedor = await AsyncStorage.getItem('usuario_nombre');
      const cajaIdStr = await AsyncStorage.getItem('caja_id');
      
      const sedeId = parseInt(savedSedeId || '0');
      const cajaId = cajaIdStr ? parseInt(cajaIdStr) : null;
      
      if (!sedeId) throw new Error('No se encontró la sede');

      const descPago = `Pagó: S/ ${pagoNum.toFixed(2)} | Vuelto: S/ ${vueltoCalculado.toFixed(2)}`;

      // 1. Intentar subir imagen si aplica
      let publicUrl = null;
      if (image && image.base64) {
        const fileName = `captura_${Date.now()}.jpg`;
        const filePath = `${sedeId}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('comprobantes')
          .upload(filePath, decode(image.base64), { contentType: 'image/jpeg' });
          
        if (uploadError) throw uploadError; // Esto saltará al catch si no hay internet

        const { data: urlData } = supabase.storage.from('comprobantes').getPublicUrl(filePath);
        publicUrl = urlData.publicUrl;
      }

      // 2. Insertar venta
      const { error: insertError } = await supabase.from('ventas').insert([{
        sede_id: sedeId,
        caja_id: cajaId,
        fecha: new Date().toISOString(),
        metodo_pago: metodoPago,
        banco: metodoPago === 'Transferencia' ? banco : null,
        agua_vendida: aguaVendida,
        gatorade_vendida: gatoradeVendida,
        url_captura: publicUrl,
        monto: totalCobrar,
        descripcion: descPago,
        vendedor: nombreVendedor || 'Vendedor Desconocido',
        estado: 'COMPLETADA'
      }]);
      if (insertError) throw insertError;

      // 3. Actualizar Inventario de forma atómica
      const { error: rpcError } = await supabase.rpc('decrementar_stock_sede', {
        p_sede_id: sedeId,
        p_agua: aguaVendida,
        p_gatorade: gatoradeVendida
      });

      if (rpcError) {
        const { data: inventario } = await supabase.from('inventario_bebidas').select('*').eq('sede_id', sedeId).single();
        if (inventario) {
          await supabase.from('inventario_bebidas').update({
            agua_cantidad: Math.max(0, inventario.agua_cantidad - aguaVendida),
            gatorade_cantidad: Math.max(0, inventario.gatorade_cantidad - gatoradeVendida)
          }).eq('id', inventario.id);
        }
      }

      Alert.alert('Éxito', 'Venta registrada correctamente', [
        { text: 'OK', onPress: () => router.replace('/home') }
      ]);
      
    } catch (error: any) {
      console.log('Error guardando venta normal:', error.message);
      
      // MODO OFFLINE: Si hubo un error (posiblemente de red), guardamos localmente
      try {
        const savedSedeId = await AsyncStorage.getItem('sede_id');
        const nombreVendedor = await AsyncStorage.getItem('usuario_nombre');
        const cajaIdStr = await AsyncStorage.getItem('caja_id');
        
        await saveOfflineSale({
          sede_id: parseInt(savedSedeId || '0'),
          caja_id: cajaIdStr ? parseInt(cajaIdStr) : null,
          fecha: new Date().toISOString(),
          metodo_pago: metodoPago,
          banco: metodoPago === 'Transferencia' ? banco : null,
          agua_vendida: aguaVendida,
          gatorade_vendida: gatoradeVendida,
          monto: totalCobrar,
          descripcion: `Pagó: S/ ${pagoNum.toFixed(2)} | Vuelto: S/ ${vueltoCalculado.toFixed(2)}`,
          vendedor: nombreVendedor || 'Vendedor Desconocido',
          estado: 'COMPLETADA',
          imageUri: image?.uri || null
        });
        
        Alert.alert(
          'Venta Guardada (Offline)', 
          'Parece que hay problemas de conexión. La venta se ha guardado localmente y se sincronizará automáticamente cuando vuelva el Internet.',
          [{ text: 'OK', onPress: () => router.replace('/home') }]
        );

      } catch (offlineErr) {
        Alert.alert('Error', 'No se pudo guardar la venta ni siquiera en modo offline.');
      }

    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        
        <Text style={styles.sectionTitle}>¿Qué estás vendiendo?</Text>
        
        <View style={styles.card}>
          <View style={styles.beverageRow}>
            <View style={styles.beverageInfo}>
              <View style={[styles.iconBox, { backgroundColor: '#e0f2fe' }]}><Droplets color="#0ea5e9" size={24} /></View>
              <View>
                <Text style={styles.beverageText}>Agua Mineral</Text>
                <Text style={styles.priceText}>S/ {PRECIO_AGUA.toFixed(2)} c/u</Text>
                <Text style={styles.stockText}>(Quedan: {stockAgua})</Text>
              </View>
            </View>
            <View style={styles.counter}>
              <TouchableOpacity style={styles.counterBtn} onPress={() => setAguaVendida(Math.max(0, aguaVendida - 1))}>
                <Text style={styles.counterText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.counterValue}>{aguaVendida}</Text>
              <TouchableOpacity 
                style={[styles.counterBtn, aguaVendida >= stockAgua && { opacity: 0.5 }]} 
                onPress={() => aguaVendida < stockAgua && setAguaVendida(aguaVendida + 1)}
              >
                <Text style={styles.counterText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.beverageRow}>
            <View style={styles.beverageInfo}>
              <View style={[styles.iconBox, { backgroundColor: '#fef3c7' }]}><Zap color="#d97706" size={24} /></View>
              <View>
                <Text style={styles.beverageText}>Gatorade</Text>
                <Text style={styles.priceText}>S/ {PRECIO_GATORADE.toFixed(2)} c/u</Text>
                <Text style={styles.stockText}>(Quedan: {stockGatorade})</Text>
              </View>
            </View>
            <View style={styles.counter}>
              <TouchableOpacity style={styles.counterBtn} onPress={() => setGatoradeVendida(Math.max(0, gatoradeVendida - 1))}>
                <Text style={styles.counterText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.counterValue}>{gatoradeVendida}</Text>
              <TouchableOpacity 
                style={[styles.counterBtn, gatoradeVendida >= stockGatorade && { opacity: 0.5 }]} 
                onPress={() => gatoradeVendida < stockGatorade && setGatoradeVendida(gatoradeVendida + 1)}
              >
                <Text style={styles.counterText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Detalles del Pago</Text>
        <View style={styles.inputCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total a Cobrar:</Text>
            <Text style={styles.totalValue}>S/ {totalCobrar.toFixed(2)}</Text>
          </View>
          
          <View style={styles.divider} />

          <View style={styles.inputGroup}>
            <CircleDollarSign color="#94a3b8" size={20} />
            <TextInput
              style={styles.input}
              placeholder="¿Cuánto dinero entregó? (Opcional)"
              value={pagoCliente}
              onChangeText={setPagoCliente}
              keyboardType="decimal-pad"
            />
          </View>
          
          <View style={styles.divider} />
          <View style={styles.vueltoRow}>
            <Text style={styles.vueltoLabel}>Vuelto a entregar:</Text>
            <Text style={styles.vueltoValue}>S/ {vueltoCalculado.toFixed(2)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Método de Pago</Text>
        <View style={styles.row}>
          {['Yape', 'Plin', 'Transferencia', 'Efectivo'].map((metodo) => (
            <TouchableOpacity
              key={metodo}
              style={[styles.chip, metodoPago === metodo && styles.chipActive]}
              onPress={() => setMetodoPago(metodo as any)}
            >
              <Smartphone color={metodoPago === metodo ? "white" : "#64748b"} size={18} />
              <Text style={[styles.chipText, metodoPago === metodo && styles.chipTextActive]}>{metodo}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {metodoPago === 'Transferencia' && (
          <View style={styles.subSection}>
            <Text style={styles.subSectionTitle}>Banco Destino</Text>
            <View style={styles.row}>
              {['BCP', 'BBVA', 'Scotiabank', 'Interbank'].map((b) => (
                <TouchableOpacity
                  key={b}
                  style={[styles.chip, banco === b && styles.chipActive]}
                  onPress={() => setBanco(b as any)}
                >
                  <Building2 color={banco === b ? "white" : "#64748b"} size={16} />
                  <Text style={[styles.chipText, banco === b && styles.chipTextActive]}>{b}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {metodoPago !== 'Efectivo' && (
          <>
            <Text style={styles.sectionTitle}>Comprobante de Pago</Text>
            <TouchableOpacity style={styles.imagePicker} onPress={pickImage} activeOpacity={0.8}>
              {image ? (
                <Image source={{ uri: image.uri }} style={styles.imagePreview} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Camera color="#94a3b8" size={40} />
                  <Text style={styles.imagePickerText}>Toca para tomar foto</Text>
                  <Text style={styles.imagePickerSubtext}>Obligatorio para registrar la venta</Text>
                </View>
              )}
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity 
          style={[styles.submitButton, saving && styles.submitButtonDisabled, { marginTop: 20 }]} 
          onPress={guardarVenta}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <CheckCircle2 color="white" size={24} />
              <Text style={styles.submitButtonText}>Completar Registro</Text>
            </>
          )}
        </TouchableOpacity>
        
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginTop: 10, marginBottom: 15 },
  inputCard: { backgroundColor: '#ffffff', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10, shadowColor: '#64748b', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, marginBottom: 15 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  totalLabel: { fontSize: 18, fontWeight: '700', color: '#334155' },
  totalValue: { fontSize: 22, fontWeight: '900', color: '#10b981' },
  inputGroup: { flexDirection: 'row', alignItems: 'center', height: 50 },
  input: { flex: 1, marginLeft: 15, fontSize: 16, color: '#334155' },
  vueltoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  vueltoLabel: { fontSize: 16, fontWeight: '600', color: '#64748b' },
  vueltoValue: { fontSize: 18, fontWeight: '800', color: '#ef4444' },
  subSection: { marginTop: 20, backgroundColor: '#f1f5f9', padding: 15, borderRadius: 16 },
  subSectionTitle: { fontSize: 15, fontWeight: '700', color: '#475569', marginBottom: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', gap: 8 },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { color: '#64748b', fontWeight: '600', fontSize: 15 },
  chipTextActive: { color: 'white' },
  card: { backgroundColor: '#ffffff', borderRadius: 20, padding: 20, shadowColor: '#64748b', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  beverageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  beverageInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  beverageText: { fontSize: 16, fontWeight: '700', color: '#334155' },
  priceText: { fontSize: 14, fontWeight: '500', color: '#10b981', marginTop: 2 },
  stockText: { fontSize: 12, fontWeight: 'bold', color: '#ef4444', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 10 },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  counterBtn: { backgroundColor: '#f1f5f9', width: 36, height: 36, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
  counterText: { fontSize: 18, fontWeight: '600', color: '#475569' },
  counterValue: { fontSize: 18, fontWeight: '700', color: '#0f172a', width: 20, textAlign: 'center' },
  imagePicker: { height: 220, backgroundColor: '#ffffff', borderRadius: 20, overflow: 'hidden', borderWidth: 2, borderColor: '#e2e8f0', borderStyle: 'dashed', marginTop: 5, marginBottom: 30 },
  imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  imagePickerText: { color: '#475569', fontSize: 16, fontWeight: '600', marginTop: 15 },
  imagePickerSubtext: { color: '#94a3b8', fontSize: 13, marginTop: 5 },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  submitButton: { backgroundColor: '#10b981', flexDirection: 'row', padding: 18, borderRadius: 16, justifyContent: 'center', alignItems: 'center', gap: 10, shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  submitButtonDisabled: { backgroundColor: '#94a3b8', shadowOpacity: 0 },
  submitButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});
