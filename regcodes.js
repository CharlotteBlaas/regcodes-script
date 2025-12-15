(function () {
  function log() { try { console.log.apply(console, arguments); } catch (e) {} }
  function warn() { try { console.warn.apply(console, arguments); } catch (e) {} }

  var STATE = {
    builtSig: null,
    observer: null
  };

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  function getValues() {
    var container = document.getElementById('registratie-raw-data');
    if (!container) return null;

    var lis = qsa('li', container);
    if (!lis.length) return [];

    return lis
      .map(function (li) {
        return (li.getAttribute('data-code') || li.textContent || '').trim();
      })
      .filter(function (v) {
        if (!v) return false;
        // filter placeholders
        if (v.indexOf('{User.Registratiecode') === 0) return false;
        return true;
      });
  }

  function findTbody() {
    return qs('#registratie-tabel tbody') || qs('table.hvdz-code-table tbody');
  }

  function makeShareUrl(code) {
    return 'https://mdw-hvdz.hartstichting.nl/nl/?unique_code=' + encodeURIComponent(code);
  }

  function buildMailto(email, shareUrl) {
    var subject = 'Uitnodiging Hartstichting Voordeelplatform';
    var body = [
      'Beste collega,',
      '',
      'Je bent uitgenodigd om gebruik te maken van het Hartstichting Voordeelplatform.',
      '',
      'Gebruik onderstaande persoonlijke link om je te registreren:',
      shareUrl,
      '',
      'Met vriendelijke groet,'
    ].join('\n');

    return (
      'mailto:' + encodeURIComponent(email) +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body)
    );
  }

  function normalizeStatus(status) {
    var s = (status || '').toLowerCase();
    // simpele mapping; pas gerust aan als jullie andere termen gebruiken
    if (s.includes('beschik')) return 'ok';
    if (s.includes('actief')) return 'ok';
    if (s.includes('nieuw')) return 'ok';
    if (s.includes('gebruik')) return 'used';
    if (s.includes('ingel')) return 'used';
    return 'used'; // default: neutraal/used
  }

  function statusLabel(status) {
    return (status || '').trim() || 'Onbekend';
  }

  function signature(values) {
    return values.join('||');
  }

  function buildTable() {
    var values = getValues();
    if (values === null) return false;     // container bestaat nog niet
    if (!values.length) return false;      // nog geen data

    var tbody = findTbody();
    if (!tbody) return false;

    var sig = signature(values);
    if (STATE.builtSig === sig && tbody.querySelectorAll('tr').length) return true;

    tbody.innerHTML = '';

    values.forEach(function (raw) {
      var parts = raw.split(';');
      while (parts.length < 3) parts.push('');

      var code = (parts[0] || '').trim();
      var status = (parts[1] || '').trim();
      var email = (parts[2] || '').trim();
      if (!code) return;

      var shareUrl = makeShareUrl(code);

      var tr = document.createElement('tr');

      // Code
      var tdCode = document.createElement('td');
      var codeSpan = document.createElement('span');
      codeSpan.className = 'hvdz-code';
      codeSpan.textContent = code;
      tdCode.appendChild(codeSpan);
      tr.appendChild(tdCode);

      // Status (badge)
      var tdStatus = document.createElement('td');
      var badge = document.createElement('span');
      var kind = normalizeStatus(status);

      badge.className = 'hs-status ' + (kind === 'ok' ? 'hs-status--ok' : 'hs-status--used');
      badge.innerHTML =
        '<span class="hs-status-dot"></span>' +
        '<span>' + escapeHtml(statusLabel(status)) + '</span>';

      tdStatus.appendChild(badge);
      tr.appendChild(tdStatus);

      // Medewerker
      var tdEmp = document.createElement('td');
      if (email) {
        var emailLink = document.createElement('a');
        emailLink.className = 'hs-email';
        emailLink.href = 'mailto:' + encodeURIComponent(email);
        emailLink.textContent = email;
        tdEmp.appendChild(emailLink);
      } else {
        tdEmp.textContent = '';
      }
      tr.appendChild(tdEmp);

      // Acties (icon buttons)
      var tdAct = document.createElement('td');
      var actions = document.createElement('div');
      actions.className = 'hs-actions';

      // Mail knop (alleen als email bestaat)
      if (email) {
        var mailBtn = document.createElement('a');
        mailBtn.className = 'hs-icon-btn';
        mailBtn.href = buildMailto(email, shareUrl);
        mailBtn.title = 'Mail openen';
        mailBtn.setAttribute('aria-label', 'Mail openen');
        mailBtn.innerHTML = mailIconSvg();
        actions.appendChild(mailBtn);
      }

      // Copy knop (altijd)
      var copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'hs-icon-btn hvdz-copy-btn';
      copyBtn.setAttribute('data-link', shareUrl);
      copyBtn.title = 'Kopieer link';
      copyBtn.setAttribute('aria-label', 'Kopieer link');
      copyBtn.innerHTML = copyIconSvg();
      actions.appendChild(copyBtn);

      tdAct.appendChild(actions);
      tr.appendChild(tdAct);

      tbody.appendChild(tr);
    });

    // Copy handler (1x)
    if (!tbody.dataset.copyHandlerAttached) {
      tbody.addEventListener('click', function (e) {
        var btn = e.target.closest('.hvdz-copy-btn');
        if (!btn) return;

        var link = btn.getAttribute('data-link');
        if (!link) return;

        function done() {
          // korte visuele feedback via title + disable
          btn.disabled = true;
          var old = btn.title;
          btn.title = 'Gekopieerd!';
          setTimeout(function () {
            btn.title = old;
            btn.disabled = false;
          }, 900);
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(link).then(done).catch(done);
        } else {
          var t = document.createElement('textarea');
          t.value = link;
          t.style.position = 'fixed';
          t.style.opacity = '0';
          document.body.appendChild(t);
          t.select();
          try { document.execCommand('copy'); } catch (e2) {}
          document.body.removeChild(t);
          done();
        }
      });
      tbody.dataset.copyHandlerAttached = '1';
    }

    STATE.builtSig = sig;
    log('[RegCodes] ✅ tabel opgebouwd:', tbody.querySelectorAll('tr').length);
    return true;
  }

  // SPA/PJAX support
  function startObserver() {
    if (STATE.observer) return;
    STATE.observer = new MutationObserver(function () {
      buildTable();
    });
    STATE.observer.observe(document.documentElement, { childList: true, subtree: true });
    log('[RegCodes] observer gestart (SPA-proof)');
  }

  function init() {
    startObserver();

    var tries = 0;
    var maxTries = 60;

    (function tick() {
      tries++;
      if (buildTable()) return;
      if (tries < maxTries) setTimeout(tick, 250);
      else warn('[RegCodes] geen data/tabel gevonden binnen retries (observer blijft luisteren)');
    })();
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function copyIconSvg() {
    return (
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<rect x="9" y="9" width="13" height="13" rx="2" stroke-width="2"></rect>' +
      '<rect x="3" y="3" width="13" height="13" rx="2" stroke-width="2"></rect>' +
      '</svg>'
    );
  }

  function mailIconSvg() {
    return (
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<path d="M4 6h16v12H4z" stroke-width="2"></path>' +
      '<path d="M4 6l8 7 8-7" stroke-width="2"></path>' +
      '</svg>'
    );
  }

  init();
})();
