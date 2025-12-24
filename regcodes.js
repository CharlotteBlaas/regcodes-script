(function () {
  'use strict';

  if (window.__REGCODES_BOOTSTRAPPED) return;
  window.__REGCODES_BOOTSTRAPPED = true;

  var INTERVAL = 250;
  var MAX_TRIES = 240; // 240 * 250ms = 60s (ruim genoeg voor late user-data)
  var tries = 0;

  var lastSig = null;
  var ulObserver = null;
  var historyHooked = false;

  // Placeholder uit jullie omgeving:
  var COMPANY_NAME = '{User.CompanyName}';

  function stripHtml(input){
    var div = document.createElement('div');
    div.innerHTML = String(input || '');
    return (div.textContent || div.innerText || '').trim();
  }
  function cleanRaw(raw){
    return stripHtml(raw).replace(/\u00A0/g,' ').replace(/\s+/g,' ').trim();
  }

  function isPlaceholder(v){
    return String(v || '').indexOf('{User.Registratiecode') === 0;
  }

  function getContainer(){
    return document.getElementById('registratie-raw-data');
  }

  function getRows(){
    var container = getContainer();
    if (!container) return null;

    var lis = Array.from(container.querySelectorAll('li'));
    if (!lis.length) return [];

    return lis
      .map(function(li){ return cleanRaw(li.getAttribute('data-code') || li.textContent || ''); })
      .filter(Boolean)
      .filter(function(v){ return !isPlaceholder(v); });
  }

  function makeShareUrl(code){
    return 'https://mdw-hvdz.hartstichting.nl/nl/?unique_code=' + encodeURIComponent(code);
  }

  function buildMailto(email, url, code){
    var subject = 'Een extra voordeel voor jou: toegang tot de Hart voor de Zaak-voordeelshop';

    // “Unique code wel meegeven maar niet zichtbaar”: we tonen een klikbare tekst, niet de URL zelf.
    // In de href zit de unieke link wél.
    var linkText = 'Klik hier om je te registreren';
    var htmlLink = '<a href="' + url + '">' + linkText + '</a>';

    // Bedrijfsnaam: als placeholder niet gevuld is, houden we het neutraal.
    var company = cleanRaw(COMPANY_NAME);
    var hasCompany = company && company.indexOf('{User.CompanyName') !== 0;

    var body = [
      'Beste collega,',
      '',
      'Wij doen als organisatie mee aan Hart voor de Zaak, het zakelijke partnerprogramma van de Hartstichting. Daarmee dragen we bij aan een hartgezonde samenleving – en daar profiteer jij als medewerker ook van.',
      '',
      'Als medewerker krijg je toegang tot de Hart voor de Zaak-voordeelshop. In deze shop vind je mooie deals op allerlei producten en uitjes, speciaal voor medewerkers van Hart voor de Zaak-partners. Daarnaast krijg je toegang tot digitale tools uit het Hartstichting Vitaliteitspakket. Deze tools helpen je om je hart beter te leren kennen en ondersteunen je om goed voor je hart te zorgen, op een manier die bij jou past.',
      '',
      'Via onderstaande link kun je je eenvoudig registreren. Je hebt daarvoor alleen de code nodig die hieronder staat.',
      '',
      // Klikbare tekst (url zit in href)
      htmlLink,
      '',
      'Code: ' + code,
      '',
      'Na registratie kun je direct ontdekken welke voordelen en tools voor jou beschikbaar zijn.',
      '',
      'We nodigen je van harte uit om hier gebruik van te maken. Zo investeren we samen, met de Hartstichting, in gezondheid – ook op de werkvloer.',
      '',
      'Met vriendelijke groet,',
      hasCompany ? company : '[Naam werkgever / organisatie]'
    ].join('\n');

    return 'mailto:' + encodeURIComponent(email || '') +
      '?subject=' + encodeURIComponent(subject) +
      // Let op: mail clients ondersteunen HTML in body niet altijd. Veel Outlook varianten tonen dit wél als HTML-achtige tekst.
      // Toch is dit de beste manier om de link “niet zichtbaar” te maken maar wel klikbaar in clients die het ondersteunen.
      '&body=' + encodeURIComponent(body);
  }

  function isUsed(status){
    return String(status || '').toLowerCase().indexOf('gebruikt') !== -1;
  }

  function signature(rows){ return rows.join('||'); }

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
        var old = btn.title || '';
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
        try { document.execCommand('copy'); } catch(e2) {}
        document.body.removeChild(t);
        done();
      }
    });

    tbody.dataset.copyHandlerAttached = '1';
  }

  function buildTableIfReady(){
    var tbody = document.querySelector('#registratie-tabel tbody');
    if (!tbody) return false;

    var rows = getRows();
    if (rows === null) return false;      // container nog niet aanwezig
    if (!rows.length) return false;       // data nog niet gevuld (placeholders)

    var sig = signature(rows);
    if (sig === lastSig && tbody.children.length) return true;

    tbody.innerHTML = '';

    rows.forEach(function(raw){
      var parts = raw.split(';').map(function(p){ return cleanRaw(p || ''); });
      while (parts.length < 3) parts.push('');

      var code = cleanRaw(parts[0]);
      var status = cleanRaw(parts[1] || 'Beschikbaar');
      var email = cleanRaw(parts[2] || '');

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
        mailBtn.href = buildMailto(email, url, code);
        mailBtn.title = 'Mail openen';
      }

      actions.appendChild(mailBtn);
      actions.appendChild(copyBtn);
      tdA.appendChild(actions);
      tr.appendChild(tdA);

      // Code
      var tdC = document.createElement('td');
      var codeSpan = document.createElement('span');
      codeSpan.className = 'hvdz-code';
      codeSpan.textContent = code;
      tdC.appendChild(codeSpan);
      tr.appendChild(tdC);

      // Status
      var tdS = document.createElement('td');
      tdS.textContent = status;
      tr.appendChild(tdS);

      // Medewerker (email-link)
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
    if (buildTableIfReady()) return;
    if (tries < MAX_TRIES) setTimeout(tick, INTERVAL);
  }

  // Observeer specifiek de UL zodat we rebuilden zodra user-data erin “plopt”
  function startUlObserver(){
    if (ulObserver) return;

    var container = getContainer();
    if (!container) return;

    ulObserver = new MutationObserver(function(){
      // reset tries zodat we weer even actief proberen
      tries = 0;
      buildTableIfReady();
      setTimeout(tick, 50);
    });

    ulObserver.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true
    });
  }

  function hookHistory(){
    if (historyHooked) return;
    historyHooked = true;

    function fire(){
      tries = 0;
      // Bij SPA route change kan UL later komen → observer opnieuw proberen te starten
      setTimeout(function(){
        startUlObserver();
        tick();
      }, 50);
    }

    var push = history.pushState;
    history.pushState = function(){
      var r = push.apply(this, arguments);
      fire();
      return r;
    };

    var replace = history.replaceState;
    history.replaceState = function(){
      var r = replace.apply(this, arguments);
      fire();
      return r;
    };

    window.addEventListener('popstate', fire);
    window.addEventListener('pageshow', fire);
    window.addEventListener('focus', fire);
  }

  // Start
  hookHistory();

  // probeer observer te starten zodra UL er is (en blijf proberen totdat hij er is)
  (function waitForUl(){
    if (startUlObserver(), getContainer()) return;
    setTimeout(waitForUl, 200);
  })();

  tick();

})();
