import { google } from 'googleapis';

function sheetsClient() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  return google.sheets({ version: 'v4', auth });
}

async function upsert(tab, headers, row) {
  if (!process.env.GOOGLE_SHEETS_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_JSON) throw new Error('Google Sheets is not configured.');
  const sheets = sheetsClient(); const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  const existing = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${tab}!A:Z` });
  const values = existing.data.values || [];
  if (!values.length) await sheets.spreadsheets.values.update({ spreadsheetId, range: `${tab}!A1`, valueInputOption: 'RAW', requestBody: { values: [headers] } });
  const referenceRow = values.findIndex((value, index) => index > 0 && value[0] === row[0]);
  if (referenceRow > 0) return sheets.spreadsheets.values.update({ spreadsheetId, range: `${tab}!A${referenceRow + 1}`, valueInputOption: 'RAW', requestBody: { values: [row] } });
  return sheets.spreadsheets.values.append({ spreadsheetId, range: `${tab}!A:Z`, valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS', requestBody: { values: [row] } });
}

export async function syncSale(sale, salespersonName) {
  return upsert('Sales', ['Reference', 'Submission time', 'Salesperson', 'Customer', 'Project', 'Description', 'Amount', 'Richard proposed %', 'Anastasia proposed %', 'Jean-Claude proposed %', 'Richard approved %', 'Anastasia approved %', 'Jean-Claude approved %', 'Status'], [sale.reference, sale.submitted_at, salespersonName, sale.customer, sale.project, sale.description, sale.amount, sale.proposed_richard_pct, sale.proposed_anastasia_pct, sale.proposed_jean_claude_pct, sale.approved_richard_pct ?? '', sale.approved_anastasia_pct ?? '', sale.approved_jean_claude_pct ?? '', sale.status]);
}

export async function syncExpense(expense, reporterName) {
  return upsert('Expenses', ['Reference', 'Submission time', 'Reporter', 'Description', 'Category', 'Amount', 'Proposed allocation', 'Final allocation', 'Status'], [expense.reference, expense.submitted_at, reporterName, expense.description, expense.category, expense.amount, expense.proposed_allocation, expense.final_allocation ?? '', expense.status]);
}
