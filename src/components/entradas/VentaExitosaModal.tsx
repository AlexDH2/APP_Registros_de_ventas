import React from 'react';
import { View, Text, StyleSheet, Modal, Share, TouchableOpacity } from 'react-native';
import { CheckCircle2, Ticket, Share2, User, CreditCard as IdCard } from 'lucide-react-native';
import { ResultadoEmision, Evento } from '../../types/entradas';
import { fonts } from '../../theme';
import AnimatedButton from '../AnimatedButton';

interface VentaExitosaModalProps {
  visible: boolean;
  venta: ResultadoEmision | null;
  evento: Evento | null;
  theme: any;
  onClose: () => void;
}

export default function VentaExitosaModal({
  visible,
  venta,
  evento,
  theme,
  onClose,
}: VentaExitosaModalProps) {
  if (!venta) return null;

  const ticketsText =
    venta.cantidad > 1
      ? `Tickets #${venta.ticket_inicio} al #${venta.ticket_fin}`
      : `Ticket #${venta.ticket_inicio}`;

  const handleShareWhatsApp = async () => {
    const eventoNombre = evento ? evento.nombre : 'Evento';
    const eventoLugar = evento && evento.lugar ? ` (${evento.lugar})` : '';

    const mensaje = `🎟️ *COMPROBANTE DE ENTRADA DIGITAL*
🏟️ *Evento:* ${eventoNombre}${eventoLugar}
🎫 *Boleto(s):* ${ticketsText}
👤 *Titular:* ${venta.nombre_completo || 'Público General'}${
      venta.dni ? ` (DNI: ${venta.dni})` : ''
    }
🔢 *Cantidad:* ${venta.cantidad} entrada(s)
💰 *Total Pagado:* S/ ${venta.monto_total.toFixed(2)} (${venta.metodo_pago})
👤 *Atendido por:* ${venta.colaborador_nombre}

¡Presenta este mensaje o número de boleto al ingresar! ✅`;

    try {
      await Share.share({
        message: mensaje,
        title: 'Boleto Digital de Entrada',
      });
    } catch (e) {
      console.warn('Error al compartir boleto:', e);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {/* Header con Check Verde */}
          <View style={styles.iconCircle}>
            <CheckCircle2 size={44} color="#16a34a" />
          </View>

          <Text style={[styles.title, { color: theme.text }]}>¡Venta Registrada!</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Boleto reservado de forma atómica en la base de datos
          </Text>

          {/* Tarjeta de Boletos Asignados */}
          <View style={[styles.ticketBox, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
            <Ticket size={24} color="#2563eb" />
            <Text style={styles.ticketNumbers}>{ticketsText}</Text>
            <Text style={styles.ticketCount}>
              {venta.cantidad} {venta.cantidad === 1 ? 'Entrada' : 'Entradas'}
            </Text>
          </View>

          {/* Datos del Cliente y Pago */}
          <View style={[styles.detailsBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
            {venta.nombre_completo ? (
              <View style={styles.detailRow}>
                <User size={14} color={theme.textMuted} />
                <Text style={[styles.detailText, { color: theme.text }]} numberOfLines={1}>
                  {venta.nombre_completo}
                </Text>
              </View>
            ) : null}

            {venta.dni ? (
              <View style={styles.detailRow}>
                <IdCard size={14} color={theme.textMuted} />
                <Text style={[styles.detailText, { color: theme.textMuted }]}>
                  DNI: {venta.dni}
                </Text>
              </View>
            ) : null}

            <View style={styles.detailRowBetween}>
              <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Total Cobrado:</Text>
              <Text style={[styles.detailAmount, { color: theme.text }]}>
                S/ {venta.monto_total.toFixed(2)}
              </Text>
            </View>

            <View style={styles.detailRowBetween}>
              <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Método de Pago:</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>{venta.metodo_pago}</Text>
            </View>

            {venta.vuelto && venta.vuelto > 0 ? (
              <View style={styles.detailRowBetween}>
                <Text style={[styles.detailLabel, { color: '#16a34a' }]}>Vuelto entregado:</Text>
                <Text style={[styles.detailAmount, { color: '#16a34a' }]}>
                  S/ {venta.vuelto.toFixed(2)}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Botón WhatsApp */}
          <TouchableOpacity style={styles.whatsappBtn} onPress={handleShareWhatsApp}>
            <Share2 size={18} color="#ffffff" />
            <Text style={styles.whatsappBtnText}>COMPARTIR POR WHATSAPP</Text>
          </TouchableOpacity>

          {/* Botón Cerrar / Siguiente Venta */}
          <AnimatedButton
            style={[styles.closeBtn, { backgroundColor: theme.primary }]}
            onPress={onClose}
          >
            <Text style={styles.closeBtnText}>NUEVA VENTA</Text>
          </AnimatedButton>
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
    maxWidth: 380,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontFamily: fonts.bold,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    textAlign: 'center',
    marginBottom: 16,
  },
  ticketBox: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 14,
  },
  ticketNumbers: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: '#2563eb',
    marginTop: 6,
  },
  ticketCount: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: '#3b82f6',
  },
  detailsBox: {
    width: '100%',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    gap: 8,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
  },
  detailRowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: fonts.regular,
  },
  detailAmount: {
    fontSize: 14,
    fontFamily: fonts.bold,
  },
  detailValue: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
  },
  whatsappBtn: {
    backgroundColor: '#16a34a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 10,
  },
  whatsappBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: fonts.bold,
  },
  closeBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: fonts.bold,
  },
});
