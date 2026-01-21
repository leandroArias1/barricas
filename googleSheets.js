const { google } = require('googleapis');

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

const SPREADSHEET_ID = process.env.SHEET_ID;

const SHEET_MOVIMIENTOS = 'Movimientos';
const SHEET_BARRICAS = 'Barricas';

/* ===== buscar fila por barrica ===== */
async function findRow(sheet, numero_barrica) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheet}!A:A`,
  });

  const rows = res.data.values || [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === numero_barrica) return i + 1;
  }
  return null;
}

/* ===== BARRICAS (estado actual) ===== */
async function createBarricaSheet({ numero_barrica, lote, sala, fila }) {
  const row = await findRow(SHEET_BARRICAS, numero_barrica);
  if (row) return;

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_BARRICAS}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        numero_barrica, // A
        lote,           // B
        sala,           // C (sala actual)
        fila            // D (fila actual)
      ]]
    }
  });
}

async function updateBarricaEstado({ numero_barrica, lote, sala, fila }) {
  const row = await findRow(SHEET_BARRICAS, numero_barrica);
  if (!row) return;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_BARRICAS}!A${row}:D${row}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[numero_barrica, lote, sala, fila]]
    }
  });
}

/* ===== MOVIMIENTOS (histórico puro) ===== */
async function appendMovimientoSheet(data) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_MOVIMIENTOS}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        data.numero_barrica,               // A
        data.lote,                         // B
        '',                                // C (estado actual NO VA ACA)
        '',                                // D
        data.accion,                       // E
        data.operario,                     // F
        data.nave || '',                   // G
        data.sala_origen || '',            // H
        data.fila_origen || '',            // I
        data.sala_destino || '',           // J
        data.fila_destino || '',           // K
        new Date().toLocaleString('es-AR') // L
      ]]
    }
  });
}

module.exports = {
  createBarricaSheet,
  updateBarricaEstado,
  appendMovimientoSheet
};
