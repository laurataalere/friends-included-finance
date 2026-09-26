import { db, employeeId } from '../../../../lib/supabase';

export async function PATCH(request, { params }) {
  try {
    const body = await request.json(); if (!body.approve) throw new Error('Approval required.');
    const client = db(); const managerId = await employeeId(client, 'Svetlana de Monte Carlo');
    const { error } = await client.from('sales').update({ status: 'approved', approved_richard_pct: body.richard ?? null, approved_anastasia_pct: body.anastasia ?? null, approved_jean_claude_pct: body.jeanClaude ?? null, approved_by: managerId, approved_at: new Date().toISOString() }).eq('id', params.id).eq('status', 'pending');
    if (error) throw new Error(error.message); return Response.json({ ok: true });
  } catch (error) { return Response.json({ error: error.message }, { status: 400 }); }
}
