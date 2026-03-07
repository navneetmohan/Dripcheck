/**
 * Roast or Toast - Frontend Application
 * Handles image upload, API communication, and result display
 * Includes Growth Features & Monetization
 */

(function() {
    'use strict';

    // ============================================
    // DOM Elements
    // ============================================
    const elements = {
        // Upload elements
        dropzone: document.getElementById('dropzone'),
        dropzoneContent: document.getElementById('dropzoneContent'),
        fileInput: document.getElementById('fileInput'),
        previewContainer: document.getElementById('previewContainer'),
        previewImage: document.getElementById('previewImage'),
        removeImage: document.getElementById('removeImage'),
        analyzeBtn: document.getElementById('analyzeBtn'),
        
        // Results elements
        uploadCard: document.getElementById('uploadCard'),
        resultsContainer: document.getElementById('resultsContainer'),
        scoreValue: document.getElementById('scoreValue'),
        scoreRing: document.getElementById('scoreRing'),
        verdictDisplay: document.getElementById('verdictDisplay'),
        verdictEmoji: document.getElementById('verdictEmoji'),
        verdictText: document.getElementById('verdictText'),
        archetypeValue: document.getElementById('archetypeValue'),
        commentaryText: document.getElementById('commentaryText'),
        strengthsList: document.getElementById('strengthsList'),
        mistakesList: document.getElementById('mistakesList'),
        memeImage: document.getElementById('memeImage'),
        
        // Roasts remaining
        roastsRemaining: document.getElementById('roastsRemaining'),
        roastsCount: document.getElementById('roastsCount'),
        
        // Outfit generator elements
        outfitCard: document.getElementById('outfitCard'),
        generateOutfitsBtn: document.getElementById('generateOutfitsBtn'),
        outfitLoading: document.getElementById('outfitLoading'),
        outfitGrid: document.getElementById('outfitGrid'),
        outfitImage1: document.getElementById('outfitImage1'),
        outfitImage2: document.getElementById('outfitImage2'),
        outfitName1: document.getElementById('outfitName1'),
        outfitName2: document.getElementById('outfitName2'),
        outfitItems1: document.getElementById('outfitItems1'),
        outfitItems2: document.getElementById('outfitItems2'),
        
        // Action buttons
        downloadBtn: document.getElementById('downloadBtn'),
        shareBtn: document.getElementById('shareBtn'),
        shareTwitterBtn: document.getElementById('shareTwitterBtn'),
        shareWhatsAppBtn: document.getElementById('shareWhatsAppBtn'),
        tryAgainBtn: document.getElementById('tryAgainBtn'),
        
        // Header buttons
        leaderboardBtn: document.getElementById('leaderboardBtn'),
        premiumBtn: document.getElementById('premiumBtn'),
        
        // Challenge
        challengeBanner: document.getElementById('challengeBanner'),
        joinChallengeBtn: document.getElementById('joinChallengeBtn'),
        
        // Modals
        leaderboardModal: document.getElementById('leaderboardModal'),
        closeLeaderboardBtn: document.getElementById('closeLeaderboardBtn'),
        leaderboardList: document.getElementById('leaderboardList'),
        
        premiumModal: document.getElementById('premiumModal'),
        closePremiumBtn: document.getElementById('closePremiumBtn'),
        productsList: document.getElementById('productsList'),
        
        challengeModal: document.getElementById('challengeModal'),
        closeChallengeBtn: document.getElementById('closeChallengeBtn'),
        challengeModalTitle: document.getElementById('challengeModalTitle'),
        challengeDesc: document.getElementById('challengeDesc'),
        challengeParticipants: document.getElementById('challengeParticipants'),
        acceptChallengeBtn: document.getElementById('acceptChallengeBtn'),
        
        // Toast container
        toastContainer: document.getElementById('toastContainer')
    };

    // ============================================
    // State
    // ============================================
    let state = {
        currentFile: null,
        currentMemeData: null,
        currentScore: 0,
        isLoading: false,
        isGeneratingOutfits: false,
        userId: localStorage.getItem('roast_user_id'),
        username: localStorage.getItem('roast_username'),
        isPremium: localStorage.getItem('roast_premium') === 'true',
        roastsRemaining: 3,
        currentChallenge: null
    };

    // API Base URL
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

    // Add SVG gradient for score ring
    function addSVGGradient() {
        const svg = document.querySelector('.score-ring-svg');
        if (svg) {
            const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            defs.innerHTML = `
                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:#ff4d4d"/>
                    <stop offset="50%" style="stop-color:#ff8533"/>
                    <stop offset="100%" style="stop-color:#ffd93d"/>
                </linearGradient>
            `;
            svg.insertBefore(defs, svg.firstChild);
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
                    if (data.user.is_premium) {
                        state.roastsRemaining = 999; // Unlimited
                    }
                    updateRoastsDisplay();
                }
            } catch (e) {
                console.log('Could not load user data');
            }
        } else {
            // Auto-register anonymous user
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
                state.userId = data.user.user_id;
                state.username = data.user.username;
                state.roastsRemaining = 3;
                localStorage.setItem('roast_user_id', state.userId);
                localStorage.setItem('roast_username', state.username);
                updateRoastsDisplay();
            }
        } catch (e) {
            console.log('Could not register user');
        }
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
        } catch (e) {
            console.log('Could not load challenges');
        }
    }

    function updateChallengeBanner(challenge) {
        if (elements.challengeBanner && elements.challengeText) {
            elements.challengeText.textContent = `${challenge.title} - ${challenge.participants.toLocaleString()} participating!`;
            elements.challengeBanner.classList.remove('hidden');
        }
    }

    // ============================================
    // Event Listeners
    // ============================================
    function setupEventListeners() {
        // Dropzone click and keyboard (Enter/Space)
        elements.dropzone.addEventListener('click', (e) => {
            if (e.target !== elements.removeImage && !elements.removeImage.contains(e.target)) {
                elements.fileInput.click();
            }
        });
        elements.dropzone.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                elements.fileInput.click();
            }
        });

        // File input change
        elements.fileInput.addEventListener('change', handleFileSelect);

        // Drag and drop
        elements.dropzone.addEventListener('dragover', handleDragOver);
        elements.dropzone.addEventListener('dragleave', handleDragLeave);
        elements.dropzone.addEventListener('drop', handleDrop);

        // Remove image
        elements.removeImage.addEventListener('click', removeSelectedImage);

        // Analyze button
        elements.analyzeBtn.addEventListener('click', analyzeOutfit);

        // Download button
        elements.downloadBtn.addEventListener('click', downloadMeme);

        // Share buttons
        if (elements.shareBtn) elements.shareBtn.addEventListener('click', () => shareResult('share'));
        if (elements.shareTwitterBtn) elements.shareTwitterBtn.addEventListener('click', () => shareResult('twitter'));
        if (elements.shareWhatsAppBtn) elements.shareWhatsAppBtn.addEventListener('click', () => shareResult('whatsapp'));

        // Try again button
        elements.tryAgainBtn.addEventListener('click', resetApp);

        // Outfit generator button
        if (elements.generateOutfitsBtn) {
            elements.generateOutfitsBtn.addEventListener('click', generateOutfits);
        }

        // Header buttons
        if (elements.leaderboardBtn) elements.leaderboardBtn.addEventListener('click', openLeaderboard);
        if (elements.premiumBtn) elements.premiumBtn.addEventListener('click', openPremium);

        // Challenge
        if (elements.joinChallengeBtn) elements.joinChallengeBtn.addEventListener('click', openChallenge);
        if (elements.acceptChallengeBtn) elements.acceptChallengeBtn.addEventListener('click', acceptChallenge);

        // Modal close buttons
        if (elements.closeLeaderboardBtn) elements.closeLeaderboardBtn.addEventListener('click', () => closeModal('leaderboard'));
        if (elements.closePremiumBtn) elements.closePremiumBtn.addEventListener('click', () => closeModal('premium'));
        if (elements.closeChallengeBtn) elements.closeChallengeBtn.addEventListener('click', () => closeModal('challenge'));

        // Click outside modal to close
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                closeModal('all');
            }
        });

        // Keyboard accessibility
        document.addEventListener('keydown', handleKeyboard);
    }

    // ============================================
    // Modal Management
    // ============================================
    function openModal(type) {
        const modal = document.getElementById(`${type}Modal`);
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
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
            elements.leaderboardList.innerHTML = '<div class="leaderboard-loading">Loading...</div>';
            try {
                const response = await fetch(`${API_BASE}/leaderboard`);
                const data = await response.json();
                if (data.success && data.entries.length > 0) {
                    elements.leaderboardList.innerHTML = data.entries.map(entry => `
                        <div class="leaderboard-item">
                            <span class="leaderboard-rank">#${entry.rank}</span>
                            <span class="leaderboard-name">${escapeHtml(entry.username)}</span>
                            <span class="leaderboard-score">${entry.drip_score}</span>
                        </div>
                    `).join('');
                } else {
                    elements.leaderboardList.innerHTML = '<div class="leaderboard-empty">No rankings yet. Be the first!</div>';
                }
            } catch (e) {
                elements.leaderboardList.innerHTML = '<div class="leaderboard-empty">Could not load leaderboard</div>';
            }
        }
    }

    async function openPremium() {
        openModal('premium');
        if (elements.productsList) {
            elements.productsList.innerHTML = '<div class="product-loading">Loading products...</div>';
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
                                <button class="buy-btn" onclick="window.app.purchase('${product.id}')">Buy</button>
                            </div>
                        </div>
                    `).join('');
                }
            } catch (e) {
                elements.productsList.innerHTML = '<div class="product-error">Could not load products</div>';
            }
        }
    }

    function openChallenge() {
        if (state.currentChallenge) {
            if (elements.challengeModalTitle) elements.challengeModalTitle.textContent = state.currentChallenge.title;
            if (elements.challengeDesc) elements.challengeDesc.textContent = state.currentChallenge.description;
            if (elements.challengeParticipants) elements.challengeParticipants.textContent = `${state.currentChallenge.participants.toLocaleString()} people joined!`;
            openModal('challenge');
        }
    }

    function acceptChallenge() {
        showToast('Challenge accepted! Submit your fit to participate.', 'success');
        closeModal('challenge');
    }

    // Expose purchase function globally
    window.app = window.app || {};
    window.app.purchase = async function(productId) {
        if (!state.userId) {
            showToast('Please wait while we set up your account...', 'error');
            return;
        }
        
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
        } catch (e) {
            showToast('Could not process purchase', 'error');
        }
    };

    // ============================================
    // File Handling
    // ============================================
    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            processFile(file);
        }
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        elements.dropzone.classList.add('drag-over');
    }

    function handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        elements.dropzone.classList.remove('drag-over');
    }

    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        elements.dropzone.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            processFile(files[0]);
        }
    }

    function processFile(file) {
        // Check roast limits for free users
        if (!state.isPremium && state.roastsRemaining <= 0) {
            showToast('Free limit reached! Go Pro for unlimited roasts.', 'error');
            openPremium();
            return;
        }

        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!validTypes.includes(file.type)) {
            showToast('Please upload a JPEG or PNG image', 'error');
            return;
        }

        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
            showToast('Image must be less than 10MB', 'error');
            return;
        }

        state.currentFile = file;
        
        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
            elements.previewImage.src = e.target.result;
            elements.previewContainer.classList.remove('hidden');
            elements.dropzoneContent.style.display = 'none';
            elements.dropzone.classList.add('has-file');
            elements.analyzeBtn.disabled = false;
            
            // Animate preview
            elements.previewImage.style.animation = 'fadeInUp 0.3s ease-out';
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

        // Check roast limits
        if (!state.isPremium && state.roastsRemaining <= 0) {
            showToast('Free limit reached! Go Pro for unlimited roasts.', 'error');
            openPremium();
            return;
        }

        setLoading(true);

        const formData = new FormData();
        formData.append('file', state.currentFile);

        // Add user ID header if available
        const headers = {};
        if (state.userId) {
            headers['x-user-id'] = state.userId;
        }

        try {
            const response = await fetch(`${API_BASE}/analyze`, {
                method: 'POST',
                headers,
                body: formData
            });

            const result = await response.json();

            if (result.success && result.data) {
                displayResults(result.data);
                // Update remaining roasts
                if (!state.isPremium) {
                    state.roastsRemaining--;
                    updateRoastsDisplay();
                }
            } else {
                showToast(result.error || 'Analysis failed. Please try again.', 'error');
                if (result.error && result.error.includes('Free limit')) {
                    openPremium();
                }
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
        // Hide upload card, show results
        elements.uploadCard.classList.add('hidden');
        elements.resultsContainer.classList.remove('hidden');

        // Animate score
        animateScore(data.drip_score);

        // Update verdict
        const isToast = data.verdict === 'TOAST';
        elements.verdictDisplay.className = 'verdict-display ' + (isToast ? 'toast' : 'roast');
        elements.verdictEmoji.textContent = isToast ? '🔥' : '❄️';
        elements.verdictText.textContent = data.verdict;

        // Update archetype
        elements.archetypeValue.textContent = data.archetype;

        // Update commentary
        elements.commentaryText.textContent = data.commentary;

        // Update strengths
        elements.strengthsList.innerHTML = data.strengths
            .map(s => `<li>${escapeHtml(s)}</li>`)
            .join('');

        // Update mistakes
        elements.mistakesList.innerHTML = data.mistakes
            .map(m => `<li>${escapeHtml(m)}</li>`)
            .join('');

        // Set meme image
        elements.memeImage.src = data.meme_image;
        state.currentMemeData = data.meme_image;
        state.currentScore = data.drip_score;

        // Animate score ring
        setTimeout(() => {
            const circumference = 2 * Math.PI * 54;
            const progress = (data.drip_score / 100) * circumference;
            elements.scoreRing.style.strokeDashoffset = circumference - progress;
        }, 100);

        // Scroll to results
        elements.resultsContainer.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });

        // Show success toast
        showToast('Analysis complete!', 'success');
    }

    function animateScore(targetScore) {
        let currentScore = 0;
        const duration = 1500;
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out cubic)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            
            currentScore = Math.round(targetScore * easeOut);
            elements.scoreValue.textContent = currentScore;

            // Update score ring color based on score
            updateScoreColor(currentScore);

            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }

        requestAnimationFrame(update);
    }

    function updateScoreColor(score) {
        const scoreRing = elements.scoreRing;
        let color;
        
        if (score >= 70) {
            color = '#10b981'; // Green
        } else if (score >= 45) {
            color = '#ffd93d'; // Yellow
        } else {
            color = '#ff4d4d'; // Red
        }
        
        // Update gradient
        const gradient = document.getElementById('scoreGradient');
        if (gradient) {
            if (score >= 70) {
                gradient.innerHTML = '<stop offset="0%" style="stop-color:#10b981"/><stop offset="100%" style="stop-color:#34d399"/>';
            } else if (score >= 45) {
                gradient.innerHTML = '<stop offset="0%" style="stop-color:#ffd93d"/><stop offset="100%" style="stop-color:#f59e0b"/>';
            } else {
                gradient.innerHTML = '<stop offset="0%" style="stop-color:#ff4d4d"/><stop offset="100%" style="stop-color:#ff8533"/>';
            }
        }
    }

    // ============================================
    // Actions
    // ============================================
    function downloadMeme() {
        if (!state.currentMemeData) return;

        const link = document.createElement('a');
        link.href = state.currentMemeData;
        link.download = `roast-or-toast-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast('Meme downloaded!', 'success');
    }

    async function shareResult(platform) {
        if (!state.currentMemeData) return;

        let shareText = `My drip score is ${state.currentScore}/100 on Roast or Toast! 🔥`;
        
        try {
            if (platform === 'twitter') {
                const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
                window.open(twitterUrl, '_blank');
            } else if (platform === 'whatsapp') {
                const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
                window.open(whatsappUrl, '_blank');
            } else {
                // Native share
                const response = await fetch(state.currentMemeData);
                const blob = await response.blob();
                const file = new File([blob], 'roast-or-toast.png', { type: 'image/png' });

                if (navigator.share && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        title: 'Roast or Toast',
                        text: shareText,
                        files: [file]
                    });
                } else {
                    await navigator.clipboard.writeText(shareText);
                    showToast('Link copied to clipboard!', 'success');
                }
            }

            // Track share for rewards
            if (state.userId && ['twitter', 'whatsapp', 'instagram', 'share'].includes(platform)) {
                try {
                    await fetch(`${API_BASE}/share`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ user_id: state.userId, platform })
                    });
                    // Award free roast
                    state.roastsRemaining++;
                    updateRoastsDisplay();
                    showToast('+1 free roast earned for sharing!', 'success');
                } catch (e) {
                    console.log('Could not track share');
                }
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                showToast('Could not share. Try downloading instead.', 'error');
            }
        }
    }

    function resetApp() {
        // Reset state
        state.currentFile = null;
        state.currentMemeData = null;
        state.currentScore = 0;
        state.isGeneratingOutfits = false;
        
        // Reset file input
        resetFileInput();
        
        // Reset score ring
        elements.scoreRing.style.strokeDashoffset = '339.292';
        
        // Reset verdict
        elements.verdictDisplay.className = 'verdict-display';
        elements.verdictEmoji.textContent = '';
        elements.verdictText.textContent = '';
        
        // Reset other elements
        elements.archetypeValue.textContent = '-';
        elements.commentaryText.textContent = '';
        elements.strengthsList.innerHTML = '';
        elements.mistakesList.innerHTML = '';
        elements.memeImage.src = '';
        elements.scoreValue.textContent = '0';

        // Reset outfit generator
        if (elements.outfitGrid && elements.outfitLoading) {
            elements.outfitGrid.classList.add('hidden');
            elements.outfitLoading.classList.add('hidden');
        }
        if (elements.generateOutfitsBtn) {
            elements.generateOutfitsBtn.disabled = false;
        }
        
        // Show upload card, hide results
        elements.resultsContainer.classList.add('hidden');
        elements.uploadCard.classList.remove('hidden');
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async function generateOutfits() {
        if (!state.currentFile) {
            showToast('Upload an image first to generate outfits.', 'error');
            return;
        }
        if (state.isGeneratingOutfits) return;

        state.isGeneratingOutfits = true;

        if (elements.outfitLoading) {
            elements.outfitLoading.classList.remove('hidden');
        }
        if (elements.outfitGrid) {
            elements.outfitGrid.classList.add('hidden');
        }
        if (elements.generateOutfitsBtn) {
            elements.generateOutfitsBtn.disabled = true;
        }

        const formData = new FormData();
        formData.append('image', state.currentFile);

        try {
            const response = await fetch(`${API_BASE}/generate-outfits`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const message = await response.text();
                throw new Error(message || 'Failed to generate outfits');
            }

            const payload = await response.json();
            const outfits = Array.isArray(payload.outfits) ? payload.outfits : [];

            if (!outfits.length) {
                showToast('AI could not generate outfits. Try another photo.', 'error');
                return;
            }

            updateOutfitUI(outfits);
            showToast('AI outfit ideas ready!', 'success');
        } catch (error) {
            console.error('Outfit generation error:', error);
            showToast('Could not generate outfits. Please try again.', 'error');
        } finally {
            state.isGeneratingOutfits = false;
            if (elements.outfitLoading) {
                elements.outfitLoading.classList.add('hidden');
            }
            if (elements.generateOutfitsBtn) {
                elements.generateOutfitsBtn.disabled = false;
            }
        }
    }

    function updateOutfitUI(outfits) {
        const first = outfits[0] || {};
        const second = outfits[1] || first;

        function applyCard(imageEl, nameEl, listEl, data, indexLabel) {
            if (!imageEl || !nameEl || !listEl) return;

            const src = typeof data.image === 'string' && data.image
                ? (data.image.startsWith('http') ? data.image : `${API_BASE}${data.image}`)
                : '';
            if (src) {
                imageEl.src = src;
                imageEl.alt = data.outfit_name || `AI outfit option ${indexLabel}`;
            }

            nameEl.textContent = data.outfit_name || `Outfit Option ${indexLabel}`;

            const items = Array.isArray(data.items) ? data.items : [];
            listEl.innerHTML = items
                .map(i => `<li>${escapeHtml(String(i))}</li>`)
                .join('');
        }

        applyCard(elements.outfitImage1, elements.outfitName1, elements.outfitItems1, first, 1);
        applyCard(elements.outfitImage2, elements.outfitName2, elements.outfitItems2, second, 2);

        if (elements.outfitGrid) {
            elements.outfitGrid.classList.remove('hidden');
        }
    }

    // ============================================
    // Utilities
    // ============================================
    function setLoading(loading) {
        state.isLoading = loading;
        
        if (loading) {
            elements.analyzeBtn.classList.add('loading');
            elements.analyzeBtn.disabled = true;
        } else {
            elements.analyzeBtn.classList.remove('loading');
            if (state.currentFile) {
                elements.analyzeBtn.disabled = false;
            }
        }
    }

    function showToast(message, type = 'error') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span>${escapeHtml(message)}</span>
        `;
        
        elements.toastContainer.appendChild(toast);

        // Auto remove after 4 seconds
        setTimeout(() => {
            toast.classList.add('hide');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 4000);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function handleKeyboard(e) {
        // Escape to reset or close modals
        if (e.key === 'Escape') {
            if (!elements.resultsContainer.classList.contains('hidden')) {
                resetApp();
            }
            closeModal('all');
        }
        
        // Enter to analyze (when file selected)
        if (e.key === 'Enter' && state.currentFile && !state.isLoading) {
            analyzeOutfit();
        }
    }

    // ============================================
    // Start Application
    // ============================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

