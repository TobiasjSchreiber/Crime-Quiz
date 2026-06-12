// ==========================================================================
// PRESENTER MODULE - BEAMER / MAIN SCREEN VISUALS
// ==========================================================================

let currentQuestion = null;
let presenterState = {
    active_question_id: null,
    show_results: false
};
let voteCounts = {};
let qrcodeInstance = null;
let winnerShownForQuestion = null;
let chartAnimationTimeouts = [];
let isTransitioning = false;
let needsVoteUpdate = false;

// Initialize Presenter Screen
async function initPresenter() {
    generateVoterQrCode();
    await fetchPresenterState();
    subscribeToPresenterState();
}

// Generate QR Code with credentials embedded
function generateVoterQrCode() {
    const sbUrl = localStorage.getItem('supabaseUrl');
    const sbKey = localStorage.getItem('supabaseKey');
    
    // Construct voter URL
    const voterUrl = `${window.location.origin}${window.location.pathname}?role=voter&sb_url=${encodeURIComponent(sbUrl)}&sb_key=${encodeURIComponent(sbKey)}`;
    
    const qrContainer = document.getElementById('qrcode');
    qrContainer.innerHTML = ''; // Clear previous if any
    
    qrcodeInstance = new QRCode(qrContainer, {
        text: voterUrl,
        width: 200,
        height: 200,
        colorDark: "#191311",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
}

// Fetch current state from DB
async function fetchPresenterState() {
    try {
        const { data, error } = await db
            .from('quiz_state')
            .select('*')
            .eq('id', 1)
            .maybeSingle();

        if (error) throw error;
        if (data) {
            presenterState = data;
            await handleStateChange();
        } else {
            console.warn('Keine Zeile in quiz_state vorhanden.');
            document.getElementById('presenter-waiting').classList.remove('hidden');
            document.getElementById('presenter-active').classList.add('hidden');
        }
    } catch (err) {
        console.error('Fehler beim Laden des Presenter-Status:', err);
    }
}

// React to state changes (new question or show/hide results)
async function handleStateChange() {
    const waitingView = document.getElementById('presenter-waiting');
    const activeView = document.getElementById('presenter-active');
    
    if (presenterState.active_question_id) {
        // Fetch question details
        try {
            const { data: qData, error } = await db
                .from('questions')
                .select('*')
                .eq('id', presenterState.active_question_id)
                .single();
                
            if (error) throw error;
            
            currentQuestion = qData;
            winnerShownForQuestion = null; // Reset winner show state for new question
            isTransitioning = false;
            needsVoteUpdate = false;
            document.getElementById('presenter-question-text').textContent = currentQuestion.text;
            
            // Render large suspects for the voting phase
            renderVotingPhaseSuspects();
            
            // Show active view with transition
            if (activeView.classList.contains('hidden')) {
                animateTransition(waitingView, activeView, 'paper-slide');
            } else {
                waitingView.classList.add('hidden');
                activeView.classList.remove('hidden');
            }
            
            // Load and render votes
            await loadVotes();
        } catch (err) {
            console.error('Fehler beim Laden der aktiven Frage:', err);
        }
    } else {
        // No active question
        currentQuestion = null;
        if (waitingView.classList.contains('hidden')) {
            animateTransition(activeView, waitingView, 'paper-slide-reverse');
        } else {
            waitingView.classList.remove('hidden');
            activeView.classList.add('hidden');
        }
    }
    
    updateResultsVisibility();
}

// Fetch votes for current active question
async function loadVotes() {
    if (!currentQuestion) return;
    
    try {
        const { data: votes, error } = await db
            .from('votes')
            .select('option_index')
            .eq('question_id', currentQuestion.id);
            
        if (error) throw error;
        
        // Reset vote counts
        voteCounts = {};
        currentQuestion.options.forEach((_, idx) => {
            voteCounts[idx] = 0;
        });
        
        // Count votes
        let totalVotes = 0;
        if (votes) {
            votes.forEach(v => {
                if (voteCounts[v.option_index] !== undefined) {
                    voteCounts[v.option_index]++;
                    totalVotes++;
                }
            });
        }
        
        // Update UI counters
        document.getElementById('presenter-total-votes').textContent = totalVotes;
        
        if (isTransitioning) {
            needsVoteUpdate = true;
            return;
        }
        
        // Render chart
        renderChart(totalVotes);
        
        // Update winner column if results are shown
        if (presenterState.show_results) {
            renderWinnerColumn();
        }
    } catch (err) {
        console.error('Fehler beim Laden der Stimmen:', err);
    }
}

// Render dynamic bar chart with retro style
function renderChart(totalVotes, delayHeightAnimation = false) {
    // Cancel any pending animations
    chartAnimationTimeouts.forEach(t => clearTimeout(t));
    chartAnimationTimeouts = [];
    
    if (!currentQuestion) return;
    
    const chartContainer = document.getElementById('presenter-chart');
    const existingColumns = chartContainer.querySelectorAll('.chart-column');
    
    const isSameQuestion = chartContainer.dataset.questionId === currentQuestion.id.toString();
    
    // Check if we can do an in-place update (must have the same question, same number of options, and delayHeightAnimation is false)
    const canUpdateInPlace = isSameQuestion && 
                             !delayHeightAnimation && 
                             existingColumns.length === currentQuestion.options.length;
                             
    if (canUpdateInPlace) {
        currentQuestion.options.forEach((opt, idx) => {
            const count = voteCounts[idx] || 0;
            const pct = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
            const col = existingColumns[idx];
            
            // Update vote count label
            const label = col.querySelector('.vote-count-label');
            if (label) {
                label.textContent = count;
            }
            
            // Update bar height
            const bar = col.querySelector('.bar');
            if (bar) {
                // Clear inline transition so it falls back to CSS transition setup
                bar.style.transition = '';
                bar.style.height = `${pct}%`;
            }
        });
        return;
    }
    
    // Fallback: full rebuild of the chart
    chartContainer.innerHTML = '';
    chartContainer.dataset.questionId = currentQuestion.id;
    
    currentQuestion.options.forEach((opt, idx) => {
        const count = voteCounts[idx] || 0;
        const silhouette = currentQuestion.silhouettes && currentQuestion.silhouettes[idx] ? currentQuestion.silhouettes[idx] : 'question';
        
        // Calculate percentage height relative to total votes
        const pct = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
        
        const col = document.createElement('div');
        col.className = 'chart-column';
        
        // Alternating rotations for detective desk look
        const rotations = ['-2.5deg', '2deg', '-1.5deg', '3deg'];
        const rot = rotations[idx % rotations.length];
        
        // Set dynamic content
        col.innerHTML = `
            <div class="vote-count-label">${count}</div>
            <div class="bar-wrapper">
                <div class="bar" id="bar-${idx}" style="height: 0%"></div>
            </div>
            <div class="column-label suspect-card" data-suspect="${opt.replace(/"/g, '&quot;')}" style="--rotation: ${rot}" onclick="showLargeSuspect('${opt.replace(/'/g, "\\'")}', '${silhouette}')">
                <div class="suspect-photo-container">
                    ${getSilhouetteSvg(silhouette)}
                </div>
                <div class="suspect-name">${opt}</div>
            </div>
        `;
        
        chartContainer.appendChild(col);
        
        // Animate bar rising up after layout calculation
        if (!delayHeightAnimation) {
            const tId = setTimeout(() => {
                const bar = document.getElementById(`bar-${idx}`);
                if (bar) {
                    bar.style.height = `${pct}%`;
                }
            }, 100);
            chartAnimationTimeouts.push(tId);
        }
    });
}

// Render large suspects for the voting phase
function renderVotingPhaseSuspects() {
    const container = document.getElementById('voting-phase-suspects');
    if (!container) return;
    container.innerHTML = '';
    
    if (!currentQuestion) return;
    
    const rotations = ['-2.5deg', '2deg', '-1.5deg', '3deg'];
    
    currentQuestion.options.forEach((opt, idx) => {
        const silhouette = currentQuestion.silhouettes && currentQuestion.silhouettes[idx] ? currentQuestion.silhouettes[idx] : 'question';
        
        const card = document.createElement('div');
        card.className = 'presenter-suspect-card-large';
        card.dataset.suspect = opt;
        const rot = rotations[idx % rotations.length];
        card.style.setProperty('--rotation', rot);
        card.style.animationDelay = `${idx * 0.1}s`;
        
        card.onclick = () => showLargeSuspect(opt, silhouette);
        
        card.innerHTML = `
            <div class="suspect-photo-container">
                ${getSilhouetteSvg(silhouette)}
            </div>
            <div class="suspect-name">${opt}</div>
        `;
        
        container.appendChild(card);
    });
}

// Toggle showing/hiding results
function updateResultsVisibility() {
    const votingPhase = document.getElementById('presenter-voting-phase');
    const revealPhase = document.getElementById('presenter-reveal-phase');
    const activeView = document.getElementById('presenter-active');
    
    if (!votingPhase || !revealPhase) return;
    
    const isParentHidden = !activeView || activeView.classList.contains('hidden');
    
    if (presenterState.show_results) {
        // Show chart, hide large suspects
        if (isParentHidden) {
            votingPhase.classList.add('hidden');
            revealPhase.classList.remove('hidden');
            
            // Render and show winner column immediately next to the graph
            renderWinnerColumn();
        } else {
            performFlipAnimation();
        }
    } else {
        // Show large suspects, hide chart
        if (isParentHidden) {
            revealPhase.classList.add('hidden');
            votingPhase.classList.remove('hidden');
        } else {
            // Disable child animations temporarily during transition to prevent blinking/flashing
            const largeCards = votingPhase.querySelectorAll('.presenter-suspect-card-large');
            largeCards.forEach(card => {
                card.style.animation = 'none';
            });
            
            animateTransition(revealPhase, votingPhase, 'dossier-sweep-reverse');
        }
        
        // Hide the winner reveal column next to the graph
        const winnerContainer = document.getElementById('presenter-winner-reveal');
        if (winnerContainer) {
            winnerContainer.classList.add('hidden');
            winnerContainer.innerHTML = '';
        }
    }
}

// FLIP animation to transition suspect cards from grid to chart
function performFlipAnimation() {
    isTransitioning = true;
    needsVoteUpdate = false;
    
    const votingPhase = document.getElementById('presenter-voting-phase');
    const revealPhase = document.getElementById('presenter-reveal-phase');
    
    if (!votingPhase || !revealPhase) return;
    
    // Temporarily position the voting phase as fixed so it stays in place
    // but doesn't push the chart down in the block flow
    const votingRect = votingPhase.getBoundingClientRect();
    votingPhase.style.position = 'fixed';
    votingPhase.style.left = `${votingRect.left}px`;
    votingPhase.style.top = `${votingRect.top}px`;
    votingPhase.style.width = `${votingRect.width}px`;
    votingPhase.style.height = `${votingRect.height}px`;
    votingPhase.style.zIndex = '10';
    
    // Hide the voting status container ("Stimmen gehen ein...") beautifully
    const statusContainer = votingPhase.querySelector('.voting-status-container');
    if (statusContainer) {
        statusContainer.classList.add('voting-status-fade-out');
    }
    
    // Ensure chart is fully rendered in its correct final position (delay bar height animation until flight ends)
    const totalVotes = Object.values(voteCounts).reduce((sum, val) => sum + val, 0);
    renderChart(totalVotes, true);
    
    // Render the winner column immediately so it occupies space in the layout,
    // ensuring the chart is positioned correctly at its final, shifted width.
    renderWinnerColumn();
    
    // Temporarily hide it visually so it doesn't show during flight
    const winnerContainer = document.getElementById('presenter-winner-reveal');
    if (winnerContainer) {
        winnerContainer.style.opacity = '0';
        winnerContainer.style.transition = 'none';
        winnerContainer.style.animation = 'none';
    }
    
    // Make reveal phase visible
    revealPhase.classList.remove('hidden');
    
    // Hide the bars and labels inside the chart container so we can show them later
    const bars = revealPhase.querySelectorAll('.bar-wrapper, .vote-count-label');
    bars.forEach(el => {
        el.style.opacity = '0';
        el.style.transition = 'none';
    });
    
    const suspects = currentQuestion.options;
    const clones = [];
    
    suspects.forEach((opt, idx) => {
        // Escaped suspect names for queries
        const escapedOpt = opt.replace(/"/g, '\\"');
        const startCard = votingPhase.querySelector(`[data-suspect="${escapedOpt}"]`);
        const endCard = revealPhase.querySelector(`[data-suspect="${escapedOpt}"]`);
        
        if (startCard && endCard) {
            const startRect = startCard.getBoundingClientRect();
            const endRect = endCard.getBoundingClientRect();
            
            // Get original untransformed layout dimensions
            const startWidth = startCard.offsetWidth;
            const startHeight = startCard.offsetHeight;
            const endWidth = endCard.offsetWidth;
            const endHeight = endCard.offsetHeight;
            
            // Clone the destination (small) card instead of the starting card.
            // This ensures its internal layout, margins, and texts are pre-rendered
            // exactly as they should look at the end, and we just scale them.
            const clone = endCard.cloneNode(true);
            
            // Calculate starting and ending center coordinates
            const startCenter = {
                x: startRect.left + startRect.width / 2,
                y: startRect.top + startRect.height / 2
            };
            const endCenter = {
                x: endRect.left + endRect.width / 2,
                y: endRect.top + endRect.height / 2
            };
            
            // Set positioning to match layout dimensions, but centering the clone on the destination rect
            clone.style.position = 'fixed';
            clone.style.width = `${endWidth}px`;
            clone.style.height = `${endHeight}px`;
            clone.style.left = `${endCenter.x - endWidth / 2}px`;
            clone.style.top = `${endCenter.y - endHeight / 2}px`;
            clone.style.margin = '0';
            clone.style.zIndex = '9999';
            clone.style.pointerEvents = 'none';
            clone.style.animation = 'none'; // Disable any active CSS animations on clone
            
            // Calculate starting state offsets (First -> Last, invert transform)
            const deltaX = startCenter.x - endCenter.x;
            const deltaY = startCenter.y - endCenter.y;
            const scaleX = startWidth / endWidth;
            const scaleY = startHeight / endHeight;
            
            const startRotation = getComputedStyle(startCard).getPropertyValue('--rotation').trim() || '0deg';
            const targetRotation = getComputedStyle(endCard).getPropertyValue('--rotation').trim() || '0deg';
            
            // Transform the clone so it visually matches the starting card perfectly
            clone.style.transformOrigin = 'center center';
            clone.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY}) rotate(${startRotation})`;
            
            document.body.appendChild(clone);
            
            // Hide the original starting card and destination card using visibility: hidden
            startCard.style.visibility = 'hidden';
            endCard.style.visibility = 'hidden';
            
            // Temporarily disable transition on destination card so it doesn't animate when shown at the end
            endCard.style.transition = 'none';
            
            clones.push({
                clone,
                endCard,
                targetRotation
            });
        }
    });
    
    // Force a layout reflow
    document.body.offsetHeight;
    
    // Start transition
    clones.forEach(item => {
        const { clone, targetRotation } = item;
        
        // Transition only the transform property (GPU accelerated, no layout repaints)
        clone.style.transition = 'transform 0.7s cubic-bezier(0.25, 1, 0.5, 1)';
        
        // Remove translation, scale to 1 (natural size), and set target rotation
        clone.style.transform = `translate(0px, 0px) scale(1, 1) rotate(${targetRotation})`;
    });
    
    // Cleanup and complete the transition
    setTimeout(() => {
        clones.forEach(item => {
            const { clone, endCard } = item;
            endCard.style.visibility = 'visible';
            clone.remove();
            
            // Restore transition style after a short delay so hover effects still work
            setTimeout(() => {
                endCard.style.transition = '';
            }, 50);
        });
        
        // Reset temporary styles on votingPhase and hide it
        votingPhase.style.position = '';
        votingPhase.style.left = '';
        votingPhase.style.top = '';
        votingPhase.style.width = '';
        votingPhase.style.height = '';
        votingPhase.style.zIndex = '';
        votingPhase.classList.add('hidden');
        
        // Reset voting status container class for next use
        if (statusContainer) {
            statusContainer.classList.remove('voting-status-fade-out');
        }
        
        // Animate the bars rising and text appearing
        bars.forEach(el => {
            el.style.transition = 'opacity 0.6s ease';
            el.style.opacity = '1';
        });
        
        // Trigger the height animation for the bars with a slight delay so it starts while they are already visible
        const heightTimeoutId = setTimeout(() => {
            const latestTotalVotes = Object.values(voteCounts).reduce((sum, val) => sum + val, 0);
            currentQuestion.options.forEach((_, idx) => {
                const bar = document.getElementById(`bar-${idx}`);
                if (bar) {
                    const count = voteCounts[idx] || 0;
                    const pct = latestTotalVotes > 0 ? (count / latestTotalVotes) * 100 : 0;
                    
                    // Force a layout reflow and set inline transition to guarantee transition plays
                    bar.style.transition = 'height 0.8s cubic-bezier(0.25, 1, 0.5, 1)';
                    bar.offsetHeight;
                    bar.style.height = `${pct}%`;
                }
            });
        }, 100);
        chartAnimationTimeouts.push(heightTimeoutId);
        
        // Restore start cards visibility and opacity so they're clean if we revert
        votingPhase.querySelectorAll('.presenter-suspect-card-large').forEach(el => {
            el.style.visibility = 'visible';
            el.style.opacity = '1';
        });
        
        // Fade in the winner column next to the graph smoothly after the graph/bars are fully shown (900ms delay)
        const winnerTimeoutId = setTimeout(() => {
            if (winnerContainer) {
                winnerContainer.style.animation = 'fadeInRight 0.8s cubic-bezier(0.25, 1, 0.5, 1) both';
                winnerContainer.style.transition = 'opacity 0.8s ease';
                winnerContainer.style.opacity = '1';
            }
            
            isTransitioning = false;
            if (needsVoteUpdate) {
                loadVotes();
            }
        }, 900);
        chartAnimationTimeouts.push(winnerTimeoutId);
    }, 800);
}

// Subscribe to real-time events for state and votes
function subscribeToPresenterState() {
    // 1. Listen for state updates (question changes, results shown)
    db
        .channel('presenter-state')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_state', filter: 'id=eq.1' }, payload => {
            presenterState = payload.new;
            handleStateChange();
        })
        .subscribe();
        
    // 2. Listen to all vote updates
    db
        .channel('presenter-votes-trigger')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, payload => {
            // Only update if vote belongs to active question
            if (currentQuestion && (
                (payload.new && payload.new.question_id === currentQuestion.id) ||
                (payload.old && payload.old.question_id === currentQuestion.id)
            )) {
                loadVotes();
            }
        })
        .subscribe();
}

// Show large suspect modal wanted poster
function showLargeSuspect(name, silhouette) {
    const spotlight = document.getElementById('suspect-spotlight');
    const spotlightPhoto = document.getElementById('spotlight-photo');
    const spotlightName = document.getElementById('spotlight-name');
    const spotlightTitle = document.querySelector('.spotlight-title');
    
    if (spotlightTitle) {
        spotlightTitle.textContent = 'HAUPTVERDÄCHTIGER';
    }
    
    spotlightName.textContent = name;
    
    if (silhouette && (silhouette.startsWith('data:image/') || silhouette.startsWith('http://') || silhouette.startsWith('https://'))) {
        spotlightPhoto.innerHTML = `<img src="${silhouette}" alt="Suspect" class="suspect-custom-img">`;
    } else {
        spotlightPhoto.innerHTML = getSilhouetteSvg(silhouette);
    }
    
    spotlight.classList.remove('hidden');
}
window.showLargeSuspect = showLargeSuspect;

// Render the winner (most votes) in the sidebar next to the graph
function renderWinnerColumn() {
    const winnerContainer = document.getElementById('presenter-winner-reveal');
    if (!winnerContainer) return;
    
    winnerContainer.innerHTML = '';
    // Reset inline styles to ensure a clean state
    winnerContainer.style.opacity = '';
    winnerContainer.style.transition = '';
    winnerContainer.style.animation = '';
    winnerContainer.style.transform = '';
    
    if (!currentQuestion) {
        winnerContainer.classList.add('hidden');
        return;
    }
    
    // Find suspect with the most votes
    let maxVotes = -1;
    let winnerIdx = -1;
    
    currentQuestion.options.forEach((_, idx) => {
        const count = voteCounts[idx] || 0;
        if (count > maxVotes) {
            maxVotes = count;
            winnerIdx = idx;
        }
    });
    
    // Only show if there's a winner and they have at least 1 vote
    if (winnerIdx !== -1 && maxVotes > 0) {
        const name = currentQuestion.options[winnerIdx];
        const silhouette = currentQuestion.silhouettes && currentQuestion.silhouettes[winnerIdx] ? currentQuestion.silhouettes[winnerIdx] : 'question';
        
        let photoHtml = '';
        if (silhouette && (silhouette.startsWith('data:image/') || silhouette.startsWith('http://') || silhouette.startsWith('https://'))) {
            photoHtml = `<img src="${silhouette}" alt="Gewinner">`;
        } else {
            photoHtml = getSilhouetteSvg(silhouette);
        }
        
        // Pluralization for "Stimme/Stimmen"
        const votesText = maxVotes === 1 ? '1 Stimme' : `${maxVotes} Stimmen`;
        
        winnerContainer.innerHTML = `
            <div class="winner-card">
                <div class="winner-title">MEISTE STIMMEN!</div>
                <div class="winner-photo-frame">
                    ${photoHtml}
                </div>
                <div class="winner-name">${name}</div>
                <div class="winner-votes-badge">${votesText}</div>
            </div>
        `;
        
        winnerContainer.classList.remove('hidden');
    } else {
        winnerContainer.classList.add('hidden');
    }
}

// Utility to transition between views using CSS animations
function animateTransition(fromEl, toEl, animationType) {
    if (!fromEl || !toEl) return;
    if (fromEl === toEl) return;

    // Remove any active animation classes just in case
    fromEl.className = fromEl.className.replace(/\banim-\S+/g, '').trim();
    toEl.className = toEl.className.replace(/\banim-\S+/g, '').trim();

    // If the element to hide is already hidden, just animate the target in
    if (fromEl.classList.contains('hidden')) {
        toEl.classList.remove('hidden');
        toEl.classList.add(`anim-${animationType}-in`);
        
        let cleaned = false;
        const cleanup = (e) => {
            if (e && e.target !== toEl) return;
            if (cleaned) return;
            cleaned = true;
            toEl.classList.remove(`anim-${animationType}-in`);
            toEl.removeEventListener('animationend', cleanup);
        };
        toEl.addEventListener('animationend', cleanup);
        setTimeout(cleanup, 800); // safety fallback
        return;
    }

    // Apply out animation to source element
    fromEl.classList.add(`anim-${animationType}-out`);

    let transitioned = false;
    const triggerNext = (e) => {
        if (e && e.target !== fromEl) return;
        if (transitioned) return;
        transitioned = true;
        fromEl.removeEventListener('animationend', triggerNext);
        fromEl.classList.remove(`anim-${animationType}-out`);
        fromEl.classList.add('hidden');

        // Show and animate target element in
        toEl.classList.remove('hidden');
        toEl.classList.add(`anim-${animationType}-in`);

        let cleaned = false;
        const cleanup = (ev) => {
            if (ev && ev.target !== toEl) return;
            if (cleaned) return;
            cleaned = true;
            toEl.classList.remove(`anim-${animationType}-in`);
            toEl.removeEventListener('animationend', cleanup);
        };
        toEl.addEventListener('animationend', cleanup);
        setTimeout(cleanup, 800); // safety fallback
    };

    fromEl.addEventListener('animationend', triggerNext);
    setTimeout(triggerNext, 500); // safety fallback for out animation
}
