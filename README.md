# S.V.Productos

POS e inventario local para un negocio familiar.

## Stack
- React + Vite
- Node.js + Express
- PostgreSQL
- Socket.IO

## Regla principal
Todo debe poder funcionar con costo de software/servicios S/ 0.

## Puertos
- Frontend: 5173
- Backend: 3000
- PostgreSQL de S.V.Productos: 5433

Se usa 5433 en Windows para no interferir con otros PostgreSQL locales que puedan usar 5432.

## Inicio
1. Copia `server/.env.example` a `server/.env`
2. Ejecuta `docker compose up -d`
3. Backend: `cd server && npm install && npm run dev`
4. Frontend: `cd client && npm install && npm run dev`
5. Abre http://localhost:5173

## Flujo
Escanear producto -> carrito -> Efectivo/Yape -> confirmar -> venta -> stock -> ticket.
