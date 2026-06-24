document.addEventListener("DOMContentLoaded", async () => {
  // 1. Inject navigation
  injectNavigation("input");

  // Elements
  const form = document.querySelector("#prospectForm");
  const formTitle = document.querySelector("#formTitle");
  const saveButton = document.querySelector("#saveButton");
  const cancelButton = document.querySelector("#cancelButton");
  
  const prospectIdEl = document.querySelector("#prospectId");
  const nameEl = document.querySelector("#name");
  const nicheEl = document.querySelector("#niche");
  const serviceEl = document.querySelector("#service");
  const sourceEl = document.querySelector("#source");
  const instagramEl = document.querySelector("#instagram");
  const instagramLinkEl = document.querySelector("#instagramLink");
  const whatsappEl = document.querySelector("#whatsapp");
  const sentDateEl = document.querySelector("#sentDate");
  const followUpDateEl = document.querySelector("#followUpDate");
  const channelEl = document.querySelector("#channel");
  const statusEl = document.querySelector("#status");
  const notesEl = document.querySelector("#notes");
  
  const generatedWaLink = document.querySelector("#generatedWaLink");
  const waLinkText = document.querySelector("#waLinkText");

  let prospects = [];
  let editingId = null;

  // Retrieve URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const editParam = urlParams.get("edit");

  // Check if editing
  async function init() {
    prospects = await syncProspects();
    
    // Auto fill sent date with today for new entries
    if (!editParam) {
      sentDateEl.value = new Date().toISOString().slice(0, 10);
    }

    if (editParam) {
      const prospect = prospects.find(p => p.id === editParam);
      if (prospect) {
        editingId = editParam;
        formTitle.textContent = `Edit Prospek: ${prospect.name}`;
        saveButton.textContent = "Simpan Perubahan";
        
        // Fill form fields
        prospectIdEl.value = prospect.id;
        nameEl.value = prospect.name || "";
        
        // Ensure niche / service value exists in select or append as option
        ensureSelectOption(nicheEl, prospect.niche);
        ensureSelectOption(serviceEl, prospect.service);
        
        nicheEl.value = prospect.niche || "";
        serviceEl.value = prospect.service || "";
        sourceEl.value = prospect.source || "Instagram";
        instagramEl.value = prospect.instagram || "";
        instagramLinkEl.value = prospect.instagramLink || "";
        whatsappEl.value = prospect.whatsapp || "";
        sentDateEl.value = prospect.sentDate || "";
        followUpDateEl.value = prospect.followUpDate || "";
        channelEl.value = prospect.channel || "Instagram DM";
        statusEl.value = prospect.status || "Belum dikirim";
        notesEl.value = prospect.notes || "";
      }
    }
    
    updateGeneratedLink();
  }

  function ensureSelectOption(select, value) {
    if (!value) return;
    const exists = Array.from(select.options).some(opt => opt.value === value);
    if (!exists) {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = value;
      select.appendChild(opt);
    }
  }

  function makeId() {
    return crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
  }

  function updateGeneratedLink() {
    const prospect = {
      name: nameEl.value,
      niche: nicheEl.value,
      service: serviceEl.value,
      whatsapp: whatsappEl.value,
    };
    
    const hasName = nameEl.value.trim();
    const hasNumber = normalizeWhatsapp(whatsappEl.value);

    generatedWaLink.href = makeWaUrl(prospect);
    
    if (hasNumber) {
      waLinkText.textContent = `Send WhatsApp: Halo ${targetName(nameEl.value)}...`;
    } else if (hasName) {
      waLinkText.textContent = `Preview pesan WhatsApp untuk ${targetName(nameEl.value)}`;
    } else {
      waLinkText.textContent = "Isi nama target dulu untuk preview pesan";
    }
  }

  // Update preview on inputs change
  [nameEl, whatsappEl, nicheEl, serviceEl].forEach(el => {
    el.addEventListener("input", updateGeneratedLink);
    el.addEventListener("change", updateGeneratedLink);
  });

  // Handle Form Submit
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
      id: prospectIdEl.value || makeId(),
      name: nameEl.value.trim(),
      niche: nicheEl.value,
      service: serviceEl.value,
      source: sourceEl.value,
      instagram: instagramEl.value.trim(),
      instagramLink: instagramLinkEl.value.trim(),
      whatsapp: whatsappEl.value.trim(),
      sentDate: sentDateEl.value,
      followUpDate: followUpDateEl.value,
      channel: channelEl.value,
      status: statusEl.value,
      notes: notesEl.value.trim()
    };

    await saveProspect(data);
    
    // Redirect to prospects page after saving
    window.location.href = "prospects.html";
  });

  // Cancel Button
  cancelButton.addEventListener("click", () => {
    window.location.href = "prospects.html";
  });

  await init();
});
