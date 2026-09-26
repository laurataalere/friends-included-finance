import { db, employeeForRole } from '../../../lib/supabase';
import { syncExpense } from '../../../lib/google-sheets';

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.reference || !body.description || !['Materials','Travel','Other'].includes(body.category) || !['A','B','overhead'].includes(body.allocation) || Number(body.amount) <= 0) throw new Error('Complete every required field with a positive amount.');
    const client = db(); if (body.actor !== body.reporter) throw new Error('A demonstration role may only submit its own expense.');
    const reporter = await employeeForRole(client, body.reporter, 'expense_reporter');
    const overhead = body.allocation === 'overhead';
    const { data: expense, error } = await client.from('expenses').insert({
      reference: body.reference.trim().toUpperCase(), reporter_id: reporter.id, description: body.description.trim(), category: body.category, amount: Number(body.amount), proposed_allocation: body.allocation,
      final_allocation: overhead ? 'overhead' : null, status: overhead ? 'allocated' : 'awaiting_allocation', submission_chat_id: reporter.telegram_user_id || null
    }).select().single();
    if (error) throw new Error(error.code === '23505' ? 'That reference already exists.' : error.message);
    let syncStatus = 'synced';
    try { await syncExpense(expense, body.reporter); await client.from('expenses').update({ sheets_sync_status: syncStatus }).eq('id', expense.id); }
    catch (syncError) { console.error('Google Sheets expense sync failed:', syncError.message); syncStatus = 'failed'; await client.from('expenses').update({ sheets_sync_status: syncStatus }).eq('id', expense.id); }
    return Response.json({ reference: expense.reference, syncStatus }, { status: 201 });
  } catch (error) { return Response.json({ error: error.message }, { status: 400 }); }
}
