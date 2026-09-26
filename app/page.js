'use client';

import { useEffect, useState } from 'react';

const people = [
  'Svetlana de Monte Carlo', 'Richard Darling', 'Anastasia Ferrari',
  'Jean-Claude Berzins', 'Kevin von Whatever'
];

const money = (value) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(value || 0);

export default function Home() {
  const [role, setRole] = useState(people[0]);
  const [summary, setSummary] = useState(null);
  const [message, setMessage] = useState('');

  async function load() {
    const response = await fetch('/api/dashboard');
    if (response.ok) setSummary(await response.json());
  }
  useEffect(() => { load(); }, []);

  async function submit(event) {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget));
    const kind = form.kind;
    delete form.kind;
    const response = await fetch(`/api/${kind}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await response.json();
    setMessage(response.ok ? `${data.reference} saved successfully.` : data.error || 'Could not save the record.');
    if (response.ok) { event.currentTarget.reset(); load(); }
  }

  const manager = role === 'Svetlana de Monte Carlo';
  const salesperson = ['Richard Darling', 'Anastasia Ferrari', 'Jean-Claude Berzins'].includes(role);
  const reporter = role === 'Kevin von Whatever';
  return <main>
    <header><div><p className="eyebrow">Friends Included Ltd</p><h1>Finance system</h1><p>All friendships expire at checkout.</p></div><label>Demonstration role<select value={role} onChange={(e) => setRole(e.target.value)}>{people.map((person) => <option key={person}>{person}</option>)}</select></label></header>
    <p className="message">{message}</p>
    <section className="cards">
      {['A', 'B'].map((project) => <article key={project}><p>Project {project} result</p><strong>{money(summary?.projects?.[project]?.result)}</strong><small>Income {money(summary?.projects?.[project]?.income)} · Expenses {money(summary?.projects?.[project]?.expenses)}</small></article>)}
      <article className="company"><p>Company result</p><strong>{money(summary?.companyResult)}</strong><small>Approved sales less commissions and all expenses</small></article>
    </section>
    <section className="two-col">
      {salesperson && <form onSubmit={submit}><h2>Submit sale</h2><input type="hidden" name="kind" value="sales"/><input type="hidden" name="salesperson" value={role}/><input name="reference" placeholder="Reference e.g. S01" required/><input name="customer" placeholder="Customer" required/><select name="project" defaultValue=""><option value="" disabled>Project</option><option value="A">Project A</option><option value="B">Project B</option></select><input name="description" placeholder="Description" required/><input name="amount" type="number" min="0.01" step="0.01" placeholder="Amount EUR" required/><div className="split"><input name="richard" type="number" min="0" max="100" placeholder="Richard %" required/><input name="anastasia" type="number" min="0" max="100" placeholder="Anastasia %" required/><input name="jeanClaude" type="number" min="0" max="100" placeholder="Jean-Claude %" required/></div><button>Save pending sale</button></form>}
      {reporter && <form onSubmit={submit}><h2>Submit expense</h2><input type="hidden" name="kind" value="expenses"/><input type="hidden" name="reporter" value={role}/><input name="reference" placeholder="Reference e.g. E01" required/><input name="description" placeholder="Description" required/><select name="category" defaultValue=""><option value="" disabled>Category</option><option>Materials</option><option>Travel</option><option>Other</option></select><input name="amount" type="number" min="0.01" step="0.01" placeholder="Amount EUR" required/><select name="allocation" defaultValue=""><option value="" disabled>Proposed allocation</option><option value="A">Project A</option><option value="B">Project B</option><option value="overhead">Company overhead</option></select><button>Save expense</button></form>}
      {manager && <ManagerPanel summary={summary} reload={load} setMessage={setMessage}/>} 
      {!manager && <article className="notice"><h2>Your access</h2><p>{salesperson ? 'You can submit your sales and commission proposal.' : 'You can submit expenses and their proposed allocation.'}</p><p>Only Svetlana can approve or correct records.</p></article>}
    </section>
  </main>;
}

function ManagerPanel({ summary, reload, setMessage }) {
  async function decide(type, id, action) {
    const response = await fetch(`/api/${type}/${id}`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify(action) });
    const data = await response.json(); setMessage(response.ok ? 'Decision saved.' : data.error || 'Decision failed.'); if (response.ok) reload();
  }
  return <article className="manager"><h2>Manager approvals</h2>{(summary?.pendingSales || []).map((sale) => <div className="row" key={sale.id}><span><b>{sale.reference}</b> · {money(sale.amount)} · Project {sale.project}</span><button onClick={() => decide('sales', sale.id, { approve: true })}>Approve sale</button></div>)}{(summary?.pendingExpenses || []).map((expense) => <div className="row" key={expense.id}><span><b>{expense.reference}</b> · {money(expense.amount)} · Proposed {expense.proposed_allocation}</span><button onClick={() => decide('expenses', expense.id, { allocation: expense.proposed_allocation })}>Confirm allocation</button></div>)}{!summary?.pendingSales?.length && !summary?.pendingExpenses?.length && <p>No decisions waiting.</p>}</article>
}
