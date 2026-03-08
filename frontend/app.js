/**
 * Roast or Toast — Frontend Application
 * Original logic preserved. New elements wired for brutalist UI redesign.
 */

(function() {
    'use strict';

    // ============================================
    // DOM Elements
    // ============================================
    const elements = {
        // Upload
        dropzone:         document.getElementById('dropzone'),
        dropzoneContent:  document.getElementById('dropzoneContent'),
        fileInput:        document.getElementById('fileInput'),
        snapInput:        document.getElementById('snapInput'),
        fileTriggerBtn:   document.getElementById('fileTriggerBtn'),
        snapTriggerBtn:   document.getElementById('snapTriggerBtn'),
        previewContainer: document.getElementById('previewContainer'),
        previewImage:     document.getElementById('previewImage'),
        removeImage:      document.getElementById('removeImage'),
        analyzeBtn:       document.getElementById('analyzeBtn'),

        // Upload / Results sections
        uploadCard:        document.getElementById('uploadCard'),
        resultsContainer:  document.getElementById('resultsContainer'),

        // Score — hidden SVG ring (JS compat), visible text in card
        scoreValue:  document.getElementById('scoreValue'),
        scoreRing:   document.getElementById('scoreRing'),

        // Verdict — hidden compat wrappers kept for original logic
        verdictDisplay: document.getElementById('verdictDisplay'),
        verdictEmoji:   document.getElementById('verdictEmoji'),
        verdictText:    document.getElementById('verdictText'),   // now the big headline word

        // Meme card display elements (new brutalist card)
        resultCardPhoto: document.getElementById('resultCardPhoto'),
        verdictStamp:    document.getElementById('verdictStamp'),
        archetypeBar:    document.getElementById('archetypeBar'),
        archetypeValue:  document.getElementById('archetypeValue'),
        commentaryText:  document.getElementById('commentaryText'),
        strengthsList:   document.getElementById('strengthsList'),
        mistakesList:    document.getElementById('mistakesList'),

        // Backend-generated meme image (hidden, for download only)
        memeImage: document.getElementById('memeImage'),

        // Roasts counter
        roastsRemaining: document.getElementById('roastsRemaining'),
        roastsCount:     document.getElementById('roastsCount'),

        // Loading overlay
        loadingOverlay: document.getElementById('loadingOverlay'),

        // Outfit generator
        outfitCard:         document.getElementById('outfitCard'),
        generateOutfitsBtn: document.getElementById('generateOutfitsBtn'),
<<<<<<< HEAD
        outfitLoading: document.getElementById('outfitLoading'),
        outfitGrid: document.getElementById('outfitGrid'),
        outfitName1: document.getElementById('outfitName1'),
        outfitName2: document.getElementById('outfitName2'),
        outfitItems1: document.getElementById('outfitItems1'),
        outfitItems2: document.getElementById('outfitItems2'),
        
=======
        outfitLoading:      document.getElementById('outfitLoading'),
        outfitGrid:         document.getElementById('outfitGrid'),
        outfitName1:        document.getElementById('outfitName1'),
        outfitName2:        document.getElementById('outfitName2'),
        outfitItems1:       document.getElementById('outfitItems1'),
        outfitItems2:       document.getElementById('outfitItems2'),

>>>>>>> 1c63582 (`Removed generated outfit images and AI meme images`)
        // Action buttons
        downloadBtn:      document.getElementById('downloadBtn'),
        shareTwitterBtn:  document.getElementById('shareTwitterBtn'),
        shareWhatsAppBtn: document.getElementById('shareWhatsAppBtn'),
        tryAgainBtn:      document.getElementById('tryAgainBtn'),

        // Header buttons
        leaderboardBtn: document.getElementById('leaderboardBtn'),
        premiumBtn:     document.getElementById('premiumBtn'),

        // Challenge
        challengeBanner:  document.getElementById('challengeBanner'),
        joinChallengeBtn: document.getElementById('joinChallengeBtn'),

        // Modals
        leaderboardModal:    document.getElementById('leaderboardModal'),
        closeLeaderboardBtn: document.getElementById('closeLeaderboardBtn'),
        leaderboardList:     document.getElementById('leaderboardList'),

        premiumModal:    document.getElementById('premiumModal'),
        closePremiumBtn: document.getElementById('closePremiumBtn'),
        productsList:    document.getElementById('productsList'),

        challengeModal:      document.getElementById('challengeModal'),
        closeChallengeBtn:   document.getElementById('closeChallengeBtn'),
        challengeModalTitle: document.getElementById('challengeModalTitle'),
        challengeDesc:       document.getElementById('challengeDesc'),
        challengeParticipants: document.getElementById('challengeParticipants'),
        acceptChallengeBtn:  document.getElementById('acceptChallengeBtn'),

        toastContainer: document.getElementById('toastContainer')
    };

    // ============================================
    // State
    // ============================================
    let state = {
<<<<<<< HEAD
        currentFile: null,
        currentMemeData: null,
        currentScore: 0,
        currentVerdict: null,
        currentArchetype: null,
        currentCommentary: null,
        isLoading: false,
        isGeneratingOutfits: false,
        userId: localStorage.getItem('roast_user_id'),
        username: localStorage.getItem('roast_username'),
        isPremium: localStorage.getItem('roast_premium') === 'true',
        roastsRemaining: 3,
=======
        currentFile:           null,
        currentMemeData:       null,
        currentScore:          0,
        currentVerdict:        null,
        currentArchetype:      null,
        currentCommentary:     null,
        isLoading:             false,
        isGeneratingOutfits:   false,
        userId:      localStorage.getItem('roast_user_id'),
        username:    localStorage.getItem('roast_username'),
        isPremium:   localStorage.getItem('roast_premium') === 'true',
        roastsRemaining:  3,
>>>>>>> 1c63582 (`Removed generated outfit images and AI meme images`)
        currentChallenge: null
    };

    const API_BASE = window.location.origin;

    // ============================================
    // Initialization
    // ============================================
    function init() {
        setupEventListeners();
        addSVGGradient();
        loadUserData();
        loadChallenge();
    }

    // Keep SVG gradient for hidden score ring (JS compat)
    function addSVGGradient() {
        const svg = document.querySelector('.score-ring-svg');
        if (svg) {
            const defs = svg.querySelector('defs') || document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            defs.innerHTML = `
                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%"   style="stop-color:#ff4d4d"/>
                    <stop offset="50%"  style="stop-color:#ff8533"/>
                    <stop offset="100%" style="stop-color:#ffd93d"/>
                </linearGradient>`;
            if (!svg.contains(defs)) svg.insertBefore(defs, svg.firstChild);
        }
    }

    // ============================================
    // User Management
    // ============================================
    async function loadUserData() {
        if (state.userId) {
            try {
                const response = await fetch(`${API_BASE}/user/${state.userId}`);
                const data = await response.json();
                if (data.success && data.user) {
                    state.isPremium = data.user.is_premium;
                    state.roastsRemaining = Math.max(0, 3 - (data.user.total_roasts || 0));
                    if (data.user.is_premium) state.roastsRemaining = 999;
                    updateRoastsDisplay();
                }
            } catch (e) { console.log('Could not load user data'); }
        } else {
            await registerUser();
        }
    }

    async function registerUser() {
        const username = 'User' + Math.floor(Math.random() * 10000);
        try {
            const response = await fetch(`${API_BASE}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });
            const data = await response.json();
            if (data.success && data.user) {
                state.userId   = data.user.user_id;
                state.username = data.user.username;
                state.roastsRemaining = 3;
                localStorage.setItem('roast_user_id', state.userId);
                localStorage.setItem('roast_username', state.username);
                updateRoastsDisplay();
            }
        } catch (e) { console.log('Could not register user'); }
    }

    function updateRoastsDisplay() {
        if (elements.roastsCount && elements.roastsRemaining) {
            elements.roastsCount.textContent = state.isPremium ? '∞' : state.roastsRemaining;
            if (!state.isPremium && state.roastsRemaining <= 0) {
                elements.roastsRemaining.classList.add('limit-reached');
                showToast('Free limit reached! Go Pro for unlimited roasts.', 'error');
            }
        }
    }

    // ============================================
    // Challenge System
    // ============================================
    async function loadChallenge() {
        try {
            const response = await fetch(`${API_BASE}/challenges`);
            const data = await response.json();
            if (data.success && data.challenge) {
                state.currentChallenge = data.challenge;
                updateChallengeBanner(data.challenge);
            }
        } catch (e) { console.log('Could not load challenges'); }
    }

    function updateChallengeBanner(challenge) {
        if (elements.challengeBanner && elements.challengeText) {
            document.getElementById('challengeText').textContent =
                `${challenge.title} — ${challenge.participants.toLocaleString()} participating!`;
            elements.challengeBanner.classList.remove('hidden');
        }
    }

    // ============================================
    // Event Listeners
    // ============================================
    function setupEventListeners() {
        // FILE trigger button → opens file picker
        if (elements.fileTriggerBtn) {
            elements.fileTriggerBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                elements.fileInput.click();
            });
        }

        // SNAP trigger button → opens camera
        if (elements.snapTriggerBtn) {
            elements.snapTriggerBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                (elements.snapInput || elements.fileInput).click();
            });
        }

        // Dropzone click → file picker (when no file yet)
        elements.dropzone.addEventListener('click', (e) => {
            if (e.target === elements.removeImage || elements.removeImage.contains(e.target)) return;
            elements.fileInput.click();
        });
        elements.dropzone.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); elements.fileInput.click(); }
        });

        // File inputs
        elements.fileInput.addEventListener('change', handleFileSelect);
        if (elements.snapInput) elements.snapInput.addEventListener('change', handleFileSelect);

        // Drag and drop
        elements.dropzone.addEventListener('dragover',  handleDragOver);
        elements.dropzone.addEventListener('dragleave', handleDragLeave);
        elements.dropzone.addEventListener('drop',      handleDrop);

        // Remove image
        elements.removeImage.addEventListener('click', removeSelectedImage);

        // Analyze
        elements.analyzeBtn.addEventListener('click', analyzeOutfit);

        // Download
        elements.downloadBtn.addEventListener('click', downloadMeme);

        // Share
        if (elements.shareTwitterBtn)  elements.shareTwitterBtn.addEventListener('click',  () => shareResult('twitter'));
        if (elements.shareWhatsAppBtn) elements.shareWhatsAppBtn.addEventListener('click', () => shareResult('whatsapp'));

        // Try again
        elements.tryAgainBtn.addEventListener('click', resetApp);

        // Outfit generator
        if (elements.generateOutfitsBtn) elements.generateOutfitsBtn.addEventListener('click', generateOutfits);

        // Header buttons
        if (elements.leaderboardBtn) elements.leaderboardBtn.addEventListener('click', openLeaderboard);
        if (elements.premiumBtn)     elements.premiumBtn.addEventListener('click',     openPremium);

        // Challenge
        if (elements.joinChallengeBtn)  elements.joinChallengeBtn.addEventListener('click',  openChallenge);
        if (elements.acceptChallengeBtn) elements.acceptChallengeBtn.addEventListener('click', acceptChallenge);

        // Modal close buttons
        if (elements.closeLeaderboardBtn) elements.closeLeaderboardBtn.addEventListener('click', () => closeModal('leaderboard'));
        if (elements.closePremiumBtn)     elements.closePremiumBtn.addEventListener('click',     () => closeModal('premium'));
        if (elements.closeChallengeBtn)   elements.closeChallengeBtn.addEventListener('click',   () => closeModal('challenge'));

        // Click outside modal to close
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) closeModal('all');
        });

        document.addEventListener('keydown', handleKeyboard);
    }

    // ============================================
    // Modal Management
    // ============================================
    function openModal(type) {
        const modal = document.getElementById(`${type}Modal`);
        if (modal) { modal.classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
    }

    function closeModal(type) {
        if (type === 'all') {
            document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
        } else {
            const modal = document.getElementById(`${type}Modal`);
            if (modal) modal.classList.add('hidden');
        }
        document.body.style.overflow = '';
    }

    async function openLeaderboard() {
        openModal('leaderboard');
        if (elements.leaderboardList) {
            elements.leaderboardList.innerHTML = '<div class="modal-loading">LOADING...</div>';
            try {
                const response = await fetch(`${API_BASE}/leaderboard`);
                const data = await response.json();
                if (data.success && data.entries.length > 0) {
                    elements.leaderboardList.innerHTML = data.entries.map(entry => `
                        <div class="leaderboard-item">
                            <span class="leaderboard-rank">#${entry.rank}</span>
                            <span class="leaderboard-name">${escapeHtml(entry.username)}</span>
                            <span class="leaderboard-score">${entry.drip_score}</span>
                        </div>`).join('');
                } else {
                    elements.leaderboardList.innerHTML = '<div class="leaderboard-empty">NO RANKINGS YET. BE THE FIRST!</div>';
                }
            } catch (e) {
                elements.leaderboardList.innerHTML = '<div class="leaderboard-empty">COULD NOT LOAD LEADERBOARD</div>';
            }
        }
    }

    async function openPremium() {
        openModal('premium');
        if (elements.productsList) {
            elements.productsList.innerHTML = '<div class="modal-loading">LOADING PRODUCTS...</div>';
            try {
                const response = await fetch(`${API_BASE}/products`);
                const data = await response.json();
                if (data.success && data.products) {
                    elements.productsList.innerHTML = data.products.map(product => `
                        <div class="product-card">
                            <div class="product-info">
                                <h3 class="product-name">${escapeHtml(product.name)}</h3>
                                <p class="product-desc">${escapeHtml(product.description)}</p>
                            </div>
                            <div class="product-action">
                                <span class="product-price">$${product.price}</span>
                                <button class="buy-btn" onclick="window.app.purchase('${product.id}')">BUY</button>
                            </div>
                        </div>`).join('');
                }
            } catch (e) {
                elements.productsList.innerHTML = '<div class="modal-loading">COULD NOT LOAD PRODUCTS</div>';
            }
        }
    }

    function openChallenge() {
        if (state.currentChallenge) {
            if (elements.challengeModalTitle) elements.challengeModalTitle.textContent = state.currentChallenge.title;
            if (elements.challengeDesc)         elements.challengeDesc.textContent = state.currentChallenge.description;
            if (elements.challengeParticipants) elements.challengeParticipants.textContent = `${state.currentChallenge.participants.toLocaleString()} PEOPLE JOINED!`;
            openModal('challenge');
        }
    }

    function acceptChallenge() {
        showToast('Challenge accepted! Submit your fit to participate.', 'success');
        closeModal('challenge');
    }

    // Expose purchase globally
    window.app = window.app || {};
    window.app.purchase = async function(productId) {
        if (!state.userId) { showToast('Please wait while we set up your account...', 'error'); return; }
        try {
            const response = await fetch(`${API_BASE}/purchase`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: state.userId, product_id: productId })
            });
            const data = await response.json();
            if (data.success) {
                state.isPremium = true;
                localStorage.setItem('roast_premium', 'true');
                showToast('Purchase successful! Welcome to Pro!', 'success');
                closeModal('premium');
                updateRoastsDisplay();
            } else {
                showToast(data.error || 'Purchase failed', 'error');
            }
        } catch (e) { showToast('Could not process purchase', 'error'); }
    };

    // ============================================
    // File Handling
    // ============================================
    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) processFile(file);
    }

    function handleDragOver(e) {
        e.preventDefault(); e.stopPropagation();
        elements.dropzone.classList.add('drag-over');
    }

    function handleDragLeave(e) {
        e.preventDefault(); e.stopPropagation();
        elements.dropzone.classList.remove('drag-over');
    }

    function handleDrop(e) {
        e.preventDefault(); e.stopPropagation();
        elements.dropzone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0) processFile(files[0]);
    }

    function processFile(file) {
        if (!state.isPremium && state.roastsRemaining <= 0) {
            showToast('Free limit reached! Go Pro for unlimited roasts.', 'error');
            openPremium(); return;
        }
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!validTypes.includes(file.type)) { showToast('Please upload a JPEG or PNG image', 'error'); return; }
        if (file.size > 10 * 1024 * 1024)    { showToast('Image must be less than 10MB', 'error'); return; }

        state.currentFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            elements.previewImage.src = e.target.result;
            elements.previewContainer.classList.remove('hidden');
            elements.dropzoneContent.style.display = 'none';
            elements.dropzone.classList.add('has-file');
            elements.analyzeBtn.disabled = false;
        };
        reader.readAsDataURL(file);
    }

    function removeSelectedImage(e) {
        e.stopPropagation();
        resetFileInput();
        state.currentFile = null;
    }

    function resetFileInput() {
        elements.fileInput.value = '';
        if (elements.snapInput) elements.snapInput.value = '';
        elements.previewContainer.classList.add('hidden');
        elements.dropzoneContent.style.display = '';
        elements.dropzone.classList.remove('has-file');
        elements.analyzeBtn.disabled = true;
    }

    // ============================================
    // API Communication
    // ============================================
    async function analyzeOutfit() {
        if (!state.currentFile || state.isLoading) return;

        if (!state.isPremium && state.roastsRemaining <= 0) {
            showToast('Free limit reached! Go Pro for unlimited roasts.', 'error');
            openPremium(); return;
        }

        setLoading(true);

        const formData = new FormData();
        formData.append('file', state.currentFile);

        const headers = {};
        if (state.userId) headers['x-user-id'] = state.userId;

        try {
            const response = await fetch(`${API_BASE}/analyze`, {
                method: 'POST', headers, body: formData
            });
            const result = await response.json();

            if (result.success && result.data) {
                displayResults(result.data);
                if (!state.isPremium) { state.roastsRemaining--; updateRoastsDisplay(); }
            } else {
                showToast(result.error || 'Analysis failed. Please try again.', 'error');
                if (result.error && result.error.includes('Free limit')) openPremium();
            }
        } catch (error) {
            console.error('Error:', error);
            if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                showToast('Cannot connect to server. Make sure the backend is running.', 'error');
            } else {
                showToast('An error occurred. Please try again.', 'error');
            }
        } finally {
            setLoading(false);
        }
    }

    // ============================================
    // Results Display
    // ============================================
    function displayResults(data) {
        // Hide upload, show results
        elements.uploadCard.classList.add('hidden');
        elements.resultsContainer.classList.remove('hidden');

        const isToast = data.verdict === 'TOAST';

        // ── New meme card elements ──────────────────────────

        // Mirror uploaded photo to the result card
        if (elements.resultCardPhoto && elements.previewImage) {
            elements.resultCardPhoto.src = elements.previewImage.src;
        }

        // Verdict stamp on photo
        if (elements.verdictStamp) {
            elements.verdictStamp.textContent = data.verdict;
            elements.verdictStamp.className = 'mc-stamp' + (isToast ? ' is-toast' : '');
        }

        // Archetype bar colour
        if (elements.archetypeBar) {
            elements.archetypeBar.className = 'mc-archetype-bar' + (isToast ? ' is-toast' : '');
        }

        // Headline verdict word + colour
        if (elements.verdictText) {
            elements.verdictText.textContent = data.verdict;
            elements.verdictText.className = 'vh-verdict' + (isToast ? '' : ' is-roast');
        }

        // Archetype, commentary
        elements.archetypeValue.textContent = data.archetype;
        elements.commentaryText.textContent  = data.commentary;

        // Strengths list
        elements.strengthsList.innerHTML = data.strengths
            .map(s => `<li>${escapeHtml(s)}</li>`).join('');

        // Mistakes list
        elements.mistakesList.innerHTML = data.mistakes
            .map(m => `<li>${escapeHtml(m)}</li>`).join('');

        // ── Original compat fields ──────────────────────────

        // Animate score number
        animateScore(data.drip_score);

        // Hidden verdict compat elements (original logic)
        elements.verdictDisplay.className = 'verdict-display ' + (isToast ? 'toast' : 'roast');
        elements.verdictEmoji.textContent  = isToast ? '🔥' : '❄️';

        // Backend meme image (hidden, for download)
        elements.memeImage.src = data.meme_image;
<<<<<<< HEAD
        state.currentMemeData = data.meme_image;
        state.currentScore = data.drip_score;
        
        // Store additional data for sharing with caption
        state.currentVerdict = data.verdict;
        state.currentArchetype = data.archetype;
        state.currentCommentary = data.commentary;
=======
>>>>>>> 1c63582 (`Removed generated outfit images and AI meme images`)

        // Store state for sharing
        state.currentMemeData   = data.meme_image;
        state.currentScore      = data.drip_score;
        state.currentVerdict    = data.verdict;
        state.currentArchetype  = data.archetype;
        state.currentCommentary = data.commentary;

        // Score ring animation (hidden SVG — kept for compat)
        setTimeout(() => {
            const circumference = 2 * Math.PI * 54;
            const progress = (data.drip_score / 100) * circumference;
            if (elements.scoreRing) {
                elements.scoreRing.style.strokeDashoffset = circumference - progress;
            }
        }, 100);

        // Scroll to results
        elements.resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        showToast('Analysis complete! 🔥', 'success');
    }

    function animateScore(targetScore) {
        let current = 0;
        const duration = 1500;
        const start = performance.now();

        function tick(now) {
            const elapsed  = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased    = 1 - Math.pow(1 - progress, 3);
            current = Math.round(targetScore * eased);
            if (elements.scoreValue) elements.scoreValue.textContent = current;
            updateScoreColor(current);
            if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }

    function updateScoreColor(score) {
        const gradient = document.getElementById('scoreGradient');
        if (!gradient) return;
        if (score >= 70) {
            gradient.innerHTML = '<stop offset="0%" style="stop-color:#c8ff00"/><stop offset="100%" style="stop-color:#10b981"/>';
        } else if (score >= 45) {
            gradient.innerHTML = '<stop offset="0%" style="stop-color:#ffe500"/><stop offset="100%" style="stop-color:#f59e0b"/>';
        } else {
            gradient.innerHTML = '<stop offset="0%" style="stop-color:#ff0033"/><stop offset="100%" style="stop-color:#ff8533"/>';
        }
    }

    // ============================================
    // Actions
    // ============================================
    function downloadMeme() {
        if (!state.currentMemeData) return;
        const link = document.createElement('a');
        link.href     = state.currentMemeData;
        link.download = `roast-or-toast-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Meme downloaded!', 'success');
    }

    async function shareResult(platform) {
        if (!state.currentMemeData) return;

<<<<<<< HEAD
        // Build comprehensive share text with caption
        let shareText = `My drip score is ${state.currentScore}/100 on Roast or Toast! ${state.currentVerdict === 'TOAST' ? '🔥' : '❄️'}`;
        
        // Add archetype and commentary to share text
        if (state.currentArchetype) {
            shareText += `\n\nStyle: ${state.currentArchetype}`;
        }
        if (state.currentCommentary) {
            shareText += `\n"${state.currentCommentary}"`;
        }
        shareText += `\n\n#RoastOrToast #DripCheck`;
        
        try {
            if (platform === 'twitter') {
                // Twitter has character limit, so truncate if needed
                const truncatedText = shareText.length > 280 ? shareText.substring(0, 277) + '...' : shareText;
                const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(truncatedText)}`;
                window.open(twitterUrl, '_blank');
=======
        let shareText = `My drip score is ${state.currentScore}/100 on Roast or Toast! ${state.currentVerdict === 'TOAST' ? '🔥' : '❄️'}`;
        if (state.currentArchetype)  shareText += `\n\nStyle: ${state.currentArchetype}`;
        if (state.currentCommentary) shareText += `\n"${state.currentCommentary}"`;
        shareText += '\n\n#RoastOrToast #DripCheck';

        try {
            if (platform === 'twitter') {
                const truncated = shareText.length > 280 ? shareText.substring(0, 277) + '...' : shareText;
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(truncated)}`, '_blank');
>>>>>>> 1c63582 (`Removed generated outfit images and AI meme images`)
            } else if (platform === 'whatsapp') {
                window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
            } else {
<<<<<<< HEAD
                // Native share - includes both image and full caption text
=======
>>>>>>> 1c63582 (`Removed generated outfit images and AI meme images`)
                const response = await fetch(state.currentMemeData);
                const blob = await response.blob();
                const file = new File([blob], 'roast-or-toast.png', { type: 'image/png' });
                if (navigator.share && navigator.canShare({ files: [file] })) {
                    await navigator.share({ title: 'Roast or Toast', text: shareText, files: [file] });
                } else {
<<<<<<< HEAD
                    // Fallback: copy image to clipboard if supported, otherwise just text
                    try {
                        const item = new ClipboardItem({ 'image/png': blob });
                        await navigator.clipboard.write([item]);
                        await navigator.clipboard.writeText(shareText);
                        showToast('Meme and caption copied to clipboard!', 'success');
=======
                    try {
                        const item = new ClipboardItem({ 'image/png': blob });
                        await navigator.clipboard.write([item]);
                        showToast('Meme copied to clipboard!', 'success');
>>>>>>> 1c63582 (`Removed generated outfit images and AI meme images`)
                    } catch (e) {
                        await navigator.clipboard.writeText(shareText);
                        showToast('Caption copied to clipboard!', 'success');
                    }
                }
            }

            // Track share for rewards
            if (state.userId && ['twitter', 'whatsapp', 'instagram'].includes(platform)) {
                try {
                    await fetch(`${API_BASE}/share`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ user_id: state.userId, platform })
                    });
                    state.roastsRemaining++;
                    updateRoastsDisplay();
                    showToast('+1 free roast earned for sharing!', 'success');
                } catch (e) { console.log('Could not track share'); }
            }
        } catch (error) {
            if (error.name !== 'AbortError') showToast('Could not share. Try downloading instead.', 'error');
        }
    }

    function resetApp() {
        // Reset state
<<<<<<< HEAD
        state.currentFile = null;
        state.currentMemeData = null;
        state.currentScore = 0;
        state.currentVerdict = null;
        state.currentArchetype = null;
        state.currentCommentary = null;
=======
        state.currentFile         = null;
        state.currentMemeData     = null;
        state.currentScore        = 0;
        state.currentVerdict      = null;
        state.currentArchetype    = null;
        state.currentCommentary   = null;
>>>>>>> 1c63582 (`Removed generated outfit images and AI meme images`)
        state.isGeneratingOutfits = false;

        resetFileInput();

        // Reset hidden score ring
        if (elements.scoreRing) elements.scoreRing.style.strokeDashoffset = '339.292';

        // Reset verdict compat elements
        elements.verdictDisplay.className = 'verdict-display';
        elements.verdictEmoji.textContent = '';

        // Reset new card elements
        if (elements.verdictText) {
            elements.verdictText.textContent = 'VERDICT';
            elements.verdictText.className   = 'vh-verdict';
        }
        if (elements.verdictStamp)   { elements.verdictStamp.textContent = 'ROAST'; elements.verdictStamp.className = 'mc-stamp'; }
        if (elements.archetypeBar)   elements.archetypeBar.className = 'mc-archetype-bar';
        if (elements.resultCardPhoto){ elements.resultCardPhoto.src = ''; }
        if (elements.scoreValue)     elements.scoreValue.textContent = '0';

        elements.archetypeValue.textContent = '—';
        elements.commentaryText.textContent  = '';
        elements.strengthsList.innerHTML     = '';
        elements.mistakesList.innerHTML      = '';
        elements.memeImage.src               = '';

        // Reset outfit generator
        if (elements.outfitGrid)    elements.outfitGrid.classList.add('hidden');
        if (elements.outfitLoading) elements.outfitLoading.classList.add('hidden');
        if (elements.generateOutfitsBtn) elements.generateOutfitsBtn.disabled = false;

        // Show upload, hide results
        elements.resultsContainer.classList.add('hidden');
        elements.uploadCard.classList.remove('hidden');

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async function generateOutfits() {
        if (!state.currentFile)          { showToast('Upload an image first.', 'error'); return; }
        if (state.isGeneratingOutfits)     return;

        state.isGeneratingOutfits = true;
        if (elements.outfitLoading) elements.outfitLoading.classList.remove('hidden');
        if (elements.outfitGrid)    elements.outfitGrid.classList.add('hidden');
        if (elements.generateOutfitsBtn) elements.generateOutfitsBtn.disabled = true;

        const formData = new FormData();
        formData.append('image', state.currentFile);

        try {
            const response = await fetch(`${API_BASE}/generate-outfits`, { method: 'POST', body: formData });
            if (!response.ok) { const msg = await response.text(); throw new Error(msg || 'Failed'); }
            const payload = await response.json();
            const outfits = Array.isArray(payload.outfits) ? payload.outfits : [];
            if (!outfits.length) { showToast('AI could not generate outfits. Try another photo.', 'error'); return; }
            updateOutfitUI(outfits);
            showToast('AI outfit ideas ready!', 'success');
        } catch (error) {
            console.error('Outfit generation error:', error);
            showToast('Could not generate outfits. Please try again.', 'error');
        } finally {
            state.isGeneratingOutfits = false;
            if (elements.outfitLoading) elements.outfitLoading.classList.add('hidden');
            if (elements.generateOutfitsBtn) elements.generateOutfitsBtn.disabled = false;
        }
    }

    function updateOutfitUI(outfits) {
        const first  = outfits[0] || {};
        const second = outfits[1] || first;

<<<<<<< HEAD
        function applyCard(nameEl, listEl, data, indexLabel) {
            if (!nameEl || !listEl) return;

            nameEl.textContent = data.outfit_name || `Outfit Option ${indexLabel}`;

=======
        function applyCard(nameEl, listEl, data, idx) {
            if (!nameEl || !listEl) return;
            nameEl.textContent = data.outfit_name || `OUTFIT ${idx}`;
>>>>>>> 1c63582 (`Removed generated outfit images and AI meme images`)
            const items = Array.isArray(data.items) ? data.items : [];
            listEl.innerHTML = items.map(i => `<li>${escapeHtml(String(i))}</li>`).join('');
        }

<<<<<<< HEAD
        applyCard(elements.outfitName1, elements.outfitItems1, first, 1);
        applyCard(elements.outfitName2, elements.outfitItems2, second, 2);

        if (elements.outfitGrid) {
            elements.outfitGrid.classList.remove('hidden');
        }
=======
        applyCard(elements.outfitName1, elements.outfitItems1, first,  1);
        applyCard(elements.outfitName2, elements.outfitItems2, second, 2);
        if (elements.outfitGrid) elements.outfitGrid.classList.remove('hidden');
>>>>>>> 1c63582 (`Removed generated outfit images and AI meme images`)
    }

    // ============================================
    // Utilities
    // ============================================
    function setLoading(loading) {
        state.isLoading = loading;

        if (loading) {
            elements.analyzeBtn.classList.add('loading');
            elements.analyzeBtn.disabled = true;
            // Show full-screen loading overlay
            if (elements.loadingOverlay) elements.loadingOverlay.classList.remove('hidden');
        } else {
            elements.analyzeBtn.classList.remove('loading');
            if (state.currentFile) elements.analyzeBtn.disabled = false;
            // Hide loading overlay
            if (elements.loadingOverlay) elements.loadingOverlay.classList.add('hidden');
        }
    }

    function showToast(message, type = 'error') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span>${escapeHtml(message)}</span>`;
        elements.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function handleKeyboard(e) {
        if (e.key === 'Escape') {
            if (!elements.resultsContainer.classList.contains('hidden')) resetApp();
            closeModal('all');
        }
        if (e.key === 'Enter' && state.currentFile && !state.isLoading) analyzeOutfit();
    }

    // ============================================
    // Boot
    // ============================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
