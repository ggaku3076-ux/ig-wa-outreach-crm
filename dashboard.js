document.addEventListener("DOMContentLoaded", async () => {
  // 1. Inject navigation
  injectNavigation("dashboard");

  // Elements
  const statsGrid = document.querySelector("#statsGrid");
  const nextFollowUp = document.querySelector("#nextFollowUp");
  const recentRows = document.querySelector("#recentRows");
  
  const detailDialog = document.querySelector("#detailDialog");
  const detailName = document.querySelector("#detailName");
  const detailBody = document.querySelector("#detailBody");
  const closeDetailButton = document.querySelector("#closeDetailButton");

  let prospects = [];

  // Load and render data
  async function loadData() {
    prospects = await syncProspects();
    render();
  }

  function render() {
    renderStats();
    renderNextFollowUp();
    renderRecentProspects();
  }

  function renderStats() {
    const total = prospects.length;
    const sent = prospects.filter((p) => p.status && p.status !== "Belum dikirim").length;
    const replies = prospects.filter((p) => ["Membalas", "Tertarik", "Follow up", "Closing"].includes(p.status)).length;
    const closed = prospects.filter((p) => p.status === "Closing").length;

    statsGrid.innerHTML = [
      ["Total Prospek", total],
      ["Sudah Dikirim", sent],
      ["Ada Respons", replies],
      ["Closing", closed],
    ]
      .map(([label, value]) => `
        <article class="stat-card">
          <span>${label}</span>
          <strong>${value}</strong>
        </article>
      `)
      .join("");
  }

  function renderNextFollowUp() {
    const today = new Date().toISOString().slice(0, 10);
    const futureFollowUps = prospects
      .filter((p) => p.followUpDate && p.followUpDate >= today)
      .sort((a, b) => a.followUpDate.localeCompare(b.followUpDate));

    if (futureFollowUps.length > 0) {
      const next = futureFollowUps[0];
      nextFollowUp.innerHTML = `
        <strong style="color: var(--yellow-text);">${escapeHtml(next.name)}</strong><br>
        <span style="font-size:12px; color: var(--muted);">${formatDate(next.followUpDate)}</span>
      `;
    } else {
      nextFollowUp.textContent = "Belum ada jadwal terdekat.";
    }
  }

  function channelClass(value) {
    if (value === "WhatsApp") return "badge-wa";
    if (value === "Keduanya") return "badge-both";
    return "badge-ig";
  }

  function statusClass(value) {
    if (!value) return "status-belum";
    const key = value.toLowerCase().split(" ")[0];
    return `status-${key}`;
  }

  function renderRecentProspects() {
    // Sort by updatedAt desc or sentDate desc, get top 5
    const recent = [...prospects]
      .sort((a, b) => new Date(b.updatedAt || b.sentDate || 0) - new Date(a.updatedAt || a.sentDate || 0))
      .slice(0, 5);

    if (recent.length === 0) {
      recentRows.innerHTML = `<tr><td class="empty-state" colspan="6">Belum ada prospek. Klik 'Tambah Prospek' untuk menginput data.</td></tr>`;
      return;
    }

    recentRows.innerHTML = recent
      .map((p) => {
        const waUrl = makeWaUrl(p);
        const contact = [
          p.instagram ? `<a href="${p.instagramLink || '#'}" target="_blank" style="color:var(--purple-text); text-decoration:none;">${escapeHtml(p.instagram)}</a>` : "",
          p.whatsapp ? `<span style="color:var(--green-text);">${escapeHtml(p.whatsapp)}</span>` : "",
        ]
          .filter(Boolean)
          .join("<br>");

        return `
          <tr>
            <td>
              <div class="prospect-name">${escapeHtml(p.name)}</div>
              <div class="subtext">${escapeHtml(p.niche || "-")}</div>
            </td>
            <td>
              ${contact || "-"}
              <div class="channel-row">
                <span class="badge ${channelClass(p.channel)}">${escapeHtml(p.channel || "Instagram DM")}</span>
              </div>
            </td>
            <td>
              ${escapeHtml(p.service || "-")}
              <div class="subtext">Source: ${escapeHtml(p.source || "Instagram")}</div>
            </td>
            <td>
              <div>${formatDate(p.sentDate)}</div>
              ${p.followUpDate ? `<div class="subtext" style="color:var(--yellow-text);">FU: ${formatDate(p.followUpDate)}</div>` : ""}
            </td>
            <td>
              <select class="status-select badge ${statusClass(p.status)}" data-action="status" data-id="${p.id}">
                ${statusOptions.map((status) => `<option value="${status}" ${status === p.status ? "selected" : ""}>${status}</option>`).join("")}
              </select>
            </td>
            <td>
              <div class="action-row">
                <a class="mini-button success action-link" href="${waUrl}" target="_blank" rel="noreferrer">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                  Send
                </a>
                <button class="mini-button" type="button" data-action="detail" data-id="${p.id}">Detail</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  // Row interactions (Status change & Detail)
  recentRows.addEventListener("change", async (e) => {
    const select = e.target.closest("[data-action='status']");
    if (!select) return;

    const id = select.dataset.id;
    const current = prospects.find(p => p.id === id);
    if (current) {
      current.status = select.value;
      await saveProspect(current);
      loadData(); // Rerender and recalculate
    }
  });

  recentRows.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action='detail']");
    if (!btn) return;

    const id = btn.dataset.id;
    const prospect = prospects.find(p => p.id === id);
    if (prospect) {
      renderDetail(prospect);
    }
  });

  function renderDetail(p) {
    detailName.textContent = p.name;
    detailBody.innerHTML = `
      <div class="detail-grid">
        <div class="detail-item"><span>Niche</span><strong>${escapeHtml(p.niche || "-")}</strong></div>
        <div class="detail-item"><span>Jasa yang Ditawarkan</span><strong>${escapeHtml(p.service || "-")}</strong></div>
        <div class="detail-item"><span>Instagram</span><strong>${p.instagram ? `<a href="${p.instagramLink || '#'}" target="_blank" style="color:var(--purple-text);">${escapeHtml(p.instagram)}</a>` : "-"}</strong></div>
        <div class="detail-item"><span>WhatsApp</span><strong>${p.whatsapp ? `<a href="https://wa.me/${normalizeWhatsapp(p.whatsapp)}" target="_blank" style="color:var(--green-text);">${escapeHtml(p.whatsapp)}</a>` : "-"}</strong></div>
        <div class="detail-item"><span>Status</span><strong>${escapeHtml(p.status || "Belum dikirim")}</strong></div>
        <div class="detail-item"><span>Jadwal Follow Up</span><strong>${formatDate(p.followUpDate)}</strong></div>
        <div class="detail-item"><span>Channel Outreach</span><strong>${escapeHtml(p.channel || "-")}</strong></div>
        <div class="detail-item"><span>Sumber Kontak</span><strong>${escapeHtml(p.source || "-")}</strong></div>
      </div>
      <div class="detail-item">
        <span>Catatan Khusus</span>
        <p style="font-family:inherit; background:rgba(0,0,0,0.15); padding:10px; border-radius:6px; white-space:pre-wrap; color:var(--text-soft); font-size:13px;">${escapeHtml(p.notes || "Tidak ada catatan.")}</p>
      </div>
      <div class="detail-item">
        <span>Pesan Outreach (Salin ke clipboard jika lewat IG)</span>
        <p>${escapeHtml(makeMessage(p))}</p>
      </div>
    `;
    detailDialog.showModal();
  }

  closeDetailButton.addEventListener("click", () => {
    detailDialog.close();
  });

  // Initial fetch
  await loadData();
});
