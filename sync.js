/* Compassionate Warrior — group sync.
   Entries live on the phone first. When the group passcode is set, each save is
   pushed to Supabase and everyone else's entries are pulled back, so the guys can
   see and carry each other's commitments between Mondays.

   The publishable key below is safe to ship: the tables have row level security on
   with no policies, so this key alone reads nothing. Every read and write goes
   through the cw_sync function, which requires the group passcode. */
window.CW_SYNC = (() => {
  'use strict';

  const URL_BASE = 'https://dmiysgmhwpkrunmswtrn.supabase.co';
  const PUB_KEY = 'sb_publishable_9NfxdWLrFdExD-_6HwPs8A_uUtlTH3C';

  async function rpc(fn, body) {
    const res = await fetch(`${URL_BASE}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: PUB_KEY,
        Authorization: `Bearer ${PUB_KEY}`
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  const iso = (ms) => new Date(ms || Date.now()).toISOString();
  const ms = (s) => { const t = Date.parse(s); return Number.isNaN(t) ? Date.now() : t; };

  // ---- wire format mapping ----
  const commitToWire = (c) => ({
    id: c.id,
    author: c.author || '',
    week_number: c.weekNumber,
    commitment: c.commitment || '',
    why: c.why || '',
    steps: c.steps || '',
    support: c.support || '',
    review_status: (c.review && c.review.status) || '',
    review_notes: (c.review && c.review.notes) || '',
    deleted: !!c.deleted,
    created_at: iso(c.createdAt),
    updated_at: iso(c.updatedAt || c.createdAt)
  });
  const commitFromWire = (r) => ({
    id: r.id,
    author: r.author || '',
    weekNumber: r.week_number,
    commitment: r.commitment || '',
    why: r.why || '',
    steps: r.steps || '',
    support: r.support || '',
    deleted: !!r.deleted,
    createdAt: ms(r.created_at),
    updatedAt: ms(r.updated_at),
    review: { status: r.review_status || '', notes: r.review_notes || '' }
  });

  const checkToWire = (f) => ({
    id: f.id,
    author: f.author || '',
    week_number: f.weekNumber,
    stage: f.stage || '',
    notes: f.notes || '',
    deleted: !!f.deleted,
    created_at: iso(f.createdAt),
    updated_at: iso(f.updatedAt || f.createdAt)
  });
  const checkFromWire = (r) => ({
    id: r.id,
    author: r.author || '',
    weekNumber: r.week_number,
    stage: r.stage || '',
    notes: r.notes || '',
    deleted: !!r.deleted,
    createdAt: ms(r.created_at),
    updatedAt: ms(r.updated_at)
  });

  const weekToWire = (w) => ({
    week_number: w.number,
    title: w.title || '',
    items: w.items || [],
    notes: w.notes || '',
    updated_at: iso(w.updatedAt)
  });
  const weekFromWire = (r) => ({
    id: 'w' + r.week_number,
    number: r.week_number,
    title: r.title || '',
    items: Array.isArray(r.items) ? r.items : [],
    notes: r.notes || '',
    updatedAt: ms(r.updated_at)
  });

  return { rpc, commitToWire, commitFromWire, checkToWire, checkFromWire, weekToWire, weekFromWire };
})();
