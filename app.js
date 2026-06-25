// CONFIGURATION: Set your Supabase credentials here for public deployment.
// If these are set, users will NOT see the database setup screen.
const CONFIG = {
    supabaseUrl: "https://yumipvxtxqmqafuntngk.supabase.co", // Paste your Supabase Project URL here
    supabaseKey: "sb_publishable_h6Wk3jnraMsbW9qyWX0HTQ_G3w4t_XU"  // Paste your Supabase Anon Key here
};

// Global state variables
let db = null;
let currentRole = 'voter';
let currentDeviceId = null;

// Built-in Retro Suspect Silhouettes (SVG markup)
const SUSPECT_SILHOUETTES = {
    'detective': `
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 15c-11 0-20 9-20 20v2h40v-2c0-11-9-20-20-20z" fill="currentColor"/>
            <path d="M22 35h56c2 0 4 2 4 4s-2 4-4 4H22c-2 0-4-2-4-4s2-4 4-4z" fill="currentColor"/>
            <path d="M50 43c-10 0-16 6-16 14v10c0 4 3 7 7 7h18c4 0 7-3 7-7V57c0-8-6-14-16-14z" fill="currentColor"/>
            <path d="M30 85c0-10 10-18 20-18s20 8 20 18H30z" fill="currentColor"/>
        </svg>
    `,
    'lady-beret': `
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 14c-15 0-25 7-23 15 2 7 13 5 23 5s21 2 23-5c2-8-8-15-23-15z" fill="currentColor"/>
            <circle cx="50" cy="17" r="4" fill="currentColor"/>
            <path d="M50 34c-9 0-15 7-15 15v10c0 5 4 9 9 9h12c5 0 9-4 9-9V49c0-8-6-15-15-15z" fill="currentColor"/>
            <path d="M32 85c0-8 8-15 18-15s18 7 18 15H32z" fill="currentColor"/>
        </svg>
    `,
    'butler': `
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="38" r="16" fill="currentColor"/>
            <path d="M35 70c0-12 8-20 15-20s15 8 15 20v15H35V70z" fill="currentColor"/>
            <path d="M50 60l-8-6h16l-8 6z" fill="#FFF"/>
            <path d="M47 60l3-2 3 2-3 2-3-2z" fill="currentColor"/>
        </svg>
    `,
    'lady-hat': `
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="50" cy="30" rx="38" ry="12" fill="currentColor"/>
            <path d="M38 28c0-8 5-13 12-13s12 5 12 13H38z" fill="currentColor"/>
            <path d="M50 38c-8 0-14 6-14 14v8c0 4 3 7 7 7h14c4 0 7-3 7-7v-8c0-8-6-14-14-14z" fill="currentColor"/>
            <path d="M33 85c0-8 7-15 17-15s17 7 17 15H33z" fill="currentColor"/>
        </svg>
    `,
    'bald-mustache': `
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="38" r="16" fill="currentColor"/>
            <path d="M41 45c2-1 5 1 9 0s5-1 9 0c1 2-2 4-9 4s-10-2-9-4z" fill="currentColor"/>
            <path d="M34 75c0-10 8-18 16-18s16 8 16 18v10H34V75z" fill="currentColor"/>
        </svg>
    `,
    'question': `
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 20c-11 0-20 9-20 20 0 3 2 5 5 5s5-2 5-5c0-6 5-10 10-10s10 4 10 10c0 5-3 8-6 11l-4 4c-4 4-5 8-5 13v2c0 3 2 5 5 5s5-2 5-5v-1c0-4 1-6 4-9l4-4c4-4 8-10 8-17 0-11-9-20-20-20z" fill="currentColor"/>
            <circle cx="50" cy="78" r="6" fill="currentColor"/>
        </svg>
    `,
    'none': `
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="35" stroke="currentColor" stroke-width="8" fill="none" opacity="0.4" />
            <line x1="25" y1="25" x2="75" y2="75" stroke="currentColor" stroke-width="8" stroke-linecap="round" opacity="0.4" />
        </svg>
    `
};

// Helper function to render a silhouette SVG or custom image
function getSilhouetteSvg(name) {
    if (name && (name.startsWith('data:image/') || name.startsWith('http://') || name.startsWith('https://'))) {
        return `<img src="${name}" alt="Suspect" class="suspect-custom-img">`;
    }
    return SUSPECT_SILHOUETTES[name] || SUSPECT_SILHOUETTES['question'];
}

// Custom Modal Dialog Helpers
window.showCustomAlert = function(message, title = 'Hinweis') {
    return new Promise((resolve) => {
        const dialog = document.getElementById('custom-dialog-container');
        const titleEl = document.getElementById('dialog-title');
        const messageEl = document.getElementById('dialog-message');
        const inputContainer = document.getElementById('dialog-input-container');
        const cancelBtn = document.getElementById('dialog-cancel-btn');
        const okBtn = document.getElementById('dialog-ok-btn');

        titleEl.textContent = title;
        messageEl.textContent = message;
        
        inputContainer.classList.add('hidden');
        cancelBtn.classList.add('hidden');
        
        const cleanUp = () => {
            document.removeEventListener('keydown', handleKeyPress);
            dialog.classList.add('hidden');
        };

        const handleKeyPress = (e) => {
            if (e.key === 'Enter' || e.key === 'Escape') {
                e.preventDefault();
                cleanUp();
                resolve();
            }
        };
        document.addEventListener('keydown', handleKeyPress);

        okBtn.onclick = () => {
            cleanUp();
            resolve();
        };

        dialog.classList.remove('hidden');
        okBtn.focus();
    });
};

window.showCustomConfirm = function(message, title = 'Bestätigen') {
    return new Promise((resolve) => {
        const dialog = document.getElementById('custom-dialog-container');
        const titleEl = document.getElementById('dialog-title');
        const messageEl = document.getElementById('dialog-message');
        const inputContainer = document.getElementById('dialog-input-container');
        const cancelBtn = document.getElementById('dialog-cancel-btn');
        const okBtn = document.getElementById('dialog-ok-btn');

        titleEl.textContent = title;
        messageEl.textContent = message;
        
        inputContainer.classList.add('hidden');
        cancelBtn.classList.remove('hidden');
        
        const cleanUp = () => {
            document.removeEventListener('keydown', handleKeyPress);
            dialog.classList.add('hidden');
        };

        const handleKeyPress = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                cleanUp();
                resolve(true);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cleanUp();
                resolve(false);
            }
        };
        document.addEventListener('keydown', handleKeyPress);
        
        cancelBtn.onclick = () => {
            cleanUp();
            resolve(false);
        };
        
        okBtn.onclick = () => {
            cleanUp();
            resolve(true);
        };

        dialog.classList.remove('hidden');
        okBtn.focus();
    });
};

window.showCustomPrompt = function(message, placeholder = '', isPassword = false, title = 'Eingabe') {
    return new Promise((resolve) => {
        const dialog = document.getElementById('custom-dialog-container');
        const titleEl = document.getElementById('dialog-title');
        const messageEl = document.getElementById('dialog-message');
        const inputContainer = document.getElementById('dialog-input-container');
        const inputField = document.getElementById('dialog-input-field');
        const cancelBtn = document.getElementById('dialog-cancel-btn');
        const okBtn = document.getElementById('dialog-ok-btn');

        titleEl.textContent = title;
        messageEl.textContent = message;
        
        inputContainer.classList.remove('hidden');
        cancelBtn.classList.remove('hidden');
        
        inputField.value = '';
        inputField.placeholder = placeholder;
        inputField.type = isPassword ? 'password' : 'text';
        
        setTimeout(() => inputField.focus(), 50);

        const cleanUp = () => {
            inputField.removeEventListener('keydown', handleKeyPress);
            dialog.classList.add('hidden');
        };

        const handleKeyPress = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                cleanUp();
                resolve(inputField.value);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cleanUp();
                resolve(null);
            }
        };
        inputField.addEventListener('keydown', handleKeyPress);

        cancelBtn.onclick = () => {
            cleanUp();
            resolve(null);
        };
        
        okBtn.onclick = () => {
            cleanUp();
            resolve(inputField.value);
        };

        dialog.classList.remove('hidden');
    });
};

// App Initialization
document.addEventListener('DOMContentLoaded', async () => {
    initDevice();
    parseUrlCredentials();
    await checkDbConfiguration();
});

// Create or fetch unique voter device ID to enforce one vote per device
function initDevice() {
    currentDeviceId = localStorage.getItem('voter_device_id');
    if (!currentDeviceId) {
        currentDeviceId = 'voter_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('voter_device_id', currentDeviceId);
    }
}

// Parse Supabase credentials from URL parameters (if present, e.g. when voter scans QR)
// Format: ?role=voter&sb_url=https://xyz.supabase.co&sb_key=eyJ...
function parseUrlCredentials() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Parse role
    if (urlParams.has('role')) {
        currentRole = urlParams.get('role');
    }

    let credentialsUpdated = false;
    
    if (urlParams.has('sb_url') && urlParams.has('sb_key')) {
        localStorage.setItem('supabaseUrl', urlParams.get('sb_url'));
        localStorage.setItem('supabaseKey', urlParams.get('sb_key'));
        credentialsUpdated = true;
    }
    
    if (urlParams.has('admin_pwd')) {
        localStorage.setItem('adminPassword', urlParams.get('admin_pwd'));
        credentialsUpdated = true;
    }

    // Clean up sensitive credentials from address bar
    if (credentialsUpdated) {
        const cleanParams = new URLSearchParams(window.location.search);
        cleanParams.delete('sb_url');
        cleanParams.delete('sb_key');
        cleanParams.delete('admin_pwd');
        
        const cleanQuery = cleanParams.toString();
        const newUrl = window.location.pathname + (cleanQuery ? '?' + cleanQuery : '');
        window.history.replaceState({}, document.title, newUrl);
    }
}

// Check if credentials exist, if so init Supabase, else show Setup Screen
async function checkDbConfiguration() {
    let sbUrl = CONFIG.supabaseUrl;
    let sbKey = CONFIG.supabaseKey;

    // Fallback to local storage if config is empty
    if (!sbUrl || !sbKey) {
        sbUrl = localStorage.getItem('supabaseUrl');
        sbKey = localStorage.getItem('supabaseKey');
    }

    if (!sbUrl || !sbKey) {
        showView('db-setup');
        setupDbFormHandler();
    } else {
        try {
            // Initialize Supabase client with admin password header if available
            const adminPassword = localStorage.getItem('adminPassword') || '';
            db = supabase.createClient(sbUrl, sbKey, {
                global: {
                    headers: {
                        'x-admin-password': adminPassword
                    }
                }
            });
            
            // Route to appropriate view
            await routeToRole();
        } catch (error) {
            console.error('Supabase Init Fehler:', error);
            await showCustomAlert('Datenbank-Verbindungsfehler! Bitte überprüfe deine URL und den Anon Key.');
            localStorage.removeItem('supabaseUrl');
            localStorage.removeItem('supabaseKey');
            showView('db-setup');
            setupDbFormHandler();
        }
    }
}

// Setup DB credentials submission form
function setupDbFormHandler() {
    const form = document.getElementById('db-setup-form');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const url = document.getElementById('db-url').value.trim();
            const key = document.getElementById('db-anon-key').value.trim();
            const pwd = document.getElementById('admin-password').value.trim();

            localStorage.setItem('supabaseUrl', url);
            localStorage.setItem('supabaseKey', key);
            localStorage.setItem('adminPassword', pwd);

            await showCustomAlert('Verbindung erfolgreich gespeichert!');
            await checkDbConfiguration();
        };
    }
}

// Handle routing to the correct layout container
async function routeToRole() {
    if (currentRole === 'admin') {
        let password = localStorage.getItem('adminPassword');
        if (!password) {
            const promptPassword = await showCustomPrompt('Bitte Admin-Passwort eingeben:', 'Passwort...', true, 'ADMIN-LOGIN');
            if (promptPassword) {
                localStorage.setItem('adminPassword', promptPassword);
                password = promptPassword;
                
                // Re-initialize Supabase client with the entered password header
                const sbUrl = CONFIG.supabaseUrl || localStorage.getItem('supabaseUrl');
                const sbKey = CONFIG.supabaseKey || localStorage.getItem('supabaseKey');
                db = supabase.createClient(sbUrl, sbKey, {
                    global: {
                        headers: {
                            'x-admin-password': password
                        }
                    }
                });
            } else {
                currentRole = 'voter'; // Fallback
                await routeToRole();
                return;
            }
        }
        showView('admin');
        if (typeof initAdmin === 'function') initAdmin();
    } else if (currentRole === 'presenter') {
        showView('presenter');
        if (typeof initPresenter === 'function') initPresenter();
    } else {
        showView('voter');
        if (typeof initVoter === 'function') initVoter();
    }
}

// Core helper to toggle HTML container visibility
function showView(viewName) {
    document.getElementById('db-setup-container').classList.add('hidden');
    document.getElementById('voter-view').classList.add('hidden');
    document.getElementById('presenter-view').classList.add('hidden');
    document.getElementById('admin-view').classList.add('hidden');

    if (viewName === 'db-setup') {
        document.getElementById('db-setup-container').classList.remove('hidden');
    } else if (viewName === 'voter') {
        document.getElementById('voter-view').classList.remove('hidden');
    } else if (viewName === 'presenter') {
        document.getElementById('presenter-view').classList.remove('hidden');
    } else if (viewName === 'admin') {
        document.getElementById('admin-view').classList.remove('hidden');
    }
}

// ==========================================================================
// COUNTDOWN TIMER & HELPERS FOR STOPWATCH WITH PIE CHART
// ==========================================================================

function parseQuestionText(rawText) {
    if (!rawText) return { text: '', timer: 0 };
    const parts = rawText.split('|timer:');
    if (parts.length > 1) {
        return {
            text: parts[0],
            timer: parseInt(parts[1], 10) || 0
        };
    }
    return { text: rawText, timer: 0 };
}

function formatQuestionText(text, timer) {
    if (timer && timer > 0) {
        return `${text}|timer:${timer}`;
    }
    return text;
}

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
    };
}

function getPiePath(x, y, radius, startAngle, endAngle) {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    const d = [
        "M", x, y,
        "L", start.x, start.y,
        "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
        "Z"
    ].join(" ");
    return d;
}

function updateStopwatch(element, fraction, secondsLeft) {
    if (!element) return;
    const piePath = element.querySelector('.stopwatch-pie');
    const textEl = element.querySelector('.stopwatch-text');
    
    if (textEl) {
        textEl.textContent = secondsLeft;
    }
    
    if (piePath) {
        if (fraction <= 0) {
            piePath.setAttribute('d', '');
        } else if (fraction >= 0.999) {
            piePath.setAttribute('d', getPiePath(50, 50, 42, 0, 359.9));
        } else {
            const endAngle = fraction * 360;
            piePath.setAttribute('d', getPiePath(50, 50, 42, 0, endAngle));
        }
    }
}

