const express = require('express');
const cors = require('cors');
const path = require('path');
const QRCode = require('qrcode');
const ExcelJS = require('exceljs');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

app.get('/', (_, res) => res.send('Backend Bodega funcionando'));
app.get('/crear', (_, res) => res.sendFile(path.join(__dirname, 'frontend/crear.html')));
app.get('/editar', (_, res) => res.sendFile(path.join(__dirname, 'frontend/editar.html')));
app.get('/lote', (_, res) => res.sendFile(path.join(__dirname, 'frontend/lote.html')));

/* ===== CREAR BARRICA ===== */
app.post('/barricas', async (req, res) => {
  const { numero_barrica, lote, sala, fila } = req.body;

  const r = await db.query(
    `INSERT INTO barricas (numero_barrica, lote, sala, fila)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [numero_barrica, lote, sala, fila]
  );

  res.json({ barrica: r.rows[0] });
});

/* ===== OBTENER BARRICA ===== */
app.get('/barricas/:id', async (req, res) => {
  const b = await db.query(`SELECT * FROM barricas WHERE id=$1`, [req.params.id]);
  if (!b.rows.length) return res.status(404).json({ error: 'Barrica no encontrada' });

  const a = await db.query(
    `SELECT accion, operario, fecha
     FROM acciones WHERE barrica_id=$1
     ORDER BY fecha DESC LIMIT 1`,
    [req.params.id]
  );

  res.json({ barrica: b.rows[0], ultima_accion: a.rows[0] || null });
});

/* ===== MOVIMIENTO POR LOTE ===== */
app.post('/lote/movimiento', async (req, res) => {
  const { barricas, accion, operario, sala, fila } = req.body;

  const r = await db.query(
    `SELECT id, lote, sala, fila FROM barricas WHERE id = ANY($1::int[])`,
    [barricas]
  );

  if (!r.rows.length) return res.status(400).json({ error: 'Barricas inexistentes' });

  const loteBase = r.rows[0].lote;
  const validas = r.rows.filter(b => b.lote === loteBase);
  const ignoradas = r.rows.filter(b => b.lote !== loteBase).map(b => b.id);

  for (const b of validas) {
    await db.query(
      `INSERT INTO acciones (
        barrica_id, accion, operario,
        sala_origen, fila_origen,
        sala_destino, fila_destino
      ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [b.id, accion, operario, b.sala, b.fila, sala, fila]
    );
  }

  await db.query(
    `UPDATE barricas SET sala=$1, fila=$2, updated_at=CURRENT_TIMESTAMP
     WHERE id = ANY($3::int[])`,
    [sala, fila, validas.map(b => b.id)]
  );

  res.json({ ok: true, movidas: validas.map(b => b.id), ignoradas });
});

/* ===== EXCEL ===== */
app.get('/excel/barricas', async (_, res) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Barricas');

  sheet.columns = [
    { header:'Barrica', key:'numero_barrica', width:14 },
    { header:'Lote', key:'lote', width:12 },
    { header:'Sala actual', key:'sala_actual', width:12 },
    { header:'Fila actual', key:'fila_actual', width:12 },
    { header:'Acción', key:'accion', width:14 },
    { header:'Operario', key:'operario', width:14 },
    { header:'Nave', key:'nave', width:8 },
    { header:'Sala origen', key:'sala_origen', width:12 },
    { header:'Fila origen', key:'fila_origen', width:12 },
    { header:'Sala destino', key:'sala_destino', width:12 },
    { header:'Fila destino', key:'fila_destino', width:12 },
    { header:'Fecha', key:'fecha', width:20 }
  ];

  const r = await db.query(`
    SELECT
      b.numero_barrica,
      b.lote,
      b.sala AS sala_actual,
      b.fila AS fila_actual,
      a.accion,
      a.operario,
      a.nave,
      a.sala_origen,
      a.fila_origen,
      a.sala_destino,
      a.fila_destino,
      a.fecha
    FROM barricas b
    LEFT JOIN LATERAL (
      SELECT *
      FROM acciones
      WHERE acciones.barrica_id = b.id
      ORDER BY fecha DESC
      LIMIT 1
    ) a ON true
    ORDER BY b.id;
  `);

  r.rows.forEach(row => sheet.addRow(row));

  res.setHeader(
    'Content-Disposition',
    'attachment; filename=barricas.xlsx'
  );

  await workbook.xlsx.write(res);
  res.end();
});

/* ===== QR ===== */
app.get('/qr/:id', async (req, res) => {
  const base = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  const url = `${base}/editar?id=${req.params.id}`;
  res.json({ qrImage: await QRCode.toDataURL(url) });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));
