import React from 'react';
import { View, Text, StyleSheet, ScrollView, Share, useWindowDimensions } from 'react-native';
import { Wallet, Banknote, Smartphone, CreditCard, Share2, Ticket } from 'lucide-react-native';
import { Evento, VentaEntrada } from '../../types/entradas';
import { fonts } from '../../theme';
import AnimatedButton from '../AnimatedButton';

interface CuadreCajaTabProps {
  evento: Evento;
  colaboradorNombre: string;
  misVentas: VentaEntrada[];
  theme: any;
  isDesktop?: boolean;
}

export default function CuadreCajaTab({
  evento,
  colaboradorNombre,
  misVentas,
  theme,
  isDesktop: propIsDesktop,
}: CuadreCajaTabProps) {
  const { width } = useWindowDimensions();
  const isDesktop = propIsDesktop !== undefined ? propIsDesktop : width >= 800;
  const activas = misVentas.filter((v) => v.estado === 'COMPLETADA');

  const totalEntradas = activas.reduce((acc, v) => acc + (v.cantidad || 0), 0);
  const totalMonto = activas.reduce((acc, v) => acc + v.monto_total, 0);

  const totalEfectivo = activas
    .filter((v) => v.metodo_pago === 'Efectivo')
    .reduce((acc, v) => acc + v.monto_total, 0);

  const totalYape = activas
    .filter((v) => v.metodo_pago === 'Yape')
    .reduce((acc, v) => acc + v.monto_total, 0);

  const totalPlin = activas
    .filter((v) => v.metodo_pago === 'Plin')
    .reduce((acc, v) => acc + v.monto_total, 0);

  const totalOtros = activas
    .filter((v) => v.metodo_pago !== 'Efectivo' && v.metodo_pago !== 'Yape' && v.metodo_pago !== 'Plin')
    .reduce((acc, v) => acc + v.monto_total, 0);

  const handleShareCuadre = async () => {
    const fechaStr = new Date().toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const mensaje = `🎟️ *CUADRE DE CAJA - VENTA DE ENTRADAS*
📅 Fecha: ${fechaStr}
👤 Colaborador: ${colaboradorNombre}
🏟️ Evento: ${evento.nombre}
💰 Precio Unitario: S/ ${evento.precio_entrada.toFixed(2)}
---------------------------------
🎫 Total Entradas Vendidas: ${totalEntradas}
💵 *EFECTIVO A ENTREGAR*: S/ ${totalEfectivo.toFixed(2)}
📱 Yape: S/ ${totalYape.toFixed(2)}
📱 Plin: S/ ${totalPlin.toFixed(2)}
💳 Tarjeta / Transferencia: S/ ${totalOtros.toFixed(2)}
---------------------------------
🏁 *TOTAL RECAUDADO*: S/ ${totalMonto.toFixed(2)}`;

    try {
      await Share.share({
        message: mensaje,
        title: 'Cuadre de Caja - Entradas',
      });
    } catch (e) {
      console.warn('Error al compartir cuadre:', e);
    }
  };

  const cardEfectivo = (
    <View style={[styles.mainCard, { backgroundColor: '#10b981' }, isDesktop && { marginBottom: 14 }]}>
      <View style={styles.mainCardHeader}>
        <Wallet size={20} color="#ffffff" />
        <Text style={styles.mainCardLabel}>EFECTIVO FÍSICO A ENTREGAR</Text>
      </View>
      <Text style={styles.mainCardAmount}>S/ {totalEfectivo.toFixed(2)}</Text>
      <Text style={styles.mainCardSub}>
        Monto total en billetes y monedas que debes rendir en caja
      </Text>
    </View>
  );

  const cardBreakdown = (
    <View style={[styles.breakdownCard, { backgroundColor: theme.card, borderColor: theme.border }, isDesktop && { marginHorizontal: 0, marginBottom: 0 }]}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Desglose del Turno</Text>

      <View style={[styles.rowItem, { borderBottomColor: theme.border }]}>
        <View style={styles.rowLeft}>
          <Ticket size={18} color="#2563eb" />
          <Text style={[styles.rowLabel, { color: theme.text }]}>Entradas Vendidas</Text>
        </View>
        <Text style={[styles.rowValue, { color: theme.text }]}>{totalEntradas} unid.</Text>
      </View>

      <View style={[styles.rowItem, { borderBottomColor: theme.border }]}>
        <View style={styles.rowLeft}>
          <Banknote size={18} color="#16a34a" />
          <Text style={[styles.rowLabel, { color: theme.text }]}>Efectivo Cobrado</Text>
        </View>
        <Text style={[styles.rowValue, { color: '#16a34a' }]}>S/ {totalEfectivo.toFixed(2)}</Text>
      </View>

      <View style={[styles.rowItem, { borderBottomColor: theme.border }]}>
        <View style={styles.rowLeft}>
          <Smartphone size={18} color="#9333ea" />
          <Text style={[styles.rowLabel, { color: theme.text }]}>Yape</Text>
        </View>
        <Text style={[styles.rowValue, { color: theme.text }]}>S/ {totalYape.toFixed(2)}</Text>
      </View>

      <View style={[styles.rowItem, { borderBottomColor: theme.border }]}>
        <View style={styles.rowLeft}>
          <Smartphone size={18} color="#0284c7" />
          <Text style={[styles.rowLabel, { color: theme.text }]}>Plin</Text>
        </View>
        <Text style={[styles.rowValue, { color: theme.text }]}>S/ {totalPlin.toFixed(2)}</Text>
      </View>

      <View style={[styles.rowItem, { borderBottomColor: theme.border }]}>
        <View style={styles.rowLeft}>
          <CreditCard size={18} color="#d97706" />
          <Text style={[styles.rowLabel, { color: theme.text }]}>Tarjeta / Banco</Text>
        </View>
        <Text style={[styles.rowValue, { color: theme.text }]}>S/ {totalOtros.toFixed(2)}</Text>
      </View>

      {/* Total General */}
      <View style={styles.totalRow}>
        <Text style={[styles.totalLabel, { color: theme.text }]}>Total Recaudado:</Text>
        <Text style={[styles.totalAmount, { color: theme.primary }]}>
          S/ {totalMonto.toFixed(2)}
        </Text>
      </View>
    </View>
  );

  const btnShare = (
    <AnimatedButton style={[styles.shareBtn, isDesktop && { marginHorizontal: 0 }]} onPress={handleShareCuadre}>
      <Share2 size={18} color="#ffffff" />
      <Text style={styles.shareBtnText}>COMPARTIR CUADRE POR WHATSAPP</Text>
    </AnimatedButton>
  );

  return (
    <ScrollView contentContainerStyle={[styles.container, isDesktop && styles.containerDesktop]}>
      {isDesktop ? (
        <View style={styles.desktopRow}>
          <View style={styles.desktopColLeft}>
            {cardEfectivo}
            {btnShare}
          </View>
          <View style={styles.desktopColRight}>
            {cardBreakdown}
          </View>
        </View>
      ) : (
        <>
          {cardEfectivo}
          {cardBreakdown}
          {btnShare}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  containerDesktop: {
    paddingHorizontal: 0,
    paddingTop: 16,
    paddingBottom: 48,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },
  desktopRow: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'flex-start',
  },
  desktopColLeft: {
    flex: 1,
    minWidth: 320,
  },
  desktopColRight: {
    flex: 1.2,
    minWidth: 360,
  },
  mainCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  mainCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  mainCardLabel: {
    color: '#ffffff',
    fontSize: 11,
    fontFamily: fonts.bold,
    letterSpacing: 0.5,
  },
  mainCardAmount: {
    color: '#ffffff',
    fontSize: 32,
    fontFamily: fonts.bold,
    marginBottom: 4,
  },
  mainCardSub: {
    color: '#ecfdf5',
    fontSize: 12,
    fontFamily: fonts.regular,
  },
  breakdownCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: fonts.bold,
    marginBottom: 12,
  },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowLabel: {
    fontSize: 13,
    fontFamily: fonts.medium,
  },
  rowValue: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
  },
  totalLabel: {
    fontSize: 14,
    fontFamily: fonts.bold,
  },
  totalAmount: {
    fontSize: 20,
    fontFamily: fonts.bold,
  },
  shareBtn: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  shareBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: fonts.bold,
  },
});
