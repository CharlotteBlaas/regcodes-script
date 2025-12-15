(function () {
  function log() { try { console.log.apply(console, arguments); } catch (e) {} }
  function warn() { try { console.warn.apply(console, arguments); } catch (e) {} }

  var STATE = {
    builtForSignature: null,
    observer: null,
    attachTries: 0
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
        if (v.indexOf('{User.Registratiecode') === 0) return false; // placeholders filter
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

  function signature(values) {
    // voorkomt onnodig opnieuw bouwen
    return values.join('||');
  }

  function buildTable() {
    var values = getValues();
    if (values === null) return false;   // raw container bestaat nog niet
    if (!values.length) return false;    // nog geen data (of placeholders)

    var tbody = findTbody();
    if (!tbody) return false;

    var sig = signature(values);
    if (STATE.builtForSignature === sig && tbody.querySelectorAll('tr').length) {
      return true; // al gebouwd voor dezelfde data
    }

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

      // kolom 1
      var td1 = document.createElement('td');
      td1.className = 'hvdz-code-cell';

      var codeSpan = document.createElement('span');
      codeSpan.className = 'hvdz-code';
      codeSpan.textContent = code;

      var copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'hvdz-copy-btn';
      copyBtn.textContent = 'Kopieer link';
      copyBtn.setAttribute('data-link', shareUrl);

      td1.appendChild(codeSpan);
      td1.appendChild(copyBtn);
      tr.appendChild(td1);

      // kolom 2
      var td2 = document.createElement('td');
      td2.className = 'hvdz-status';
      td2.textContent = status || '';
      tr.appendChild(td2);

      // kolom 3 (met spacing)
      var td3 = document.createElement('td');

      if (email) {
        var wrap = document.createElement('div');
        wrap.style.display = 'flex';
        wrap.style.flexWrap = 'wrap';
        wrap.style.gap = '8px';
        wrap.style.alignItems = 'center';

        var emailLink = document.createElement('a');
        emailLink.className = 'hs-email';
        emailLink.href = 'mailto:' + encodeURIComponent(email);
        emailLink.textContent = email;

        var mailBtn = document.createElement('a');
        mailBtn.className = 'hs-mail-btn';
        mailBtn.href = buildMailto(email, shareUrl);
        mailBtn.textContent = 'Mail openen';

        wrap.appendChild(emailLink);
        wrap.appendChild(mailBtn);
        td3.appendChild(wrap);
      }

      tr.appendChild(td3);
      tbody.appendChild(tr);
    });

    // copy handler 1x
    if (!tbody.dataset.copyHandlerAttached) {
      tbody.addEventListener('click', function (e) {
        var btn = e.target.closest('.hvdz-copy-btn');
        if (!btn) return;

        var link = btn.getAttribute('data-link');
        if (!link) return;

        function done() {
          var old = btn.textContent;
          btn.textContent = 'Gekopieerd!';
          btn.disabled = true;
          setTimeout(function () {
            btn.textContent = old;
            btn.disabled = false;
          }, 1200);
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

    STATE.builtForSignature = sig;
    log('[RegCodes] ✅ tabel opgebouwd:', tbody.querySelectorAll('tr').length);
    return true;
  }

  function startObserver() {
    if (STATE.observer) return;

    STATE.observer = new MutationObserver(function () {
      // bij SPA navigatie verschijnen elementen later → opnieuw proberen
      buildTable();
    });

    STATE.observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    log('[RegCodes] observer gestart (SPA-proof)');
  }

  // Init: meteen proberen + retries + observer
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

  init();
})();
