# 📦 Sistema de Gestión de Barricas con QR – Bodega

Sistema web interno para la gestión de barricas en bodega, orientado a uso desde celular, con escaneo QR, movimientos por lote y registro histórico en Google Sheets.

El objetivo es **simplificar el control de ubicación y trazabilidad** de barricas sin depender de sistemas complejos.

---

## 🚀 Funcionalidades principales

### ➕ Creación de barricas
- Alta de barricas con:
  - Número de barrica
  - Lote
  - Sala
  - Fila
- Generación automática de QR único por barrica
- Registro inicial en base de datos y Google Sheets

---

### 📷 Escaneo QR y movimientos por lote
- Escaneo de barricas mediante cámara del celular
- Agrupación automática por lote
- Aplicación de acciones por lote:
  - Movimiento
  - Trasiego
- Registro de:
  - Sala origen
  - Fila origen
  - Sala destino
  - Fila destino
  - Operario
  - Fecha

---

### 📊 Google Sheets integrado
El sistema escribe automáticamente en un Google Sheet compartido con dos hojas:

#### 🗂️ Hoja **Barricas**
- Estado actual de cada barrica
- Se actualiza automáticamente con cada movimiento
- Campos:
  - Barrica
  - Lote
  - Sala actual
  - Fila actual

#### 🧾 Hoja **Movimientos**
- Histórico completo (no se pisa)
- Cada acción genera una nueva fila
- Permite auditoría y trazabilidad total

---

## 🛠️ Tecnologías usadas

### Backend
- Node.js
- Express
- PostgreSQL
- Google Sheets API
- QRCode

### Frontend
- HTML
- CSS
- JavaScript vanilla
- html5-qrcode

### Infraestructura
- Deploy en Render
- Google Drive / Google Sheets
- Service Account para escritura segura

---

## 📱 Uso desde celular
- Optimizado para uso móvil
- Pensado para operar directamente en bodega
- Ideal para escaneo rápido de QR

---

## 🔐 Seguridad
- Acceso al Sheet mediante Service Account
- Base de datos con relaciones y restricciones
- El sistema sigue funcionando aunque Sheets falle (fail-safe)

---

## 📈 Posibles mejoras futuras
- Convertir en PWA (instalable como app)
- Roles de usuario
- Filtros y reportes
- Dashboard visual
- Exportación automática

---

## 👤 Autor
Desarrollado como sistema real de gestión interna para bodega.

