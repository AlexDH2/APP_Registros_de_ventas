import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import {
  Search,
  Ticket,
  Clock,
  Image as ImageIcon,
  AlertTriangle,
  XCircle,
  X,
} from 'lucide-react-native';
import { VentaEntrada } from '../../../types/entradas';
import { fonts } from '../../../theme';

interface AuditoriaVentasProps {
  ventas: VentaEntrada[];
  onVerComprobante: (url: string) => void;
  onAnularVenta: (ventaId: number, motivo: string) => Promise<void>;
  theme: any;
}

export default function AuditoriaVentas({
  ventas,
  onVerComprobante,
  onAnularVenta,
  theme,
}: AuditoriaVentasProps) {
  const [busqueda, setBusqueda] = useState<string>('');
  const [ventaParaAnular, setVentaParaAnular] = useState<VentaEntrada | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState<string>('Error de digitación');
  const [anulando, setAnulando] = useState<boolean>(false);

  const filtradas = ventas.filter((v) => {
    if (!busqueda.trim()) return true;
    const term = busqueda.toLowerCase().trim();
    return (
      (v.nombre_completo && v.nombre_completo.toLowerCase().includes(term)) ||
      (v.dni && v.dni.toLowerCase().includes(term)) ||
      (v.colaborador_nombre && v.colaborador_nombre.toLowerCase().includes(term)) ||
      v.numero_ticket_inicio.toString().includes(term) ||
      v.numero_ticket_fin.toString().includes(term) ||
      v.metodo_pago.toLowerCase().includes(term)
    );
  });

  const handlePromptAnular = (venta: VentaEntrada) => {
    setVentaParaAnular(venta);
    setMotivoAnulacion('Error de digitación');
  };

  const handleConfirmarAnulacion = async () => {
    if (!ventaParaAnular) return;
    try {
      setAnulando(true);
      await onAnularVenta(
        ventaParaAnular.id,
        motivoAnulacion.trim() || 'Anulado por Administración'
      );
      setVentaParaAnular(null);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo anular la venta.');
    } finally {
      setAnulando(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.header}>
        <Ticket size={16} color={theme.primary} />
        <Text style={[styles.title, { color: theme.text }]}>
          Auditoría de Entradas Emitidas ({filtradas.length})
        </Text>
      </View>

      {/* Buscador */}
      <View style={[styles.searchWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
        <Search size={16} color={theme.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Buscar por DNI, titular, #ticket o colaborador..."
          placeholderTextColor={theme.textMuted}
          value={busqueda}
          onChangeText={setBusqueda}
        />
      </View>

      {/* Lista */}
      <View style={styles.list}>
        {filtradas.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>
            No se encontraron ventas con ese criterio.
          </Text>
        ) : (
          filtradas.map((v) => {
            const isAnulada = v.estado === 'ANULADA';
            const hora = new Date(v.fecha).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <View
                key={v.id}
                style={[
                  styles.cardItem,
                  {
                    backgroundColor: theme.background,
                    borderColor: isAnulada ? '#fca5a5' : theme.border,
                    opacity: isAnulada ? 0.6 : 1,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.ticketPill}>
                    <Ticket size={11} color="#2563eb" />
                    <Text style={styles.ticketPillText}>
                      {v.cantidad > 1
                        ? `#${v.numero_ticket_inicio} al #${v.numero_ticket_fin}`
                        : `#${v.numero_ticket_inicio}`}
                    </Text>
                  </View>

                  <View style={styles.rightHeader}>
                    <Text style={[styles.colabTag, { color: theme.textMuted }]}>
                      {v.colaborador_nombre}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: isAnulada ? '#fee2e2' : '#dcfce7' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: isAnulada ? '#ef4444' : '#16a34a' },
                        ]}
                      >
                        {isAnulada ? 'ANULADA' : 'OK'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Titular */}
                <View style={styles.bodyRow}>
                  <View style={styles.buyerInfo}>
                    <Text style={[styles.buyerName, { color: theme.text }]} numberOfLines={1}>
                      {v.nombre_completo || 'Público General'}
                    </Text>
                    {v.dni ? (
                      <Text style={[styles.buyerDni, { color: theme.textMuted }]}>
                        DNI: {v.dni}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.priceContainer}>
                    <Text style={[styles.priceAmount, { color: theme.text }]}>
                      S/ {v.monto_total.toFixed(2)}
                    </Text>
                    <Text style={[styles.paymentMethod, { color: theme.textMuted }]}>
                      {v.metodo_pago}
                    </Text>
                  </View>
                </View>

                {isAnulada && v.motivo_anulacion ? (
                  <View style={styles.anuladaMotivoRow}>
                    <AlertTriangle size={12} color="#ef4444" />
                    <Text style={styles.anuladaMotivoText}>Motivo: {v.motivo_anulacion}</Text>
                  </View>
                ) : null}

                {/* Acciones */}
                <View style={[styles.actionRow, { borderTopColor: theme.border }]}>
                  <View style={styles.timeRow}>
                    <Clock size={11} color={theme.textMuted} />
                    <Text style={[styles.timeText, { color: theme.textMuted }]}>{hora}</Text>
                  </View>

                  <View style={styles.actionButtons}>
                    {v.url_comprobante ? (
                      <TouchableOpacity
                        style={styles.actionBtnSmall}
                        onPress={() => onVerComprobante(v.url_comprobante!)}
                      >
                        <ImageIcon size={13} color="#2563eb" />
                        <Text style={styles.actionBtnTextBlue}>Foto</Text>
                      </TouchableOpacity>
                    ) : null}

                    {!isAnulada && (
                      <TouchableOpacity
                        style={styles.actionBtnSmall}
                        onPress={() => handlePromptAnular(v)}
                      >
                        <XCircle size={13} color="#ef4444" />
                        <Text style={styles.actionBtnTextRed}>Anular</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Modal de Anulación 100% compatible con Android & iOS (sin Alert.prompt) */}
      <Modal
        visible={!!ventaParaAnular}
        transparent
        animationType="fade"
        onRequestClose={() => setVentaParaAnular(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.modalTopRow}>
              <View style={styles.modalTitleRow}>
                <AlertTriangle size={18} color="#ef4444" />
                <Text style={[styles.modalTitle, { color: theme.text }]}>Anular Boletos</Text>
              </View>
              <TouchableOpacity
                onPress={() => setVentaParaAnular(null)}
                disabled={anulando}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {ventaParaAnular && (
              <View style={styles.modalBody}>
                <Text style={[styles.modalSub, { color: theme.textMuted }]}>
                  ¿Estás seguro de anular la venta{' '}
                  <Text style={{ fontFamily: fonts.bold, color: theme.text }}>
                    {ventaParaAnular.cantidad > 1
                      ? `#${ventaParaAnular.numero_ticket_inicio} al #${ventaParaAnular.numero_ticket_fin}`
                      : `#${ventaParaAnular.numero_ticket_inicio}`}
                  </Text>{' '}
                  por{' '}
                  <Text style={{ fontFamily: fonts.bold, color: '#16a34a' }}>
                    S/ {ventaParaAnular.monto_total.toFixed(2)}
                  </Text>
                  ?
                </Text>

                <Text style={[styles.inputLabel, { color: theme.text }]}>Motivo de la anulación:</Text>
                <TextInput
                  style={[
                    styles.motivoInput,
                    {
                      backgroundColor: theme.background,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  value={motivoAnulacion}
                  onChangeText={setMotivoAnulacion}
                  placeholder="Ej: Error de digitación, cliente canceló..."
                  placeholderTextColor={theme.textMuted}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalBtnCancel, { borderColor: theme.border }]}
                    onPress={() => setVentaParaAnular(null)}
                    disabled={anulando}
                  >
                    <Text style={[styles.modalBtnCancelText, { color: theme.text }]}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalBtnConfirm, { backgroundColor: '#ef4444' }]}
                    onPress={handleConfirmarAnulacion}
                    disabled={anulando}
                  >
                    {anulando ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.modalBtnConfirmText}>Confirmar Anulación</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 30,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  title: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 42,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    fontFamily: fonts.regular,
  },
  list: {
    gap: 10,
  },
  cardItem: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  ticketPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  ticketPillText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: '#2563eb',
  },
  rightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  colabTag: {
    fontSize: 11,
    fontFamily: fonts.medium,
  },
  statusBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 9,
    fontFamily: fonts.bold,
  },
  bodyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  buyerInfo: {
    flex: 1,
    marginRight: 8,
  },
  buyerName: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
  },
  buyerDni: {
    fontSize: 11,
    fontFamily: fonts.regular,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceAmount: {
    fontSize: 14,
    fontFamily: fonts.bold,
  },
  paymentMethod: {
    fontSize: 10,
    fontFamily: fonts.medium,
  },
  anuladaMotivoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fee2e2',
    padding: 4,
    borderRadius: 6,
    marginBottom: 6,
  },
  anuladaMotivoText: {
    color: '#ef4444',
    fontSize: 10,
    fontFamily: fonts.medium,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 10,
    fontFamily: fonts.regular,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  actionBtnTextBlue: {
    fontSize: 11,
    color: '#2563eb',
    fontFamily: fonts.semiBold,
  },
  actionBtnTextRed: {
    fontSize: 11,
    color: '#ef4444',
    fontFamily: fonts.semiBold,
  },
  emptyText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    textAlign: 'center',
    paddingVertical: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  modalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
  },
  modalBody: {
    gap: 12,
  },
  modalSub: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.regular,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    marginTop: 4,
  },
  motivoInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    fontFamily: fonts.regular,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancelText: {
    fontSize: 13,
    fontFamily: fonts.medium,
  },
  modalBtnConfirm: {
    flex: 1.4,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnConfirmText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: '#ffffff',
  },
});
