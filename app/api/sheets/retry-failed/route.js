import { db } from '../../../../lib/supabase';
import { syncExpense, syncSale } from '../../../../lib/google-sheets';

export async function POST() {
  try {
    const client = db();
    const [{ data: failedSales, error: salesError }, { data: failedExpenses, error: expensesError }, { data: employees, error: employeesError }] = await Promise.all([
      client.from('sales').select('*').neq('sheets_sync_status', 'synced'),
      client.from('expenses').select('*').neq('sheets_sync_status', 'synced'),
      client.from('employees').select('id,name')
    ]);
    if (salesError || expensesError || employeesError) throw new Error(salesError?.message || expensesError?.message || employeesError?.message);

    const names = new Map(employees.map((employee) => [employee.id, employee.name]));
    let synced = 0;
    let failed = 0;
    for (const sale of failedSales) {
      try {
        await syncSale(sale, names.get(sale.salesperson_id) || 'Unknown');
        await client.from('sales').update({ sheets_sync_status: 'synced' }).eq('id', sale.id);
        synced += 1;
      } catch (error) { console.error('Google Sheets sale retry failed:', error.message); failed += 1; }
    }
    for (const expense of failedExpenses) {
      try {
        await syncExpense(expense, names.get(expense.reporter_id) || 'Unknown');
        await client.from('expenses').update({ sheets_sync_status: 'synced' }).eq('id', expense.id);
        synced += 1;
      } catch (error) { console.error('Google Sheets expense retry failed:', error.message); failed += 1; }
    }
    return Response.json({ synced, failed });
  } catch (error) { return Response.json({ error: error.message }, { status: 500 }); }
}
