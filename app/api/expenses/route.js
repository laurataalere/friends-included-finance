import { db, employeeId } from '../../../lib/supabase';

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.reference || !body.description || !['Materials','Travel','Other'].includes(body.category) || !['A','B','overhead'].includes(body.allocation) || Number(body.amount) <= 0) throw new Error('Complete every required field with a positive amount.');
    const client = db(); const reporterId = await employeeId(client, body.reporter);
    const overhead = body.allocation === 'overhead';
    const { error } = await client.from('expenses').insert({
      reference: body.reference.trim().toUpperCase(), reporter_id: reporterId, description: body.description.trim(), category: body.category, amount: Number(body.amount), proposed_allocation: body.allocation,
      final_allocation: overhead ? 'overhead' : null, status: overhead ? 'allocated' : 'awaiting_allocation'
    });
    if (error) throw new Error(error.code === '23505' ? 'That reference already exists.' : error.message);
    return Response.json({ reference: body.reference.trim().toUpperCase() }, { status: 201 });
  } catch (error) { return Response.json({ error: error.message }, { status: 400 }); }
}
