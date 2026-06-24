document.addEventListener("DOMContentLoaded", async () => {
  // 1. Inject navigation
  injectNavigation("settings");

  // Elements
  const supabaseUrlEl = document.querySelector("#supabaseUrl");
  const supabaseKeyEl = document.querySelector("#supabaseKey");
  const saveSupabaseBtn = document.querySelector("#saveSupabaseBtn");
  const disconnectSupabaseBtn = document.querySelector("#disconnectSupabaseBtn");

  const messageTemplateEl = document.querySelector("#messageTemplate");
  const saveTemplateBtn = document.querySelector("#saveTemplateBtn");
  const resetTemplateBtn = document.querySelector("#resetTemplateBtn");

  const exportCsvBtn = document.querySelector("#exportCsvBtn");
  const backupJsonBtn = document.querySelector("#backupJsonBtn");
  const importJsonBtn = document.querySelector("#importJsonBtn");
  const importFileInput = document.querySelector("#importFileInput");
  const clearDbBtn = document.querySelector("#clearDbBtn");

  let settings = getSettings();
  let prospects = readLocalProspects();

  // Load state to inputs
  function loadInputs() {
    settings = getSettings();
    supabaseUrlEl.value = settings.supabaseUrl || "";
    supabaseKeyEl.value = settings.supabaseKey || "";

    const activeTemplate = settings.activeTemplate || "default";
    messageTemplateEl.value = settings.templates[activeTemplate] || settings.templates["default"];
  }

  // Save Supabase Settings
  saveSupabaseBtn.addEventListener("click", async () => {
    const url = supabaseUrlEl.value.trim();
    const key = supabaseKeyEl.value.trim();

    if (!url || !key) {
      alert("Harap isi URL Project Supabase dan Anon Key Anda!");
      return;
    }

    settings.supabaseUrl = url;
    settings.supabaseKey = key;
    saveSettings(settings);

    // Force re-initialize supabase client in common.js
    supabaseClient = null;

    try {
      const client = getSupabaseClient();
      if (!client) {
        throw new Error("Gagal menginisialisasi klien Supabase. Periksa kembali URL dan Kunci.");
      }

      saveSupabaseBtn.textContent = "Menghubungkan...";
      saveSupabaseBtn.disabled = true;

      // Test connection by fetching or syncing
      const synced = await syncProspects();
      alert("Koneksi Supabase berhasil! Data lokal dan awan telah disinkronkan.");
      updateSyncBadge();
    } catch (e) {
      alert("Gagal terhubung ke Supabase. Periksa konsol browser atau input Anda.");
      console.error(e);
    } finally {
      saveSupabaseBtn.textContent = "Simpan & Hubungkan";
      saveSupabaseBtn.disabled = false;
      loadInputs();
    }
  });

  // Disconnect Supabase
  disconnectSupabaseBtn.addEventListener("click", () => {
    if (confirm("Putuskan koneksi dari Supabase? Data di perangkat lokal Anda tidak akan dihapus.")) {
      settings.supabaseUrl = "";
      settings.supabaseKey = "";
      saveSettings(settings);
      
      // Reset client
      supabaseClient = null;
      
      updateSyncBadge();
      loadInputs();
      alert("Koneksi Supabase diputuskan. Data sekarang hanya disimpan di penyimpanan browser lokal.");
    }
  });

  // Save outreach message template
  saveTemplateBtn.addEventListener("click", () => {
    const text = messageTemplateEl.value.trim();
    if (!text) {
      alert("Template pesan tidak boleh kosong!");
      return;
    }

    const activeTemplate = settings.activeTemplate || "default";
    settings.templates[activeTemplate] = text;
    saveSettings(settings);
    alert("Template pesan outreach berhasil disimpan!");
  });

  // Reset template to default
  resetTemplateBtn.addEventListener("click", () => {
    if (confirm("Kembalikan template pesan ke bawaan default?")) {
      const defaultText = `Halo {name}, salam kenal ya 👋\n\nSaya Dari Gexxaweb, kebetulan sering bantu bisnis {niche} bikin website. Bukan mau jualan langsung sih, tapi saya perhatikan konten Instagram {name} sudah menggugah selera banget, sayang kalau calon pelanggan yang cari di Google belum nemu info menu dan harga selengkap itu.\n\nBanyak klien {niche} yang saya bantu bilang, setelah punya website yang pas, mereka jadi lebih tenang karena pelanggan bisa lihat katalog menu, paket harga, dan testimoni secara lengkap tanpa harus tanya-tanya via WA berulang kali.\n\nBoleh saya kirim portofolionya buat referensi? Nggak apa-apa kalau memang belum butuh sekarang. Makasih ya! 🙏`;
      const activeTemplate = settings.activeTemplate || "default";
      settings.templates[activeTemplate] = defaultText;
      saveSettings(settings);
      loadInputs();
    }
  });

  // Export CSV
  exportCsvBtn.addEventListener("click", () => {
    const currentProspects = readLocalProspects();
    if (currentProspects.length === 0) {
      alert("Database kosong, tidak ada data untuk diekspor.");
      return;
    }

    const headers = [
      "Nama", 
      "Niche", 
      "Jasa Ditawarkan", 
      "Sumber Kontak", 
      "Instagram", 
      "Instagram Link", 
      "WhatsApp", 
      "Tanggal Pesan", 
      "Channel Outreach", 
      "Status", 
      "Tanggal Follow Up", 
      "Catatan",
      "Terakhir Diupdate"
    ];

    const rows = currentProspects.map((p) => [
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
      p.updatedAt,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell || "").replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `database-prospek-outreach-${new Date().toISOString().slice(0,10)}.csv`);
    link.click();
    URL.revokeObjectURL(url);
  });

  // Backup JSON
  backupJsonBtn.addEventListener("click", () => {
    const currentProspects = readLocalProspects();
    const payload = {
      version: 2,
      exportedAt: new Date().toISOString(),
      prospects: currentProspects,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `backup-outreach-crm-${new Date().toISOString().slice(0,10)}.json`);
    link.click();
    URL.revokeObjectURL(url);
  });

  // Import JSON Click Handler
  importJsonBtn.addEventListener("click", () => {
    importFileInput.click();
  });

  // File selected handler
  importFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);
        const imported = Array.isArray(data) ? data : data.prospects;

        if (!Array.isArray(imported)) {
          throw new Error("Format JSON backup tidak didukung.");
        }

        const localData = readLocalProspects();
        const map = new Map(localData.map(p => [p.id, p]));

        imported.forEach(p => {
          if (!p.name) return; // Skip invalid rows
          const id = p.id || crypto.randomUUID();
          map.set(id, {
            ...p,
            id,
            updatedAt: p.updatedAt || new Date().toISOString()
          });
        });

        const merged = Array.from(map.values());
        saveLocalProspects(merged);

        // Upload to Supabase if connected
        const client = getSupabaseClient();
        if (client) {
          await client.from("prospects").upsert(merged);
        }

        alert(`Berhasil mengimpor ${imported.length} data prospek!`);
        updateSyncBadge();
      } catch (err) {
        alert("Gagal membaca file backup: " + err.message);
      } finally {
        importFileInput.value = ""; // Reset
      }
    };
    reader.readAsText(file);
  });

  // Clear database locally and warn cloud
  clearDbBtn.addEventListener("click", async () => {
    const confirmLocal = confirm("PERINGATAN: Hapus semua data prospek Anda di database lokal browser?");
    if (!confirmLocal) return;

    const client = getSupabaseClient();
    if (client) {
      const confirmCloud = confirm("Anda juga terhubung dengan Supabase. Hapus juga data di tabel awan Supabase?");
      if (confirmCloud) {
        try {
          // Fetch IDs first then delete
          const { error } = await client.from("prospects").delete().neq("id", "placeholder");
          if (error) throw error;
        } catch (e) {
          alert("Gagal menghapus data di Supabase (silakan hapus manual lewat panel Supabase): " + e.message);
        }
      }
    }

    localStorage.removeItem(STORAGE_KEY);
    alert("Database lokal telah berhasil dibersihkan.");
    loadInputs();
    updateSyncBadge();
  });

  // Init UI
  loadInputs();
});
