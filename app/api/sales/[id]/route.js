import { db, employeeId } from '../../../../lib/supabase';

export async function PATCH(request, { params }) {
  try {
    const body = await request.json(); if (!body.approve) throw new Error('Approval required.');
    const client = db(); const managerId = await employeeId(client, 'Svetlana de Monte Carlo');
    const shares = [body.richard, body.anastasia, body.jeanClaude].map(Number);
    if (shares.some((share) => !Number.isFinite(share) || share < 0 || share > 100) || shares.reduce((a, b) => a + b, 0) !== 100) throw new Error('Commission shares must add to exactly 100%.');
    const { data, error } = await client.from('sales').update({ status: 'approved', approved_richard_pct: shares[0], approved_anastasia_pct: shares[1], approved_jean_claude_pct: shares[2], approved_by: managerId, approved_at: new Date().toISOString() }).eq('id', params.id).eq('status', 'pending').select('id, status').single();
    if (error || !data) throw new Error(error?.message || 'Supabase did not update this pending sale.'); return Response.json({ ok: true, sale: data });
  } catch (error) { return Response.json({ error: error.message }, { status: 400 }); }
}
