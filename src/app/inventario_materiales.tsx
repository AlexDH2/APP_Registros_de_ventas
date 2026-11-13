import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import {
  ArrowLeft,
  RefreshCw,
  Search,
  Plus,
  Edit2,
  Package,
  Shirt,
  Layers,
  MapPin,
  Calendar,
  Settings,
  X,
  Check,
  TrendingUp,
} from 'lucide-react-native';
import { useAppTheme } from '../context/ThemeContext';
import { fonts } from '../theme';
import ModalAjustes from '../components/ModalAjustes';
import {
  MaterialSede,
  IndumentariaSede,
  MESES_OFICIALES,
  TALLAS_OFICIALES,
  fetchSedesInventario,
  fetchMaterialesPorSede,
  guardarMaterialSede,
  fetchIndumentariaTodasSedes,
  guardarIndumentariaSede,
} from '../lib/materialesService';

export default function InventarioMaterialesScreen() {
  const { theme, isDark } = useAppTheme();
  const [modalAjustesVisible, setModalAjustesVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'MATERIALES' | 'INDUMENTARIA'>('MATERIALES');

  // Estados de Sedes y Filtros
  const [sedesList, setSedesList] = useState<string[]>(['TRINIDAD', 'LIBERTADOR', 'ELVIRA', 'LICEO']);
  const [sedeSeleccionada, setSedeSeleccionada] = useState<string>('TRINIDAD');
  const [busqueda, setBusqueda] = useState<string>('');
  const [mesActivo, setMesActivo] = useState<string>('marzo');

  // Datos en vivo
  const [loading, setLoading] = useState<boolean>(true);
  const [guardando, setGuardando] = useState<boolean>(false);
  const [materiales, setMateriales] = useState<MaterialSede[]>([]);
  const [indumentariaList, setIndumentariaList] = useState<IndumentariaSede[]>([]);

  // Modales
  const [modalNuevoMaterial, setModalNuevoMaterial] = useState<boolean>(false);
  const [modalEditarIndumentaria, setModalEditarIndumentaria] = useState<boolean>(false);
  const [modalNuevaSede, setModalNuevaSede] = useState<boolean>(false);
  const [modalEditarMeses, setModalEditarMeses] = useState<boolean>(false);

  // Formulario Nuevo Material
  const [formMaterialNombre, setFormMaterialNombre] = useState<string>('');
  const [formMaterialCategoria, setFormMaterialCategoria] = useState<string>('Conos');
  const [formMaterialCantidad, setFormMaterialCantidad] = useState<string>('0');

  // Edición de Material Seleccionado
  const [materialEnEdicion, setMaterialEnEdicion] = useState<MaterialSede | null>(null);
  const [mesesValores, setMesesValores] = useState<Record<string, string>>({});

  // Formulario Edición Indumentaria
  const [indumentariaEnEdicion, setIndumentariaEnEdicion] = useState<IndumentariaSede | null>(null);
  const [tallasValores, setTallasValores] = useState<Record<string, string>>({});

  // Formulario Nueva Sede
  const [nuevaSedeInput, setNuevaSedeInput] = useState<string>('');

  useFocusEffect(
    useCallback(() => {
      cargarTodo();
    }, [sedeSeleccionada])
  );

  const cargarTodo = async () => {
    try {
      setLoading(true);
      const sedes = await fetchSedesInventario();
      if (sedes.length > 0) setSedesList(sedes);

      const mats = await fetchMaterialesPorSede(sedeSeleccionada);
      setMateriales(mats);

      const indus = await fetchIndumentariaTodasSedes();
      setIndumentariaList(indus);
    } catch (e) {
      console.error('Error al cargar inventario de materiales:', e);
    } finally {
      setLoading(false);
    }
  };

  // Filtrado de materiales por buscador
  const materialesFiltrados = useMemo(() => {
    if (!busqueda.trim()) return materiales;
    const term = busqueda.toLowerCase().trim();
    return materiales.filter(
      (m) =>
        m.material_nombre.toLowerCase().includes(term) ||
        (m.categoria && m.categoria.toLowerCase().includes(term))
    );
  }, [materiales, busqueda]);

  // Totales de la sede activa
  const totalCantidadMesActivo = useMemo(() => {
    return materiales.reduce((acc, m) => acc + ((m as any)[mesActivo] || 0), 0);
  }, [materiales, mesActivo]);

  // Manejador: Ajuste rápido (+ / -) de un material en el mes activo
  const handleAjusteRapido = async (material: MaterialSede, delta: number) => {
    const valorActual = (material as any)[mesActivo] || 0;
    const nuevoValor = Math.max(0, valorActual + delta);

    // Actualización optimista local
    setMateriales((prev) =>
      prev.map((m) =>
        m.id === material.id || m.material_nombre === material.material_nombre
          ? { ...m, [mesActivo]: nuevoValor }
          : m
      )
    );

    try {
      await guardarMaterialSede({
        ...material,
        sede_nombre: sedeSeleccionada,
        [mesActivo]: nuevoValor,
      });
    } catch (e) {
      console.error('Error al ajustar cantidad rápida:', e);
      Alert.alert('Error', 'No se pudo actualizar el stock en Supabase.');
      cargarTodo();
    }
  };

  // Manejador: Abrir modal de edición de todos los meses de un material
  const handleAbrirEditarMeses = (material: MaterialSede) => {
    setMaterialEnEdicion(material);
    const valores: Record<string, string> = {};
    MESES_OFICIALES.forEach((m) => {
      valores[m.key] = String((material as any)[m.key] || 0);
    });
    setMesesValores(valores);
    setModalEditarMeses(true);
  };

  const handleGuardarEdicionMeses = async () => {
    if (!materialEnEdicion) return;
    try {
      setGuardando(true);
      const payload: any = {
        ...materialEnEdicion,
        sede_nombre: sedeSeleccionada,
      };
      MESES_OFICIALES.forEach((m) => {
        payload[m.key] = parseInt(mesesValores[m.key] || '0', 10) || 0;
      });

      await guardarMaterialSede(payload);
      setModalEditarMeses(false);
      cargarTodo();
      Alert.alert('Éxito', 'Cantidades mensuales actualizadas correctamente.');
    } catch (e) {
      Alert.alert('Error', 'No se pudieron guardar los cambios.');
    } finally {
      setGuardando(false);
    }
  };

  // Manejador: Crear nuevo material en la sede activa
  const handleCrearNuevoMaterial = async () => {
    if (!formMaterialNombre.trim()) {
      Alert.alert('Campo Requerido', 'Ingresa el nombre del material.');
      return;
    }

    try {
      setGuardando(true);
      const cant = parseInt(formMaterialCantidad || '0', 10) || 0;
      await guardarMaterialSede({
        sede_nombre: sedeSeleccionada,
        material_nombre: formMaterialNombre.trim(),
        categoria: formMaterialCategoria,
        [mesActivo]: cant,
      });

      setModalNuevoMaterial(false);
      setFormMaterialNombre('');
      setFormMaterialCantidad('0');
      cargarTodo();
      Alert.alert('Material Registrado', `Se agregó "${formMaterialNombre.trim()}" a ${sedeSeleccionada}.`);
    } catch (e) {
      Alert.alert('Error', 'No se pudo registrar el material.');
    } finally {
      setGuardando(false);
    }
  };

  // Manejador: Abrir modal de edición de tallas para una sede
  const handleAbrirEditarIndumentaria = (indu: IndumentariaSede) => {
    setIndumentariaEnEdicion(indu);
    const valores: Record<string, string> = {};
    TALLAS_OFICIALES.forEach((t) => {
      valores[t.key] = String((indu as any)[t.key] || 0);
    });
    setTallasValores(valores);
    setModalEditarIndumentaria(true);
  };

  const handleGuardarEdicionIndumentaria = async () => {
    if (!indumentariaEnEdicion) return;
    try {
      setGuardando(true);
      const tallasNumericas: Record<string, number> = {};
      TALLAS_OFICIALES.forEach((t) => {
        tallasNumericas[t.key] = parseInt(tallasValores[t.key] || '0', 10) || 0;
      });

      await guardarIndumentariaSede(indumentariaEnEdicion.sede_nombre, tallasNumericas);
      setModalEditarIndumentaria(false);
      cargarTodo();
      Alert.alert('Éxito', `Stock de tallas para ${indumentariaEnEdicion.sede_nombre} actualizado.`);
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar la indumentaria.');
    } finally {
      setGuardando(false);
    }
  };

  // Manejador: Agregar nueva sede
  const handleAgregarNuevaSede = () => {
    if (!nuevaSedeInput.trim()) {
      Alert.alert('Nombre Requerido', 'Por favor escribe el nombre de la sede.');
      return;
    }
    const nombreLimpio = nuevaSedeInput.toUpperCase().trim();
    if (!sedesList.includes(nombreLimpio)) {
      setSedesList((prev) => [...prev, nombreLimpio]);
    }
    setSedeSeleccionada(nombreLimpio);
    setNuevaSedeInput('');
    setModalNuevaSede(false);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Barra Superior */}
        <View style={[styles.topBar, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: theme.surface }]}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color={theme.text} />
          </TouchableOpacity>

          <View style={styles.topBarCenter}>
            <Text style={[styles.topBarTitle, { color: theme.text }]}>Inventario por Sede</Text>
            <Text style={styles.topBarSub}>Materiales Deportivos & Indumentaria</Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: theme.surface }]}
              onPress={cargarTodo}
              disabled={loading}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <RefreshCw size={18} color={theme.text} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: theme.surface }]}
              onPress={() => setModalAjustesVisible(true)}
              activeOpacity={0.7}
            >
              <Settings size={18} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Pestañas Principales: Materiales vs Indumentaria */}
        <View style={[styles.tabsHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity
            style={[
              styles.tabHeaderBtn,
              activeTab === 'MATERIALES' && { borderBottomColor: theme.primary, borderBottomWidth: 3 },
            ]}
            onPress={() => setActiveTab('MATERIALES')}
          >
            <Package
              size={17}
              color={activeTab === 'MATERIALES' ? theme.primary : theme.textMuted}
            />
            <Text
              style={[
                styles.tabHeaderText,
                { color: activeTab === 'MATERIALES' ? theme.primary : theme.textMuted },
                activeTab === 'MATERIALES' && { fontFamily: fonts.bold },
              ]}
            >
              Materiales Deportivos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabHeaderBtn,
              activeTab === 'INDUMENTARIA' && { borderBottomColor: theme.primary, borderBottomWidth: 3 },
            ]}
            onPress={() => setActiveTab('INDUMENTARIA')}
          >
            <Shirt
              size={17}
              color={activeTab === 'INDUMENTARIA' ? theme.primary : theme.textMuted}
            />
            <Text
              style={[
                styles.tabHeaderText,
                { color: activeTab === 'INDUMENTARIA' ? theme.primary : theme.textMuted },
                activeTab === 'INDUMENTARIA' && { fontFamily: fonts.bold },
              ]}
            >
              Indumentaria & Tallas
            </Text>
          </TouchableOpacity>
        </View>

        {/* ================= CONTENIDO PESTAÑA 1: MATERIALES DEPORTIVOS ================= */}
        {activeTab === 'MATERIALES' && (
          <ScrollView
            contentContainerStyle={styles.scrollBody}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* 1. Selector Horizontal de Sede */}
            <View style={styles.selectorSedeContainer}>
              <View style={styles.sectionHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MapPin size={16} color={theme.primary} />
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Sede Seleccionada:</Text>
                </View>
                <TouchableOpacity
                  style={[styles.btnMiniNuevaSede, { borderColor: theme.primary }]}
                  onPress={() => setModalNuevaSede(true)}
                >
                  <Plus size={13} color={theme.primary} />
                  <Text style={[styles.btnMiniNuevaSedeText, { color: theme.primary }]}>+ Nueva Sede</Text>
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sedesChipsScroll}>
                {sedesList.map((sede) => {
                  const activa = sedeSeleccionada === sede;
                  return (
                    <TouchableOpacity
                      key={sede}
                      style={[
                        styles.sedeChip,
                        { backgroundColor: theme.surface, borderColor: theme.border },
                        activa && { backgroundColor: theme.primary, borderColor: theme.primary },
                      ]}
                      onPress={() => setSedeSeleccionada(sede)}
                    >
                      <Text
                        style={[
                          styles.sedeChipText,
                          { color: theme.text },
                          activa && { color: '#ffffff', fontFamily: fonts.bold },
                        ]}
                      >
                        {sede}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* 2. Selector Horizontal de Mes */}
            <View style={styles.selectorMesContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Calendar size={15} color="#f59e0b" />
                <Text style={[styles.mesTitleLabel, { color: theme.text }]}>Mes de Consulta y Control:</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mesesChipsScroll}>
                {MESES_OFICIALES.map((m) => {
                  const activo = mesActivo === m.key;
                  return (
                    <TouchableOpacity
                      key={m.key}
                      style={[
                        styles.mesChip,
                        { backgroundColor: theme.surface, borderColor: theme.border },
                        activo && { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
                      ]}
                      onPress={() => setMesActivo(m.key)}
                    >
                      <Text
                        style={[
                          styles.mesChipText,
                          { color: theme.textMuted },
                          activo && { color: '#0d1b2a', fontFamily: fonts.bold },
                        ]}
                      >
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* 3. Tarjetas KPI Métricas */}
            <View style={styles.kpiRow}>
              <View style={[styles.kpiCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.kpiNumber, { color: theme.primary }]}>{materiales.length}</Text>
                <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>Materiales en {sedeSeleccionada}</Text>
              </View>
              <View style={[styles.kpiCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.kpiNumber, { color: '#10b981' }]}>{totalCantidadMesActivo}</Text>
                <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>
                  Unidades en {mesActivo.toUpperCase()}
                </Text>
              </View>
            </View>

            {/* 4. Buscador y Botón Agregar Material */}
            <View style={styles.actionsBar}>
              <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Search size={16} color={theme.textMuted} />
                <TextInput
                  style={[styles.searchInput, { color: theme.text }]}
                  placeholder="Buscar conos, aros, inflador..."
                  placeholderTextColor={theme.textMuted}
                  value={busqueda}
                  onChangeText={setBusqueda}
                />
                {busqueda ? (
                  <TouchableOpacity onPress={() => setBusqueda('')}>
                    <X size={16} color={theme.textMuted} />
                  </TouchableOpacity>
                ) : null}
              </View>

              <TouchableOpacity
                style={[styles.btnAddMaterial, { backgroundColor: theme.primary }]}
                onPress={() => setModalNuevoMaterial(true)}
              >
                <Plus size={18} color="#ffffff" />
                <Text style={styles.btnAddMaterialText}>Material</Text>
              </TouchableOpacity>
            </View>

            {/* 5. Listado de Materiales Deportivos */}
            <View style={styles.materialesList}>
              {materialesFiltrados.length === 0 ? (
                <View style={[styles.emptyBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Package size={36} color={theme.textMuted} />
                  <Text style={[styles.emptyTitle, { color: theme.text }]}>No se encontraron materiales</Text>
                  <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                    Toca en "+ Material" para registrar el inventario de {sedeSeleccionada}.
                  </Text>
                </View>
              ) : (
                materialesFiltrados.map((item, index) => {
                  const cantMesActual = (item as any)[mesActivo] || 0;
                  return (
                    <View
                      key={item.id || index}
                      style={[styles.materialCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                    >
                      <View style={styles.materialCardMain}>
                        <View style={styles.materialBadgeCategory}>
                          <Text style={styles.materialBadgeCategoryText}>{item.categoria || 'Deportivo'}</Text>
                        </View>
                        <Text style={[styles.materialNombre, { color: theme.text }]}>{item.material_nombre}</Text>
                        <Text style={[styles.materialSedeTag, { color: theme.textMuted }]}>
                          📍 {item.sede_nombre}
                        </Text>
                      </View>

                      {/* Contador Rápido del Mes Activo */}
                      <View style={styles.materialCounterCol}>
                        <Text style={[styles.mesColLabel, { color: '#f59e0b' }]}>
                          {mesActivo.substring(0, 3).toUpperCase()}
                        </Text>
                        <View style={styles.counterRow}>
                          <TouchableOpacity
                            style={[styles.btnCounterMini, { backgroundColor: theme.surface, borderColor: theme.border }]}
                            onPress={() => handleAjusteRapido(item, -1)}
                          >
                            <Text style={[styles.btnCounterMiniText, { color: theme.text }]}>-</Text>
                          </TouchableOpacity>

                          <Text style={[styles.counterNumberText, { color: theme.text }]}>{cantMesActual}</Text>

                          <TouchableOpacity
                            style={[styles.btnCounterMini, { backgroundColor: theme.surface, borderColor: theme.border }]}
                            onPress={() => handleAjusteRapido(item, +1)}
                          >
                            <Text style={[styles.btnCounterMiniText, { color: theme.text }]}>+</Text>
                          </TouchableOpacity>
                        </View>

                        {/* Botón para ver y editar todos los meses */}
                        <TouchableOpacity
                          style={[styles.btnVerMeses, { borderColor: theme.border }]}
                          onPress={() => handleAbrirEditarMeses(item)}
                        >
                          <Edit2 size={11} color={theme.primary} />
                          <Text style={[styles.btnVerMesesText, { color: theme.primary }]}>Todos los meses</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
        )}

        {/* ================= CONTENIDO PESTAÑA 2: INDUMENTARIA & TALLAS ================= */}
        {activeTab === 'INDUMENTARIA' && (
          <ScrollView
            contentContainerStyle={styles.scrollBody}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.indumentariaHeaderBox}>
              <View>
                <Text style={[styles.indumentariaTitle, { color: theme.text }]}>
                  Inventario de Indumentaria por Tallas
                </Text>
                <Text style={[styles.indumentariaSub, { color: theme.textMuted }]}>
                  Stock oficial de uniformes distribuido por cada sede
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.btnMiniNuevaSede, { borderColor: theme.primary }]}
                onPress={() => setModalNuevaSede(true)}
              >
                <Plus size={13} color={theme.primary} />
                <Text style={[styles.btnMiniNuevaSedeText, { color: theme.primary }]}>+ Registrar Sede</Text>
              </TouchableOpacity>
            </View>

            {/* Listado de Tarjetas de Indumentaria por Sede */}
            <View style={styles.indumentariaCardsContainer}>
              {indumentariaList.map((indu) => {
                return (
                  <View
                    key={indu.id || indu.sede_nombre}
                    style={[styles.induCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                  >
                    <View style={styles.induCardHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <MapPin size={17} color={theme.primary} />
                        <Text style={[styles.induCardSede, { color: theme.text }]}>{indu.sede_nombre}</Text>
                      </View>
                      <View style={styles.induTotalBadge}>
                        <Text style={styles.induTotalBadgeText}>{indu.total || 0} prendas</Text>
                      </View>
                    </View>

                    {/* Matriz de Tallas (Talla 10 a XXL) */}
                    <View style={styles.tallasGrid}>
                      {TALLAS_OFICIALES.map((t) => {
                        const cant = (indu as any)[t.key] || 0;
                        return (
                          <View
                            key={t.key}
                            style={[
                              styles.tallaBox,
                              { backgroundColor: theme.surface, borderColor: theme.border },
                              cant > 0 && { borderColor: '#f59e0b' },
                            ]}
                          >
                            <Text style={[styles.tallaKey, { color: theme.textMuted }]}>
                              {t.label.replace('Talla ', 'T')}
                            </Text>
                            <Text
                              style={[
                                styles.tallaVal,
                                { color: theme.text },
                                cant > 0 && { color: '#f59e0b', fontFamily: fonts.bold },
                              ]}
                            >
                              {cant}
                            </Text>
                          </View>
                        );
                      })}
                    </View>

                    {/* Botón Editar Tallas */}
                    <TouchableOpacity
                      style={[styles.btnEditarTallasSede, { backgroundColor: theme.surface, borderColor: theme.border }]}
                      onPress={() => handleAbrirEditarIndumentaria(indu)}
                    >
                      <Edit2 size={14} color={theme.primary} />
                      <Text style={[styles.btnEditarTallasSedeText, { color: theme.primary }]}>
                        Modificar Stock de Tallas
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      {/* ================= MODAL 1: AGREGAR NUEVO MATERIAL ================= */}
      <Modal visible={modalNuevoMaterial} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Nuevo Material en {sedeSeleccionada}</Text>
              <TouchableOpacity onPress={() => setModalNuevoMaterial(false)}>
                <X size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.text }]}>Nombre del Material *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                placeholder="Ej: Balones de Básquet N° 6"
                placeholderTextColor={theme.textMuted}
                value={formMaterialNombre}
                onChangeText={setFormMaterialNombre}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.text }]}>Categoría</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
                {['Conos', 'Aros', 'Platos', 'Escaleras', 'Varillas', 'Balones', 'Accesorios', 'Seguridad'].map((cat) => {
                  const sel = formMaterialCategoria === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.catOptionChip,
                        { backgroundColor: theme.surface, borderColor: theme.border },
                        sel && { backgroundColor: theme.primary, borderColor: theme.primary },
                      ]}
                      onPress={() => setFormMaterialCategoria(cat)}
                    >
                      <Text style={[styles.catOptionChipText, { color: sel ? '#ffffff' : theme.text }]}>{cat}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.text }]}>Cantidad Inicial para {mesActivo.toUpperCase()}</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                placeholder="0"
                placeholderTextColor={theme.textMuted}
                keyboardType="numeric"
                value={formMaterialCantidad}
                onChangeText={setFormMaterialCantidad}
              />
            </View>

            <TouchableOpacity
              style={[styles.btnGuardarModal, { backgroundColor: theme.primary }]}
              onPress={handleCrearNuevoMaterial}
              disabled={guardando}
            >
              {guardando ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.btnGuardarModalText}>Guardar Material</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL 2: EDITAR MESES DE UN MATERIAL ================= */}
      <Modal visible={modalEditarMeses} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentLarge, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.text }]}>{materialEnEdicion?.material_nombre}</Text>
                <Text style={[styles.modalSub, { color: theme.textMuted }]}>
                  Cantidades mensuales en {materialEnEdicion?.sede_nombre}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalEditarMeses(false)}>
                <X size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              <View style={styles.gridMesesEdicion}>
                {MESES_OFICIALES.map((m) => (
                  <View key={m.key} style={styles.mesEdicionItem}>
                    <Text style={[styles.mesEdicionLabel, { color: theme.text }]}>{m.label}</Text>
                    <TextInput
                      style={[styles.mesEdicionInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                      keyboardType="numeric"
                      value={mesesValores[m.key] || '0'}
                      onChangeText={(val) => setMesesValores((prev) => ({ ...prev, [m.key]: val }))}
                    />
                  </View>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.btnGuardarModal, { backgroundColor: theme.primary, marginTop: 14 }]}
              onPress={handleGuardarEdicionMeses}
              disabled={guardando}
            >
              {guardando ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.btnGuardarModalText}>Actualizar Todos los Meses</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL 3: EDITAR TALLAS DE INDUMENTARIA ================= */}
      <Modal visible={modalEditarIndumentaria} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentLarge, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Tallas: {indumentariaEnEdicion?.sede_nombre}</Text>
                <Text style={[styles.modalSub, { color: theme.textMuted }]}>
                  Modifica las unidades de uniformes disponibles
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalEditarIndumentaria(false)}>
                <X size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              <View style={styles.gridMesesEdicion}>
                {TALLAS_OFICIALES.map((t) => (
                  <View key={t.key} style={styles.mesEdicionItem}>
                    <Text style={[styles.mesEdicionLabel, { color: theme.text }]}>{t.label}</Text>
                    <TextInput
                      style={[styles.mesEdicionInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                      keyboardType="numeric"
                      value={tallasValores[t.key] || '0'}
                      onChangeText={(val) => setTallasValores((prev) => ({ ...prev, [t.key]: val }))}
                    />
                  </View>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.btnGuardarModal, { backgroundColor: theme.primary, marginTop: 14 }]}
              onPress={handleGuardarEdicionIndumentaria}
              disabled={guardando}
            >
              {guardando ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.btnGuardarModalText}>Guardar Stock de Tallas</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL 4: REGISTRAR NUEVA SEDE ================= */}
      <Modal visible={modalNuevaSede} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Registrar Nueva Sede</Text>
              <TouchableOpacity onPress={() => setModalNuevaSede(false)}>
                <X size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.text }]}>Nombre de la Sede *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                placeholder="Ej: POLIDEPORTIVO SUR"
                placeholderTextColor={theme.textMuted}
                autoCapitalize="characters"
                value={nuevaSedeInput}
                onChangeText={setNuevaSedeInput}
              />
            </View>

            <TouchableOpacity
              style={[styles.btnGuardarModal, { backgroundColor: theme.primary }]}
              onPress={handleAgregarNuevaSede}
            >
              <Text style={styles.btnGuardarModalText}>Agregar Sede al Inventario</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Ajustes & Tema */}
      <ModalAjustes
        visible={modalAjustesVisible}
        onClose={() => setModalAjustesVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
  },
  topBarCenter: {
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
  },
  topBarSub: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: '#f59e0b',
  },
  tabsHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabHeaderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  tabHeaderText: {
    fontSize: 13,
    fontFamily: fonts.medium,
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 40,
  },
  selectorSedeContainer: {
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: fonts.bold,
  },
  btnMiniNuevaSede: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  btnMiniNuevaSedeText: {
    fontSize: 11,
    fontFamily: fonts.bold,
  },
  sedesChipsScroll: {
    flexDirection: 'row',
  },
  sedeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
  },
  sedeChipText: {
    fontSize: 12,
    fontFamily: fonts.medium,
  },
  selectorMesContainer: {
    marginBottom: 16,
  },
  mesTitleLabel: {
    fontSize: 12,
    fontFamily: fonts.medium,
  },
  mesesChipsScroll: {
    flexDirection: 'row',
  },
  mesChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 6,
  },
  mesChipText: {
    fontSize: 11,
    fontFamily: fonts.medium,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  kpiNumber: {
    fontSize: 22,
    fontFamily: fonts.bold,
  },
  kpiLabel: {
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 2,
    textAlign: 'center',
  },
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.regular,
  },
  btnAddMaterial: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnAddMaterialText: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: fonts.bold,
  },
  materialesList: {
    gap: 10,
  },
  emptyBox: {
    padding: 30,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    textAlign: 'center',
    marginTop: 4,
  },
  materialCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  materialCardMain: {
    flex: 1,
    marginRight: 10,
  },
  materialBadgeCategory: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  materialBadgeCategoryText: {
    color: '#3b82f6',
    fontSize: 10,
    fontFamily: fonts.bold,
  },
  materialNombre: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
  },
  materialSedeTag: {
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  materialCounterCol: {
    alignItems: 'center',
  },
  mesColLabel: {
    fontSize: 10,
    fontFamily: fonts.bold,
    marginBottom: 2,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnCounterMini: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCounterMiniText: {
    fontSize: 16,
    fontFamily: fonts.bold,
  },
  counterNumberText: {
    fontSize: 15,
    fontFamily: fonts.bold,
    minWidth: 24,
    textAlign: 'center',
  },
  btnVerMeses: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  btnVerMesesText: {
    fontSize: 10,
    fontFamily: fonts.medium,
  },
  indumentariaHeaderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  indumentariaTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
  },
  indumentariaSub: {
    fontSize: 11,
    fontFamily: fonts.regular,
  },
  indumentariaCardsContainer: {
    gap: 12,
  },
  induCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  induCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  induCardSede: {
    fontSize: 15,
    fontFamily: fonts.bold,
  },
  induTotalBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  induTotalBadgeText: {
    color: '#0d1b2a',
    fontSize: 11,
    fontFamily: fonts.bold,
  },
  tallasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  tallaBox: {
    flexBasis: '18%',
    flexGrow: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  tallaKey: {
    fontSize: 10,
    fontFamily: fonts.medium,
  },
  tallaVal: {
    fontSize: 13,
    fontFamily: fonts.bold,
    marginTop: 2,
  },
  btnEditarTallasSede: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  btnEditarTallasSedeText: {
    fontSize: 12,
    fontFamily: fonts.bold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
  modalContentLarge: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
  },
  modalSub: {
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  formGroup: {
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 12,
    fontFamily: fonts.medium,
    marginBottom: 6,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    fontFamily: fonts.regular,
  },
  catOptionChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 6,
  },
  catOptionChipText: {
    fontSize: 11,
    fontFamily: fonts.medium,
  },
  btnGuardarModal: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  btnGuardarModalText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: fonts.bold,
  },
  gridMesesEdicion: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  mesEdicionItem: {
    flexBasis: '47%',
    flexGrow: 1,
  },
  mesEdicionLabel: {
    fontSize: 11,
    fontFamily: fonts.medium,
    marginBottom: 4,
  },
  mesEdicionInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    fontFamily: fonts.bold,
    textAlign: 'center',
  },
});
