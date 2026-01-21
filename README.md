🍷 Sistema de Gestión de Barricas – Bodega

Aplicación web progresiva (PWA) desarrollada para la gestión interna de barricas en bodega, permitiendo el control de ubicación, movimientos, trasiegos y trazabilidad completa mediante QR y Google Sheets.

🚀 Funcionalidades principales
📦 Gestión de Barricas

Creación de barricas con:

Número de barrica

Lote

Nave

Sala

Fila

Generación automática de QR único por barrica

Registro inicial en Google Sheets (hoja Barricas)

📷 Escaneo por Lote (QR)

Escaneo masivo mediante cámara (celular o tablet)

Validación en tiempo real:

❌ Avisa si una barrica pertenece a otro lote

❌ No permite errores operativos

Flujo doble:

Origen → se registra salida

Destino → se registra ingreso y se actualiza estado

🔁 Movimientos y Trasiegos

Acciones disponibles:

Movimiento

Trasiego

Registro de:

Operario

Nave

Sala y fila de origen

Sala y fila de destino

Fecha y hora

Histórico completo en Google Sheets (hoja Movimientos)

📊 Google Sheets (automático)

Hoja Barricas

Estado actual de cada barrica

Sala y fila siempre actualizadas

Hoja Movimientos

Histórico inalterable

Cada acción queda registrada

Si Google Sheets falla momentáneamente, el sistema no se rompe.

📱 PWA – Aplicación Web Progresiva

Instalación directa en el celular

Funciona como app nativa

Optimizada para uso en bodega

Caché controlado y versionado

🛠️ Stack tecnológico

Frontend: HTML + JS (QR Scanner)

Backend: Node.js + Express

Base de datos: PostgreSQL

Integraciones: Google Sheets API

PWA: Service Worker + Manifest

Deploy: Cloud / Hosting dedicado

🔐 Seguridad y robustez

Validaciones en frontend y backend

Control de lotes para evitar errores humanos

Registro histórico inmutable

Código preparado para escalar

📌 Estado del proyecto

✅ Funcional
✅ Probado en entorno real
✅ Listo para uso productivo

👨‍💻 Autor

Desarrollado como sistema interno de gestión para bodega, enfocado en trazabilidad, simplicidad operativa y reducción de errores humanos.
