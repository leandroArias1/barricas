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



// Ruta de prueba
app.get('/', (req, res) => {
  res.send('Backend Bodega funcionando');
});

// ✅ ENDPOINT CREAR BARRICA
app.post('/barricas', (req, res) => {
  const {
    numero_barrica,
    numero_lote,
    fila,
    uva,
    anio
  } = req.body;

  if (!numero_barrica || !numero_lote) {
    return res.status(400).json({
      error: 'numero_barrica y numero_lote son obligatorios'
    });
  }

  const query = `
    INSERT INTO barricas (
      numero_barrica,
      numero_lote,
      fila,
      uva,
      anio
    ) VALUES (?, ?, ?, ?, ?)
  `;

  const params = [
    numero_barrica,
    numero_lote,
    fila,
    uva,
    anio
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
        numero_lote,
        fila,
        uva,
        anio
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
    numero_barrica,
    numero_lote,
    fila,
    uva,
    anio,
    accion,
    operario
  } = req.body;

  if (!accion || !operario) {
    return res.status(400).json({
      error: 'accion y operario son obligatorios'
    });
  }

  const updateQuery = `
    UPDATE barricas
    SET
      numero_barrica = COALESCE(?, numero_barrica),
      numero_lote = COALESCE(?, numero_lote),
      fila = COALESCE(?, fila),
      uva = COALESCE(?, uva),
      anio = COALESCE(?, anio),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  const updateParams = [
    numero_barrica,
    numero_lote,
    fila,
    uva,
    anio,
    id
  ];

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

    // Columnas del Excel
    sheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Número Barrica', key: 'numero_barrica', width: 18 },
      { header: 'Número Lote', key: 'numero_lote', width: 18 },
      { header: 'Fila', key: 'fila', width: 10 },
      { header: 'Uva', key: 'uva', width: 15 },
      { header: 'Año', key: 'anio', width: 10 },
      { header: 'Última Acción', key: 'accion', width: 25 },
      { header: 'Operario', key: 'operario', width: 20 },
      { header: 'Fecha Acción', key: 'fecha', width: 20 }
    ];

    const query = `
  SELECT
    b.id,
    b.numero_barrica,
    b.numero_lote,
    b.fila,
    b.uva,
    b.anio,
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


    db.all(query, [], async (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error al generar Excel' });
      }

      rows.forEach(row => {
        sheet.addRow(row);
      });

      const filePath = path.join(__dirname, 'excel', 'barricas.xlsx');

      await workbook.xlsx.writeFile(filePath);

      res.download(filePath, 'barricas.xlsx');
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error inesperado al generar Excel' });
  }
});



// 👇 SIEMPRE AL FINAL
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});