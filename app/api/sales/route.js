import { db, employeeId } from '../../../lib/supabase';

export async function POST(request) {
  try {
    const body = await request.json();
    const shares = ['richard', 'anastasia', 'jeanClaude'].map((key) => Number(body[key]));
    if (shares.some((share) => !Number.isFinite(share) || share < 0 || share > 100) || shares.reduce((a, b) => a + b, 0) !== 100) {
      return Response.json({ error: 'Commission shares must add to exactly 100%.' }, { status: 400 });
    }
    if (!body.reference || !body.customer || !body.description || !['A','B'].includes(body.project) || Number(body.amount) <= 0) throw new Error('Complete every required field with a positive amount.');
    const client = db();
    const salespersonId = await employeeId(client, body.salesperson);
    const { error } = await client.from('sales').insert({
      reference: body.reference.trim().toUpperCase(), salesperson_id: salespersonId, customer: body.customer.trim(), project: body.project,
      description: body.description.trim(), amount: Number(body.amount), proposed_richard_pct: shares[0], proposed_anastasia_pct: shares[1], proposed_jean_claude_pct: shares[2]
    });
    if (error) throw new Error(error.code === '23505' ? 'That reference already exists.' : error.message);
    return Response.json({ reference: body.reference.trim().toUpperCase() }, { status: 201 });
  } catch (error) { return Response.json({ error: error.message }, { status: 400 }); }
}
