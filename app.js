/* All people, shifts and policies below are fictional demonstration records. */
const Shiftwell = (() => {
  const DEMO_DATE = '2026-11-09';
  const clone = value => JSON.parse(JSON.stringify(value));
  const credentials = [
    { id: 'bls', name: 'BLS certification' },
    { id: 'registration', name: 'Nursing council registration' }
  ];
  function createExample(key = 'eligible') {
    const clinic = key === 'credential';
    const role = clinic ? 'Registered nurse' : 'Grill cook';
    return {
      key, company: clinic ? 'CarePoint Clinics' : 'FreshBowl',
      location: clinic ? 'Jubilee Hills clinic' : 'Banjara Hills restaurant',
      manager: clinic ? 'Anita Rao' : 'Priya Shah',
      shift: { id: 'swap-shift', date: '2026-11-12', start: '14:00', end: '22:00', hours: 8, role },
      openShift: { id: 'open-shift', date: '2026-11-13', start: '08:00', end: '16:00', hours: 8, role },
      policy: { autoEnabled: true, autoHoursLimit: 40, requiredCredentials: clinic ? clone(credentials) : [], trainingName: clinic ? 'Nursing training' : 'Grill station training' },
      people: {
        original: { id: 'original', name: clinic ? 'Neha Sharma' : 'Ravi Kumar', role, training: 'verified', conflict: 'no', baseHours: 30, credentials: { bls: '2027-06-30', registration: '2027-03-31' }, agreed: true },
        replacement: { id: 'replacement', name: clinic ? 'Kavya Reddy' : 'Asha Patel', role, training: key === 'review' ? 'unknown' : 'verified', conflict: 'no', baseHours: clinic ? 22 : 30, credentials: { bls: clinic ? '2026-11-10' : '', registration: clinic ? '2027-03-31' : '' }, agreed: true },
        alternate: { id: 'alternate', name: clinic ? 'Meera Iyer' : 'Dev Rao', role, training: 'verified', conflict: 'no', baseHours: 24, credentials: { bls: '2027-06-30', registration: '2027-03-31' }, agreed: true },
        unqualified: { id: 'unqualified', name: clinic ? 'Arjun Das' : 'Nikhil Verma', role, training: 'not-qualified', conflict: 'no', baseHours: 24, credentials: { bls: '2027-06-30', registration: '2027-03-31' }, agreed: true },
        notAgreed: { id: 'notAgreed', name: clinic ? 'Sara Khan' : 'Leena Nair', role, training: 'verified', conflict: 'no', baseHours: 26, credentials: { bls: '2027-06-30', registration: '2027-03-31' }, agreed: false }
      }
    };
  }
  function overlaps(a, b) { return a.date === b.date && a.start < b.end && b.start < a.end; }
  function evaluate(person, shift, policy, assignments = []) {
    const checks = [];
    const add = (id, title, status, reason, kind = 'information') => checks.push({ id, title, status, reason, kind });
    if (person.role !== shift.role) add('training', policy.trainingName, 'block', `This shift is for a ${shift.role.toLowerCase()}. ${person.name} has a different role.`);
    else if (person.training === 'verified') add('training', policy.trainingName, 'pass', `${person.name} has the training required for this shift.`);
    else if (person.training === 'not-qualified') add('training', policy.trainingName, 'block', `${person.name} has not completed the training required for this shift.`);
    else add('training', policy.trainingName, 'review', `${policy.trainingName} is not confirmed. Confirm it before deciding.`);
    const other = assignments.filter(a => a.personId === person.id && a.shift.id !== shift.id);
    if (person.conflict === 'yes' || other.some(a => overlaps(a.shift, shift))) add('conflict', 'Schedule conflict', 'block', 'This person has another shift at the same time.');
    else if (person.conflict !== 'no') add('conflict', 'Schedule conflict', 'review', 'We could not confirm whether this person has another shift at the same time.');
    else add('conflict', 'Schedule conflict', 'pass', 'No shift conflict found.');
    policy.requiredCredentials.forEach(required => {
      const expiry = person.credentials[required.id];
      if (!validDate(expiry)) add(required.id, required.name, 'review', `We don't have an expiry date for ${required.name}. Add it before deciding.`);
      else if (expiry < shift.date) add(required.id, required.name, 'block', `${required.name} expires ${shortDate(expiry)}, before the shift on ${shortDate(shift.date)}.`);
      else add(required.id, required.name, 'pass', `Valid for the shift on ${shortDate(shift.date)}.`);
    });
    let projectedHours = null;
    if (person.baseHours === null || person.baseHours === '' || !Number.isFinite(Number(person.baseHours)) || Number(person.baseHours) < 0) add('hours', 'Weekly hours', 'review', 'We could not confirm this person’s scheduled hours. Check them before deciding.');
    else {
      const existing = Number(person.baseHours) + other.reduce((sum, a) => sum + a.shift.hours, 0);
      projectedHours = existing + shift.hours;
      if (projectedHours > policy.autoHoursLimit) add('hours', 'Weekly hours', 'review', `${existing} hours scheduled + ${shift.hours}-hour shift = ${projectedHours} hours. This is above the ${policy.autoHoursLimit}-hour automatic approval limit.`, 'judgment');
      else add('hours', 'Weekly hours', 'pass', `${existing} hours scheduled + ${shift.hours}-hour shift = ${projectedHours} hours. This is within the ${policy.autoHoursLimit}-hour automatic approval limit.`);
    }
    if (!policy.autoEnabled) add('permission', 'Approval setting', 'review', 'A manager must approve swaps at this location.', 'judgment');
    const decision = checks.some(c => c.status === 'block') ? 'blocked' : checks.some(c => c.status === 'review') ? 'review' : 'approved';
    return { decision, checks, projectedHours, canManagerApprove: !checks.some(c => c.status === 'block' || (c.status === 'review' && c.kind !== 'judgment')), requiresHoursReview: checks.some(c => c.id === 'hours' && c.status === 'review' && c.kind === 'judgment') };
  }
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
    const d = new Date(value + 'T12:00:00Z');
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
  }
  function shortDate(value) { return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value + 'T12:00:00Z')); }
  function initialState(key = 'eligible') {
    return { data: createExample(key), view: 'staff', page: 'schedule', selected: 'replacement', request: null, assignments: [{ personId: 'original', shift: createExample(key).shift }], events: [], editor: false, editorPerson: 'replacement', assignmentOpen: false, assignmentChoice: 'replacement', assignmentResult: null, notice: '', error: '', hoursReviewed: false, rejectOpen: false, rejectReason: '', detailsOpen: false };
  }
  function submission(state) {
    if (state.request) return false;
    const person = state.data.people[state.selected];
    if (!person || person.id === 'original' || !person.agreed) return false;
    const result = evaluate(person, state.data.shift, state.data.policy, state.assignments);
    state.request = { id: 'SW-1042', personId: person.id, person: clone(person), status: result.decision, result: clone(result), recordChanged: false, rejectionReason: '' };
    state.events.push({ title: `${state.data.people.original.name} asked ${person.name} to cover this shift.`, by: 'Staff screen' });
    if (result.decision === 'approved') {
      state.assignments = state.assignments.filter(a => a.shift.id !== state.data.shift.id);
      state.assignments.push({ personId: person.id, shift: clone(state.data.shift) });
      state.events.push({ title: 'All checks passed. The roster is updated.', by: 'Automatic approval' });
    } else state.events.push({ title: result.decision === 'blocked' ? 'A required check failed. The original assignment stays.' : 'A manager must decide. The original assignment stays.', by: 'Automatic checks' });
    state.page = 'result';
    state.detailsOpen = result.decision !== 'approved';
    return true;
  }
  function recheck(state) {
    if (!state.request || state.request.status !== 'review') return null;
    const result = evaluate(state.data.people[state.request.personId], state.data.shift, state.data.policy, state.assignments);
    state.request.result = clone(result);
    state.request.person = clone(state.data.people[state.request.personId]);
    state.request.recordChanged = false;
    if (result.decision === 'blocked') state.request.status = 'blocked';
    state.hoursReviewed = false;
    state.events.push({ title: result.decision === 'blocked' ? 'Checked again. A required rule still fails.' : result.canManagerApprove ? 'Checks complete. A manager can decide.' : 'Checked again. Some information is still missing.', by: state.data.manager + ' · Manager' });
    return result;
  }
  function managerApprove(state) {
    const request = state.request;
    if (!request || request.status !== 'review' || request.recordChanged) return false;
    const result = evaluate(state.data.people[request.personId], state.data.shift, state.data.policy, state.assignments);
    if (!result.canManagerApprove || (result.requiresHoursReview && !state.hoursReviewed)) return false;
    result.checks.forEach(check => {
      if (check.status === 'review' && check.kind === 'judgment') check.authorizedBy = state.data.manager;
    });
    request.status = 'approved'; request.result = clone(result); request.person = clone(state.data.people[request.personId]);
    state.detailsOpen = false;
    state.assignments = state.assignments.filter(a => a.shift.id !== state.data.shift.id);
    state.assignments.push({ personId: request.personId, shift: clone(state.data.shift) });
    state.events.push({ title: result.requiresHoursReview ? 'Manager approved the swap and hours exception. Roster updated.' : 'Manager approved the swap. Roster updated.', by: state.data.manager + ' · Manager screen' });
    return true;
  }
  return { DEMO_DATE, clone, createExample, evaluate, validDate, initialState, submission, recheck, managerApprove };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Shiftwell;

if (typeof document !== 'undefined') (() => {
  'use strict';
  const { clone, evaluate, validDate } = Shiftwell;
  const root = document.getElementById('app');
  let state = Shiftwell.initialState();
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const paths = {
    calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    cross: '<path d="m6 6 12 12M18 6 6 18"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    back: '<path d="M20 12H4m6-6-6 6 6 6"/>',
    shield: '<path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6z"/><path d="m8 12 3 3 5-6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
    list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
    refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 6a8 8 0 0 1 14 6M4 12a8 8 0 0 0 14 6"/>'
  };
  const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.info}</svg>`;
  const date = value => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value + 'T12:00:00Z'));
  const weekday = value => new Intl.DateTimeFormat('en-IN', { weekday: 'long', timeZone: 'UTC' }).format(new Date(value + 'T12:00:00Z'));
  const time = value => { const [h, m] = value.split(':').map(Number); return `${h % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''} ${h < 12 ? 'AM' : 'PM'}`; };
  const times = shift => `${time(shift.start)} – ${time(shift.end)}`;
  const button = (action, label, type = '', attrs = '') => `<button class="btn ${type}" data-action="${action}" ${attrs}>${label}</button>`;
  const personOptions = (selected, includeOriginal = false) => Object.values(state.data.people).filter(p => includeOriginal || p.id !== 'original').map(p => {
    const labels = [];
    if (p.training === 'not-qualified' || p.role !== state.data.shift.role) labels.push('Not qualified');
    else if (p.training !== 'verified') labels.push('Training unconfirmed');
    if (!includeOriginal && !p.agreed) labels.push('Has not agreed');
    return `<option value="${p.id}" ${selected === p.id ? 'selected' : ''}>${esc(p.name)} · ${esc(p.role)}${labels.length ? ' · ' + labels.join(' · ') : ''}</option>`;
  }).join('');
  function activeResult() { return state.request?.result; }
  function notice() { return state.notice ? `<div class="notice" role="status">${icon('check')}<span>${esc(state.notice)}</span></div>` : ''; }
  function info(text, neutral = false) { return `<div class="info-strip ${neutral ? 'neutral' : ''}">${icon('info')}<div>${text}</div></div>`; }
  function demoToolbar() {
    return `<section class="demo-bar" aria-label="Demo controls"><div class="demo-inner"><div class="demo-top"><p class="demo-label"><strong>Sample cases</strong></p><div class="demo-actions"><button class="toolbar-btn" data-action="editor" aria-expanded="${state.editor}" aria-controls="sample-editor">${state.editor ? 'Close sample records' : 'Edit sample records'}</button><button class="toolbar-btn" data-action="reset">Reset case</button></div></div><div class="scenario-row" role="group" aria-label="Choose a sample case">${[['eligible','Automatic approval'],['credential','Certificate expiry'],['review','Manager review']].map(([key,label],i) => `<button class="scenario ${state.data.key === key ? 'active' : ''}" data-action="example" data-key="${key}" aria-pressed="${state.data.key === key}"><span class="number">0${i+1}</span>${label}</button>`).join('')}</div>${state.editor ? editor() : ''}</div></section>`;
  }
  function editor() {
    const p = state.data.people[state.editorPerson];
    return `<section class="sample-panel" id="sample-editor" aria-labelledby="editor-heading"><h2 id="editor-heading">Edit sample records</h2><p>Change records to try another outcome. Completed decisions keep their original check results.</p><form id="sample-form"><div class="field-grid"><div class="field"><label for="sample-person">Employee</label><select id="sample-person" name="person">${personOptions(state.editorPerson, true)}</select><small>Changing employee clears unsaved edits.</small></div><div class="field"><label for="sample-training">${esc(state.data.policy.trainingName)}</label><select id="sample-training" name="training"><option value="verified" ${p.training === 'verified' ? 'selected' : ''}>Confirmed</option><option value="unknown" ${p.training === 'unknown' ? 'selected' : ''}>Not confirmed</option><option value="not-qualified" ${p.training === 'not-qualified' ? 'selected' : ''}>Does not meet requirement</option></select></div><div class="field"><label for="sample-conflict">Another shift at the same time</label><select id="sample-conflict" name="conflict"><option value="no" ${p.conflict === 'no' ? 'selected' : ''}>No</option><option value="yes" ${p.conflict === 'yes' ? 'selected' : ''}>Yes</option><option value="unknown" ${p.conflict === 'unknown' ? 'selected' : ''}>Not confirmed</option></select></div><div class="field"><label for="sample-hours">Hours already scheduled this week</label><input id="sample-hours" name="hours" type="number" min="0" max="168" step="0.5" value="${p.baseHours ?? ''}"><small>Other weekly hours, excluding both shifts in this demo. Leave blank for missing data.</small></div>${state.data.policy.requiredCredentials.map(c => `<div class="field"><label for="sample-${c.id}">${esc(c.name)} expiry date</label><input id="sample-${c.id}" type="date" name="${c.id}" value="${esc(p.credentials[c.id])}" min="2020-01-01" max="2040-12-31"><small>Leave blank to show a missing expiry date.</small></div>`).join('')}</div><p class="sample-summary">Demo setting: swaps can be approved automatically up to ${state.data.policy.autoHoursLimit} hours a week. This is an example limit, not a legal limit.</p>${state.error ? `<p class="form-error" role="alert">${esc(state.error)}</p>` : ''}<div class="form-actions"><button class="btn primary small-btn" type="submit">Save sample changes</button><button class="btn small-btn" type="button" data-action="editor">Close</button></div></form></section>`;
  }
  function header() {
    return `<header class="app-header"><div class="header-inner"><div class="brand"><span class="brand-mark">${icon('calendar')}</span>shiftwell</div><div class="header-right"><div class="view-toggle" role="group" aria-label="Choose a screen"><button data-action="staff" class="${state.view === 'staff' ? 'active' : ''}" aria-pressed="${state.view === 'staff'}">Staff screen</button><button data-action="manager" class="${state.view === 'manager' ? 'active' : ''}" aria-pressed="${state.view === 'manager'}">Manager screen</button></div></div></div></header>`;
  }

  function shiftSummary(shift = state.data.shift) { return `<div class="summary-shift"><strong>${esc(shift.role)} · ${weekday(shift.date)}, ${date(shift.date)}</strong><p>${times(shift)} · ${shift.hours} hours · ${esc(state.data.location)}</p></div>`; }
  function schedule() {
    const d = state.data;
    return `<section class="card"><div class="card-head"><h2>Your next shift</h2></div><div class="card-body"><div class="shift-heading"><div class="date-tile"><small>NOV</small><strong>12</strong><small>THU</small></div><div><h2>${esc(d.shift.role)}</h2><p>${date(d.shift.date)} · ${times(d.shift)} · ${d.shift.hours} hours</p><p>${esc(d.location)}</p></div></div></div><div class="card-footer"><p>Choose a colleague who has agreed to cover.</p>${button('request', `Request a swap ${icon('arrow')}`, 'primary')}</div></section>`;
  }
  function requestForm() {
    const p = state.data.people[state.selected];
    return `<button class="link-btn back" data-action="back">${icon('back')}Back to schedule</button><section class="card"><div class="card-head"><h2>Request a swap</h2></div><form id="request-form"><div class="card-body">${shiftSummary()}<div class="field"><label for="replacement">Who will cover this shift?</label><select id="replacement" name="replacement">${personOptions(state.selected)}</select></div><p class="consent ${p.agreed ? '' : 'not-consented'}">${icon(p.agreed ? 'check' : 'clock')}<span>${p.agreed ? `${esc(p.name)} has agreed to cover.` : `${esc(p.name)} has not agreed. Choose a colleague who has agreed before sending a request.`}</span></p></div><div class="card-footer"><p>The shift changes only after approval.</p><button class="btn primary" type="submit" ${p.agreed ? '' : 'disabled'}>${p.agreed ? `Send swap request ${icon('arrow')}` : 'Agreement required'}</button></div></form></section>`;
  }
  function checkList(result) {
    const row = c => {
      const appearance = c.authorizedBy ? 'pass' : c.status;
      return `<div class="check-row"><span class="check-mark ${appearance}">${icon(appearance === 'pass' ? 'check' : appearance === 'block' ? 'cross' : 'clock')}</span><div class="check-text"><strong>${esc(c.title)}</strong><p>${esc(c.reason)}${c.authorizedBy ? ` Exception approved by ${esc(c.authorizedBy)}.` : ''}</p></div><span class="check-result ${appearance}">${c.authorizedBy ? 'Approved' : c.status === 'pass' ? 'Passed' : c.status === 'block' ? 'Failed' : 'Check needed'}</span></div>`;
    };
    const attention = result.checks.filter(c => c.status !== 'pass' && !c.authorizedBy);
    const passed = result.checks.filter(c => c.status === 'pass' || c.authorizedBy);
    return `${attention.length ? `<div class="checks">${attention.map(row).join('')}</div>` : ''}${passed.length ? attention.length ? `<details class="passed-details"><summary>${passed.length} other check${passed.length === 1 ? '' : 's'} passed</summary><div class="checks">${passed.map(row).join('')}</div></details>` : `<div class="checks">${passed.map(row).join('')}</div>` : ''}`;
  }
  function history() {
    return `<details class="history"><summary>Activity · ${state.events.length} events</summary><ol>${state.events.map((event, i) => `<li><span class="history-dot"></span><div><strong>${esc(event.title)}</strong><small>${String(i + 1).padStart(2, '0')} · ${esc(event.by)}</small></div></li>`).join('')}</ol></details>`;
  }
  function changeSummary() {
    const r = state.request;
    const approved = r.status === 'approved';
    return `<div class="assignment-change"><div><span class="change-label">${approved ? 'Before swap' : 'Still assigned'}</span><strong>${esc(state.data.people.original.name)}</strong></div>${icon('arrow')}<div class="${approved ? 'new' : ''}"><span class="change-label">${approved ? 'After swap' : 'Asked to cover'}</span><strong>${esc(r.person.name)}</strong></div></div>`;
  }
  function resultText() {
    const r = state.request, name = r.person.name, original = state.data.people.original.name;
    if (r.status === 'approved') return { title: state.events.some(e => e.title.startsWith('Manager approved')) ? 'Swap approved by the manager' : 'Swap approved automatically', description: `${name} now has this shift.` };
    if (r.status === 'blocked') return { title: 'Swap blocked', description: `${original} keeps this shift. Choose another colleague.` };
    if (r.status === 'rejected') return { title: 'Swap not approved', description: `${state.data.manager}: ${r.rejectionReason}` };
    return { title: 'Manager review needed', description: `${original} keeps this shift until ${state.data.manager} approves.` };
  }
  function resultCard(manager = false) {
    const r = state.request, text = resultText(), result = activeResult();
    const title = manager && r.status === 'review' ? 'Review this swap' : text.title;
    return `<section class="card"><div class="result-top"><p class="request-meta">SWAP ${r.id}</p><div class="row"><div class="outcome-mark ${r.status}">${icon(r.status === 'approved' ? 'check' : r.status === 'review' ? 'clock' : 'cross')}</div></div><h2>${title}</h2><p>${esc(text.description)}</p>${changeSummary()}<p class="inline-note">${date(state.data.shift.date)} · ${times(state.data.shift)} · ${esc(state.data.shift.role)}</p></div>${r.status === 'blocked' || r.status === 'review' || state.detailsOpen ? `<section class="check-section"><h3>${r.status === 'blocked' || r.status === 'review' ? 'What needs attention' : 'Check results'}</h3>${checkList(result)}</section>` : `<div class="check-section"><button class="link-btn" data-action="details" aria-expanded="false">View check results ${icon('arrow')}</button></div>`}${manager && r.status === 'review' ? reviewActions() : `<div class="card-footer result-footer">${!manager && (r.status === 'blocked' || r.status === 'rejected') ? button('retry', 'Choose another colleague', 'primary') : button(manager ? 'staff' : 'manager', manager ? 'Go to staff screen' : 'Open manager screen', 'small-btn')}</div>`}${manager ? history() : ''}</section>`;
  }
  function reviewActions() {
    const r = state.request, result = r.result;
    const can = result.canManagerApprove && !r.recordChanged && (!result.requiresHoursReview || state.hoursReviewed);
    const hint = r.recordChanged ? 'Records changed. Check again before deciding.' : !result.canManagerApprove ? 'Confirm the missing details, then check again. Use Edit sample records to try this in the demo.' : result.requiresHoursReview && !state.hoursReviewed ? 'Review the weekly hours before approving.' : 'All required checks passed. You can approve or reject.';
    return `<section class="review-actions"><p class="review-hint">${hint}</p>${result.requiresHoursReview ? `<label class="checkbox-label"><input type="checkbox" id="hours-reviewed" ${state.hoursReviewed ? 'checked' : ''}>I reviewed the ${result.projectedHours}-hour total and approve this swap above the ${state.data.policy.autoHoursLimit}-hour automatic approval limit.</label>` : ''}<div class="form-actions">${button('recheck', `${icon('refresh')}Check again`)}${button('approve', 'Approve swap', 'primary', can ? '' : 'disabled')}${button('reject-open', 'Reject swap', 'danger')}</div>${state.rejectOpen ? `<form id="reject-form" class="space-top"><div class="field"><label for="reject-reason">Reason for rejection</label><textarea id="reject-reason" name="reason" required maxlength="300" placeholder="Tell the staff member why.">${esc(state.rejectReason)}</textarea></div><div class="form-actions"><button class="btn danger" type="submit">Confirm rejection</button>${button('reject-cancel', 'Cancel', 'small-btn', 'type="button"')}</div></form>` : ''}</section>`;
  }
  function roster() {
    return `<section class="card" id="roster"><div class="card-head"><h2 id="roster-title" tabindex="-1">Shift roster</h2><span class="muted small">12–13 Nov 2026</span></div>${[state.data.shift,state.data.openShift].map(shift => {
      const assigned = state.assignments.find(a => a.shift.id === shift.id);
      const name = assigned ? state.data.people[assigned.personId].name : 'No one assigned';
      return `<div class="roster-row"><div class="roster-date">NOV<strong>${shift.date.slice(-2)}</strong></div><div class="roster-info"><strong>${esc(shift.role)}</strong><p>${times(shift)} · ${shift.hours} hours</p></div><div class="roster-person">${esc(name)}${assigned ? '<br><span class="muted small">Assigned</span>' : ''}</div>${!assigned && shift.id === 'open-shift' ? button('assignment-open', 'Choose staff', 'small-btn') : ''}</div>`;
    }).join('')}${state.assignmentOpen ? assignmentForm() : ''}</section>`;
  }
  function assignmentForm() {
    const result = state.assignmentResult;
    return `<form id="assignment-form" class="assignment-form"><h3>Fill this open shift</h3><p class="muted small" style="margin:5px 0 15px">${date(state.data.openShift.date)} · ${times(state.data.openShift)}. We use the same checks as a swap.</p><div class="field"><label for="assignment-person">Choose a staff member</label><select id="assignment-person" name="person">${personOptions(state.assignmentChoice, true)}</select></div>${result ? `<div class="space-top">${info(result.decision === 'blocked' ? '<strong>Can’t assign this person.</strong> Choose someone who meets the requirements. The shift stays open.' : '<strong>Assignment needs attention.</strong> Check the details below before assigning anyone.', true)}</div>${checkList(result)}` : ''}<div class="form-actions space-top"><button class="btn primary" type="submit">Check and assign</button>${button('assignment-close', 'Cancel', '', 'type="button"')}</div></form>`;
  }
  function managerView() {
    return `${state.request ? resultCard(true) : `<section class="card"><div class="empty"><span class="outcome-mark">${icon('list')}</span><h2>No swap request yet</h2><p>Send a request from the Staff screen. Its result will appear here.</p>${button('staff', 'Go to staff screen', 'primary')}</div></section>`}${roster()}`;
  }
  function render({ focus = false, preserveScroll = false } = {}) {
    const scroll = window.scrollY;
    root.innerHTML = `${demoToolbar()}${header()}<div class="shell"><div class="page-intro"><div><h1>${state.view === 'staff' ? 'Your schedule' : 'Requests and roster'}</h1><p>${esc(state.view === 'staff' ? state.data.people.original.name : state.data.manager)} · ${esc(state.data.company)}</p></div><div class="date-note"><span class="eyebrow">Demo date</span><br>9 Nov 2026</div></div><main id="main" tabindex="-1" class="main-column" aria-label="${state.view === 'staff' ? 'Staff schedule and swaps' : 'Manager requests and roster'}">${notice()}${state.view === 'manager' ? managerView() : state.request && state.page !== 'form' ? resultCard() : state.page === 'form' ? requestForm() : schedule()}</main></div><footer class="footer-note">Fictional records · Changes reset on refresh</footer><div id="announcer" class="sr-only" aria-live="polite"></div>`;
    if (focus) document.getElementById('main').focus({ preventScroll: true });
    if (preserveScroll) window.scrollTo(0, scroll);
    else if (focus) document.querySelector('.shell').scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  root.addEventListener('click', event => {
    const el = event.target.closest('[data-action]');
    if (!el || el.disabled) return;
    const action = el.dataset.action;
    state.error = ''; state.notice = '';
    if (action === 'example' || action === 'reset') { state = Shiftwell.initialState(action === 'example' ? el.dataset.key : state.data.key); state.notice = action === 'reset' ? 'Example reset.' : ''; render({focus:true}); return; }
    if (action === 'editor') { state.editor = !state.editor; render({preserveScroll:true}); if (state.editor) document.getElementById('sample-person').focus(); else document.querySelector('[data-action="editor"]').focus(); return; }
    if (action === 'staff' || action === 'manager') { state.view = action; render({focus:true}); return; }
    if (action === 'request') state.page = 'form';
    if (action === 'back') state.page = 'schedule';
    if (action === 'details') state.detailsOpen = true;
    if (action === 'retry') { state.request = null; state.events = []; state.page = 'form'; state.selected = 'alternate'; state.detailsOpen = false; }
    if (action === 'recheck') { Shiftwell.recheck(state); state.notice = 'Records checked again.'; }
    if (action === 'approve') Shiftwell.managerApprove(state);
    if (action === 'reject-open') state.rejectOpen = true;
    if (action === 'reject-cancel') state.rejectOpen = false;
    if (action === 'assignment-open') { state.assignmentOpen = true; state.assignmentResult = null; }
    if (action === 'assignment-close') { state.assignmentOpen = false; state.assignmentResult = null; }
    render({focus: !['details','reject-open','reject-cancel','assignment-open','assignment-close'].includes(action), preserveScroll:['details','reject-open','reject-cancel','assignment-open','assignment-close'].includes(action)});
    if (action === 'reject-open') document.getElementById('reject-reason').focus();
    if (action === 'assignment-open') document.getElementById('assignment-person').focus();
    if (action === 'reject-cancel') document.querySelector('[data-action="reject-open"]').focus();
    if (action === 'assignment-close') document.querySelector('[data-action="assignment-open"]').focus();
    if (action === 'details') {
      const heading = document.querySelector('.check-section h3');
      heading.tabIndex = -1;
      heading.focus({preventScroll:true});
    }
  });
  root.addEventListener('change', event => {
    const el = event.target;
    if (el.id === 'replacement') { state.selected = el.value; render({preserveScroll:true}); document.getElementById('replacement').focus(); }
    if (el.id === 'sample-person') { state.editorPerson = el.value; state.error = ''; render({preserveScroll:true}); document.getElementById('sample-person').focus(); }
    if (el.id === 'assignment-person') { state.assignmentChoice = el.value; state.assignmentResult = null; render({preserveScroll:true}); document.getElementById('assignment-person').focus(); }
    if (el.id === 'hours-reviewed') { state.hoursReviewed = el.checked; render({preserveScroll:true}); document.getElementById('hours-reviewed').focus(); }
  });
  root.addEventListener('input', event => {
    if (event.target.id === 'reject-reason') {
      state.rejectReason = event.target.value;
      event.target.setCustomValidity('');
    }
  });
  root.addEventListener('submit', event => {
    event.preventDefault(); state.notice = ''; state.error = '';
    const form = event.target;
    const values = new FormData(form);
    if (form.id === 'request-form') { Shiftwell.submission(state); render({focus:true}); return; }
    if (form.id === 'sample-form') {
      const raw = String(values.get('hours')).trim();
      const invalidHours = raw !== '' && (!Number.isFinite(Number(raw)) || Number(raw) < 0 || Number(raw) > 168 || Number(raw) % .5 !== 0);
      const invalidCredentials = state.data.policy.requiredCredentials.some(c => { const v = values.get(c.id); return v && (!validDate(v) || v < '2020-01-01' || v > '2040-12-31'); });
      if (invalidHours || invalidCredentials) { state.error = invalidHours ? 'Enter 0 to 168 hours in half-hour steps, or leave blank.' : 'Enter a valid expiry date from 2020 to 2040, or leave blank.'; render({preserveScroll:true}); document.getElementById('sample-hours').focus(); return; }
      const person = state.data.people[state.editorPerson];
      person.training = values.get('training'); person.conflict = values.get('conflict'); person.baseHours = raw === '' ? null : Number(raw);
      state.data.policy.requiredCredentials.forEach(c => { person.credentials[c.id] = values.get(c.id); });
      if (state.request?.status === 'review') { state.request.recordChanged = true; state.hoursReviewed = false; }
      state.assignmentResult = null;
      state.notice = `Saved ${person.name}’s sample record.${state.request?.status === 'review' ? ' Check the request again before deciding.' : state.request ? ' Load another case to see a different result.' : ' Send a swap request to see the result.'}`;
      render({preserveScroll:true}); document.querySelector('[data-action="editor"]').focus(); return;
    }
    if (form.id === 'reject-form' && state.request?.status === 'review') {
      const reason = String(values.get('reason')).trim();
      if (!reason) { document.getElementById('reject-reason').setCustomValidity('Enter a clear reason for the staff member.'); document.getElementById('reject-reason').reportValidity(); return; }
      state.request.status = 'rejected'; state.request.rejectionReason = reason;
      state.events.push({title: `Request rejected: ${reason}`, by: state.data.manager + ' · Manager screen'});
      state.rejectOpen = false; state.rejectReason = ''; state.detailsOpen = false;
      render({focus:true}); return;
    }
    if (form.id === 'assignment-form') {
      if (state.assignments.some(a => a.shift.id === state.data.openShift.id)) return;
      const person = state.data.people[state.assignmentChoice];
      const result = evaluate(person, state.data.openShift, state.data.policy, state.assignments);
      if (result.decision === 'approved') {
        state.assignments.push({personId:person.id, shift:clone(state.data.openShift)});
        state.assignmentOpen = false; state.assignmentResult = null;
        state.notice = `${person.name} is assigned to the shift. All checks passed.`;
        if (state.request?.status === 'review') {
          state.request.recordChanged = true;
          state.hoursReviewed = false;
          state.notice += ' Check the pending swap again. The roster changed.';
        }
      } else state.assignmentResult = clone(result);
      render({preserveScroll:true}); document.getElementById('announcer').textContent = state.assignmentResult ? 'Assignment not made. Check the results below.' : state.notice;
      if (!state.assignmentOpen) document.getElementById('roster-title').focus({preventScroll:true});
      return;
    }
  });
  render();
})();
