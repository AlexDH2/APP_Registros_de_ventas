import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import {
  Settings,
  X,
  DollarSign,
  Users,
  MapPin,
  Tag,
  ChevronDown,
  ChevronUp,
  Check,
  Building2,
  Edit3,
} from 'lucide-react-native';
import { Evento } from '../../../types/entradas';
import { fonts } from '../../../theme';
import AnimatedButton from '../../AnimatedButton';
import { supabase } from '../../../lib/supabase';

interface ModalConfigEventoProps {
  visible: boolean;
  evento: Evento | null;
  theme: any;
  onClose: () => void;
  onSave: (datos: {
    id?: number;
    nombre: string;
    lugar?: string;
    precio_entrada: number;
    aforo_maximo?: number | null;
  }) => Promise<void>;
}

export default function ModalConfigEvento({
  visible,
  evento,
  theme,
  onClose,
  onSave,
}: ModalConfigEventoProps) {
  const [nombre, setNombre] = useState<string>('');
  const [lugar, setLugar] = useState<string>('');
  const [precio, setPrecio] = useState<string>('');
  const [aforo, setAforo] = useState<string>('');
  const [guardando, setGuardando] = useState<boolean>(false);

  // Lista de Sedes registradas en BD y estado del desplegable
  const [sedesList, setSedesList] = useState<{ id: number; nombre: string }[]>([]);
  const [cargandoSedes, setCargandoSedes] = useState<boolean>(false);
  const [desplegableAbierto, setDesplegableAbierto] = useState<boolean>(false);
  const [modoPersonalizado, setModoPersonalizado] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      cargarSedes();
      if (evento) {
        setNombre(evento.nombre);
        setLugar(evento.lugar || '');
        setPrecio(evento.precio_entrada.toString());
        setAforo(evento.aforo_maximo ? evento.aforo_maximo.toString() : '');
      } else {
        setNombre('');
        setLugar('');
        setPrecio('');
        setAforo('');
      }
      setDesplegableAbierto(false);
      setModoPersonalizado(false);
    }
  }, [visible, evento]);

  const cargarSedes = async () => {
    try {
      setCargandoSedes(true);
      const { data, error } = await supabase
        .from('sedes')
        .select('id, nombre')
        .order('nombre', { ascending: true });

      if (error) throw error;
      if (data) {
        setSedesList(data);
      }
    } catch (e) {
      console.warn('Error al cargar sedes:', e);
    } finally {
      setCargandoSedes(false);
    }
  };

  const handleSeleccionarSede = (nombreSede: string) => {
    setLugar(nombreSede);
    setDesplegableAbierto(false);
    setModoPersonalizado(false);
  };

  const handleActivarPersonalizado = () => {
    setDesplegableAbierto(false);
    setModoPersonalizado(true);
  };

  const handleGuardar = async () => {
    if (!nombre.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingresa el nombre del evento.');
      return;
    }

    const precioNum = parseFloat(precio);
    if (isNaN(precioNum) || precioNum <= 0) {
      Alert.alert(
        'Precio inválido',
        'El precio de la entrada debe ser un número positivo (ej. 15.00).'
      );
      return;
    }

    const aforoNum = aforo.trim() ? parseInt(aforo, 10) : null;
    if (aforo.trim() && (isNaN(aforoNum!) || aforoNum! <= 0)) {
      Alert.alert('Aforo inválido', 'El aforo máximo debe ser un número entero mayor a 0.');
      return;
    }

    try {
      setGuardando(true);
      await onSave({
        id: evento?.id,
        nombre: nombre.trim(),
        lugar: lugar.trim() || undefined,
        precio_entrada: precioNum,
        aforo_maximo: aforoNum,
      });
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo guardar la configuración.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <Settings size={18} color={theme.primary} />
                <Text style={[styles.title, { color: theme.text }]}>
                  {evento ? 'Configurar Evento en DB' : 'Crear Evento en DB'}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} disabled={guardando}>
                <X size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              Los cambios de precio, nombre y aforo se actualizan directamente en la base de datos y
              se reflejan en tiempo real para todos los colaboradores.
            </Text>

            {/* Formulario */}
            <View style={styles.form}>
              {/* 1. Nombre del Evento */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.text }]}>
                  Nombre del Evento <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <View
                  style={[
                    styles.inputBox,
                    { backgroundColor: theme.background, borderColor: theme.border },
                  ]}
                >
                  <Tag size={15} color={theme.textMuted} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Ej: Gran Torneo de Fútbol 2026"
                    placeholderTextColor={theme.textMuted}
                    value={nombre}
                    onChangeText={setNombre}
                    editable={!guardando}
                  />
                </View>
              </View>

              {/* 2. Lugar / Desplegable de Sedes Registradas */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelWithAction}>
                  <Text style={[styles.fieldLabel, { color: theme.text }]}>
                    Lugar / Sede del Evento
                  </Text>
                  {modoPersonalizado ? (
                    <TouchableOpacity
                      onPress={() => {
                        setModoPersonalizado(false);
                        setDesplegableAbierto(true);
                      }}
                    >
                      <Text style={[styles.actionLink, { color: theme.primary }]}>
                        Ver sedes registradas
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={handleActivarPersonalizado}>
                      <Text style={[styles.actionLink, { color: theme.textMuted }]}>
                        Escribir otro lugar
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {modoPersonalizado ? (
                  /* Modo Entrada Libre / Personalizado */
                  <View
                    style={[
                      styles.inputBox,
                      { backgroundColor: theme.background, borderColor: theme.border },
                    ]}
                  >
                    <MapPin size={15} color={theme.primary} />
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      placeholder="Ej: Estadio Nacional, Coliseo, etc."
                      placeholderTextColor={theme.textMuted}
                      value={lugar}
                      onChangeText={setLugar}
                      editable={!guardando}
                      autoFocus
                    />
                  </View>
                ) : (
                  /* Modo Desplegable con Sedes de la BD */
                  <View>
                    <TouchableOpacity
                      style={[
                        styles.dropdownTrigger,
                        {
                          backgroundColor: theme.background,
                          borderColor: desplegableAbierto ? theme.primary : theme.border,
                        },
                      ]}
                      onPress={() => setDesplegableAbierto(!desplegableAbierto)}
                      disabled={guardando}
                    >
                      <View style={styles.dropdownTriggerLeft}>
                        <MapPin size={16} color={lugar ? theme.primary : theme.textMuted} />
                        <Text
                          style={[
                            styles.dropdownTriggerText,
                            { color: lugar ? theme.text : theme.textMuted },
                          ]}
                          numberOfLines={1}
                        >
                          {lugar || 'Seleccionar sede registrada...'}
                        </Text>
                      </View>
                      {cargandoSedes ? (
                        <ActivityIndicator size="small" color={theme.primary} />
                      ) : desplegableAbierto ? (
                        <ChevronUp size={18} color={theme.primary} />
                      ) : (
                        <ChevronDown size={18} color={theme.textMuted} />
                      )}
                    </TouchableOpacity>

                    {/* Menú Desplegable con Sedes */}
                    {desplegableAbierto && (
                      <View
                        style={[
                          styles.dropdownMenu,
                          { backgroundColor: theme.card, borderColor: theme.border },
                        ]}
                      >
                        {sedesList.length === 0 && !cargandoSedes ? (
                          <Text style={[styles.dropdownEmptyText, { color: theme.textMuted }]}>
                            No hay sedes registradas en la base de datos.
                          </Text>
                        ) : (
                          sedesList.map((sede) => {
                            const isSelected = lugar.trim() === sede.nombre.trim();
                            return (
                              <TouchableOpacity
                                key={sede.id}
                                style={[
                                  styles.dropdownItem,
                                  {
                                    backgroundColor: isSelected
                                      ? theme.primaryLight
                                      : 'transparent',
                                    borderBottomColor: theme.border,
                                  },
                                ]}
                                onPress={() => handleSeleccionarSede(sede.nombre)}
                              >
                                <View style={styles.dropdownItemLeft}>
                                  <Building2
                                    size={15}
                                    color={isSelected ? theme.primary : theme.textMuted}
                                  />
                                  <Text
                                    style={[
                                      styles.dropdownItemText,
                                      {
                                        color: isSelected ? theme.primary : theme.text,
                                        fontFamily: isSelected ? fonts.bold : fonts.medium,
                                      },
                                    ]}
                                  >
                                    {sede.nombre}
                                  </Text>
                                </View>
                                {isSelected && <Check size={16} color={theme.primary} />}
                              </TouchableOpacity>
                            );
                          })
                        )}

                        {/* Opción al final para ingresar sede no registrada */}
                        <TouchableOpacity
                          style={[styles.dropdownItemCustom, { borderTopColor: theme.border }]}
                          onPress={handleActivarPersonalizado}
                        >
                          <Edit3 size={14} color={theme.primary} />
                          <Text style={[styles.dropdownItemCustomText, { color: theme.primary }]}>
                            Escribir otro lugar o estadio...
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* 3. Precio Unitario */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.text }]}>
                  Precio por Entrada (S/.) <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <View
                  style={[
                    styles.inputBox,
                    { backgroundColor: theme.background, borderColor: theme.border },
                  ]}
                >
                  <DollarSign size={15} color={theme.textMuted} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Ej: 15.00"
                    placeholderTextColor={theme.textMuted}
                    value={precio}
                    onChangeText={setPrecio}
                    keyboardType="decimal-pad"
                    editable={!guardando}
                  />
                </View>
              </View>

              {/* 4. Aforo Máximo */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.text }]}>
                  Aforo Máximo (Vacío para Ilimitado)
                </Text>
                <View
                  style={[
                    styles.inputBox,
                    { backgroundColor: theme.background, borderColor: theme.border },
                  ]}
                >
                  <Users size={15} color={theme.textMuted} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Ej: 500"
                    placeholderTextColor={theme.textMuted}
                    value={aforo}
                    onChangeText={(t) => setAforo(t.replace(/[^0-9]/g, ''))}
                    keyboardType="numeric"
                    editable={!guardando}
                  />
                </View>
              </View>
            </View>

            {/* Botones de Acción */}
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: theme.border }]}
                onPress={onClose}
                disabled={guardando}
              >
                <Text style={[styles.cancelBtnText, { color: theme.text }]}>Cancelar</Text>
              </TouchableOpacity>

              <AnimatedButton
                style={[styles.saveBtn, { backgroundColor: theme.primary }]}
                onPress={handleGuardar}
                disabled={guardando}
              >
                {guardando ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.saveBtnText}>Guardar en BD</Text>
                )}
              </AnimatedButton>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  scrollContent: {
    paddingBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontFamily: fonts.bold,
  },
  subtitle: {
    fontSize: 11,
    fontFamily: fonts.regular,
    lineHeight: 15,
    marginBottom: 14,
  },
  form: {
    gap: 12,
    marginBottom: 16,
  },
  fieldGroup: {
    gap: 4,
  },
  labelWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
  },
  actionLink: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
  },
  requiredAsterisk: {
    color: '#ef4444',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 44,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.regular,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 44,
  },
  dropdownTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  dropdownTriggerText: {
    fontSize: 13,
    fontFamily: fonts.medium,
  },
  dropdownMenu: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  dropdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownItemText: {
    fontSize: 13,
  },
  dropdownItemCustom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopWidth: 1,
  },
  dropdownItemCustomText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
  },
  dropdownEmptyText: {
    padding: 12,
    fontSize: 12,
    textAlign: 'center',
    fontFamily: fonts.regular,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: fonts.bold,
  },
});
