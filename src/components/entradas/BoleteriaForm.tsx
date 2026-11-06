import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ImagePickerAsset } from 'expo-image-picker';
import {
  Plus,
  Minus,
  User,
  CreditCard as IdCard,
  Banknote,
  Smartphone,
  CreditCard,
  DollarSign,
  Ticket,
} from 'lucide-react-native';
import { Evento, MetodoPagoEntrada, DatosEmisionEntrada } from '../../types/entradas';
import { fonts } from '../../theme';
import AnimatedButton from '../AnimatedButton';
import ComprobantePicker from './ComprobantePicker';

interface BoleteriaFormProps {
  evento: Evento;
  colaboradorId: number | null;
  colaboradorNombre: string;
  theme: any;
  procesando: boolean;
  onEmitir: (datos: DatosEmisionEntrada) => Promise<void>;
}

export default function BoleteriaForm({
  evento,
  colaboradorId,
  colaboradorNombre,
  theme,
  procesando,
  onEmitir,
}: BoleteriaFormProps) {
  const [cantidad, setCantidad] = useState<number>(1);
  const [nombreCompleto, setNombreCompleto] = useState<string>('');
  const [dni, setDni] = useState<string>('');
  const [metodoPago, setMetodoPago] = useState<MetodoPagoEntrada>('Efectivo');
  const [montoRecibido, setMontoRecibido] = useState<string>('');
  const [image, setImage] = useState<ImagePickerAsset | null>(null);

  // El precio unitario proviene DIRECTAMENTE de la base de datos (evento.precio_entrada)
  const precioUnitario = evento.precio_entrada;
  const total = Number((cantidad * precioUnitario).toFixed(2));

  // Cálculo de vuelto para efectivo
  const recibidoNum = parseFloat(montoRecibido) || 0;
  const vuelto = recibidoNum > total ? Number((recibidoNum - total).toFixed(2)) : 0;

  const handleIncrement = () => {
    if (evento.aforo_maximo && cantidad >= 50) {
      Alert.alert('Límite por compra', 'Máximo 50 entradas por transacción.');
      return;
    }
    setCantidad((prev) => prev + 1);
  };

  const handleDecrement = () => {
    if (cantidad > 1) {
      setCantidad((prev) => prev - 1);
    }
  };

  const setBilletesRapidos = (monto: number) => {
    setMontoRecibido(monto.toString());
  };

  const handleSubmit = async () => {
    if (procesando) return;

    if (cantidad <= 0) {
      Alert.alert('Validación', 'La cantidad de entradas debe ser al menos 1.');
      return;
    }

    if (metodoPago === 'Efectivo' && montoRecibido.trim()) {
      if (recibidoNum < total) {
        Alert.alert(
          'Monto insuficiente',
          `El monto recibido (S/ ${recibidoNum.toFixed(2)}) es menor que el total a pagar (S/ ${total.toFixed(2)}).`
        );
        return;
      }
    }

    await onEmitir({
      eventoId: evento.id,
      cantidad,
      precioUnitario,
      metodoPago,
      montoRecibido: recibidoNum > 0 ? recibidoNum : null,
      vuelto: vuelto > 0 ? vuelto : 0,
      nombreCompleto: nombreCompleto.trim(),
      dni: dni.trim(),
      comprobanteAsset: image,
      colaboradorId,
      colaboradorNombre,
    });

    // Resetear formulario tras emitir con éxito
    setCantidad(1);
    setNombreCompleto('');
    setDni('');
    setMontoRecibido('');
    setImage(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {/* 1. Selector de Cantidad */}
      <View style={styles.sectionHeader}>
        <Ticket size={16} color={theme.primary} />
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Cantidad de Entradas</Text>
      </View>

      <View style={[styles.counterRow, { backgroundColor: theme.background, borderColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.counterBtn, { backgroundColor: theme.card }]}
          onPress={handleDecrement}
          disabled={cantidad <= 1 || procesando}
        >
          <Minus size={20} color={cantidad <= 1 ? theme.textMuted : theme.text} />
        </TouchableOpacity>

        <View style={styles.counterDisplay}>
          <Text style={[styles.counterNumber, { color: theme.text }]}>{cantidad}</Text>
          <Text style={[styles.counterPriceSub, { color: theme.textMuted }]}>
            x S/ {precioUnitario.toFixed(2)}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.counterBtn, { backgroundColor: theme.card }]}
          onPress={handleIncrement}
          disabled={procesando}
        >
          <Plus size={20} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* 2. Total a Pagar en Grande */}
      <View style={[styles.totalBanner, { backgroundColor: theme.primaryLight }]}>
        <Text style={[styles.totalBannerLabel, { color: theme.primary }]}>Total a Cobrar:</Text>
        <Text style={[styles.totalBannerAmount, { color: theme.primary }]}>
          S/ {total.toFixed(2)}
        </Text>
      </View>

      {/* 3. Datos del Asistente / Titular */}
      <View style={styles.sectionHeader}>
        <User size={16} color={theme.primary} />
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Titular de la Entrada</Text>
      </View>

      <View style={styles.inputGroup}>
        <View style={[styles.inputWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <User size={16} color={theme.textMuted} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Nombre completo (Opcional)"
            placeholderTextColor={theme.textMuted}
            value={nombreCompleto}
            onChangeText={setNombreCompleto}
            editable={!procesando}
          />
        </View>

        <View style={[styles.inputWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <IdCard size={16} color={theme.textMuted} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="DNI / Documento (Opcional)"
            placeholderTextColor={theme.textMuted}
            value={dni}
            onChangeText={(txt) => setDni(txt.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12))}
            editable={!procesando}
          />
        </View>
      </View>

      {/* 4. Método de Pago */}
      <View style={styles.sectionHeader}>
        <DollarSign size={16} color={theme.primary} />
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Método de Pago</Text>
      </View>

      <View style={styles.paymentMethodsRow}>
        {(['Efectivo', 'Yape', 'Plin', 'Tarjeta', 'Transferencia'] as MetodoPagoEntrada[]).map(
          (metodo) => {
            const isSelected = metodoPago === metodo;
            return (
              <TouchableOpacity
                key={metodo}
                style={[
                  styles.paymentPill,
                  {
                    backgroundColor: isSelected ? theme.primary : theme.background,
                    borderColor: isSelected ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => setMetodoPago(metodo)}
                disabled={procesando}
              >
                {metodo === 'Efectivo' && (
                  <Banknote size={14} color={isSelected ? '#ffffff' : theme.text} />
                )}
                {(metodo === 'Yape' || metodo === 'Plin') && (
                  <Smartphone size={14} color={isSelected ? '#ffffff' : theme.text} />
                )}
                {metodo === 'Tarjeta' && (
                  <CreditCard size={14} color={isSelected ? '#ffffff' : theme.text} />
                )}
                {metodo === 'Transferencia' && (
                  <DollarSign size={14} color={isSelected ? '#ffffff' : theme.text} />
                )}
                <Text
                  style={[
                    styles.paymentPillText,
                    { color: isSelected ? '#ffffff' : theme.text },
                  ]}
                >
                  {metodo}
                </Text>
              </TouchableOpacity>
            );
          }
        )}
      </View>

      {/* 5. Calculadora de Vuelto para Efectivo */}
      {metodoPago === 'Efectivo' && (
        <View style={[styles.cashBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <Text style={[styles.cashBoxTitle, { color: theme.textMuted }]}>
            Calculadora de Vuelto (Opcional)
          </Text>

          <View style={styles.quickBillsRow}>
            <TouchableOpacity
              style={[styles.quickBillBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => setBilletesRapidos(total)}
            >
              <Text style={[styles.quickBillText, { color: theme.text }]}>Exacto</Text>
            </TouchableOpacity>
            {[10, 20, 50, 100].map((b) => (
              <TouchableOpacity
                key={b}
                style={[styles.quickBillBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => setBilletesRapidos(b)}
              >
                <Text style={[styles.quickBillText, { color: theme.text }]}>S/ {b}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.cashInputsRow}>
            <View style={[styles.cashInputWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.cashInputLabel, { color: theme.textMuted }]}>Paga con:</Text>
              <TextInput
                style={[styles.cashInput, { color: theme.text }]}
                placeholder="0.00"
                placeholderTextColor={theme.textMuted}
                value={montoRecibido}
                onChangeText={setMontoRecibido}
                keyboardType="decimal-pad"
                editable={!procesando}
              />
            </View>

            <View style={[styles.vueltoWrapper, { backgroundColor: vuelto > 0 ? '#dcfce7' : theme.card }]}>
              <Text style={[styles.vueltoLabel, { color: vuelto > 0 ? '#16a34a' : theme.textMuted }]}>
                Vuelto:
              </Text>
              <Text style={[styles.vueltoAmount, { color: vuelto > 0 ? '#16a34a' : theme.text }]}>
                S/ {vuelto.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* 6. Comprobante de Pago (Cámara o Galería) */}
      <ComprobantePicker
        image={image}
        onImageChange={setImage}
        theme={theme}
        required={metodoPago !== 'Efectivo'}
      />

      {/* 7. Botón Principal de Emisión */}
      <AnimatedButton
        style={[
          styles.emitirBtn,
          {
            backgroundColor: theme.primary,
            opacity: procesando ? 0.7 : 1,
          },
        ]}
        onPress={handleSubmit}
        disabled={procesando}
      >
        {procesando ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#ffffff" />
            <Text style={styles.emitirBtnText}>EMITIENDO TICKET EN BASE DE DATOS...</Text>
          </View>
        ) : (
          <View style={styles.btnContentRow}>
            <Ticket size={20} color="#ffffff" />
            <Text style={styles.emitirBtnText}>
              EMITIR {cantidad} {cantidad === 1 ? 'ENTRADA' : 'ENTRADAS'} (S/ {total.toFixed(2)})
            </Text>
          </View>
        )}
      </AnimatedButton>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1,
    padding: 6,
  },
  counterBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  counterDisplay: {
    alignItems: 'center',
  },
  counterNumber: {
    fontSize: 26,
    fontFamily: fonts.bold,
  },
  counterPriceSub: {
    fontSize: 11,
    fontFamily: fonts.medium,
  },
  totalBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 6,
  },
  totalBannerLabel: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
  },
  totalBannerAmount: {
    fontSize: 22,
    fontFamily: fonts.bold,
  },
  inputGroup: {
    gap: 8,
    marginBottom: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 46,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.regular,
  },
  paymentMethodsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  paymentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  paymentPillText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
  },
  cashBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginVertical: 8,
  },
  cashBoxTitle: {
    fontSize: 11,
    fontFamily: fonts.medium,
    marginBottom: 8,
  },
  quickBillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  quickBillBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickBillText: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
  },
  cashInputsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cashInputWrapper: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cashInputLabel: {
    fontSize: 10,
    fontFamily: fonts.medium,
  },
  cashInput: {
    fontSize: 16,
    fontFamily: fonts.bold,
    paddingVertical: 2,
  },
  vueltoWrapper: {
    flex: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    justifyContent: 'center',
  },
  vueltoLabel: {
    fontSize: 10,
    fontFamily: fonts.medium,
  },
  vueltoAmount: {
    fontSize: 16,
    fontFamily: fonts.bold,
  },
  emitirBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emitirBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: fonts.bold,
    letterSpacing: 0.5,
  },
});
