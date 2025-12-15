/* regcodes.js — pure JS (geen <script> tags) */
(function () {
  'use strict';

  try {
    // Mag meerdere keren draaien (bij SPA/history changes)
    var MAX_TRIES = 80;
    var INTERVAL = 250;
    var tries = 0;

    function stripHtml(input) {
      var div = document.createElement('div');
      div.innerHTML = String(input || '');
      return (div.textContent || div.innerText || '').trim();
    }

    function normalize(s) {
      return String(s || '')
        .replace(/\u00A0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    function getRows() {
      var container = document.getElementById('registratie-raw-data');
      if (!container) return null;

      var lis = Array.prototype.slice.call(container.querySelectorAll('li'));
      if (!lis.length) return [];

      return lis
        .map(function (li) {
          // Soms zit er HTML/whitespace in; we normaliseren hard
          return normalize(stripHtml(li.textContent || ''));
        })
        .filter(Boolean)
        // Placeholder(s) wegfilteren als ze niet gevuld zijn
        .filter(function (v) {
          return v.indexOf('{User.Registratiecode') !== 0;
        });
    }

    function makeShareUrl(code) {
      return (
        'https://mdw-hvdz.hartstichting.nl/nl/?unique_code=' +
        encodeURIComponent(code)
      );
    }

    function isUsed(status) {
      return String(status || '').toLowerCase().indexOf('gebruikt') !== -1;
    }

    function attachCopyHandlerOnce(tbody) {
      if (!tbody || tbody.dataset.copyHandlerAttached) return;

      tbody.addEventListener('click', function (e) {
        var btn = e.target && e.target.closest ? e.target.closest('.hs-copy-btn') : null;
        if (!btn || btn.disabled) return;

        var link = btn.getAttribute('data-link');
        if (!link) return;

        function done() {
          var old = btn.textContent;
          btn.textContent = '✅';
          setTimeout(function () {
            btn.textContent = old;
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
          try {
            document.execCommand('copy');
          } catch (e2) {}
          document.body.removeChild(t);
          done();
        }
      });

      tbody.dataset.copyHandlerAttached = '1';
    }

    function build() {
      var tbody = document.querySelector('#registratie-tabel tbody');
      if (!tbody) return false;

      var rows = getRows();
      if (!rows) return false;       // container nog niet aanwezig
      if (!rows.length) return false; // nog geen data (of placeholders)

      // Bouw tabel opnieuw
      tbody.innerHTML = '';

      rows.forEach(function (raw) {
        // Verwacht: "CODE; Status; email" (status/email mogen leeg)
        var parts = raw.split(';').map(function (p) {
          return normalize(p);
        });
        while (parts.length < 3) parts.push('');

        var code = parts[0];
        var status = parts[1] || 'Beschikbaar';
        var email = parts[2] || '';

        if (!code) return;

        var url = makeShareUrl(code);
        var used = isUsed(status);

        var tr = document.createElement('tr');

        // Acties
        var tdA = document.createElement('td');
        tdA.innerHTML =
          '<div class="hs-actions">' +
            '<a class="hs-icon-btn hs-mail-btn" ' +
              (used
                ? ''
                : 'href="mailto:' + encodeURIComponent(email) +
                  '?subject=' + encodeURIComponent('Uitnodiging benefits platform') +
                  '&body=' + encodeURIComponent('Gebruik deze persoonlijke link:\n\n' + url) + '"'
              ) +
              ' title="Mail openen" ' + (used ? 'aria-disabled="true"' : '') + '>' +
              '✉️' +
            '</a>' +
            '<button class="hs-icon-btn hs-copy-btn" type="button" data-link="' + url + '" ' +
              (used ? 'disabled' : '') +
              ' title="Kopieer link">📋</button>' +
          '</div>';

        // Code
        var tdC = document.createElement('td');
        tdC.innerHTML = '<span class="hvdz-code">' + code + '</span>';

        // Status
        var tdS = document.createElement('td');
        tdS.textContent = status;

        // Email/Medewerker
        var tdE = document.createElement('td');
        tdE.textContent = email;

        tr.appendChild(tdA);
        tr.appendChild(tdC);
        tr.appendChild(tdS);
        tr.appendChild(tdE);
        tbody.appendChild(tr);
      });

      attachCopyHandlerOnce(tbody);
      return true;
    }

    function tick() {
      tries++;
      if (build()) return;
      if (tries < MAX_TRIES) setTimeout(tick, INTERVAL);
    }

    tick();
  } catch (err) {
    console.error('[RegCodes] fatal error:', err);
  }
})();
