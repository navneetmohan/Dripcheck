/**
 * Roast or Toast - Frontend Application
 * Handles image upload, API communication, and result display
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
        
        // Action buttons
        downloadBtn: document.getElementById('downloadBtn'),
        shareBtn: document.getElementById('shareBtn'),
        tryAgainBtn: document.getElementById('tryAgainBtn'),
        
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
        isLoading: false
    };

    // API Base URL
    const API_BASE = window.location.origin;

    // ============================================
    // Initialization
    // ============================================
    function init() {
        setupEventListeners();
        addSVGGradient();
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

        // Share button
        elements.shareBtn.addEventListener('click', shareResult);

        // Try again button
        elements.tryAgainBtn.addEventListener('click', resetApp);

        // Keyboard accessibility
        document.addEventListener('keydown', handleKeyboard);
    }

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

        setLoading(true);

        const formData = new FormData();
        formData.append('file', state.currentFile);

        try {
            const response = await fetch(`${API_BASE}/analyze`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success && result.data) {
                displayResults(result.data);
            } else {
                showToast(result.error || 'Analysis failed. Please try again.', 'error');
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

    async function shareResult() {
        if (!state.currentMemeData) return;

        try {
            // Convert base64 to blob
            const response = await fetch(state.currentMemeData);
            const blob = await response.blob();
            const file = new File([blob], 'roast-or-toast.png', { type: 'image/png' });

            if (navigator.share && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: 'Roast or Toast',
                    text: `My drip score: ${state.currentScore}/100! Check it out!`,
                    files: [file]
                });
                showToast('Shared successfully!', 'success');
            } else {
                // Fallback: copy to clipboard
                await navigator.clipboard.writeText(`My drip score is ${state.currentScore}/100 on Roast or Toast! 🔥`);
                showToast('Link copied to clipboard!', 'success');
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
        
        // Show upload card, hide results
        elements.resultsContainer.classList.add('hidden');
        elements.uploadCard.classList.remove('hidden');
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
        // Escape to reset
        if (e.key === 'Escape') {
            if (!elements.resultsContainer.classList.contains('hidden')) {
                resetApp();
            }
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

