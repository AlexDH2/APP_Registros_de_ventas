import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image, ActivityIndicator, TextInput, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { router } from 'expo-router';
import { decode } from 'base64-arraybuffer';
import { Camera, CheckCircle2, Droplets, Zap, Truck, MapPin, ChevronDown, FileText, Building2 } from 'lucide-react-native';

type Sede = {
  id: number;
  nombre: string;
};

export default function DeliveryScreen() {
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [sedeDestino, setSedeDestino] = useState<Sede | null>(null);
  const [showSedes, setShowSedes] = useState(false);

  const [descripcion, setDescripcion] = useState('');
  const [aguaEntregada, setAguaEntregada] = useState(0);
  const [gatoradeEntregada, setGatoradeEntregada] = useState(0);
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSedes();
  }, []);

  const fetchSedes = async () => {
    const { data, error } = await supabase.from('sedes').select('id, nombre').order('id', { ascending: true });
    if (!error && data) {
      // La Oficina es la sede central de donde sale la mercadería, los destinos son las demás sedes
      setSedes(data.filter((s: any) => s.nombre.trim().toLowerCase() !== 'oficina'));
    }
    setLoading(false);
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Aviso', 'Necesitas dar permisos de cámara para tomar la foto.');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0]);
    }
  };

  const guardarEntrega = async () => {
    if (!sedeDestino) return Alert.alert('Aviso', 'Selecciona la sede destino');
    if (!descripcion.trim()) return Alert.alert('Aviso', 'Ingresa una descripción de la entrega');
    if (aguaEntregada === 0 && gatoradeEntregada === 0) return Alert.alert('Aviso', 'No has indicado cantidades entregadas');
    if (!image) return Alert.alert('Aviso', 'Es obligatorio tomar una foto de la mercadería');

    setSaving(true);
    try {
      // 1. Validar disponibilidad en Almacén Central (Oficina)
      const { data: central } = await supabase.from('almacen_central').select('*').eq('id', 1).single();
      if (central) {
        if (aguaEntregada > central.agua_stock) {
          setSaving(false);
          return Alert.alert(
            '⚠️ Stock Insuficiente en Oficina',
            `En el Almacén Central solo hay ${central.agua_stock} botellas de Agua Mineral disponibles. No puedes despachar ${aguaEntregada}.`
          );
        }
        if (gatoradeEntregada > central.gatorade_stock) {
          setSaving(false);
          return Alert.alert(
            '⚠️ Stock Insuficiente en Oficina',
            `En el Almacén Central solo hay ${central.gatorade_stock} botellas de Gatorade disponibles. No puedes despachar ${gatoradeEntregada}.`
          );
        }
      }

      const fileName = `entrega_${Date.now()}.jpg`;
      const filePath = `logistica/${fileName}`;
      if (!image.base64) throw new Error('Imagen inválida o corrupta');

      // 2. Subir foto de evidencia
      const { error: uploadError } = await supabase.storage
        .from('comprobantes')
        .upload(filePath, decode(image.base64), { contentType: 'image/jpeg' });
      if (uploadError) throw new Error('No se pudo subir la foto: ' + uploadError.message);

      const { data: urlData } = supabase.storage.from('comprobantes').getPublicUrl(filePath);

      // 3. Registrar entrega pendiente de recepción por la sede
      const { error: insertError } = await supabase.from('entregas').insert([{
        sede_destino_id: sedeDestino.id,
        descripcion: descripcion.trim(),
        agua_entregada: aguaEntregada,
        gatorade_entregada: gatoradeEntregada,
        url_foto: urlData.publicUrl,
        estado: 'PENDIENTE_RECEPCION'
      }]);
      if (insertError) throw insertError;

      // 4. Descontar del Almacén Central de forma segura y sincronizar sede Oficina
      if (central) {
        const nuevoAgua = Math.max(0, central.agua_stock - aguaEntregada);
        const nuevoGatorade = Math.max(0, central.gatorade_stock - gatoradeEntregada);

        await supabase.from('almacen_central').update({
          agua_stock: nuevoAgua,
          gatorade_stock: nuevoGatorade,
          ultima_actualizacion: new Date().toISOString()
        }).eq('id', 1);

        const { data: sedeOficina } = await supabase
          .from('sedes')
          .select('id')
          .ilike('nombre', 'oficina')
          .single();

        if (sedeOficina) {
          await supabase.from('inventario_bebidas').update({
            agua_cantidad: nuevoAgua,
            gatorade_cantidad: nuevoGatorade
          }).eq('sede_id', sedeOficina.id);
        }
      }

      Alert.alert(
        '¡Entrega Despachada!',
        'Se descontó del Almacén Central. El stock se sumará al inventario de la sede cuando el encargado confirme la recepción.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Ocurrió un problema');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Truck color="#10b981" size={32} />
          </View>
          <Text style={styles.title}>Reparto Logístico</Text>
          <Text style={styles.subtitle}>Evidencia y reabastecimiento de stock</Text>
        </View>

        <View style={styles.originCard}>
          <Building2 color="#0284c7" size={18} />
          <View style={{ flex: 1 }}>
            <Text style={styles.originTitle}>Origen del Despacho</Text>
            <Text style={styles.originSub}>🏢 Oficina (Almacén Central)</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Sede Destino (Receptora)</Text>
        <TouchableOpacity style={styles.dropdown} onPress={() => setShowSedes(true)}>
          <MapPin color="#64748b" size={20} />
          <Text style={[styles.dropdownText, !sedeDestino && { color: '#94a3b8' }]}>
            {sedeDestino ? sedeDestino.nombre : 'Seleccionar sede destino...'}
          </Text>
          <ChevronDown color="#64748b" size={20} />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Detalles de Entrega</Text>
        <View style={styles.inputCard}>
          <View style={styles.inputGroup}>
            <FileText color="#94a3b8" size={20} />
            <TextInput
              style={styles.input}
              placeholder="Descripción (Ej. Entrega matutina)"
              value={descripcion}
              onChangeText={setDescripcion}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Cantidades Entregadas (Unidades)</Text>
        <View style={styles.card}>
          <View style={styles.beverageRow}>
            <View style={styles.beverageInfo}>
              <View style={[styles.iconBox, { backgroundColor: '#e0f2fe' }]}><Droplets color="#0ea5e9" size={20} /></View>
              <Text style={styles.beverageText}>Agua</Text>
            </View>
            <View style={styles.counter}>
              <TouchableOpacity style={styles.counterBtn} onPress={() => setAguaEntregada(Math.max(0, aguaEntregada - 1))}>
                <Text style={styles.counterText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.counterValue}>{aguaEntregada}</Text>
              <TouchableOpacity style={styles.counterBtn} onPress={() => setAguaEntregada(aguaEntregada + 1)}>
                <Text style={styles.counterText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.beverageRow}>
            <View style={styles.beverageInfo}>
              <View style={[styles.iconBox, { backgroundColor: '#fef3c7' }]}><Zap color="#d97706" size={20} /></View>
              <Text style={styles.beverageText}>Gatorade</Text>
            </View>
            <View style={styles.counter}>
              <TouchableOpacity style={styles.counterBtn} onPress={() => setGatoradeEntregada(Math.max(0, gatoradeEntregada - 1))}>
                <Text style={styles.counterText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.counterValue}>{gatoradeEntregada}</Text>
              <TouchableOpacity style={styles.counterBtn} onPress={() => setGatoradeEntregada(gatoradeEntregada + 1)}>
                <Text style={styles.counterText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Evidencia Fotográfica</Text>
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage} activeOpacity={0.8}>
          {image ? (
            <Image source={{ uri: image.uri }} style={styles.imagePreview} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Camera color="#94a3b8" size={40} />
              <Text style={styles.imagePickerText}>Toca para tomar foto del material</Text>
              <Text style={styles.imagePickerSubtext}>Obligatorio para la constancia</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.submitButton, saving && styles.submitButtonDisabled]} 
          onPress={guardarEntrega}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <CheckCircle2 color="white" size={24} />
              <Text style={styles.submitButtonText}>Registrar y Sumar Stock</Text>
            </>
          )}
        </TouchableOpacity>
        
      </ScrollView>

      {/* Modal Selección de Sede */}
      <Modal visible={showSedes} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seleccionar Sede</Text>
            <FlatList
              data={sedes}
              keyExtractor={(s) => s.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.sedeOption} 
                  onPress={() => { setSedeDestino(item); setShowSedes(false); }}
                >
                  <MapPin color="#2563eb" size={20} />
                  <Text style={styles.sedeOptionText}>{item.nombre}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowSedes(false)}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 30 },
  iconContainer: { backgroundColor: '#d1fae5', padding: 20, borderRadius: 50, marginBottom: 15 },
  title: { fontSize: 26, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 15, color: '#64748b', marginTop: 5 },
  
  originCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12, 
    backgroundColor: '#eff6ff', 
    padding: 14, 
    borderRadius: 14, 
    borderWidth: 1, 
    borderColor: '#bfdbfe', 
    marginBottom: 16 
  },
  originTitle: { fontSize: 11, fontWeight: '700', color: '#1e40af', textTransform: 'uppercase', letterSpacing: 0.5 },
  originSub: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginTop: 2 },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#334155', marginBottom: 15, marginTop: 10 },
  
  dropdown: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', padding: 18, borderRadius: 16, shadowColor: '#64748b', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, marginBottom: 20 },
  dropdownText: { flex: 1, marginLeft: 15, fontSize: 16, color: '#0f172a', fontWeight: '500' },
  
  inputCard: { backgroundColor: '#ffffff', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 15, shadowColor: '#64748b', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, marginBottom: 20 },
  inputGroup: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, marginLeft: 15, fontSize: 16, color: '#334155' },
  
  card: { backgroundColor: '#ffffff', borderRadius: 20, padding: 20, shadowColor: '#64748b', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, marginBottom: 20 },
  beverageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  beverageInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  beverageText: { fontSize: 16, fontWeight: '600', color: '#334155' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 15 },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  counterBtn: { backgroundColor: '#f1f5f9', width: 36, height: 36, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
  counterText: { fontSize: 18, fontWeight: '600', color: '#475569' },
  counterValue: { fontSize: 18, fontWeight: '700', color: '#0f172a', width: 25, textAlign: 'center' },
  
  imagePicker: { height: 220, backgroundColor: '#ffffff', borderRadius: 20, overflow: 'hidden', borderWidth: 2, borderColor: '#e2e8f0', borderStyle: 'dashed', marginBottom: 30 },
  imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  imagePickerText: { color: '#475569', fontSize: 16, fontWeight: '600', marginTop: 15 },
  imagePickerSubtext: { color: '#94a3b8', fontSize: 13, marginTop: 5 },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  
  submitButton: { backgroundColor: '#10b981', flexDirection: 'row', padding: 18, borderRadius: 16, justifyContent: 'center', alignItems: 'center', gap: 10, shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  submitButtonDisabled: { backgroundColor: '#94a3b8', shadowOpacity: 0 },
  submitButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 25, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginBottom: 20 },
  sedeOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  sedeOptionText: { marginLeft: 15, fontSize: 16, color: '#334155', fontWeight: '500' },
  cancelBtn: { marginTop: 20, padding: 15, backgroundColor: '#f1f5f9', borderRadius: 12, alignItems: 'center' },
  cancelBtnText: { color: '#64748b', fontWeight: 'bold', fontSize: 16 }
});
