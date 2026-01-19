const QRCode = require('qrcode');
const express = require('express');
const cors = require('cors');
const db = require('./database');
const path = require('path');
const ExcelJS = require('exceljs');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

app.get('/', (req, res) => res.send('Backend Bodega funcionando'));
app.get('/crear', (req, res) => res.sendFile(path.join(__dirname, 'frontend/crear.html')));
app.get('/editar', (req, res) => res.sendFile(path.join(__dirname, 'frontend/editar.html')));
app.get('/lote', (req, res) => res.sendFile(path.join(__dirname, 'frontend/lote.html')));


// ================== CREAR BARRICA ==================
app.post('/barricas', (req, res) => {
  const { numero_barrica, lote, sala, nave, fila } = req.body;

  const query = `
    INSERT INTO barricas (numero_barrica, lote, sala, nave, fila)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.run(query, [numero_barrica, lote, sala, nave, fila], function(err) {
    if (err) return res.status(500).json({ error: err.message });

    res.json({
      barrica: { id: this.lastID, numero_barrica, lote, sala, nave, fila }
    });
  });
});


// ================== EDITAR INDIVIDUAL ==================
app.put('/barricas/:id', (req, res) => {
  const { sala, fila, accion, operario } = req.body;

  db.run(
    `UPDATE barricas SET sala=?, fila=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    [sala, fila, req.params.id]
  );

  db.run(
    `INSERT INTO acciones (barrica_id, accion, operario) VALUES (?, ?, ?)`,
    [req.params.id, accion, operario]
  );

  res.json({ ok: true });
});


// ================== VALIDAR LOTE ==================
app.get('/barrica-lote/:id', (req, res) => {
  db.get(`SELECT id, lote FROM barricas WHERE id=?`, [req.params.id], (err, row) => {
    if (!row) return res.status(404).json({ error: 'No existe' });
    res.json(row);
  });
});


// ================== MOVIMIENTO MASIVO ==================
app.post('/lote/movimiento', (req, res) => {
  const { barricas, accion, operario, sala, nave, fila } = req.body;

  if (!barricas || !barricas.length) {
    return res.status(400).json({ error: "No se enviaron barricas" });
  }

  const placeholders = barricas.map(() => '?').join(',');

  db.all(
    `SELECT id, lote FROM barricas WHERE id IN (${placeholders})`,
    barricas,
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Error DB" });
      }

      if (!rows.length) {
        return res.status(400).json({ error: "Ninguna barrica válida" });
      }

      const loteBase = rows[0].lote;

      const validas = rows
        .filter(r => r.lote === loteBase)
        .map(r => r.id);

      const invalidas = rows
        .filter(r => r.lote !== loteBase)
        .map(r => r.id);

      const faltantes = barricas.filter(id => !rows.some(r => r.id == id));

      if (!validas.length) {
        return res.status(400).json({
          error: "Todas las barricas son inválidas"
        });
      }

      const updatePlaceholders = validas.map(() => '?').join(',');

      db.run(
        `UPDATE barricas
         SET sala=?, nave=?, fila=?, updated_at=CURRENT_TIMESTAMP
         WHERE id IN (${updatePlaceholders})`,
        [sala, nave, fila, ...validas],
        function (err) {
          if (err) {
            console.error(err);
            return res.status(500).json({ error: "Error update" });
          }

          const stmt = db.prepare(`
            INSERT INTO acciones (barrica_id, accion, operario)
            VALUES (?, ?, ?)
          `);

          validas.forEach(id => stmt.run(id, accion, operario));
          stmt.finalize();

          res.json({
            message: "Movimiento aplicado",
            lote: loteBase,
            movidas: validas,
            ignoradas: invalidas,
            inexistentes: faltantes
          });
        }
      );
    }
  );
});


// ================== EXCEL ==================
app.get('/excel/barricas', async (req, res) => {
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

  db.all(`
    SELECT b.*, 
      (SELECT accion FROM acciones a WHERE a.barrica_id=b.id ORDER BY fecha DESC LIMIT 1) accion,
      (SELECT operario FROM acciones a WHERE a.barrica_id=b.id ORDER BY fecha DESC LIMIT 1) operario,
      (SELECT fecha FROM acciones a WHERE a.barrica_id=b.id ORDER BY fecha DESC LIMIT 1) fecha
    FROM barricas b
  `,(err,rows)=>{
    rows.forEach(r=>sheet.addRow(r));
    res.setHeader('Content-Disposition','attachment; filename=barricas.xlsx');
    workbook.xlsx.write(res).then(()=>res.end());
  });
});


// ================== QR ==================
app.get('/qr/:id', async (req, res) => {
  const base = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  const url = `${base}/editar?id=${req.params.id}`;
  const qr = await QRCode.toDataURL(url);
  res.json({ qrImage: qr });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor en puerto " + PORT));
