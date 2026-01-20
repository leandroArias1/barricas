const { google } = require('googleapis');

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

const SPREADSHEET_ID = process.env.SHEET_ID;
const SHEET_NAME = 'Barricas';

/* Buscar fila por número de barrica */
async function findRow(numeroBarrica) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:A`,
  });

  const rows = res.data.values || [];
  const idx = rows.findIndex(r => r[0] === numeroBarrica);
  return idx === -1 ? null : idx + 1;
}

/* Crear barrica (si no existe) */
async function createBarricaSheet({ numero_barrica, lote, sala, fila }) {
  const row = await findRow(numero_barrica);
  if (row) return; // ya existe

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
        '', '', '', '', '', '', '', ''
      ]]
    }
  });
}

/* Actualizar movimiento (MISMA FILA) */
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
        data.nave ?? '',
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
