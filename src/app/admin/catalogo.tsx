import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  useColorScheme,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors, fonts } from '../../theme';
import AnimatedButton from '../../components/AnimatedButton';
import {
  Tag,
  Plus,
  Package,
  DollarSign,
  Trash2,
  CheckCircle2,
  X
} from 'lucide-react-native';

type Producto = {
  id: number;
  nombre: string;
  categoria: string;
  precio_venta: number;
  costo_compra: number;
  activo: boolean;
};

export default function CatalogoProductosScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? colors.dark : colors.light;

  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('Snack');
  const [precioVenta, setPrecioVenta] = useState('');
  const [costoCompra, setCostoCompra] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadProductos();
    }, [])
  );

  const loadProductos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('catalogo_productos')
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;
      setProductos(data || []);
    } catch (e: any) {
      console.log('Error cargando catálogo:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCrearProducto = async () => {
    if (!nombre.trim()) return Alert.alert('Aviso', 'Ingresa el nombre del producto');
    const pVenta = parseFloat(precioVenta);
    const pCosto = parseFloat(costoCompra) || 0;

    if (isNaN(pVenta) || pVenta <= 0) return Alert.alert('Aviso', 'Ingresa un precio de venta válido');

    setSaving(true);
    try {
      const { error } = await supabase.from('catalogo_productos').insert([{
        nombre: nombre.trim(),
        categoria: categoria.trim(),
        precio_venta: pVenta,
        costo_compra: pCosto,
        activo: true
      }]);

      if (error) throw error;

      Alert.alert('¡Producto Creado!', `${nombre} se agregó al catálogo.`);
      setNombre('');
      setPrecioVenta('');
      setCostoCompra('');
      setShowAddForm(false);
      loadProductos();
    } catch (e: any) {
      Alert.alert('Error', 'No se pudo crear: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActivo = async (prod: Producto) => {
    try {
      const { error } = await supabase
        .from('catalogo_productos')
        .update({ activo: !prod.activo })
        .eq('id', prod.id);

      if (error) throw error;
      setProductos(prev => prev.map(p => p.id === prod.id ? { ...p, activo: !p.activo } : p));
    } catch (e: any) {
      Alert.alert('Error', 'No se pudo actualizar');
    }
  };

  const handleEliminarProducto = async (id: number) => {
    Alert.alert('Eliminar Producto', '¿Seguro que deseas borrar este producto del catálogo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await supabase.from('catalogo_productos').delete().eq('id', id);
            setProductos(prev => prev.filter(p => p.id !== id));
          } catch (e) {
            Alert.alert('Error', 'No se pudo eliminar');
          }
        }
      }
    ]);
  };

  const dynamicStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    card: {
      backgroundColor: theme.card,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2
    },
    textTitle: { fontFamily: fonts.bold, color: theme.text, fontSize: 16 },
    textMuted: { fontFamily: fonts.regular, color: theme.textMuted, fontSize: 13 },
  });

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.headerTitle, { color: theme.text }]}>Catálogo Adicional</Text>
              <Text style={[styles.headerSub, { color: theme.textMuted }]}>
                Bebidas, snacks y artículos adicionales
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.addBtn,
                { backgroundColor: showAddForm ? '#64748b' : theme.primary }
              ]}
              onPress={() => setShowAddForm(!showAddForm)}
              activeOpacity={0.8}
            >
              {showAddForm ? <X color="white" size={20} /> : <Plus color="white" size={20} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Formulario nuevo producto */}
        {showAddForm && (
          <View style={[dynamicStyles.card, { marginHorizontal: 16, marginBottom: 15 }]}>
            <Text style={[dynamicStyles.textTitle, { marginBottom: 12 }]}>Nuevo Producto</Text>

            <Text style={[styles.label, { color: theme.text }]}>Nombre del Producto *</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text }]}
              placeholder="Ej. Barra de Cereal con Frutos Secos"
              placeholderTextColor={theme.textMuted}
              value={nombre}
              onChangeText={setNombre}
            />

            <Text style={[styles.label, { color: theme.text }]}>Categoría</Text>
            <View style={styles.catRow}>
              {['Snack', 'Bebida', 'Deportivo', 'Otro'].map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.catChip, categoria === c && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                  onPress={() => setCategoria(c)}
                >
                  <Text style={[styles.catChipText, categoria === c && { color: 'white', fontFamily: fonts.bold }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.rowPrices}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: theme.text }]}>Precio Venta (S/) *</Text>
                <TextInput
                  style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                  placeholder="Ej. 3.50"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="decimal-pad"
                  value={precioVenta}
                  onChangeText={setPrecioVenta}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: theme.text }]}>Costo Compra (S/)</Text>
                <TextInput
                  style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                  placeholder="Ej. 1.80"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="decimal-pad"
                  value={costoCompra}
                  onChangeText={setCostoCompra}
                />
              </View>
            </View>

            <AnimatedButton
              style={[styles.saveBtn, { backgroundColor: '#10b981', marginTop: 15 }]}
              onPress={handleCrearProducto}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="white" /> : (
                <>
                  <CheckCircle2 color="white" size={18} />
                  <Text style={styles.saveBtnText}>Guardar Producto</Text>
                </>
              )}
            </AnimatedButton>
          </View>
        )}

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textMuted }]}>Cargando catálogo...</Text>
          </View>
        ) : (
          <FlatList
            data={productos}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <View style={dynamicStyles.card}>
                <View style={styles.itemHeader}>
                  <View style={styles.itemLeft}>
                    <View style={[styles.iconBox, { backgroundColor: theme.primaryLight }]}>
                      <Package color={theme.primary} size={20} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[dynamicStyles.textTitle, !item.activo && { opacity: 0.5 }]}>{item.nombre}</Text>
                      <Text style={dynamicStyles.textMuted}>Categoría: {item.categoria}</Text>
                    </View>
                  </View>

                  <TouchableOpacity onPress={() => handleEliminarProducto(item.id)}>
                    <Trash2 color="#ef4444" size={18} />
                  </TouchableOpacity>
                </View>

                <View style={styles.itemFooter}>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceTag}>Venta: S/ {Number(item.precio_venta).toFixed(2)}</Text>
                    {item.costo_compra > 0 && (
                      <Text style={[styles.costTag, { color: theme.textMuted }]}>
                        (Costo: S/ {Number(item.costo_compra).toFixed(2)})
                      </Text>
                    )}
                  </View>

                  <View style={styles.switchRow}>
                    <Text style={[styles.switchLbl, { color: theme.textMuted }]}>
                      {item.activo ? 'Activo' : 'Oculto'}
                    </Text>
                    <Switch
                      value={item.activo}
                      onValueChange={() => handleToggleActivo(item)}
                      trackColor={{ false: '#cbd5e1', true: theme.primary }}
                    />
                  </View>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconBox}>
                  <Tag color="#94a3b8" size={38} />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>Sin productos adicionales</Text>
                <Text style={[styles.emptySub, { color: theme.textMuted }]}>
                  El sistema base cuenta con Agua y Gatorade. Si deseas vender snacks o rehidratantes extra, agrégalos aquí.
                </Text>
                <TouchableOpacity
                  style={[styles.emptyBtn, { backgroundColor: theme.primary }]}
                  onPress={() => setShowAddForm(true)}
                  activeOpacity={0.8}
                >
                  <Plus color="white" size={16} />
                  <Text style={styles.emptyBtnText}>Agregar Producto</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontFamily: fonts.extraBold },
  headerSub: { fontSize: 13, fontFamily: fonts.regular, marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },

  list: { paddingHorizontal: 16, paddingBottom: 40 },

  centerLoading: { paddingVertical: 50, alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 13, fontFamily: fonts.medium },

  label: { fontSize: 13, fontFamily: fonts.bold, marginBottom: 5 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 44, fontSize: 14, fontFamily: fonts.regular, marginBottom: 10 },
  catRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  catChipText: { fontSize: 12, fontFamily: fonts.medium, color: '#64748b' },
  rowPrices: { flexDirection: 'row', gap: 10 },
  saveBtn: { height: 46, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  saveBtnText: { color: 'white', fontFamily: fonts.bold, fontSize: 14 },

  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  iconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },

  itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  priceTag: { fontSize: 14, fontFamily: fonts.bold, color: '#10b981' },
  costTag: { fontSize: 12, fontFamily: fonts.regular },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  switchLbl: { fontSize: 12, fontFamily: fonts.medium },

  emptyContainer: { alignItems: 'center', marginTop: 40, paddingHorizontal: 20 },
  emptyIconBox: { backgroundColor: '#f1f5f9', padding: 18, borderRadius: 20, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontFamily: fonts.bold },
  emptySub: { fontSize: 13, fontFamily: fonts.regular, marginTop: 6, textAlign: 'center', lineHeight: 18 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginTop: 18 },
  emptyBtnText: { color: 'white', fontFamily: fonts.bold, fontSize: 14 }
});
