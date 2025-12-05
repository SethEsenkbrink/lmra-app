/* admin.js - LMRA Admin Logic v8.2 (Secure Identity) */

let allData = [];

document.addEventListener('DOMContentLoaded', () => {
    // Initialiseer Netlify Identity Widget
    if (window.netlifyIdentity) {
        window.netlifyIdentity.init();
    }

    document.getElementById('searchInput').addEventListener('input', (e) => handleSearch(e.target.value));
    document.getElementById('btnToggleTheme').addEventListener('click', toggleDarkMode);
    document.getElementById('btnExport').addEventListener('click', exportToExcel);
    document.getElementById('btnLogout').addEventListener('click', handleLogout);

    checkTheme();
    loadReports();
});

// --- NIEUWE LOGOUT FUNCTIE ---
function handleLogout() {
    if (!confirm("Uitloggen?")) return;
    
    // Gebruik de officiële Netlify Identity logout
    // Dit verwijdert de nf_jwt cookie en sessie data
    if (window.netlifyIdentity) {
        window.netlifyIdentity.logout();
        
        // Luister naar het logout event en herlaad dan
        window.netlifyIdentity.on('logout', () => {
            window.location.reload(); // De Edge Function zal nu de toegang blokkeren
        });
    } else {
        // Fallback als widget niet geladen is
        window.location.reload();
    }
}

// --- DATA HANDLERS ---
async function loadReports() {
    const loading = document.getElementById('loading');
    const tbody = document.getElementById('tableBody');
    loading.style.display = 'block';
    tbody.innerHTML = '';
    
    try {
        const response = await fetch('/.netlify/functions/get-reports');
        
        if (response.status === 401) { 
            console.log("Niet geautoriseerd, herladen...");
            window.location.reload(); 
            return; 
        }

        if (!response.ok) throw new Error("Fout bij ophalen data");
        
        allData = await response.json();
        renderTable(allData);
    } catch (e) {
        console.error(e);
        tbody.innerHTML = 
            `<tr><td colspan="6" class="p-8 text-center text-red-500">
                <i class="fa-solid fa-triangle-exclamation"></i> Kon data niet ophalen. 
                <button id="btnReload" class="underline font-bold ml-2">Verversen</button>
            </td></tr>`;
        
        const reloadBtn = document.getElementById('btnReload');
        if(reloadBtn) reloadBtn.addEventListener('click', () => window.location.reload());

    } finally { 
        loading.style.display = 'none'; 
    }
}

function handleSearch(query) {
    const lower = query.toLowerCase();
    const filtered = allData.filter(item => 
        (item.monteur_naam && item.monteur_naam.toLowerCase().includes(lower)) ||
        (item.locatie && item.locatie.toLowerCase().includes(lower)) ||
        (item.werkorder && item.werkorder.toLowerCase().includes(lower))
    );
    renderTable(filtered);
}

function renderTable(data) {
    const tbody = document.getElementById('tableBody');
    const emptyState = document.getElementById('emptyState');
    tbody.innerHTML = '';
    
    if(data.length === 0) { 
        emptyState.classList.remove('hidden'); 
        return; 
    } 
    emptyState.classList.add('hidden');

    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group";
        
        const safeNaam = DOMPurify.sanitize(row.monteur_naam);
        const safeLocatie = DOMPurify.sanitize(row.locatie);
        const safeWO = DOMPurify.sanitize(row.werkorder || '');
        const safeOpmerking = DOMPurify.sanitize(row.opmerkingen || '-');
        
        const dateStr = new Date(row.created_at).toLocaleString('nl-NL');
        
        const statusBadge = row.is_veilig 
            ? '<span class="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded text-[10px] font-bold">VEILIG</span>' 
            : '<span class="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 px-2 py-1 rounded text-[10px] font-bold">ONVEILIG</span>';
        
        let details = safeOpmerking;
        if(!row.is_veilig && row.afkeurpunten) details += ' (Zie afkeurpunten)';

        tr.innerHTML = `
            <td class="p-4 font-mono text-xs text-slate-500 dark:text-slate-400">${dateStr}</td>
            <td class="p-4 font-bold text-slate-700 dark:text-slate-200">${safeNaam}</td>
            <td class="p-4">
                <div class="text-sm font-medium text-slate-700 dark:text-slate-200">${safeLocatie}</div>
                <div class="text-xs text-slate-400 font-mono">${safeWO}</div>
            </td>
            <td class="p-4">${statusBadge}</td>
            <td class="p-4 hidden md:table-cell text-xs text-slate-500 dark:text-slate-400 italic truncate max-w-xs">${details}</td>
            <td class="p-4 text-right">
                <button class="btn-delete text-slate-300 hover:text-red-600 dark:text-slate-600 dark:hover:text-red-400 transition-colors p-2" data-id="${row.id}">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </td>`;
        
        tbody.appendChild(tr);
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.target.closest('button');
            const id = target.getAttribute('data-id');
            deleteReport(id);
        });
    });
}

async function deleteReport(id) {
    if(!confirm("Verwijderen?")) return;
    try {
        await fetch('/.netlify/functions/delete-report', { 
            method: 'POST', 
            body: JSON.stringify({ id }) 
        });
        loadReports(); 
    } catch(e) {
        console.error("Delete failed", e);
        alert("Kon niet verwijderen.");
    }
}

function toggleDarkMode() {
    const html = document.documentElement;
    if (html.classList.contains('dark')) { 
        html.classList.remove('dark'); 
        localStorage.setItem('lmra_theme', 'light'); 
    } else { 
        html.classList.add('dark'); 
        localStorage.setItem('lmra_theme', 'dark'); 
    }
    checkTheme();
}

function checkTheme() {
    const theme = localStorage.getItem('lmra_theme');
    const icon = document.getElementById('themeIcon');
    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) { 
        document.documentElement.classList.add('dark'); 
        if(icon) icon.className = "fa-solid fa-sun"; 
    } else { 
        document.documentElement.classList.remove('dark'); 
        if(icon) icon.className = "fa-solid fa-moon"; 
    }
}

function exportToExcel() { 
    if(!allData.length) return alert("Geen data om te exporteren.");
    const ws = XLSX.utils.json_to_sheet(allData); 
    const wb = XLSX.utils.book_new(); 
    XLSX.utils.book_append_sheet(wb, ws, "Export"); 
    XLSX.writeFile(wb, "LMRA_Export.xlsx"); 
}