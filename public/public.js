
const $ = id => document.getElementById(id);

const EVENTS = {
  'vsu-holiday-2026': {
    organization: 'VIRGINIA STATE UNIVERSITY ALUMNI ASSOCIATION • HOWARD COUNTY, MD',
    title: 'TROJANS GATHER',
    subtitle: 'Holiday Potluck 2026',
    date: 'Sunday, December 13 • 3:00–6:00 PM',
    location: 'Hosted at the home of VP LeMontre Taylor • Merriweather Pavilion Area - Detailed address shared privately',
    attendees: 40,
    primary: '#173C86',
    secondary: '#F47920',
    footer: 'VSU Alumni Association • Howard County, Maryland Chapter'
  },
  'kpl-holiday-2026': {
    organization: 'ALPHA PHI ALPHA FRATERNITY, INC. • KAPPA PHI LAMBDA CHAPTER',
    title: 'KAPPA PHI LAMBDA',
    subtitle: 'Holiday Dinner 2026',
    date: 'Saturday, December 19 • 5:00–9:00 PM',
    location: "The Sheppard's Home • Detailed address shared privately",
    attendees: 50,
    primary: '#111111',
    secondary: '#C5A253',
    footer: 'Alpha Phi Alpha Fraternity, Inc. • Kappa Phi Lambda Chapter'
  }
};

const eventId =
  new URLSearchParams(location.search).get('eventId') ||
  'vsu-holiday-2026';

const event = EVENTS[eventId];
let latest = [];

const el = (tag, cls, txt) => {
  const x = document.createElement(tag);
  if (cls) x.className = cls;
  if (txt !== undefined) x.textContent = String(txt);
  return x;
};

function applyEvent() {
  if (!event) {
    document.querySelector('main').textContent =
      'Event not found. Please check your event link.';
    return false;
  }

  document.title = `${event.title} — ${event.subtitle}`;

  const header = document.querySelector('header');
  const paragraphs = header.querySelectorAll('p');

  header.querySelector('.eyebrow').textContent =
    event.organization;

  header.querySelector('h1').textContent = event.title;
  paragraphs[0].textContent = event.subtitle;
  paragraphs[1].replaceChildren(
    el('strong', '', event.date)
  );
  paragraphs[2].textContent = event.location;

  header.style.backgroundColor = event.primary;
  header.style.borderBottom =
    `6px solid ${event.secondary}`;

  const intro =
    document.querySelector('#needs')
      .parentElement.querySelector('p.hint');

  intro.textContent =
    `We're planning for ${event.attendees} attendees. ` +
    'These counts show approved contributors, not servings. ' +
    'More contributors are always welcome; pending signups ' +
    'are shown separately.';

  $('servings').value = String(event.attendees);

  const footer = document.querySelector('footer');
  if (footer) footer.textContent = event.footer;

  const adminLink =
    document.querySelector('a[href="/admin.html"]');

  if (adminLink) {
    adminLink.href =
      `/admin.html?eventId=${encodeURIComponent(eventId)}`;
  }

  if (eventId === 'kpl-holiday-2026') {
    const note = document.querySelector('.note');
    if (note) {
      note.textContent =
        'Questions? Contact your chapter event organizer.';
    }
  }

  return true;
}

async function load() {
  try {
    const r = await fetch(
      `/api/potluck?eventId=${encodeURIComponent(eventId)}`,
      { cache: 'no-store' }
    );

    if (!r.ok) throw Error('Unable to load');

    const d = await r.json();
    latest = d.categories;

    const needs = $('needs');
    needs.replaceChildren();

    for (const c of d.categories) {
      const box = el('div', 'card');
      const top = el('div', 'cat-title');

      top.append(
        el('span', '', `${c.icon} ${c.name}`),
        el(
          'span',
          'status' + (c.shortage === 0 ? ' done' : ''),
          c.shortage === 0
            ? (c.approved > c.target
                ? `${c.approved - c.target} extra contributors`
                : 'Goal met')
            : `Need ${c.shortage}`
        )
      );

      box.append(
        top,
        el(
          'div',
          'metric',
          `${c.approved} / ${c.target} contributors confirmed`
        )
      );

      const track = el('div', 'track');
      const fill = el(
        'div',
        'fill' + (c.shortage === 0 ? ' done' : '')
      );

      fill.style.width =
        Math.min(100, 100 * c.approved / c.target) + '%';

      track.append(fill);

      box.append(
        track,
        el('div', 'hint', `${c.pending} contributor(s) pending`)
      );

      needs.append(box);
    }

    const list = $('contributions');
    list.replaceChildren();

    if (!d.contributions.length) {
      list.append(
        el(
          'p',
          'hint',
          'No approved contributions yet. Be the first to sign up!'
        )
      );
    }

    for (const x of d.contributions) {
      const c = d.categories.find(
        c => c.id === x.category
      );

      const item = el('div', 'item');

      item.append(
        el('strong', '', x.dish),
        el(
          'small',
          '',
          `${x.name} • ${c?.name || x.category} • ` +
          `${x.servings} servings`
        )
      );

      list.append(item);
    }

    const sel = $('category');
    const old = sel.value;

    sel.replaceChildren(
      new Option('Choose category', '')
    );

    for (const c of [...d.categories].sort(
      (a, b) => b.shortage - a.shortage
    )) {
      const status = c.shortage
        ? ` — NEED ${c.shortage}`
        : c.approved > c.target
          ? ' — Above goal'
          : ' — Goal met';

      sel.add(
        new Option(`${c.name}${status}`, c.id)
      );
    }

    sel.value = old;
    tip();

  } catch (e) {
    $('needs').textContent =
      'Unable to load food needs. Please refresh.';

    $('contributions').textContent =
      'Unable to load contributions.';
  }
}

function tip() {
  const c = latest.find(
    x => x.id === $('category').value
  );

  $('categoryTip').textContent = !c
    ? ''
    : c.shortage
      ? `We are looking for ${c.shortage} more contributor(s). ` +
        `Plan your contribution for about ${event.attendees} people.`
      : c.approved > c.target
        ? `${c.approved - c.target} contributor(s) above ` +
          'the minimum. More contributions are welcome!'
        : 'Contributor goal met. More contributions are welcome!';
}

if (applyEvent()) {
  $('category').addEventListener('change', tip);

  $('signup').addEventListener('submit', async e => {
    e.preventDefault();

    const f = e.currentTarget;
    const button = f.querySelector('button[type=submit]');
    const message = $('formMessage');

    button.disabled = true;
    message.textContent = 'Submitting…';
    message.className = '';

    try {
      const payload =
        Object.fromEntries(new FormData(f).entries());

      const email =
        String(payload.email || '').trim().toLowerCase();

      if (
        email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ) {
        throw Error('Enter a valid email address');
      }

      let digits =
        String(payload.phone || '').replace(/\D/g, '');

      if (
        digits.length === 11 &&
        digits.startsWith('1')
      ) {
        digits = digits.slice(1);
      }

      if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(digits)) {
        throw Error('Enter a valid 10-digit U.S. mobile number');
      }

      payload.email = email;
      payload.phone =
        `${digits.slice(0, 3)}-` +
        `${digits.slice(3, 6)}-` +
        `${digits.slice(6)}`;

      const r = await fetch(
        `/api/potluck/signup?eventId=${encodeURIComponent(eventId)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );

      const d = await r.json();

      if (!r.ok) {
        throw Error(d.error || 'Submission failed');
      }

      message.className = 'ok';
      message.textContent =
        'Contribution received! Pending organizer verification.';

      $('category').value = '';
      $('dish').value = '';
      $('notes').value = '';
      $('servings').value = String(event.attendees);

      await load();

    } catch (err) {
      message.className = 'error';
      message.textContent = err.message;

    } finally {
      button.disabled = false;
    }
  });

  load();
}
