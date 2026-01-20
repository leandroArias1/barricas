const { google } = require('googleapis');

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

const SPREADSHEET_ID = process.env.SHEET_ID;
const SHEET_NAME = 'Movimientos'; // 🔥 ESTE ERA EL ERROR

/* ===== BUSCAR FILA POR NÚMERO DE BARRICA ===== */
async function findRow(numero_barrica) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:A`,
  });

  const rows = res.data.values || [];

  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === numero_barrica) {
      return i + 1; // Sheets empieza en 1
    }
  }

  return null;
}

/* ===== CREAR BARRICA (SI NO EXISTE) ===== */
async function createBarricaSheet({ numero_barrica, lote, sala, fila }) {
  const row = await findRow(numero_barrica);
  if (row) return; // no duplicar

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        numero_barrica, // A
        lote,           // B
        sala,           // C
        fila,           // D
        '',             // E acción
        '',             // F operario
        '',             // G nave
        '',             // H sala origen
        '',             // I fila origen
        '',             // J sala destino
        '',             // K fila destino
        new Date().toLocaleString('es-AR') // L fecha
      ]]
    }
  });
}

/* ===== ACTUALIZAR MOVIMIENTO (MISMA FILA) ===== */
async function updateMovimientoSheet(data) {
  const row = await findRow(data.numero_barrica);
  if (!row) return;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A${row}:L${row}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        data.numero_barrica,
        data.lote,
        data.sala_destino,
        data.fila_destino,
        data.accion,
        data.operario,
        data.nave || '',
        data.sala_origen,
        data.fila_origen,
        data.sala_destino,
        data.fila_destino,
        new Date().toLocaleString('es-AR')
      ]]
    }
  });
}

module.exports = {
  createBarricaSheet,
  updateMovimientoSheet
};
