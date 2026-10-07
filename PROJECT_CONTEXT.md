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
El stock inicial de un producto se registra como movimiento STOCK_INICIAL.
El catalogo interno permite ajustes manuales +1/-1.
Un ajuste que intente dejar stock menor a 0 es rechazado por el backend.
Los cambios manuales se registran como AJUSTE_MANUAL en movimientos_stock.

## Scanner
USB/HID como teclado: codigo + Enter.
En la pantalla Productos el scanner puede llenar el codigo de barras al registrar.
En POS el mismo codigo agrega el producto al carrito.

## Estado actual
- POS basico funcional.
- Pago efectivo y Yape manual.
- Registro de productos desde interfaz.
- Listado de productos y alertas de stock bajo/agotado.
- Ajuste manual de stock desde catalogo interno.
- Actualizacion de inventario mediante Socket.IO.

## Modulos
Dashboard, POS, Productos, Inventario, Catalogo, Compras, Proveedores, Clientes, Ventas, Reportes, Usuarios y Configuracion.
