import { db } from '../../../../lib/supabase';
import { telegram } from '../../../../lib/telegram';
import { syncSale, syncExpense } from '../../../../lib/google-sheets';

const help = 'Use /sale REF|CUSTOMER|A-or-B|DESCRIPTION|AMOUNT|RICHARD%|ANASTASIA%|JEAN% or /expense REF|DESCRIPTION|Materials-Travel-Other|AMOUNT|A-B-overhead.';

export async function POST(request) {
  const update = await request.json(); const message = update.message;
  if (!message?.text || !message?.from?.id) return Response.json({ ok: true });
  const client = db(); const { data: employee } = await client.from('employees').select('*').eq('telegram_user_id', message.from.id).single();
  if (!employee) { await telegram(message.chat.id, `Your Telegram ID is ${message.from.id}. Ask Svetlana to link it to a fictional employee.`); return Response.json({ ok: true }); }
  const [command, ...parts] = message.text.trim().split(' '); const fields = parts.join(' ').split('|').map((item) => item.trim());
  try {
    if (command === '/start') await telegram(message.chat.id, `Welcome, ${employee.name}. ${help}`);
    else if (command === '/sale') {
      if (employee.role !== 'salesperson' || fields.length !== 8) throw new Error(help);
      const [reference, customer, project, description, amount, richard, anastasia, jean] = fields; const shares = [richard, anastasia, jean].map(Number);
      if (!['A','B'].includes(project) || !(Number(amount) > 0) || shares.reduce((a,b) => a + b, 0) !== 100) throw new Error('Check project, positive amount, and a 100% total commission split.');
      const { data: sale, error } = await client.from('sales').insert({ reference: reference.toUpperCase(), salesperson_id: employee.id, customer, project, description, amount: Number(amount), proposed_richard_pct: shares[0], proposed_anastasia_pct: shares[1], proposed_jean_claude_pct: shares[2], submission_chat_id: message.chat.id }).select().single(); if (error) throw error;
      try { await syncSale(sale, employee.name); await client.from('sales').update({ sheets_sync_status: 'synced' }).eq('id', sale.id); } catch { await client.from('sales').update({ sheets_sync_status: 'failed' }).eq('id', sale.id); }
      await telegram(message.chat.id, `Saved ${reference.toUpperCase()} for €${Number(amount).toFixed(2)}. Status: Pending approval.`);
    } else if (command === '/expense') {
      if (employee.role !== 'expense_reporter' || fields.length !== 5) throw new Error(help);
      const [reference, description, category, amount, allocation] = fields; if (!['Materials','Travel','Other'].includes(category) || !['A','B','overhead'].includes(allocation) || !(Number(amount) > 0)) throw new Error('Check category, allocation, and positive amount.');
      const overhead = allocation === 'overhead'; const { data: expense, error } = await client.from('expenses').insert({ reference: reference.toUpperCase(), reporter_id: employee.id, description, category, amount: Number(amount), proposed_allocation: allocation, final_allocation: overhead ? 'overhead' : null, status: overhead ? 'allocated' : 'awaiting_allocation', submission_chat_id: message.chat.id }).select().single(); if (error) throw error;
      try { await syncExpense(expense, employee.name); await client.from('expenses').update({ sheets_sync_status: 'synced' }).eq('id', expense.id); } catch { await client.from('expenses').update({ sheets_sync_status: 'failed' }).eq('id', expense.id); }
      await telegram(message.chat.id, `Saved ${reference.toUpperCase()} for €${Number(amount).toFixed(2)}. Status: ${overhead ? 'Allocated to company overhead' : 'Awaiting allocation'}.`);
    } else await telegram(message.chat.id, help);
  } catch (error) { await telegram(message.chat.id, error.code === '23505' ? 'That reference already exists.' : error.message || 'Submission failed.'); }
  return Response.json({ ok: true });
}
