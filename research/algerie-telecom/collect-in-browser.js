// Paste into DevTools Console on the official agency locator.
// Observes normal successful searches; never reads or exports cookies/tokens.
(() => {
  if (location.origin !== 'https://www.algerietelecom.dz' || !window.jQuery || !document.querySelector('#formdemande #wilaya')) {
    throw new Error('Open the official Algérie Télécom agency locator first.');
  }
  const $ = window.jQuery;
  const key = 'geoalgeria-at-wilaya-responses-v1';
  const endpoint = '/ar/trouver_mon-agence-search';
  const select = document.querySelector('#wilaya');
  const codes = [...select.options].map(o => Number(o.value)).filter(n => Number.isInteger(n) && n >= 1 && n <= 58);
  if (new Set(codes).size !== 58) throw new Error('Expected all 58 source wilayas; inspect the source before continuing.');
  const captures = JSON.parse(localStorage.getItem(key) || '{}');
  let pending = null;
  const download = () => {
    const envelopes = codes.filter(code => captures[code]).map(code => captures[code]);
    const blob = new Blob([JSON.stringify(envelopes, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'algerie-telecom-wilayas.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const next = () => {
    const code = codes.find(code => !captures[code]);
    console.log(`Algérie Télécom: ${codes.filter(code => captures[code]).length}/58 wilayas captured.`);
    if (code === undefined) { console.log('Complete. Downloading the national response file.'); download(); return; }
    select.value = String(code);
    select.dispatchEvent(new Event('change', {bubbles: true}));
    if (window.grecaptcha) window.grecaptcha.reset();
    console.log(`Next: ${select.selectedOptions[0].text}. Leave commune unselected, complete CAPTCHA, then click Search.`);
  };
  $(document).off('.geoalgeriaAT');
  $(document).on('ajaxSend.geoalgeriaAT', (_event, xhr, settings) => {
    if (new URL(settings.url, location.href).pathname !== endpoint) return;
    // Snapshot only the non-sensitive scope at submission time.
    pending = {xhr, code: Number(select.value)};
  });
  $(document).on('ajaxSuccess.geoalgeriaAT', (_event, xhr, settings) => {
    if (new URL(settings.url, location.href).pathname !== endpoint || pending?.xhr !== xhr) return;
    const code = pending.code;
    pending = null;
    const response = xhr.responseJSON;
    if (response?.resultat !== 'ok' || !Array.isArray(response.content) || response.commune !== '' ||
        response.content.some(row => Number(row.code_wilaya) !== code)) {
      console.warn('Not saved: need a successful wilaya-wide response. Leave commune unselected and retry.');
      return;
    }
    captures[code] = {retrieved_at: new Date().toISOString().slice(0, 10), source_wilaya: code, source_commune: '', response};
    localStorage.setItem(key, JSON.stringify(captures));
    // Run after the site's own complete callback restores the controls.
    setTimeout(next, 0);
  });
  $(document).on('ajaxError.geoalgeriaAT', (_event, xhr, settings) => {
    if (new URL(settings.url, location.href).pathname !== endpoint) return;
    if (pending?.xhr === xhr) pending = null;
    console.warn('Search failed; current wilaya remains pending. Retry through the page.');
  });
  window.atAgencyCollection = {
    download,
    next,
    status: () => ({completed: codes.filter(code => captures[code]), pending: codes.filter(code => !captures[code])}),
    stop: () => $(document).off('.geoalgeriaAT'),
  };
  next();
})();
