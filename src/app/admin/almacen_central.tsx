import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
  useColorScheme,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors, fonts } from '../../theme';
import AnimatedButton from '../../components/AnimatedButton';
import {
  Building2,
  PackagePlus,
  Droplets,
  Zap,
  DollarSign,
  Receipt,
  Clock,
  History
} from 'lucide-react-native';

export default function AlmacenCentralScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? colors.dark : colors.light;

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'STOCK' | 'COMPRA' | 'HISTORIAL'>('STOCK');

  // Stock Almacén Central
  const [stockCentral, setStockCentral] = useState({ agua: 0, gatorade: 0 });

  // Formulario Compra
  const [proveedor, setProveedor] = useState('');
  const [fardosAgua, setFardosAgua] = useState('');
  const [unidadesPorFardoAgua, setUnidadesPorFardoAgua] = useState('20');
  const [fardosGatorade, setFardosGatorade] = useState('');
  const [unidadesPorFardoGatorade, setUnidadesPorFardoGatorade] = useState('12');
  const [costoTotal, setCostoTotal] = useState('');

  // Historial de Compras
  const [compras, setCompras] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Cargar stock central y sincronizar sede Oficina
      const { data: central } = await supabase.from('almacen_central').select('*').eq('id', 1).single();
      if (central) {
        setStockCentral({ agua: central.agua_stock, gatorade: central.gatorade_stock });

        // Mantener sincronizado el inventario de la sede "Oficina"
        const { data: sedeOfi } = await supabase.from('sedes').select('id').ilike('nombre', 'oficina').single();
        if (sedeOfi) {
          await supabase.from('inventario_bebidas').update({
            agua_cantidad: central.agua_stock,
            gatorade_cantidad: central.gatorade_stock
          }).eq('sede_id', sedeOfi.id);
        }
      }

      // 2. Cargar compras
      const { data: comprasData } = await supabase
        .from('compras_proveedor')
        .select('*')
        .order('fecha', { ascending: false })
        .limit(20);
      setCompras(comprasData || []);
    } catch (e) {
      console.log('Error cargando almacén central:', e);
    } finally {
      setLoading(false);
    }
  };

  const totalAguaCalculada = (parseInt(fardosAgua) || 0) * (parseInt(unidadesPorFardoAgua) || 20);
  const totalGatoradeCalculada = (parseInt(fardosGatorade) || 0) * (parseInt(unidadesPorFardoGatorade) || 12);
  const totalBotellas = totalAguaCalculada + totalGatoradeCalculada;
  const costoTotalNum = parseFloat(costoTotal) || 0;
  const costoUnitarioAprox = totalBotellas > 0 ? costoTotalNum / totalBotellas : 0;

  const handleGuardarCompra = async () => {
    if (!proveedor.trim()) return Alert.alert('Aviso', 'Ingresa el nombre del proveedor');
    if (totalBotellas <= 0) return Alert.alert('Aviso', 'Indica las cantidades compradas');
    if (costoTotalNum <= 0) return Alert.alert('Aviso', 'Indica el costo total de la compra');

    setLoading(true);
    try {
      // 1. Insertar compra
      const { error: compErr } = await supabase.from('compras_proveedor').insert([{
        proveedor: proveedor.trim(),
        agua_comprada: totalAguaCalculada,
        gatorade_comprada: totalGatoradeCalculada,
        costo_total: costoTotalNum,
        costo_unitario_agua: costoUnitarioAprox,
        costo_unitario_gatorade: costoUnitarioAprox,
        registrado_por: 'Administrador'
      }]);
      if (compErr) throw compErr;

      // 2. Sumar a Almacén Central
      const { data: central } = await supabase.from('almacen_central').select('*').eq('id', 1).single();
      const nuevoAgua = (central ? central.agua_stock : 0) + totalAguaCalculada;
      const nuevoGatorade = (central ? central.gatorade_stock : 0) + totalGatoradeCalculada;

      if (central) {
        await supabase.from('almacen_central').update({
          agua_stock: nuevoAgua,
          gatorade_stock: nuevoGatorade,
          ultima_actualizacion: new Date().toISOString()
        }).eq('id', 1);
      } else {
        await supabase.from('almacen_central').insert([{
          id: 1,
          agua_stock: nuevoAgua,
          gatorade_stock: nuevoGatorade
        }]);
      }

      // 3. Sincronizar automáticamente en el inventario de la sede "Oficina"
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

      Alert.alert(
        '¡Compra Registrada!',
        `Se añadieron ${totalAguaCalculada} Aguas y ${totalGatoradeCalculada} Gatorades al Almacén Central y a la sede Oficina.`
      );

      // Limpiar formulario
      setProveedor('');
      setFardosAgua('');
      setFardosGatorade('');
      setCostoTotal('');
      setActiveTab('STOCK');
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo guardar la compra: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const dynamicStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    card: {
      backgroundColor: theme.card,
      borderRadius: 24,
      padding: 22,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 10,
      elevation: 2
    },
    textTitle: { fontFamily: fonts.bold, color: theme.text, fontSize: 18 },
    textMuted: { fontFamily: fonts.regular, color: theme.textMuted, fontSize: 13 },
  });

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <Text style={[styles.headerSub, { color: theme.textMuted }]}>
            Control de inventario central y recepción de compras
          </Text>
        </View>

        {/* Tabs - Segmented Style */}
        <View style={[
          styles.tabBar, 
          { 
            backgroundColor: colorScheme === 'dark' ? '#0f172a' : '#f1f5f9',
            borderColor: colorScheme === 'dark' ? '#334155' : '#e2e8f0',
          }
        ]}>
          <TouchableOpacity
            style={[
              styles.tabItem, 
              activeTab === 'STOCK' && [styles.tabItemActive, { backgroundColor: theme.card }]
            ]}
            onPress={() => setActiveTab('STOCK')}
            activeOpacity={0.7}
          >
            <Building2 
              size={14} 
              color={activeTab === 'STOCK' ? theme.primary : theme.textMuted} 
            />
            <Text 
              numberOfLines={1}
              style={[
                styles.tabText, 
                activeTab === 'STOCK' 
                  ? { color: theme.primary, fontFamily: fonts.bold } 
                  : { color: theme.textMuted }
              ]}
            >
              Stock
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabItem, 
              activeTab === 'COMPRA' && [styles.tabItemActive, { backgroundColor: theme.card }]
            ]}
            onPress={() => setActiveTab('COMPRA')}
            activeOpacity={0.7}
          >
            <PackagePlus 
              size={14} 
              color={activeTab === 'COMPRA' ? theme.primary : theme.textMuted} 
            />
            <Text 
              numberOfLines={1}
              style={[
                styles.tabText, 
                activeTab === 'COMPRA' 
                  ? { color: theme.primary, fontFamily: fonts.bold } 
                  : { color: theme.textMuted }
              ]}
            >
              + Compra
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabItem, 
              activeTab === 'HISTORIAL' && [styles.tabItemActive, { backgroundColor: theme.card }]
            ]}
            onPress={() => setActiveTab('HISTORIAL')}
            activeOpacity={0.7}
          >
            <History 
              size={14} 
              color={activeTab === 'HISTORIAL' ? theme.primary : theme.textMuted} 
            />
            <Text 
              numberOfLines={1}
              style={[
                styles.tabText, 
                activeTab === 'HISTORIAL' 
                  ? { color: theme.primary, fontFamily: fonts.bold } 
                  : { color: theme.textMuted }
              ]}
            >
              Historial {compras.length > 0 ? `(${compras.length})` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={{ padding: 10, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={theme.primary} />
          </View>
        )}

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* ===================== TAB 1: STOCK MATRIZ ===================== */}
          {activeTab === 'STOCK' && (
            <View>
              <View style={[dynamicStyles.card, { backgroundColor: '#0f172a' }]}>
                <View style={styles.matrizHeader}>
                  <Building2 color="#38bdf8" size={28} />
                  <Text style={styles.matrizTitle}>Stock Disponible en Almacén</Text>
                </View>
                <Text style={styles.matrizDesc}>
                  Mercadería lista para ser despachada a las sedes deportivas.
                </Text>

                <View style={styles.matrizGrid}>
                  <View style={styles.matrizItem}>
                    <Droplets color="#38bdf8" size={32} />
                    <Text style={styles.matrizVal}>{stockCentral.agua}</Text>
                    <Text style={styles.matrizLbl}>Agua Mineral</Text>
                  </View>

                  <View style={styles.matrizItem}>
                    <Zap color="#f59e0b" size={32} />
                    <Text style={styles.matrizVal}>{stockCentral.gatorade}</Text>
                    <Text style={styles.matrizLbl}>Gatorade</Text>
                  </View>
                </View>
              </View>

              <AnimatedButton
                style={[styles.btnAction, { backgroundColor: theme.primary }]}
                onPress={() => setActiveTab('COMPRA')}
              >
                <PackagePlus color="white" size={20} />
                <Text style={styles.btnActionText}>Ingresar Nueva Compra a Proveedor</Text>
              </AnimatedButton>
            </View>
          )}

          {/* ===================== TAB 2: REGISTRAR COMPRA ===================== */}
          {activeTab === 'COMPRA' && (
            <View style={dynamicStyles.card}>
              <Text style={[dynamicStyles.textTitle, { marginBottom: 15 }]}>Entrada por Compra Mayorista</Text>

              <Text style={[styles.inputLabel, { color: theme.text }]}>Proveedor / Distribuidora *</Text>
              <TextInput
                style={[styles.inputBox, { borderColor: theme.border, color: theme.text }]}
                placeholder="Ej. Distribuidora San Juan / AJE Group"
                placeholderTextColor={theme.textMuted}
                value={proveedor}
                onChangeText={setProveedor}
              />

              {/* Agua */}
              <Text style={[styles.inputLabel, { color: theme.text, marginTop: 16 }]}>Fardos de Agua Mineral</Text>
              <View style={styles.rowInputs}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.microLabel}>N° de Fardos</Text>
                  <TextInput
                    style={[styles.inputBox, { borderColor: theme.border, color: theme.text }]}
                    placeholder="Ej. 10"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                    value={fardosAgua}
                    onChangeText={setFardosAgua}
                  />
                </View>
                <View style={{ width: 120 }}>
                  <Text style={styles.microLabel}>Botellas x Fardo</Text>
                  <TextInput
                    style={[styles.inputBox, { borderColor: theme.border, color: theme.text }]}
                    placeholder="20"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                    value={unidadesPorFardoAgua}
                    onChangeText={setUnidadesPorFardoAgua}
                  />
                </View>
              </View>
              <Text style={styles.helperText}>= {totalAguaCalculada} botellas de agua en total</Text>

              {/* Gatorade */}
              <Text style={[styles.inputLabel, { color: theme.text, marginTop: 16 }]}>Cajas de Gatorade</Text>
              <View style={styles.rowInputs}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.microLabel}>N° de Cajas</Text>
                  <TextInput
                    style={[styles.inputBox, { borderColor: theme.border, color: theme.text }]}
                    placeholder="Ej. 5"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                    value={fardosGatorade}
                    onChangeText={setFardosGatorade}
                  />
                </View>
                <View style={{ width: 120 }}>
                  <Text style={styles.microLabel}>Botellas x Caja</Text>
                  <TextInput
                    style={[styles.inputBox, { borderColor: theme.border, color: theme.text }]}
                    placeholder="12"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                    value={unidadesPorFardoGatorade}
                    onChangeText={setUnidadesPorFardoGatorade}
                  />
                </View>
              </View>
              <Text style={styles.helperText}>= {totalGatoradeCalculada} botellas de Gatorade en total</Text>

              {/* Costo */}
              <Text style={[styles.inputLabel, { color: theme.text, marginTop: 16 }]}>Costo Total Pagado (S/) *</Text>
              <TextInput
                style={[styles.inputBox, { borderColor: theme.border, color: theme.text }]}
                placeholder="Ej. 180.50"
                placeholderTextColor={theme.textMuted}
                keyboardType="decimal-pad"
                value={costoTotal}
                onChangeText={setCostoTotal}
              />

              {totalBotellas > 0 && costoTotalNum > 0 && (
                <View style={[styles.calcBox, { backgroundColor: theme.primaryLight }]}>
                  <DollarSign color={theme.primary} size={20} />
                  <Text style={[styles.calcText, { color: theme.primary }]}>
                    Costo unitario aprox: S/ {costoUnitarioAprox.toFixed(2)} por botella
                  </Text>
                </View>
              )}

              <AnimatedButton
                style={[styles.btnAction, { backgroundColor: '#10b981', marginTop: 22 }]}
                onPress={handleGuardarCompra}
              >
                <PackagePlus color="white" size={20} />
                <Text style={styles.btnActionText}>Guardar y Sumar a Almacén Central</Text>
              </AnimatedButton>
            </View>
          )}

        {/* ===================== TAB 3: HISTORIAL ===================== */}
        {activeTab === 'HISTORIAL' && (
          <View>
            {compras.length === 0 ? (
              <View style={[dynamicStyles.card, { alignItems: 'center', paddingVertical: 40 }]}>
                <Receipt color="#cbd5e1" size={44} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>Sin compras registradas</Text>
              </View>
            ) : (
              compras.map((item) => (
                <View key={item.id} style={dynamicStyles.card}>
                  <View style={styles.compraHeaderRow}>
                    <Text style={[styles.compraProv, { color: theme.text }]}>{item.proveedor}</Text>
                    <Text style={styles.compraTotal}>S/ {Number(item.costo_total).toFixed(2)}</Text>
                  </View>

                  <Text style={[styles.compraDate, { color: theme.textMuted }]}>
                    {new Date(item.fecha).toLocaleDateString()} • {new Date(item.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>

                  <View style={styles.compraBadges}>
                    <View style={[styles.cBadge, { backgroundColor: '#e0f2fe' }]}>
                      <Droplets color="#0ea5e9" size={14} />
                      <Text style={styles.cBadgeText}>+{item.agua_comprada} Agua</Text>
                    </View>
                    <View style={[styles.cBadge, { backgroundColor: '#fef3c7' }]}>
                      <Zap color="#d97706" size={14} />
                      <Text style={styles.cBadgeText}>+{item.gatorade_comprada} Gatorade</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 12 },
  headerTitle: { fontSize: 24, fontFamily: fonts.extraBold },
  headerSub: { fontSize: 13, fontFamily: fonts.regular, lineHeight: 18 },

  tabBar: { 
    flexDirection: 'row', 
    borderRadius: 14, 
    padding: 3, 
    marginHorizontal: 16, 
    marginBottom: 16, 
    borderWidth: 1,
    height: 44,
    alignItems: 'center',
  },
  tabItem: { 
    flex: 1, 
    height: 36, 
    flexDirection: 'row',
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 6,
    borderRadius: 11,
    paddingHorizontal: 4,
  },
  tabItemActive: { 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 3, 
    elevation: 2 
  },
  tabText: { 
    fontSize: 12, 
    fontFamily: fonts.medium,
    textAlign: 'center',
  },

  scroll: { paddingHorizontal: 16, paddingBottom: 100 },

  matrizHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  matrizTitle: { color: 'white', fontSize: 18, fontFamily: fonts.bold },
  matrizDesc: { color: '#94a3b8', fontSize: 13, fontFamily: fonts.regular, marginBottom: 20 },
  matrizGrid: { flexDirection: 'row', gap: 15 },
  matrizItem: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 18, alignItems: 'center' },
  matrizVal: { color: 'white', fontSize: 28, fontFamily: fonts.extraBold, marginVertical: 6 },
  matrizLbl: { color: '#cbd5e1', fontSize: 13, fontFamily: fonts.medium },

  btnAction: { height: 52, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnActionText: { color: 'white', fontFamily: fonts.bold, fontSize: 15 },

  inputLabel: { fontSize: 14, fontFamily: fonts.bold, marginBottom: 6 },
  microLabel: { fontSize: 11, fontFamily: fonts.semiBold, color: '#64748b', marginBottom: 4 },
  inputBox: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 48, fontSize: 15, fontFamily: fonts.regular },
  rowInputs: { flexDirection: 'row', gap: 10 },
  helperText: { fontSize: 12, color: '#10b981', fontFamily: fonts.medium, marginTop: 4 },

  calcBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, marginTop: 15 },
  calcText: { fontSize: 13, fontFamily: fonts.semiBold },

  compraHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  compraProv: { fontSize: 16, fontFamily: fonts.bold },
  compraTotal: { fontSize: 18, fontFamily: fonts.extraBold, color: '#10b981' },
  compraDate: { fontSize: 12, fontFamily: fonts.regular, marginTop: 2, marginBottom: 10 },
  compraBadges: { flexDirection: 'row', gap: 10 },
  cBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  cBadgeText: { fontSize: 12, fontFamily: fonts.bold, color: '#334155' },

  emptyTitle: { fontSize: 16, fontFamily: fonts.bold, marginTop: 10 }
});
