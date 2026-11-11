import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {
  ChevronLeft,
  ChevronRight,
  Award,
  Sparkles,
  MapPin,
  CheckCircle2,
  Calendar,
  Layers,
  HeartHandshake,
  Camera,
  Shirt,
  Megaphone,
  Briefcase,
  Gift,
  HelpCircle,
  ArrowRight,
} from 'lucide-react-native';
import { fonts } from '../../theme';

interface Props {
  onIrAHorarios: () => void;
}

export default function PresentacionSlideDeck({ onIrAHorarios }: Props) {
  const [currentSlide, setCurrentSlide] = useState<number>(0);

  const totalSlides = 7;

  const handleNext = () => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
    }
  };

  return (
    <View style={styles.container}>
      {/* Barra de Progreso Superior */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${((currentSlide + 1) / totalSlides) * 100}%` },
            ]}
          />
        </View>
        <View style={styles.progressHeader}>
          <Text style={styles.progressText}>
            Diapositiva {currentSlide + 1} de {totalSlides}
          </Text>
          <View style={styles.badgeClub}>
            <Text style={styles.badgeClubText}>CAMPEONES LIMA</Text>
          </View>
        </View>
      </View>

      {/* Área Central de la Diapositiva (Scrollable para no cortar contenido) */}
      <ScrollView
        contentContainerStyle={styles.slideScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {currentSlide === 0 && (
          <View style={styles.slideBox}>
            <View style={styles.heroBadge}>
              <Sparkles size={16} color="#f59e0b" />
              <Text style={styles.heroBadgeText}>CONVOCATORIA & VOLUNTARIADO 2026</Text>
            </View>

            <Text style={styles.slideTitleMain}>Programa Auxiliar Deportivo</Text>
            <Text style={styles.slideSubtitleMain}>Club - Academia Deportiva Campeones Lima</Text>

            <View style={styles.dividerGold} />

            <Text style={styles.slideDescription}>
              Bienvenido al proceso de selección de líderes operativos y apasionados por el deporte.
              Formamos parte del desarrollo formativo y competitivo de cientos de niños y jóvenes.
            </Text>

            <View style={styles.keynoteCardHighlight}>
              <Award size={28} color="#f59e0b" />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardHighlightTitle}>Liderazgo & Experiencia Real</Text>
                <Text style={styles.cardHighlightText}>
                  Aprenderás gestión deportiva en cancha, atención y logística de primer nivel.
                </Text>
              </View>
            </View>
          </View>
        )}

        {currentSlide === 1 && (
          <View style={styles.slideBox}>
            <View style={styles.slideCategory}>
              <HeartHandshake size={18} color="#f59e0b" />
              <Text style={styles.slideCategoryText}>Misión y Propósito</Text>
            </View>

            <Text style={styles.slideTitle}>Acerca del Programa</Text>
            <Text style={styles.slideDescription}>
              El Auxiliar Deportivo es la columna vertebral de cada jornada deportiva en nuestras
              sedes. Brinda soporte operativo, administrativo y logístico a los entrenadores, alumnos
              y padres de familia.
            </Text>

            <View style={styles.cardsGrid}>
              <View style={styles.featureBox}>
                <Layers size={22} color="#38bdf8" />
                <Text style={styles.featureBoxTitle}>Soporte Operativo</Text>
                <Text style={styles.featureBoxText}>
                  Asegurar que cada entrenamiento inicie puntual con campos y materiales óptimos.
                </Text>
              </View>

              <View style={styles.featureBox}>
                <Calendar size={22} color="#34d399" />
                <Text style={styles.featureBoxTitle}>Torneos y Talleres</Text>
                <Text style={styles.featureBoxText}>
                  Participación activa en campeonatos oficiales, clínicas y eventos masivos.
                </Text>
              </View>

              <View style={styles.featureBox}>
                <Award size={22} color="#fbbf24" />
                <Text style={styles.featureBoxTitle}>Gestión Deportiva</Text>
                <Text style={styles.featureBoxText}>
                  Control de asistencia, bienvenida y protocolo institucional con las familias.
                </Text>
              </View>
            </View>
          </View>
        )}

        {currentSlide === 2 && (
          <View style={styles.slideBox}>
            <View style={styles.slideCategory}>
              <CheckCircle2 size={18} color="#10b981" />
              <Text style={styles.slideCategoryText}>Perfil del Postulante</Text>
            </View>

            <Text style={styles.slideTitle}>Requisitos de Admisión</Text>
            <Text style={styles.slideDescription}>
              Buscamos personas con energía, entusiasmo, puntualidad y vocación por el deporte.
            </Text>

            <View style={styles.requisitoItem}>
              <View style={styles.requisitoIconBox}>
                <Text style={styles.requisitoNum}>1</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.requisitoTitle}>Edad mínima: Desde 17 años</Text>
                <Text style={styles.requisitoSub}>
                  Si es menor de 18 años, se requiere autorización formal firmada de los padres o apoderados.
                </Text>
              </View>
            </View>

            <View style={styles.requisitoItem}>
              <View style={styles.requisitoIconBox}>
                <Text style={styles.requisitoNum}>2</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.requisitoTitle}>Proactividad y Comunicación Asertiva</Text>
                <Text style={styles.requisitoSub}>
                  Capacidad de resolver imprevistos con buena disposición y trato amable hacia niños y padres.
                </Text>
              </View>
            </View>

            <View style={styles.requisitoItem}>
              <View style={styles.requisitoIconBox}>
                <Text style={styles.requisitoNum}>3</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.requisitoTitle}>Ficha de Inscripción y Compromiso</Text>
                <Text style={styles.requisitoSub}>
                  Completar la entrevista, registrar turnos oficiales y cumplir con la asistencia acordada.
                </Text>
              </View>
            </View>
          </View>
        )}

        {currentSlide === 3 && (
          <View style={styles.slideBox}>
            <View style={styles.slideCategory}>
              <Briefcase size={18} color="#f59e0b" />
              <Text style={styles.slideCategoryText}>Responsabilidades</Text>
            </View>

            <Text style={styles.slideTitle}>Las 5 Funciones Clave</Text>

            <View style={styles.funcionCard}>
              <View style={[styles.funcionIconBox, { backgroundColor: '#38bdf820' }]}>
                <Megaphone size={20} color="#38bdf8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.funcionTitle}>1. Asistente de Mercadotecnia</Text>
                <Text style={styles.funcionText}>
                  Instalación de banners institucionales, entrega de información a padres y control de indumentaria.
                </Text>
              </View>
            </View>

            <View style={styles.funcionCard}>
              <View style={[styles.funcionIconBox, { backgroundColor: '#f59e0b20' }]}>
                <Shirt size={20} color="#f59e0b" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.funcionTitle}>2. Logística y Utilería Deportiva</Text>
                <Text style={styles.funcionText}>
                  Recepción, conteo y cuidado de balones, conos, chalecos y materiales deportivos antes y después de cada clase.
                </Text>
              </View>
            </View>

            <View style={styles.funcionCard}>
              <View style={[styles.funcionIconBox, { backgroundColor: '#a855f720' }]}>
                <Camera size={20} color="#c084fc" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.funcionTitle}>3. Registro Fotográfico & Reportes</Text>
                <Text style={styles.funcionText}>
                  Captura de fotos/videos de alta calidad para redes sociales y reporte inmediato de incidencias o asistencias.
                </Text>
              </View>
            </View>

            <View style={styles.funcionCard}>
              <View style={[styles.funcionIconBox, { backgroundColor: '#10b98120' }]}>
                <CheckCircle2 size={20} color="#34d399" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.funcionTitle}>4. Protocolo, Control y Atención</Text>
                <Text style={styles.funcionText}>
                  Recepción de padres y alumnos, filtro de ingreso, orden y seguridad en los accesos de la sede.
                </Text>
              </View>
            </View>

            <View style={styles.funcionCard}>
              <View style={[styles.funcionIconBox, { backgroundColor: '#fb718520' }]}>
                <Award size={20} color="#fb7185" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.funcionTitle}>5. Asistencia Técnica al Entrenador</Text>
                <Text style={styles.funcionText}>
                  Apoyo dinámico al profesor durante los ejercicios físicos, circuitos y partidos de práctica.
                </Text>
              </View>
            </View>
          </View>
        )}

        {currentSlide === 4 && (
          <View style={styles.slideBox}>
            <View style={styles.slideCategory}>
              <Gift size={18} color="#f59e0b" />
              <Text style={styles.slideCategoryText}>Reconocimiento y Crecimiento</Text>
            </View>

            <Text style={styles.slideTitle}>Beneficios Oficiales para el Staff</Text>

            <View style={styles.beneficioGrid}>
              <View style={styles.beneficioPill}>
                <Text style={styles.beneficioEmoji}>📜</Text>
                <Text style={styles.beneficioLabel}>Certificado de Horas Prácticas / Voluntariado</Text>
              </View>

              <View style={styles.beneficioPill}>
                <Text style={styles.beneficioEmoji}>👕</Text>
                <Text style={styles.beneficioLabel}>Uniformes oficiales STAFF Campeones Lima</Text>
              </View>

              <View style={styles.beneficioPill}>
                <Text style={styles.beneficioEmoji}>🏷️</Text>
                <Text style={styles.beneficioLabel}>50% de descuento para familiares directos</Text>
              </View>

              <View style={styles.beneficioPill}>
                <Text style={styles.beneficioEmoji}>⚽</Text>
                <Text style={styles.beneficioLabel}>Talleres deportivos gratuitos para el voluntario</Text>
              </View>

              <View style={styles.beneficioPill}>
                <Text style={styles.beneficioEmoji}>🏖️</Text>
                <Text style={styles.beneficioLabel}>Campamentos, salidas de integración y playa</Text>
              </View>

              <View style={styles.beneficioPill}>
                <Text style={styles.beneficioEmoji}>🛍️</Text>
                <Text style={styles.beneficioLabel}>20% de descuento en indumentaria oficial</Text>
              </View>

              <View style={styles.beneficioPill}>
                <Text style={styles.beneficioEmoji}>🚀</Text>
                <Text style={styles.beneficioLabel}>Línea de carrera y capacitaciones trimestrales</Text>
              </View>
            </View>
          </View>
        )}

        {currentSlide === 5 && (
          <View style={styles.slideBox}>
            <View style={styles.slideCategory}>
              <MapPin size={18} color="#f59e0b" />
              <Text style={styles.slideCategoryText}>Infraestructura</Text>
            </View>

            <Text style={styles.slideTitle}>Nuestras 7 Sedes de Entrenamiento</Text>
            <Text style={styles.slideDescription}>
              Turnos disponibles de mañana y tarde con campos deportivos y salones multideportivos.
            </Text>

            <View style={styles.sedesList}>
              <View style={styles.sedeItem}>
                <Text style={styles.sedeName}>1. Cristo Rey</Text>
                <Text style={styles.sedeBadge}>Campo & Salón (LMV / MV / MJ)</Text>
              </View>

              <View style={styles.sedeItem}>
                <Text style={styles.sedeName}>2. Liceo Naval</Text>
                <Text style={styles.sedeBadge}>Campo & Tarima (LMV / MV / LUN / MJ)</Text>
              </View>

              <View style={styles.sedeItem}>
                <Text style={styles.sedeName}>3. Santísima Trinidad</Text>
                <Text style={styles.sedeBadge}>Campo Tarde (MJ 18:00 - 21:00)</Text>
              </View>

              <View style={styles.sedeItem}>
                <Text style={styles.sedeName}>4. Elvira García y García</Text>
                <Text style={styles.sedeBadge}>Campo Tarde (LMV / MJ 18:15 - 21:15)</Text>
              </View>

              <View style={styles.sedeItem}>
                <Text style={styles.sedeName}>5. Libertador</Text>
                <Text style={styles.sedeBadge}>Campo & Patio (LMV / MV / LUN / MJ)</Text>
              </View>

              <View style={styles.sedeItem}>
                <Text style={styles.sedeName}>6. Buenas Nuevas</Text>
                <Text style={styles.sedeBadge}>Campo Tarde (LMV 16:30 - 20:00)</Text>
              </View>

              <View style={styles.sedeItem}>
                <Text style={styles.sedeName}>7. Fátima</Text>
                <Text style={styles.sedeBadge}>Campo & Patio (LMV / MV 16:30 - 20:00)</Text>
              </View>
            </View>
          </View>
        )}

        {currentSlide === 6 && (
          <View style={styles.slideBox}>
            <View style={styles.slideCategory}>
              <HelpCircle size={18} color="#f59e0b" />
              <Text style={styles.slideCategoryText}>Evaluación del Entrevistador</Text>
            </View>

            <Text style={styles.slideTitle}>Preguntas Clave & Cierre</Text>

            <View style={styles.questionCard}>
              <Text style={styles.questionNumber}>Pregunta 1</Text>
              <Text style={styles.questionText}>
                ¿Por qué te apasiona el deporte y qué te motivó a postular a Campeones Lima?
              </Text>
            </View>

            <View style={styles.questionCard}>
              <Text style={styles.questionNumber}>Pregunta 2</Text>
              <Text style={styles.questionText}>
                ¿Tienes experiencia previa en manejo de niños, eventos o atención al público?
              </Text>
            </View>

            <View style={styles.questionCard}>
              <Text style={styles.questionNumber}>Pregunta 3</Text>
              <Text style={styles.questionText}>
                ¿Cuáles son tus horarios de estudio/trabajo y qué sedes te quedan más cercanas?
              </Text>
            </View>

            <TouchableOpacity
              style={styles.btnIrAHorariosBig}
              onPress={onIrAHorarios}
              activeOpacity={0.85}
            >
              <Text style={styles.btnIrAHorariosBigText}>Pasar a Asignar Horarios</Text>
              <ArrowRight size={20} color="#0d1b2a" />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Controles de Navegación Inferiores */}
      <View style={styles.navBarBottom}>
        <TouchableOpacity
          style={[styles.navBtn, currentSlide === 0 && styles.navBtnDisabled]}
          onPress={handlePrev}
          disabled={currentSlide === 0}
          activeOpacity={0.7}
        >
          <ChevronLeft size={20} color={currentSlide === 0 ? '#475569' : '#ffffff'} />
          <Text style={[styles.navBtnText, currentSlide === 0 && { color: '#475569' }]}>
            Anterior
          </Text>
        </TouchableOpacity>

        {/* Indicadores de bolita */}
        <View style={styles.dotsRow}>
          {Array.from({ length: totalSlides }).map((_, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.dot, currentSlide === i && styles.dotActive]}
              onPress={() => setCurrentSlide(i)}
            />
          ))}
        </View>

        {currentSlide < totalSlides - 1 ? (
          <TouchableOpacity
            style={[styles.navBtn, styles.navBtnPrimary]}
            onPress={handleNext}
            activeOpacity={0.7}
          >
            <Text style={[styles.navBtnText, { color: '#0d1b2a', fontFamily: fonts.bold }]}>
              Siguiente
            </Text>
            <ChevronRight size={20} color="#0d1b2a" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.navBtn, styles.navBtnGold]}
            onPress={onIrAHorarios}
            activeOpacity={0.7}
          >
            <Text style={[styles.navBtnText, { color: '#0d1b2a', fontFamily: fonts.bold }]}>
              Horarios
            </Text>
            <ArrowRight size={18} color="#0d1b2a" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1b2a',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  progressBarBg: {
    height: 5,
    backgroundColor: '#1b263b',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#f59e0b',
    borderRadius: 3,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  progressText: {
    color: '#94a3b8',
    fontSize: 12,
    fontFamily: fonts.medium,
  },
  badgeClub: {
    backgroundColor: '#1b263b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  badgeClubText: {
    color: '#f59e0b',
    fontSize: 10,
    fontFamily: fonts.bold,
    letterSpacing: 0.5,
  },
  slideScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
  },
  slideBox: {
    width: '100%',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginBottom: 16,
  },
  heroBadgeText: {
    color: '#f59e0b',
    fontSize: 11,
    fontFamily: fonts.bold,
    letterSpacing: 0.5,
  },
  slideCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  slideCategoryText: {
    color: '#f59e0b',
    fontSize: 13,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  slideTitleMain: {
    color: '#ffffff',
    fontSize: 26,
    fontFamily: fonts.extraBold,
    lineHeight: 34,
  },
  slideSubtitleMain: {
    color: '#94a3b8',
    fontSize: 15,
    fontFamily: fonts.medium,
    marginTop: 4,
  },
  dividerGold: {
    width: 60,
    height: 4,
    backgroundColor: '#f59e0b',
    borderRadius: 2,
    marginVertical: 18,
  },
  slideTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontFamily: fonts.bold,
    marginBottom: 8,
  },
  slideDescription: {
    color: '#cbd5e1',
    fontSize: 14,
    fontFamily: fonts.regular,
    lineHeight: 22,
    marginBottom: 16,
  },
  keynoteCardHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#1b263b',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 10,
  },
  cardHighlightTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: fonts.bold,
  },
  cardHighlightText: {
    color: '#94a3b8',
    fontSize: 12,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  cardsGrid: {
    gap: 12,
  },
  featureBox: {
    backgroundColor: '#1b263b',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  featureBoxTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: fonts.bold,
    marginTop: 6,
  },
  featureBoxText: {
    color: '#94a3b8',
    fontSize: 12,
    fontFamily: fonts.regular,
    marginTop: 4,
    lineHeight: 18,
  },
  requisitoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#1b263b',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  requisitoIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  requisitoNum: {
    color: '#0d1b2a',
    fontSize: 15,
    fontFamily: fonts.bold,
  },
  requisitoTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: fonts.bold,
  },
  requisitoSub: {
    color: '#94a3b8',
    fontSize: 12,
    fontFamily: fonts.regular,
    marginTop: 2,
    lineHeight: 18,
  },
  funcionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#1b263b',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  funcionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  funcionTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: fonts.bold,
  },
  funcionText: {
    color: '#94a3b8',
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 2,
    lineHeight: 16,
  },
  beneficioGrid: {
    gap: 10,
  },
  beneficioPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1b263b',
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  beneficioEmoji: {
    fontSize: 20,
  },
  beneficioLabel: {
    color: '#f8fafc',
    fontSize: 13,
    fontFamily: fonts.medium,
    flex: 1,
  },
  sedesList: {
    gap: 10,
  },
  sedeItem: {
    backgroundColor: '#1b263b',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sedeName: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: fonts.bold,
  },
  sedeBadge: {
    color: '#38bdf8',
    fontSize: 12,
    fontFamily: fonts.medium,
    marginTop: 3,
  },
  questionCard: {
    backgroundColor: '#1b263b',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  questionNumber: {
    color: '#f59e0b',
    fontSize: 11,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
  },
  questionText: {
    color: '#f8fafc',
    fontSize: 13,
    fontFamily: fonts.medium,
    marginTop: 4,
    lineHeight: 20,
  },
  btnIrAHorariosBig: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f59e0b',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 10,
  },
  btnIrAHorariosBigText: {
    color: '#0d1b2a',
    fontSize: 15,
    fontFamily: fonts.bold,
  },
  navBarBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#070f18',
    borderTopWidth: 1,
    borderTopColor: '#1b263b',
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1b263b',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  navBtnPrimary: {
    backgroundColor: '#38bdf8',
  },
  navBtnGold: {
    backgroundColor: '#f59e0b',
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  navBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: fonts.medium,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#334155',
  },
  dotActive: {
    width: 18,
    backgroundColor: '#f59e0b',
  },
});
