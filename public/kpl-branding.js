// Branding is event-specific; leave VSU unchanged.
(() => {
  const eventId = new URLSearchParams(window.location.search).get('eventId');
  if (eventId === 'kpl-holiday-2026') document.body.classList.add('kpl-event');
  // Admin event selector can change the event without a page reload.
  const selector = document.getElementById('eventSelect');
  if (selector) selector.addEventListener('change', () => {
    document.body.classList.toggle('kpl-event', selector.value === 'kpl-holiday-2026');
  });
})();
