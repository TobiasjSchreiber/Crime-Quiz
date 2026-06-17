// ==========================================================================
// VOTER MODULE - SPECTATOR MOBILE INTERACTION
// ==========================================================================

let voterActiveQuestion = null;
let voterState = {
    active_question_id: null,
    show_results: false
};
let selectedOptionIndex = null;

// Initialize Voter Screen
async function initVoter() {
    setupVoterConfirmListener();
    await fetchVoterState();
    subscribeToVoterState();
}

// Set up the event listener for the confirmation button
function setupVoterConfirmListener() {
    const confirmBtn = document.getElementById('voter-confirm-btn');
    if (confirmBtn) {
        confirmBtn.onclick = async () => {
            if (selectedOptionIndex !== null) {
                const list = document.getElementById('voter-options-list');
                list.classList.add('voting-in-progress');
                
                confirmBtn.disabled = true;
                confirmBtn.textContent = 'Wird übermittelt...';
                
                await submitVote(selectedOptionIndex);
                
                // Reset button text
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Auswahl Bestätigen';
            }
        };
    }
}

// Fetch current state from database
async function fetchVoterState() {
    try {
        const { data, error } = await db
            .from('quiz_state')
            .select('*')
            .eq('id', 1)
            .maybeSingle();

        if (error) throw error;
        if (data) {
            voterState = data;
            await handleVoterStateChange();
        } else {
            console.warn('Keine Zeile in quiz_state vorhanden.');
            showVoterLayout('waiting');
        }
    } catch (err) {
        console.error('Fehler beim Laden des Wähler-Status:', err);
        showVoterLayout('loading'); // Fallback
    }
}

// Handle question transitions
async function handleVoterStateChange() {
    if (voterState.active_question_id) {
        // Fetch question details if not loaded or if it changed
        if (!voterActiveQuestion || String(voterActiveQuestion.id) !== String(voterState.active_question_id)) {
            try {
                const { data: qData, error } = await db
                    .from('questions')
                    .select('*')
                    .eq('id', voterState.active_question_id)
                    .single();

                if (error) throw error;
                voterActiveQuestion = qData;
            } catch (err) {
                console.error('Fehler beim Laden der Wähler-Frage:', err);
                showVoterLayout('waiting');
                return;
            }
        }

        // Check if user has already voted for this question in the database
        try {
            const { data: voteData, error: voteError } = await db
                .from('votes')
                .select('id')
                .eq('question_id', voterActiveQuestion.id)
                .eq('device_id', currentDeviceId)
                .maybeSingle();

            if (voteError) throw voteError;

            if (voteData) {
                // Save vote state locally to prevent repeat clicks
                localStorage.setItem(`voted_${voterActiveQuestion.id}`, 'true');
                showVoterLayout('success');
            } else {
                // If results are already shown, they cannot vote anymore
                if (voterState.show_results) {
                    localStorage.removeItem(`voted_${voterActiveQuestion.id}`);
                    showVoterLayout('closed');
                } else {
                    localStorage.removeItem(`voted_${voterActiveQuestion.id}`);
                    renderVoterQuestion();
                    showVoterLayout('question');
                }
            }
        } catch (err) {
            console.error('Fehler beim Überprüfen der Stimme:', err);
            // Fallback to local storage if DB query fails
            const hasVoted = localStorage.getItem(`voted_${voterActiveQuestion.id}`);
            if (hasVoted !== null) {
                showVoterLayout('success');
            } else {
                if (voterState.show_results) {
                    showVoterLayout('closed');
                } else {
                    renderVoterQuestion();
                    showVoterLayout('question');
                }
            }
        }
    } else {
        // No active question
        voterActiveQuestion = null;
        showVoterLayout('waiting');
    }
}

// Render option buttons with silhouettes
function renderVoterQuestion() {
    if (!voterActiveQuestion) return;

    selectedOptionIndex = null;
    
    // Disable the confirm button when rendering a new question
    const confirmBtn = document.getElementById('voter-confirm-btn');
    if (confirmBtn) {
        confirmBtn.disabled = true;
    }

    document.getElementById('voter-question-text').textContent = voterActiveQuestion.text;
    const list = document.getElementById('voter-options-list');
    list.classList.remove('voting-in-progress', 'has-selection');
    list.innerHTML = '';

    voterActiveQuestion.options.forEach((opt, idx) => {
        const silhouette = voterActiveQuestion.silhouettes && voterActiveQuestion.silhouettes[idx] 
            ? voterActiveQuestion.silhouettes[idx] 
            : 'question';
            
        const btn = document.createElement('button');
        btn.className = 'voter-suspect-card';
        // Alternating rotations for detective desk look
        const rotations = ['-1.5deg', '1deg', '-2deg', '1.5deg'];
        btn.style.setProperty('--rotation', rotations[idx % rotations.length]);
        
        btn.onclick = () => {
            const isAlreadySelected = btn.classList.contains('selected');
            
            // Remove selected class from all sibling cards
            list.querySelectorAll('.voter-suspect-card').forEach(c => c.classList.remove('selected'));
            
            if (isAlreadySelected) {
                // Deselect
                list.classList.remove('has-selection');
                selectedOptionIndex = null;
                if (confirmBtn) {
                    confirmBtn.disabled = true;
                }
            } else {
                // Select
                btn.classList.add('selected');
                list.classList.add('has-selection');
                selectedOptionIndex = idx;
                if (confirmBtn) {
                    confirmBtn.disabled = false;
                }
            }
        };

        btn.innerHTML = `
            <div class="suspect-photo-container">
                ${getSilhouetteSvg(silhouette)}
            </div>
            <div class="suspect-name">${opt}</div>
        `;

        list.appendChild(btn);
    });
}

// Submit vote to database
async function submitVote(optionIndex) {
    if (!voterActiveQuestion) return;

    // Show temporary loading state
    showVoterLayout('loading');

    try {
        // Refresh state first to make sure results are not shown yet and the question is still active
        const { data: stateData } = await db
            .from('quiz_state')
            .select('active_question_id, show_results')
            .eq('id', 1)
            .single();

        // 1. Check if the active question has changed or was closed
        if (!stateData || String(stateData.active_question_id) !== String(voterActiveQuestion.id)) {
            await showCustomAlert('Diese Abstimmung ist nicht mehr aktiv! Die Runde wurde bereits beendet oder gewechselt.');
            // Sync state and reload view to current state
            await fetchVoterState();
            return;
        }

        // 2. Check if results are already revealed
        if (stateData.show_results) {
            await showCustomAlert('Die Abstimmung für diese Runde ist bereits geschlossen!');
            showVoterLayout('closed');
            return;
        }

        const { error } = await db
            .from('votes')
            .insert([{
                question_id: voterActiveQuestion.id,
                option_index: optionIndex,
                device_id: currentDeviceId
            }]);

        if (error) {
            // Check if it's a unique violation (already voted)
            if (error.code === '23505') { 
                console.log('Bereits abgestimmt laut DB.');
            } else {
                throw error;
            }
        }

        // Save vote state locally to prevent repeat clicks
        localStorage.setItem(`voted_${voterActiveQuestion.id}`, optionIndex);
        showVoterLayout('success');
    } catch (err) {
        console.error('Fehler bei der Stimmenabgabe:', err);
        await showCustomAlert('Fehler beim Abstimmen. Bitte lade die Seite neu und versuche es noch einmal.');
        showVoterLayout('question');
    }
}

// Subscribe to real-time updates for active question changes
function subscribeToVoterState() {
    db
        .channel('voter-state')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_state', filter: 'id=eq.1' }, payload => {
            voterState = payload.new;
            handleVoterStateChange();
        })
        .subscribe();
}

// Helper to switch voter screen sub-views
function showVoterLayout(view) {
    document.getElementById('voter-loading').classList.add('hidden');
    document.getElementById('voter-waiting').classList.add('hidden');
    document.getElementById('voter-question-container').classList.add('hidden');
    document.getElementById('voter-success').classList.add('hidden');
    document.getElementById('voter-closed').classList.add('hidden');

    if (view === 'loading') {
        document.getElementById('voter-loading').classList.remove('hidden');
    } else if (view === 'waiting') {
        document.getElementById('voter-waiting').classList.remove('hidden');
    } else if (view === 'question') {
        document.getElementById('voter-question-container').classList.remove('hidden');
    } else if (view === 'success') {
        document.getElementById('voter-success').classList.remove('hidden');
    } else if (view === 'closed') {
        document.getElementById('voter-closed').classList.remove('hidden');
    }
}
