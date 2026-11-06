import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Users, User, Banknote, Smartphone, DollarSign } from 'lucide-react-native';
import { ColaboradorResumen } from '../../../types/entradas';
import { fonts } from '../../../theme';

interface MonitorColaboradoresProps {
  colaboradores: ColaboradorResumen[];
  theme: any;
}

export default function MonitorColaboradores({
  colaboradores,
  theme,
}: MonitorColaboradoresProps) {
  if (colaboradores.length === 0) {
    return (
      <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Users size={28} color={theme.textMuted} />
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>
          No hay ventas registradas por colaboradores aún.
        </Text>
      </View>
    );
  }

  const maxTotal = Math.max(...colaboradores.map((c) => c.total), 1);

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.header}>
        <Users size={16} color={theme.primary} />
        <Text style={[styles.title, { color: theme.text }]}>
          Monitor de Colaboradores en Vivo ({colaboradores.length})
        </Text>
      </View>

      <View style={styles.list}>
        {colaboradores.map((c, idx) => {
          const porcentaje = Math.round((c.total / maxTotal) * 100);
          return (
            <View
              key={c.nombre}
              style={[
                styles.itemRow,
                { borderBottomColor: idx === colaboradores.length - 1 ? 'transparent' : theme.border },
              ]}
            >
              <View style={styles.topInfo}>
                <View style={styles.colabNameRow}>
                  <View style={[styles.avatarCircle, { backgroundColor: theme.background }]}>
                    <User size={14} color={theme.primary} />
                  </View>
                  <Text style={[styles.colabName, { color: theme.text }]} numberOfLines={1}>
                    {c.nombre}
                  </Text>
                </View>

                <View style={styles.rightValues}>
                  <Text style={[styles.totalAmount, { color: theme.text }]}>
                    S/ {c.total.toFixed(2)}
                  </Text>
                  <Text style={[styles.ticketBadge, { color: theme.primary }]}>
                    {c.entradas} {c.entradas === 1 ? 'entrada' : 'entradas'}
                  </Text>
                </View>
              </View>

              {/* Barra de Progreso */}
              <View style={[styles.progressBg, { backgroundColor: theme.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${porcentaje}%`,
                      backgroundColor: theme.primary,
                    },
                  ]}
                />
              </View>

              {/* Desglose de Pago */}
              <View style={styles.breakdownRow}>
                <View style={styles.pill}>
                  <Banknote size={11} color="#16a34a" />
                  <Text style={[styles.pillText, { color: theme.textMuted }]}>
                    Efec: S/ {c.efectivo.toFixed(2)}
                  </Text>
                </View>

                <View style={styles.pill}>
                  <Smartphone size={11} color="#9333ea" />
                  <Text style={[styles.pillText, { color: theme.textMuted }]}>
                    Yape/Plin: S/ {(c.yape + c.plin).toFixed(2)}
                  </Text>
                </View>

                {c.otros > 0 && (
                  <View style={styles.pill}>
                    <DollarSign size={11} color="#0284c7" />
                    <Text style={[styles.pillText, { color: theme.textMuted }]}>
                      Otros: S/ {c.otros.toFixed(2)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 14,
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
    marginBottom: 12,
  },
  title: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
  },
  list: {
    gap: 10,
  },
  itemRow: {
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  topInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  colabNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colabName: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    flex: 1,
  },
  rightValues: {
    alignItems: 'flex-end',
  },
  totalAmount: {
    fontSize: 14,
    fontFamily: fonts.bold,
  },
  ticketBadge: {
    fontSize: 11,
    fontFamily: fonts.medium,
  },
  progressBg: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginVertical: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  breakdownRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pillText: {
    fontSize: 10,
    fontFamily: fonts.regular,
  },
  emptyCard: {
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    textAlign: 'center',
  },
});
