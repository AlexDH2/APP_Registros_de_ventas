import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DollarSign, Ticket, Users, PieChart } from 'lucide-react-native';
import { Evento, MetricasVentas } from '../../../types/entradas';
import { fonts } from '../../../theme';

interface AdminResumenCardsProps {
  evento: Evento | null;
  metricas: MetricasVentas;
  colaboradoresActivos: number;
  theme: any;
}

export default function AdminResumenCards({
  evento,
  metricas,
  colaboradoresActivos,
  theme,
}: AdminResumenCardsProps) {
  const porcentajeAforo =
    evento?.aforo_maximo && evento.aforo_maximo > 0
      ? Math.min(100, Math.round((metricas.globalEntradas / evento.aforo_maximo) * 100))
      : null;

  return (
    <View style={styles.grid}>
      {/* 1. Recaudación Total */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: '#dcfce7' }]}>
            <DollarSign size={16} color="#16a34a" />
          </View>
          <Text style={[styles.label, { color: theme.textMuted }]}>RECAUDACIÓN TOTAL</Text>
        </View>
        <Text style={[styles.value, { color: '#16a34a' }]}>
          S/ {metricas.globalTotal.toFixed(2)}
        </Text>
        <Text style={[styles.subValue, { color: theme.textMuted }]}>
          {evento ? `Precio base: S/ ${evento.precio_entrada.toFixed(2)}` : 'Sin evento'}
        </Text>
      </View>

      {/* 2. Entradas Vendidas */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: '#eff6ff' }]}>
            <Ticket size={16} color="#2563eb" />
          </View>
          <Text style={[styles.label, { color: theme.textMuted }]}>TOTAL ENTRADAS</Text>
        </View>
        <Text style={[styles.value, { color: '#2563eb' }]}>{metricas.globalEntradas}</Text>
        <Text style={[styles.subValue, { color: theme.textMuted }]}>
          {evento?.aforo_maximo ? `de ${evento.aforo_maximo} aforo` : 'Aforo sin límite'}
        </Text>
      </View>

      {/* 3. Aforo Ocupado */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: '#fef3c7' }]}>
            <PieChart size={16} color="#d97706" />
          </View>
          <Text style={[styles.label, { color: theme.textMuted }]}>OCUPACIÓN</Text>
        </View>
        <Text style={[styles.value, { color: '#d97706' }]}>
          {porcentajeAforo !== null ? `${porcentajeAforo}%` : 'Ilimitado'}
        </Text>
        <Text style={[styles.subValue, { color: theme.textMuted }]}>
          {metricas.entradasDisponibles !== null
            ? `Quedan ${metricas.entradasDisponibles}`
            : 'En curso'}
        </Text>
      </View>

      {/* 4. Colaboradores Vendiendo */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: '#f3e8ff' }]}>
            <Users size={16} color="#9333ea" />
          </View>
          <Text style={[styles.label, { color: theme.textMuted }]}>COLABORADORES</Text>
        </View>
        <Text style={[styles.value, { color: '#9333ea' }]}>{colaboradoresActivos}</Text>
        <Text style={[styles.subValue, { color: theme.textMuted }]}>con ventas registradas</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 14,
  },
  card: {
    width: '48.5%',
    borderRadius: 14,
    padding: 12,
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
    fontSize: 9,
    fontFamily: fonts.bold,
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 18,
    fontFamily: fonts.bold,
    marginBottom: 2,
  },
  subValue: {
    fontSize: 10,
    fontFamily: fonts.regular,
  },
});
