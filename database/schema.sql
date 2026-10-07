CREATE TABLE IF NOT EXISTS productos (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(40) NOT NULL UNIQUE,
  codigo_barras VARCHAR(80) NOT NULL UNIQUE,
  nombre VARCHAR(160) NOT NULL,
  descripcion TEXT,
  precio_compra NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (precio_compra >= 0),
  precio_venta NUMERIC(12,2) NOT NULL CHECK (precio_venta >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  stock_minimo INTEGER NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS producto_imagenes (
  id SERIAL PRIMARY KEY,
  producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  ruta TEXT NOT NULL,
  orden SMALLINT NOT NULL CHECK (orden BETWEEN 1 AND 6),
  UNIQUE(producto_id, orden)
);

CREATE TABLE IF NOT EXISTS ventas (
  id BIGSERIAL PRIMARY KEY,
  numero VARCHAR(30) UNIQUE,
  total NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  estado VARCHAR(20) NOT NULL DEFAULT 'PAGADA' CHECK (estado IN ('PAGADA','CANCELADA')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS venta_detalles (
  id BIGSERIAL PRIMARY KEY,
  venta_id BIGINT NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  producto_id INTEGER NOT NULL REFERENCES productos(id),
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(12,2) NOT NULL CHECK (precio_unitario >= 0),
  subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0)
);

CREATE TABLE IF NOT EXISTS pagos (
  id BIGSERIAL PRIMARY KEY,
  venta_id BIGINT NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('EFECTIVO','YAPE')),
  monto NUMERIC(12,2) NOT NULL CHECK (monto >= 0),
  monto_recibido NUMERIC(12,2),
  vuelto NUMERIC(12,2),
  referencia VARCHAR(100),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS movimientos_stock (
  id BIGSERIAL PRIMARY KEY,
  producto_id INTEGER NOT NULL REFERENCES productos(id),
  tipo VARCHAR(30) NOT NULL,
  cantidad INTEGER NOT NULL,
  stock_anterior INTEGER NOT NULL CHECK (stock_anterior >= 0),
  stock_nuevo INTEGER NOT NULL CHECK (stock_nuevo >= 0),
  referencia_tipo VARCHAR(30),
  referencia_id BIGINT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
