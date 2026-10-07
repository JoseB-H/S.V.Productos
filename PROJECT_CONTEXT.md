# Contexto maestro

## Objetivo
Sistema POS + inventario para negocio familiar.

## Costo
Mantener costo 0. Evitar APIs pagadas, suscripciones, creditos y servicios cloud obligatorios.

## Pagos
- EFECTIVO: monto recibido + vuelto.
- YAPE: QR estatico del negocio + confirmacion manual del familiar.
- Sin API bancaria mientras implique costo o comision.

## Productos
Codigo interno, barcode unico, nombre, detalle, categoria, marca, precio compra, precio venta, stock, stock minimo y hasta 6 fotos.

## Stock
Nunca negativo.
Venta pagada: baja stock.
Compra: sube stock.
Stock 0: bloquear venta.

## Scanner
USB/HID como teclado: codigo + Enter.

## Modulos
Dashboard, POS, Productos, Inventario, Catalogo, Compras, Proveedores, Clientes, Ventas, Reportes, Usuarios y Configuracion.
