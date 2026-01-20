const { google } = require('googleapis');

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

const SPREADSHEET_ID = process.env.SHEET_ID;
const SHEET_NAME = 'Barricas';

/* ===== BUSCAR FILA POR NUMERO DE BARRICA ===== */
async function findRow(numero_barrica) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A1:A1000`, // ✅ rango válido
  });

  const rows = res.data.values || [];

  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === numero_barrica) {
      return i + 1; // filas empiezan en 1
    }
  }

  return null;
}

/* ===== CREAR BARRICA (SI NO EXISTE) ===== */
async function createBarricaSheet({ numero_barrica, lote, sala, fila }) {
  const row = await findRow(numero_barrica);
  if (row) return; // ya existe → no duplicar

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        numero_barrica,
        lote,
        sala,
        fila,
        '', '', '', '', '', '', '',
        new Date().toLocaleString('es-AR')
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
    range: `${SHEET_NAME}!A${row}:L${row}`, // ✅ rango válido
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
