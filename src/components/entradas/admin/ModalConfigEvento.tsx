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
} from 'react-native';
import { Settings, X, DollarSign, Users, MapPin, Tag } from 'lucide-react-native';
import { Evento } from '../../../types/entradas';
import { fonts } from '../../../theme';
import AnimatedButton from '../../AnimatedButton';

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

  useEffect(() => {
    if (visible && evento) {
      setNombre(evento.nombre);
      setLugar(evento.lugar || '');
      setPrecio(evento.precio_entrada.toString());
      setAforo(evento.aforo_maximo ? evento.aforo_maximo.toString() : '');
    } else if (visible && !evento) {
      setNombre('');
      setLugar('');
      setPrecio('');
      setAforo('');
    }
  }, [visible, evento]);

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
            {/* Nombre */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>
                Nombre del Evento <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View style={[styles.inputBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
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

            {/* Lugar */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>Lugar / Sede (Opcional)</Text>
              <View style={[styles.inputBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <MapPin size={15} color={theme.textMuted} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Ej: Estadio Central"
                  placeholderTextColor={theme.textMuted}
                  value={lugar}
                  onChangeText={setLugar}
                  editable={!guardando}
                />
              </View>
            </View>

            {/* Precio Unitario */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>
                Precio por Entrada (S/.) <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View style={[styles.inputBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
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

            {/* Aforo Máximo */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>
                Aforo Máximo (Vacío para Ilimitado)
              </Text>
              <View style={[styles.inputBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
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

          {/* Botones */}
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
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
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
    gap: 10,
    marginBottom: 16,
  },
  fieldGroup: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 12,
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
    height: 42,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.regular,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
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
