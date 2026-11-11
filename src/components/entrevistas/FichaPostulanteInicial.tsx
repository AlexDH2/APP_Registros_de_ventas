import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import {
  UserCheck,
  Phone,
  MapPin,
  Calendar,
  AlertCircle,
  ArrowRight,
  FileText,
  ShieldAlert,
} from 'lucide-react-native';
import { fonts } from '../../theme';

export interface DatosFichaPostulante {
  id?: string;
  nombre: string;
  telefono: string;
  distrito: string;
  edad: string;
  notas: string;
  calificacion?: number;
}

interface Props {
  datosIniciales: DatosFichaPostulante;
  onContinuarAlPitch: (datos: DatosFichaPostulante) => void;
  enEdicion?: boolean;
}

export default function FichaPostulanteInicial({
  datosIniciales,
  onContinuarAlPitch,
  enEdicion = false,
}: Props) {
  const [nombre, setNombre] = useState<string>(datosIniciales.nombre || '');
  const [telefono, setTelefono] = useState<string>(datosIniciales.telefono || '');
  const [distrito, setDistrito] = useState<string>(datosIniciales.distrito || '');
  const [edad, setEdad] = useState<string>(datosIniciales.edad || '');
  const [notas, setNotas] = useState<string>(datosIniciales.notas || '');

  useEffect(() => {
    setNombre(datosIniciales.nombre || '');
    setTelefono(datosIniciales.telefono || '');
    setDistrito(datosIniciales.distrito || '');
    setEdad(datosIniciales.edad || '');
    setNotas(datosIniciales.notas || '');
  }, [datosIniciales]);

  const numEdad = parseInt(edad.trim(), 10);
  const esMenorDeEdad = !isNaN(numEdad) && numEdad === 17;

  const handleValidarYContinuar = () => {
    if (!nombre.trim()) {
      Alert.alert('Campo Obligatorio', 'Por favor ingresa los nombres y apellidos completos del postulante.');
      return;
    }

    if (!telefono.trim() || telefono.trim().length < 8) {
      Alert.alert(
        'Teléfono Obligatorio',
        'Por favor ingresa un número de teléfono o WhatsApp válido para contactar al postulante.'
      );
      return;
    }

    if (!distrito.trim()) {
      Alert.alert('Distrito Obligatorio', 'Por favor ingresa el distrito donde reside el postulante.');
      return;
    }

    if (!edad.trim()) {
      Alert.alert('Edad Obligatoria', 'Por favor ingresa la edad del postulante.');
      return;
    }

    if (isNaN(numEdad) || numEdad < 17) {
      Alert.alert(
        'Requisito de Edad',
        'La edad mínima para postular al voluntariado deportivo es de 17 años en adelante.'
      );
      return;
    }

    onContinuarAlPitch({
      id: datosIniciales.id,
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      distrito: distrito.trim(),
      edad: edad.trim(),
      notas: notas.trim(),
      calificacion: datosIniciales.calificacion || 5,
    });
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Encabezado de la Ficha */}
      <View style={styles.cardHeaderBox}>
        <View style={styles.iconCircle}>
          <UserCheck size={28} color="#0d1b2a" />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>PASO 1 OBLIGATORIO</Text>
          </View>
          <Text style={styles.cardTitle}>Ficha de Postulación</Text>
          <Text style={styles.cardSubtitle}>
            Completa los datos del candidato antes de dar la información del pitch y asignar horarios.
          </Text>
        </View>
      </View>

      {/* Formulario */}
      <View style={styles.formCard}>
        {/* Nombres y Apellidos */}
        <View style={styles.fieldGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Nombres y Apellidos</Text>
            <Text style={styles.requiredAsterisk}>* Obligatorio</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Ej: Gabriel Martínez Sánchez"
            placeholderTextColor="#64748b"
            value={nombre}
            onChangeText={setNombre}
          />
        </View>

        {/* Teléfono / WhatsApp y Edad en fila */}
        <View style={styles.rowTwoCols}>
          <View style={[styles.fieldGroup, { flex: 1.5 }]}>
            <View style={styles.labelRow}>
              <View style={styles.labelWithIcon}>
                <Phone size={13} color="#38bdf8" />
                <Text style={styles.label}>WhatsApp / Tel.</Text>
              </View>
              <Text style={styles.requiredAsterisk}>*</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Ej: 987654321"
              placeholderTextColor="#64748b"
              keyboardType="phone-pad"
              value={telefono}
              onChangeText={setTelefono}
            />
          </View>

          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <View style={styles.labelRow}>
              <View style={styles.labelWithIcon}>
                <Calendar size={13} color="#f59e0b" />
                <Text style={styles.label}>Edad</Text>
              </View>
              <Text style={styles.requiredAsterisk}>* (17+)</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Ej: 19"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              maxLength={2}
              value={edad}
              onChangeText={setEdad}
            />
          </View>
        </View>

        {/* Alerta si tiene 17 años */}
        {esMenorDeEdad && (
          <View style={styles.parentalAlertBox}>
            <ShieldAlert size={18} color="#f59e0b" />
            <Text style={styles.parentalAlertText}>
              Postulante de 17 años: Requerirá autorización formal firmada por sus padres o apoderados antes del inicio.
            </Text>
          </View>
        )}

        {/* Distrito */}
        <View style={styles.fieldGroup}>
          <View style={styles.labelRow}>
            <View style={styles.labelWithIcon}>
              <MapPin size={13} color="#10b981" />
              <Text style={styles.label}>Distrito de Residencia</Text>
            </View>
            <Text style={styles.requiredAsterisk}>* Obligatorio</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Ej: San Miguel / Breña / Magdalena / Cercado"
            placeholderTextColor="#64748b"
            value={distrito}
            onChangeText={setDistrito}
          />
        </View>

        {/* Disponibilidad General / Notas Iniciales */}
        <View style={styles.fieldGroup}>
          <View style={styles.labelRow}>
            <View style={styles.labelWithIcon}>
              <FileText size={13} color="#a855f7" />
              <Text style={styles.label}>Disponibilidad Inicial / Observaciones</Text>
            </View>
            <Text style={styles.optionalText}>(Opcional)</Text>
          </View>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Ej: Estudia en las mañanas, disponible tardes/noches y fines de semana..."
            placeholderTextColor="#64748b"
            multiline
            numberOfLines={3}
            value={notas}
            onChangeText={setNotas}
          />
        </View>

        {/* Botón CTA Principal */}
        <TouchableOpacity
          style={styles.btnContinuar}
          onPress={handleValidarYContinuar}
          activeOpacity={0.85}
        >
          <Text style={styles.btnContinuarText}>
            {enEdicion ? 'Actualizar Ficha y Ver Horarios' : 'Comenzar Entrevista & Ver Pitch'}
          </Text>
          <ArrowRight size={20} color="#0d1b2a" />
        </TouchableOpacity>

        <View style={styles.infoFooterRow}>
          <AlertCircle size={14} color="#94a3b8" />
          <Text style={styles.infoFooterText}>
            Los datos se asociarán a los horarios que asignes en el paso siguiente.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  cardHeaderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#1b263b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginBottom: 4,
  },
  stepBadgeText: {
    color: '#f59e0b',
    fontSize: 10,
    fontFamily: fonts.bold,
    letterSpacing: 0.5,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontFamily: fonts.bold,
  },
  cardSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontFamily: fonts.regular,
    marginTop: 2,
    lineHeight: 16,
  },
  formCard: {
    backgroundColor: '#1b263b',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  fieldGroup: {
    marginBottom: 14,
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: 12,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  labelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    color: '#cbd5e1',
    fontSize: 13,
    fontFamily: fonts.medium,
  },
  requiredAsterisk: {
    color: '#ef4444',
    fontSize: 11,
    fontFamily: fonts.semiBold,
  },
  optionalText: {
    color: '#64748b',
    fontSize: 11,
    fontFamily: fonts.regular,
  },
  input: {
    backgroundColor: '#0d1b2a',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 14,
    fontFamily: fonts.regular,
    borderWidth: 1,
    borderColor: '#334155',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  parentalAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginBottom: 14,
  },
  parentalAlertText: {
    color: '#fde68a',
    fontSize: 11,
    fontFamily: fonts.medium,
    flex: 1,
    lineHeight: 16,
  },
  btnContinuar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f59e0b',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 6,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnContinuarText: {
    color: '#0d1b2a',
    fontSize: 15,
    fontFamily: fonts.bold,
  },
  infoFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
  },
  infoFooterText: {
    color: '#64748b',
    fontSize: 11,
    fontFamily: fonts.regular,
  },
});
