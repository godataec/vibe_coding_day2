// Global State
let allReleases = [];
let activeFilter = 'all';
let searchQuery = '';
let processedItems = new Set(JSON.parse(localStorage.getItem('processed_items') || '[]'));

// DOM Elements
const feedContainer = document.getElementById('feed-container');
const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = refreshBtn.querySelector('.spinner-icon');
const searchInput = document.getElementById('search-input');
const filterTagsContainer = document.getElementById('filter-tags-container');
const lastUpdatedDisplay = document.getElementById('last-updated-display');
const statusSection = document.getElementById('status-section');
const statusMessage = document.getElementById('status-message');
const exportCsvBtn = document.getElementById('export-csv-btn');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const searchClearBtn = document.getElementById('search-clear-btn');
const resultsCounter = document.getElementById('results-counter');
const backToTopBtn = document.getElementById('back-to-top-btn');

// Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCountDisplay = document.getElementById('char-count-display');
const charCountWrapper = charCountDisplay.parentElement;
const submitTweetBtn = document.getElementById('submit-tweet-btn');
const cancelTweetBtn = document.getElementById('cancel-tweet-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const tweetUrlDisplay = document.getElementById('tweet-url-display');

// Page Load Initializer
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    fetchReleaseNotes(false);
    setupEventListeners();
});

// Setup Events
function setupEventListeners() {
    // Refresh action
    refreshBtn.addEventListener('click', () => {
        fetchReleaseNotes(true);
    });

    // Theme toggle action
    themeToggleBtn.addEventListener('click', toggleTheme);

    // Export CSV action
    exportCsvBtn.addEventListener('click', () => {
        exportToCSV();
    });

    // Search action & Clear search button toggle
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        if (searchQuery) {
            searchClearBtn.classList.remove('hidden');
        } else {
            searchClearBtn.classList.add('hidden');
        }
        renderFeed();
    });

    // Clear search keyword click
    searchClearBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        searchClearBtn.classList.add('hidden');
        renderFeed();
        searchInput.focus();
    });

    // Back to top button action
    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Show/Hide back-to-top button on scroll
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTopBtn.classList.remove('hidden');
        } else {
            backToTopBtn.classList.add('hidden');
        }
    });

    // Modal Keyboard escape close
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !tweetModal.classList.contains('hidden')) {
            closeTweetModal();
        }
    });

    // Filtering category tags
    filterTagsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-tag')) {
            // Update active state in UI
            document.querySelectorAll('.filter-tag').forEach(tag => tag.classList.remove('active'));
            e.target.classList.add('active');
            
            activeFilter = e.target.getAttribute('data-type');
            renderFeed();
        }
    });

    // Close Modal Events
    closeModalBtn.addEventListener('click', closeTweetModal);
    cancelTweetBtn.addEventListener('click', closeTweetModal);
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) closeTweetModal();
    });

    // Tweet text count updates
    tweetTextarea.addEventListener('input', () => {
        updateCharCount();
    });

    // Trigger Intent on Send
    submitTweetBtn.addEventListener('click', sendTweetIntent);
}

// Fetch Data from Server
async function fetchReleaseNotes(forceRefresh = false) {
    // Show spinner animations
    refreshIcon.classList.add('spinning');
    refreshBtn.disabled = true;

    const isInitialLoad = allReleases.length === 0;
    if (isInitialLoad) {
        showStatus('Fetching latest BigQuery release notes...');
        feedContainer.classList.add('hidden');
    }

    try {
        const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('API server returned an error');
        
        const data = await response.json();
        allReleases = data.releases || [];
        
        // Update updated-at timestamp display
        if (data.last_updated) {
            lastUpdatedDisplay.textContent = `Last updated: ${data.last_updated}`;
        } else {
            lastUpdatedDisplay.textContent = 'Last updated: Just now';
        }

        hideStatus();
        feedContainer.classList.remove('hidden');
        renderFeed();
    } catch (error) {
        console.error('Error loading release notes:', error);
        showStatus(`Error loading release notes. Please check the backend console or try again.`, true);
    } finally {
        refreshIcon.classList.remove('spinning');
        refreshBtn.disabled = false;
    }
}

// Show/Hide Status Pane
function showStatus(msg, isError = false) {
    statusSection.classList.remove('hidden');
    const spinner = statusSection.querySelector('.spinner-large');
    
    if (isError) {
        spinner.classList.add('hidden');
        statusMessage.style.color = '#ef4444';
        statusMessage.innerHTML = `${escapeHTML(msg)}<br><div class="retry-link" id="retry-link">Try Again</div>`;
        document.getElementById('retry-link').addEventListener('click', () => {
            fetchReleaseNotes(true);
        });
    } else {
        spinner.classList.remove('hidden');
        statusMessage.style.color = 'var(--text-secondary)';
        statusMessage.textContent = msg;
    }
}

function hideStatus() {
    statusSection.classList.add('hidden');
}

// Render Feed Elements
function renderFeed() {
    feedContainer.innerHTML = '';
    let visibleCardsCount = 0;
    let totalUpdatesCount = 0;

    allReleases.forEach((release, index) => {
        // Filter the individual updates inside this release date group
        const filteredUpdates = release.updates.filter(update => {
            // 1. Category Filter Check
            const matchesCategory = (activeFilter === 'all') || 
                                    (update.type.toLowerCase() === activeFilter.toLowerCase());
            
            // 2. Search Text Check
            const matchesSearch = !searchQuery || 
                                  update.text.toLowerCase().includes(searchQuery) || 
                                  update.type.toLowerCase().includes(searchQuery) ||
                                  release.title.toLowerCase().includes(searchQuery);

            return matchesCategory && matchesSearch;
        });

        // Skip rendering this release date card if it has no matching updates
        if (filteredUpdates.length === 0) return;

        visibleCardsCount++;

        // Create Card Container
        const card = document.createElement('article');
        card.className = 'release-card';
        card.style.animationDelay = `${index * 50}ms`;

        // Card Header
        const header = document.createElement('div');
        header.className = 'card-header';
        
        header.innerHTML = `
            <div class="card-date-wrapper">
                <svg class="calendar-icon icon" viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <h3 class="card-title">${escapeHTML(release.title)}</h3>
            </div>
            <div class="card-header-actions">
                <button class="copy-card-btn" title="Copy card updates to clipboard">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                </button>
                <a href="${release.link}" target="_blank" class="card-meta-link" title="Open source Google Cloud documentation">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                </a>
            </div>
        `;

        // Wire up Copy to Clipboard action
        const copyBtn = header.querySelector('.copy-card-btn');
        copyBtn.addEventListener('click', () => {
            copyCardToClipboard(release, filteredUpdates, copyBtn);
        });

        // Card Body
        const body = document.createElement('div');
        body.className = 'card-body';

        filteredUpdates.forEach((update, idx) => {
            totalUpdatesCount++;
            
            // Build unique key
            const itemUniqueId = release.title.replace(/\s+/g, '') + '-' + update.type + '-' + update.text.substring(0, 10).replace(/[^a-zA-Z0-9]/g, '');
            const isProcessed = processedItems.has(itemUniqueId);

            const updateItem = document.createElement('div');
            updateItem.className = `update-item ${isProcessed ? 'processed' : ''}`;

            const badgeClass = update.type.toLowerCase();
            
            // Build the update row elements
            updateItem.innerHTML = `
                <span class="type-badge ${escapeHTML(badgeClass)}">${escapeHTML(update.type)}</span>
                <div class="update-details">${update.content_html}</div>
                <div class="update-actions">
                    <button class="read-toggle-btn ${isProcessed ? 'processed' : ''}" title="${isProcessed ? 'Mark as unread' : 'Mark as read'}">
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </button>
                    <button class="tweet-action-btn" title="Tweet this update">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                    </button>
                </div>
            `;

            // Attach toggle processed event
            const readBtn = updateItem.querySelector('.read-toggle-btn');
            readBtn.addEventListener('click', () => {
                toggleProcessedState(itemUniqueId, updateItem, readBtn);
            });

            // Attach listener to individual Tweet Button
            const tweetBtn = updateItem.querySelector('.tweet-action-btn');
            tweetBtn.addEventListener('click', () => {
                openTweetModal(update, release.link);
            });

            body.appendChild(updateItem);
        });

        card.appendChild(header);
        card.appendChild(body);
        feedContainer.appendChild(card);
    });

    // Update matching indicators counter
    resultsCounter.textContent = `Found ${totalUpdatesCount} matching update${totalUpdatesCount === 1 ? '' : 's'}`;

    // Empty State Check
    if (visibleCardsCount === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'status-section';
        emptyState.innerHTML = `
            <div style="font-size: 2.5rem; margin-bottom: 8px;">🔍</div>
            <p style="color: var(--text-secondary); font-weight: 500;">No updates found matching "${escapeHTML(searchQuery)}"</p>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">Try checking spelling or changing the filter type tag.</p>
        `;
        feedContainer.appendChild(emptyState);
    }
}

// Modal logic for Tweet Composer
let currentLink = '';

function openTweetModal(update, link) {
    currentLink = link;
    tweetUrlDisplay.textContent = link;

    // Default Tweet Layout
    const prefix = `📢 [BigQuery #ReleaseNotes] ${update.type}: `;
    const suffix = `\n\nDetails: `;
    const maxTextLen = 280 - prefix.length - suffix.length - link.length;

    // Truncate update summary text to fit beautifully
    let updateText = update.text;
    if (updateText.length > maxTextLen) {
        updateText = updateText.substring(0, maxTextLen - 4) + '...';
    }

    const defaultTweetBody = `${prefix}${updateText}${suffix}${link}`;
    
    tweetTextarea.value = defaultTweetBody;
    tweetModal.classList.remove('hidden');
    
    // Auto focus and set selection to preview text block
    tweetTextarea.focus();
    updateCharCount();
}

function closeTweetModal() {
    tweetModal.classList.add('hidden');
}

// Characters Validation
function updateCharCount() {
    const textLen = tweetTextarea.value.length;
    charCountDisplay.textContent = textLen;
    
    if (textLen > 280) {
        charCountWrapper.classList.add('error');
        submitTweetBtn.disabled = true;
        submitTweetBtn.style.opacity = '0.5';
        submitTweetBtn.style.cursor = 'not-allowed';
    } else {
        charCountWrapper.classList.remove('error');
        submitTweetBtn.disabled = false;
        submitTweetBtn.style.opacity = '1';
        submitTweetBtn.style.cursor = 'pointer';
    }
}

// Open Twitter Web Intent in New Tab
function sendTweetIntent() {
    const tweetText = tweetTextarea.value;
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    
    window.open(shareUrl, '_blank');
    closeTweetModal();
}

// Escape helper for templates
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// Copy single release card's updates to clipboard
function copyCardToClipboard(release, updates, button) {
    let text = `BigQuery Release Notes — ${release.title}\n`;
    text += `URL: ${release.link}\n\n`;
    
    updates.forEach(update => {
        text += `[${update.type.toUpperCase()}]\n${update.text}\n\n`;
    });
    
    text = text.trim();
    
    navigator.clipboard.writeText(text).then(() => {
        // Visual success checkmark transition
        button.classList.add('copied');
        const originalHTML = button.innerHTML;
        button.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        `;
        
        setTimeout(() => {
            button.classList.remove('copied');
            button.innerHTML = originalHTML;
        }, 1500);
    }).catch(err => {
        console.error('Failed to copy to clipboard: ', err);
        alert('Failed to copy card updates to clipboard.');
    });
}

// Export active/filtered release notes to CSV
function exportToCSV() {
    const escapeCSV = (text) => {
        if (!text) return '""';
        return `"${text.replace(/"/g, '""').trim()}"`;
    };
    
    let rows = [];
    rows.push(["Date", "Type", "Link", "Details"].map(escapeCSV).join(","));
    
    allReleases.forEach(release => {
        const filteredUpdates = release.updates.filter(update => {
            const matchesCategory = (activeFilter === 'all') || 
                                    (update.type.toLowerCase() === activeFilter.toLowerCase());
            const matchesSearch = !searchQuery || 
                                  update.text.toLowerCase().includes(searchQuery) || 
                                  update.type.toLowerCase().includes(searchQuery) ||
                                  release.title.toLowerCase().includes(searchQuery);
            return matchesCategory && matchesSearch;
        });
        
        filteredUpdates.forEach(update => {
            rows.push([release.title, update.type, release.link, update.text].map(escapeCSV).join(","));
        });
    });
    
    if (rows.length <= 1) {
        alert("No release notes found matching current search/filters to export.");
        return;
    }
    
    const csvString = rows.join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "bigquery_releases_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Theme management helpers
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeUI(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeUI(newTheme);
}

function updateThemeUI(theme) {
    const sunIcon = themeToggleBtn.querySelector('.sun-icon');
    const moonIcon = themeToggleBtn.querySelector('.moon-icon');
    if (theme === 'light') {
        sunIcon.classList.remove('hidden');
        moonIcon.classList.add('hidden');
    } else {
        sunIcon.classList.add('hidden');
        moonIcon.classList.remove('hidden');
    }
}

// Toggle read/unread processed state of release notes
function toggleProcessedState(id, updateItem, button) {
    if (processedItems.has(id)) {
        processedItems.delete(id);
        updateItem.classList.remove('processed');
        button.classList.remove('processed');
        button.title = "Mark as read";
    } else {
        processedItems.add(id);
        updateItem.classList.add('processed');
        button.classList.add('processed');
        button.title = "Mark as unread";
    }
    localStorage.setItem('processed_items', JSON.stringify([...processedItems]));
}
