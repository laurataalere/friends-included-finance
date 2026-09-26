import { db, employeeId } from '../../../../lib/supabase';

export async function PATCH(request, { params }) {
  try {
    const body = await request.json(); if (!['A','B','overhead'].includes(body.allocation)) throw new Error('Choose a final allocation.');
    const client = db(); const managerId = await employeeId(client, 'Svetlana de Monte Carlo');
    const { error } = await client.from('expenses').update({ final_allocation: body.allocation, status: 'allocated', approved_by: managerId, approved_at: new Date().toISOString() }).eq('id', params.id).eq('status', 'awaiting_allocation');
    if (error) throw new Error(error.message); return Response.json({ ok: true });
  } catch (error) { return Response.json({ error: error.message }, { status: 400 }); }
}
