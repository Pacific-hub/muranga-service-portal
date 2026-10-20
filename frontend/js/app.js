// Helper for Status Badge Colors
function getStatusBadge(status) {
  if (status === 'Pending') {
    return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Pending</span>`;
  }
  if (status === 'In Progress') {
    return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">In Progress</span>`;
  }
  return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Resolved</span>`;
}

// Visual 3-Step Progress Bar for Citizens
function getStepProgressHtml(status) {
  const s1 = 'bg-emerald-700 text-white';
  const s2 = status === 'In Progress' || status === 'Resolved' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-500';
  const s3 = status === 'Resolved' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-500';

  return `
    <div class="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
      <span class="px-2 py-0.5 rounded ${s1}">1. Pending</span>
      <span class="text-slate-300">&rarr;</span>
      <span class="px-2 py-0.5 rounded ${s2}">2. In Progress</span>
      <span class="text-slate-300">&rarr;</span>
      <span class="px-2 py-0.5 rounded ${s3}">3. Resolved</span>
    </div>
  `;
}

// ================= 1. HOME PAGE LOGIC =================
const trackForm = document.getElementById('trackForm');
if (trackForm) {
  trackForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ticketNo = document.getElementById('trackInput').value.trim();
    const resultBox = document.getElementById('trackResult');
    resultBox.classList.remove('hidden');
    resultBox.innerHTML = `<p class="text-slate-500">Searching database...</p>`;

    try {
      const res = await fetch(`/api/requests/track/${encodeURIComponent(ticketNo)}`);
      const data = await res.json();
      if (!res.ok) {
        resultBox.innerHTML = `<p class="text-red-600 font-medium">${data.error}</p>`;
        return;
      }
      resultBox.innerHTML = `
        <div class="flex items-center justify-between mb-2">
          <span class="font-bold text-slate-900">${data.ticket_no} &mdash; ${data.category}</span>
          ${getStatusBadge(data.status)}
        </div>
        <p class="text-slate-600 text-xs mb-1"><strong>Location:</strong> ${data.sub_county}, ${data.location}</p>
        <p class="text-slate-600 text-xs"><strong>Official Remarks:</strong> ${data.admin_remarks}</p>
        ${getStepProgressHtml(data.status)}
      `;
    } catch (err) {
      resultBox.innerHTML = `<p class="text-red-600">Error connecting to server.</p>`;
    }
  });
}

// ================= 2. LOGIN & REGISTRATION LOGIC =================
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  const urlParams = new URLSearchParams(window.location.search);
  let selectedRole = urlParams.get('role') === 'admin' ? 'admin' : 'citizen';
  let isRegisterMode = false;

  const tabCitizen = document.getElementById('tabCitizen');
  const tabAdmin = document.getElementById('tabAdmin');
  const authHeading = document.getElementById('authHeading');
  const authSubtext = document.getElementById('authSubtext');
  const registerForm = document.getElementById('registerForm');
  const citizenToggleBox = document.getElementById('citizenToggleBox');
  const toggleRegisterBtn = document.getElementById('toggleRegisterBtn');
  const demoCredText = document.getElementById('demoCredText');
  const authError = document.getElementById('authError');

  function updateAuthUI() {
    authError.classList.add('hidden');
    if (selectedRole === 'admin') {
      tabAdmin.className = 'py-2 text-xs font-semibold rounded-md bg-slate-900 text-white shadow-sm';
      tabCitizen.className = 'py-2 text-xs font-semibold rounded-md text-slate-600 hover:text-slate-900';
      authHeading.textContent = 'County Staff Admin Sign In';
      authSubtext.textContent = 'Authorized personnel only. Sign in to manage and resolve citizen tickets.';
      loginForm.classList.remove('hidden');
      registerForm.classList.add('hidden');
      citizenToggleBox.classList.add('hidden');
      demoCredText.innerHTML = `Admin: <strong>admin@muranga.go.ke</strong> / <strong>admin123</strong>`;
    } else {
      tabCitizen.className = 'py-2 text-xs font-semibold rounded-md bg-white text-slate-900 shadow-sm';
      tabAdmin.className = 'py-2 text-xs font-semibold rounded-md text-slate-600 hover:text-slate-900';
      citizenToggleBox.classList.remove('hidden');
      demoCredText.innerHTML = `Citizen: <strong>kamau@gmail.com</strong> / <strong>citizen123</strong>`;

      if (isRegisterMode) {
        authHeading.textContent = 'Create Citizen Account';
        authSubtext.textContent = 'Register once to submit and track service requests in Murang\'a County.';
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        toggleRegisterBtn.textContent = 'Already have an account? Sign In';
      } else {
        authHeading.textContent = 'Citizen Sign In';
        authSubtext.textContent = 'Sign in to submit and track your service requests.';
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        toggleRegisterBtn.textContent = 'New resident? Create a Citizen Account';
      }
    }
  }

  tabCitizen.addEventListener('click', () => { selectedRole = 'citizen'; isRegisterMode = false; updateAuthUI(); });
  tabAdmin.addEventListener('click', () => { selectedRole = 'admin'; isRegisterMode = false; updateAuthUI(); });
  toggleRegisterBtn.addEventListener('click', () => { isRegisterMode = !isRegisterMode; updateAuthUI(); });

  updateAuthUI();

  // Handle Sign In
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authError.classList.add('hidden');
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, expected_role: selectedRole })
      });
      const data = await res.json();
      if (!res.ok) {
        authError.textContent = data.error;
        authError.classList.remove('hidden');
        return;
      }
      localStorage.setItem('mcg_user', JSON.stringify(data));
      window.location.href = data.role === 'admin' ? '/admin.html' : '/citizen.html';
    } catch (err) {
      authError.textContent = 'Network error. Please ensure the Node.js server is running.';
      authError.classList.remove('hidden');
    }
  });

  // Handle Citizen Registration
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authError.classList.add('hidden');
    const payload = {
      full_name: document.getElementById('regName').value,
      national_id: document.getElementById('regId').value,
      phone: document.getElementById('regPhone').value,
      email: document.getElementById('regEmail').value,
      password: document.getElementById('regPassword').value
    };

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        authError.textContent = data.error;
        authError.classList.remove('hidden');
        return;
      }
      localStorage.setItem('mcg_user', JSON.stringify(data));
      window.location.href = '/citizen.html';
    } catch (err) {
      authError.textContent = 'Registration failed. Try again.';
      authError.classList.remove('hidden');
    }
  });
}

// ================= 3. CITIZEN DASHBOARD LOGIC =================
const citizenRequestForm = document.getElementById('citizenRequestForm');
if (citizenRequestForm) {
  const user = JSON.parse(localStorage.getItem('mcg_user') || 'null');
  if (!user || user.role !== 'citizen') {
    window.location.href = '/login.html?role=citizen';
  } else {
    document.getElementById('citizenUserName').textContent = `${user.full_name} (${user.phone})`;
  }

  const citizenStatusFilter = document.getElementById('citizenStatusFilter');
  const citizenRequestsList = document.getElementById('citizenRequestsList');

  async function loadCitizenRequests() {
    const status = citizenStatusFilter.value;
    const res = await fetch(`/api/requests?role=citizen&user_id=${user.id}&status=${encodeURIComponent(status)}`);
    const rows = await res.json();

    if (rows.length === 0) {
      citizenRequestsList.innerHTML = `
        <div class="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500">
          No service requests found. Use the form on the left to report an issue.
        </div>
      `;
      return;
    }

    citizenRequestsList.innerHTML = rows.map(r => `
      <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <span class="font-bold text-slate-900 text-sm">${r.ticket_no}</span>
            <span class="text-xs px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium">${r.category}</span>
          </div>
          ${getStatusBadge(r.status)}
        </div>
        <p class="text-xs font-medium text-slate-800 mb-1">${r.sub_county} &bull; ${r.location}</p>
        <p class="text-xs text-slate-600 mb-3">${r.description}</p>
        ${r.image_url ? `<a href="${r.image_url}" target="_blank" class="inline-block text-xs text-emerald-800 font-medium underline mb-2">View Attached Photo</a>` : ''}
        <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs text-slate-700">
          <strong>County Remarks:</strong> ${r.admin_remarks}
        </div>
        ${getStepProgressHtml(r.status)}
      </div>
    `).join('');
  }

  citizenStatusFilter.addEventListener('change', loadCitizenRequests);

  citizenRequestForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('user_id', user.id);
    formData.append('citizen_name', user.full_name);
    formData.append('citizen_phone', user.phone);
    formData.append('category', document.getElementById('reqCategory').value);
    formData.append('sub_county', document.getElementById('reqSubCounty').value);
    formData.append('location', document.getElementById('reqLocation').value);
    formData.append('description', document.getElementById('reqDescription').value);

    const fileInput = document.getElementById('reqImage');
    if (fileInput.files[0]) {
      formData.append('image', fileInput.files[0]);
    }

    const res = await fetch('/api/requests', { method: 'POST', body: formData });
    const data = await res.json();
    if (res.ok) {
      const alertBox = document.getElementById('submitSuccessAlert');
      alertBox.innerHTML = `Request submitted! Your tracking ticket is <strong>${data.ticket_no}</strong>.`;
      alertBox.classList.remove('hidden');
      citizenRequestForm.reset();
      loadCitizenRequests();
    }
  });

  loadCitizenRequests();
}

// ================= 4. ADMIN DASHBOARD LOGIC =================
const adminRequestsTable = document.getElementById('adminRequestsTable');
if (adminRequestsTable) {
  const user = JSON.parse(localStorage.getItem('mcg_user') || 'null');
  if (!user || user.role !== 'admin') {
    window.location.href = '/login.html?role=admin';
  } else {
    document.getElementById('adminUserName').textContent = user.full_name;
  }

  let currentAdminRows = [];

  async function loadAdminAnalytics() {
    const res = await fetch('/api/analytics');
    const stats = await res.json();
    document.getElementById('statTotal').textContent = stats.total;
    document.getElementById('statOpen').textContent = stats.open;
    document.getElementById('statOpenBreakdown').textContent = `${stats.pending} Pending • ${stats.in_progress} In Progress`;
    document.getElementById('statResolved').textContent = stats.resolved;
    const rate = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;
    document.getElementById('statRate').textContent = `${rate}%`;
    document.getElementById('statRateBar').style.width = `${rate}%`;
  }

  async function loadAdminRequests() {
    const status = document.getElementById('adminStatusFilter').value;
    const category = document.getElementById('adminCategoryFilter').value;
    const search = document.getElementById('adminSearch').value;

    const res = await fetch(`/api/requests?role=admin&status=${encodeURIComponent(status)}&category=${encodeURIComponent(category)}&search=${encodeURIComponent(search)}`);
    currentAdminRows = await res.json();

    if (currentAdminRows.length === 0) {
      adminRequestsTable.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-slate-500">No matching service requests found.</td></tr>`;
      return;
    }

    adminRequestsTable.innerHTML = currentAdminRows.map(r => `
      <tr class="hover:bg-slate-50 align-top">
        <td class="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">${r.ticket_no}</td>
        <td class="py-3.5 px-4">
          <div class="font-medium text-slate-900">${r.citizen_name}</div>
          <div class="text-slate-500">${r.citizen_phone}</div>
        </td>
        <td class="py-3.5 px-4">
          <div class="font-semibold text-emerald-800">${r.category}</div>
          <div class="text-slate-600">${r.sub_county} &mdash; ${r.location}</div>
        </td>
        <td class="py-3.5 px-4 max-w-xs">
          <p class="text-slate-700 mb-1">${r.description}</p>
          ${r.image_url ? `<a href="${r.image_url}" target="_blank" class="text-emerald-700 font-medium underline">View Uploaded Photo</a>` : '<span class="text-slate-400">No photo</span>'}
        </td>
        <td class="py-3.5 px-4 whitespace-nowrap">${getStatusBadge(r.status)}</td>
        <td class="py-3.5 px-4 min-w-[260px]">
          <div class="flex flex-col gap-2">
            <select id="status-${r.id}" class="rounded border border-slate-300 px-2 py-1 text-xs bg-white">
              <option value="Pending" ${r.status === 'Pending' ? 'selected' : ''}>Pending</option>
              <option value="In Progress" ${r.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
              <option value="Resolved" ${r.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
            </select>
            <input id="remarks-${r.id}" type="text" value="${r.admin_remarks.replace(/"/g, '&quot;')}"
              placeholder="Official resolution remarks..."
              class="rounded border border-slate-300 px-2 py-1 text-xs" />
            <button onclick="updateTicket(${r.id})"
              class="bg-emerald-800 hover:bg-emerald-900 text-white font-medium py-1 px-3 rounded text-xs self-start transition">
              Save Update
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  window.updateTicket = async (id) => {
    const status = document.getElementById(`status-${id}`).value;
    const admin_remarks = document.getElementById(`remarks-${id}`).value;
    await fetch(`/api/requests/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, admin_remarks })
    });
    await loadAdminRequests();
    await loadAdminAnalytics();
  };

  document.getElementById('adminStatusFilter').addEventListener('change', loadAdminRequests);
  document.getElementById('adminCategoryFilter').addEventListener('change', loadAdminRequests);
  document.getElementById('adminSearch').addEventListener('input', loadAdminRequests);

  // CSV Export Bonus Feature
  document.getElementById('exportCsvBtn').addEventListener('click', () => {
    if (!currentAdminRows.length) return;
    const headers = ['Ticket_No', 'Citizen_Name', 'Phone', 'Category', 'Sub_County', 'Location', 'Status', 'Remarks'];
    const csv = [
      headers.join(','),
      ...currentAdminRows.map(r =>
        [r.ticket_no, `"${r.citizen_name}"`, r.citizen_phone, `"${r.category}"`, r.sub_county, `"${r.location}"`, r.status, `"${r.admin_remarks}"`].join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'muranga_service_requests.csv';
    a.click();
  });

  loadAdminAnalytics();
  loadAdminRequests();
}

// Shared Logout Button
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('mcg_user');
    window.location.href = '/';
  });
}

// ================= 5. UNIVERSAL FLOATING ACCESSIBILITY WIDGET (ALL PAGES) =================
(function initAccessibilityWidget() {
  // 1. Inject Accessibility CSS styles dynamically so all pages support High Contrast, Large Text & Link Highlighting
  const style = document.createElement('style');
  style.innerHTML = `
    html.a11y-large-text { font-size: 18px !important; }
    html.a11y-high-contrast body { background-color: #000 !important; color: #fff !important; }
    html.a11y-high-contrast header,
    html.a11y-high-contrast section,
    html.a11y-high-contrast div.bg-white,
    html.a11y-high-contrast footer {
      background-color: #111 !important;
      color: #fff !important;
      border-color: #facc15 !important;
    }
    html.a11y-high-contrast h1, html.a11y-high-contrast h2, html.a11y-high-contrast h3,
    html.a11y-high-contrast p, html.a11y-high-contrast span, html.a11y-high-contrast label,
    html.a11y-high-contrast td, html.a11y-high-contrast th {
      color: #fff !important;
    }
    html.a11y-high-contrast input, html.a11y-high-contrast select, html.a11y-high-contrast textarea {
      background-color: #000 !important;
      color: #facc15 !important;
      border: 2px solid #facc15 !important;
    }
    html.a11y-highlight-links a, html.a11y-highlight-links button {
      outline: 2px solid #f59e0b !important;
      outline-offset: 2px !important;
    }
  `;
  document.head.appendChild(style);

  // 2. Bilingual Dictionary (English / Kiswahili) for citizen inclusivity
  const translations = {
    en: {
      portal_subtitle: 'Public Service Portal',
      citizen_signin: 'Citizen Sign In',
      staff_portal: 'Staff Portal',
      hero_badge: 'Citizen e-Service Desk',
      hero_title: 'Report a County Issue in Seconds.',
      hero_sub: 'Water, streetlights, roads, or garbage — report it and track repairs live.',
      btn_report: '+ Report an Issue',
      btn_track: 'Track Ticket',
      track_label: 'Instant Ticket Lookup (No Login Needed)',
      btn_check: 'Check Status',
      steps_heading: 'How It Works',
      step1_title: 'Report the Issue',
      step1_desc: 'Select the category, sub-county landmark, and attach an optional photo.',
      step2_title: 'Field Dispatch',
      step2_desc: 'County officers assign a maintenance team and update your ticket to In Progress.',
      step3_title: 'Verified Resolution',
      step3_desc: 'Follow progress online until the issue is marked Resolved with official remarks.'
    },
    sw: {
      portal_subtitle: 'Tovuti ya Huduma kwa Wananchi',
      citizen_signin: 'Ingia (Mwananchi)',
      staff_portal: 'Ofisi ya Kaunti',
      hero_badge: 'Dawati la Huduma kwa Umma',
      hero_title: 'Ripoti Changamoto kwa Sekunde Chache.',
      hero_sub: 'Maji, taa za barabarani, barabara au taka — ripoti na ufuatilie ukarabati.',
      btn_report: '+ Ripoti Tatizo',
      btn_track: 'Fuatilia Tiketi',
      track_label: 'Angalia Hali ya Tiketi (Bila Kuingia)',
      btn_check: 'Angalia Sasa',
      steps_heading: 'Jinsi Mfumo Unavyofanya Kazi',
      step1_title: 'Wasilisha Ripoti',
      step1_desc: 'Chagua aina ya huduma, eneo lako, na uambatanishe picha ikiwezekana.',
      step2_title: 'Utumaji wa Mafundi',
      step2_desc: 'Maafisa wa kaunti wanatuma mafundi na kubadilisha hali kuwa Inaendelea.',
      step3_title: 'Utatuzi Kamili',
      step3_desc: 'Fuatilia mtandaoni hadi tatizo litakapowekwa alama kuwa Limetatuliwa.'
    }
  };

  // Load saved preferences from localStorage
  const prefs = JSON.parse(localStorage.getItem('mcg_a11y_prefs') || '{"largeText":false,"highContrast":false,"highlightLinks":false,"lang":"en"}');

  function applyPreferences() {
    document.documentElement.classList.toggle('a11y-large-text', prefs.largeText);
    document.documentElement.classList.toggle('a11y-high-contrast', prefs.highContrast);
    document.documentElement.classList.toggle('a11y-highlight-links', prefs.highlightLinks);

    // Apply language translation to elements with data-i18n
    const dict = translations[prefs.lang] || translations.en;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) el.textContent = dict[key];
    });

    localStorage.setItem('mcg_a11y_prefs', JSON.stringify(prefs));
  }

  // 3. Create Floating Button & Popover Panel (Fixed bottom-right, stays put while scrolling)
  const widgetContainer = document.createElement('div');
  widgetContainer.className = 'fixed bottom-5 right-5 z-50';
  widgetContainer.innerHTML = `
    <!-- Accessibility Menu Panel -->
    <div id="a11yPanel" class="hidden mb-3 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 text-xs text-slate-800">
      <div class="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-100">
        <span class="font-bold text-sm text-slate-900">Accessibility & Language</span>
        <button id="a11yCloseBtn" class="text-slate-400 hover:text-slate-700 font-bold text-base">&times;</button>
      </div>

      <div class="space-y-2.5">
        <button id="toggleLangBtn" type="button" class="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200 font-medium transition">
          <span>Language (EN / Kiswahili)</span>
          <span id="langBadge" class="px-2 py-0.5 rounded bg-emerald-800 text-white font-bold uppercase">${prefs.lang}</span>
        </button>

        <button id="toggleTextSizeBtn" type="button" class="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200 font-medium transition">
          <span>Larger Text Size</span>
          <span id="textBadge" class="text-slate-500 font-semibold">${prefs.largeText ? 'ON' : 'OFF'}</span>
        </button>

        <button id="toggleContrastBtn" type="button" class="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200 font-medium transition">
          <span>High Contrast Mode</span>
          <span id="contrastBadge" class="text-slate-500 font-semibold">${prefs.highContrast ? 'ON' : 'OFF'}</span>
        </button>

        <button id="toggleLinksBtn" type="button" class="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200 font-medium transition">
          <span>Highlight Links & Buttons</span>
          <span id="linksBadge" class="text-slate-500 font-semibold">${prefs.highlightLinks ? 'ON' : 'OFF'}</span>
        </button>

        <button id="resetA11yBtn" type="button" class="w-full text-center text-red-600 hover:underline pt-1 font-medium">
          Reset Default Settings
        </button>
      </div>
    </div>

    <!-- Floating Trigger Button -->
    <button
      id="a11yTriggerBtn"
      type="button"
      title="Accessibility & Language Options"
      aria-label="Accessibility Options"
      class="ml-auto flex items-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold px-4 py-3 rounded-full shadow-lg border-2 border-white transition transform hover:scale-105"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <circle cx="12" cy="4.5" r="2" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 8.5h16M12 8.5v5m0 0l-3 6.5m3-6.5l3 6.5" />
      </svg>
      <span class="text-xs hidden sm:inline">Accessibility</span>
    </button>
  `;

  document.body.appendChild(widgetContainer);

  const panel = document.getElementById('a11yPanel');
  document.getElementById('a11yTriggerBtn').addEventListener('click', () => {
    panel.classList.toggle('hidden');
  });
  document.getElementById('a11yCloseBtn').addEventListener('click', () => {
    panel.classList.add('hidden');
  });

  document.getElementById('toggleLangBtn').addEventListener('click', () => {
    prefs.lang = prefs.lang === 'en' ? 'sw' : 'en';
    document.getElementById('langBadge').textContent = prefs.lang;
    applyPreferences();
  });

  document.getElementById('toggleTextSizeBtn').addEventListener('click', () => {
    prefs.largeText = !prefs.largeText;
    document.getElementById('textBadge').textContent = prefs.largeText ? 'ON' : 'OFF';
    applyPreferences();
  });

  document.getElementById('toggleContrastBtn').addEventListener('click', () => {
    prefs.highContrast = !prefs.highContrast;
    document.getElementById('contrastBadge').textContent = prefs.highContrast ? 'ON' : 'OFF';
    applyPreferences();
  });

  document.getElementById('toggleLinksBtn').addEventListener('click', () => {
    prefs.highlightLinks = !prefs.highlightLinks;
    document.getElementById('linksBadge').textContent = prefs.highlightLinks ? 'ON' : 'OFF';
    applyPreferences();
  });

  document.getElementById('resetA11yBtn').addEventListener('click', () => {
    prefs.largeText = false;
    prefs.highContrast = false;
    prefs.highlightLinks = false;
    prefs.lang = 'en';
    document.getElementById('langBadge').textContent = 'en';
    document.getElementById('textBadge').textContent = 'OFF';
    document.getElementById('contrastBadge').textContent = 'OFF';
    document.getElementById('linksBadge').textContent = 'OFF';
    applyPreferences();
  });

  applyPreferences();
})();