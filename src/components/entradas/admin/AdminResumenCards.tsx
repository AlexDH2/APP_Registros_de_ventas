import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { DollarSign, Ticket, Users, PieChart } from 'lucide-react-native';
import { Evento, MetricasVentas } from '../../../types/entradas';
import { fonts } from '../../../theme';

interface AdminResumenCardsProps {
  evento: Evento | null;
  metricas: MetricasVentas;
  colaboradoresActivos: number;
  theme: any;
  isDesktop?: boolean;
}

export default function AdminResumenCards({
  evento,
  metricas,
  colaboradoresActivos,
  theme,
  isDesktop: propIsDesktop,
}: AdminResumenCardsProps) {
  const { width } = useWindowDimensions();
  const isDesktop = propIsDesktop !== undefined ? propIsDesktop : width >= 800;

  const porcentajeAforo =
    evento?.aforo_maximo && evento.aforo_maximo > 0
      ? Math.min(100, Math.round((metricas.globalEntradas / evento.aforo_maximo) * 100))
      : null;

  const cardRecaudacion = (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: '#dcfce7' }]}>
          <DollarSign size={16} color="#16a34a" />
        </View>
        <Text style={[styles.label, { color: theme.textMuted }]} numberOfLines={1}>
          RECAUDACIÓN
        </Text>
      </View>
      <Text style={[styles.value, { color: '#16a34a' }]} numberOfLines={1}>
        S/ {metricas.globalTotal.toFixed(2)}
      </Text>
      <Text style={[styles.subValue, { color: theme.textMuted }]} numberOfLines={1}>
        {evento ? `Base: S/ ${evento.precio_entrada.toFixed(2)}` : 'Sin evento'}
      </Text>
    </View>
  );

  const cardEntradas = (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: '#eff6ff' }]}>
          <Ticket size={16} color="#2563eb" />
        </View>
        <Text style={[styles.label, { color: theme.textMuted }]} numberOfLines={1}>
          ENTRADAS
        </Text>
      </View>
      <Text style={[styles.value, { color: '#2563eb' }]} numberOfLines={1}>
        {metricas.globalEntradas}
      </Text>
      <Text style={[styles.subValue, { color: theme.textMuted }]} numberOfLines={1}>
        {evento?.aforo_maximo ? `de ${evento.aforo_maximo} aforo` : 'Aforo ilimitado'}
      </Text>
    </View>
  );

  const cardOcupacion = (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: '#fef3c7' }]}>
          <PieChart size={16} color="#d97706" />
        </View>
        <Text style={[styles.label, { color: theme.textMuted }]} numberOfLines={1}>
          OCUPACIÓN
        </Text>
      </View>
      <Text style={[styles.value, { color: '#d97706' }]} numberOfLines={1}>
        {porcentajeAforo !== null ? `${porcentajeAforo}%` : 'Ilimitado'}
      </Text>
      <Text style={[styles.subValue, { color: theme.textMuted }]} numberOfLines={1}>
        {metricas.entradasDisponibles !== null
          ? `Quedan ${metricas.entradasDisponibles}`
          : 'En curso'}
      </Text>
    </View>
  );

  const cardEquipo = (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: '#f3e8ff' }]}>
          <Users size={16} color="#9333ea" />
        </View>
        <Text style={[styles.label, { color: theme.textMuted }]} numberOfLines={1}>
          EQUIPO
        </Text>
      </View>
      <Text style={[styles.value, { color: '#9333ea' }]} numberOfLines={1}>
        {colaboradoresActivos}
      </Text>
      <Text style={[styles.subValue, { color: theme.textMuted }]} numberOfLines={1}>
        colaboradores activos
      </Text>
    </View>
  );

  if (isDesktop) {
    return (
      <View style={[styles.container, styles.containerDesktop]}>
        <View style={styles.rowDesktop}>
          {cardRecaudacion}
          {cardEntradas}
          {cardOcupacion}
          {cardEquipo}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Fila 1: Recaudación y Total Entradas */}
      <View style={styles.row}>
        {cardRecaudacion}
        {cardEntradas}
      </View>

      {/* Fila 2: Ocupación y Colaboradores */}
      <View style={styles.row}>
        {cardOcupacion}
        {cardEquipo}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 12,
    gap: 10,
  },
  containerDesktop: {
    marginHorizontal: 0,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  rowDesktop: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
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
    marginBottom: 6,
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 10,
    fontFamily: fonts.bold,
    letterSpacing: 0.5,
    flex: 1,
  },
  value: {
    fontSize: 19,
    fontFamily: fonts.bold,
    marginBottom: 2,
  },
  subValue: {
    fontSize: 11,
    fontFamily: fonts.regular,
  },
});
