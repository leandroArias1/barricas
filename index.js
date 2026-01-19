const QRCode = require('qrcode');
const express = require('express');
const cors = require('cors');
const db = require('./database');
const path = require('path');


const app = express();
app.use(cors());
app.use(express.json());
// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, 'frontend')));
app.get('/crear', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'crear.html'));
});

app.get('/editar', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'editar.html'));
});

app.get('/lote', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'lote.html'));
});




// Ruta de prueba
app.get('/', (req, res) => {
  res.send('Backend Bodega funcionando');
});

// ✅ ENDPOINT CREAR BARRICA
app.post('/barricas', (req, res) => {
  const { numero_barrica, lote, sala, nave, fila } = req.body;

  if (!numero_barrica || !lote || !sala || !fila) {
    return res.status(400).json({
      error: 'numero_barrica, lote, sala y fila son obligatorios'
    });
  }

  const query = `
  INSERT INTO barricas (
    numero_barrica,
    lote,
    sala,
    nave,
    fila
  ) VALUES (?, ?, ?, ?, ?)
`;

const params = [
  numero_barrica,
  lote,
  sala,
  nave,
  fila
];


  db.run(query, params, function (err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error al crear barrica' });
    }

    res.status(201).json({
      message: 'Barrica creada correctamente',
      barrica: {
        id: this.lastID,
        numero_barrica,
        lote,
        sala,
        nave,
        fila
      }
    });

  });
});

app.get('/barricas/:id', (req, res) => {
  const { id } = req.params;

  const queryBarrica = `
    SELECT * FROM barricas WHERE id = ?
  `;

  db.get(queryBarrica, [id], (err, barrica) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error al buscar barrica' });
    }

    if (!barrica) {
      return res.status(404).json({ error: 'Barrica no encontrada' });
    }

    const queryAccion = `
      SELECT accion, operario, fecha
      FROM acciones
      WHERE barrica_id = ?
      ORDER BY fecha DESC
      LIMIT 1
    `;

    db.get(queryAccion, [id], (err, accion) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error al buscar acción' });
      }

      res.json({
        barrica,
        ultima_accion: accion || null
      });
    });
  });
});


app.put('/barricas/:id', (req, res) => {
  const { id } = req.params;

  const {
  sala,
  fila,
  accion,
  operario
} = req.body;


  if (!sala || !fila || !accion || !operario) {
  return res.status(400).json({
    error: 'sala, fila, accion y operario son obligatorios'
  });
}


  const updateQuery = `
  UPDATE barricas
  SET
    sala = COALESCE(?, sala),
    fila = COALESCE(?, fila),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = ?
`;

const updateParams = [sala, fila, id];


  db.run(updateQuery, updateParams, function (err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error al actualizar barrica' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Barrica no encontrada' });
    }

    const insertAccion = `
      INSERT INTO acciones (barrica_id, accion, operario)
      VALUES (?, ?, ?)
    `;

    db.run(insertAccion, [id, accion, operario], function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error al registrar acción' });
      }

      res.json({
        message: 'Barrica actualizada y acción registrada'
      });
    });
  });
});

const ExcelJS = require('exceljs');

app.get('/excel/barricas', async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Barricas');

    sheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Barrica', key: 'numero_barrica', width: 15 },
      { header: 'Lote', key: 'lote', width: 15 },
      { header: 'Sala', key: 'sala', width: 10 },
      { header: 'Fila', key: 'fila', width: 10 },
      { header: 'Nave', key: 'nave', width: 10 },
      { header: 'Última acción', key: 'accion', width: 20 },
      { header: 'Operario', key: 'operario', width: 15 },
      { header: 'Fecha', key: 'fecha', width: 20 }
    ];

    const query = `
      SELECT
        b.id,
        b.numero_barrica,
        b.lote,
        b.sala,
        b.fila,
        b.nave,
        (
          SELECT a.accion
          FROM acciones a
          WHERE a.barrica_id = b.id
          ORDER BY a.fecha DESC
          LIMIT 1
        ) AS accion,
        (
          SELECT a.operario
          FROM acciones a
          WHERE a.barrica_id = b.id
          ORDER BY a.fecha DESC
          LIMIT 1
        ) AS operario,
        (
          SELECT a.fecha
          FROM acciones a
          WHERE a.barrica_id = b.id
          ORDER BY a.fecha DESC
          LIMIT 1
        ) AS fecha
      FROM barricas b
      ORDER BY b.id
    `;

    app.post('/lote/movimiento', (req, res) => {
  const { barricas, sala, nave, fila, accion, operario } = req.body;

  if (!barricas || !barricas.length) {
    return res.status(400).json({ error: 'No hay barricas en el lote' });
  }

  barricas.forEach(id => {
    db.run(
      `UPDATE barricas SET sala=?, nave=?, fila=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      [sala, nave, fila, id]
    );

    db.run(
      `INSERT INTO acciones (barrica_id, accion, operario) VALUES (?, ?, ?)`,
      [id, accion, operario]
    );
  });

  res.json({ message: 'Movimiento masivo aplicado' });
});


    db.all(query, async (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error al generar Excel' });
      }

      rows.forEach(row => sheet.addRow(row));

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="barricas.xlsx"'
      );

      await workbook.xlsx.write(res);
      res.end();
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
});


app.get('/qr/:id', async (req, res) => {
  const { id } = req.params;

  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  const qrUrl = `${baseUrl}/editar?id=${id}`;

  try {
    const qrImage = await QRCode.toDataURL(qrUrl);

    res.json({
      id,
      qrUrl,
      qrImage
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al generar QR' });
  }
});



// 👇 SIEMPRE AL FINAL
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});