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

  function buildTable() {
    var values = getValues();
    if (values === null || !values.length) return false;

    var tableBody = findTbody();
    if (!tableBody) return false;

    tableBody.innerHTML = '';

    values.forEach(function (raw) {
      var parts = raw.split(';');
      while (parts.length < 3) parts.push('');

      var code = parts[0].trim();
      var status = parts[1].trim();
      var email = parts[2].trim();
      if (!code) return;

      var shareUrl =
        'https://mdw-hvdz.hartstichting.nl/nl/?unique_code=' + encodeURIComponent(code);

      var tr = document.createElement('tr');

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

      var tdStatus = document.createElement('td');
      tdStatus.className = 'hvdz-status';
      tdStatus.textContent = status || '';
      tr.appendChild(tdStatus);

      var tdEmail = document.createElement('td');
      if (email) {
        var mail = document.createElement('a');
        mail.href = 'mailto:' + encodeURIComponent(email);
        mail.textContent = email;
        tdEmail.appendChild(mail);
      }
      tr.appendChild(tdEmail);

      tableBody.appendChild(tr);
    });

    if (!tableBody.dataset.copyHandlerAttached) {
      tableBody.addEventListener('click', function (e) {
        var btn = e.target.closest('.hvdz-copy-btn');
        if (!btn) return;

        var link = btn.getAttribute('data-link');
        if (!link) return;

        navigator.clipboard?.writeText(link).catch(function () {});
        btn.textContent = 'Gekopieerd!';
        setTimeout(function () {
          btn.textContent = 'Kopieer link';
        }, 1500);
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
