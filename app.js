const STORAGE_KEY = "ig-wa-outreach-crm.prospects";

const statusOptions = [
  "Belum dikirim",
  "Sudah dikirim",
  "Membalas",
  "Tertarik",
  "Follow up",
  "Closing",
  "Tidak tertarik",
];

const els = {
  form: document.querySelector("#prospectForm"),
  prospectId: document.querySelector("#prospectId"),
  name: document.querySelector("#name"),
  niche: document.querySelector("#niche"),
  service: document.querySelector("#service"),
  source: document.querySelector("#source"),
  instagram: document.querySelector("#instagram"),
  instagramLink: document.querySelector("#instagramLink"),
  whatsapp: document.querySelector("#whatsapp"),
  sentDate: document.querySelector("#sentDate"),
  channel: document.querySelector("#channel"),
  status: document.querySelector("#status"),
  followUpDate: document.querySelector("#followUpDate"),
  notes: document.querySelector("#notes"),
  generatedWaLink: document.querySelector("#generatedWaLink"),
  rows: document.querySelector("#prospectRows"),
  resultCount: document.querySelector("#resultCount"),
  statsGrid: document.querySelector("#statsGrid"),
  nextFollowUp: document.querySelector("#nextFollowUp"),
  searchInput: document.querySelector("#searchInput"),
  statusFilter: document.querySelector("#statusFilter"),
  sourceFilter: document.querySelector("#sourceFilter"),
  channelFilter: document.querySelector("#channelFilter"),
  sortSelect: document.querySelector("#sortSelect"),
  exportButton: document.querySelector("#exportButton"),
  backupButton: document.querySelector("#backupButton"),
  importButton: document.querySelector("#importButton"),
  importFile: document.querySelector("#importFile"),
  seedButton: document.querySelector("#seedButton"),
  formTitle: document.querySelector("#formTitle"),
  cancelEditButton: document.querySelector("#cancelEditButton"),
  detailDialog: document.querySelector("#detailDialog"),
  detailName: document.querySelector("#detailName"),
  detailBody: document.querySelector("#detailBody"),
  closeDetailButton: document.querySelector("#closeDetailButton"),
};

let prospects = readProspects();

function readProspects() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveProspects() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prospects));
}

function makeId() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
}

function normalizeWhatsapp(value) {
  return value.replace(/[^\d]/g, "").replace(/^0/, "62");
}

function targetName(name) {
  return name.trim() || "Klinik";
}

function makeMessage(name) {
  const target = targetName(name);

  return `Halo ${target}, salam kenal ya 👋

Saya Dari Gexxaweb, kebetulan sering bantu klinik-klinik gigi bikin website. Bukan mau jualan langsung sih, tapi saya perhatikan ${target} di Instagram kontennya sudah bagus banget, sayang kalau calon pasien yang cari di Google belum nemu info selengkap itu.

Banyak klinik yang saya bantu bilang, setelah punya website yang pas, mereka jadi lebih tenang karena pasien bisa baca info lengkap sendiri tanpa harus tanya-tanya via WA berulang kali. Booking juga jadi lebih tertib, dan tim admin nggak gampang burnout.

Kalau ${target} mungkin tertarik eksplor opsi ini someday, saya punya paket yang budgetnya cukup bersahabat (mulai 350rb sudah include domain). Tapi tentu nggak buru-buru, mau kenalan dan liat contoh kerjanya dulu juga boleh banget 😊

Boleh saya kirim portofolionya buat referensi? Nggak apa-apa kalau memang belum butuh sekarang. Makasih ya! 🙏`;
}

function makeWaUrl(prospect) {
  const message = encodeURIComponent(makeMessage(prospect.name));
  const number = normalizeWhatsapp(prospect.whatsapp || "");
  return number ? `https://wa.me/${number}?text=${message}` : `https://wa.me/?text=${message}`;
}

function ensureSelectOption(select, value) {
  if (!value || [...select.options].some((option) => option.value === value)) return;

  const option = document.createElement("option");
  option.value = value;
  option.textContent = `${value} (data lama)`;
  select.append(option);
}

function updateGeneratedLink() {
  const prospect = {
    name: els.name.value,
    whatsapp: els.whatsapp.value,
  };
  const hasName = els.name.value.trim();
  const hasNumber = normalizeWhatsapp(els.whatsapp.value);

  els.generatedWaLink.href = makeWaUrl(prospect);
  els.generatedWaLink.textContent = hasNumber
    ? `Send message ke ${targetName(els.name.value)}`
    : hasName
      ? `Preview pesan untuk ${targetName(els.name.value)}`
      : "Isi nama target dulu";
}

function getFormData() {
  return {
    id: els.prospectId.value || makeId(),
    name: els.name.value.trim(),
    niche: els.niche.value.trim(),
    service: els.service.value.trim(),
    source: els.source.value,
    instagram: els.instagram.value.trim(),
    instagramLink: els.instagramLink.value.trim(),
    whatsapp: els.whatsapp.value.trim(),
    sentDate: els.sentDate.value,
    channel: els.channel.value,
    status: els.status.value,
    followUpDate: els.followUpDate.value,
    notes: els.notes.value.trim(),
    updatedAt: new Date().toISOString(),
  };
}

function fillForm(prospect) {
  els.prospectId.value = prospect.id;
  els.name.value = prospect.name || "";
  ensureSelectOption(els.niche, prospect.niche);
  ensureSelectOption(els.service, prospect.service);
  els.niche.value = prospect.niche || "";
  els.service.value = prospect.service || "";
  els.source.value = prospect.source || "Instagram";
  els.instagram.value = prospect.instagram || "";
  els.instagramLink.value = prospect.instagramLink || "";
  els.whatsapp.value = prospect.whatsapp || "";
  els.sentDate.value = prospect.sentDate || "";
  els.channel.value = prospect.channel || "Instagram DM";
  els.status.value = prospect.status || "Belum dikirim";
  els.followUpDate.value = prospect.followUpDate || "";
  els.notes.value = prospect.notes || "";
  els.formTitle.textContent = "Edit prospek";
  els.cancelEditButton.classList.remove("hidden");
  updateGeneratedLink();
  document.querySelector("#form-section").scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetForm() {
  els.form.reset();
  els.prospectId.value = "";
  els.formTitle.textContent = "Tambah prospek";
  els.cancelEditButton.classList.add("hidden");
  updateGeneratedLink();
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function channelClass(value) {
  if (value === "WhatsApp") return "badge-wa";
  if (value === "Keduanya") return "badge-both";
  return "badge-ig";
}

function statusClass(value) {
  const key = value.toLowerCase().split(" ")[0];
  return `status-${key}`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function filteredProspects() {
  const query = els.searchInput.value.trim().toLowerCase();
  const status = els.statusFilter.value;
  const source = els.sourceFilter.value;
  const channel = els.channelFilter.value;

  return prospects
    .filter((prospect) => {
      const haystack = [prospect.name, prospect.instagram, prospect.whatsapp, prospect.niche, prospect.service]
        .join(" ")
        .toLowerCase();
      return !query || haystack.includes(query);
    })
    .filter((prospect) => status === "Semua" || prospect.status === status)
    .filter((prospect) => source === "Semua" || prospect.source === source)
    .filter((prospect) => channel === "Semua" || prospect.channel === channel)
    .sort((a, b) => {
      const direction = els.sortSelect.value.endsWith("Asc") ? 1 : -1;
      const field = els.sortSelect.value.startsWith("followUp") ? "followUpDate" : "sentDate";
      return String(a[field] || "").localeCompare(String(b[field] || "")) * direction;
    });
}

function renderRows() {
  const rows = filteredProspects();
  els.resultCount.textContent = `${rows.length} data`;

  if (!rows.length) {
    els.rows.innerHTML = `<tr><td class="empty-state" colspan="6">Belum ada prospek yang cocok.</td></tr>`;
    return;
  }

  els.rows.innerHTML = rows
    .map((prospect) => {
      const waUrl = makeWaUrl(prospect);
      const contact = [
        prospect.instagram ? escapeHtml(prospect.instagram) : "",
        prospect.whatsapp ? escapeHtml(prospect.whatsapp) : "",
      ]
        .filter(Boolean)
        .join("<br>");

      return `
        <tr>
          <td>
            <div class="prospect-name">${escapeHtml(prospect.name)}</div>
            <div class="subtext">${escapeHtml(prospect.niche || "-")}</div>
          </td>
          <td>
            ${contact || "-"}
            <div class="channel-row">
              <span class="badge ${channelClass(prospect.channel)}">${escapeHtml(prospect.channel)}</span>
            </div>
          </td>
          <td>
            ${escapeHtml(prospect.service || "-")}
            <div class="subtext">${escapeHtml(prospect.source)}</div>
          </td>
          <td>
            <div>Pesan: ${formatDate(prospect.sentDate)}</div>
            <div class="subtext">Follow up: ${formatDate(prospect.followUpDate)}</div>
          </td>
          <td>
            <select class="status-select badge ${statusClass(prospect.status)}" data-action="status" data-id="${prospect.id}">
              ${statusOptions.map((status) => `<option value="${status}" ${status === prospect.status ? "selected" : ""}>${status}</option>`).join("")}
            </select>
          </td>
          <td>
            <div class="action-row">
              <a class="mini-button action-link" href="${waUrl}" target="_blank" rel="noreferrer">Send message</a>
              <button class="mini-button" type="button" data-action="detail" data-id="${prospect.id}">Detail</button>
              <button class="mini-button" type="button" data-action="edit" data-id="${prospect.id}">Edit</button>
              <button class="mini-button" type="button" data-action="delete" data-id="${prospect.id}">Hapus</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderStats() {
  const total = prospects.length;
  const sent = prospects.filter((prospect) => prospect.status !== "Belum dikirim").length;
  const replies = prospects.filter((prospect) => ["Membalas", "Tertarik", "Follow up", "Closing"].includes(prospect.status)).length;
  const closed = prospects.filter((prospect) => prospect.status === "Closing").length;

  els.statsGrid.innerHTML = [
    ["Total prospek", total],
    ["Sudah dikirim", sent],
    ["Ada respons", replies],
    ["Closing", closed],
  ]
    .map(([label, value]) => `<article class="stat-card"><span>${label}</span><strong>${value}</strong></article>`)
    .join("");
}

function renderNextFollowUp() {
  const today = new Date().toISOString().slice(0, 10);
  const next = prospects
    .filter((prospect) => prospect.followUpDate && prospect.followUpDate >= today)
    .sort((a, b) => a.followUpDate.localeCompare(b.followUpDate))[0];

  els.nextFollowUp.textContent = next
    ? `${next.name} pada ${formatDate(next.followUpDate)}`
    : "Belum ada jadwal.";
}

function renderStatusFilter() {
  els.statusFilter.innerHTML = [
    `<option value="Semua">Semua status</option>`,
    ...statusOptions.map((status) => `<option value="${status}">${status}</option>`),
  ].join("");
}

function renderDetail(prospect) {
  els.detailName.textContent = prospect.name;
  els.detailBody.innerHTML = `
    <div class="detail-grid">
      <div class="detail-item"><span>Niche</span><strong>${escapeHtml(prospect.niche || "-")}</strong></div>
      <div class="detail-item"><span>Jasa</span><strong>${escapeHtml(prospect.service || "-")}</strong></div>
      <div class="detail-item"><span>Instagram</span><strong>${escapeHtml(prospect.instagram || "-")}</strong></div>
      <div class="detail-item"><span>WhatsApp</span><strong>${escapeHtml(prospect.whatsapp || "-")}</strong></div>
      <div class="detail-item"><span>Status</span><strong>${escapeHtml(prospect.status)}</strong></div>
      <div class="detail-item"><span>Follow up</span><strong>${formatDate(prospect.followUpDate)}</strong></div>
    </div>
    <div class="detail-item">
      <span>Send message</span>
      <p>${escapeHtml(makeMessage(prospect.name)).replaceAll("\n", "<br>")}</p>
    </div>
    <div class="detail-actions">
      <a class="primary-button action-link" href="${makeWaUrl(prospect)}" target="_blank" rel="noreferrer">Send message</a>
    </div>
  `;
  els.detailDialog.showModal();
}

function render() {
  renderStats();
  renderNextFollowUp();
  renderRows();
}

function exportCsv() {
  const headers = ["Nama", "Niche", "Jasa", "Sumber", "Instagram", "Link Instagram", "WhatsApp", "Tanggal Pesan", "Channel", "Status", "Follow Up", "Catatan"];
  const rows = prospects.map((p) => [
    p.name,
    p.niche,
    p.service,
    p.source,
    p.instagram,
    p.instagramLink,
    p.whatsapp,
    p.sentDate,
    p.channel,
    p.status,
    p.followUpDate,
    p.notes,
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell || "").replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "ig-wa-outreach.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function backupJson() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    storageKey: STORAGE_KEY,
    prospects,
  };

  downloadFile("ig-wa-outreach-backup.json", JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
}

function importJson(file) {
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const payload = JSON.parse(reader.result);
      const importedProspects = Array.isArray(payload) ? payload : payload.prospects;

      if (!Array.isArray(importedProspects)) {
        throw new Error("Format backup tidak valid.");
      }

      const existingById = new Map(prospects.map((prospect) => [prospect.id, prospect]));
      importedProspects.forEach((prospect) => {
        if (!prospect.name) return;
        const id = prospect.id || makeId();
        existingById.set(id, { ...prospect, id });
      });

      prospects = [...existingById.values()];
      saveProspects();
      resetForm();
      render();
    } catch (error) {
      alert(error.message || "Gagal import backup JSON.");
    }
  });
  reader.readAsText(file);
}

els.form.addEventListener("submit", (event) => {
  event.preventDefault();

  const data = getFormData();
  const index = prospects.findIndex((prospect) => prospect.id === data.id);
  if (index >= 0) {
    prospects[index] = data;
  } else {
    prospects.unshift(data);
  }

  saveProspects();
  resetForm();
  render();
});

[els.name, els.whatsapp].forEach((input) => input.addEventListener("input", updateGeneratedLink));

[els.searchInput, els.statusFilter, els.sourceFilter, els.channelFilter, els.sortSelect].forEach((input) => {
  input.addEventListener("input", renderRows);
  input.addEventListener("change", renderRows);
});

els.rows.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const prospect = prospects.find((item) => item.id === button.dataset.id);
  if (!prospect) return;

  if (button.dataset.action === "detail") renderDetail(prospect);
  if (button.dataset.action === "edit") fillForm(prospect);
  if (button.dataset.action === "delete") {
    prospects = prospects.filter((item) => item.id !== prospect.id);
    saveProspects();
    render();
  }
});

els.rows.addEventListener("change", (event) => {
  const select = event.target.closest("[data-action='status']");
  if (!select) return;

  prospects = prospects.map((prospect) =>
    prospect.id === select.dataset.id ? { ...prospect, status: select.value, updatedAt: new Date().toISOString() } : prospect,
  );
  saveProspects();
  render();
});

els.closeDetailButton.addEventListener("click", () => els.detailDialog.close());
els.cancelEditButton.addEventListener("click", resetForm);
els.exportButton.addEventListener("click", exportCsv);
els.backupButton.addEventListener("click", backupJson);
els.importButton.addEventListener("click", () => els.importFile.click());
els.importFile.addEventListener("change", () => {
  const [file] = els.importFile.files;
  if (file) importJson(file);
  els.importFile.value = "";
});
els.seedButton.addEventListener("click", () => {
  const confirmed = confirm("Hapus semua data prospek di browser ini? Backup JSON dulu kalau belum yakin.");
  if (!confirmed) return;

  localStorage.removeItem(STORAGE_KEY);
  prospects = [];
  resetForm();
  render();
});

renderStatusFilter();
updateGeneratedLink();
render();
