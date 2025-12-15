(function () {
  var STATE = { builtSig: null, observer: null };

  function qs(s, r){ return (r||document).querySelector(s); }
  function qsa(s, r){ return Array.from((r||document).querySelectorAll(s)); }

  function stripHtml(input){
    var s = String(input || '');
    // decode entities + strip tags via DOM
    var div = document.createElement('div');
    div.innerHTML = s;
    return (div.textContent || div.innerText || '').trim();
  }

  function cleanRaw(raw){
    // 1) strip html tags/entities
    var s = stripHtml(raw);

    // 2) extra cleanup: sommige systemen laten rare whitespace/nbsp achter
    s = s.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();

    return s;
  }

  function getValues(){
    var c = document.getElementById('registratie-raw-data');
    if (!c) return null;

    return qsa('li', c)
      .map(function(li){
        // pak data-code of textContent fallback
        var v = (li.getAttribute('data-code') || li.textContent || '').trim();
        v = cleanRaw(v);
        return v;
      })
      .filter(function(v){
        if (!v) return false;
        // filter placeholders
        if (v.indexOf('{User.Registratiecode') === 0) return false;
        return true;
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

    return 'mailto:' + encodeURIComponent(email) +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);
  }

  function signature(v){ return v.join('||'); }

  function buildTable(){
    var values = getValues();
    if (!values || !values.length) return false;

    var tbody = qs('#registratie-tabel tbody');
    if (!tbody) return false;

    var sig = signature(values);
    if (STATE.builtSig === sig && tbody.children.length) return true;

    tbody.innerHTML = '';

    values.forEach(function(raw){
      // raw verwacht: CODE;STATUS;EMAIL
      // maar raw kan nog ';' bevatten in vreemde vormen → eerst cleanen is al gedaan
      var parts = raw.split(';').map(function(p){ return p.trim(); });
      while (parts.length < 3) parts.push('');

      var code = parts[0] || '';
      var status = parts[1] || 'Beschikbaar';
      var email = parts[2] || '';

      // extra: als code nog steeds tag-achtig is, nogmaals strippen
      code = cleanRaw(code);
      status = cleanRaw(status);
      email = cleanRaw(email);

      if (!code) return;

      var url = makeShareUrl(code);

      var tr = document.createElement('tr');

      /* ACTIES (kolom 1) */
      var tdA = document.createElement('td');
      var actions = document.createElement('div');
      actions.className = 'hs-actions';

      // Mail icoon (altijd zichtbaar)
      var mailBtn = document.createElement('a');
      mailBtn.className = 'hs-icon-btn';
      mailBtn.innerHTML = mailIcon();

      if (email) {
        mailBtn.href = buildMailto(email, url);
        mailBtn.title = 'Mail openen';
      } else {
        mailBtn.classList.add('is-disabled');
        mailBtn.title = 'Geen e-mailadres bekend';
      }

      // Copy icoon (altijd actief)
      var copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'hs-icon-btn hvdz-copy-btn';
      copyBtn.setAttribute('data-link', url);
      copyBtn.title = 'Kopieer link';
      copyBtn.innerHTML = copyIcon();

      actions.appendChild(mailBtn);
      actions.appendChild(copyBtn);
      tdA.appendChild(actions);
      tr.appendChild(tdA);

      /* CODE */
      var tdC = document.createElement('td');
      var codeSpan = document.createElement('span');
      codeSpan.className = 'hvdz-code';
      codeSpan.textContent = code;
      tdC.appendChild(codeSpan);
      tr.appendChild(tdC);

      /* STATUS */
      var tdS = document.createElement('td');
      tdS.textContent = status;
      tr.appendChild(tdS);

      /* EMAIL */
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

    /* copy handler */
    if (!tbody.dataset.copyHandler) {
      tbody.addEventListener('click', function(e){
        var btn = e.target.closest('.hvdz-copy-btn');
        if (!btn) return;

        var link = btn.getAttribute('data-link');
        if (!link) return;

        function done(){
          btn.disabled = true;
          var old = btn.title;
          btn.title = 'Gekopieerd!';
          setTimeout(function(){
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
      tbody.dataset.copyHandler = '1';
    }

    STATE.builtSig = sig;
    return true;
  }

  function startObserver(){
    if (STATE.observer) return;
    STATE.observer = new MutationObserver(buildTable);
    STATE.observer.observe(document.documentElement, { childList:true, subtree:true });
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

  startObserver();
  setTimeout(buildTable, 50);
})();
