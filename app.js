/* Compassionate Warrior — weekly companion PWA.
   Entries are saved on this phone first. When the group passcode is set they also
   sync to the group, so the brothers can see each other's commitments and check-ins. */
(() => {
  'use strict';

  // ---------- Group facts ----------
  const TZ = 'America/Los_Angeles';
  const FIRST_MEETING = '2026-09-14';            // Week 1 meeting (a Monday, Pacific time)
  const MEETING = { weekday: 1, start: [13, 45], end: [15, 45] }; // Mondays 1:45–3:45 PM PT
  const MEMBERS = [
    { name: 'KP', role: 'Leader' },
    { name: 'Ivan' },
    { name: 'Kellen' },
    { name: 'Chris' },
    { name: 'Franklin' }
  ];

  // FASTER Scale (adapted from Michael Dye's "The Genesis Process"). Restoration is the healthy baseline.
  const FASTER = [
    { key: 'R0', letter: '✓', name: 'Restoration', short: 'Living honest, connected, grateful',
      desc: 'Accepting life on God\'s terms, with trust, grace, mercy, vulnerability and gratitude. Connected to God and to the brothers.',
      signs: ['No secrets', 'Honest with the group', 'Keeping first things first', 'Open to feedback', 'Gratitude', 'Resting, eating and sleeping well'] },
    { key: 'F', letter: 'F', name: 'Forgetting Priorities', short: 'Drifting from what matters',
      desc: 'Starting to believe the present circumstances and moving away from trusting God. Denial, flight, a change in what is important and how you spend your time.',
      signs: ['Keeping secrets', 'Less time for God, meetings, church', 'Avoiding support people', 'Superficial conversations', 'Sarcasm', 'Isolating', 'Breaking promises and commitments', 'Neglecting family', 'Preoccupied with screens, entertainment, money', 'Procrastination', 'Over-confidence', 'Boredom'] },
    { key: 'A', letter: 'A', name: 'Anxiety', short: 'A background noise of undefined fear',
      desc: 'A growing background noise of undefined fear. Getting energy from emotions rather than from rest and connection.',
      signs: ['Worry and fear', 'Resentment', 'Replaying old negative thoughts', 'Perfectionism', 'Judging others\' motives', 'Lists and goals you cannot finish', 'Poor eating or sleeping', 'Mind racing', 'Cannot name feelings or needs', 'Trouble concentrating'] },
    { key: 'S', letter: 'S', name: 'Speeding Up', short: 'Outrunning the anxiety',
      desc: 'Trying to outrun the anxiety. Usually the first visible sign that control is slipping.',
      signs: ['Super busy, always in a hurry', 'Workaholic, cannot relax', 'Feeling driven', 'Cannot turn thoughts off', 'Skipping meals or binge eating', 'Overspending', 'Too much caffeine', 'Irritated, mood swings', 'Difficulty being alone or with people', 'Difficulty listening', 'Excuses for having to do it all'] },
    { key: 'T', letter: 'T', name: 'Ticked Off', short: 'Running on anger and adrenaline',
      desc: 'Getting an adrenaline high on anger and aggression.',
      signs: ['Procrastination causing crisis', 'Black-and-white thinking', 'Nobody understands', 'Overreacting, road rage', 'Constant resentments', 'Pushing others away', 'Blaming and arguing', 'Cannot take criticism, defensive', 'Needing to be right', 'Headaches, stomach problems', 'Obsessive stuck thoughts', 'Feeling entitled to act out'] },
    { key: 'E', letter: 'E', name: 'Exhausted', short: 'Coming off the adrenaline, empty',
      desc: 'Loss of physical and emotional energy. Coming off the adrenaline high. Depression.',
      signs: ['Depressed, hopeless, numb', 'Panicked or confused', 'Sleeping too much or too little', 'Overwhelmed, cannot cope', 'Crying for no reason', 'Forgetful, cannot think', 'Wanting to run', 'Cravings for old coping behaviors', 'Seeking old people and places', 'Really isolating', 'Missing work, not returning calls', 'Survival mode, no goals'] },
    { key: 'R', letter: 'R', name: 'Relapse', short: 'Back to the place you swore off',
      desc: 'Returning to the place you swore you would never go again.',
      signs: ['Giving up and giving in', 'Out of control', 'Lying to yourself and others', 'Believing you cannot manage without the old behavior', 'Shame, guilt, condemnation', 'Feeling abandoned'] }
  ];
  const STAGE = Object.fromEntries(FASTER.map((s) => [s.key, s]));
  const stageName = (k) => (STAGE[k] ? STAGE[k].name : k || 'Not set');

  // ---------- Storage ----------
  const KEY = 'cw:v1';
  function defaultState() {
    return {
      profile: { name: '' },
      weeks: [{
        id: 'w1', number: 1,
        title: 'Chapter 1 — The Divine Paradox of the Compassionate Warrior',
        items: [
          'Complete Chapter 1, "The Divine Paradox of the Compassionate Warrior," in the workbook',
          'Weekly Tools: fill out the FASTER Scale',
          'Weekly Tools: fill out a Commitment to Change'
        ],
        notes: '',
        updatedAt: 0
      }],
      done: {},          // done[weekId] = { [itemIndex]: true } — personal, never shared
      commitments: [],   // mine
      faster: [],        // mine
      group: { passcode: '', lastSync: 0, commitments: [], checkins: [] }
    };
  }
  let state = load();
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultState();
      const s = Object.assign(defaultState(), JSON.parse(raw));
      s.group = Object.assign({ passcode: '', lastSync: 0, commitments: [], checkins: [] }, s.group || {});
      // Rows written before sync existed have no updatedAt.
      s.commitments.forEach((c) => { if (!c.updatedAt) c.updatedAt = c.createdAt || Date.now(); });
      s.faster.forEach((f) => { if (!f.updatedAt) f.updatedAt = f.createdAt || Date.now(); });
      s.weeks.forEach((w) => { if (!w.updatedAt) w.updatedAt = 0; });
      return s;
    } catch (e) {
      console.warn('Could not read saved data, starting fresh', e);
      return defaultState();
    }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { toast('Could not save. Is storage full or blocked?'); }
  }
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  // ---------- Dates (all group dates are Pacific time) ----------
  const pad = (n) => String(n).padStart(2, '0');
  function laParts(d) {
    const f = new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
    const p = {};
    for (const { type, value } of f.formatToParts(d)) p[type] = value;
    return { y: +p.year, m: +p.month, d: +p.day, h: (+p.hour) % 24, mi: +p.minute };
  }
  const isoOf = (p) => `${p.y}-${pad(p.m)}-${pad(p.d)}`;
  const todayISO = () => isoOf(laParts(new Date()));
  function utcOf(iso) { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); }
  function addDays(iso, n) { const t = new Date(utcOf(iso) + n * 86400000); return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`; }
  const daysBetween = (a, b) => Math.round((utcOf(b) - utcOf(a)) / 86400000);
  const weekdayOf = (iso) => new Date(utcOf(iso)).getUTCDay();
  function laWallToDate(iso, h, mi) {
    const [y, m, d] = iso.split('-').map(Number);
    const want = Date.UTC(y, m - 1, d, h, mi);
    let guess = want;
    for (let i = 0; i < 2; i++) {
      const p = laParts(new Date(guess));
      guess += want - Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi);
    }
    return new Date(guess);
  }
  function fmtDate(iso, opts) {
    return new Intl.DateTimeFormat('en-US', Object.assign({ timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' }, opts || {})).format(new Date(utcOf(iso)));
  }
  function fmtStamp(t) {
    return new Intl.DateTimeFormat('en-US', { timeZone: TZ, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(t));
  }
  const meetingDateForWeek = (n) => addDays(FIRST_MEETING, (n - 1) * 7);
  const weekNumberFor = (iso) => Math.floor(daysBetween(FIRST_MEETING, iso) / 7) + 1;
  const currentWeekNumber = () => Math.max(1, weekNumberFor(todayISO()));
  function nextMeeting(now = new Date()) {
    const t = todayISO();
    for (let i = 0; i < 8; i++) {
      const iso = addDays(t, i);
      if (weekdayOf(iso) !== MEETING.weekday) continue;
      const start = laWallToDate(iso, ...MEETING.start);
      const end = laWallToDate(iso, ...MEETING.end);
      if (end > now) return { iso, start, end, live: now >= start };
    }
    return null;
  }
  function relTime(msLeft) {
    const s = Math.max(0, Math.round(msLeft / 1000));
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }
  const weekLabel = (n) => `Week ${n} · ${fmtDate(meetingDateForWeek(n))}`;

  // ---------- Weeks / homework ----------
  function getWeek(n, create) {
    let w = state.weeks.find((x) => x.number === n);
    if (!w && create) {
      w = { id: 'w' + n, number: n, title: `Week ${n}`, items: [], notes: '', updatedAt: 0 };
      state.weeks.push(w);
      state.weeks.sort((a, b) => a.number - b.number);
      save();
    }
    return w || null;
  }
  const isDone = (w, i) => !!(state.done[w.id] && state.done[w.id][i]);
  function setDone(w, i, v) {
    state.done[w.id] = state.done[w.id] || {};
    if (v) state.done[w.id][i] = true; else delete state.done[w.id][i];
    save();
  }
  const doneCount = (w) => w.items.reduce((n, _, i) => n + (isDone(w, i) ? 1 : 0), 0);

  // ---------- Views of my data + the group's ----------
  const liveMine = (arr) => arr.filter((x) => !x.deleted);
  const myCommitments = () => liveMine(state.commitments);
  const myCheckins = () => liveMine(state.faster);
  const groupCommitments = () => (state.group.commitments || []).filter((c) => !c.deleted);
  const groupCheckins = () => (state.group.checkins || []).filter((c) => !c.deleted);
  const allCommitments = () => myCommitments().concat(groupCommitments());
  const allCheckins = () => myCheckins().concat(groupCheckins());
  const connected = () => !!state.group.passcode;

  // ---------- Rendering helpers ----------
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const view = $('#view');
  const me = () => state.profile.name || '';
  const initials = (name) => (name || '?').trim().split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();

  let toastTimer;
  function toast(msg, action) {
    const el = $('#toast');
    el.innerHTML = esc(msg) + (action ? ` <button type="button">${esc(action.label)}</button>` : '');
    if (action) $('button', el).onclick = () => { el.hidden = true; action.fn(); };
    el.hidden = false;
    clearTimeout(toastTimer);
    if (!action) toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
  }

  const dlg = $('#dlg');
  function openDialog(html, onSubmit) {
    dlg.innerHTML = html;
    const form = $('form', dlg);
    if (form && onSubmit) {
      form.addEventListener('submit', (e) => {
        if (e.submitter && e.submitter.value === 'cancel') return;
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        if (onSubmit(data, form) !== false) dlg.close();
      });
    }
    $$('[data-close]', dlg).forEach((b) => b.addEventListener('click', () => dlg.close()));
    dlg.showModal();
    const first = $('input:not([type=hidden]), textarea, select, button', dlg);
    if (first) first.focus();
  }
  function confirmDialog(title, body, okLabel, onOk, danger) {
    openDialog(`
      <form method="dialog">
        <div class="dlg-head"><h2>${esc(title)}</h2></div>
        <p class="muted" style="margin-top:8px">${esc(body)}</p>
        <div class="actions">
          <button class="btn" value="cancel">Cancel</button>
          <button class="btn ${danger ? 'danger' : 'primary'}" value="ok">${esc(okLabel)}</button>
        </div>
      </form>`, () => { onOk(); });
  }

  function memberChips(extraClass = '') {
    return `<div class="members ${extraClass}">` + MEMBERS.map((m) =>
      `<span class="member ${m.name === me() ? 'me' : ''}"><span class="avatar">${esc(initials(m.name))}</span>${esc(m.name)}${m.role ? `<span class="role">${esc(m.role)}</span>` : ''}</span>`
    ).join('') + '</div>';
  }

  // ---------- Group sync ----------
  let syncing = false;
  let syncTimer = null;
  function setSyncBadge(status) {
    state.group.status = status;
    const el = $('#sync-dot');
    if (el) {
      el.dataset.status = status;
      el.title = { ok: 'Synced with the group', syncing: 'Syncing…', offline: 'Offline — will sync later', error: 'Could not reach the group', bad: 'Passcode rejected', off: 'Not connected to the group' }[status] || '';
    }
  }
  function queueSync() {
    if (!connected()) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => syncNow({ silent: true }), 900);
  }
  async function syncNow(opts = {}) {
    if (!connected() || syncing) return false;
    if (navigator.onLine === false) { setSyncBadge('offline'); return false; }
    syncing = true;
    setSyncBadge('syncing');
    try {
      const payload = {
        commitments: state.commitments.map(CW_SYNC.commitToWire),
        checkins: state.faster.map(CW_SYNC.checkToWire),
        weeks: state.weeks.filter((w) => w.updatedAt).map(CW_SYNC.weekToWire)
      };
      const out = await CW_SYNC.rpc('cw_sync', { passcode: state.group.passcode, payload });
      if (!out || out.ok !== true) {
        if (out && out.error === 'bad_passcode') {
          state.group.passcode = '';
          save();
          setSyncBadge('bad');
          toast('The group passcode was not accepted.');
        } else {
          setSyncBadge('error');
          if (!opts.silent) toast('The group said no. Try again in a moment.');
        }
        return false;
      }
      mergeFromServer(out);
      state.group.lastSync = Date.now();
      save();
      setSyncBadge('ok');
      if (!opts.silent) toast('Synced with the group');
      if (!dlg.open) route();
      return true;
    } catch (e) {
      setSyncBadge(navigator.onLine === false ? 'offline' : 'error');
      if (!opts.silent) toast('Could not reach the group right now. Your entry is saved here.');
      return false;
    } finally {
      syncing = false;
    }
  }

  function mergeFromServer(out) {
    const myName = me();

    // Commitments: update my rows, adopt rows that carry my name (restores a reinstall),
    // keep the rest as the brothers' entries.
    const mineById = new Map(state.commitments.map((c) => [c.id, c]));
    const others = [];
    (out.commitments || []).forEach((row) => {
      const r = CW_SYNC.commitFromWire(row);
      const mine = mineById.get(r.id);
      if (mine) {
        if (r.updatedAt >= (mine.updatedAt || 0)) Object.assign(mine, r);
      } else if (myName && r.author === myName) {
        state.commitments.push(r);
      } else {
        others.push(r);
      }
    });
    state.group.commitments = others;

    // FASTER check-ins, same rules.
    const mineCheck = new Map(state.faster.map((f) => [f.id, f]));
    const otherChecks = [];
    (out.checkins || []).forEach((row) => {
      const r = CW_SYNC.checkFromWire(row);
      const mine = mineCheck.get(r.id);
      if (mine) {
        if (r.updatedAt >= (mine.updatedAt || 0)) Object.assign(mine, r);
      } else if (myName && r.author === myName) {
        state.faster.push(r);
      } else {
        otherChecks.push(r);
      }
    });
    state.group.checkins = otherChecks;

    // Homework is shared: newest edit wins, and weeks the group added show up here.
    (out.weeks || []).forEach((row) => {
      const r = CW_SYNC.weekFromWire(row);
      const local = state.weeks.find((w) => w.number === r.number);
      if (!local) state.weeks.push(r);
      else if (r.updatedAt >= (local.updatedAt || 0)) Object.assign(local, r);
    });
    state.weeks.sort((a, b) => a.number - b.number);
  }

  function connectDialog() {
    if (!me()) {
      toast('Pick your name first, then connect.');
      return;
    }
    openDialog(`
      <form>
        <div class="dlg-head"><h2>Join the group</h2><button type="button" class="btn sm ghost" data-close>✕</button></div>
        <p class="small muted" style="margin-top:8px">Enter the group passcode KP shared. Once you are in, your commitments and FASTER check-ins are visible to the other four men, and theirs to you.</p>
        <label class="field"><span>Group passcode</span>
          <input type="text" name="passcode" autocomplete="off" autocapitalize="none" spellcheck="false" required placeholder="four words and a number"></label>
        <p class="small muted">Only people with this passcode can read the group's entries.</p>
        <div class="actions">
          <button class="btn" type="button" data-close>Cancel</button>
          <button class="btn primary" type="submit">Join</button>
        </div>
      </form>`, (d) => {
      const pass = d.passcode.trim();
      if (!pass) return false;
      state.group.passcode = pass;
      save();
      syncNow().then((ok) => { if (ok) toast('You are in. The group can see your entries now.'); route(); });
    });
  }

  function passcodeDialog() {
    openDialog(`
      <form>
        <div class="dlg-head"><h2>Change the group passcode</h2><button type="button" class="btn sm ghost" data-close>✕</button></div>
        <p class="small muted" style="margin-top:8px">This changes it for everyone. The others will each have to enter the new one once.</p>
        <label class="field"><span>New passcode <span class="hint">(at least 8 characters)</span></span>
          <input type="text" name="next" autocomplete="off" autocapitalize="none" spellcheck="false" required minlength="8"></label>
        <div class="actions">
          <button class="btn" type="button" data-close>Cancel</button>
          <button class="btn primary" type="submit">Change it</button>
        </div>
      </form>`, (d) => {
      const next = d.next.trim();
      CW_SYNC.rpc('cw_set_passcode', { current_passcode: state.group.passcode, new_passcode: next })
        .then((out) => {
          if (out && out.ok) {
            state.group.passcode = next;
            save();
            toast('Passcode changed. Tell the brothers the new one.');
            route();
          } else {
            toast(out && out.error === 'too_short' ? 'Use at least 8 characters.' : 'That did not work.');
          }
        })
        .catch(() => toast('Could not reach the group right now.'));
    });
  }

  // ---------- Views ----------
  function renderHome() {
    const n = currentWeekNumber();
    const w = getWeek(n, true);
    const nm = nextMeeting();
    const mine = myCommitments().filter((c) => c.weekNumber === n).sort((a, b) => b.createdAt - a.createdAt)[0];
    const myF = myCheckins().filter((f) => f.weekNumber === n).sort((a, b) => b.createdAt - a.createdAt)[0];
    const total = w.items.length, done = doneCount(w);
    const name = me();

    const meetingHTML = nm ? `
      <p class="eyebrow">${nm.live ? 'Happening now' : 'Next meeting'}</p>
      <h2 class="serif">${fmtDate(nm.iso, { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
      <p class="muted">1:45 – 3:45 PM Pacific</p>
      <p class="countdown ${nm.live ? 'live' : ''}" data-countdown>${nm.live ? 'In session' : 'in ' + relTime(nm.start - Date.now())}</p>` : '';

    view.innerHTML = `
      <div class="stack">
        <div>
          <h1>${name ? `Welcome back, ${esc(name)}.` : 'Welcome, warrior.'}</h1>
          <p class="muted">${weekLabel(n)}${name ? '' : ' · <a href="#/more">Tell the app who you are</a>'}</p>
        </div>

        <section class="card accent">
          ${meetingHTML}
          ${memberChips()}
        </section>

        <section class="card">
          <div class="card-head">
            <div>
              <p class="eyebrow">This week's homework</p>
              <h2>${esc(w.title)}</h2>
            </div>
            <span class="badge">${done}/${total}</span>
          </div>
          <p class="small muted">Assigned ${fmtDate(meetingDateForWeek(n))} · bring it ${fmtDate(meetingDateForWeek(n + 1))}</p>
          ${w.items.length ? `<ul class="checklist" data-week="${w.id}">${w.items.map((it, i) => `
            <li class="${isDone(w, i) ? 'done' : ''}">
              <input type="checkbox" id="hw-${i}" data-i="${i}" ${isDone(w, i) ? 'checked' : ''}>
              <label for="hw-${i}">${esc(it)}</label>
            </li>`).join('')}</ul>
            <div class="progress"><i style="width:${total ? Math.round(done / total * 100) : 0}%"></i></div>`
            : `<div class="empty">No homework entered for this week yet.</div>`}
          <div class="btn-row"><a class="btn sm" href="#/homework">Edit homework</a></div>
        </section>

        <section class="card">
          <p class="eyebrow">Commitment to change</p>
          ${mine ? `
            <blockquote class="quote">${esc(mine.commitment)}</blockquote>
            <div class="btn-row"><a class="btn sm" href="#/commitments">See all commitments</a></div>`
          : `
            <h2>What will you do differently this week?</h2>
            <p class="small muted" style="margin-top:6px">Write it down here so it is with you all week and the group can check in on it.</p>
            <div class="btn-row"><button class="btn primary" data-act="new-commitment">Add this week's commitment</button></div>`}
        </section>

        <section class="card">
          <p class="eyebrow">FASTER scale</p>
          ${myF ? `
            <h2><span class="dot" data-stage="${myF.stage}"></span>${esc(stageName(myF.stage))}</h2>
            <p class="small muted" style="margin-top:4px">Checked in ${fmtStamp(myF.createdAt)}</p>
            <div class="btn-row"><a class="btn sm" href="#/faster">Update check-in</a></div>`
          : `
            <h2>Where are you on the scale today?</h2>
            <p class="small muted" style="margin-top:6px">A quick honest check-in. It takes a minute.</p>
            <div class="btn-row"><a class="btn primary" href="#/faster">Do the FASTER check-in</a></div>`}
        </section>

        ${rosterCard(n)}
      </div>`;

    $$('.checklist input', view).forEach((cb) => cb.addEventListener('change', () => {
      setDone(w, +cb.dataset.i, cb.checked);
      renderHome();
      if (cb.checked && doneCount(w) === w.items.length) toast('Homework done. Well done, brother.');
    }));
    const nc = $('[data-act="new-commitment"]', view);
    if (nc) nc.addEventListener('click', () => commitmentForm());
    const cb = $('[data-act="connect"]', view);
    if (cb) cb.addEventListener('click', connectDialog);
  }

  // Who has posted this week — the accountability glance.
  function rosterCard(n) {
    if (!connected()) {
      return `
        <section class="card">
          <p class="eyebrow">The brothers</p>
          <h2>Carry it together</h2>
          <p class="small muted" style="margin-top:6px">Join the group to see each other's commitments and check-ins between Mondays. Your entries stay on this phone until you do.</p>
          <div class="btn-row"><button class="btn primary" data-act="connect">Join the group</button></div>
        </section>`;
    }
    const cs = allCommitments().filter((c) => c.weekNumber === n);
    const ks = allCheckins().filter((c) => c.weekNumber === n);
    const rows = MEMBERS.map((m) => {
      const c = cs.find((x) => x.author === m.name);
      const k = ks.find((x) => x.author === m.name);
      return `
        <li class="roster-row">
          <span class="avatar">${esc(initials(m.name))}</span>
          <span class="roster-name">${esc(m.name)}</span>
          <span class="roster-marks">
            ${k ? `<span class="dot" data-stage="${k.stage}" title="${esc(stageName(k.stage))}"></span>` : '<span class="dot empty-dot" title="No check-in yet"></span>'}
            <span class="tick ${c ? 'on' : ''}" title="${c ? 'Commitment posted' : 'No commitment yet'}">${c ? '✓' : '·'}</span>
          </span>
        </li>`;
    }).join('');
    return `
      <section class="card">
        <div class="card-head">
          <div><p class="eyebrow">The brothers this week</p><h2>Who has posted</h2></div>
        </div>
        <ul class="roster">${rows}</ul>
        <p class="small muted" style="margin-top:10px">Colored dot is their FASTER stage. Check mark means they wrote a commitment.</p>
        <div class="btn-row"><a class="btn sm" href="#/commitments">Read their commitments</a></div>
      </section>`;
  }

  function renderHomework() {
    const cur = currentWeekNumber();
    getWeek(cur, true);
    const weeks = state.weeks.slice().sort((a, b) => b.number - a.number);
    view.innerHTML = `
      <div class="stack">
        <div class="row">
          <h1>Homework</h1>
          <button class="btn sm primary" data-act="add-week">+ Add week</button>
        </div>
        <p class="muted small">Assigned on Monday, brought back the following Monday.${connected() ? ' Homework is shared, so what you add here reaches everyone.' : ''}</p>
        ${weeks.map((w) => {
          const total = w.items.length, done = doneCount(w);
          const tag = w.number === cur ? '<span class="badge">This week</span>' : (w.number > cur ? '<span class="badge">Upcoming</span>' : '');
          return `
          <section class="card" data-week="${w.id}">
            <div class="card-head">
              <div>
                <p class="eyebrow">${weekLabel(w.number)} ${tag}</p>
                <h2>${esc(w.title)}</h2>
              </div>
              <span class="badge">${done}/${total}</span>
            </div>
            ${w.items.length ? `<ul class="checklist">${w.items.map((it, i) => `
              <li class="${isDone(w, i) ? 'done' : ''}">
                <input type="checkbox" id="${w.id}-${i}" data-i="${i}" ${isDone(w, i) ? 'checked' : ''}>
                <label for="${w.id}-${i}">${esc(it)}</label>
              </li>`).join('')}</ul>` : '<div class="empty">Nothing assigned yet.</div>'}
            ${w.notes ? `<p class="small muted" style="margin-top:10px;white-space:pre-wrap">${esc(w.notes)}</p>` : ''}
            <div class="btn-row">
              <button class="btn sm" data-act="edit-week" data-n="${w.number}">Edit</button>
            </div>
          </section>`;
        }).join('')}
      </div>`;

    $$('section[data-week]', view).forEach((sec) => {
      const w = state.weeks.find((x) => x.id === sec.dataset.week);
      $$('input[type=checkbox]', sec).forEach((cb) => cb.addEventListener('change', () => { setDone(w, +cb.dataset.i, cb.checked); renderHomework(); }));
    });
    $$('[data-act="edit-week"]', view).forEach((b) => b.addEventListener('click', () => weekForm(+b.dataset.n)));
    $('[data-act="add-week"]', view).addEventListener('click', () => {
      const next = Math.max(cur, ...state.weeks.map((w) => w.number)) + 1;
      weekForm(next, true);
    });
  }

  function weekForm(n, isNew) {
    const w = isNew ? { number: n, title: `Week ${n}`, items: [], notes: '' } : getWeek(n, true);
    openDialog(`
      <form>
        <div class="dlg-head"><h2>${isNew ? 'Add' : 'Edit'} ${weekLabel(n)}</h2><button type="button" class="btn sm ghost" data-close>✕</button></div>
        <label class="field"><span>Week number</span><input type="text" inputmode="numeric" pattern="[0-9]+" name="number" value="${w.number}" required></label>
        <label class="field"><span>Title <span class="hint">(chapter or theme)</span></span><input type="text" name="title" value="${esc(w.title)}" placeholder="Chapter 2 — …" required></label>
        <label class="field"><span>Homework items <span class="hint">(one per line)</span></span><textarea name="items" rows="5" placeholder="Complete Chapter 2 in the workbook&#10;Weekly Tools: FASTER Scale&#10;Weekly Tools: Commitment to Change">${esc(w.items.join('\n'))}</textarea></label>
        <label class="field"><span>Notes <span class="hint">(optional)</span></span><textarea name="notes" rows="2">${esc(w.notes || '')}</textarea></label>
        <div class="actions">
          <button class="btn" type="button" data-close>Cancel</button>
          <button class="btn primary" type="submit">Save</button>
        </div>
      </form>`, (d) => {
      const num = parseInt(d.number, 10);
      if (!num || num < 1) { toast('Week number must be 1 or more'); return false; }
      const items = d.items.split('\n').map((s) => s.trim()).filter(Boolean);
      let target = getWeek(num, false);
      if (!target) target = getWeek(num, true);
      else if (isNew || target.number !== n) { toast(`Week ${num} already exists. Edit that one instead.`); return false; }
      target.title = d.title.trim() || `Week ${num}`;
      target.items = items;
      target.notes = d.notes.trim();
      target.updatedAt = Date.now();
      if (state.done[target.id]) Object.keys(state.done[target.id]).forEach((k) => { if (+k >= items.length) delete state.done[target.id][k]; });
      save();
      queueSync();
      renderHomework();
      toast('Homework saved');
    });
  }

  function renderCommitments() {
    const cur = currentWeekNumber();
    const tab = state.ui_commitTab === 'group' ? 'group' : 'mine';
    const list = (tab === 'mine' ? myCommitments() : groupCommitments())
      .slice().sort((a, b) => b.weekNumber - a.weekNumber || b.createdAt - a.createdAt);
    const byWeek = new Map();
    list.forEach((c) => { if (!byWeek.has(c.weekNumber)) byWeek.set(c.weekNumber, []); byWeek.get(c.weekNumber).push(c); });

    view.innerHTML = `
      <div class="stack">
        <div class="row">
          <h1>Commitments</h1>
          <button class="btn sm primary" data-act="new">+ New</button>
        </div>
        ${connected() ? `
          <span class="seg wide">
            <button type="button" data-tab="mine" class="${tab === 'mine' ? 'on' : ''}">Mine</button>
            <button type="button" data-tab="group" class="${tab === 'group' ? 'on' : ''}">The brothers</button>
          </span>` : ''}
        <p class="muted small">${tab === 'mine'
          ? 'One concrete thing you will do differently this week, written down and kept. Next week, mark how it went.'
          : 'What the other men committed to. Read it before Monday so you can ask them about it.'}</p>
        ${list.length ? Array.from(byWeek.entries()).map(([n, cs]) => `
          <div>
            <p class="eyebrow" style="margin:6px 0 8px">${weekLabel(n)}${n === cur ? ' · this week' : ''}</p>
            <div class="stack">${cs.map((c) => commitmentCard(c, tab === 'group')).join('')}</div>
          </div>`).join('')
        : tab === 'mine'
          ? `<section class="card empty"><div class="big">✎</div><p>No commitments yet.</p><p class="small">Start with this week's. Keep it small enough to actually do.</p>
             <div class="btn-row" style="justify-content:center"><button class="btn primary" data-act="new">Write my first commitment</button></div></section>`
          : `<section class="card empty"><div class="big">◦</div><p>Nothing from the brothers yet.</p><p class="small">Their entries show up here once they join the group and post.</p></section>`}
      </div>`;

    $$('[data-tab]', view).forEach((b) => b.addEventListener('click', () => {
      state.ui_commitTab = b.dataset.tab; save(); renderCommitments();
    }));
    $$('[data-act="new"]', view).forEach((b) => b.addEventListener('click', () => commitmentForm()));
    $$('[data-act="edit"]', view).forEach((b) => b.addEventListener('click', () => commitmentForm(b.dataset.id)));
    $$('[data-act="del"]', view).forEach((b) => b.addEventListener('click', () => {
      confirmDialog('Delete this commitment?', connected() ? 'It will be removed for the group too.' : 'This cannot be undone.', 'Delete', () => {
        const c = state.commitments.find((x) => x.id === b.dataset.id);
        if (c) { c.deleted = true; c.updatedAt = Date.now(); }
        save(); queueSync(); renderCommitments(); toast('Deleted');
      }, true);
    }));
    $$('.seg button[data-v]', view).forEach((b) => b.addEventListener('click', () => {
      const c = state.commitments.find((x) => x.id === b.dataset.id);
      if (!c) return;
      c.review = c.review || {};
      c.review.status = c.review.status === b.dataset.v ? '' : b.dataset.v;
      c.updatedAt = Date.now();
      save(); queueSync(); renderCommitments();
    }));
    $$('textarea[data-review]', view).forEach((t) => t.addEventListener('change', () => {
      const c = state.commitments.find((x) => x.id === t.dataset.review);
      if (!c) return;
      c.review = c.review || {};
      c.review.notes = t.value.trim();
      c.updatedAt = Date.now();
      save(); queueSync(); toast('Saved');
    }));
  }

  function commitmentCard(c, readOnly) {
    const r = c.review || {};
    return `
      <section class="card commitment">
        <div class="row">
          <span class="small muted">${esc(c.author || '')}${c.author ? ' · ' : ''}${fmtStamp(c.createdAt)}</span>
          ${r.status ? `<span class="badge ${esc(r.status)}">${esc(r.status)}</span>` : ''}
        </div>
        <blockquote>${esc(c.commitment)}</blockquote>
        <dl class="kv">
          ${c.why ? `<dt>Why it matters</dt><dd>${esc(c.why)}</dd>` : ''}
          ${c.steps ? `<dt>First steps this week</dt><dd>${esc(c.steps)}</dd>` : ''}
          ${c.support ? `<dt>Support I need</dt><dd>${esc(c.support)}</dd>` : ''}
        </dl>
        ${readOnly ? (r.notes ? `<div class="review"><dt class="small muted">How it went</dt><p style="white-space:pre-wrap">${esc(r.notes)}</p></div>` : '') : `
        <div class="review">
          <div class="row" style="flex-wrap:wrap">
            <span class="small" style="font-weight:600">How did it go?</span>
            <span class="seg">
              <button type="button" data-v="kept" data-id="${c.id}" class="${r.status === 'kept' ? 'on' : ''}">Kept it</button>
              <button type="button" data-v="partly" data-id="${c.id}" class="${r.status === 'partly' ? 'on' : ''}">Partly</button>
              <button type="button" data-v="missed" data-id="${c.id}" class="${r.status === 'missed' ? 'on' : ''}">Missed</button>
            </span>
          </div>
          <textarea data-review="${c.id}" rows="2" placeholder="What did you learn? What got in the way?" style="margin-top:10px">${esc(r.notes || '')}</textarea>
        </div>
        <div class="btn-row">
          <button class="btn sm" data-act="edit" data-id="${c.id}">Edit</button>
          <button class="btn sm ghost danger" data-act="del" data-id="${c.id}">Delete</button>
        </div>`}
      </section>`;
  }

  function commitmentForm(id) {
    const cur = currentWeekNumber();
    const c = id ? state.commitments.find((x) => x.id === id) : { weekNumber: cur, commitment: '', why: '', steps: '', support: '' };
    if (!c) return;
    const weekOpts = [];
    for (let n = Math.max(1, cur - 8); n <= cur + 1; n++) weekOpts.push(n);
    if (!weekOpts.includes(c.weekNumber)) weekOpts.unshift(c.weekNumber);
    openDialog(`
      <form>
        <div class="dlg-head"><h2>${id ? 'Edit' : 'New'} commitment to change</h2><button type="button" class="btn sm ghost" data-close>✕</button></div>
        ${connected() ? '<p class="small muted" style="margin-top:8px">The brothers will see this.</p>' : ''}
        <label class="field"><span>Week</span>
          <select name="weekNumber">${weekOpts.map((n) => `<option value="${n}" ${n === c.weekNumber ? 'selected' : ''}>${weekLabel(n)}${n === cur ? ' (this week)' : ''}</option>`).join('')}</select>
        </label>
        <label class="field"><span>This week I commit to… <span class="hint">(specific and doable)</span></span>
          <textarea name="commitment" rows="3" required placeholder="e.g. Call one of the guys before I isolate, at least twice this week.">${esc(c.commitment)}</textarea></label>
        <label class="field"><span>Why this matters to me</span>
          <textarea name="why" rows="2" placeholder="What changes if I follow through?">${esc(c.why)}</textarea></label>
        <label class="field"><span>First steps this week</span>
          <textarea name="steps" rows="2" placeholder="When, where, with whom?">${esc(c.steps)}</textarea></label>
        <label class="field"><span>Support I need from the group</span>
          <textarea name="support" rows="2" placeholder="What can KP or the brothers ask me on Monday?">${esc(c.support)}</textarea></label>
        <div class="actions">
          <button class="btn" type="button" data-close>Cancel</button>
          <button class="btn primary" type="submit">Save commitment</button>
        </div>
      </form>`, (d) => {
      const text = d.commitment.trim();
      if (!text) { toast('Write your commitment first'); return false; }
      const now = Date.now();
      if (id) {
        Object.assign(c, { weekNumber: +d.weekNumber, commitment: text, why: d.why.trim(), steps: d.steps.trim(), support: d.support.trim(), updatedAt: now });
      } else {
        state.commitments.push({ id: uid(), weekNumber: +d.weekNumber, author: me(), createdAt: now, updatedAt: now, deleted: false, commitment: text, why: d.why.trim(), steps: d.steps.trim(), support: d.support.trim(), review: { status: '', notes: '' } });
      }
      save();
      queueSync();
      state.ui_commitTab = 'mine';
      if (location.hash !== '#/commitments') location.hash = '#/commitments'; else renderCommitments();
      toast(id ? 'Commitment updated' : 'Commitment saved. It will be here all week.');
    });
  }

  function renderFaster() {
    const cur = currentWeekNumber();
    const mine = myCheckins().filter((f) => f.weekNumber === cur).sort((a, b) => b.createdAt - a.createdAt)[0];
    let selected = mine ? mine.stage : '';
    const history = myCheckins().slice().sort((a, b) => b.createdAt - a.createdAt);
    const theirs = groupCheckins().filter((f) => f.weekNumber === cur).sort((a, b) => b.createdAt - a.createdAt);

    view.innerHTML = `
      <div class="stack">
        <div>
          <h1>FASTER scale</h1>
          <p class="muted small">Relapse does not start at the bottom. It starts with forgetting priorities. Find where you honestly are this week, then name your next right step.</p>
        </div>
        <section class="card">
          <p class="eyebrow">${weekLabel(cur)} check-in</p>
          <h2 style="margin-bottom:10px">Where are you today?</h2>
          <div class="scale" role="radiogroup" aria-label="FASTER stage">
            ${FASTER.map((s) => `
              <button type="button" class="stage ${selected === s.key ? 'selected' : ''}" data-stage="${s.key}" role="radio" aria-checked="${selected === s.key}">
                <span class="letter">${s.letter}</span>
                <span><span class="name">${esc(s.name)}</span><br><span class="short">${esc(s.short)}</span></span>
                <span aria-hidden="true">${selected === s.key ? '●' : '○'}</span>
              </button>`).join('')}
          </div>
          <label class="field"><span>What do you notice? What is your next right step?</span>
            <textarea id="faster-notes" rows="3" placeholder="Signs I see in myself… One thing I will do about it…">${esc(mine ? mine.notes : '')}</textarea></label>
          <div id="faster-notice" class="notice" ${selected === 'E' || selected === 'R' ? '' : 'hidden'}>You do not have to climb back alone. Text KP or one of the brothers today. If you are thinking about harming yourself, call or text <a href="tel:988">988</a>.</div>
          <div class="btn-row">
            <button class="btn primary" id="faster-save" ${selected ? '' : 'disabled'}>${mine ? 'Update check-in' : 'Save check-in'}</button>
            ${mine ? `<span class="small muted" style="align-self:center">Last saved ${fmtStamp(mine.createdAt)}</span>` : ''}
          </div>
          ${connected() ? '<p class="small muted" style="margin-top:8px">The brothers will see your stage and notes.</p>' : ''}
        </section>

        ${connected() ? `
        <section class="card">
          <p class="eyebrow">The brothers this week</p>
          <h2>Where they are</h2>
          ${theirs.length ? `<ul class="history">${theirs.map((f) => `
            <li>
              <div class="row">
                <span><span class="dot" data-stage="${f.stage}"></span><strong>${esc(f.author || 'Someone')}</strong> · ${esc(stageName(f.stage))}</span>
                <span class="small muted">${fmtStamp(f.createdAt)}</span>
              </div>
              ${f.notes ? `<p class="small" style="margin-top:4px;white-space:pre-wrap">${esc(f.notes)}</p>` : ''}
            </li>`).join('')}</ul>`
            : '<div class="empty">No check-ins from the others yet this week.</div>'}
        </section>` : ''}

        <section class="card">
          <p class="eyebrow">The scale</p>
          <h2 style="margin-bottom:10px">Signs at each stage</h2>
          <div class="scale">
            ${FASTER.map((s) => `
              <div class="stage" data-stage="${s.key}">
                <span class="letter">${s.letter}</span>
                <span><span class="name">${esc(s.name)}</span><br><span class="short">${esc(s.desc)}</span></span>
                <span></span>
                <details><summary>Common signs</summary><ul class="signs">${s.signs.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></details>
              </div>`).join('')}
          </div>
          <p class="small muted" style="margin-top:12px">Adapted from the FASTER Scale in Michael Dye's <em>The Genesis Process</em>.</p>
        </section>

        <section class="card">
          <p class="eyebrow">History</p>
          <h2>Your check-ins</h2>
          ${history.length ? `<ul class="history">${history.map((f) => `
            <li>
              <div class="row">
                <span><span class="dot" data-stage="${f.stage}"></span><strong>${esc(stageName(f.stage))}</strong></span>
                <span class="small muted">${weekLabel(f.weekNumber)}</span>
              </div>
              ${f.notes ? `<p class="small" style="margin-top:4px;white-space:pre-wrap">${esc(f.notes)}</p>` : ''}
              <div class="row"><span class="small muted">${fmtStamp(f.createdAt)}</span><button class="btn sm ghost danger" data-del="${f.id}">Delete</button></div>
            </li>`).join('')}</ul>` : '<div class="empty">No check-ins yet. Your first one will show up here.</div>'}
        </section>
      </div>`;

    const saveBtn = $('#faster-save', view);
    $$('[role=radiogroup] .stage', view).forEach((b) => b.addEventListener('click', () => {
      selected = b.dataset.stage;
      $$('[role=radiogroup] .stage', view).forEach((x) => {
        const on = x.dataset.stage === selected;
        x.classList.toggle('selected', on);
        x.setAttribute('aria-checked', on);
        x.lastElementChild.textContent = on ? '●' : '○';
      });
      $('#faster-notice', view).hidden = !(selected === 'E' || selected === 'R');
      saveBtn.disabled = false;
    }));
    saveBtn.addEventListener('click', () => {
      if (!selected) return;
      const notes = $('#faster-notes', view).value.trim();
      const now = Date.now();
      if (mine) Object.assign(mine, { stage: selected, notes, createdAt: now, updatedAt: now });
      else state.faster.push({ id: uid(), weekNumber: cur, date: todayISO(), stage: selected, notes, author: me(), deleted: false, createdAt: now, updatedAt: now });
      save(); queueSync(); renderFaster(); toast('Check-in saved');
    });
    $$('[data-del]', view).forEach((b) => b.addEventListener('click', () => {
      const f = state.faster.find((x) => x.id === b.dataset.del);
      if (f) { f.deleted = true; f.updatedAt = Date.now(); }
      save(); queueSync(); renderFaster(); toast('Check-in deleted');
    }));
  }

  function renderMore() {
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    const custom = me() && !MEMBERS.some((m) => m.name === me());
    const last = state.group.lastSync ? fmtStamp(state.group.lastSync) : 'never';
    view.innerHTML = `
      <div class="stack">
        <h1>More</h1>

        <section class="card">
          <p class="eyebrow">Who am I?</p>
          <h2>Pick your name</h2>
          <p class="small muted" style="margin-top:6px">Your name labels your entries for the group.</p>
          <div class="picker">
            ${MEMBERS.map((m) => `<button type="button" data-name="${esc(m.name)}" class="${me() === m.name ? 'on' : ''}">${esc(m.name)}${m.role ? ` · ${esc(m.role)}` : ''}</button>`).join('')}
            <button type="button" data-name="__other" class="${custom ? 'on' : ''}">${custom ? esc(me()) : 'Someone else'}</button>
          </div>
        </section>

        <section class="card">
          <p class="eyebrow">The group</p>
          <h2>${connected() ? 'Connected' : 'Not connected'}</h2>
          ${connected() ? `
            <p class="small muted" style="margin-top:6px">Your commitments and check-ins are shared with the other four men, and theirs with you. Last synced ${esc(last)}.</p>
            <div class="btn-row">
              <button class="btn primary" id="sync-btn">Sync now</button>
              <button class="btn" id="pass-btn">Change passcode</button>
            </div>
            <div class="btn-row"><button class="btn ghost danger sm" id="leave-btn">Leave the group on this phone</button></div>`
          : `
            <p class="small muted" style="margin-top:6px">Right now your entries only live on this phone. Join with the group passcode to share them with the brothers and see theirs.</p>
            <div class="btn-row"><button class="btn primary" id="join-btn">Join the group</button></div>`}
        </section>

        <section class="card">
          <p class="eyebrow">Install</p>
          <h2>Keep it on your home screen</h2>
          ${standalone ? '<p class="small" style="margin-top:6px">✓ Installed. You are running the app from your home screen.</p>'
            : isIOS ? '<p class="small" style="margin-top:6px">In Safari, tap the <strong>Share</strong> button, then <strong>Add to Home Screen</strong>.</p>'
            : `<p class="small" style="margin-top:6px">Install it like an app so it opens full screen and works offline.</p>
               <div class="btn-row"><button class="btn primary" id="install-btn" ${window.__installPrompt ? '' : 'hidden'}>Install app</button>
               <span class="small muted" id="install-hint" ${window.__installPrompt ? 'hidden' : ''} style="align-self:center">In Chrome, open the browser menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</span></div>`}
        </section>

        <section class="card">
          <p class="eyebrow">Meetings</p>
          <h2>Compassionate Warrior</h2>
          <p class="small" style="margin-top:6px">Mondays, 1:45 – 3:45 PM Pacific. Week 1 was ${fmtDate(FIRST_MEETING, { month: 'long', day: 'numeric', year: 'numeric' })}.</p>
          ${memberChips()}
        </section>

        <section class="card">
          <p class="eyebrow">Backup</p>
          <h2>Your data</h2>
          <p class="small muted" style="margin-top:6px">Save a copy of your own entries, or move them to a new phone.</p>
          <div class="btn-row">
            <button class="btn" id="export-btn">Export backup</button>
            <label class="btn">Import backup<input type="file" id="import-file" accept="application/json,.json" hidden></label>
          </div>
          <div class="btn-row"><button class="btn ghost danger sm" id="reset-btn">Erase everything on this phone</button></div>
        </section>

        <p class="small muted" style="text-align:center">Compassionate Warrior companion · v2 · works offline</p>
      </div>`;

    $$('.picker button', view).forEach((b) => b.addEventListener('click', () => {
      if (b.dataset.name === '__other') {
        openDialog(`
          <form>
            <div class="dlg-head"><h2>Your name</h2></div>
            <label class="field"><span>Name</span><input type="text" name="name" value="${esc(custom ? me() : '')}" required maxlength="40" autocomplete="off"></label>
            <div class="actions"><button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="submit">Save</button></div>
          </form>`, (d) => { state.profile.name = d.name.trim(); save(); updateWho(); renderMore(); });
        return;
      }
      state.profile.name = b.dataset.name; save(); updateWho(); renderMore(); toast(`Hi, ${state.profile.name}.`);
    }));

    const jb = $('#join-btn', view); if (jb) jb.addEventListener('click', connectDialog);
    const sb = $('#sync-btn', view); if (sb) sb.addEventListener('click', () => syncNow());
    const pb = $('#pass-btn', view); if (pb) pb.addEventListener('click', passcodeDialog);
    const lb = $('#leave-btn', view);
    if (lb) lb.addEventListener('click', () => {
      confirmDialog('Leave the group on this phone?', 'Your own entries stay here and stay on the group server. You just stop syncing until you enter the passcode again.', 'Leave', () => {
        state.group.passcode = '';
        state.group.commitments = [];
        state.group.checkins = [];
        save(); setSyncBadge('off'); renderMore(); toast('Disconnected.');
      }, true);
    });

    const ib = $('#install-btn', view);
    if (ib) ib.addEventListener('click', async () => {
      const p = window.__installPrompt; if (!p) return;
      p.prompt(); await p.userChoice; window.__installPrompt = null; renderMore();
    });
    $('#export-btn', view).addEventListener('click', () => {
      const copy = Object.assign({}, state);
      copy.group = Object.assign({}, state.group, { passcode: '' }); // never write the passcode into a file
      const blob = new Blob([JSON.stringify(copy, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `compassionate-warrior-${me() ? me().toLowerCase() + '-' : ''}${todayISO()}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    });
    $('#import-file', view).addEventListener('change', (e) => {
      const f = e.target.files[0]; if (!f) return;
      f.text().then((txt) => {
        const data = JSON.parse(txt);
        if (!data || !Array.isArray(data.commitments) || !Array.isArray(data.weeks)) throw new Error('bad');
        confirmDialog('Replace data on this phone?', `Backup contains ${data.commitments.length} commitments, ${(data.faster || []).length} check-ins and ${data.weeks.length} weeks of homework. This replaces what is here now.`, 'Import', () => {
          const pass = state.group.passcode;
          state = Object.assign(defaultState(), data);
          state.group.passcode = pass;
          save(); updateWho(); renderMore(); toast('Backup imported'); queueSync();
        });
      }).catch(() => toast('That file is not a Compassionate Warrior backup'));
      e.target.value = '';
    });
    $('#reset-btn', view).addEventListener('click', () => {
      confirmDialog('Erase everything?', 'All commitments, check-ins and homework on this phone will be deleted. Entries already shared with the group stay on the group server.', 'Erase', () => {
        state = defaultState(); save(); updateWho(); setSyncBadge('off'); renderMore(); toast('Fresh start.');
      }, true);
    });
  }

  // ---------- Router ----------
  const routes = { home: renderHome, homework: renderHomework, commitments: renderCommitments, faster: renderFaster, more: renderMore };
  function route() {
    const name = (location.hash.replace(/^#\/?/, '') || 'home').split('/')[0];
    const fn = routes[name] || renderHome;
    $$('.tabbar a').forEach((a) => a.classList.toggle('active', a.dataset.tab === (routes[name] ? name : 'home')));
    if (dlg.open) dlg.close();
    fn();
    setSyncBadge(state.group.status || (connected() ? 'ok' : 'off'));
    view.scrollTop = 0; window.scrollTo(0, 0);
    maybeSync();
  }

  // Moving between tabs should show the brothers' latest, not what was there
  // when the app was opened. Cheap because the payload is tiny.
  function maybeSync() {
    if (!connected()) return;
    if (Date.now() - (state.group.lastSync || 0) < 30000) return;
    syncNow({ silent: true });
  }
  function updateWho() {
    const el = $('#whoami');
    el.innerHTML = (me() ? esc(me()) : 'Who am I?') + ' <span id="sync-dot" data-status="off"></span>';
    setSyncBadge(state.group.status || (connected() ? 'ok' : 'off'));
  }
  $('#whoami').addEventListener('click', () => { location.hash = '#/more'; });
  window.addEventListener('hashchange', route);

  setInterval(() => {
    const el = $('[data-countdown]');
    if (!el) return;
    const nm = nextMeeting();
    if (!nm) return;
    if (nm.live) { el.classList.add('live'); el.textContent = 'In session'; }
    else el.textContent = 'in ' + relTime(nm.start - Date.now());
  }, 60000);

  // Keep the group view fresh while the app is open, and catch up when the phone reconnects.
  setInterval(() => { if (connected() && !dlg.open) syncNow({ silent: true }); }, 120000);
  window.addEventListener('online', () => syncNow({ silent: true }));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && connected() && Date.now() - state.group.lastSync > 15000) syncNow({ silent: true });
  });

  // ---------- PWA plumbing ----------
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.__installPrompt = e;
    const ib = $('#install-btn'); const ih = $('#install-hint');
    if (ib) { ib.hidden = false; if (ih) ih.hidden = true; }
  });
  window.addEventListener('appinstalled', () => { window.__installPrompt = null; toast('Installed. Find it on your home screen.'); });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then((reg) => {
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              toast('A new version is ready.', { label: 'Update', fn: () => nw.postMessage({ type: 'SKIP_WAITING' }) });
            }
          });
        });
      }).catch((err) => console.warn('Service worker registration failed', err));
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => { if (!refreshing) { refreshing = true; location.reload(); } });
    });
  }

  updateWho();
  route();
  if (connected()) syncNow({ silent: true });
})();
