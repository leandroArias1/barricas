const express = require('express');
const cors = require('cors');
const path = require('path');
const QRCode = require('qrcode');
const ExcelJS = require('exceljs');
const db = require('./database');

const {
  createBarricaSheet,
  updateMovimientoSheet
} = require('./googleSheets');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

/* ===== RUTAS FRONT ===== */
app.get('/', (_, res) => res.send('Backend Bodega funcionando'));
app.get('/crear', (_, res) =>
  res.sendFile(path.join(__dirname, 'frontend/crear.html'))
);
app.get('/editar', (_, res) =>
  res.sendFile(path.join(__dirname, 'frontend/editar.html'))
);
app.get('/lote', (_, res) =>
  res.sendFile(path.join(__dirname, 'frontend/lote.html'))
);

/* ===== CREAR BARRICA ===== */
app.post('/barricas', async (req, res) => {
  try {
    const { numero_barrica, lote, sala, fila } = req.body;

    const r = await db.query(
      `INSERT INTO barricas (numero_barrica, lote, sala, fila)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [numero_barrica, lote, sala, fila]
    );

    // crear fila inicial en Google Sheets
    try {
  await createBarricaSheet({
    numero_barrica,
    lote,
    sala,
    fila
  });
} catch (sheetErr) {
  console.error('⚠️ No se pudo escribir en Sheets (crear barrica):', sheetErr.message);
  // NO romper la creación
}


    res.json({ barrica: r.rows[0] });
  } catch (err) {
    console.error('❌ Error creando barrica:', err);
    res.status(500).json({ error: 'Error creando barrica' });
  }
});

/* ===== OBTENER BARRICA ===== */
app.get('/barricas/:id', async (req, res) => {
  try {
    const b = await db.query(
      `SELECT * FROM barricas WHERE id=$1`,
      [req.params.id]
    );

    if (!b.rows.length) {
      return res.status(404).json({ error: 'Barrica no encontrada' });
    }

    const a = await db.query(
      `SELECT accion, operario, fecha
       FROM acciones
       WHERE barrica_id=$1
       ORDER BY fecha DESC
       LIMIT 1`,
      [req.params.id]
    );

    res.json({
      barrica: b.rows[0],
      ultima_accion: a.rows[0] || null
    });
  } catch (err) {
    console.error('❌ Error obteniendo barrica:', err);
    res.status(500).json({ error: 'Error obteniendo barrica' });
  }
});

/* ===== MOVIMIENTO POR LOTE ===== */
app.post('/lote/movimiento', async (req, res) => {
  try {
    const { barricas, accion, operario, nave, sala, fila } = req.body;

    if (!barricas || !barricas.length) {
      return res.status(400).json({ error: 'No hay barricas escaneadas' });
    }

    const r = await db.query(
      `SELECT id, numero_barrica, lote, sala, fila
       FROM barricas
       WHERE id = ANY($1::int[])`,
      [barricas]
    );

    if (!r.rows.length) {
      return res.status(400).json({ error: 'Barricas inexistentes' });
    }

    const loteBase = r.rows[0].lote;
    const validas = r.rows.filter(b => b.lote === loteBase);
    const ignoradas = r.rows.filter(b => b.lote !== loteBase).map(b => b.id);

    for (const b of validas) {
      // 1️⃣ Guardar acción en DB
      await db.query(
        `INSERT INTO acciones (
          barrica_id,
          accion,
          operario,
          nave,
          sala_origen,
          fila_origen,
          sala_destino,
          fila_destino
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          b.id,
          accion,
          operario,
          nave,
          b.sala,
          b.fila,
          sala,
          fila
        ]
      );

      // 2️⃣ Actualizar MISMA FILA en Google Sheets
      await updateMovimientoSheet({
        numero_barrica: b.numero_barrica,
        lote: b.lote,
        accion,
        operario,
        nave,
        sala_origen: b.sala,
        fila_origen: b.fila,
        sala_destino: sala,
        fila_destino: fila
      });
    }

    // 3️⃣ Actualizar estado actual
    await db.query(
      `UPDATE barricas
       SET sala=$1,
           fila=$2,
           updated_at=CURRENT_TIMESTAMP
       WHERE id = ANY($3::int[])`,
      [sala, fila, validas.map(b => b.id)]
    );

    res.json({
      ok: true,
      mensaje: 'Movimiento aplicado correctamente',
      movidas: validas.length,
      ignoradas
    });

  } catch (err) {
    console.error('❌ Error movimiento lote:', err);
    res.status(500).json({ error: 'Error interno aplicando movimiento' });
  }
});

/* ===== QR ===== */
app.get('/qr/:id', async (req, res) => {
  const base =
    process.env.BASE_URL ||
    `${req.protocol}://${req.get('host')}`;

  const url = `${base}/editar?id=${req.params.id}`;
  const qrImage = await QRCode.toDataURL(url);

  res.json({ qrImage });
});

/* ===== SERVER ===== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Servidor en puerto ${PORT}`)
);
