-- ==============================================================================
-- MÓDULO DE INVENTARIO DE MATERIALES DEPORTIVOS E INDUMENTARIA POR SEDE
-- Club - Academia Deportiva Campeones Lima
-- Compatible con PostgreSQL 14+ y Supabase
-- ==============================================================================

-- 1. TABLA: inventario_materiales_sedes
-- Registro mensual de materiales deportivos por cada sede (Conos, aros, platos, etc.)
CREATE TABLE IF NOT EXISTS public.inventario_materiales_sedes (
    id SERIAL PRIMARY KEY,
    sede_nombre TEXT NOT NULL,
    material_nombre TEXT NOT NULL,
    categoria TEXT NOT NULL DEFAULT 'Material Deportivo',
    marzo INT NOT NULL DEFAULT 0,
    abril INT NOT NULL DEFAULT 0,
    mayo INT NOT NULL DEFAULT 0,
    junio INT NOT NULL DEFAULT 0,
    julio INT NOT NULL DEFAULT 0,
    agosto INT NOT NULL DEFAULT 0,
    septiembre INT NOT NULL DEFAULT 0,
    octubre INT NOT NULL DEFAULT 0,
    noviembre INT NOT NULL DEFAULT 0,
    diciembre INT NOT NULL DEFAULT 0,
    notas TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_sede_material UNIQUE (sede_nombre, material_nombre)
);

-- 2. TABLA: inventario_indumentaria_sedes
-- Registro de indumentaria / uniformes por tallas en cada sede (Talla 10 a XXL)
CREATE TABLE IF NOT EXISTS public.inventario_indumentaria_sedes (
    id SERIAL PRIMARY KEY,
    sede_nombre TEXT NOT NULL UNIQUE,
    talla_10 INT NOT NULL DEFAULT 0,
    talla_12 INT NOT NULL DEFAULT 0,
    talla_14 INT NOT NULL DEFAULT 0,
    talla_16 INT NOT NULL DEFAULT 0,
    talla_s INT NOT NULL DEFAULT 0,
    talla_m INT NOT NULL DEFAULT 0,
    talla_l INT NOT NULL DEFAULT 0,
    talla_xl INT NOT NULL DEFAULT 0,
    talla_xxl INT NOT NULL DEFAULT 0,
    notas TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de alto rendimiento
CREATE INDEX IF NOT EXISTS idx_inv_materiales_sede ON public.inventario_materiales_sedes(sede_nombre);
CREATE INDEX IF NOT EXISTS idx_inv_indumentaria_sede ON public.inventario_indumentaria_sedes(sede_nombre);

-- 3. POLÍTICAS RLS Y PERMISOS
ALTER TABLE public.inventario_materiales_sedes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario_indumentaria_sedes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo inventario_materiales_sedes" ON public.inventario_materiales_sedes;
CREATE POLICY "Permitir todo inventario_materiales_sedes"
ON public.inventario_materiales_sedes FOR ALL
TO anon, authenticated, service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo inventario_indumentaria_sedes" ON public.inventario_indumentaria_sedes;
CREATE POLICY "Permitir todo inventario_indumentaria_sedes"
ON public.inventario_indumentaria_sedes FOR ALL
TO anon, authenticated, service_role
USING (true) WITH CHECK (true);

-- Otorgar permisos globales
GRANT ALL ON TABLE public.inventario_materiales_sedes TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.inventario_indumentaria_sedes TO anon, authenticated, service_role;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 4. POBLADO INICIAL DE INDUMENTARIA (DATOS REALES DE LAS SEDES)
INSERT INTO public.inventario_indumentaria_sedes (
    sede_nombre, talla_10, talla_12, talla_14, talla_16, talla_s, talla_m, talla_l, talla_xl, talla_xxl
) VALUES
  ('TRINIDAD', 0, 0, 0, 1, 3, 7, 2, 1, 1),
  ('LIBERTADOR', 2, 6, 5, 7, 7, 5, 4, 2, 1),
  ('ELVIRA', 0, 1, 5, 4, 12, 3, 1, 1, 0),
  ('LICEO', 0, 0, 0, 0, 0, 0, 0, 1, 0)
ON CONFLICT (sede_nombre) DO UPDATE SET
  talla_10 = EXCLUDED.talla_10,
  talla_12 = EXCLUDED.talla_12,
  talla_14 = EXCLUDED.talla_14,
  talla_16 = EXCLUDED.talla_16,
  talla_s = EXCLUDED.talla_s,
  talla_m = EXCLUDED.talla_m,
  talla_l = EXCLUDED.talla_l,
  talla_xl = EXCLUDED.talla_xl,
  talla_xxl = EXCLUDED.talla_xxl,
  updated_at = NOW();

-- 5. POBLADO INICIAL DE MATERIALES DEPORTIVOS (LISTA OFICIAL DE 26 MATERIALES)
INSERT INTO public.inventario_materiales_sedes (
    sede_nombre, material_nombre, categoria, marzo, abril, mayo, junio, julio, agosto, septiembre, octubre, noviembre, diciembre
) VALUES
  ('TRINIDAD', 'Conos pequeños verdes', 'Conos', 14, 14, 0, 0, 0, 0, 0, 0, 0, 0),
  ('TRINIDAD', 'Conos pequeños amarillos', 'Conos', 1, 1, 0, 0, 0, 0, 0, 0, 0, 0),
  ('TRINIDAD', 'Conos pequeños naranjas', 'Conos', 5, 5, 0, 0, 0, 0, 0, 0, 0, 0),
  ('TRINIDAD', 'Aros grandes verdes', 'Aros', 0, 0, 5, 0, 0, 0, 0, 0, 0, 0),
  ('TRINIDAD', 'Aros grandes amarillos', 'Aros', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('TRINIDAD', 'Aros grandes naranjas', 'Aros', 0, 0, 6, 0, 0, 0, 0, 0, 0, 0),
  ('TRINIDAD', 'Platos curvos verdes', 'Platos', 3, 3, 3, 0, 0, 0, 0, 0, 0, 0),
  ('TRINIDAD', 'Platos curvos amarillos', 'Platos', 11, 11, 11, 0, 0, 0, 0, 0, 0, 0),
  ('TRINIDAD', 'Platos curvos naranjas', 'Platos', 6, 6, 7, 0, 0, 0, 0, 0, 0, 0),
  ('TRINIDAD', 'Conos grandes verdes', 'Conos', 0, 0, 13, 0, 0, 0, 0, 0, 0, 0),
  ('TRINIDAD', 'Conos grandes amarillos', 'Conos', 0, 0, 1, 0, 0, 0, 0, 0, 0, 0),
  ('TRINIDAD', 'Conos grandes naranjas', 'Conos', 0, 0, 5, 0, 0, 0, 0, 0, 0, 0),
  ('TRINIDAD', 'Aros pequeños verdes', 'Aros', 5, 5, 0, 0, 0, 0, 0, 0, 0, 0),
  ('TRINIDAD', 'Aros pequeños amarillos', 'Aros', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('TRINIDAD', 'Aros pequeños naranjas', 'Aros', 6, 6, 0, 0, 0, 0, 0, 0, 0, 0),
  ('TRINIDAD', 'Escaleras pliométricas roja', 'Escaleras', 2, 2, 1, 0, 0, 0, 0, 0, 0, 0),
  ('TRINIDAD', 'Escaleras pliométricas amarilla', 'Escaleras', 0, 0, 1, 0, 0, 0, 0, 0, 0, 0),
  ('TRINIDAD', 'Escaleras pliométricas naranja', 'Escaleras', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('TRINIDAD', 'Sogas de saltar', 'Accesorios', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('TRINIDAD', 'Varillas largas verdes', 'Varillas', 2, 2, 2, 0, 0, 0, 0, 0, 0, 0),
  ('TRINIDAD', 'Varillas largas amarillos', 'Varillas', 1, 1, 1, 0, 0, 0, 0, 0, 0, 0),
  ('TRINIDAD', 'Varillas largas naranjas', 'Varillas', 3, 3, 2, 0, 0, 0, 0, 0, 0, 0),
  ('TRINIDAD', 'Botiquín', 'Seguridad', 0, 0, 1, 0, 0, 0, 0, 0, 0, 0),
  ('TRINIDAD', 'Pelotas de tennis', 'Balones', 4, 4, 2, 0, 0, 0, 0, 0, 0, 0),
  ('TRINIDAD', 'Pelotas de tela', 'Balones', 5, 5, 5, 0, 0, 0, 0, 0, 0, 0),
  ('TRINIDAD', 'Inflador', 'Accesorios', 2, 2, 2, 0, 0, 0, 0, 0, 0, 0)
ON CONFLICT (sede_nombre, material_nombre) DO UPDATE SET
  marzo = EXCLUDED.marzo,
  abril = EXCLUDED.abril,
  mayo = EXCLUDED.mayo,
  junio = EXCLUDED.junio,
  julio = EXCLUDED.julio,
  agosto = EXCLUDED.agosto,
  septiembre = EXCLUDED.septiembre,
  octubre = EXCLUDED.octubre,
  noviembre = EXCLUDED.noviembre,
  diciembre = EXCLUDED.diciembre,
  updated_at = NOW();
