(function () {
  'use strict';

  // voorkomt dubbele initialisatie
  if (window.__REGCODES_BOOTSTRAPPED) return;
  window.__REGCODES_BOOTSTRAPPED = true;

  var MAX_TRIES = 60;
  var INTERVAL = 250;
  var tries = 0;
  var observer = null;
  var lastSig = null;

  function stripHtml(input){
    var div = document.createElement('div');
    div.innerHTML = String(input || '');
    return (div.textContent || div.innerText || '').trim();
  }

  function cleanRaw(raw){
    return stripHtml(raw)
      .replace(/\u00A0/g,' ')
      .replace(/\s+/g,' ')
      .trim();
  }

  function getRows(){
    var container = document.getElementById('registratie-raw-data');
    if (!container) return null;

    var lis = Array.from(container.querySelectorAll('li'));
    if (!lis.length) return [];

    return lis
      .map(function(li){
        return cleanRaw(li.getAttribute('data-code') || li.textContent || '');
      })
      .filter(Boolean)
      .filter(function(v){
        return v.indexOf('{User.Registratiecode') !== 0;
      });
  }

  function makeShareUrl(code){
    return 'https://mdw-hvdz.hartstichting.nl/nl/?unique_code=' + encodeURIComponent(code);
  }

  function buildMailto(email, url){
    var subject = 'Uitnodiging Hartstichting Voordeelplatform';
    var body = [
      'Beste collega,',
      '',
      'Je bent uitgenodigd voor het Hartstichting Voordeelplatform.',
      '',
      'Gebruik onderstaande persoonlijke link:',
      url,
      '',
      'Met vriendelijke groet,'
    ].join('\n');

    return 'mailto:' + encodeURIComponent(email || '') +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);
  }

  function isUsed(status){
    return String(status || '').toLowerCase().indexOf('gebruikt') !== -1;
  }

  function signature(rows){
    return rows.join('||');
  }

  function copyIcon(){
    return (
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
        '<rect x="9" y="9" width="13" height="13" rx="2" stroke-width="2"></rect>' +
        '<rect x="3" y="3" width="13" height="13" rx="2" stroke-width="2"></rect>' +
      '</svg>'
    );
  }

  function mailIcon(){
    return (
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
        '<path d="M4 6h16v12H4z" stroke-width="2"></path>' +
        '<path d="M4 6l8 7 8-7" stroke-width="2"></path>' +
      '</svg>'
    );
  }

  function ensureCopyHandler(tbody){
    if (tbody.dataset.copyHandlerAttached) return;

    tbody.addEventListener('click', function(e){
      var btn = e.target.closest('.hvdz-copy-btn');
      if (!btn || btn.disabled) return;

      var link = btn.getAttribute('data-link');
      if (!link) return;

      function done(){
        var old = btn.title;
        btn.title = 'Gekopieerd!';
        setTimeout(function(){ btn.title = old; }, 900);
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
        try { document.execCommand('copy'); } catch(e){}
        document.body.removeChild(t);
        done();
      }
    });

    tbody.dataset.copyHandlerAttached = '1';
  }

  function buildTable(){
    var tbody = document.querySelector('#registratie-tabel tbody');
    if (!tbody) return false;

    var rows = getRows();
    if (!rows || !rows.length) return false;

    var sig = signature(rows);
    if (sig === lastSig && tbody.children.length) return true;

    tbody.innerHTML = '';

    rows.forEach(function(raw){
      var parts = raw.split(';').map(cleanRaw);
      while (parts.length < 3) parts.push('');

      var code = parts[0];
      var status = parts[1] || 'Beschikbaar';
      var email = parts[2] || '';

      if (!code) return;

      var used = isUsed(status);
      var url = makeShareUrl(code);

      var tr = document.createElement('tr');

      // Acties
      var tdA = document.createElement('td');
      var actions = document.createElement('div');
      actions.className = 'hs-actions';

      var mailBtn = document.createElement('a');
      mailBtn.className = 'hs-icon-btn';
      mailBtn.innerHTML = mailIcon();

      var copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'hs-icon-btn hvdz-copy-btn';
      copyBtn.setAttribute('data-link', url);
      copyBtn.title = 'Kopieer link';
      copyBtn.innerHTML = copyIcon();

      if (used) {
        mailBtn.classList.add('is-disabled');
        mailBtn.title = 'Code is gebruikt';
        copyBtn.disabled = true;
        copyBtn.classList.add('is-disabled');
      } else {
        mailBtn.href = buildMailto(email, url);
        mailBtn.title = 'Mail openen';
      }

      actions.appendChild(mailBtn);
      actions.appendChild(copyBtn);
      tdA.appendChild(actions);
      tr.appendChild(tdA);

      // Code
      var tdC = document.createElement('td');
      var span = document.createElement('span');
      span.className = 'hvdz-code';
      span.textContent = code;
      tdC.appendChild(span);
      tr.appendChild(tdC);

      // Status
      var tdS = document.createElement('td');
      tdS.textContent = status;
      tr.appendChild(tdS);

      // Medewerker
      var tdE = document.createElement('td');
      if (email) {
        var a = document.createElement('a');
        a.href = 'mailto:' + encodeURIComponent(email);
        a.className = 'hs-email';
        a.textContent = email;
        tdE.appendChild(a);
      }
      tr.appendChild(tdE);

      tbody.appendChild(tr);
    });

    ensureCopyHandler(tbody);
    lastSig = sig;
    return true;
  }

  function tick(){
    tries++;
    if (buildTable()) return;
    if (tries < MAX_TRIES) setTimeout(tick, INTERVAL);
  }

  function startObserver(){
    if (observer) return;
    observer = new MutationObserver(buildTable);
    observer.observe(document.documentElement, { childList:true, subtree:true });
  }

  function hookHistory(){
    if (window.__REGCODES_HISTORY_HOOKED) return;
    window.__REGCODES_HISTORY_HOOKED = true;

    function fire(){
      tries = 0;
      setTimeout(tick, 50);
    }

    ['pushState','replaceState'].forEach(function(fn){
      var orig = history[fn];
      history[fn] = function(){
        var r = orig.apply(this, arguments);
        fire();
        return r;
      };
    });

    window.addEventListener('popstate', fire);
    window.addEventListener('pageshow', fire);
    window.addEventListener('focus', fire);
  }

  startObserver();
  hookHistory();
  tick();
})();
