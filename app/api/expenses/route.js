import { db, employeeId } from '../../../lib/supabase';
import { syncExpense } from '../../../lib/google-sheets';

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.reference || !body.description || !['Materials','Travel','Other'].includes(body.category) || !['A','B','overhead'].includes(body.allocation) || Number(body.amount) <= 0) throw new Error('Complete every required field with a positive amount.');
    const client = db(); const reporterId = await employeeId(client, body.reporter);
    const overhead = body.allocation === 'overhead';
    const { data: expense, error } = await client.from('expenses').insert({
      reference: body.reference.trim().toUpperCase(), reporter_id: reporterId, description: body.description.trim(), category: body.category, amount: Number(body.amount), proposed_allocation: body.allocation,
      final_allocation: overhead ? 'overhead' : null, status: overhead ? 'allocated' : 'awaiting_allocation'
    }).select().single();
    if (error) throw new Error(error.code === '23505' ? 'That reference already exists.' : error.message);
    try { await syncExpense(expense, body.reporter); await client.from('expenses').update({ sheets_sync_status: 'synced' }).eq('id', expense.id); }
    catch { await client.from('expenses').update({ sheets_sync_status: 'failed' }).eq('id', expense.id); }
    return Response.json({ reference: expense.reference }, { status: 201 });
  } catch (error) { return Response.json({ error: error.message }, { status: 400 }); }
}
