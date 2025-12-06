/* app.js - LMRA Pro v8.2 (Supabase Direct Connect) */

/* --- CONFIGURATIE (VUL HIER JE GEGEVENS IN!) --- */
// VUL HIER DE URL en ANON KEY IN VAN JE SUPABASE DASHBOARD
const SUPABASE_URL = 'https://zgbxlucbhyyrfwxqdntg.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnYnhsdWNiaHl5cmZ3eHFkbnRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMzM0NzcsImV4cCI6MjA4MDYwOTQ3N30.fF5S84dxbwLnzC8NIrx8v_CYSRjp_zcHYKC4tb8HPnE'; 

const APP_VERSION = "8.2";
const SYNC_QUEUE_KEY = 'lmra_sync_queue';
const ACTIVE_SESSION_KEY = 'lmra_active_session'; 
const HISTORY_KEY = 'lmra_history';
const SECURITY_CHECK_KEY = 'lmra_sec_check';

// Initialiseer Supabase client
const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* --- CRYPTO MANAGER (600K iteraties - Onveranderd) --- */
const CryptoManager = {
    key: null,
    
    async deriveKey(pin, salt) {
        const enc = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey("raw", enc.encode(pin), { name: "PBKDF2" }, false, ["deriveKey"]);
        const saltBuffer = salt ? Uint8Array.from(atob(salt), c => c.charCodeAt(0)) : window.crypto.getRandomValues(new Uint8Array(16));
        
        const key = await window.crypto.subtle.deriveKey(
            { name: "PBKDF2", salt: saltBuffer, iterations: 600000, hash: "SHA-256" },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"]
        );
        return { key, salt: btoa(String.fromCharCode(...saltBuffer)) };
    },
    async encrypt(data) {
        if (!this.key) throw new Error("App vergrendeld");
        const enc = new TextEncoder();
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, this.key, enc.encode(JSON.stringify(data)));
        const ivStr = btoa(String.fromCharCode(...iv));
        const dataStr = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
        return `${ivStr}:${dataStr}`;
    },
    async decrypt(encryptedStr) {
        if (!this.key) throw new Error("App vergrendeld");
        try {
            const [ivStr, dataStr] = encryptedStr.split(':');
            const iv = Uint8Array.from(atob(ivStr), c => c.charCodeAt(0));
            const data = Uint8Array.from(atob(dataStr), c => c.charCodeAt(0));
            const decrypted = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, this.key, data);
            const dec = new TextDecoder();
            return JSON.parse(dec.decode(decrypted));
        } catch (e) { console.error("Decryptie faalde", e); return null; }
    }
};

const safeStorage = {
    async set(key, value) { try { const encrypted = await CryptoManager.encrypt(value); localStorage.setItem(key, encrypted); } catch (e) { console.error("Opslag fout", e); } },
    async get(key) { const item = localStorage.getItem(key); if (!item) return null; return await CryptoManager.decrypt(item); },
    removeItem: (key) => localStorage.removeItem(key)
};

/* --- INIT & APP FLOW --- */
let isAppUnlocked = false;

document.addEventListener('DOMContentLoaded', () => { 
    console.log(`LMRA Pro v${APP_VERSION} Supabase Init...`);
    initPINFlow();
});

function initPINFlow() {
    const inputs = document.querySelectorAll('.pin-digit');
    const unlockBtn = document.getElementById('btnUnlock');
    const pinTitle = document.getElementById('pinTitle');
    const pinDesc = document.getElementById('pinDesc');
    const setupInfo = document.getElementById('setupMode');
    const salt = localStorage.getItem('lmra_salt');
    const hasSecCheck = localStorage.getItem(SECURITY_CHECK_KEY);

    document.getElementById('pinModal').classList.remove('hidden');

    if (!salt || !hasSecCheck) {
        pinTitle.innerText = "Stel je PIN in";
        pinDesc.innerText = "Kies een veilige 4-cijferige code. Onthoud deze goed!";
        setupInfo.classList.remove('hidden');
        unlockBtn.innerText = "Instellen & Starten";
        if(!salt) localStorage.clear();
    } else {
        pinTitle.innerText = "Beveiligde Toegang";
        pinDesc.innerText = "Voer je PIN in om te ontgrendelen.";
        setupInfo.classList.add('hidden');
        unlockBtn.innerText = "Ontgrendelen";
    }

    inputs.forEach(i => i.value = '');
    
    const newUnlockBtn = unlockBtn.cloneNode(true);
    unlockBtn.parentNode.replaceChild(newUnlockBtn, unlockBtn);
    newUnlockBtn.addEventListener('click', attemptUnlock);

    inputs.forEach((input, index) => {
        input.oninput = (e) => {
            if (e.target.value.length === 1 && index < inputs.length - 1) {
                inputs[index + 1].focus();
            }
        };
        input.onkeydown = (e) => {
            if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
                inputs[index - 1].focus();
            }
            if (e.key === 'Enter') attemptUnlock();
        };
    });
    
    setTimeout(() => inputs[0].focus(), 100);
}

async function attemptUnlock() {
    const inputs = document.querySelectorAll('.pin-digit');
    const errorMsg = document.getElementById('pinError');
    let pin = '';
    inputs.forEach(input => pin += input.value);

    if (pin.length !== 4) {
        errorMsg.innerText = "Voer 4 cijfers in.";
        return;
    }

    const unlockBtn = document.getElementById('btnUnlock');
    unlockBtn.disabled = true;
    unlockBtn.innerText = "Verifiëren...";

    try {
        const storedSalt = localStorage.getItem('lmra_salt');
        const { key, salt } = await CryptoManager.deriveKey(pin, storedSalt);
        CryptoManager.key = key;

        const storedCheck = localStorage.getItem(SECURITY_CHECK_KEY);

        if (!storedCheck) {
            localStorage.setItem('lmra_salt', salt);
            await safeStorage.set(SECURITY_CHECK_KEY, 'VALID_PIN');
            finishUnlock();
        } else {
            const decryptedCheck = await safeStorage.get(SECURITY_CHECK_KEY);
            if (decryptedCheck === 'VALID_PIN') {
                finishUnlock();
            } else {
                throw new Error("Ongeldige PIN");
            }
        }
    } catch (e) {
        console.error(e);
        CryptoManager.key = null;
        errorMsg.innerText = "Foutieve pincode.";
        unlockBtn.disabled = false;
        unlockBtn.innerText = "Probeer opnieuw";
        inputs.forEach(i => i.value = '');
        inputs[0].focus();
    }
}

function finishUnlock() {
    document.getElementById('pinModal').classList.add('hidden');
    isAppUnlocked = true;
    startApp();
}

function startApp() {
    renderCategories(); 
    attachStaticEventListeners();
    safeStorage.get('lmra_username').then(sn => {
        if(sn) document.getElementById('userName').value = sn;
    });
    checkTheme(); 
    checkDailyReset(); 
    setDefaultTimes();
    processSyncQueue();     
    checkChangelog();       
    checkResumeState();
}

const categories = [
    { title: "Algemeen & Fitheid", icon: "fa-user-clock", questions: [{ id: 1, text: "Voel ik mij fysiek en mentaal fit voor deze klus?", type: 'positive' }, { id: 2, text: "Weet ik wat te doen bij nood (alarmnummer, vluchtroute)?", type: 'positive' }] },
    { title: "Vergunningen & Procedures", icon: "fa-file-signature", questions: [{ id: 3, text: "Is de werkvergunning correct ingevuld en getekend?", type: 'positive' }, { id: 4, text: "Heb ik de taakrisicoanalyse (TRA) gelezen/begrepen?", type: 'positive' }] },
    { title: "Omgeving & Techniek", icon: "fa-bolt", questions: [{ id: 5, text: "Is de installatie veiliggesteld (LOTOTO / Vrij van spanning)?", type: 'positive' }, { id: 6, text: "Heb ik de juiste PBM's en gekeurd gereedschap?", type: 'positive' }, { id: 7, text: "Is de werkplek afgezet en vrij van struikelgevaar?", type: 'positive' }] }
];
let answers = {}; let actions = {}; let darkMode = false;

window.addEventListener('online', () => {
    showToast("Verbinding hersteld. Synchroniseren...");
    processSyncQueue();
});

function attachStaticEventListeners() {
    document.getElementById('btnOpenArchive').addEventListener('click', openArchive);
    document.getElementById('btnToggleTheme').addEventListener('click', toggleDarkMode);
    document.getElementById('btnResetApp').addEventListener('click', () => resetApp(true));
    document.getElementById('buddyToggle').addEventListener('change', toggleBuddyField);
    document.getElementById('submitBtn').addEventListener('click', evaluateLMRA);
    document.getElementById('btnCopyToClipboard').addEventListener('click', copyToClipboard);
    document.getElementById('btnCloseModal').addEventListener('click', closeModal);
    document.getElementById('btnCloseArchive').addEventListener('click', closeArchive);
    document.getElementById('btnClearArchive').addEventListener('click', clearArchive);
    document.getElementById('btnGeneratePDF').addEventListener('click', generatePDF);
    document.getElementById('btnCloseDetail').addEventListener('click', closeDetail);
    document.getElementById('btnCloseUpdateModal').addEventListener('click', closeUpdateModal);
    document.getElementById('btnTriggerResume').addEventListener('click', triggerResumeFlow);
    document.getElementById('btnConfirmResume').addEventListener('click', confirmResume);
    document.getElementById('btnCancelResume').addEventListener('click', cancelResume);
}

async function checkDailyReset() {
    const lastDate = await safeStorage.get('lmra_last_date');
    const today = new Date().toDateString();
    
    if (lastDate !== today) {
        safeStorage.removeItem(ACTIVE_SESSION_KEY);
        safeStorage.removeItem('lmra_valid_until');
        await safeStorage.set('lmra_last_date', today);
        document.getElementById('pauseAlert').classList.add('hidden');
        resetApp(false);
    } else {
        checkValidity();
        setDefaultTimes(); 
    }
}

function setDefaultTimes() {
    const now = new Date();
    const nowStr = now.toTimeString().slice(0,5);
    const end = new Date(now.getTime() + 4*60*60*1000); 
    const endStr = end.toTimeString().slice(0,5);
    
    const timeStart = document.getElementById('timeStart');
    const timeEnd = document.getElementById('timeEnd');
    
    if(timeStart && !timeStart.disabled && !timeStart.value) timeStart.value = nowStr;
    if(timeEnd && !timeEnd.disabled && !timeEnd.value) timeEnd.value = endStr;
}

async function checkValidity() {
    const validUntil = await safeStorage.get('lmra_valid_until');
    const session = await safeStorage.get(ACTIVE_SESSION_KEY);
    
    if (validUntil && !session) {
        const now = new Date();
        const endTime = new Date(validUntil);
        if (!isNaN(endTime) && now > endTime) { 
            document.getElementById('pauseAlert').classList.remove('hidden'); 
        }
    }
}

function toggleBuddyField() {
    const check = document.getElementById('buddyToggle').checked;
    const field = document.getElementById('buddyField');
    if(check) { field.classList.remove('hidden'); } else { field.classList.add('hidden'); }
}

function toggleFormLock(locked) {
    const elements = document.querySelectorAll('#userName, #taskLocation, #workOrder, #comments, #timeStart, #timeEnd, #buddyToggle, #buddyName, #declarationCheck');
    elements.forEach(el => el.disabled = locked);
    const buttons = document.querySelectorAll('.question-card button');
    buttons.forEach(btn => btn.disabled = locked);
    const actionInputs = document.querySelectorAll('.action-required input');
    actionInputs.forEach(inp => inp.disabled = locked);

    const submitBtn = document.getElementById('submitBtn');
    const submitText = document.getElementById('submitBtnText');
    
    if (locked) {
        submitBtn.disabled = true;
        submitBtn.classList.add('bg-slate-500', 'cursor-not-allowed');
        submitBtn.classList.remove('bg-[#00447c]', 'hover:bg-[#003366]');
        submitText.innerText = "LMRA Loopt - Wijzigen niet mogelijk";
    } else {
        submitBtn.disabled = false;
        submitBtn.classList.remove('bg-slate-500', 'cursor-not-allowed');
        submitBtn.classList.add('bg-[#00447c]', 'hover:bg-[#003366]');
        submitText.innerText = "Beoordeel Veiligheid";
    }
}

function createEl(tag, classes, text) {
    const el = document.createElement(tag);
    if(classes) el.className = classes;
    if(text) el.textContent = text;
    return el;
}

function renderCategories() {
    const container = document.getElementById('questions-container'); 
    if(!container) return;
    container.innerHTML = '';
    
    categories.forEach(cat => {
        const section = document.createElement('div'); 
        section.className = "bg-white dark:bg-cardbg rounded-xl shadow-sm overflow-hidden transition-colors";
        const header = document.createElement('div');
        header.className = "bg-slate-50 dark:bg-slate-800/50 p-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2";
        const icon = document.createElement('i');
        icon.className = `fa-solid ${cat.icon} text-[#00447c] dark:text-blue-400`;
        const title = document.createElement('span');
        title.className = "font-bold text-sm text-slate-700 dark:text-slate-300 uppercase";
        title.textContent = cat.title;
        
        header.appendChild(icon); header.appendChild(title);
        section.appendChild(header);

        const qList = document.createElement('div'); qList.className = "p-2";
        cat.questions.forEach(q => {
            const item = document.createElement('div');
            item.className = "question-card p-3 mb-2 last:mb-0 rounded-lg border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-colors";
            
            const textDiv = createEl('div', "text-sm font-medium text-slate-800 dark:text-slate-200 mb-3", q.text);
            item.appendChild(textDiv);

            const btnGrid = document.createElement('div');
            btnGrid.className = "grid grid-cols-2 gap-2";
            
            const btnYes = document.createElement('button');
            btnYes.id = `btn-yes-${q.id}`;
            btnYes.className = "py-2.5 rounded-md text-sm font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
            btnYes.innerHTML = '<i class="fa-solid fa-check"></i> JA'; 
            btnYes.addEventListener('click', () => setAnswer(q.id, 'yes'));
            
            const btnNo = document.createElement('button');
            btnNo.id = `btn-no-${q.id}`;
            btnNo.className = "py-2.5 rounded-md text-sm font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
            btnNo.innerHTML = '<i class="fa-solid fa-xmark"></i> NEE';
            btnNo.addEventListener('click', () => setAnswer(q.id, 'no'));

            btnGrid.appendChild(btnYes); btnGrid.appendChild(btnNo); item.appendChild(btnGrid);

            const actionBox = document.createElement('div');
            actionBox.id = `action-box-${q.id}`;
            actionBox.className = "hidden mt-3 bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800 action-required";
            const label = createEl('label', "block text-[10px] font-bold text-red-700 dark:text-red-400 uppercase mb-1", "Verplichte Actie / Maatregel");
            const input = document.createElement('input');
            input.type = "text";
            input.id = `action-input-${q.id}`;
            input.className = "w-full bg-white dark:bg-slate-800 border border-red-300 dark:border-red-700 rounded p-2 text-xs focus:outline-none focus:ring-1 focus:ring-red-500 disabled:opacity-60";
            input.placeholder = "Wat doe je om dit veilig te maken?";
            input.addEventListener('input', (e) => saveAction(q.id, e.target.value));

            actionBox.appendChild(label); actionBox.appendChild(input); item.appendChild(actionBox);
            qList.appendChild(item);
        });
        section.appendChild(qList); container.appendChild(section);
    });
}

function setAnswer(id, value) {
    if(document.getElementById('submitBtn').disabled && document.getElementById('submitBtnText').innerText.includes("Loopt")) return;

    answers[id] = value;
    const btnYes = document.getElementById(`btn-yes-${id}`); const btnNo = document.getElementById(`btn-no-${id}`);
    const actionBox = document.getElementById(`action-box-${id}`);
    const base = "py-2.5 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ";
    const inactive = "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600";
    btnYes.className = base + inactive; btnNo.className = base + inactive;
    if (value === 'yes') {
        btnYes.className = base + "bg-green-600 text-white shadow-md ring-2 ring-green-600/30";
        actionBox.classList.add('hidden');
        delete actions[id];
    } else {
        btnNo.className = base + "bg-red-600 text-white shadow-md ring-2 ring-red-600/30";
        actionBox.classList.remove('hidden');
        setTimeout(() => document.getElementById(`action-input-${id}`).focus(), 100);
    }
}

function saveAction(id, text) { actions[id] = DOMPurify.sanitize(text); }

async function evaluateLMRA() {
    const declaration = document.getElementById('declarationCheck');
    if (!declaration.checked) { showToast("⚠️ Vink de verklaring van waarheid aan!"); declaration.focus(); return; }

    const userName = DOMPurify.sanitize(document.getElementById('userName').value);
    const task = DOMPurify.sanitize(document.getElementById('taskLocation').value);
    const workOrder = DOMPurify.sanitize(document.getElementById('workOrder').value) || "N.v.t.";
    let comments = DOMPurify.sanitize(document.getElementById('comments').value) || "Geen";
    const tStart = document.getElementById('timeStart').value;
    const tEnd = document.getElementById('timeEnd').value;
    
    if(!userName) { showToast("Vul naam monteur in!"); return; }
    if(!task) { showToast("Vul locatie in!"); document.getElementById('taskLocation').focus(); return; }
    
    const totalQuestions = categories.reduce((acc, cat) => acc + cat.questions.length, 0);
    if (Object.keys(answers).length < totalQuestions) { showToast("Beantwoord alle vragen!"); return; }

    let missingActions = false;
    for (const [id, val] of Object.entries(answers)) {
        if (val === 'no' && (!actions[id] || actions[id].trim() === '')) missingActions = true;
    }
    if (missingActions) { showToast("Vul een actie in bij elk 'NEE' antwoord!"); return; }

    comments += ` [Geldig: ${tStart} - ${tEnd}]`;
    const now = new Date(); const [endH, endM] = tEnd.split(':');
    const validUntilDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endH, endM);
    if(validUntilDate < now && parseInt(endH) < 12) validUntilDate.setDate(validUntilDate.getDate() + 1);
    
    const buddyRequired = document.getElementById('buddyToggle').checked;
    const buddyName = DOMPurify.sanitize(document.getElementById('buddyName').value);
    if(buddyRequired) {
        if(!buddyName) { showToast("Vul Buddy naam in!"); return; }
        comments += ` (Buddy: ${buddyName})`;
    }

    await safeStorage.set('lmra_username', userName);

    const btn = document.getElementById('submitBtn');
    const btnText = document.getElementById('submitBtnText');
    const originalText = btnText.innerText;
    btnText.innerText = 'Verwerken...';
    btn.disabled = true;

    let isSafe = true; let failedPoints = [];
    categories.forEach(cat => { 
        cat.questions.forEach(q => { 
            if (q.type === 'positive' && answers[q.id] === 'no') { 
                isSafe = false; 
                const actionText = actions[q.id] ? ` (Actie: ${actions[q.id]})` : ' (Geen actie)';
                failedPoints.push(q.text + actionText); 
            } 
        }); 
    });

    await saveToLocalHistory(isSafe, userName, task, workOrder, comments, failedPoints, buddyRequired ? buddyName : null, `${tStart} - ${tEnd}`, validUntilDate.toISOString());
    
    // START SUPABASE SUBMIT
    await saveToCloudWithRetry(isSafe, userName, task, workOrder, comments, failedPoints);

    if (isSafe) {
        await safeStorage.set('lmra_valid_until', validUntilDate.toISOString());
        document.getElementById('pauseAlert').classList.add('hidden');
        await safeStorage.set(ACTIVE_SESSION_KEY, { date: new Date().toDateString(), name: userName, task: task, wo: workOrder });
        checkResumeState();
    } else {
        btnText.innerText = originalText;
        btn.disabled = false;
    }
    showResult(isSafe, failedPoints, userName, task, workOrder, comments, buddyRequired ? buddyName : null, `${tStart} - ${tEnd}`);
}

async function saveToCloudWithRetry(isSafe, monteur_naam, locatie, werkorder, opmerkingen, afkeurpunten) {
    const cloudStatus = document.getElementById('cloudStatus');
    cloudStatus.classList.remove('hidden');
    cloudStatus.innerText = "Syncen...";
    
    const honeypotVal = document.getElementById('contact_email').value;
    if (honeypotVal) { console.warn("Bot detected"); return; } 

    const reportId = crypto.randomUUID();
    
    const payload = { 
        report_id: reportId,
        monteur_naam, locatie, werkorder, 
        is_veilig: isSafe, 
        opmerkingen, 
        afkeurpunten: JSON.stringify(afkeurpunten)
    };

    if (!navigator.onLine) {
        await addToSyncQueue(payload);
        cloudStatus.innerText = "💾 Offline (Wachtrij)";
        cloudStatus.classList.add("text-yellow-200");
        return;
    }

    try {
        // DIRECT NAAR SUPABASE
        const { error } = await _supabase
            .from('lmra_reports')
            .insert([payload]);

        if (error) {
            if (error.code === '23505') { throw new Error("Duplicaat"); }
            throw error;
        }

        cloudStatus.innerText = "☁️ Opgeslagen in Supabase";
        cloudStatus.classList.add("text-green-200");
        cloudStatus.classList.remove("text-yellow-200");
    } catch (e) { 
        if (e.message !== "Duplicaat") {
            console.warn("Supabase fout:", e);
            await addToSyncQueue(payload);
            cloudStatus.innerText = "💾 Error (Wachtrij)";
            cloudStatus.classList.add("text-yellow-200");
        } else {
            cloudStatus.innerText = "☁️ Opgeslagen (Duplicaat Genegeerd)";
            cloudStatus.classList.add("text-green-200");
        }
    }
}

async function addToSyncQueue(data) {
    let queue = await safeStorage.get(SYNC_QUEUE_KEY) || [];
    queue.push(data);
    await safeStorage.set(SYNC_QUEUE_KEY, queue);
    showToast(`Offline! Rapport in wachtrij gezet (${queue.length})`);
}

async function processSyncQueue() {
    let queue = await safeStorage.get(SYNC_QUEUE_KEY) || [];
    if (queue.length === 0 || !navigator.onLine) return;

    showToast(`🔄 Synchroniseren van ${queue.length} rapporten...`);
    const remainingQueue = [];
    let successCount = 0;

    for (const item of queue) {
        try {
            const { error } = await _supabase
                .from('lmra_reports')
                .insert([item]);
            
            if (!error) {
                successCount++;
            } else {
                if (error.code === '23505') { 
                    successCount++; 
                } else {
                    remainingQueue.push(item);
                }
            }
        } catch (e) {
            remainingQueue.push(item);
        }
    }

    await safeStorage.set(SYNC_QUEUE_KEY, remainingQueue);
    if (successCount > 0) { showToast(`✅ ${successCount} rapporten verzonden!`); }
}
// ... (rest van de app.js functies blijven hetzelfde)

function checkChangelog() {
    const storedVersion = localStorage.getItem('lmra_version');
    if (storedVersion !== APP_VERSION) {
        document.getElementById('updateModal').classList.remove('hidden');
    }
}

function closeUpdateModal() {
    localStorage.setItem('lmra_version', APP_VERSION);
    document.getElementById('updateModal').classList.add('hidden');
}

async function checkResumeState() {
    const session = await safeStorage.get(ACTIVE_SESSION_KEY);
    const resumeBar = document.getElementById('resumeBar');
    if (!resumeBar) return;
    
    if (session) {
        const today = new Date().toDateString();
        if (session.date === today) {
            resumeBar.classList.remove('hidden');
            document.getElementById('userName').value = session.name || '';
            document.getElementById('taskLocation').value = session.task || '';
            document.getElementById('workOrder').value = session.wo || '';
            toggleFormLock(true);
        } else {
            safeStorage.removeItem(ACTIVE_SESSION_KEY);
            resumeBar.classList.add('hidden');
            toggleFormLock(false);
        }
    } else {
        resumeBar.classList.add('hidden');
        toggleFormLock(false);
    }
}

function triggerResumeFlow() {
    document.getElementById('resumeCheckModal').classList.remove('hidden');
}

function cancelResume() {
    document.getElementById('resumeCheckModal').classList.add('hidden');
    document.getElementById('resumeBar').classList.add('hidden');
    safeStorage.removeItem(ACTIVE_SESSION_KEY);
    safeStorage.removeItem('lmra_valid_until');
    toggleFormLock(false);
    resetApp();
}

async function confirmResume() {
    document.getElementById('resumeCheckModal').classList.add('hidden');
    const now = new Date();
    const end = new Date(now.getTime() + 4*60*60*1000);
    const endStr = end.toTimeString().slice(0,5);
    document.getElementById('timeEnd').value = endStr;
    
    const history = await safeStorage.get('lmra_history') || [];
    if (history.length > 0) {
        const latest = history[0];
        if (!latest.rechecks) latest.rechecks = [];
        latest.rechecks.push(new Date().toLocaleTimeString());
        latest.timeRange = `${latest.timeRange.split('-')[0]} - ${endStr}`;
        await safeStorage.set('lmra_history', history);
    }
    showToast("✅ Werkzaamheden hervat. Tijd verlengd.");
}

async function saveToLocalHistory(isSafe, name, task, wo, comments, fails, buddy, timeRange, validUntilISO) {
    const entry = { date: new Date().toISOString(), isSafe, name, task, wo, comments, fails, buddy, timeRange, validUntil: validUntilISO };
    let history = await safeStorage.get('lmra_history') || [];
    history.unshift(entry); if(history.length > 50) history.pop();
    await safeStorage.set('lmra_history', history);
}

function showResult(isSafe, failedPoints, name, task, workOrder, comments, buddy, timeRange) {
    const modal = document.getElementById('resultModal'); modal.classList.remove('hidden');
    const now = new Date(); const dateStr = now.toLocaleDateString('nl-NL'); const timeStr = now.toLocaleTimeString('nl-NL', {hour: '2-digit', minute:'2-digit'});
    const header = document.getElementById('resultHeader'); const icon = document.getElementById('resultIcon'); const title = document.getElementById('resultTitle'); const message = document.getElementById('resultMessage'); const log = document.getElementById('logText');
    
    let logHtml = `<strong>✅ LMRA GOEDGEKEURD</strong><br>---------------------------<br>📅 ${dateStr} ⏰ ${timeStr}<br>⏳ Geldig: ${timeRange}<br>👤 ${name}<br>📍 ${task}<br>📋 WO: ${workOrder}<br>`;
    if(buddy) logHtml += `👥 Buddy: ${buddy}<br>`;
    logHtml += `---------------------------<br>💬 ${comments}`;
    if (isSafe) {
        header.className = "p-8 text-center text-white shrink-0 bg-green-600"; icon.innerHTML = '<i class="fa-solid fa-shield-check"></i>'; title.innerText = "VEILIG"; message.innerText = "Alle checks zijn akkoord.";
        log.innerHTML = logHtml;
    } else {
        header.className = "p-8 text-center text-white shrink-0 bg-red-600"; icon.innerHTML = '<i class="fa-solid fa-hand-paper"></i>'; title.innerText = "STOP!"; message.innerText = "Risico's aanwezig! Niet starten.";
        let failureText = failedPoints.map(p => `- ${p}`).join('<br>');
        log.innerHTML = `<strong>🛑 LMRA AFGEKEURD</strong><br>---------------------------<br>📅 ${dateStr} ⏰ ${timeStr}<br>👤 ${name}<br>📍 ${task}<br>📋 WO: ${workOrder}<br>---------------------------<br>⚠️ <strong>Afkeurpunten & Acties:</strong><br>${failureText}<br>---------------------------<br>💬 ${comments}`;
    }
}

function closeModal() { 
    document.getElementById('resultModal').classList.add('hidden'); 
    if(!document.getElementById('submitBtn').disabled) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return { week: Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7), year: d.getUTCFullYear() };
}

async function openArchive() {
    const container = document.getElementById('archiveContainer'); 
    const history = await safeStorage.get('lmra_history') || [];
    container.innerHTML = '';
    if(history.length === 0) { container.innerHTML = '<div class="text-center text-slate-400 p-8">Nog geen archief data</div>'; document.getElementById('archiveModal').classList.remove('hidden'); return; }
    
    const weeks = {};
    history.forEach((item, index) => {
        let date; try { date = new Date(item.date); if(isNaN(date)) throw new Error(); } catch(e) { date = new Date(); }
        const weekInfo = getWeekNumber(date);
        const key = `Week ${weekInfo.week} - ${weekInfo.year}`;
        if(!weeks[key]) weeks[key] = [];
        item.originalIndex = index;
        weeks[key].push(item);
    });

    Object.keys(weeks).forEach((weekKey, i) => {
        const weekItems = weeks[weekKey];
        const isOpen = i === 0; 
        const weekSection = document.createElement('div');
        weekSection.className = "mb-3 bg-white dark:bg-cardbg rounded-lg shadow-sm overflow-hidden border border-slate-100 dark:border-slate-700";
        weekSection.innerHTML = `
            <div id="header-${weekKey.replace(/\s/g,'')}" class="p-3 bg-slate-50 dark:bg-slate-800 flex justify-between items-center cursor-pointer select-none">
                <span class="font-bold text-slate-600 dark:text-slate-300 text-sm">${weekKey}</span>
                <i id="icon-${weekKey.replace(/\s/g,'')}" class="fa-solid fa-chevron-down text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}"></i>
            </div>
            <div id="content-${weekKey.replace(/\s/g,'')}" class="accordion-content ${isOpen ? '' : 'max-h-0'}">
                <div class="p-2 space-y-2" id="list-${weekKey.replace(/\s/g,'')}"></div>
            </div>
        `;
        container.appendChild(weekSection);
        
        document.getElementById(`header-${weekKey.replace(/\s/g,'')}`).addEventListener('click', () => toggleWeek(weekKey));

        const listContainer = weekSection.querySelector(`#list-${weekKey.replace(/\s/g,'')}`);
        weekItems.forEach(item => {
            let dateStr = "??-??"; let timeStr = "??:??";
            try { const d = new Date(item.date); dateStr = d.toLocaleDateString('nl-NL', {weekday:'short'}); timeStr = d.toLocaleTimeString('nl-NL', {hour:'2-digit', minute:'2-digit'}); } catch(e){}
            let statusDot = item.isSafe ? 'bg-green-500' : 'bg-red-500'; let statusText = item.isSafe ? 'Actief' : 'Afgekeurd';
            if (item.isSafe && item.validUntil && new Date() > new Date(item.validUntil)) { statusDot = 'bg-slate-400'; statusText = 'Verlopen'; }
            
            let recheckBadge = "";
            if(item.rechecks && item.rechecks.length > 0) {
                recheckBadge = `<span class="ml-2 bg-orange-100 text-orange-700 text-[9px] px-1.5 py-0.5 rounded border border-orange-200">Hervat (${item.rechecks.length}x)</span>`;
            }

            const itemDiv = document.createElement('div');
            itemDiv.className = `cursor-pointer bg-slate-50 dark:bg-slate-800/50 p-3 rounded border-l-4 ${item.isSafe ? "border-green-500" : "border-red-500"} hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors`;
            itemDiv.innerHTML = `<div class="flex justify-between items-start mb-1"><span class="font-bold text-slate-700 dark:text-slate-200 text-sm truncate w-2/3">${item.task || 'Onbekend'}</span><div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full ${statusDot}"></span><span class="text-[10px] text-slate-400 uppercase font-bold">${statusText}</span></div></div><div class="flex justify-between items-end"><div class="text-xs text-slate-500 dark:text-slate-400">${dateStr} ${timeStr}${recheckBadge}<br>WO: ${item.wo || '-'}</div><i class="fa-solid fa-chevron-right text-slate-300 text-xs"></i></div>`;
            itemDiv.addEventListener('click', () => showDetail(item.originalIndex));
            
            listContainer.appendChild(itemDiv);
        });
    });
    document.getElementById('archiveModal').classList.remove('hidden');
}

function toggleWeek(key) {
    const safeKey = key.replace(/\s/g,'');
    const content = document.getElementById(`content-${safeKey}`);
    const icon = document.getElementById(`icon-${safeKey}`);
    if (content.style.maxHeight) { content.style.maxHeight = null; icon.classList.remove('rotate-180'); } 
    else { content.style.maxHeight = content.scrollHeight + "px"; icon.classList.add('rotate-180'); }
}

async function showDetail(index) {
    const history = await safeStorage.get('lmra_history') || []; const item = history[index]; 
    let dateStr = "Onbekend"; try { dateStr = `${new Date(item.date).toLocaleDateString('nl-NL')} ${new Date(item.date).toLocaleTimeString('nl-NL')}`; } catch(e){}
    document.getElementById('detailDate').innerText = dateStr;
    document.getElementById('detailTimeRange').innerText = item.timeRange || "Onbekend"; 
    document.getElementById('detailName').innerText = item.name; document.getElementById('detailLoc').innerText = item.task; document.getElementById('detailWO').innerText = item.wo; document.getElementById('detailComments').innerText = item.comments || "Geen opmerkingen.";
    const buddyBox = document.getElementById('detailBuddyBox');
    if(item.buddy) { document.getElementById('detailBuddy').innerText = item.buddy; buddyBox.classList.remove('hidden'); } else { buddyBox.classList.add('hidden'); }
    
    if(item.rechecks && item.rechecks.length > 0) {
        document.getElementById('detailComments').innerText += `\n\n[INFO] Werkzaamheden hervat om: ${item.rechecks.join(', ')}`;
    }

    const statusBox = document.getElementById('detailStatusBox'); const detailIcon = document.getElementById('detailIcon'); const failsContainer = document.getElementById('detailFailsContainer'); const failsList = document.getElementById('detailFails');
    if(item.isSafe) { statusBox.className = "bg-green-100 border border-green-300 text-green-800 p-3 rounded-lg text-center font-bold mb-6"; statusBox.innerText = "VEILIG OM TE STARTEN"; detailIcon.className = "text-4xl text-green-600"; detailIcon.innerHTML = '<i class="fa-solid fa-shield-check"></i>'; failsContainer.classList.add('hidden'); } 
    else { statusBox.className = "bg-red-100 border border-red-300 text-red-800 p-3 rounded-lg text-center font-bold mb-6"; statusBox.innerText = "NIET GESTART - RISICO'S"; detailIcon.className = "text-4xl text-red-600"; detailIcon.innerHTML = '<i class="fa-solid fa-hand"></i>'; failsContainer.classList.remove('hidden'); failsList.innerHTML = item.fails.map(f => `<li>${f}</li>`).join(''); }
    document.getElementById('detailModal').classList.remove('hidden');
}

function generatePDF() { const element = document.getElementById('pdfContent'); const opt = { margin: 10, filename: `LMRA_Rapport_${new Date().toISOString().slice(0,10)}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }; html2pdf().set(opt).from(element).save(); }
function copyToClipboard() { const html = document.getElementById('logText').innerHTML; const text = html.replace(/<br>/g, "\n").replace(/<strong>|<\/strong>/g, "").replace(/&nbsp;/g, " "); navigator.clipboard.writeText(text).then(() => showToast("Gekopieerd!")).catch(() => showToast("Fout")); }
function toggleDarkMode() { document.documentElement.classList.toggle('dark'); darkMode = !darkMode; localStorage.setItem('lmra_theme', darkMode ? 'dark' : 'light'); checkTheme(); }
function checkTheme() { const st = localStorage.getItem('lmra_theme'); if (st === 'dark' || (!st && window.matchMedia('(prefers-color-scheme: dark)').matches)) { document.documentElement.classList.add('dark'); darkMode = true; } else { document.documentElement.classList.remove('dark'); darkMode = false; } document.getElementById('themeIcon').className = darkMode ? "fa-solid fa-sun" : "fa-solid fa-moon"; }
function closeArchive() { document.getElementById('archiveModal').classList.add('hidden'); } function closeDetail() { document.getElementById('detailModal').classList.add('hidden'); } function showToast(msg) { const t = document.getElementById('toast'); document.getElementById('toastMsg').innerText = msg; t.style.opacity = '1'; setTimeout(() => t.style.opacity = '0', 3000); }
function resetApp(confirmNeeded = true) { if(!confirmNeeded || confirm('Velden leegmaken?')) { answers = {}; actions = {}; document.getElementById('taskLocation').value = ''; document.getElementById('workOrder').value = ''; document.getElementById('comments').value = ''; renderCategories(); setDefaultTimes(); toggleFormLock(false); safeStorage.removeItem(ACTIVE_SESSION_KEY); document.getElementById('resumeBar').classList.add('hidden'); } }
async function loadUserData() { const sn = await safeStorage.get('lmra_username'); if(sn) document.getElementById('userName').value = sn; }
function clearArchive() { if(confirm("Archief wissen?")) { safeStorage.removeItem('lmra_history'); openArchive(); } }

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('SW Registered', reg.scope))
            .catch(err => console.log('SW Fail', err));
    });
}