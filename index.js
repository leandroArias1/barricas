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

/* ================= CREAR BARRICA ================= */
app.post('/barricas', async (req, res) => {
  const { numero_barrica, lote, sala, nave, fila } = req.body;

  const result = await db.query(
    `INSERT INTO barricas (numero_barrica, lote, sala, nave, fila)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [numero_barrica, lote, sala, nave, fila]
  );

  res.json({ barrica: result.rows[0] });
});

/* ================= OBTENER BARRICA ================= */
app.get('/barricas/:id', async (req, res) => {
  const { id } = req.params;

  const barrica = await db.query(
    `SELECT * FROM barricas WHERE id=$1`,
    [id]
  );

  if (!barrica.rows.length) {
    return res.status(404).json({ error: 'Barrica no encontrada' });
  }

  const accion = await db.query(
    `SELECT accion, operario, fecha
     FROM acciones WHERE barrica_id=$1
     ORDER BY fecha DESC LIMIT 1`,
    [id]
  );

  res.json({
    barrica: barrica.rows[0],
    ultima_accion: accion.rows[0] || null
  });
});

/* ================= EDITAR INDIVIDUAL ================= */
app.put('/barricas/:id', async (req, res) => {
  const { sala, fila, accion, operario } = req.body;
  const { id } = req.params;

  await db.query(
    `UPDATE barricas
     SET sala=$1, fila=$2, updated_at=CURRENT_TIMESTAMP
     WHERE id=$3`,
    [sala, fila, id]
  );

  await db.query(
    `INSERT INTO acciones (barrica_id, accion, operario)
     VALUES ($1,$2,$3)`,
    [id, accion, operario]
  );

  res.json({ ok: true });
});

/* ================= VALIDAR LOTE ================= */
app.get('/barrica-lote/:id', async (req, res) => {
  const r = await db.query(
    `SELECT id, lote FROM barricas WHERE id=$1`,
    [req.params.id]
  );

  if (!r.rows.length) {
    return res.status(404).json({ error: 'Barrica no existe' });
  }

  res.json(r.rows[0]);
});

/* ================= MOVIMIENTO MASIVO ================= */
app.post('/lote/movimiento', async (req, res) => {
  const { barricas, accion, operario, sala, nave, fila } = req.body;

  const result = await db.query(
    `SELECT id, lote FROM barricas WHERE id = ANY($1::int[])`,
    [barricas]
  );

  const existentes = result.rows.map(r => r.id);
  const inexistentes = barricas.filter(id => !existentes.includes(Number(id)));

  if (!existentes.length) {
    return res.status(400).json({ error: "No hay barricas válidas" });
  }

  const loteBase = result.rows[0].lote;
  const validas = result.rows.filter(r => r.lote === loteBase).map(r => r.id);
  const ignoradas = result.rows.filter(r => r.lote !== loteBase).map(r => r.id);

  if (validas.length) {
    await db.query(
      `UPDATE barricas
       SET sala=$1, nave=$2, fila=$3, updated_at=CURRENT_TIMESTAMP
       WHERE id = ANY($4::int[])`,
      [sala, nave, fila, validas]
    );

    for (const id of validas) {
      await db.query(
        `INSERT INTO acciones (barrica_id, accion, operario)
         VALUES ($1,$2,$3)`,
        [id, accion, operario]
      );
    }
  }

  res.json({
    message: "Movimiento aplicado",
    lote: loteBase,
    movidas: validas,
    ignoradas,
    inexistentes
  });
});

/* ================= EXCEL ================= */
app.get('/excel/barricas', async (_, res) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Barricas');

  sheet.columns = [
    { header:'ID', key:'id', width:6 },
    { header:'Barrica', key:'numero_barrica', width:12 },
    { header:'Lote', key:'lote', width:10 },
    { header:'Sala', key:'sala', width:8 },
    { header:'Nave', key:'nave', width:8 },
    { header:'Fila', key:'fila', width:8 },
    { header:'Acción', key:'accion', width:15 },
    { header:'Operario', key:'operario', width:15 },
    { header:'Fecha', key:'fecha', width:20 }
  ];

  const data = await db.query(`
    SELECT b.*,
      (SELECT accion FROM acciones a WHERE a.barrica_id=b.id ORDER BY fecha DESC LIMIT 1) accion,
      (SELECT operario FROM acciones a WHERE a.barrica_id=b.id ORDER BY fecha DESC LIMIT 1) operario,
      (SELECT fecha FROM acciones a WHERE a.barrica_id=b.id ORDER BY fecha DESC LIMIT 1) fecha
    FROM barricas b
    ORDER BY b.id
  `);

  data.rows.forEach(r => sheet.addRow(r));

  res.setHeader('Content-Disposition', 'attachment; filename=barricas.xlsx');
  await workbook.xlsx.write(res);
  res.end();
});

/* ================= QR ================= */
app.get('/qr/:id', async (req, res) => {
  const base = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  const url = `${base}/editar?id=${req.params.id}`;
  const qr = await QRCode.toDataURL(url);
  res.json({ qrImage: qr });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));
