import { db } from '../../../lib/supabase';
import { commissionAmounts } from '../../../lib/financials';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  try {
    const client = db();
    const role = new URL(request.url).searchParams.get('role') || '';
    const [{ data: sales, error: salesError }, { data: expenses, error: expenseError }, { data: employees, error: employeeError }, { data: notifications, error: notificationError }] = await Promise.all([
      client.from('sales').select('*'), client.from('expenses').select('*'), client.from('employees').select('*'), client.from('notifications').select('*')
    ]);
    if (salesError || expenseError || employeeError || notificationError) throw new Error(salesError?.message || expenseError?.message || employeeError?.message || notificationError?.message);
    const byId = new Map(employees.map((employee) => [employee.id, employee]));
    const viewer = employees.find((employee) => employee.name === role);
    const projects = { A: { income: 0, commissions: 0, expenses: 0 }, B: { income: 0, commissions: 0, expenses: 0 } };
    const commissionEarned = { Richard: 0, Anastasia: 0, 'Jean-Claude': 0 };
    let companyResult = 0; let companyOverhead = 0; let awaitingAllocation = 0;
    for (const sale of sales) if (sale.status === 'approved') {
      const shares = [sale.approved_richard_pct, sale.approved_anastasia_pct, sale.approved_jean_claude_pct];
      const commission = commissionAmounts(sale.amount, shares);
      projects[sale.project].income += Number(sale.amount); projects[sale.project].commissions += commission.pool;
      commissionEarned.Richard += commission.amounts[0]; commissionEarned.Anastasia += commission.amounts[1]; commissionEarned['Jean-Claude'] += commission.amounts[2];
      companyResult += Number(sale.amount) - commission.pool;
    }
    for (const expense of expenses) {
      companyResult -= Number(expense.amount);
      if (expense.status === 'allocated' && ['A', 'B'].includes(expense.final_allocation)) projects[expense.final_allocation].expenses += Number(expense.amount);
      if (expense.status === 'allocated' && expense.final_allocation === 'overhead') companyOverhead += Number(expense.amount);
      if (expense.status === 'awaiting_allocation') awaitingAllocation += Number(expense.amount);
    }
    for (const project of Object.values(projects)) project.result = project.income - project.commissions - project.expenses;
    const enrichSale = (sale) => ({ ...sale, salespersonName: byId.get(sale.salesperson_id)?.name || 'Unknown', noTelegramRecipient: !sale.submission_chat_id });
    const enrichExpense = (expense) => ({ ...expense, reporterName: byId.get(expense.reporter_id)?.name || 'Unknown', noTelegramRecipient: !expense.submission_chat_id });
    const manager = viewer?.role === 'manager';
    const visibleSales = manager ? sales : sales.filter((sale) => sale.salesperson_id === viewer?.id);
    const visibleExpenses = manager ? expenses : expenses.filter((expense) => expense.reporter_id === viewer?.id);
    const visibleReferences = new Set([...visibleSales, ...visibleExpenses].map((record) => record.reference));
    return Response.json({ projects, companyResult, companyOverhead, awaitingAllocation, commissionEarned,
      pendingSales: manager ? sales.filter((sale) => sale.status === 'pending').map(enrichSale) : [],
      pendingExpenses: manager ? expenses.filter((expense) => expense.status === 'awaiting_allocation').map(enrichExpense) : [],
      records: { sales: visibleSales.map(enrichSale), expenses: visibleExpenses.map(enrichExpense) },
      notifications: notifications.filter((notification) => visibleReferences.has(notification.transaction_reference)).map((notification) => ({
        ...notification,
        status: !notification.recipient_chat_id && notification.status === 'pending' ? 'No Telegram recipient linked' : notification.status
      }))
    }, { headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate', 'CDN-Cache-Control': 'no-store', 'Vercel-CDN-Cache-Control': 'no-store' } });
  } catch (error) { return Response.json({ error: error.message }, { status: 500 }); }
}
