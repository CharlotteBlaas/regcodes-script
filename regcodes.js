(function () {
  function log() { try { console.log.apply(console, arguments); } catch (e) {} }
  function warn() { try { console.warn.apply(console, arguments); } catch (e) {} }

  log('[RegCodes] extern script gestart');

  function getValues() {
    var container = document.getElementById('registratie-raw-data');
    if (!container) return null;

    var lis = container.querySelectorAll('li');
    if (!lis.length) return [];

    return Array.from(lis)
      .map(function (li) {
        return (li.getAttribute('data-code') || li.textContent || '').trim();
      })
      .filter(function (v) {
        if (!v) return false;
        if (v.indexOf('{User.Registratiecode') === 0) return false;
        return true;
      });
  }

  function findTbody() {
    return (
      document.querySelector('#registratie-tabel tbody') ||
      document.querySelector('table.hvdz-code-table tbody')
    );
  }

  function buildMailto(email, shareUrl) {
    // Pas deze tekst gerust aan naar jullie tone-of-voice
    var subject = 'Uitnodiging Hartstichting Voordeelplatform';
    var body = [
      'Beste collega,',
      '',
      'Je bent uitgenodigd om gebruik te maken van het Hartstichting voordeelplatform.',
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

  function buildTable() {
    var values = getValues();
    if (values === null || !values.length) return false;

    var tableBody = findTbody();
    if (!tableBody) return false;

    tableBody.innerHTML = '';

    values.forEach(function (raw) {
      var parts = raw.split(';');
      while (parts.length < 3) parts.push('');

      var code = (parts[0] || '').trim();
      var status = (parts[1] || '').trim();
      var email = (parts[2] || '').trim();
      if (!code) return;

      var shareUrl =
        'https://mdw-hvdz.hartstichting.nl/nl/?unique_code=' + encodeURIComponent(code);

      var tr = document.createElement('tr');

      // Kolom 1: code + kopieerknop
      var tdCode = document.createElement('td');
      tdCode.className = 'hvdz-code-cell';

      var codeSpan = document.createElement('span');
      codeSpan.className = 'hvdz-code';
      codeSpan.textContent = code;

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'hvdz-copy-btn';
      btn.textContent = 'Kopieer link';
      btn.setAttribute('data-link', shareUrl);

      tdCode.appendChild(codeSpan);
      tdCode.appendChild(btn);
      tr.appendChild(tdCode);

      // Kolom 2: status
      var tdStatus = document.createElement('td');
      tdStatus.className = 'hvdz-status';
      tdStatus.textContent = status || '';
      tr.appendChild(tdStatus);

      // Kolom 3: e-mail + mailknop
      var tdEmail = document.createElement('td');

      if (email) {
        var wrap = document.createElement('div');
        wrap.className = 'hvdz-actions';

        // E-mail link
        var mailLink = document.createElement('a');
        mailLink.className = 'hvdz-email';
        mailLink.href = 'mailto:' + encodeURIComponent(email);
        mailLink.textContent = email;

        // Mail-knop met voorgeschreven tekst + URL
        var mailBtn = document.createElement('a');
        mailBtn.className = 'hvdz-mail-btn';
        mailBtn.href = buildMailto(email, shareUrl);
        mailBtn.textContent = 'Mail openen';

        wrap.appendChild(mailLink);
        wrap.appendChild(mailBtn);
        tdEmail.appendChild(wrap);
      } else {
        tdEmail.textContent = '';
      }

      tr.appendChild(tdEmail);
      tableBody.appendChild(tr);
    });

    // Copy knop (event delegation) – 1x
    if (!tableBody.dataset.copyHandlerAttached) {
      tableBody.addEventListener('click', function (e) {
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
          }, 1500);
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
      tableBody.dataset.copyHandlerAttached = '1';
    }

    log('[RegCodes] ✅ tabel opgebouwd:', tableBody.querySelectorAll('tr').length);
    return true;
  }

  var tries = 0;
  var maxTries = 40;
  (function tick() {
    tries++;
    if (buildTable()) return;
    if (tries < maxTries) setTimeout(tick, 250);
    else warn('[RegCodes] gestopt na retries');
  })();
})();
