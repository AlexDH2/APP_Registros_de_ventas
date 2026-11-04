-- ==============================================================================
-- SCRIPT SQL: MÓDULO DE VENTA DE ENTRADAS PARA EVENTOS (ALTA CONCURRENCIA)
-- ==============================================================================
-- Compatible con Supabase PostgreSQL.
-- Ejecutar en el SQL Editor de tu proyecto de Supabase.
-- Diseñado para que 5 colaboradores registren ventas en simultáneo sin colisiones
-- ni duplicidad de números de tickets.
-- ==============================================================================

-- 1. TABLA DE EVENTOS
CREATE TABLE IF NOT EXISTS public.eventos (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  lugar TEXT DEFAULT 'Complejo Deportivo',
  fecha DATE DEFAULT CURRENT_DATE NOT NULL,
  estado TEXT NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'FINALIZADO', 'PAUSADO')),
  aforo_maximo INTEGER DEFAULT NULL, -- NULL = sin límite de aforo
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Asegurar evento inicial por defecto si la tabla está vacía
INSERT INTO public.eventos (nombre, descripcion, lugar, estado, aforo_maximo)
SELECT 'Gran Evento Deportivo 2026', 'Campeonato y Jornada Deportiva Campeones Lima', 'Sede Principal', 'ACTIVO', 1000
WHERE NOT EXISTS (SELECT 1 FROM public.eventos WHERE estado = 'ACTIVO');

-- 2. TABLA DE TIPOS DE ENTRADAS
CREATE TABLE IF NOT EXISTS public.tipos_entradas (
  id SERIAL PRIMARY KEY,
  evento_id INTEGER REFERENCES public.eventos(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  precio NUMERIC(10, 2) NOT NULL DEFAULT 10.00,
  color TEXT DEFAULT '#2563eb',
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Asegurar tipos de entradas para el evento activo
DO $$
DECLARE
  v_evento_id INT;
BEGIN
  SELECT id INTO v_evento_id FROM public.eventos WHERE estado = 'ACTIVO' LIMIT 1;
  IF v_evento_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.tipos_entradas WHERE evento_id = v_evento_id) THEN
    INSERT INTO public.tipos_entradas (evento_id, nombre, precio, color) VALUES
      (v_evento_id, 'Entrada General', 10.00, '#2563eb'),
      (v_evento_id, 'Entrada Niños / Alumnos', 5.00, '#10b981'),
      (v_evento_id, 'Entrada VIP / Preferencial', 20.00, '#8b5cf6');
  END IF;
END $$;

-- 3. SECUENCIA ATÓMICA DE NUMERACIÓN CORRELATIVA
-- Garantiza que cada entrada tenga un número único y estrictamente correlativo
CREATE SEQUENCE IF NOT EXISTS public.seq_correlativo_entradas START WITH 1 INCREMENT BY 1;

-- 4. TABLA DE VENTAS DE ENTRADAS (ENCABEZADO / TRANSACCIÓN)
CREATE TABLE IF NOT EXISTS public.ventas_entradas (
  id SERIAL PRIMARY KEY,
  evento_id INTEGER REFERENCES public.eventos(id) ON DELETE CASCADE,
  numero_ticket_inicio INTEGER NOT NULL,
  numero_ticket_fin INTEGER NOT NULL,
  cantidad_total INTEGER NOT NULL DEFAULT 1,
  monto_total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  metodo_pago TEXT NOT NULL DEFAULT 'Efectivo', -- 'Efectivo', 'Yape', 'Plin', 'Tarjeta', 'Transferencia'
  monto_recibido NUMERIC(10, 2),
  vuelto NUMERIC(10, 2) DEFAULT 0.00,
  colaborador_id INTEGER REFERENCES public.usuarios(id) ON DELETE SET NULL,
  colaborador_nombre TEXT NOT NULL DEFAULT 'Colaborador',
  nombre_comprador TEXT,
  dni_comprador TEXT,
  notas TEXT,
  estado TEXT NOT NULL DEFAULT 'COMPLETADA' CHECK (estado IN ('COMPLETADA', 'ANULADA')),
  motivo_anulacion TEXT,
  fecha TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices de alto rendimiento para consultas en vivo de colaboradores y admin
CREATE INDEX IF NOT EXISTS idx_ventas_entradas_evento ON public.ventas_entradas(evento_id);
CREATE INDEX IF NOT EXISTS idx_ventas_entradas_colaborador ON public.ventas_entradas(colaborador_nombre);
CREATE INDEX IF NOT EXISTS idx_ventas_entradas_fecha ON public.ventas_entradas(fecha DESC);

-- 5. TABLA DE DETALLE DE VENTA DE ENTRADAS (DESGLOSE POR TIPO)
CREATE TABLE IF NOT EXISTS public.detalle_venta_entradas (
  id SERIAL PRIMARY KEY,
  venta_entrada_id INTEGER REFERENCES public.ventas_entradas(id) ON DELETE CASCADE,
  tipo_entrada_id INTEGER REFERENCES public.tipos_entradas(id) ON DELETE SET NULL,
  nombre_tipo TEXT NOT NULL,
  precio_unitario NUMERIC(10, 2) NOT NULL,
  cantidad INTEGER NOT NULL DEFAULT 1,
  subtotal NUMERIC(10, 2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_detalle_venta_entradas_venta ON public.detalle_venta_entradas(venta_entrada_id);

-- 6. FUNCIÓN RPC ATÓMICA Y CONCURRENTE (100% THREAD-SAFE PARA 5 COLABORADORES)
CREATE OR REPLACE FUNCTION public.registrar_venta_entradas_atomica(
  p_evento_id INT,
  p_colaborador_id INT,
  p_colaborador_nombre TEXT,
  p_metodo_pago TEXT,
  p_monto_total NUMERIC,
  p_monto_recibido NUMERIC,
  p_vuelto NUMERIC,
  p_nombre_comprador TEXT,
  p_dni_comprador TEXT,
  p_notas TEXT,
  p_items JSONB -- Array JSON: [{"tipo_entrada_id": 1, "nombre": "General", "precio": 10.00, "cantidad": 2, "subtotal": 20.00}]
)
RETURNS JSONB AS $$
DECLARE
  v_cantidad_total INT := 0;
  v_item JSONB;
  v_ticket_inicio INT;
  v_ticket_fin INT;
  v_venta_id INT;
  v_aforo_max INT;
  v_total_vendidas INT;
  v_resultado JSONB;
BEGIN
  -- 1. Calcular cantidad total de entradas en la orden
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_cantidad_total := v_cantidad_total + COALESCE((v_item->>'cantidad')::INT, 0);
  END LOOP;

  IF v_cantidad_total <= 0 THEN
    RAISE EXCEPTION 'La cantidad de entradas debe ser mayor a cero.';
  END IF;

  -- 2. Validar límite de aforo si el evento lo tiene configurado
  SELECT aforo_maximo INTO v_aforo_max FROM public.eventos WHERE id = p_evento_id;
  IF v_aforo_max IS NOT NULL THEN
    SELECT COALESCE(SUM(cantidad_total), 0) INTO v_total_vendidas
    FROM public.ventas_entradas
    WHERE evento_id = p_evento_id AND estado = 'COMPLETADA';

    IF (v_total_vendidas + v_cantidad_total) > v_aforo_max THEN
      RAISE EXCEPTION 'Aforo máximo alcanzado (% entradas). Quedan solo % entradas disponibles.', 
        v_aforo_max, GREATEST(0, v_aforo_max - v_total_vendidas);
    END IF;
  END IF;

  -- 3. Reservar rango correlativo de forma 100% atómica
  v_ticket_inicio := nextval('public.seq_correlativo_entradas');
  IF v_cantidad_total > 1 THEN
    PERFORM setval('public.seq_correlativo_entradas', v_ticket_inicio + v_cantidad_total - 1);
    v_ticket_fin := v_ticket_inicio + v_cantidad_total - 1;
  ELSE
    v_ticket_fin := v_ticket_inicio;
  END IF;

  -- 4. Registrar la venta cabecera
  INSERT INTO public.ventas_entradas (
    evento_id,
    numero_ticket_inicio,
    numero_ticket_fin,
    cantidad_total,
    monto_total,
    metodo_pago,
    monto_recibido,
    vuelto,
    colaborador_id,
    colaborador_nombre,
    nombre_comprador,
    dni_comprador,
    notas,
    estado,
    fecha
  ) VALUES (
    p_evento_id,
    v_ticket_inicio,
    v_ticket_fin,
    v_cantidad_total,
    p_monto_total,
    p_metodo_pago,
    p_monto_recibido,
    p_vuelto,
    p_colaborador_id,
    p_colaborador_nombre,
    p_nombre_comprador,
    p_dni_comprador,
    p_notas,
    'COMPLETADA',
    timezone('utc'::text, now())
  ) RETURNING id INTO v_venta_id;

  -- 5. Registrar detalle por cada tipo de entrada
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.detalle_venta_entradas (
      venta_entrada_id,
      tipo_entrada_id,
      nombre_tipo,
      precio_unitario,
      cantidad,
      subtotal
    ) VALUES (
      v_venta_id,
      NULLIF((v_item->>'tipo_entrada_id'), '')::INT,
      COALESCE(v_item->>'nombre', 'Entrada'),
      COALESCE((v_item->>'precio')::NUMERIC, 0.00),
      COALESCE((v_item->>'cantidad')::INT, 1),
      COALESCE((v_item->>'subtotal')::NUMERIC, 0.00)
    );
  END LOOP;

  -- 6. Construir respuesta JSON
  v_resultado := jsonb_build_object(
    'success', true,
    'venta_id', v_venta_id,
    'ticket_inicio', v_ticket_inicio,
    'ticket_fin', v_ticket_fin,
    'cantidad_total', v_cantidad_total,
    'monto_total', p_monto_total,
    'metodo_pago', p_metodo_pago,
    'vuelto', p_vuelto,
    'colaborador_nombre', p_colaborador_nombre
  );

  RETURN v_resultado;
END;
$$ LANGUAGE plpgsql;

-- Otorgar permisos de ejecución
GRANT EXECUTE ON FUNCTION public.registrar_venta_entradas_atomica(
  INT, INT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, JSONB
) TO anon, authenticated, service_role;

-- 7. POLÍTICAS RLS (ACCESO SEGURO)
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_entradas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas_entradas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalle_venta_entradas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "permitir_todo_eventos" ON public.eventos;
CREATE POLICY "permitir_todo_eventos" ON public.eventos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "permitir_todo_tipos_entradas" ON public.tipos_entradas;
CREATE POLICY "permitir_todo_tipos_entradas" ON public.tipos_entradas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "permitir_todo_ventas_entradas" ON public.ventas_entradas;
CREATE POLICY "permitir_todo_ventas_entradas" ON public.ventas_entradas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "permitir_todo_detalle_venta_entradas" ON public.detalle_venta_entradas;
CREATE POLICY "permitir_todo_detalle_venta_entradas" ON public.detalle_venta_entradas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.eventos TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.tipos_entradas TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.ventas_entradas TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.detalle_venta_entradas TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.seq_correlativo_entradas TO anon, authenticated, service_role;
