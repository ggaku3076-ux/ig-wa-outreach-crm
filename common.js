// Key for local storage
const STORAGE_KEY = "ig-wa-outreach-crm.prospects";
const SETTINGS_KEY = "ig-wa-outreach-crm.settings";

const statusOptions = [
  "Belum dikirim",
  "Sudah dikirim",
  "Membalas",
  "Tertarik",
  "Follow up",
  "Closing",
  "Tidak tertarik",
];

const niches = [
  "Klinik Gigi",
  "Catering",
  "Skincare",
  "Kuliner",
  "Fashion",
  "Properti",
  "Pendidikan",
  "Lainnya"
];

const services = [
  "Landing Page",
  "Company Profile",
  "Website Booking",
  "Katalog Online",
  "Toko Online",
  "Maintenance Website",
  "Lainnya"
];

// Read prospects from local storage
function readLocalProspects() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

// Save prospects to local storage
function saveLocalProspects(prospects) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prospects));
}

// Get settings (Supabase config, templates, etc.)
function getSettings() {
  try {
    const defaultTemplates = {
      default: `Halo {name}, salam kenal ya 👋\n\nSaya Dari Gexxaweb, kebetulan sering bantu bisnis {niche} bikin website. Bukan mau jualan langsung sih, tapi saya perhatikan konten Instagram {name} sudah menggugah selera banget, sayang kalau calon pelanggan yang cari di Google belum nemu info menu dan harga selengkap itu.\n\nBanyak klien {niche} yang saya bantu bilang, setelah punya website yang pas, mereka jadi lebih tenang karena pelanggan bisa lihat katalog menu, paket harga, dan testimoni secara lengkap tanpa harus tanya-tanya via WA berulang kali.\n\nBoleh saya kirim portofolionya buat referensi? Nggak apa-apa kalau memang belum butuh sekarang. Makasih ya! 🙏`
    };
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
    return {
      supabaseUrl: saved.supabaseUrl || "",
      supabaseKey: saved.supabaseKey || "",
      templates: saved.templates || defaultTemplates,
      activeTemplate: saved.activeTemplate || "default"
    };
  } catch {
    return {
      supabaseUrl: "",
      supabaseKey: "",
      templates: {},
      activeTemplate: "default"
    };
  }
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// Get Supabase Client Instance (if configured)
let supabaseClient = null;
function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  const settings = getSettings();
  if (settings.supabaseUrl && settings.supabaseKey && typeof supabase !== "undefined") {
    try {
      supabaseClient = supabase.createClient(settings.supabaseUrl, settings.supabaseKey);
      return supabaseClient;
    } catch (e) {
      console.error("Gagal inisialisasi Supabase:", e);
    }
  }
  return null;
}

// Sync prospects with Supabase
async function syncProspects() {
  const client = getSupabaseClient();
  if (!client) return readLocalProspects();

  try {
    const localData = readLocalProspects();
    
    // 1. Fetch cloud data
    const { data: cloudData, error } = await client
      .from("prospects")
      .select("*");
      
    if (error) {
      console.warn("Gagal mengambil data dari Supabase (mungkin tabel belum dibuat):", error);
      return localData;
    }

    // 2. Merge algorithm (Compare updatedAt)
    const mergedMap = new Map();
    
    // Add local prospects first
    localData.forEach(p => {
      if (p.id) mergedMap.set(p.id, p);
    });

    // Merge cloud prospects (newer wins, or add if missing)
    let hasNewerFromCloud = false;
    let localNeedsUpload = [];

    cloudData.forEach(cp => {
      const local = mergedMap.get(cp.id);
      if (!local) {
        mergedMap.set(cp.id, cp);
        hasNewerFromCloud = true;
      } else {
        const localTime = new Date(local.updatedAt || 0).getTime();
        const cloudTime = new Date(cp.updatedAt || 0).getTime();
        if (cloudTime > localTime) {
          mergedMap.set(cp.id, cp);
          hasNewerFromCloud = true;
        } else if (localTime > cloudTime) {
          localNeedsUpload.push(local);
        }
      }
    });

    // Check if there are local prospects that are not in cloud yet
    localData.forEach(p => {
      const cloudMatch = cloudData.find(cp => cp.id === p.id);
      if (!cloudMatch) {
        localNeedsUpload.push(p);
      }
    });

    const mergedList = Array.from(mergedMap.values());
    saveLocalProspects(mergedList);

    // 3. Upload locally updated/new records back to cloud
    if (localNeedsUpload.length > 0) {
      const { error: upsertError } = await client
        .from("prospects")
        .upsert(localNeedsUpload);
        
      if (upsertError) {
        console.error("Gagal mengupload perubahan ke Supabase:", upsertError);
      }
    }

    return mergedList;
  } catch (err) {
    console.error("Gagal melakukan sinkronisasi:", err);
    return readLocalProspects();
  }
}

// Save single prospect
async function saveProspect(prospectData) {
  const localData = readLocalProspects();
  const index = localData.findIndex(p => p.id === prospectData.id);
  
  prospectData.updatedAt = new Date().toISOString();

  if (index >= 0) {
    localData[index] = prospectData;
  } else {
    localData.unshift(prospectData);
  }

  saveLocalProspects(localData);

  // Async push to Supabase
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from("prospects").upsert([prospectData]);
    } catch (e) {
      console.error("Gagal menyimpan ke Supabase secara langsung:", e);
    }
  }
  
  return localData;
}

// Delete single prospect
async function deleteProspect(id) {
  let localData = readLocalProspects();
  localData = localData.filter(p => p.id !== id);
  saveLocalProspects(localData);

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from("prospects").delete().eq("id", id);
    } catch (e) {
      console.error("Gagal menghapus dari Supabase:", e);
    }
  }
  return localData;
}

// Helpers
function normalizeWhatsapp(value) {
  return value.replace(/[^\d]/g, "").replace(/^0/, "62");
}

function targetName(name) {
  return name ? name.trim() : "Kak";
}

function makeMessage(prospect) {
  const settings = getSettings();
  const templateName = settings.activeTemplate || "default";
  let template = settings.templates[templateName] || settings.templates["default"];
  
  const name = targetName(prospect.name);
  const niche = prospect.niche || "Bisnis";
  const service = prospect.service || "Website";

  return template
    .replaceAll("{name}", name)
    .replaceAll("{niche}", niche)
    .replaceAll("{service}", service);
}

function makeWaUrl(prospect) {
  const msg = encodeURIComponent(makeMessage(prospect));
  const num = normalizeWhatsapp(prospect.whatsapp || "");
  return num ? `https://wa.me/${num}?text=${msg}` : `https://wa.me/?text=${msg}`;
}

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(`${value}T00:00:00`));
  } catch {
    return value;
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Inject standard Navigation and Footer UI
function injectNavigation(activePage) {
  const headerContainer = document.querySelector("#app-header-container");
  if (!headerContainer) return;

  headerContainer.innerHTML = `
    <header class="app-header">
      <div class="brand" onclick="window.location.href='index.html'">
        <div class="brand-mark">OC</div>
        <div>
          <h1>Outreach CRM</h1>
          <p>Instagram & WhatsApp</p>
        </div>
      </div>

      <nav class="side-nav" aria-label="Navigasi utama">
        <a href="index.html" class="${activePage === 'dashboard' ? 'active' : ''}">
          <svg class="nav-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          Dashboard
        </a>
        <a href="input.html" class="${activePage === 'input' ? 'active' : ''}">
          <svg class="nav-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Tambah Prospek
        </a>
        <a href="prospects.html" class="${activePage === 'prospects' ? 'active' : ''}">
          <svg class="nav-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          Prospek
        </a>
        <a href="settings.html" class="${activePage === 'settings' ? 'active' : ''}">
          <svg class="nav-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          Pengaturan
        </a>
      </nav>

      <div class="topbar-actions">
        <span id="sync-status" class="sync-badge">
          <span class="sync-dot"></span>
          Checking sync...
        </span>
      </div>
    </header>
  `;

  // Start background sync status check
  updateSyncBadge();
}

function updateSyncBadge() {
  const syncBadge = document.querySelector("#sync-status");
  if (!syncBadge) return;

  const client = getSupabaseClient();
  if (client) {
    syncBadge.className = "sync-badge synced";
    syncBadge.innerHTML = `<span class="sync-dot text-emerald"></span> Cloud Live`;
  } else {
    syncBadge.className = "sync-badge local-only";
    syncBadge.innerHTML = `<span class="sync-dot text-amber"></span> Lokal`;
  }
}
