document.addEventListener("DOMContentLoaded", async () => {
  // 1. Inject navigation
  injectNavigation("prospects");

  // Elements
  const rowsContainer = document.querySelector("#prospectRows");
  const resultCount = document.querySelector("#resultCount");
  
  const searchInput = document.querySelector("#searchInput");
  const statusFilter = document.querySelector("#statusFilter");
  const sourceFilter = document.querySelector("#sourceFilter");
  const channelFilter = document.querySelector("#channelFilter");
  const sortSelect = document.querySelector("#sortSelect");
  
  const detailDialog = document.querySelector("#detailDialog");
  const detailName = document.querySelector("#detailName");
  const detailBody = document.querySelector("#detailBody");
  const closeDetailButton = document.querySelector("#closeDetailButton");

  let prospects = [];

  // Initialize status filter dropdown with options
  function initStatusFilter() {
    statusFilter.innerHTML = [
      `<option value="Semua">Semua Status</option>`,
      ...statusOptions.map((st) => `<option value="${st}">${st}</option>`),
    ].join("");
  }

  // Load and render
  async function loadData() {
    prospects = await syncProspects();
    render();
  }

  function filteredProspects() {
    const query = searchInput.value.trim().toLowerCase();
    const status = statusFilter.value;
    const source = sourceFilter.value;
    const channel = channelFilter.value;

    return prospects
      .filter((p) => {
        const haystack = [p.name, p.instagram, p.whatsapp, p.niche, p.service, p.notes]
          .join(" ")
          .toLowerCase();
        return !query || haystack.includes(query);
      })
      .filter((p) => status === "Semua" || p.status === status)
      .filter((p) => source === "Semua" || p.source === source)
      .filter((p) => channel === "Semua" || p.channel === channel)
      .sort((a, b) => {
        const sorting = sortSelect.value;
        const direction = sorting.endsWith("Asc") ? 1 : -1;
        const field = sorting.startsWith("followUp") ? "followUpDate" : "sentDate";
        
        const aVal = a[field] || "";
        const bVal = b[field] || "";
        
        return aVal.localeCompare(bVal) * direction;
      });
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

  function render() {
    const list = filteredProspects();
    resultCount.textContent = `${list.length} data`;

    if (list.length === 0) {
      rowsContainer.innerHTML = `
        <tr>
          <td class="empty-state" colspan="6">
            Tidak ada data prospek yang cocok dengan penyaringan Anda.
          </td>
        </tr>
      `;
      return;
    }

    rowsContainer.innerHTML = list
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
              <div class="subtext">Sumber: ${escapeHtml(p.source || "Instagram")}</div>
            </td>
            <td>
              <div>Kirim: ${formatDate(p.sentDate)}</div>
              ${p.followUpDate ? `<div class="subtext" style="color:var(--yellow-text); font-weight:500;">FU: ${formatDate(p.followUpDate)}</div>` : ""}
            </td>
            <td>
              <select class="status-select badge ${statusClass(p.status)}" data-action="status" data-id="${p.id}">
                ${statusOptions.map((st) => `<option value="${st}" ${st === p.status ? "selected" : ""}>${st}</option>`).join("")}
              </select>
            </td>
            <td>
              <div class="action-row">
                <a class="mini-button success action-link" href="${waUrl}" target="_blank" rel="noreferrer">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                  Send
                </a>
                <button class="mini-button" type="button" data-action="detail" data-id="${p.id}">Detail</button>
                <button class="mini-button" type="button" data-action="edit" data-id="${p.id}">Edit</button>
                <button class="mini-button" type="button" style="color:var(--red-text);" data-action="delete" data-id="${p.id}">Hapus</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  // Bind filter events
  [searchInput, statusFilter, sourceFilter, channelFilter, sortSelect].forEach((input) => {
    input.addEventListener("input", render);
    input.addEventListener("change", render);
  });

  // Handle table row clicks
  rowsContainer.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;

    const id = btn.dataset.id;
    const action = btn.dataset.action;
    const prospect = prospects.find((p) => p.id === id);
    if (!prospect) return;

    if (action === "detail") {
      renderDetail(prospect);
    } else if (action === "edit") {
      window.location.href = `input.html?edit=${id}`;
    } else if (action === "delete") {
      const confirmDelete = confirm(`Hapus prospek "${prospect.name}"?`);
      if (confirmDelete) {
        await deleteProspect(id);
        await loadData();
      }
    }
  });

  // Handle status update in table
  rowsContainer.addEventListener("change", async (e) => {
    const select = e.target.closest("[data-action='status']");
    if (!select) return;

    const id = select.dataset.id;
    const current = prospects.find(p => p.id === id);
    if (current) {
      current.status = select.value;
      await saveProspect(current);
      // Rerender and reload sync status
      loadData();
    }
  });

  function renderDetail(p) {
    detailName.textContent = p.name;
    detailBody.innerHTML = `
      <div class="detail-grid">
        <div class="detail-item"><span>Niche</span><strong>${escapeHtml(p.niche || "-")}</strong></div>
        <div class="detail-item"><span>Jasa Ditawarkan</span><strong>${escapeHtml(p.service || "-")}</strong></div>
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

  // Init UI
  initStatusFilter();
  await loadData();
});
