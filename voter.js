// ==========================================================================
// VOTER MODULE - SPECTATOR MOBILE INTERACTION
// ==========================================================================

let voterActiveQuestion = null;
let voterState = {
    active_question_id: null,
    show_results: false
};

// Initialize Voter Screen
async function initVoter() {
    await fetchVoterState();
    subscribeToVoterState();
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
        // If question is already loaded and is the same, do nothing
        if (voterActiveQuestion && String(voterActiveQuestion.id) === String(voterState.active_question_id)) {
            return;
        }

        // Fetch question details
        try {
            const { data: qData, error } = await db
                .from('questions')
                .select('*')
                .eq('id', voterState.active_question_id)
                .single();

            if (error) throw error;

            voterActiveQuestion = qData;
            
            // Check if user has already voted for this question
            const hasVoted = localStorage.getItem(`voted_${voterActiveQuestion.id}`);
            if (hasVoted !== null) {
                showVoterLayout('success');
            } else {
                renderVoterQuestion();
                showVoterLayout('question');
            }
        } catch (err) {
            console.error('Fehler beim Laden der Wähler-Frage:', err);
            showVoterLayout('waiting');
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

    document.getElementById('voter-question-text').textContent = voterActiveQuestion.text;
    const list = document.getElementById('voter-options-list');
    list.classList.remove('voting-in-progress');
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
        
        btn.onclick = async () => {
            btn.classList.add('selected');
            list.classList.add('voting-in-progress');
            await new Promise(resolve => setTimeout(resolve, 450));
            submitVote(idx);
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

    if (view === 'loading') {
        document.getElementById('voter-loading').classList.remove('hidden');
    } else if (view === 'waiting') {
        document.getElementById('voter-waiting').classList.remove('hidden');
    } else if (view === 'question') {
        document.getElementById('voter-question-container').classList.remove('hidden');
    } else if (view === 'success') {
        document.getElementById('voter-success').classList.remove('hidden');
    }
}
