import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Ticket,
  User,
  CreditCard as IdCard,
  Phone,
  Plus,
  Minus,
  CheckCircle2,
  Copy,
  Sparkles,
  ArrowRight,
  RefreshCw,
  MapPin,
  ShieldCheck,
} from 'lucide-react-native';
import { Evento, AsistenteTicket, ResultadoPreRegistro } from '../types/entradas';
import { fetchEventoActivo, crearPreRegistro } from '../lib/entradasService';
import { fonts } from '../theme';

export default function ComprarEntradasScreen() {
  const [evento, setEvento] = useState<Evento | null>(null);
  const [loadingEvento, setLoadingEvento] = useState<boolean>(true);

  // Datos del Comprador (Padre / Titular)
  const [nombreTitular, setNombreTitular] = useState<string>('');
  const [dniTitular, setDniTitular] = useState<string>('');
  const [telefono, setTelefono] = useState<string>('');

  // Cantidad y Asistentes
  const [cantidad, setCantidad] = useState<number>(1);
  const [asistentes, setAsistentes] = useState<AsistenteTicket[]>([{ nombre: '', dni: '' }]);

  // Estado de Envío y Resultado
  const [enviando, setEnviando] = useState<boolean>(false);
  const [paseGenerado, setPaseGenerado] = useState<ResultadoPreRegistro | null>(null);
  const [codigoCopiado, setCodigoCopiado] = useState<boolean>(false);

  useEffect(() => {
    cargarEvento();
  }, []);

  const cargarEvento = async () => {
    try {
      setLoadingEvento(true);
      const ev = await fetchEventoActivo();
      setEvento(ev);
    } catch (e) {
      console.error('Error al cargar evento:', e);
    } finally {
      setLoadingEvento(false);
    }
  };

  const precioUnitario = evento?.precio_entrada || 5.0;
  const montoTotal = Number((cantidad * precioUnitario).toFixed(2));

  const handleIncrement = () => {
    if (cantidad >= 20) {
      Alert.alert('Límite', 'Máximo 20 entradas por pre-registro.');
      return;
    }
    const next = cantidad + 1;
    setCantidad(next);
    setAsistentes((curr) => {
      const copia = [...curr];
      while (copia.length < next) {
        copia.push({ nombre: '', dni: '' });
      }
      return copia;
    });
  };

  const handleDecrement = () => {
    if (cantidad > 1) {
      const next = cantidad - 1;
      setCantidad(next);
      setAsistentes((curr) => curr.slice(0, next));
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

  const handleAutofillTitularAsistente1 = () => {
    if (!nombreTitular.trim() && !dniTitular.trim()) {
      Alert.alert('Atención', 'Ingresa primero tus datos (Nombre y DNI) en el paso 1.');
      return;
    }
    handleUpdateAsistente(0, 'nombre', nombreTitular.trim());
    handleUpdateAsistente(0, 'dni', dniTitular.trim());
  };

  const handleCopiarTitularATodos = () => {
    if (!nombreTitular.trim()) {
      Alert.alert('Atención', 'Ingresa primero tus datos en el paso 1.');
      return;
    }
    setAsistentes((prev) => {
      return prev.map((item, idx) => {
        if (idx === 0) {
          return {
            nombre: item.nombre || nombreTitular.trim(),
            dni: item.dni || dniTitular.trim(),
          };
        }
        return {
          nombre: item.nombre || `${nombreTitular.trim()} (Acompañante ${idx + 1})`,
          dni: item.dni || dniTitular.trim(),
        };
      });
    });
  };

  const handleCopiarCodigo = () => {
    if (!paseGenerado) return;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(paseGenerado.codigo);
      setCodigoCopiado(true);
      setTimeout(() => setCodigoCopiado(false), 2500);
    } else {
      Alert.alert('Código de Ingreso', paseGenerado.codigo);
    }
  };

  const handleCopiarYape = () => {
    const numero = evento?.yape_numero?.trim();
    if (!numero) return;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(numero.replace(/\s+/g, ''));
      Alert.alert('Copiado', `Número de Yape (${numero}) copiado.`);
    } else {
      Alert.alert('Número Yape', numero);
    }
  };

  const renderTarjetaYape = (montoMostrar: number) => {
    if (!evento?.yape_imagen_url && !evento?.yape_numero && !evento?.yape_titular) {
      return null;
    }

    return (
      <View
        style={{
          backgroundColor: '#faf5ff',
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
          borderWidth: 1.5,
          borderColor: '#d8b4fe',
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: '#7e22ce',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#ffffff', fontFamily: fonts.bold, fontSize: 13 }}>Y</Text>
            </View>
            <View>
              <Text style={{ fontSize: 14, fontFamily: fonts.bold, color: '#581c87' }}>
                Datos de Pago Yape
              </Text>
              <Text style={{ fontSize: 11, fontFamily: fonts.regular, color: '#7e22ce' }}>
                Muestra tu captura de Yape en puerta
              </Text>
            </View>
          </View>
          <View
            style={{
              backgroundColor: '#ffffff',
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#e9d5ff',
            }}
          >
            <Text style={{ fontSize: 13, fontFamily: fonts.bold, color: '#6b21a8' }}>
              S/ {montoMostrar.toFixed(2)}
            </Text>
          </View>
        </View>

        {!!evento?.yape_imagen_url && (
          <Image
            source={{ uri: evento.yape_imagen_url }}
            style={{
              width: '100%',
              height: 240,
              borderRadius: 12,
              backgroundColor: '#ffffff',
              marginBottom: 10,
            }}
            resizeMode="contain"
          />
        )}

        {(!!evento?.yape_numero || !!evento?.yape_titular) && (
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              padding: 12,
              borderWidth: 1,
              borderColor: '#e9d5ff',
              gap: 6,
            }}
          >
            {!!evento?.yape_numero && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontSize: 10, fontFamily: fonts.bold, color: '#94a3b8' }}>NÚMERO YAPE</Text>
                  <Text style={{ fontSize: 17, fontFamily: fonts.bold, color: '#581c87' }}>
                    {evento.yape_numero}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleCopiarYape}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: '#7e22ce',
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 8,
                  }}
                >
                  <Copy size={13} color="#ffffff" />
                  <Text style={{ color: '#ffffff', fontSize: 12, fontFamily: fonts.bold }}>Copiar</Text>
                </TouchableOpacity>
              </View>
            )}
            {!!evento?.yape_titular && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 4 }}>
                <Text style={{ fontSize: 12, fontFamily: fonts.regular, color: '#64748b' }}>Titular:</Text>
                <Text style={{ fontSize: 12, fontFamily: fonts.semiBold, color: '#1e293b' }}>
                  {evento.yape_titular}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const handleSubmit = async () => {
    if (enviando) return;

    if (!evento) {
      Alert.alert('Error', 'No hay un evento activo disponible para registrarse.');
      return;
    }

    if (!nombreTitular.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingresa tu Nombre Completo.');
      return;
    }

    if (!dniTitular.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingresa tu DNI.');
      return;
    }

    if (dniTitular.trim().length < 8) {
      Alert.alert('DNI Inválido', 'El DNI debe tener al menos 8 dígitos.');
      return;
    }

    // Validar asistentes (solo requeridos para acompañantes si cantidad >= 2)
    let asistentesLimpio: AsistenteTicket[] = [];
    if (cantidad === 1) {
      asistentesLimpio = [{
        ticket: 1,
        nombre: nombreTitular.trim(),
        dni: dniTitular.trim(),
      }];
    } else {
      for (let i = 1; i < cantidad; i++) {
        const a = asistentes[i];
        if (!a || !a.nombre?.trim()) {
          Alert.alert(
            'Faltan datos de acompañante',
            `Por favor ingresa el nombre de la persona para la Entrada #${i + 1}.`
          );
          return;
        }
      }
      asistentesLimpio = [
        { ticket: 1, nombre: nombreTitular.trim(), dni: dniTitular.trim() },
        ...asistentes.slice(1, cantidad).map((a, idx) => ({
          ticket: idx + 2,
          nombre: a.nombre.trim(),
          dni: (a.dni || dniTitular).trim(),
        })),
      ];
    }

    try {
      setEnviando(true);
      const resultado = await crearPreRegistro({
        eventoId: evento.id,
        nombreTitular: nombreTitular.trim(),
        dniTitular: dniTitular.trim(),
        telefono: telefono.trim(),
        cantidad,
        precioUnitario,
        asistentes: asistentesLimpio,
      });

      setPaseGenerado(resultado);
    } catch (err: any) {
      console.error('Error al generar pre-registro:', err);
      Alert.alert('Error', err?.message || 'No se pudo completar el pre-registro. Inténtalo nuevamente.');
    } finally {
      setEnviando(false);
    }
  };

  const handleNuevoRegistro = () => {
    setPaseGenerado(null);
    setNombreTitular('');
    setDniTitular('');
    setTelefono('');
    setCantidad(1);
    setAsistentes([{ nombre: '', dni: '' }]);
  };

  if (loadingEvento) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Cargando evento y boletería...</Text>
      </SafeAreaView>
    );
  }

  // ============================================================================
  // PANTALLA DE ÉXITO: PASE DIGITAL CON ID Y QR GENERADO
  // ============================================================================
  if (paseGenerado) {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=10&data=${encodeURIComponent(
      paseGenerado.codigo
    )}`;

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header de Éxito */}
          <View style={styles.successHeader}>
            <View style={styles.successIconBubble}>
              <CheckCircle2 size={44} color="#16a34a" />
            </View>
            <Text style={styles.successTitle}>¡Pre-Registro Exitoso!</Text>
            <Text style={styles.successSubtitle}>
              Muestra este pase al personal en la puerta de ingreso
            </Text>
          </View>

          {/* Tarjeta Principal del Pase Digital */}
          <View style={styles.passCard}>
            <View style={styles.passHeader}>
              <Text style={styles.passEventName}>{evento?.nombre || 'Evento Deportivo'}</Text>
              <View style={styles.passLocationRow}>
                <MapPin size={14} color="#64748b" />
                <Text style={styles.passLocationText}>{evento?.lugar || 'Sede Oficial'}</Text>
              </View>
            </View>

            {/* Código ID en Grande */}
            <View style={styles.codeContainer}>
              <Text style={styles.codeLabel}>TU CÓDIGO DE ATENCIÓN</Text>
              <Text style={styles.codeValue}>{paseGenerado.codigo}</Text>
              <TouchableOpacity
                style={[styles.copyBtn, codigoCopiado && styles.copyBtnSuccess]}
                onPress={handleCopiarCodigo}
              >
                <Copy size={16} color={codigoCopiado ? '#16a34a' : '#2563eb'} />
                <Text
                  style={[
                    styles.copyBtnText,
                    codigoCopiado && { color: '#16a34a', fontWeight: 'bold' },
                  ]}
                >
                  {codigoCopiado ? '¡Copiado!' : 'Toca para copiar ID'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Código QR Visual */}
            <View style={styles.qrContainer}>
              <Image source={{ uri: qrUrl }} style={styles.qrImage} resizeMode="contain" />
              <Text style={styles.qrHint}>
                El personal puede escanear este QR o ingresar tu ID
              </Text>
            </View>

            {/* Resumen de Compra */}
            <View style={styles.passDetails}>
              <View style={styles.passDetailRow}>
                <Text style={styles.passDetailLabel}>Comprador / Titular:</Text>
                <Text style={styles.passDetailValue}>{nombreTitular}</Text>
              </View>
              <View style={styles.passDetailRow}>
                <Text style={styles.passDetailLabel}>DNI:</Text>
                <Text style={styles.passDetailValue}>{dniTitular}</Text>
              </View>
              <View style={styles.passDetailRow}>
                <Text style={styles.passDetailLabel}>Cantidad de Entradas:</Text>
                <Text style={[styles.passDetailValue, { color: '#2563eb', fontWeight: 'bold' }]}>
                  {paseGenerado.cantidad} {paseGenerado.cantidad === 1 ? 'entrada' : 'entradas'}
                </Text>
              </View>
              <View style={[styles.passDetailRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Monto a Pagar en Puerta:</Text>
                <Text style={styles.totalAmount}>S/ {paseGenerado.monto_total.toFixed(2)}</Text>
              </View>
            </View>
          </View>

          {/* Datos Yape en Pantalla de Éxito */}
          {renderTarjetaYape(paseGenerado.monto_total)}

          {/* Pasos en la Puerta */}
          <View style={styles.stepsCard}>
            <View style={styles.stepsHeader}>
              <ShieldCheck size={20} color="#059669" />
              <Text style={styles.stepsTitle}>¿Qué hacer ahora?</Text>
            </View>
            <View style={styles.stepItem}>
              <Text style={styles.stepNum}>1</Text>
              <Text style={styles.stepText}>
                Toma una <Text style={{ fontWeight: 'bold' }}>captura de pantalla</Text> de este
                pase para tenerlo a la mano.
              </Text>
            </View>
            <View style={styles.stepItem}>
              <Text style={styles.stepNum}>2</Text>
              <Text style={styles.stepText}>
                Acércate a la puerta y muestra tu código{' '}
                <Text style={{ fontWeight: 'bold', color: '#2563eb' }}>{paseGenerado.codigo}</Text>{' '}
                al personal.
              </Text>
            </View>
            <View style={styles.stepItem}>
              <Text style={styles.stepNum}>3</Text>
              <Text style={styles.stepText}>
                Paga con <Text style={{ fontWeight: 'bold' }}>Yape, Plin o Efectivo</Text> y recibe
                tus boletos.
              </Text>
            </View>
          </View>

          {/* Botón para nuevo registro */}
          <TouchableOpacity style={styles.btnNuevoRegistro} onPress={handleNuevoRegistro}>
            <RefreshCw size={18} color="#475569" />
            <Text style={styles.btnNuevoRegistroText}>Registrar otra compra de entradas</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ============================================================================
  // FORMULARIO PRINCIPAL DE REGISTRO PARA PADRES
  // ============================================================================
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Banner Superior del Evento */}
        <View style={styles.eventBanner}>
          <View style={styles.badgeRow}>
            <View style={styles.badgeActive}>
              <Sparkles size={12} color="#ffffff" />
              <Text style={styles.badgeActiveText}>BOLETERÍA EN LÍNEA</Text>
            </View>
            <View style={styles.priceTag}>
              <Text style={styles.priceTagText}>S/ {precioUnitario.toFixed(2)} c/u</Text>
            </View>
          </View>

          <Text style={styles.eventTitle}>{evento?.nombre || 'Gran Evento Deportivo 2026'}</Text>

          <View style={styles.eventMetaRow}>
            <View style={styles.eventMetaItem}>
              <MapPin size={14} color="#94a3b8" />
              <Text style={styles.eventMetaText}>{evento?.lugar || 'Sede Oficial'}</Text>
            </View>
          </View>

          <Text style={styles.instructionsBanner}>
            Completa tus datos, obtén tu <Text style={{ fontWeight: 'bold' }}>Código ID</Text> y
            muéstralo en la puerta para ingresar sin colas.
          </Text>
        </View>

        {/* PASO 1: Datos del Comprador (Padre/Madre) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>1</Text>
            </View>
            <Text style={styles.cardTitle}>Datos del Comprador (Padre/Madre)</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Nombre y Apellidos Completos <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputContainer}>
              <User size={18} color="#94a3b8" />
              <TextInput
                style={styles.textInput}
                placeholder="Ej. Juan Pérez Rodríguez"
                placeholderTextColor="#94a3b8"
                value={nombreTitular}
                onChangeText={setNombreTitular}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>
                DNI <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputContainer}>
                <IdCard size={18} color="#94a3b8" />
                <TextInput
                  style={styles.textInput}
                  placeholder="8 dígitos"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  maxLength={10}
                  value={dniTitular}
                  onChangeText={setDniTitular}
                />
              </View>
            </View>

            <View style={[styles.inputGroup, { flex: 1.2 }]}>
              <Text style={styles.inputLabel}>Teléfono / WhatsApp</Text>
              <View style={styles.inputContainer}>
                <Phone size={18} color="#94a3b8" />
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej. 987654321"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                  maxLength={12}
                  value={telefono}
                  onChangeText={setTelefono}
                />
              </View>
            </View>
          </View>
        </View>

        {/* PASO 2: Cantidad de Entradas */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>2</Text>
            </View>
            <Text style={styles.cardTitle}>¿Cuántas entradas necesitas?</Text>
          </View>

          <View style={styles.counterBox}>
            <TouchableOpacity
              style={[styles.counterBtn, cantidad <= 1 && styles.counterBtnDisabled]}
              onPress={handleDecrement}
              disabled={cantidad <= 1}
            >
              <Minus size={22} color={cantidad <= 1 ? '#94a3b8' : '#1e293b'} />
            </TouchableOpacity>

            <View style={styles.counterCenter}>
              <Text style={styles.counterNumber}>{cantidad}</Text>
              <Text style={styles.counterSub}>
                {cantidad === 1 ? 'entrada' : 'entradas'} (S/ {precioUnitario.toFixed(2)} c/u)
              </Text>
            </View>

            <TouchableOpacity style={styles.counterBtn} onPress={handleIncrement}>
              <Plus size={22} color="#1e293b" />
            </TouchableOpacity>
          </View>

          {/* Total Destacado */}
          <View style={styles.totalPreviewBox}>
            <Text style={styles.totalPreviewLabel}>Total a Pagar en Puerta:</Text>
            <Text style={styles.totalPreviewAmount}>S/ {montoTotal.toFixed(2)}</Text>
          </View>
        </View>

        {/* PASO 3: Asistentes por Entrada (Solo visible si cantidad >= 2) */}
        {cantidad >= 2 && (
          <View style={styles.card}>
            <View style={styles.cardHeaderBetween}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>3</Text>
                </View>
                <Text style={styles.cardTitle}>
                  Datos de los Acompañantes ({cantidad - 1})
                </Text>
              </View>

              <TouchableOpacity style={styles.copiarTodosBtn} onPress={handleCopiarTitularATodos}>
                <Copy size={13} color="#2563eb" />
                <Text style={styles.copiarTodosText}>Copiar mis datos</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.cardSubtitle}>
              Tu entrada ya está registrada con tus datos del paso 1. Ingresa los datos de las personas que te acompañan.
            </Text>

            <View style={styles.asistentesList}>
              {/* Tarjeta Informativa Entrada #1 (Titular) */}
              <View style={[styles.asistenteCard, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
                <View style={styles.asistenteCardHeader}>
                  <View style={styles.ticketBadge}>
                    <Ticket size={13} color="#2563eb" />
                    <Text style={styles.ticketBadgeText}>Entrada #1 (Titular)</Text>
                  </View>
                  <Text style={{ fontSize: 11, fontFamily: fonts.semiBold, color: '#2563eb' }}>
                    Comprador
                  </Text>
                </View>
                <Text style={{ fontSize: 13, fontFamily: fonts.bold, color: '#1e3a8a' }}>
                  {nombreTitular || 'Nombre del Titular'}
                </Text>
                <Text style={{ fontSize: 11, fontFamily: fonts.regular, color: '#64748b' }}>
                  {dniTitular ? `DNI: ${dniTitular}` : 'Datos del paso 1'}
                </Text>
              </View>

              {/* Acompañantes a partir de la Entrada #2 */}
              {Array.from({ length: cantidad - 1 }).map((_, i) => {
                const idx = i + 1;
                const a = asistentes[idx] || { nombre: '', dni: '' };

                return (
                  <View key={`asistente-${idx}`} style={styles.asistenteCard}>
                    <View style={styles.asistenteCardHeader}>
                      <View style={styles.ticketBadge}>
                        <Ticket size={13} color="#2563eb" />
                        <Text style={styles.ticketBadgeText}>Entrada #{idx + 1}</Text>
                      </View>
                      <Text style={{ fontSize: 11, fontFamily: fonts.medium, color: '#64748b' }}>
                        Acompañante {idx}
                      </Text>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabelSm}>
                        Nombres y Apellidos <Text style={styles.required}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.textInputSm}
                        placeholder={`Nombre del Acompañante ${idx}`}
                        placeholderTextColor="#94a3b8"
                        value={a.nombre}
                        onChangeText={(val) => handleUpdateAsistente(idx, 'nombre', val)}
                        autoCapitalize="words"
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabelSm}>DNI (opcional para menores)</Text>
                      <TextInput
                        style={styles.textInputSm}
                        placeholder="DNI del acompañante"
                        placeholderTextColor="#94a3b8"
                        keyboardType="numeric"
                        maxLength={10}
                        value={a.dni}
                        onChangeText={(val) => handleUpdateAsistente(idx, 'dni', val)}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Datos Yape en el Formulario */}
        {renderTarjetaYape(montoTotal)}

        {/* Botón de Enviar Pre-Registro */}
        <TouchableOpacity
          style={[styles.btnSubmit, enviando && styles.btnSubmitDisabled]}
          onPress={handleSubmit}
          disabled={enviando}
        >
          {enviando ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Text style={styles.btnSubmitText}>Generar Mi Pase de Ingreso</Text>
              <View style={styles.btnSubmitTag}>
                <Text style={styles.btnSubmitTagText}>S/ {montoTotal.toFixed(2)}</Text>
                <ArrowRight size={16} color="#ffffff" />
              </View>
            </>
          )}
        </TouchableOpacity>

        {/* Nota de Seguridad */}
        <View style={styles.securityNote}>
          <ShieldCheck size={16} color="#64748b" />
          <Text style={styles.securityNoteText}>
            No necesitas pagar ahora. Tu código reserva tu lugar y pagas en la puerta al ingresar.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    fontFamily: fonts.medium,
    color: '#475569',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },

  // Event Banner
  eventBanner: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeActiveText: {
    color: '#ffffff',
    fontSize: 11,
    fontFamily: fonts.bold,
    letterSpacing: 0.5,
  },
  priceTag: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  priceTagText: {
    color: '#38bdf8',
    fontSize: 12,
    fontFamily: fonts.semiBold,
  },
  eventTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontFamily: fonts.bold,
    marginBottom: 8,
  },
  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  eventMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventMetaText: {
    color: '#94a3b8',
    fontSize: 13,
    fontFamily: fonts.medium,
  },
  instructionsBanner: {
    color: '#cbd5e1',
    fontSize: 13,
    fontFamily: fonts.regular,
    lineHeight: 18,
    backgroundColor: '#1e293b',
    padding: 10,
    borderRadius: 10,
  },

  // Cards
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  cardHeaderBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: '#0f172a',
  },
  cardSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: '#64748b',
    marginBottom: 14,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: fonts.bold,
  },

  // Inputs
  inputGroup: {
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: '#334155',
    marginBottom: 6,
  },
  inputLabelSm: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: '#475569',
    marginBottom: 4,
  },
  required: {
    color: '#ef4444',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: '#0f172a',
  },
  textInputSm: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: '#0f172a',
  },

  // Counter
  counterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  counterBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterBtnDisabled: {
    opacity: 0.4,
  },
  counterCenter: {
    alignItems: 'center',
  },
  counterNumber: {
    fontSize: 28,
    fontFamily: fonts.bold,
    color: '#0f172a',
  },
  counterSub: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: '#64748b',
  },
  totalPreviewBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  totalPreviewLabel: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: '#1e40af',
  },
  totalPreviewAmount: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: '#1d4ed8',
  },

  // Asistentes List
  asistentesList: {
    gap: 12,
  },
  asistenteCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  asistenteCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ticketBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ticketBadgeText: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    color: '#1e40af',
  },
  btnUsarMisDatos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  btnUsarMisDatosText: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: '#2563eb',
  },
  copiarTodosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  copiarTodosText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: '#2563eb',
  },

  // Submit Button
  btnSubmit: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 8,
    shadowColor: '#2563eb',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  btnSubmitDisabled: {
    opacity: 0.7,
  },
  btnSubmitText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: fonts.bold,
  },
  btnSubmitTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  btnSubmitTagText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: fonts.bold,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    marginTop: 16,
    paddingHorizontal: 10,
  },
  securityNoteText: {
    color: '#64748b',
    fontSize: 12,
    fontFamily: fonts.regular,
    textAlign: 'center',
    flex: 1,
  },

  // Success Screen Styles
  successHeader: {
    alignItems: 'center',
    marginVertical: 16,
  },
  successIconBubble: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: '#0f172a',
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
  },
  passCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    marginBottom: 16,
  },
  passHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  passEventName: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: '#0f172a',
    textAlign: 'center',
  },
  passLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  passLocationText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: '#64748b',
  },
  codeContainer: {
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#93c5fd',
    marginBottom: 16,
  },
  codeLabel: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: '#1d4ed8',
    letterSpacing: 1,
    marginBottom: 4,
  },
  codeValue: {
    fontSize: 36,
    fontFamily: fonts.bold,
    color: '#1e3a8a',
    letterSpacing: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  copyBtnSuccess: {
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
  },
  copyBtnText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: '#2563eb',
  },
  qrContainer: {
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 14,
  },
  qrImage: {
    width: 220,
    height: 220,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  qrHint: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
  },
  passDetails: {
    gap: 8,
  },
  passDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  passDetailLabel: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: '#64748b',
  },
  passDetailValue: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: '#0f172a',
    maxWidth: '60%',
    textAlign: 'right',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
    marginTop: 6,
  },
  totalLabel: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: '#0f172a',
  },
  totalAmount: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: '#16a34a',
  },

  // Steps Card
  stepsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  stepsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  stepsTitle: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: '#0f172a',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    fontSize: 12,
    fontFamily: fonts.bold,
    textAlign: 'center',
    lineHeight: 22,
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: '#334155',
    lineHeight: 18,
  },
  btnNuevoRegistro: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  btnNuevoRegistroText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: '#475569',
  },
});
