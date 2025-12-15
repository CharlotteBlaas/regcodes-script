<script>
(function () {
  if (window.__regcodesInitialized) return;
  window.__regcodesInitialized = true;

  const MAX_TRIES = 40;
  const INTERVAL = 300;
  let tries = 0;

  function hasValidData(container) {
    if (!container) return false;
    const items = container.querySelectorAll("li");
    return Array.from(items).some(li => {
      const t = (li.textContent || "").trim();
      return t && !t.includes("{User.");
    });
  }

  function buildTable() {
    const container = document.getElementById("registratie-raw-data");
    const tableBody = document.querySelector("#registratie-tabel tbody");

    if (!container || !tableBody) return false;
    if (!hasValidData(container)) return false;

    tableBody.innerHTML = "";

    const rows = Array.from(container.querySelectorAll("li"))
      .map(li => (li.textContent || "").trim())
      .filter(Boolean)
      .filter(v => !v.includes("{User."));

    if (!rows.length) return false;

    rows.forEach(raw => {
      const [code, status = "", email = ""] = raw.split(";").map(s => s.trim());
      if (!code) return;

      const shareUrl =
        "https://mdw-hvdz.hartstichting.nl/nl/?unique_code=" +
        encodeURIComponent(code);

      const tr = document.createElement("tr");

      // acties
      const tdActions = document.createElement("td");
      tdActions.className = "hs-actions";

      const copyBtn = document.createElement("button");
      copyBtn.className = "hs-icon-btn";
      copyBtn.type = "button";
      copyBtn.innerHTML = "📋";
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(shareUrl);
      };

      const mailBtn = document.createElement("a");
      mailBtn.className = "hs-icon-btn";
      mailBtn.innerHTML = "✉️";
      mailBtn.href =
        "mailto:" +
        encodeURIComponent(email || "") +
        "?subject=" +
        encodeURIComponent("Uitnodiging benefits platform") +
        "&body=" +
        encodeURIComponent(
          "Gebruik deze persoonlijke link:\n\n" + shareUrl
        );

      if (status.toLowerCase().includes("gebruikt")) {
        copyBtn.disabled = true;
        mailBtn.classList.add("is-disabled");
        mailBtn.removeAttribute("href");
      }

      tdActions.appendChild(copyBtn);
      tdActions.appendChild(mailBtn);

      // code
      const tdCode = document.createElement("td");
      tdCode.innerHTML = `<span class="hvdz-code">${code}</span>`;

      // status
      const tdStatus = document.createElement("td");
      tdStatus.textContent = status;

      // email
      const tdEmail = document.createElement("td");
      tdEmail.textContent = email;

      tr.appendChild(tdActions);
      tr.appendChild(tdCode);
      tr.appendChild(tdStatus);
      tr.appendChild(tdEmail);

      tableBody.appendChild(tr);
    });

    return true;
  }

  function tryBuild() {
    tries++;
    if (buildTable()) return;
    if (tries < MAX_TRIES) {
      setTimeout(tryBuild, INTERVAL);
    }
  }

  // 1️⃣ Direct proberen
  tryBuild();

  // 2️⃣ Luisteren naar DOM changes (SPA fix)
  const observer = new MutationObserver(() => {
    if (buildTable()) observer.disconnect();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
</script>
