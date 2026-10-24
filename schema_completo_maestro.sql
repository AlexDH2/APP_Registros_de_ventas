-- ==============================================================================
-- SCRIPT MAESTRO DEFINITIVO Y ACTUALIZADO (SISTEMA POS & LOGÍSTICA DE BEBIDAS)
-- ==============================================================================
-- Compatible con Supabase PostgreSQL (Ejecutar en el SQL Editor de Supabase).
-- 100% A PRUEBA DE FALLOS: No depende de constraints previas y no arroja error 42P10.
-- ==============================================================================

-- 0. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------------------------
-- 1. SEDES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sedes (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  pin TEXT DEFAULT '1234',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.sedes ADD COLUMN IF NOT EXISTS pin TEXT DEFAULT '1234';
ALTER TABLE public.sedes ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Asegurar constraint UNIQUE en sedes(nombre) de forma segura
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sedes_nombre_key') THEN
    ALTER TABLE public.sedes ADD CONSTRAINT sedes_nombre_key UNIQUE (nombre);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Insertar sedes iniciales básicas sin usar ON CONFLICT (100% seguro)
INSERT INTO public.sedes (nombre)
SELECT v.nombre FROM (VALUES 
  ('Oficina'),
  ('Cristo Rey'),
  ('Liceo'),
  ('Trinidad'),
  ('Simon Bolivar'),
  ('Elvira')
) AS v(nombre)
WHERE NOT EXISTS (
  SELECT 1 FROM public.sedes s WHERE lower(s.nombre) = lower(v.nombre)
);

-- ------------------------------------------------------------------------------
-- 2. USUARIOS Y ASIGNACIÓN DE SEDES (RBAC - 3 NIVELES)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.usuarios (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  nombre_completo TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'AUXILIAR',
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Asegurar constraint UNIQUE en usuarios(username)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_username_key') THEN
    ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_username_key UNIQUE (username);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Actualizar restricción de roles para admitir CREADOR, ADMIN, LOGISTICA, AUXILIAR, VENDEDOR
ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_rol_check 
  CHECK (rol IN ('CREADOR', 'ADMIN', 'LOGISTICA', 'AUXILIAR', 'VENDEDOR'));

-- Usuario Creador Maestro inicial (admin / admin123)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.usuarios WHERE lower(username) = 'admin') THEN
    UPDATE public.usuarios SET rol = 'CREADOR' WHERE lower(username) = 'admin';
  ELSE
    INSERT INTO public.usuarios (username, password, nombre_completo, rol)
    VALUES ('admin', 'admin123', 'Administrador Principal', 'CREADOR');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.usuario_sedes (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES public.usuarios(id) ON DELETE CASCADE,
  sede_id INTEGER REFERENCES public.sedes(id) ON DELETE CASCADE
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usuario_sedes_usuario_id_sede_id_key') THEN
    ALTER TABLE public.usuario_sedes ADD CONSTRAINT usuario_sedes_usuario_id_sede_id_key UNIQUE (usuario_id, sede_id);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ------------------------------------------------------------------------------
-- 3. CONFIGURACIÓN DINÁMICA DE PRECIOS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.configuracion_precios (
  id INTEGER PRIMARY KEY DEFAULT 1,
  precio_agua NUMERIC(10, 2) NOT NULL DEFAULT 2.00,
  precio_gatorade NUMERIC(10, 2) NOT NULL DEFAULT 3.00,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

INSERT INTO public.configuracion_precios (id, precio_agua, precio_gatorade)
SELECT 1, 2.00, 3.00
WHERE NOT EXISTS (SELECT 1 FROM public.configuracion_precios WHERE id = 1);

-- ------------------------------------------------------------------------------
-- 4. INVENTARIO DE BEBIDAS POR SEDE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventario_bebidas (
  id SERIAL PRIMARY KEY,
  sede_id INTEGER REFERENCES public.sedes(id) ON DELETE CASCADE,
  agua_cantidad INTEGER DEFAULT 0 NOT NULL,
  gatorade_cantidad INTEGER DEFAULT 0 NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventario_bebidas_sede_id_key') THEN
    ALTER TABLE public.inventario_bebidas ADD CONSTRAINT inventario_bebidas_sede_id_key UNIQUE (sede_id);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Inicializar inventario en cero para todas las sedes que no tengan registro
INSERT INTO public.inventario_bebidas (sede_id, agua_cantidad, gatorade_cantidad)
SELECT s.id, 0, 0 
FROM public.sedes s
WHERE NOT EXISTS (
  SELECT 1 FROM public.inventario_bebidas ib WHERE ib.sede_id = s.id
);

-- Trigger para crear automáticamente inventario en 0 al agregar nueva sede
CREATE OR REPLACE FUNCTION public.crear_inventario_sede_automatica()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.inventario_bebidas WHERE sede_id = NEW.id) THEN
    INSERT INTO public.inventario_bebidas (sede_id, agua_cantidad, gatorade_cantidad)
    VALUES (NEW.id, 0, 0);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_crear_inventario ON public.sedes;
CREATE TRIGGER trigger_auto_crear_inventario
AFTER INSERT ON public.sedes
FOR EACH ROW
EXECUTE FUNCTION public.crear_inventario_sede_automatica();

-- ------------------------------------------------------------------------------
-- 5. ALMACÉN CENTRAL (STOCK MATRIZ)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.almacen_central (
  id INTEGER PRIMARY KEY DEFAULT 1,
  agua_stock INTEGER DEFAULT 0 NOT NULL,
  gatorade_stock INTEGER DEFAULT 0 NOT NULL,
  ultima_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO public.almacen_central (id, agua_stock, gatorade_stock)
SELECT 1, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM public.almacen_central WHERE id = 1);

-- ------------------------------------------------------------------------------
-- 6. COMPRAS A PROVEEDORES
-- ------------------------------------------------------------------------------
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
  registrado_por TEXT DEFAULT 'Administrador'
);

-- ------------------------------------------------------------------------------
-- 7. CAJAS (TURNOS, APERTURA Y ARQUEO)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cajas (
  id SERIAL PRIMARY KEY,
  sede_id INTEGER REFERENCES public.sedes(id) ON DELETE CASCADE,
  usuario_id INTEGER REFERENCES public.usuarios(id) ON DELETE SET NULL,
  fecha_apertura TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  fecha_cierre TIMESTAMP WITH TIME ZONE,
  monto_apertura NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  monto_cierre_declarado NUMERIC(10, 2),
  monto_cierre_sistema NUMERIC(10, 2),
  estado TEXT NOT NULL DEFAULT 'ABIERTA' CHECK (estado IN ('ABIERTA', 'CERRADA'))
);

-- ------------------------------------------------------------------------------
-- 8. VENTAS (1 CLIC Y DETALLADAS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ventas (
  id SERIAL PRIMARY KEY,
  sede_id INTEGER REFERENCES public.sedes(id) ON DELETE CASCADE,
  caja_id INTEGER REFERENCES public.cajas(id) ON DELETE SET NULL,
  fecha TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  metodo_pago TEXT NOT NULL DEFAULT 'Efectivo',
  banco TEXT,
  agua_vendida INTEGER DEFAULT 0 NOT NULL,
  gatorade_vendida INTEGER DEFAULT 0 NOT NULL,
  url_captura TEXT,
  monto NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
  descripcion TEXT DEFAULT 'Venta Rápida 1 Clic (Efectivo Exacto)',
  vendedor TEXT DEFAULT 'Vendedor Desconocido',
  estado TEXT DEFAULT 'COMPLETADA'
);

-- Asegurar columnas si ventas ya existía previamente
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS caja_id INTEGER REFERENCES public.cajas(id) ON DELETE SET NULL;
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS monto NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS descripcion TEXT DEFAULT 'Venta sin descripción';
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS vendedor TEXT DEFAULT 'Vendedor Desconocido';
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS motivo_anulacion TEXT;
ALTER TABLE public.ventas ALTER COLUMN url_captura DROP NOT NULL;
ALTER TABLE public.ventas DROP CONSTRAINT IF EXISTS ventas_estado_check;
ALTER TABLE public.ventas ADD CONSTRAINT ventas_estado_check 
  CHECK (estado IN ('COMPLETADA', 'SOLICITADA_ANULACION', 'ANULADA'));

-- ------------------------------------------------------------------------------
-- 9. SOLICITUDES DE ANULACIÓN
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.anulaciones (
  id SERIAL PRIMARY KEY,
  venta_id INTEGER REFERENCES public.ventas(id) ON DELETE CASCADE,
  usuario_solicitante_id INTEGER REFERENCES public.usuarios(id) ON DELETE SET NULL,
  motivo TEXT NOT NULL,
  fecha_solicitud TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  estado TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'APROBADA', 'RECHAZADA'))
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'anulaciones_venta_id_key') THEN
    ALTER TABLE public.anulaciones ADD CONSTRAINT anulaciones_venta_id_key UNIQUE (venta_id);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ------------------------------------------------------------------------------
-- 10. SOLICITUDES DE PEDIDOS DESDE SEDES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pedidos_sede (
  id SERIAL PRIMARY KEY,
  sede_id INTEGER REFERENCES public.sedes(id) ON DELETE CASCADE,
  solicitado_por TEXT NOT NULL,
  fecha_solicitud TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  agua_solicitada INTEGER DEFAULT 0 NOT NULL,
  gatorade_solicitada INTEGER DEFAULT 0 NOT NULL,
  urgencia TEXT DEFAULT 'MEDIA' CHECK (urgencia IN ('BAJA', 'MEDIA', 'ALTA')),
  notas TEXT,
  estado TEXT DEFAULT 'PENDIENTE',
  atendido_por TEXT,
  fecha_atencion TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.pedidos_sede DROP CONSTRAINT IF EXISTS pedidos_sede_estado_check;
ALTER TABLE public.pedidos_sede ADD CONSTRAINT pedidos_sede_estado_check 
  CHECK (estado IN ('PENDIENTE', 'APROBADO', 'EN_CAMINO', 'EN_RUTA', 'COMPLETADO', 'RECHAZADO', 'CANCELADO'));

-- ------------------------------------------------------------------------------
-- 11. ENTREGAS / LOGÍSTICA (DOBLE CONFORMIDAD Y CONDICIONES)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.entregas (
  id SERIAL PRIMARY KEY,
  sede_destino_id INTEGER REFERENCES public.sedes(id) ON DELETE CASCADE,
  fecha TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  descripcion TEXT DEFAULT 'Entrega de Bebidas',
  agua_entregada INTEGER DEFAULT 0 NOT NULL,
  gatorade_entregada INTEGER DEFAULT 0 NOT NULL,
  url_foto TEXT,
  estado TEXT DEFAULT 'PENDIENTE_RECEPCION',
  entregado_por TEXT,
  recibido_por TEXT,
  fecha_recepcion TIMESTAMP WITH TIME ZONE,
  observacion_recepcion TEXT,
  condicion_envio TEXT DEFAULT 'COMPLETO',
  agua_solicitada INTEGER DEFAULT 0,
  gatorade_solicitada INTEGER DEFAULT 0,
  agua_diferencia INTEGER DEFAULT 0,
  gatorade_diferencia INTEGER DEFAULT 0,
  motivo_condicion TEXT,
  pedido_id INTEGER REFERENCES public.pedidos_sede(id) ON DELETE SET NULL
);

ALTER TABLE public.entregas ADD COLUMN IF NOT EXISTS entregado_por TEXT;
ALTER TABLE public.entregas ADD COLUMN IF NOT EXISTS recibido_por TEXT;
ALTER TABLE public.entregas ADD COLUMN IF NOT EXISTS fecha_recepcion TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.entregas ADD COLUMN IF NOT EXISTS observacion_recepcion TEXT;
ALTER TABLE public.entregas ADD COLUMN IF NOT EXISTS condicion_envio TEXT DEFAULT 'COMPLETO';
ALTER TABLE public.entregas ADD COLUMN IF NOT EXISTS agua_solicitada INTEGER DEFAULT 0;
ALTER TABLE public.entregas ADD COLUMN IF NOT EXISTS gatorade_solicitada INTEGER DEFAULT 0;
ALTER TABLE public.entregas ADD COLUMN IF NOT EXISTS agua_diferencia INTEGER DEFAULT 0;
ALTER TABLE public.entregas ADD COLUMN IF NOT EXISTS gatorade_diferencia INTEGER DEFAULT 0;
ALTER TABLE public.entregas ADD COLUMN IF NOT EXISTS motivo_condicion TEXT;
ALTER TABLE public.entregas ADD COLUMN IF NOT EXISTS pedido_id INTEGER REFERENCES public.pedidos_sede(id) ON DELETE SET NULL;
ALTER TABLE public.entregas DROP CONSTRAINT IF EXISTS entregas_estado_check;
ALTER TABLE public.entregas ADD CONSTRAINT entregas_estado_check 
  CHECK (estado IN ('PENDIENTE_RECEPCION', 'CONFIRMADA', 'RECEPCIONADO', 'RECHAZADA'));

-- ------------------------------------------------------------------------------
-- 12. MERMAS Y ROTURAS DE STOCK
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mermas (
  id SERIAL PRIMARY KEY,
  sede_id INTEGER REFERENCES public.sedes(id) ON DELETE CASCADE,
  fecha TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'ROTURA' CHECK (tipo IN ('ROTURA', 'VENCIMIENTO', 'PERDIDA', 'CORTESIA', 'DEFECTO', 'OTRO')),
  agua_cantidad INTEGER DEFAULT 0 NOT NULL,
  gatorade_cantidad INTEGER DEFAULT 0 NOT NULL,
  motivo TEXT NOT NULL,
  reportado_por TEXT NOT NULL,
  url_foto TEXT,
  url_evidencia TEXT
);

ALTER TABLE public.mermas ADD COLUMN IF NOT EXISTS url_foto TEXT;
ALTER TABLE public.mermas ADD COLUMN IF NOT EXISTS url_evidencia TEXT;

-- ------------------------------------------------------------------------------
-- 13. TRANSFERENCIAS DIRECTAS ENTRE SEDES
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 14. CATÁLOGO MULTIPRODUCTO
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.catalogo_productos (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  categoria TEXT DEFAULT 'Snack',
  precio_venta NUMERIC(10, 2) NOT NULL,
  costo_compra NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 15. FUNCIONES RPC ATÓMICAS (PREVIENE CONDICIONES DE CARRERA EN VENTAS)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.decrementar_stock_sede(
  p_sede_id INT,
  p_agua INT,
  p_gatorade INT
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.inventario_bebidas
  SET 
    agua_cantidad = GREATEST(0, agua_cantidad - p_agua),
    gatorade_cantidad = GREATEST(0, gatorade_cantidad - p_gatorade),
    updated_at = timezone('utc'::text, now())
  WHERE sede_id = p_sede_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.incrementar_stock_sede(
  p_sede_id INT,
  p_agua INT,
  p_gatorade INT
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.inventario_bebidas
  SET 
    agua_cantidad = agua_cantidad + p_agua,
    gatorade_cantidad = gatorade_cantidad + p_gatorade,
    updated_at = timezone('utc'::text, now())
  WHERE sede_id = p_sede_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.decrementar_stock_sede(INT, INT, INT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.incrementar_stock_sede(INT, INT, INT) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 16. STORAGE BUCKET 'comprobantes' (FOTOS, COMPROBANTES Y RECEPCIONES)
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
SELECT 'comprobantes', 'comprobantes', true
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'comprobantes');

UPDATE storage.buckets SET public = true WHERE id = 'comprobantes';

DROP POLICY IF EXISTS "Permitir subida comprobantes" ON storage.objects;
CREATE POLICY "Permitir subida comprobantes" ON storage.objects
FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'comprobantes');

DROP POLICY IF EXISTS "Permitir lectura comprobantes" ON storage.objects;
CREATE POLICY "Permitir lectura comprobantes" ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id = 'comprobantes');

-- ------------------------------------------------------------------------------
-- 17. PERMISOS Y POLÍTICAS DE ACCESO (ROW LEVEL SECURITY)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'sedes', 'usuarios', 'usuario_sedes', 'configuracion_precios',
    'inventario_bebidas', 'almacen_central', 'compras_proveedor',
    'cajas', 'ventas', 'anulaciones', 'entregas', 'pedidos_sede',
    'mermas', 'transferencias_sedes', 'catalogo_productos'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'permitir_todo_' || tbl, tbl);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);', 'permitir_todo_' || tbl, tbl);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO anon, authenticated, service_role;', tbl);
  END LOOP;
END $$;

-- Permisos globales para secuencias autoincrementales (SERIAL)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
