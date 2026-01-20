const express = require('express');
const cors = require('cors');
const path = require('path');
const QRCode = require('qrcode');
const db = require('./database');

const {
  createBarricaSheet,
  updateBarricaEstado,
  appendMovimientoSheet
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

    // Google Sheets (no rompe si falla)
    try {
      await createBarricaSheet({ numero_barrica, lote, sala, fila });
    } catch (e) {
      console.warn('⚠️ Sheets (crear barrica) falló:', e.message);
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

    res.json({ barrica: b.rows[0] });
  } catch (err) {
    console.error('❌ Error obteniendo barrica:', err);
    res.status(500).json({ error: 'Error obteniendo barrica' });
  }
});

/* ===== MOVIMIENTO POR LOTE ===== */
app.post('/lote/movimiento', async (req, res) => {
  try {
    const { barricas, accion, operario, sala, fila } = req.body;

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

    for (const b of validas) {
      // DB: histórico
      await db.query(
        `INSERT INTO acciones (
          barrica_id,
          accion,
          operario,
          sala_origen,
          fila_origen,
          sala_destino,
          fila_destino
        ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          b.id,
          accion,
          operario,
          b.sala,
          b.fila,
          sala,
          fila
        ]
      );

      // Sheets: histórico
      await appendMovimientoSheet({
        numero_barrica: b.numero_barrica,
        lote: b.lote,
        accion,
        operario,
        sala_origen: b.sala,
        fila_origen: b.fila,
        sala_destino: sala,
        fila_destino: fila
      });

      // Sheets: estado actual
      await updateBarricaEstado({
        numero_barrica: b.numero_barrica,
        lote: b.lote,
        sala,
        fila
      });
    }

    // DB: estado actual
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
      movidas: validas.length
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
