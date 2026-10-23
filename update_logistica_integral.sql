-- ============================================================
-- SCRIPT DE ACTUALIZACIÓN: LOGÍSTICA INTEGRAL (7 MÓDULOS)
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- 0. Asegurar tabla ENTREGAS (si aún no había sido creada)
CREATE TABLE IF NOT EXISTS public.entregas (
  id SERIAL PRIMARY KEY,
  sede_destino_id INTEGER REFERENCES public.sedes(id) ON DELETE CASCADE,
  fecha TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  descripcion TEXT NOT NULL,
  agua_entregada INTEGER DEFAULT 0,
  gatorade_entregada INTEGER DEFAULT 0,
  url_foto TEXT,
  estado TEXT DEFAULT 'CONFIRMADA' CHECK (estado IN ('PENDIENTE_RECEPCION', 'CONFIRMADA', 'RECHAZADA')),
  recibido_por TEXT,
  fecha_recepcion TIMESTAMP WITH TIME ZONE,
  observacion_recepcion TEXT
);

-- Columnas adicionales por si la tabla ya existía previamente
ALTER TABLE public.entregas ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'CONFIRMADA' CHECK (estado IN ('PENDIENTE_RECEPCION', 'CONFIRMADA', 'RECHAZADA'));
ALTER TABLE public.entregas ADD COLUMN IF NOT EXISTS recibido_por TEXT;
ALTER TABLE public.entregas ADD COLUMN IF NOT EXISTS fecha_recepcion TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.entregas ADD COLUMN IF NOT EXISTS observacion_recepcion TEXT;
ALTER TABLE public.entregas ALTER COLUMN url_foto DROP NOT NULL;

-- 1. Almacén Central (Stock Matriz)
CREATE TABLE IF NOT EXISTS public.almacen_central (
  id SERIAL PRIMARY KEY,
  agua_stock INTEGER DEFAULT 0 NOT NULL,
  gatorade_stock INTEGER DEFAULT 0 NOT NULL,
  ultima_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO public.almacen_central (id, agua_stock, gatorade_stock)
VALUES (1, 100, 100)
ON CONFLICT (id) DO NOTHING;

-- 2. Compras a Proveedores
CREATE TABLE IF NOT EXISTS public.compras_proveedor (
  id SERIAL PRIMARY KEY,
  fecha TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  proveedor TEXT NOT NULL,
  agua_comprada INTEGER DEFAULT 0 NOT NULL,
  gatorade_comprada INTEGER DEFAULT 0 NOT NULL,
  costo_total NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
  costo_unitario_agua NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
  costo_unitario_gatorade NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
  comprobante_url TEXT,
  registrado_por TEXT DEFAULT 'Admin'
);

-- 3. Solicitudes de Pedido desde Sedes
CREATE TABLE IF NOT EXISTS public.pedidos_sede (
  id SERIAL PRIMARY KEY,
  sede_id INTEGER REFERENCES public.sedes(id) ON DELETE CASCADE,
  solicitado_por TEXT NOT NULL,
  fecha_solicitud TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  agua_solicitada INTEGER DEFAULT 0 NOT NULL,
  gatorade_solicitada INTEGER DEFAULT 0 NOT NULL,
  urgencia TEXT DEFAULT 'MEDIA' CHECK (urgencia IN ('BAJA', 'MEDIA', 'ALTA')),
  notas TEXT,
  estado TEXT DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'EN_RUTA', 'COMPLETADO', 'CANCELADO')),
  fecha_atencion TIMESTAMP WITH TIME ZONE
);

-- 4. Mermas y Bajas
CREATE TABLE IF NOT EXISTS public.mermas (
  id SERIAL PRIMARY KEY,
  sede_id INTEGER REFERENCES public.sedes(id) ON DELETE CASCADE,
  fecha TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('ROTURA', 'VENCIMIENTO', 'PERDIDA', 'CORTESIA', 'DEFECTO')),
  agua_cantidad INTEGER DEFAULT 0 NOT NULL,
  gatorade_cantidad INTEGER DEFAULT 0 NOT NULL,
  motivo TEXT NOT NULL,
  reportado_por TEXT NOT NULL,
  url_foto TEXT
);

-- 5. Transferencias entre Sedes
CREATE TABLE IF NOT EXISTS public.transferencias_sedes (
  id SERIAL PRIMARY KEY,
  sede_origen_id INTEGER REFERENCES public.sedes(id) ON DELETE CASCADE,
  sede_destino_id INTEGER REFERENCES public.sedes(id) ON DELETE CASCADE,
  fecha TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  agua_cantidad INTEGER DEFAULT 0 NOT NULL,
  gatorade_cantidad INTEGER DEFAULT 0 NOT NULL,
  motivo TEXT,
  solicitado_por TEXT NOT NULL,
  estado TEXT DEFAULT 'COMPLETADA' CHECK (estado IN ('PENDIENTE', 'COMPLETADA', 'CANCELADA'))
);

-- 6. Catálogo Multiproducto
CREATE TABLE IF NOT EXISTS public.catalogo_productos (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  categoria TEXT DEFAULT 'Bebida',
  precio_venta NUMERIC(10, 2) NOT NULL,
  costo_compra NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Permisos
GRANT ALL ON TABLE public.entregas TO anon, authenticated;
GRANT ALL ON TABLE public.almacen_central TO anon, authenticated;
GRANT ALL ON TABLE public.compras_proveedor TO anon, authenticated;
GRANT ALL ON TABLE public.pedidos_sede TO anon, authenticated;
GRANT ALL ON TABLE public.mermas TO anon, authenticated;
GRANT ALL ON TABLE public.transferencias_sedes TO anon, authenticated;
GRANT ALL ON TABLE public.catalogo_productos TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Políticas de Seguridad
ALTER TABLE public.entregas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.almacen_central ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras_proveedor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos_sede ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mermas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transferencias_sedes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogo_productos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Permitir todo en entregas" ON public.entregas FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Permitir todo en almacen_central" ON public.almacen_central FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Permitir todo en compras_proveedor" ON public.compras_proveedor FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Permitir todo en pedidos_sede" ON public.pedidos_sede FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Permitir todo en mermas" ON public.mermas FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Permitir todo en transferencias_sedes" ON public.transferencias_sedes FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Permitir todo en catalogo_productos" ON public.catalogo_productos FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;
