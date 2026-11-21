import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
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
  X,
  Check,
} from 'lucide-react-native';
import {
  Evento,
  MetodoPagoEntrada,
  DatosEmisionEntrada,
  AsistenteTicket,
  PreRegistroEntrada,
} from '../../types/entradas';
import { fonts } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import AnimatedButton from '../AnimatedButton';
import ComprobantePicker from './ComprobantePicker';
import QrScannerModal from './QrScannerModal';
import { buscarPreRegistroPorCodigo, buscarPreRegistrosPorDniONombre } from '../../lib/entradasService';

interface BoleteriaFormProps {
  evento: Evento;
  colaboradorId: number | null;
  colaboradorNombre: string;
  theme: any;
  procesando: boolean;
  onEmitir: (datos: DatosEmisionEntrada) => Promise<void>;
  isDesktop?: boolean;
}

export default function BoleteriaForm({
  evento,
  colaboradorId,
  colaboradorNombre,
  theme,
  procesando,
  onEmitir,
  isDesktop: propIsDesktop,
}: BoleteriaFormProps) {
  const { isDark } = useAppTheme();
  const { width } = useWindowDimensions();
  const isDesktop = propIsDesktop !== undefined ? propIsDesktop : width >= 900;
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

  // Modal Recuperar Pase con DNI / Nombre (Función solicitada)
  const [modalRecuperarVisible, setModalRecuperarVisible] = useState<boolean>(false);
  const [dniBusquedaModal, setDniBusquedaModal] = useState<string>('');
  const [buscandoDniModal, setBuscandoDniModal] = useState<boolean>(false);
  const [resultadosModal, setResultadosModal] = useState<PreRegistroEntrada[]>([]);
  const [haBuscadoModal, setHaBuscadoModal] = useState<boolean>(false);

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

  const handleBuscarPorDniModal = async () => {
    const term = dniBusquedaModal.trim();
    if (!term) {
      Alert.alert('Ingresa un dato', 'Escribe el número de DNI o apellido del comprador.');
      return;
    }
    setBuscandoDniModal(true);
    setHaBuscadoModal(true);
    try {
      const res = await buscarPreRegistrosPorDniONombre(term, evento.id);
      setResultadosModal(res);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Error al buscar pre-registros.');
    } finally {
      setBuscandoDniModal(false);
    }
  };

  const handleSeleccionarPreRegistro = (reg: PreRegistroEntrada) => {
    if (reg.estado === 'COBRADO') {
      Alert.alert(
        'Pase Ya Cobrado',
        `El pase ${reg.codigo} ya fue canjeado${reg.atendido_por ? ' por ' + reg.atendido_por : ''}${reg.fecha_cobro ? ' el ' + new Date(reg.fecha_cobro).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}. No puede cobrarse nuevamente.`
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

    setModalRecuperarVisible(false);
    Alert.alert(
      '¡Pase Recuperado!',
      `Se cargó el pase ${reg.codigo} de ${reg.nombre_titular} (${reg.cantidad} ${reg.cantidad === 1 ? 'entrada' : 'entradas'} por S/ ${reg.monto_total.toFixed(2)}). Listo para cobrar.`
    );
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

  // Secciones modulares para layout responsive
  const sectionPreRegistro = (
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

          {/* Banner Recuperar Pase con DNI (Función solicitada por el usuario) */}
          <TouchableOpacity
            style={[
              styles.bannerRecuperarDni,
              {
                backgroundColor: isDark ? 'rgba(37, 99, 235, 0.12)' : '#eff6ff',
                borderColor: isDark ? 'rgba(59, 130, 246, 0.35)' : '#bfdbfe',
              },
            ]}
            onPress={() => {
              setModalRecuperarVisible(true);
              setDniBusquedaModal('');
              setResultadosModal([]);
              setHaBuscadoModal(false);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.bannerRecuperarContent}>
              <Text style={{ fontSize: 14 }}>🔍</Text>
              <Text
                style={[
                  styles.bannerRecuperarText,
                  { color: isDark ? '#93c5fd' : '#1e40af' },
                ]}
                numberOfLines={1}
              >
                ¿Cerraste tu pase sin guardarlo?{' '}
                <Text style={styles.bannerRecuperarUnderline}>Recupéralo con tu DNI</Text>
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const sectionCantidad = (
    <View style={{ marginBottom: 12 }}>
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
    </View>
  );

  const sectionTotalBanner = (
    <View style={[styles.totalBanner, { backgroundColor: theme.primaryLight }]}>
      <View>
        <Text style={[styles.totalBannerLabel, { color: theme.primary }]}>Total a Cobrar:</Text>
        <Text style={[styles.totalBannerSub, { color: theme.primary, opacity: 0.8 }]}>
          {cantidad} {cantidad === 1 ? 'entrada' : 'entradas'} • S/ {precioUnitario.toFixed(2)} c/u
        </Text>
      </View>
      <Text style={[styles.totalBannerAmount, { color: theme.primary }]}>
        S/ {total.toFixed(2)}
      </Text>
    </View>
  );

  const sectionAsistentes = (
    <View style={{ marginBottom: 12 }}>
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
    </View>
  );

  const sectionMetodoPago = (
    <View style={{ marginBottom: 12 }}>
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
    </View>
  );

  const sectionVuelto = metodoPago === 'Efectivo' ? (
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
  ) : null;

  const sectionComprobante = (
    <ComprobantePicker
      image={image}
      onImageChange={setImage}
      theme={theme}
      required={metodoPago !== 'Efectivo'}
    />
  );

  const sectionEmitirBtn = (
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
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.card, borderColor: theme.border },
        isDesktop && styles.containerDesktop,
      ]}
    >
      {/* Modal Lector de Código QR */}
      <QrScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScan={handleQrEscaneado}
      />

      {/* Modal Recuperar Pase con DNI / Nombre */}
      <Modal
        visible={modalRecuperarVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setModalRecuperarVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {/* Header del Modal */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 }}>
                <View style={[styles.modalHeaderIconBox, { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#eff6ff' }]}>
                  <Search size={18} color="#2563eb" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalTitle, { color: theme.text }]} numberOfLines={1}>
                    Recuperar Pase con DNI
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: theme.textMuted }]} numberOfLines={1}>
                    Búsqueda de entradas pre-registradas
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setModalRecuperarVisible(false)}
                style={[styles.modalCloseBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9' }]}
                activeOpacity={0.7}
              >
                <X size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Subtítulo descriptivo */}
            <Text style={[styles.modalDesc, { color: theme.textMuted }]}>
              Si el comprador cerró la página o no guardó su código ID ni su QR, ingresa su DNI o Nombre para encontrar su pase al instante.
            </Text>

            {/* Input de Búsqueda */}
            <View style={styles.modalSearchRow}>
              <View style={[styles.modalInputBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <IdCard size={18} color={theme.textMuted} />
                <TextInput
                  style={[styles.modalInput, { color: theme.text }]}
                  placeholder="Escribe DNI o apellido..."
                  placeholderTextColor={theme.textMuted}
                  value={dniBusquedaModal}
                  onChangeText={setDniBusquedaModal}
                  onSubmitEditing={handleBuscarPorDniModal}
                  returnKeyType="search"
                />
              </View>
              <TouchableOpacity
                style={[styles.modalSearchBtn, { opacity: buscandoDniModal ? 0.7 : 1 }]}
                onPress={handleBuscarPorDniModal}
                disabled={buscandoDniModal}
                activeOpacity={0.8}
              >
                {buscandoDniModal ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalSearchBtnText}>Buscar</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Lista de Resultados */}
            <ScrollView style={styles.modalResultsScroll} showsVerticalScrollIndicator={false}>
              {buscandoDniModal ? (
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color="#2563eb" />
                  <Text style={{ marginTop: 8, color: theme.textMuted, fontSize: 13, fontFamily: fonts.medium }}>
                    Buscando en la base de datos...
                  </Text>
                </View>
              ) : haBuscadoModal && resultadosModal.length === 0 ? (
                <View style={[styles.modalEmptyBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', borderColor: theme.border }]}>
                  <Text style={{ fontSize: 28, textAlign: 'center' }}>🔎</Text>
                  <Text style={[styles.modalEmptyTitle, { color: theme.text }]}>No se encontraron pases</Text>
                  <Text style={[styles.modalEmptyText, { color: theme.textMuted }]}>
                    No hay ningún pre-registro con "{dniBusquedaModal}" en este evento. Verifica que el padre haya completado el formulario en la web de entradas.
                  </Text>
                </View>
              ) : (
                resultadosModal.map((reg) => {
                  const yaCobrado = reg.estado === 'COBRADO';
                  return (
                    <View
                      key={reg.id}
                      style={[
                        styles.modalResultCard,
                        {
                          backgroundColor: isDark ? '#132238' : '#f8fafc',
                          borderColor: yaCobrado ? (isDark ? '#7f1d1d' : '#fca5a5') : (isDark ? '#1e3a8a' : '#bfdbfe'),
                        },
                      ]}
                    >
                      <View style={styles.modalResultHeader}>
                        <View style={styles.modalResultCodeBadge}>
                          <Text style={styles.modalResultCodeText}>{reg.codigo}</Text>
                        </View>
                        <View
                          style={[
                            styles.modalResultStatusBadge,
                            { backgroundColor: yaCobrado ? (isDark ? 'rgba(239, 68, 68, 0.2)' : '#fef2f2') : (isDark ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5') },
                          ]}
                        >
                          <Text
                            style={[
                              styles.modalResultStatusText,
                              { color: yaCobrado ? '#ef4444' : '#10b981' },
                            ]}
                          >
                            {yaCobrado ? 'YA COBRADO' : 'LISTO PARA COBRAR'}
                          </Text>
                        </View>
                      </View>

                      <Text style={[styles.modalResultName, { color: theme.text }]} numberOfLines={1}>
                        {reg.nombre_titular}
                      </Text>

                      <Text style={[styles.modalResultDetails, { color: theme.textMuted }]}>
                        DNI: <Text style={{ color: theme.text, fontWeight: '700' }}>{reg.dni_titular}</Text> • {reg.cantidad}{' '}
                        {reg.cantidad === 1 ? 'entrada' : 'entradas'} • Total: <Text style={{ color: '#10b981', fontWeight: '800' }}>S/ {reg.monto_total.toFixed(2)}</Text>
                      </Text>

                      {yaCobrado ? (
                        <Text style={[styles.modalResultCobradoPor, { color: isDark ? '#f87171' : '#dc2626' }]}>
                          Cobrado por {reg.atendido_por || 'Colaborador'}{reg.fecha_cobro ? ' a las ' + new Date(reg.fecha_cobro).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </Text>
                      ) : (
                        <TouchableOpacity
                          style={styles.modalResultSelectBtn}
                          onPress={() => handleSeleccionarPreRegistro(reg)}
                          activeOpacity={0.8}
                        >
                          <Check size={16} color="#ffffff" />
                          <Text style={styles.modalResultSelectBtnText}>Cargar a Boletería</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {isDesktop ? (
        <View style={styles.desktopFormRow}>
          {/* Columna Izquierda: Operación y Configuración */}
          <View style={styles.desktopColLeft}>
            {sectionPreRegistro}
            {sectionCantidad}
            {sectionMetodoPago}
            {sectionVuelto}
            {sectionComprobante}
          </View>

          {/* Columna Derecha: Resumen, Asistentes y Emisión */}
          <View style={styles.desktopColRight}>
            {sectionTotalBanner}
            {sectionAsistentes}
            {sectionEmitirBtn}
          </View>
        </View>
      ) : (
        <>
          {sectionPreRegistro}
          {sectionCantidad}
          {sectionTotalBanner}
          {sectionAsistentes}
          {sectionMetodoPago}
          {sectionVuelto}
          {sectionComprobante}
          {sectionEmitirBtn}
        </>
      )}
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
  containerDesktop: {
    marginHorizontal: 0,
    padding: 24,
    borderRadius: 20,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    marginBottom: 32,
  },
  desktopFormRow: {
    flexDirection: 'row',
    gap: 24,
    alignItems: 'flex-start',
  },
  desktopColLeft: {
    flex: 1,
    minWidth: 360,
  },
  desktopColRight: {
    flex: 1.15,
    minWidth: 400,
  },
  totalBannerSub: {
    fontSize: 11,
    fontFamily: fonts.medium,
    marginTop: 2,
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

  // Banner Recuperar con DNI
  bannerRecuperarDni: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerRecuperarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  bannerRecuperarText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
  },
  bannerRecuperarUnderline: {
    fontFamily: fonts.bold,
    textDecorationLine: 'underline',
  },

  // Modal Recuperar con DNI
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalHeaderIconBox: {
    padding: 8,
    borderRadius: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
  },
  modalSubtitle: {
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 1,
  },
  modalCloseBtn: {
    padding: 7,
    borderRadius: 10,
  },
  modalDesc: {
    fontSize: 12,
    fontFamily: fonts.regular,
    lineHeight: 17,
    marginBottom: 14,
  },
  modalSearchRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 14,
  },
  modalInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  modalInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.medium,
  },
  modalSearchBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSearchBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: fonts.bold,
  },
  modalResultsScroll: {
    maxHeight: 340,
  },
  modalEmptyBox: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
    marginVertical: 10,
  },
  modalEmptyTitle: {
    fontSize: 14,
    fontFamily: fonts.bold,
    marginTop: 4,
  },
  modalEmptyText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    textAlign: 'center',
    lineHeight: 16,
  },
  modalResultCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    marginBottom: 10,
    gap: 6,
  },
  modalResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalResultCodeBadge: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  modalResultCodeText: {
    color: '#38bdf8',
    fontSize: 12,
    fontFamily: fonts.bold,
    letterSpacing: 0.5,
  },
  modalResultStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  modalResultStatusText: {
    fontSize: 10,
    fontFamily: fonts.bold,
  },
  modalResultName: {
    fontSize: 14,
    fontFamily: fonts.bold,
  },
  modalResultDetails: {
    fontSize: 12,
    fontFamily: fonts.regular,
  },
  modalResultCobradoPor: {
    fontSize: 11,
    fontFamily: fonts.medium,
    marginTop: 2,
  },
  modalResultSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#16a34a',
    paddingVertical: 9,
    borderRadius: 10,
    marginTop: 4,
  },
  modalResultSelectBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: fonts.bold,
  },
});
