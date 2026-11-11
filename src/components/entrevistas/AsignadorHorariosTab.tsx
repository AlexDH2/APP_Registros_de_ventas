import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import {
  Clock,
  MapPin,
  Check,
  AlertTriangle,
  RotateCcw,
  UserPlus,
  Star,
  Layers,
  Calendar,
} from 'lucide-react-native';
import {
  TurnoStaff,
  TURNOS_OFICIALES,
  SEDES_LISTA,
  verificarConflictoConSeleccionados,
  calcularTotales,
  CandidatoStaff,
} from '../../data/turnosStaffData';
import { fonts } from '../../theme';

interface Props {
  onGuardarCandidato: (candidato: CandidatoStaff) => Promise<void>;
  onIrACandidatos: () => void;
}

export default function AsignadorHorariosTab({
  onGuardarCandidato,
  onIrACandidatos,
}: Props) {
  // Filtros y Selección
  const [sedeFiltro, setSedeFiltro] = useState<string>('Todas');
  const [selectedShiftIds, setSelectedShiftIds] = useState<string[]>([]);

  // Formulario del Candidato
  const [nombre, setNombre] = useState<string>('');
  const [telefono, setTelefono] = useState<string>('');
  const [distrito, setDistrito] = useState<string>('');
  const [edad, setEdad] = useState<string>('');
  const [calificacion, setCalificacion] = useState<number>(5);
  const [notas, setNotas] = useState<string>('');
  const [guardando, setGuardando] = useState<boolean>(false);

  // Turnos seleccionados como objetos completos
  const turnosSeleccionados = TURNOS_OFICIALES.filter((t) =>
    selectedShiftIds.includes(t.id)
  );

  const { totalHoras, totalTurnos } = calcularTotales(turnosSeleccionados);

  // Filtrar turnos según sede seleccionada
  const turnosFiltrados =
    sedeFiltro === 'Todas'
      ? TURNOS_OFICIALES
      : TURNOS_OFICIALES.filter((t) => t.sede === sedeFiltro);

  // Manejar click en turno
  const handleToggleTurno = (turno: TurnoStaff) => {
    const isSelected = selectedShiftIds.includes(turno.id);

    if (isSelected) {
      // Deseleccionar turno (libera restricciones)
      setSelectedShiftIds((prev) => prev.filter((id) => id !== turno.id));
    } else {
      // Verificar si choca con los que ya están seleccionados
      const conflicto = verificarConflictoConSeleccionados(turno, turnosSeleccionados);
      if (conflicto.hasConflict) {
        Alert.alert(
          'Conflicto de Horario Detectado',
          `No se puede asignar este turno porque ${conflicto.motivo}.\n\nPor favor deselecciona el turno anterior si deseas asignar este.`
        );
        return;
      }
      setSelectedShiftIds((prev) => [...prev, turno.id]);
    }
  };

  const handleLimpiarTurnos = () => {
    setSelectedShiftIds([]);
  };

  const handleGuardar = async () => {
    if (!nombre.trim()) {
      Alert.alert('Datos Incompletos', 'Por favor ingresa el nombre completo del postulante.');
      return;
    }

    if (selectedShiftIds.length === 0) {
      Alert.alert(
        'Sin Horarios',
        '¿Deseas guardar al candidato sin ningún turno asignado aún?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Guardar de todas formas', onPress: () => handleEjecutarGuardado() },
        ]
      );
      return;
    }

    await handleEjecutarGuardado();
  };

  const handleEjecutarGuardado = async () => {
    setGuardando(true);
    try {
      const nuevoId = `cand_${new Date().getTime()}`;
      const fechaActual = new Date().toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const nuevoCandidato: CandidatoStaff = {
        id: nuevoId,
        fecha: fechaActual,
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        distrito: distrito.trim(),
        edad: edad.trim() || '18',
        calificacion,
        notas: notas.trim(),
        turnos: turnosSeleccionados,
        totalHoras,
        totalTurnos,
      };

      await onGuardarCandidato(nuevoCandidato);

      // Limpiar campos
      setNombre('');
      setTelefono('');
      setDistrito('');
      setEdad('');
      setCalificacion(5);
      setNotas('');
      setSelectedShiftIds([]);

      Alert.alert(
        '¡Candidato Guardado!',
        `Se registró la ficha de ${nuevoCandidato.nombre} con ${totalTurnos} turno(s) (${totalHoras} hrs/semana).`,
        [
          { text: 'Continuar Asignando', style: 'cancel' },
          { text: 'Ver Lista de Candidatos', onPress: onIrACandidatos },
        ]
      );
    } catch (e: any) {
      Alert.alert('Error al guardar', e.message || 'No se pudo guardar el candidato.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Banner Superior Fijo: Contadores en Tiempo Real */}
      <View style={styles.stickyCountersBanner}>
        <View style={styles.countersLeft}>
          <View style={styles.counterMetricBox}>
            <Text style={styles.counterNumberGold}>{totalTurnos}</Text>
            <Text style={styles.counterLabel}>Turnos</Text>
          </View>
          <View style={styles.metricSeparator} />
          <View style={styles.counterMetricBox}>
            <Text style={styles.counterNumberSky}>{totalHoras} h</Text>
            <Text style={styles.counterLabel}>Horas/Sem</Text>
          </View>
        </View>

        {selectedShiftIds.length > 0 && (
          <TouchableOpacity
            style={styles.btnResetSelection}
            onPress={handleLimpiarTurnos}
            activeOpacity={0.7}
          >
            <RotateCcw size={14} color="#fca5a5" />
            <Text style={styles.btnResetSelectionText}>Limpiar</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollBody}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 2. Selector de Filtro por Sede */}
        <View style={styles.filterSection}>
          <Text style={styles.filterTitle}>Filtrar por Sede ({SEDES_LISTA.length - 1} sedes):</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {SEDES_LISTA.map((sede) => {
              const active = sedeFiltro === sede;
              return (
                <TouchableOpacity
                  key={sede}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setSedeFiltro(sede)}
                >
                  <Text
                    style={[styles.filterChipText, active && styles.filterChipTextActive]}
                  >
                    {sede}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 3. Listado de Turnos con Validación Anti-Cruces */}
        <View style={styles.turnosListHeader}>
          <Text style={styles.turnosSectionTitle}>
            Turnos Disponibles ({turnosFiltrados.length})
          </Text>
          <Text style={styles.turnosSectionHelp}>
            Toca para seleccionar. Si hay choque horario, se bloqueará automáticamente.
          </Text>
        </View>

        <View style={styles.turnosContainer}>
          {turnosFiltrados.map((turno) => {
            const isSelected = selectedShiftIds.includes(turno.id);
            const conflicto = !isSelected
              ? verificarConflictoConSeleccionados(turno, turnosSeleccionados)
              : { hasConflict: false };

            return (
              <TouchableOpacity
                key={turno.id}
                style={[
                  styles.shiftCard,
                  isSelected && styles.shiftCardSelected,
                  conflicto.hasConflict && styles.shiftCardClashed,
                ]}
                onPress={() => handleToggleTurno(turno)}
                activeOpacity={conflicto.hasConflict ? 0.9 : 0.75}
              >
                {/* Header de la tarjeta */}
                <View style={styles.shiftCardHeader}>
                  <View style={styles.shiftCardSedeBox}>
                    <MapPin
                      size={15}
                      color={
                        isSelected
                          ? '#f59e0b'
                          : conflicto.hasConflict
                          ? '#ef4444'
                          : '#38bdf8'
                      }
                    />
                    <Text
                      style={[
                        styles.shiftCardSedeName,
                        isSelected && { color: '#f59e0b' },
                        conflicto.hasConflict && { color: '#ef4444' },
                      ]}
                    >
                      {turno.sede}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.frecuenciaBadge,
                      isSelected && { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.frecuenciaBadgeText,
                        isSelected && { color: '#0d1b2a', fontFamily: fonts.bold },
                      ]}
                    >
                      {turno.frecuencia}
                    </Text>
                  </View>
                </View>

                {/* Subtítulo: Espacio y Días */}
                <View style={styles.shiftSubRow}>
                  <View style={styles.espacioTag}>
                    <Layers size={13} color="#94a3b8" />
                    <Text style={styles.espacioText}>{turno.espacio}</Text>
                  </View>
                  <View style={styles.diasTag}>
                    <Calendar size={13} color="#94a3b8" />
                    <Text style={styles.diasText}>{turno.diasTexto}</Text>
                  </View>
                </View>

                {/* Horario y Horas Semanales */}
                <View style={styles.shiftBottomRow}>
                  <View style={styles.horarioBox}>
                    <Clock size={14} color="#e2e8f0" />
                    <Text style={styles.horarioText}>{turno.horario}</Text>
                  </View>
                  <Text style={styles.horasSemanalesText}>
                    ⚡ {turno.horasSemanales} hrs/sem
                  </Text>
                </View>

                {/* Checkmark de Selección */}
                {isSelected && (
                  <View style={styles.checkSelectedBadge}>
                    <Check size={14} color="#0d1b2a" />
                    <Text style={styles.checkSelectedText}>SELECCIONADO</Text>
                  </View>
                )}

                {/* Alerta de Choque Horario */}
                {conflicto.hasConflict && (
                  <View style={styles.clashWarningBox}>
                    <AlertTriangle size={15} color="#ef4444" />
                    <Text style={styles.clashWarningText}>{conflicto.motivo}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 4. Formulario de Datos del Postulante */}
        <View style={styles.formContainer}>
          <View style={styles.formTitleRow}>
            <UserPlus size={20} color="#f59e0b" />
            <Text style={styles.formTitle}>Ficha del Postulante</Text>
          </View>
          <Text style={styles.formSub}>
            Completa los datos del entrevistado para asociarlo a los horarios elegidos arriba.
          </Text>

          {/* Campo Nombre */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Nombre y Apellidos <Text style={{ color: '#ef4444' }}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ej: Gabriel Martínez Sánchez"
              placeholderTextColor="#64748b"
              value={nombre}
              onChangeText={setNombre}
            />
          </View>

          {/* Campo Teléfono y Edad en Fila */}
          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1.5 }]}>
              <Text style={styles.inputLabel}>Teléfono / WhatsApp</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej: 987654321"
                placeholderTextColor="#64748b"
                keyboardType="phone-pad"
                value={telefono}
                onChangeText={setTelefono}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Edad</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej: 19"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                value={edad}
                onChangeText={setEdad}
              />
            </View>
          </View>

          {/* Campo Distrito */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Distrito de Residencia</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ej: San Miguel / Magdalena / Breña"
              placeholderTextColor="#64748b"
              value={distrito}
              onChangeText={setDistrito}
            />
          </View>

          {/* Selector de Estrellas (Calificación de Entrevista) */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Calificación de la Entrevista</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setCalificacion(star)}
                  style={styles.starBtn}
                >
                  <Star
                    size={28}
                    color={star <= calificacion ? '#f59e0b' : '#334155'}
                    fill={star <= calificacion ? '#f59e0b' : 'transparent'}
                  />
                </TouchableOpacity>
              ))}
              <Text style={styles.starScoreText}>{calificacion} de 5 estrellas</Text>
            </View>
          </View>

          {/* Campo Notas / Observaciones */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Notas u Observaciones del Entrevistador</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Disponibilidad, actitud, sede favorita, experiencia deportiva..."
              placeholderTextColor="#64748b"
              multiline
              numberOfLines={3}
              value={notas}
              onChangeText={setNotas}
            />
          </View>

          {/* Botón Guardar Candidato */}
          <TouchableOpacity
            style={[styles.btnGuardar, guardando && { opacity: 0.7 }]}
            onPress={handleGuardar}
            disabled={guardando}
            activeOpacity={0.85}
          >
            <UserPlus size={20} color="#0d1b2a" />
            <Text style={styles.btnGuardarText}>
              {guardando ? 'Guardando...' : 'Guardar Postulante & Horarios'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1b2a',
  },
  stickyCountersBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#070f18',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1b263b',
  },
  countersLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  counterMetricBox: {
    alignItems: 'flex-start',
  },
  counterNumberGold: {
    color: '#f59e0b',
    fontSize: 20,
    fontFamily: fonts.extraBold,
    lineHeight: 22,
  },
  counterNumberSky: {
    color: '#38bdf8',
    fontSize: 20,
    fontFamily: fonts.extraBold,
    lineHeight: 22,
  },
  counterLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontFamily: fonts.medium,
    textTransform: 'uppercase',
  },
  metricSeparator: {
    width: 1,
    height: 28,
    backgroundColor: '#1b263b',
  },
  btnResetSelection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  btnResetSelectionText: {
    color: '#fca5a5',
    fontSize: 12,
    fontFamily: fonts.bold,
  },
  scrollBody: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontFamily: fonts.medium,
    marginBottom: 8,
  },
  filterScroll: {
    gap: 8,
  },
  filterChip: {
    backgroundColor: '#1b263b',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterChipActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  filterChipText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontFamily: fonts.medium,
  },
  filterChipTextActive: {
    color: '#0d1b2a',
    fontFamily: fonts.bold,
  },
  turnosListHeader: {
    marginBottom: 10,
  },
  turnosSectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: fonts.bold,
  },
  turnosSectionHelp: {
    color: '#64748b',
    fontSize: 12,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  turnosContainer: {
    gap: 10,
  },
  shiftCard: {
    backgroundColor: '#1b263b',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#334155',
  },
  shiftCardSelected: {
    borderColor: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  shiftCardClashed: {
    borderColor: '#ef444480',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    opacity: 0.7,
  },
  shiftCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  shiftCardSedeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shiftCardSedeName: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: fonts.bold,
  },
  frecuenciaBadge: {
    backgroundColor: '#0d1b2a',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  frecuenciaBadgeText: {
    color: '#38bdf8',
    fontSize: 11,
    fontFamily: fonts.semiBold,
  },
  shiftSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
  },
  espacioTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  espacioText: {
    color: '#94a3b8',
    fontSize: 12,
    fontFamily: fonts.regular,
  },
  diasTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  diasText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontFamily: fonts.medium,
  },
  shiftBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(51, 65, 85, 0.5)',
  },
  horarioBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  horarioText: {
    color: '#f8fafc',
    fontSize: 13,
    fontFamily: fonts.semiBold,
  },
  horasSemanalesText: {
    color: '#f59e0b',
    fontSize: 12,
    fontFamily: fonts.bold,
  },
  checkSelectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f59e0b',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 8,
  },
  checkSelectedText: {
    color: '#0d1b2a',
    fontSize: 10,
    fontFamily: fonts.bold,
  },
  clashWarningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  clashWarningText: {
    color: '#fca5a5',
    fontSize: 11,
    fontFamily: fonts.medium,
    flex: 1,
    lineHeight: 15,
  },
  formContainer: {
    backgroundColor: '#1b263b',
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  formTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  formTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontFamily: fonts.bold,
  },
  formSub: {
    color: '#94a3b8',
    fontSize: 12,
    fontFamily: fonts.regular,
    marginBottom: 16,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontFamily: fonts.medium,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#0d1b2a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 13,
    fontFamily: fonts.regular,
    borderWidth: 1,
    borderColor: '#334155',
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0d1b2a',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  starBtn: {
    padding: 2,
  },
  starScoreText: {
    color: '#94a3b8',
    fontSize: 12,
    fontFamily: fonts.medium,
    marginLeft: 6,
  },
  btnGuardar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f59e0b',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  btnGuardarText: {
    color: '#0d1b2a',
    fontSize: 15,
    fontFamily: fonts.bold,
  },
});
