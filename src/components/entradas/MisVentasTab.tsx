import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ticket, User, CreditCard as IdCard, Clock, Image as ImageIcon } from 'lucide-react-native';
import { VentaEntrada } from '../../types/entradas';
import { fonts } from '../../theme';

interface MisVentasTabProps {
  ventas: VentaEntrada[];
  loading: boolean;
  onRefresh: () => void;
  onVerComprobante: (url: string) => void;
  theme: any;
}

export default function MisVentasTab({
  ventas,
  loading,
  onRefresh,
  onVerComprobante,
  theme,
}: MisVentasTabProps) {
  if (ventas.length === 0 && !loading) {
    return (
      <View style={styles.emptyContainer}>
        <Ticket size={48} color={theme.textMuted} />
        <Text style={[styles.emptyTitle, { color: theme.text }]}>Sin ventas registradas</Text>
        <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
          Aún no has emitido entradas en este evento. Tus emisiones aparecerán aquí con sus
          correlativos correspondientes.
        </Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: VentaEntrada }) => {
    const isAnulada = item.estado === 'ANULADA';
    const hora = new Date(item.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: isAnulada ? '#fca5a5' : theme.border,
            opacity: isAnulada ? 0.6 : 1,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={styles.ticketPill}>
            <Ticket size={12} color="#2563eb" />
            <Text style={styles.ticketPillText}>
              {item.cantidad > 1
                ? `Tickets #${item.numero_ticket_inicio} al #${item.numero_ticket_fin}`
                : `Ticket #${item.numero_ticket_inicio}`}
            </Text>
          </View>

          <View style={styles.rightHeader}>
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
                {isAnulada ? 'ANULADA' : 'EMITIDA'}
              </Text>
            </View>
          </View>
        </View>

        {/* Datos del comprador */}
        <View style={styles.bodySection}>
          <View style={styles.infoRow}>
            <User size={13} color={theme.textMuted} />
            <Text style={[styles.infoText, { color: theme.text }]} numberOfLines={1}>
              {item.nombre_completo || 'Público General'}
            </Text>
          </View>

          {item.dni ? (
            <View style={styles.infoRow}>
              <IdCard size={13} color={theme.textMuted} />
              <Text style={[styles.infoText, { color: theme.textMuted }]}>
                DNI: {item.dni}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Footer con método de pago, monto y hora */}
        <View style={[styles.footerRow, { borderTopColor: theme.border }]}>
          <View style={styles.metaLeft}>
            <View style={[styles.paymentBadge, { backgroundColor: theme.background }]}>
              <Text style={[styles.paymentBadgeText, { color: theme.text }]}>
                {item.metodo_pago}
              </Text>
            </View>
            <View style={styles.timeRow}>
              <Clock size={11} color={theme.textMuted} />
              <Text style={[styles.timeText, { color: theme.textMuted }]}>{hora}</Text>
            </View>
          </View>

          <View style={styles.amountContainer}>
            <Text style={[styles.amountText, { color: theme.text }]}>
              S/ {item.monto_total.toFixed(2)}
            </Text>
            {item.url_comprobante ? (
              <TouchableOpacity
                style={styles.comprobanteBtn}
                onPress={() => onVerComprobante(item.url_comprobante!)}
              >
                <ImageIcon size={14} color="#2563eb" />
                <Text style={styles.comprobanteBtnText}>Ver Foto</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    );
  };

  return (
    <FlatList
      data={ventas}
      keyExtractor={(item) => item.id.toString()}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={onRefresh} colors={['#2563eb']} />
      }
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  card: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ticketPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  ticketPillText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: '#2563eb',
  },
  rightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: fonts.bold,
  },
  bodySection: {
    gap: 4,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    fontFamily: fonts.medium,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paymentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  paymentBadgeText: {
    fontSize: 11,
    fontFamily: fonts.medium,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  timeText: {
    fontSize: 11,
    fontFamily: fonts.regular,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 15,
    fontFamily: fonts.bold,
  },
  comprobanteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  comprobanteBtnText: {
    fontSize: 11,
    color: '#2563eb',
    fontFamily: fonts.semiBold,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    textAlign: 'center',
    lineHeight: 18,
  },
});
