import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ticket, MapPin, Users, RefreshCw, AlertCircle, Edit3 } from 'lucide-react-native';
import { Evento, MetricasVentas } from '../../types/entradas';
import { fonts } from '../../theme';

interface EventoHeaderCardProps {
  evento: Evento | null;
  metricas: MetricasVentas;
  theme: any;
  onRefresh: () => void;
  loading: boolean;
  onPressEdit?: () => void;
}

export default function EventoHeaderCard({
  evento,
  metricas,
  theme,
  onRefresh,
  loading,
  onPressEdit,
}: EventoHeaderCardProps) {
  if (!evento) {
    return (
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: '#f59e0b' }]}>
        <View style={styles.emptyContainer}>
          <AlertCircle size={32} color="#f59e0b" />
          <View style={styles.emptyTextContainer}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              Sin Evento Activo en Base de Datos
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
              No se encontró ningún evento con estado ACTIVO en Supabase. Configura uno desde el panel
              de Administración.
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.refreshBtn, { backgroundColor: theme.primaryLight }]}
          onPress={onRefresh}
          disabled={loading}
        >
          <RefreshCw size={16} color={theme.primary} />
          <Text style={[styles.refreshBtnText, { color: theme.primary }]}>
            {loading ? 'Consultando...' : 'Reintentar Conexión'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const porcentajeOcupado =
    evento.aforo_maximo && evento.aforo_maximo > 0
      ? Math.min(100, Math.round((metricas.globalEntradas / evento.aforo_maximo) * 100))
      : null;

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.topRow}>
        <View style={styles.titleInfo}>
          <View style={styles.badgeRow}>
            <View style={styles.activePill}>
              <View style={styles.greenDot} />
              <Text style={styles.activeText}>EN VIVO</Text>
            </View>
            <TouchableOpacity
              style={[styles.pricePill, { backgroundColor: theme.primaryLight }]}
              onPress={onPressEdit}
              disabled={!onPressEdit}
            >
              <Text style={[styles.pricePillText, { color: theme.primary }]}>
                S/ {evento.precio_entrada.toFixed(2)} c/u {onPressEdit ? '✎' : ''}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.eventName, { color: theme.text }]} numberOfLines={2}>
            {evento.nombre}
          </Text>

          {evento.lugar ? (
            <View style={styles.locationRow}>
              <MapPin size={13} color={theme.textMuted} />
              <Text style={[styles.locationText, { color: theme.textMuted }]} numberOfLines={1}>
                {evento.lugar}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.topRightActions}>
          {onPressEdit && (
            <TouchableOpacity
              style={[styles.editBadgeBtn, { backgroundColor: theme.primaryLight }]}
              onPress={onPressEdit}
            >
              <Edit3 size={13} color={theme.primary} />
              <Text style={[styles.editBadgeText, { color: theme.primary }]}>Editar</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: theme.background }]}
            onPress={onRefresh}
            disabled={loading}
          >
            <RefreshCw size={16} color={theme.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Barra de Aforo en tiempo real */}
      {evento.aforo_maximo ? (
        <View style={styles.aforoContainer}>
          <View style={styles.aforoLabels}>
            <View style={styles.aforoLabelGroup}>
              <Users size={12} color={theme.textMuted} />
              <Text style={[styles.aforoText, { color: theme.textMuted }]}>
                {metricas.globalEntradas} vendidas de {evento.aforo_maximo}
              </Text>
            </View>
            <Text
              style={[
                styles.aforoDisponibles,
                {
                  color:
                    (metricas.entradasDisponibles ?? 0) <= 20 ? '#ef4444' : theme.textMuted,
                },
              ]}
            >
              Quedan {metricas.entradasDisponibles ?? 0}
            </Text>
          </View>

          <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${porcentajeOcupado ?? 0}%`,
                  backgroundColor:
                    (porcentajeOcupado ?? 0) > 90
                      ? '#ef4444'
                      : (porcentajeOcupado ?? 0) > 75
                      ? '#f59e0b'
                      : '#10b981',
                },
              ]}
            />
          </View>
        </View>
      ) : (
        <View style={styles.unlimitedRow}>
          <Ticket size={13} color={theme.textMuted} />
          <Text style={[styles.unlimitedText, { color: theme.textMuted }]}>
            Aforo Ilimitado • {metricas.globalEntradas} entradas vendidas en total
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 6,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleInfo: {
    flex: 1,
    marginRight: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16a34a',
    marginRight: 4,
  },
  activeText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: '#16a34a',
    letterSpacing: 0.5,
  },
  pricePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  pricePillText: {
    fontSize: 11,
    fontFamily: fonts.bold,
  },
  eventName: {
    fontSize: 18,
    fontFamily: fonts.bold,
    lineHeight: 22,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    fontFamily: fonts.regular,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  editBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bold,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aforoContainer: {
    marginTop: 12,
  },
  aforoLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  aforoLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  aforoText: {
    fontSize: 11,
    fontFamily: fonts.medium,
  },
  aforoDisponibles: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  unlimitedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  unlimitedText: {
    fontSize: 11,
    fontFamily: fonts.medium,
  },
  emptyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  emptyTextContainer: {
    flex: 1,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    marginBottom: 2,
  },
  emptySubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    lineHeight: 16,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  refreshBtnText: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
  },
});
