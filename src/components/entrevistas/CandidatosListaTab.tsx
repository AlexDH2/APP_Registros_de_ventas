import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  Alert,
} from 'react-native';
import {
  Users,
  Trash2,
  Share2,
  MapPin,
  Star,
  MessageCircle,
  FileSpreadsheet,
} from 'lucide-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
  CandidatoStaff,
  generarMensajeWhatsApp,
  generarCSV,
} from '../../data/turnosStaffData';
import { fonts } from '../../theme';

interface Props {
  candidatos: CandidatoStaff[];
  onEliminarCandidato: (id: string) => Promise<void>;
  onLimpiarTodos: () => Promise<void>;
  onIrAHorarios: () => void;
}

export default function CandidatosListaTab({
  candidatos,
  onEliminarCandidato,
  onLimpiarTodos,
  onIrAHorarios,
}: Props) {
  const [exportando, setExportando] = useState<boolean>(false);

  // Compartir ficha de candidato individual por WhatsApp / sistema
  const handleCompartirWhatsApp = async (candidato: CandidatoStaff) => {
    try {
      const mensaje = generarMensajeWhatsApp(candidato);
      await Share.share({
        title: `Ficha Postulante - ${candidato.nombre}`,
        message: mensaje,
      });
    } catch (e: any) {
      console.error('Error al compartir por WhatsApp:', e);
    }
  };

  // Exportar todos los candidatos a Excel (.csv con UTF-8 BOM)
  const handleExportarExcel = async () => {
    if (candidatos.length === 0) {
      Alert.alert('Sin Datos', 'No hay candidatos registrados para exportar.');
      return;
    }

    try {
      setExportando(true);
      const csvContent = generarCSV(candidatos);
      const fileName = `Candidatos_Staff_Campeones_${Date.now()}.csv`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Exportar Fichas de Candidatos (Excel)',
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        Alert.alert('Exportado', `Archivo guardado en: ${fileUri}`);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo generar el archivo Excel.');
    } finally {
      setExportando(false);
    }
  };

  const handleConfirmarEliminar = (candidato: CandidatoStaff) => {
    Alert.alert(
      'Eliminar Postulante',
      `¿Estás seguro de eliminar el registro de ${candidato.nombre}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => onEliminarCandidato(candidato.id),
        },
      ]
    );
  };

  const handleConfirmarLimpiarTodos = () => {
    Alert.alert(
      'Limpiar Todo el Historial',
      'Esta acción eliminará permanentemente todas las fichas de postulantes registradas en el dispositivo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Borrar Todo',
          style: 'destructive',
          onPress: onLimpiarTodos,
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Barra de Acciones Globales */}
      <View style={styles.actionBar}>
        <View style={styles.countBadge}>
          <Users size={16} color="#f59e0b" />
          <Text style={styles.countBadgeText}>
            {candidatos.length} Candidato{candidatos.length === 1 ? '' : 's'}
          </Text>
        </View>

        <View style={styles.actionButtonsRow}>
          {candidatos.length > 0 && (
            <TouchableOpacity
              style={styles.btnExcel}
              onPress={handleExportarExcel}
              disabled={exportando}
              activeOpacity={0.8}
            >
              <FileSpreadsheet size={15} color="#0d1b2a" />
              <Text style={styles.btnExcelText}>
                {exportando ? 'Exportando...' : 'Exportar Excel'}
              </Text>
            </TouchableOpacity>
          )}

          {candidatos.length > 0 && (
            <TouchableOpacity
              style={styles.btnClear}
              onPress={handleConfirmarLimpiarTodos}
              activeOpacity={0.7}
            >
              <Trash2 size={15} color="#fca5a5" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollList}
        showsVerticalScrollIndicator={false}
      >
        {candidatos.length === 0 ? (
          <View style={styles.emptyStateBox}>
            <View style={styles.emptyIconCircle}>
              <Users size={36} color="#64748b" />
            </View>
            <Text style={styles.emptyTitle}>Aún no hay candidatos guardados</Text>
            <Text style={styles.emptySubtitle}>
              Dirígete a la pestaña "Asignar Horarios" para entrevistar y registrar los turnos de
              los postulantes.
            </Text>
            <TouchableOpacity
              style={styles.btnIrAHorariosEmpty}
              onPress={onIrAHorarios}
              activeOpacity={0.8}
            >
              <Text style={styles.btnIrAHorariosEmptyText}>Comenzar Entrevista</Text>
            </TouchableOpacity>
          </View>
        ) : (
          candidatos.map((c) => (
            <View key={c.id} style={styles.candidateCard}>
              {/* Header de la tarjeta */}
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{c.nombre}</Text>
                  <Text style={styles.cardFecha}>Entrevistado: {c.fecha}</Text>
                </View>

                {/* Estrellas */}
                <View style={styles.ratingBox}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={13}
                      color={i < c.calificacion ? '#f59e0b' : '#334155'}
                      fill={i < c.calificacion ? '#f59e0b' : 'transparent'}
                    />
                  ))}
                </View>
              </View>

              {/* Datos personales: Teléfono, Distrito, Edad */}
              <View style={styles.pillsRow}>
                {c.telefono ? (
                  <View style={styles.dataPill}>
                    <MessageCircle size={12} color="#38bdf8" />
                    <Text style={styles.dataPillText}>{c.telefono}</Text>
                  </View>
                ) : null}

                {c.distrito ? (
                  <View style={styles.dataPill}>
                    <MapPin size={12} color="#34d399" />
                    <Text style={styles.dataPillText}>{c.distrito}</Text>
                  </View>
                ) : null}

                <View style={styles.dataPill}>
                  <Text style={styles.dataPillText}>{c.edad} años</Text>
                </View>
              </View>

              {/* Resumen Horas y Turnos */}
              <View style={styles.metricsRow}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricItemNumGold}>{c.totalTurnos}</Text>
                  <Text style={styles.metricItemLabel}>Turnos Asignados</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricItemNumSky}>{c.totalHoras} hrs</Text>
                  <Text style={styles.metricItemLabel}>Horas Semanales</Text>
                </View>
              </View>

              {/* Desglose de Turnos */}
              <View style={styles.turnosDetalleBox}>
                <Text style={styles.turnosDetalleTitle}>Horarios asignados:</Text>
                {c.turnos.length === 0 ? (
                  <Text style={styles.turnosVacioText}>(Sin turnos asignados)</Text>
                ) : (
                  c.turnos.map((t, idx) => (
                    <View key={`${t.id}-${idx}`} style={styles.turnoRowItem}>
                      <View style={styles.bulletDot} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.turnoItemSede}>
                          {t.sede} <Text style={{ color: '#94a3b8' }}>• {t.espacio}</Text>
                        </Text>
                        <Text style={styles.turnoItemHorario}>
                          🗓️ {t.diasTexto} | ⏰ {t.horario} ({t.horasSemanales} hrs)
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>

              {/* Observaciones */}
              {c.notas ? (
                <View style={styles.notasBox}>
                  <Text style={styles.notasTitle}>Observaciones del entrevistador:</Text>
                  <Text style={styles.notasContent}>"{c.notas}"</Text>
                </View>
              ) : null}

              {/* Acciones de Tarjeta: WhatsApp & Eliminar */}
              <View style={styles.cardActionsRow}>
                <TouchableOpacity
                  style={styles.btnShareWhatsApp}
                  onPress={() => handleCompartirWhatsApp(c)}
                  activeOpacity={0.8}
                >
                  <Share2 size={15} color="#ffffff" />
                  <Text style={styles.btnShareWhatsAppText}>Enviar / Copiar WhatsApp</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnDeleteCandidate}
                  onPress={() => handleConfirmarEliminar(c)}
                  activeOpacity={0.7}
                >
                  <Trash2 size={16} color="#fca5a5" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1b2a',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#070f18',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1b263b',
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  countBadgeText: {
    color: '#f59e0b',
    fontSize: 12,
    fontFamily: fonts.bold,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnExcel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  btnExcelText: {
    color: '#0d1b2a',
    fontSize: 12,
    fontFamily: fonts.bold,
  },
  btnClear: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  scrollList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 14,
  },
  emptyStateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#1b263b',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontFamily: fonts.bold,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#94a3b8',
    fontSize: 13,
    fontFamily: fonts.regular,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  btnIrAHorariosEmpty: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
  },
  btnIrAHorariosEmptyText: {
    color: '#0d1b2a',
    fontSize: 14,
    fontFamily: fonts.bold,
  },
  candidateCard: {
    backgroundColor: '#1b263b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardName: {
    color: '#ffffff',
    fontSize: 17,
    fontFamily: fonts.bold,
  },
  cardFecha: {
    color: '#94a3b8',
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  ratingBox: {
    flexDirection: 'row',
    gap: 2,
    backgroundColor: '#0d1b2a',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 6,
  },
  dataPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0d1b2a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dataPillText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontFamily: fonts.medium,
  },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: '#0d1b2a',
    borderRadius: 10,
    padding: 10,
    marginVertical: 10,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricItemNumGold: {
    color: '#f59e0b',
    fontSize: 18,
    fontFamily: fonts.extraBold,
  },
  metricItemNumSky: {
    color: '#38bdf8',
    fontSize: 18,
    fontFamily: fonts.extraBold,
  },
  metricItemLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontFamily: fonts.medium,
    marginTop: 1,
  },
  turnosDetalleBox: {
    backgroundColor: 'rgba(13, 27, 42, 0.5)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  turnosDetalleTitle: {
    color: '#cbd5e1',
    fontSize: 11,
    fontFamily: fonts.bold,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  turnosVacioText: {
    color: '#64748b',
    fontSize: 12,
    fontStyle: 'italic',
  },
  turnoRowItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f59e0b',
    marginTop: 6,
  },
  turnoItemSede: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: fonts.semiBold,
  },
  turnoItemHorario: {
    color: '#94a3b8',
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 1,
  },
  notasBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
    marginBottom: 12,
  },
  notasTitle: {
    color: '#f59e0b',
    fontSize: 10,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
  },
  notasContent: {
    color: '#e2e8f0',
    fontSize: 12,
    fontFamily: fonts.regular,
    marginTop: 2,
    fontStyle: 'italic',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnShareWhatsApp: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnShareWhatsAppText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: fonts.bold,
  },
  btnDeleteCandidate: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
});
