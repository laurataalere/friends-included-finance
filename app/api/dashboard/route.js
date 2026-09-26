import { db } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const client = db();
    const [{ data: sales, error: salesError }, { data: expenses, error: expenseError }] = await Promise.all([
      client.from('sales').select('*'), client.from('expenses').select('*')
    ]);
    if (salesError || expenseError) throw new Error(salesError?.message || expenseError?.message);
    const projects = { A: { income: 0, commissions: 0, expenses: 0 }, B: { income: 0, commissions: 0, expenses: 0 } };
    let companyResult = 0;
    for (const sale of sales) if (sale.status === 'approved') {
      const commission = Number(sale.amount) * 0.1;
      projects[sale.project].income += Number(sale.amount); projects[sale.project].commissions += commission;
      companyResult += Number(sale.amount) - commission;
    }
    for (const expense of expenses) {
      companyResult -= Number(expense.amount);
      if (expense.status === 'allocated' && ['A','B'].includes(expense.final_allocation)) projects[expense.final_allocation].expenses += Number(expense.amount);
    }
    for (const project of Object.values(projects)) project.result = project.income - project.commissions - project.expenses;
    return Response.json(
      { projects, companyResult, pendingSales: sales.filter((sale) => sale.status === 'pending'), pendingExpenses: expenses.filter((expense) => expense.status === 'awaiting_allocation') },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error) { return Response.json({ error: error.message }, { status: 500 }); }
}
