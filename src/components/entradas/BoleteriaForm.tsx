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
  Copy,
  QrCode,
  Search,
  Sparkles,
  RotateCcw,
  ScanLine,
} from 'lucide-react-native';
import {
  Evento,
  MetodoPagoEntrada,
  DatosEmisionEntrada,
  AsistenteTicket,
  PreRegistroEntrada,
} from '../../types/entradas';
import { fonts } from '../../theme';
import AnimatedButton from '../AnimatedButton';
import ComprobantePicker from './ComprobantePicker';
import QrScannerModal from './QrScannerModal';
import { buscarPreRegistroPorCodigo } from '../../lib/entradasService';

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
  const [asistentes, setAsistentes] = useState<AsistenteTicket[]>([{ nombre: '', dni: '' }]);
  const [metodoPago, setMetodoPago] = useState<MetodoPagoEntrada>('Efectivo');
  const [montoRecibido, setMontoRecibido] = useState<string>('');
  const [image, setImage] = useState<ImagePickerAsset | null>(null);

  // Pre-registro Web de Entradas
  const [codigoBusqueda, setCodigoBusqueda] = useState<string>('');
  const [buscandoCodigo, setBuscandoCodigo] = useState<boolean>(false);
  const [preRegistroCargado, setPreRegistroCargado] = useState<PreRegistroEntrada | null>(null);
  const [scannerVisible, setScannerVisible] = useState<boolean>(false);

  // El precio unitario proviene DIRECTAMENTE de la base de datos (evento.precio_entrada)
  const precioUnitario = evento.precio_entrada;
  const total = Number((cantidad * precioUnitario).toFixed(2));

  // Cálculo de vuelto para efectivo
  const recibidoNum = parseFloat(montoRecibido) || 0;
  const vuelto = recibidoNum > total ? Number((recibidoNum - total).toFixed(2)) : 0;

  const handleBuscarPreRegistro = async (codigoOpcional?: string) => {
    const term = (codigoOpcional !== undefined ? codigoOpcional : codigoBusqueda).trim();
    if (!term) {
      Alert.alert('Ingresa un Código', 'Escribe el código (ej. CCL-1001 o 1001) o el DNI del comprador.');
      return;
    }

    setBuscandoCodigo(true);
    try {
      const reg = await buscarPreRegistroPorCodigo(term, evento.id);
      if (!reg) {
        Alert.alert(
          'No encontrado',
          `No se encontró ningún pre-registro con "${term}". Verifica que el padre haya completado el formulario en la web.`
        );
        return;
      }

      if (reg.estado === 'COBRADO') {
        Alert.alert(
          'Código Ya Cobrado',
          `El código ${reg.codigo} ya fue canjeado previamente${reg.atendido_por ? ' por ' + reg.atendido_por : ''}${reg.fecha_cobro ? ' el ' + new Date(reg.fecha_cobro).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}. No puede cobrarse dos veces.`
        );
        return;
      }

      setPreRegistroCargado(reg);
      setCantidad(reg.cantidad);

      if (reg.asistentes && Array.isArray(reg.asistentes) && reg.asistentes.length > 0) {
        setAsistentes(
          reg.asistentes.map((a: any) => ({
            nombre: a.nombre || '',
            dni: a.dni || '',
          }))
        );
      } else {
        const list = [{ nombre: reg.nombre_titular, dni: reg.dni_titular }];
        for (let i = 1; i < reg.cantidad; i++) {
          list.push({ nombre: `${reg.nombre_titular} (Acomp ${i + 1})`, dni: reg.dni_titular });
        }
        setAsistentes(list);
      }

      Alert.alert(
        '¡Pre-Registro Encontrado!',
        `Código: ${reg.codigo}\nComprador: ${reg.nombre_titular}\nEntradas: ${reg.cantidad}\nTotal a Cobrar: S/ ${reg.monto_total.toFixed(2)}`
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Error al buscar pre-registro.');
    } finally {
      setBuscandoCodigo(false);
    }
  };

  const handleLimpiarPreRegistro = () => {
    setPreRegistroCargado(null);
    setCodigoBusqueda('');
    setCantidad(1);
    setAsistentes([{ nombre: '', dni: '' }]);
    setMontoRecibido('');
    setImage(null);
  };

  const handleQrEscaneado = (codigoLeido: string) => {
    setScannerVisible(false);
    const limpio = (codigoLeido || '').trim();
    if (!limpio) return;
    setCodigoBusqueda(limpio);
    handleBuscarPreRegistro(limpio);
  };

  const handleIncrement = () => {
    if (evento.aforo_maximo && cantidad >= 50) {
      Alert.alert('Límite por compra', 'Máximo 50 entradas por transacción.');
      return;
    }
    setCantidad((prev) => {
      const next = prev + 1;
      setAsistentes((curr) => {
        const copia = [...curr];
        while (copia.length < next) {
          copia.push({ nombre: '', dni: '' });
        }
        return copia;
      });
      return next;
    });
  };

  const handleDecrement = () => {
    if (cantidad > 1) {
      setCantidad((prev) => {
        const next = prev - 1;
        setAsistentes((curr) => curr.slice(0, next));
        return next;
      });
    }
  };

  const handleUpdateAsistente = (index: number, campo: 'nombre' | 'dni', valor: string) => {
    setAsistentes((prev) => {
      const copia = [...prev];
      while (copia.length <= index) {
        copia.push({ nombre: '', dni: '' });
      }
      copia[index] = { ...copia[index], [campo]: valor };
      return copia;
    });
  };

  const handleCopiarDatosTitular = () => {
    const titular = asistentes[0];
    if (!titular || (!titular.nombre?.trim() && !titular.dni?.trim())) {
      Alert.alert('Aviso', 'Ingresa primero el nombre o DNI del Ticket #1 (Titular).');
      return;
    }
    setAsistentes((prev) => {
      return prev.map((item, idx) => {
        if (idx === 0) return item;
        return {
          nombre: titular.nombre ? `${titular.nombre.trim()} (Acompañante ${idx + 1})` : item.nombre,
          dni: item.dni || titular.dni,
        };
      });
    });
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

    const asistentesLimpio: AsistenteTicket[] = Array.from({ length: cantidad }).map((_, idx) => ({
      ticket: idx + 1,
      nombre: (asistentes[idx]?.nombre || '').trim(),
      dni: (asistentes[idx]?.dni || '').trim(),
    }));
    const primerAsistente = asistentesLimpio[0] || { nombre: '', dni: '' };

    await onEmitir({
      eventoId: evento.id,
      cantidad,
      precioUnitario,
      metodoPago,
      montoRecibido: recibidoNum > 0 ? recibidoNum : total,
      vuelto: vuelto > 0 ? vuelto : 0,
      nombreCompleto: primerAsistente.nombre,
      dni: primerAsistente.dni,
      asistentes: asistentesLimpio,
      comprobanteAsset: image,
      colaboradorId,
      colaboradorNombre,
      preRegistroCodigo: preRegistroCargado?.codigo,
    });

    // Resetear formulario tras emitir con éxito
    setPreRegistroCargado(null);
    setCodigoBusqueda('');
    setCantidad(1);
    setAsistentes([{ nombre: '', dni: '' }]);
    setMontoRecibido('');
    setImage(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {/* 0. SECCIÓN DE CANJE DE PRE-REGISTRO POR CÓDIGO ID O QR */}
      <View
        style={[
          styles.preregistroCard,
          {
            backgroundColor: preRegistroCargado ? '#f0fdf4' : theme.background,
            borderColor: preRegistroCargado ? '#86efac' : theme.border,
          },
        ]}
      >
        <View style={styles.preregistroHeader}>
          <View style={styles.preregistroTitleRow}>
            <Sparkles size={16} color={preRegistroCargado ? '#16a34a' : theme.primary} />
            <Text
              style={[
                styles.preregistroTitle,
                { color: preRegistroCargado ? '#16a34a' : theme.text },
              ]}
            >
              {preRegistroCargado ? 'Pre-Registro Cargado' : 'Canjear Pre-Registro (Web / QR)'}
            </Text>
          </View>
          {preRegistroCargado && (
            <TouchableOpacity
              style={styles.preregistroClearBtn}
              onPress={handleLimpiarPreRegistro}
              disabled={procesando}
            >
              <RotateCcw size={13} color="#dc2626" />
              <Text style={styles.preregistroClearText}>Desvincular</Text>
            </TouchableOpacity>
          )}
        </View>

        {preRegistroCargado ? (
          <View style={styles.preregistroSuccessInfo}>
            <View style={styles.preregistroBadgeCode}>
              <Text style={styles.preregistroBadgeCodeText}>{preRegistroCargado.codigo}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.preregistroTitularText} numberOfLines={1}>
                {preRegistroCargado.nombre_titular}
              </Text>
              <Text style={styles.preregistroSubText}>
                DNI: {preRegistroCargado.dni_titular} • {preRegistroCargado.cantidad}{' '}
                {preRegistroCargado.cantidad === 1 ? 'entrada' : 'entradas'} • Total: S/{' '}
                {preRegistroCargado.monto_total.toFixed(2)}
              </Text>
            </View>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            <TouchableOpacity
              style={[styles.preregistroScanBtn, { backgroundColor: '#0f172a' }]}
              onPress={() => setScannerVisible(true)}
              disabled={buscandoCodigo || procesando}
              activeOpacity={0.8}
            >
              <ScanLine size={18} color="#38bdf8" />
              <Text style={styles.preregistroScanBtnText}>Escanear QR del Comprador</Text>
            </TouchableOpacity>

            <View style={styles.preregistroInputRow}>
              <View
                style={[
                  styles.preregistroInputBox,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <QrCode size={16} color={theme.textMuted} />
                <TextInput
                  style={[styles.preregistroInput, { color: theme.text }]}
                  placeholder="O escribe ID (ej: 1001) o DNI"
                  placeholderTextColor={theme.textMuted}
                  value={codigoBusqueda}
                  onChangeText={setCodigoBusqueda}
                  autoCapitalize="characters"
                  onSubmitEditing={() => handleBuscarPreRegistro()}
                  returnKeyType="search"
                />
              </View>
              <TouchableOpacity
                style={[styles.preregistroSearchBtn, { backgroundColor: theme.primary }]}
                onPress={() => handleBuscarPreRegistro()}
                disabled={buscandoCodigo || procesando}
              >
                {buscandoCodigo ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Search size={15} color="#ffffff" />
                    <Text style={styles.preregistroSearchBtnText}>Cargar</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Modal Lector de Código QR */}
      <QrScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScan={handleQrEscaneado}
      />

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

      {/* 3. Datos de los Asistentes (Formularios Dinámicos según la Cantidad) */}
      <View style={styles.sectionHeaderBetween}>
        <View style={styles.sectionHeaderLeft}>
          <User size={16} color={theme.primary} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {cantidad === 1 ? 'Datos del Titular / Asistente' : `Datos de los Asistentes (${cantidad})`}
          </Text>
        </View>
        {cantidad > 1 && (
          <TouchableOpacity
            style={[styles.copiarBtn, { backgroundColor: theme.primaryLight, borderColor: theme.border }]}
            onPress={handleCopiarDatosTitular}
            disabled={procesando}
          >
            <Copy size={12} color={theme.primary} />
            <Text style={[styles.copiarBtnText, { color: theme.primary }]}>Repetir Titular</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.asistentesList}>
        {Array.from({ length: cantidad }).map((_, index) => {
          const item = asistentes[index] || { nombre: '', dni: '' };
          const esPrincipal = index === 0;

          return (
            <View
              key={`asistente-box-${index}`}
              style={[
                styles.asistenteCard,
                {
                  backgroundColor: theme.background,
                  borderColor: esPrincipal ? '#93c5fd' : theme.border,
                },
              ]}
            >
              <View style={styles.asistenteCardHeader}>
                <View
                  style={[
                    styles.ticketIndexBadge,
                    { backgroundColor: esPrincipal ? '#2563eb' : theme.card },
                  ]}
                >
                  <Ticket size={11} color={esPrincipal ? '#ffffff' : theme.textMuted} />
                  <Text
                    style={[
                      styles.ticketIndexBadgeText,
                      { color: esPrincipal ? '#ffffff' : theme.text },
                    ]}
                  >
                    Ticket #{index + 1} {esPrincipal ? '• Titular' : ''}
                  </Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <View
                  style={[
                    styles.inputWrapper,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                >
                  <User size={15} color={theme.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder={
                      esPrincipal
                        ? 'Nombre completo (Opcional)'
                        : `Nombre del Asistente ${index + 1} (Opcional)`
                    }
                    placeholderTextColor={theme.textMuted}
                    value={item.nombre}
                    onChangeText={(txt) => handleUpdateAsistente(index, 'nombre', txt)}
                    editable={!procesando}
                  />
                </View>

                <View
                  style={[
                    styles.inputWrapper,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                >
                  <IdCard size={15} color={theme.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder={
                      esPrincipal
                        ? 'DNI / Documento (Opcional)'
                        : `DNI Asistente ${index + 1} (Opcional)`
                    }
                    placeholderTextColor={theme.textMuted}
                    value={item.dni}
                    onChangeText={(txt) =>
                      handleUpdateAsistente(
                        index,
                        'dni',
                        txt.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)
                      )
                    }
                    editable={!procesando}
                  />
                </View>
              </View>
            </View>
          );
        })}
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
  sectionHeaderBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 8,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  copiarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  copiarBtnText: {
    fontSize: 10,
    fontFamily: fonts.semiBold,
  },
  asistentesList: {
    gap: 10,
    marginBottom: 6,
  },
  asistenteCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    gap: 8,
  },
  asistenteCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ticketIndexBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ticketIndexBadgeText: {
    fontSize: 10,
    fontFamily: fonts.bold,
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
  // Estilos de Pre-Registro
  preregistroCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    marginBottom: 14,
  },
  preregistroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  preregistroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  preregistroTitle: {
    fontSize: 13,
    fontFamily: fonts.bold,
  },
  preregistroClearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  preregistroClearText: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    color: '#dc2626',
  },
  preregistroSuccessInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  preregistroBadgeCode: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  preregistroBadgeCodeText: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: fonts.bold,
    letterSpacing: 0.5,
  },
  preregistroTitularText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: '#14532d',
  },
  preregistroSubText: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: '#166534',
  },
  preregistroInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  preregistroInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 42,
  },
  preregistroInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.medium,
  },
  preregistroSearchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
  },
  preregistroSearchBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: fonts.bold,
  },
  preregistroScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 10,
  },
  preregistroScanBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: fonts.bold,
    letterSpacing: 0.3,
  },
});
