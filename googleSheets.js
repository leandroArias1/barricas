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
  if (row) return; // no duplicar

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

/* ===== MOVIMIENTOS (histórico) ===== */
async function updateMovimientoSheet(data) {
  const row = await findRow(SHEET_MOVIMIENTOS, data.numero_barrica);
  if (!row) return;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_MOVIMIENTOS}!A${row}:L${row}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        data.numero_barrica,
        data.lote,
        data.sala_destino,
        data.fila_destino,
        data.accion,
        data.operario,
        '',
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
  createBarricaSheet,     // 👈 ahora EXISTE
  updateBarricaEstado,    // queda para usar después
  updateMovimientoSheet
};
