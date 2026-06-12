const CAMERA_SVG = `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="width: 70%; height: 70%; fill: currentColor;">
        <path d="M15 35h15l5-8h30l5 8h15c3 0 5 2 5 5v40c0 3-2 5-5 5H15c-3 0-5-2-5-5V40c0-3 2-5 5-5z" />
        <circle cx="50" cy="57" r="15" fill="none" stroke="currentColor" stroke-width="6"/>
    </svg>
`;

let adminQuestions = [];
let adminState = {
    active_question_id: null,
    show_results: false
};
let adminVoteCount = 0;

// Initialize Admin Screen
async function initAdmin() {
    setupAdminEventListeners();
    await fetchState();
    await fetchQuestions();
    await fetchVoteCount();
    subscribeToAdminVotes();
}

// Fetch current quiz state from database
async function fetchState() {
    try {
        const { data, error } = await db
            .from('quiz_state')
            .select('*')
            .eq('id', 1)
            .maybeSingle();

        if (error) throw error;
        if (data) {
            adminState = data;
            updateAdminStateUI();
        } else {
            console.log('Quiz-Status-Zeile fehlt. Erstelle Zeile...');
            const { error: insertError } = await db
                .from('quiz_state')
                .insert([{ id: 1, show_results: false }]);
            if (insertError) throw insertError;
            // Erneut laden
            await fetchState();
        }
    } catch (err) {
        console.error('Fehler beim Laden des Quiz-Status:', err);
    }
}

// Fetch all questions from database
async function fetchQuestions() {
    try {
        const { data, error } = await db
            .from('questions')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) throw error;
        adminQuestions = data || [];
        updateAdminStateUI();
        renderAdminQuestions();
    } catch (err) {
        console.error('Fehler beim Laden der Fragen:', err);
    }
}

// Fetch vote count for the active question
async function fetchVoteCount() {
    if (!adminState.active_question_id) {
        adminVoteCount = 0;
        updateVoteCountUI();
        return;
    }
    try {
        const { count, error } = await db
            .from('votes')
            .select('*', { count: 'exact', head: true })
            .eq('question_id', adminState.active_question_id);
            
        if (error) throw error;
        adminVoteCount = count || 0;
        updateVoteCountUI();
    } catch (err) {
        console.error('Fehler beim Laden der Stimmanzahl:', err);
    }
}

// Update the vote count badge in UI
function updateVoteCountUI() {
    const voteBadge = document.getElementById('admin-vote-count-badge');
    if (voteBadge) {
        voteBadge.textContent = adminVoteCount;
    }
}

// Update the active state text and toggle button texts in UI
function updateAdminStateUI() {
    const infoText = document.getElementById('admin-active-question-info');
    const toggleBtn = document.getElementById('toggle-results-btn');
    const presenterLinkBtn = document.getElementById('presenter-link-btn');
    const voteContainer = document.querySelector('.active-q-votes');
    const pulseDot = document.querySelector('.pulse-dot');

    const activeQ = adminState.active_question_id ? adminQuestions.find(q => String(q.id) === String(adminState.active_question_id)) : null;

    // Update active question display
    if (activeQ) {
        infoText.innerHTML = `
            <div class="dossier-stamp">AKTE OFFEN</div>
            <div class="dossier-question">${activeQ.text}</div>
        `;
        if (pulseDot) {
            pulseDot.style.backgroundColor = '#4CAF50';
            pulseDot.style.animation = 'green-pulse 1.5s infinite';
        }
        if (voteContainer) voteContainer.classList.remove('hidden');
    } else {
        infoText.innerHTML = `
            <div class="dossier-stamp stamp-archived">FALL ARCHIVIERT</div>
            <div class="dossier-question-empty">Wähle eine Frage aus dem Katalog, um die Abstimmung zu starten.</div>
        `;
        if (pulseDot) {
            pulseDot.style.backgroundColor = '#C62828';
            pulseDot.style.animation = 'none';
        }
        if (voteContainer) voteContainer.classList.add('hidden');
    }

    // Update toggle results button appearance
    toggleBtn.disabled = !activeQ;

    if (adminState.show_results) {
        toggleBtn.innerHTML = '<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg> Ergebnisse verbergen';
        toggleBtn.classList.remove('btn-secondary');
    } else {
        toggleBtn.innerHTML = '<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Ergebnisse anzeigen';
        toggleBtn.classList.add('btn-secondary');
    }

    // Build the presenter link
    let presenterUrl = `${window.location.origin}${window.location.pathname}?role=presenter`;
    
    // Only append DB credentials if they are NOT hardcoded in CONFIG
    if (typeof CONFIG !== 'undefined' && (!CONFIG.supabaseUrl || !CONFIG.supabaseKey)) {
        const url = localStorage.getItem('supabaseUrl');
        const key = localStorage.getItem('supabaseKey');
        if (url && key) {
            presenterUrl += `&sb_url=${encodeURIComponent(url)}&sb_key=${encodeURIComponent(key)}`;
        }
    }
    
    const pwd = localStorage.getItem('adminPassword');
    if (pwd) {
        presenterUrl += `&admin_pwd=${encodeURIComponent(pwd)}`;
    }
    
    presenterLinkBtn.href = presenterUrl;
}

// Render the questions list in the admin panel
function renderAdminQuestions() {
    const listContainer = document.getElementById('questions-list');
    listContainer.innerHTML = '';

    if (adminQuestions.length === 0) {
        listContainer.innerHTML = `<p class="typewriter text-center" style="grid-column: 1/-1; padding: 2rem;">Noch keine Fragen angelegt. Klicke auf "+ Neue Frage".</p>`;
        return;
    }

    adminQuestions.forEach((q, index) => {
        const isActive = adminState.active_question_id && String(q.id) === String(adminState.active_question_id);
        const card = document.createElement('div');
        card.className = `q-admin-card ${isActive ? 'active' : ''}`;
        
        const suspectPills = q.options.map((opt, idx) => {
            const sil = q.silhouettes && q.silhouettes[idx] ? q.silhouettes[idx] : 'question';
            return `
                <div class="q-admin-suspect-pill" title="${opt}">
                    <span class="q-admin-suspect-avatar">${getSilhouetteSvg(sil)}</span>
                    <span class="q-admin-suspect-name">${opt}</span>
                </div>
            `;
        }).join('');
        
        card.innerHTML = `
            <div class="q-admin-details">
                <div class="q-admin-title">${index + 1}. ${q.text}</div>
                <div class="q-admin-meta" style="margin-bottom: 0.2rem;">
                    Optionen: ${q.options.length}
                </div>
                <div class="q-admin-suspect-preview">
                    ${suspectPills}
                </div>
            </div>
            <div class="q-admin-actions">
                <button class="btn-retro btn-small ${isActive ? 'btn-danger' : 'btn-success'}" onclick="toggleActiveQuestion('${q.id}')">
                    ${isActive ? 'Deaktivieren' : 'Aktivieren'}
                </button>
                <button class="btn-retro btn-small btn-secondary" onclick="openEditQuestionModal('${q.id}')" title="Bearbeiten">
                    <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 0;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button class="btn-retro btn-small btn-danger" onclick="deleteQuestion('${q.id}')" title="Löschen">
                    <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 0;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            </div>
        `;
        listContainer.appendChild(card);
    });
}

// Toggle active question in the database
async function toggleActiveQuestion(questionId) {
    const isCurrentActive = adminState.active_question_id && String(adminState.active_question_id) === String(questionId);
    const targetId = isCurrentActive ? null : questionId;

    try {
        const { error } = await db
            .from('quiz_state')
            .update({ 
                active_question_id: targetId,
                show_results: false // Hide results by default
            })
            .eq('id', 1);

        if (error) throw error;
        
        adminState.active_question_id = targetId;
        adminState.show_results = false;
        
        updateAdminStateUI();
        await fetchQuestions(); // Refresh list to show active highlight
    } catch (err) {
        console.error('Fehler beim Ändern des Fragestatus:', err);
    }
}

// Toggle showing/hiding results on the presenter screen
async function toggleResults() {
    if (!adminState.active_question_id) return;
    try {
        const newState = !adminState.show_results;
        const { error } = await db
            .from('quiz_state')
            .update({ show_results: newState })
            .eq('id', 1);

        if (error) throw error;
        adminState.show_results = newState;
        updateAdminStateUI();
    } catch (err) {
        console.error('Fehler beim Umschalten der Ergebnisse:', err);
    }
}

// Reset votes for active question
async function resetActiveVotes() {
    if (!adminState.active_question_id) {
        await showCustomAlert('Keine aktive Frage ausgewählt.');
        return;
    }
    if (!await showCustomConfirm('Möchtest du wirklich alle Stimmen für die AKTIVE Frage zurücksetzen?')) {
        return;
    }

    try {
        const { error } = await db
            .from('votes')
            .delete()
            .eq('question_id', adminState.active_question_id);

        if (error) throw error;
        await showCustomAlert('Stimmen wurden zurückgesetzt.');
    } catch (err) {
        console.error('Fehler beim Zurücksetzen der Stimmen:', err);
    }
}

// Delete question
async function deleteQuestion(questionId) {
    if (!await showCustomConfirm('Diese Frage und alle zugehörigen Stimmen wirklich löschen?')) {
        return;
    }

    try {
        // If deleting active question, unset it first in state
        if (adminState.active_question_id && String(adminState.active_question_id) === String(questionId)) {
            await db
                .from('quiz_state')
                .update({ active_question_id: null, show_results: false })
                .eq('id', 1);
            
            adminState.active_question_id = null;
            adminState.show_results = false;
        }

        const { error } = await db
            .from('questions')
            .delete()
            .eq('id', questionId);

        if (error) throw error;
        
        await fetchState();
        await fetchQuestions();
    } catch (err) {
        console.error('Fehler beim Löschen der Frage:', err);
    }
}

// Setup Event Listeners
function setupAdminEventListeners() {
    const logoutBtn = document.getElementById('admin-logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = async () => {
            if (await showCustomConfirm('Verbindung zur Datenbank wirklich trennen?')) {
                localStorage.clear();
                window.location.reload();
            }
        };
    }

    document.getElementById('toggle-results-btn').onclick = toggleResults;
    document.getElementById('reset-votes-btn').onclick = resetActiveVotes;

    // Modal Control
    const modal = document.getElementById('question-modal');
    document.getElementById('add-question-btn').onclick = () => openEditQuestionModal(null);
    document.getElementById('close-modal-btn').onclick = () => modal.classList.add('hidden');
    document.getElementById('add-option-btn').onclick = () => addOptionInputField('', 'question');

    document.getElementById('question-form').onsubmit = handleQuestionFormSubmit;

    // Close custom dropdown lists on click outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-select-options').forEach(el => el.classList.add('hidden'));
    });
}

// Subscribe to real-time updates for active question changes
function subscribeToAdminVotes() {
    db
        .channel('admin-state-realtime')
        .on('postgres_changes', { event: '*', filter: 'id=eq.1', schema: 'public', table: 'quiz_state' }, async payload => {
            adminState = payload.new;
            updateAdminStateUI();
            renderAdminQuestions();
            await fetchVoteCount();
        })
        .subscribe();

    db
        .channel('admin-votes-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, async payload => {
            await fetchVoteCount();
        })
        .subscribe();
}

// Question Edit Modal functions
function openEditQuestionModal(questionId) {
    const modal = document.getElementById('question-modal');
    const modalTitle = document.getElementById('modal-title');
    const editIdInput = document.getElementById('edit-question-id');
    const questionTextInput = document.getElementById('question-text-input');
    const optionsContainer = document.getElementById('modal-options-container');

    optionsContainer.innerHTML = '';
    modal.classList.remove('hidden');

    if (questionId) {
        // Edit existing mode
        const q = adminQuestions.find(item => item.id === questionId);
        modalTitle.textContent = 'Frage bearbeiten';
        editIdInput.value = q.id;
        questionTextInput.value = q.text;
        
        q.options.forEach((opt, idx) => {
            const silhouette = q.silhouettes && q.silhouettes[idx] ? q.silhouettes[idx] : 'question';
            addOptionInputField(opt, silhouette);
        });
    } else {
        // New question mode
        modalTitle.textContent = 'Neue Frage erstellen';
        editIdInput.value = '';
        questionTextInput.value = '';
        
        // Add two default empty options
        addOptionInputField('', 'question');
        addOptionInputField('', 'question');
    }
}

// Add dynamic text input for answer options with visual select dropdown (Single standard silhouette + Custom image)
function addOptionInputField(value = '', selectedSilhouette = 'question') {
    const container = document.getElementById('modal-options-container');
    const row = document.createElement('div');
    row.className = 'option-edit-row';

    const isCustomImage = selectedSilhouette.startsWith('data:image/') || selectedSilhouette.startsWith('http://') || selectedSilhouette.startsWith('https://');
    const actualSilhouette = isCustomImage ? selectedSilhouette : 'question';

    // Create custom visual select HTML (Only 'question' silhouette + 'custom' picture)
    let optionsHtml = `
        <div class="custom-select-option ${!isCustomImage ? 'active' : ''}" data-value="question" onclick="selectCustomOption(this, 'question')">
            <div class="option-icon">${getSilhouetteSvg('question')}</div>
        </div>
    `;

    // Add custom option at the end of the dropdown list
    optionsHtml += `
        <div class="custom-select-option option-custom ${isCustomImage ? 'active' : ''}" data-value="custom" onclick="selectCustomOption(this, 'custom')">
            <div class="option-icon">
                ${isCustomImage ? `<img src="${selectedSilhouette}" class="picker-custom-thumb">` : CAMERA_SVG}
            </div>
        </div>
    `;

    const selectWrapperHtml = `
        <div class="custom-select-wrapper">
            <div class="custom-select-trigger" onclick="toggleCustomSelect(this)">
                <div class="selected-preview-icon">${getSilhouetteSvg(actualSilhouette)}</div>
                <span class="arrow-indicator">▼</span>
            </div>
            <div class="custom-select-options hidden">
                ${optionsHtml}
            </div>
        </div>
    `;

    row.innerHTML = `
        <input type="text" class="option-text-input" placeholder="Verdächtiger Name..." value="${value}" required>
        ${selectWrapperHtml}
        <input type="file" class="option-image-file" accept="image/*" style="display: none;" onchange="handleImageUpload(this)">
        <input type="hidden" class="silhouette-select-value" value="${actualSilhouette}">
        <button type="button" class="btn-retro btn-small btn-danger" onclick="this.parentElement.remove()">X</button>
    `;

    container.appendChild(row);
}

// Save question form submit
async function handleQuestionFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('edit-question-id').value;
    const text = document.getElementById('question-text-input').value.trim();
    
    // Collect options and silhouettes
    const optionRows = document.querySelectorAll('.option-edit-row');
    const options = [];
    const silhouettes = [];
    let hasValidationError = false;

    for (const row of optionRows) {
        const textVal = row.querySelector('.option-text-input').value.trim();
        const silVal = row.querySelector('.silhouette-select-value').value;
        if (textVal) {
            options.push(textVal);
            
            const isCustom = silVal.startsWith('data:image/') || silVal.startsWith('http://') || silVal.startsWith('https://');
            if (!silVal || silVal === 'custom') {
                await showCustomAlert(`Bitte wähle eine Silhouette oder lade ein Bild für "${textVal}" hoch.`);
                hasValidationError = true;
            }
            silhouettes.push(silVal);
        }
    }

    if (hasValidationError) return;

    if (options.length < 2) {
        await showCustomAlert('Eine Frage benötigt mindestens 2 Optionen.');
        return;
    }

    const payload = { text, options, silhouettes };

    try {
        if (id) {
            // Update
            const { error } = await db
                .from('questions')
                .update(payload)
                .eq('id', id);
            if (error) throw error;
        } else {
            // Insert new
            const { error } = await db
                .from('questions')
                .insert([payload]);
            if (error) throw error;
        }

        document.getElementById('question-modal').classList.add('hidden');
        await fetchQuestions();
        updateAdminStateUI();
    } catch (err) {
        console.error('Fehler beim Speichern der Frage:', err);
    }
}

// Toggle custom select dropdown
window.toggleCustomSelect = function(triggerEl) {
    event.stopPropagation();
    const wrapper = triggerEl.closest('.custom-select-wrapper');
    const optionsContainer = wrapper.querySelector('.custom-select-options');
    const isClosed = optionsContainer.classList.contains('hidden');
    
    // Close all other dropdowns
    document.querySelectorAll('.custom-select-options').forEach(el => el.classList.add('hidden'));
    
    if (isClosed) {
        optionsContainer.classList.remove('hidden');
    }
};

// Select custom select option
window.selectCustomOption = function(optionEl, value) {
    event.stopPropagation();
    const row = optionEl.closest('.option-edit-row');
    const hiddenInput = row.querySelector('.silhouette-select-value');
    const wrapper = optionEl.closest('.custom-select-wrapper');
    const trigger = wrapper.querySelector('.custom-select-trigger');
    const optionsContainer = wrapper.querySelector('.custom-select-options');
    
    if (value === 'custom') {
        const fileInput = row.querySelector('.option-image-file');
        const existingImg = optionEl.querySelector('.picker-custom-thumb');
        
        if (existingImg) {
            // Select the existing image as active
            hiddenInput.value = existingImg.src;
            wrapper.querySelectorAll('.custom-select-option').forEach(el => el.classList.remove('active'));
            optionEl.classList.add('active');
            
            // Also trigger file input in case they want to change it
            fileInput.click();
        } else {
            // Trigger file upload
            fileInput.click();
        }
        optionsContainer.classList.add('hidden'); // Close dropdown
    } else {
        // Update value
        hiddenInput.value = value;
        
        // Update trigger UI (No text label!)
        trigger.querySelector('.selected-preview-icon').innerHTML = getSilhouetteSvg(value);
        
        // Update active class on options
        wrapper.querySelectorAll('.custom-select-option').forEach(el => el.classList.remove('active'));
        optionEl.classList.add('active');
        
        // Close dropdown
        optionsContainer.classList.add('hidden');
    }
};

// Handle custom image uploads (compressing to max 250x250)
window.handleImageUpload = async function(fileInput) {
    const row = fileInput.closest('.option-edit-row');
    const hiddenInput = row.querySelector('.silhouette-select-value');
    const wrapper = row.querySelector('.custom-select-wrapper');
    const trigger = wrapper.querySelector('.custom-select-trigger');
    const pickerCustom = wrapper.querySelector('.custom-select-option.option-custom');
    const file = fileInput.files[0];
    
    if (file) {
        try {
            trigger.querySelector('.selected-preview-icon').innerHTML = `<span style="font-size: 0.65rem;">...</span>`;
            const dataUrl = await compressImage(file);
            
            // Set value in hidden input
            hiddenInput.value = dataUrl;
            
            // Update trigger preview (No text label!)
            trigger.querySelector('.selected-preview-icon').innerHTML = `<img src="${dataUrl}" alt="Suspect" class="suspect-custom-img">`;
            
            // Update preview inside the custom picker option in the list
            pickerCustom.querySelector('.option-icon').innerHTML = `<img src="${dataUrl}" class="picker-custom-thumb">`;
            
            // Highlight custom option in the list
            wrapper.querySelectorAll('.custom-select-option').forEach(el => el.classList.remove('active'));
            pickerCustom.classList.add('active');
        } catch (err) {
            console.error('Fehler beim Bild-Komprimieren:', err);
            await showCustomAlert('Bild konnte nicht geladen werden.');
            trigger.querySelector('.selected-preview-icon').innerHTML = getSilhouetteSvg('question');
            pickerCustom.querySelector('.option-icon').innerHTML = CAMERA_SVG;
        }
    }
};

// Client-side image resize and JPEG compression helper
function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 500;
                const MAX_HEIGHT = 500;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                // Compress to JPEG with 0.7 quality to keep payload small (approx 10-20KB)
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                resolve(dataUrl);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
