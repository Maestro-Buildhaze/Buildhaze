/**
 * News Widget for Client Websites
 * Fetches news from public API and displays with modal
 */

(function() {
  'use strict';

  // Configuration - will be set by backend
  const config = window.NEWS_CONFIG || {
    clientSlug: '',
    apiBaseUrl: 'https://buildhaze.onrender.com/api',
    refreshInterval: 3600000, // 1 hour
  };

  let newsData = [];
  let currentModalNews = null;

  // Create styles
  const styles = `
    .news-widget {
      background: linear-gradient(135deg, #0a1628 0%, #112240 100%);
      border-radius: 16px;
      padding: 2rem;
      margin: 2rem 0;
      color: #fff;
    }
    .news-widget-title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 1.75rem;
      font-weight: 600;
      margin-bottom: 1.5rem;
      color: #fff;
    }
    .news-widget-title span {
      color: #c9a84c;
    }
    .news-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.5rem;
    }
    .news-card {
      background: rgba(26, 46, 74, 0.6);
      border: 1px solid rgba(201, 168, 76, 0.2);
      border-radius: 12px;
      overflow: hidden;
      transition: all 0.3s ease;
      cursor: pointer;
    }
    .news-card:hover {
      transform: translateY(-4px);
      border-color: #c9a84c;
      box-shadow: 0 8px 32px rgba(201, 168, 76, 0.15);
    }
    .news-card-image {
      width: 100%;
      height: 160px;
      object-fit: cover;
      background: #1a2e4a;
    }
    .news-card-body {
      padding: 1.25rem;
    }
    .news-card-source {
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      color: #c9a84c;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
    }
    .news-card-title {
      font-size: 1rem;
      font-weight: 600;
      line-height: 1.4;
      color: #fff;
      margin-bottom: 0.75rem;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .news-card-summary {
      font-size: 0.85rem;
      color: #8a9ab0;
      line-height: 1.6;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .news-card-btn {
      display: inline-block;
      margin-top: 1rem;
      padding: 0.5rem 1rem;
      background: #c9a84c;
      color: #0a1628;
      font-size: 0.8rem;
      font-weight: 600;
      border-radius: 6px;
      text-decoration: none;
      transition: all 0.2s;
    }
    .news-card-btn:hover {
      background: #e0c46a;
    }
    
    /* Modal Styles */
    .news-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(10, 22, 40, 0.95);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s ease;
    }
    .news-modal-overlay.active {
      opacity: 1;
      visibility: visible;
    }
    .news-modal {
      background: linear-gradient(135deg, #112240 0%, #0a1628 100%);
      border: 1px solid rgba(201, 168, 76, 0.3);
      border-radius: 16px;
      max-width: 700px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      position: relative;
      transform: translateY(20px);
      transition: transform 0.3s ease;
    }
    .news-modal-overlay.active .news-modal {
      transform: translateY(0);
    }
    .news-modal-close {
      position: absolute;
      top: 1rem;
      right: 1rem;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(201, 168, 76, 0.2);
      border: 1px solid #c9a84c;
      color: #c9a84c;
      font-size: 1.25rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      z-index: 10;
    }
    .news-modal-close:hover {
      background: #c9a84c;
      color: #0a1628;
    }
    .news-modal-image {
      width: 100%;
      height: 280px;
      object-fit: cover;
      border-radius: 16px 16px 0 0;
    }
    .news-modal-body {
      padding: 2rem;
    }
    .news-modal-source {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      color: #c9a84c;
      letter-spacing: 0.1em;
      margin-bottom: 0.75rem;
    }
    .news-modal-title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 1.5rem;
      font-weight: 600;
      color: #fff;
      margin-bottom: 1rem;
      line-height: 1.3;
    }
    .news-modal-content {
      font-size: 0.95rem;
      line-height: 1.8;
      color: #c0cad8;
    }
    .news-modal-content p {
      margin-bottom: 1rem;
    }
    .news-modal-content h3 {
      color: #c9a84c;
      font-size: 1.1rem;
      margin: 1.5rem 0 0.75rem;
    }
    .news-modal-footer {
      display: flex;
      gap: 1rem;
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid rgba(201, 168, 76, 0.2);
    }
    .news-modal-btn-primary {
      flex: 1;
      padding: 0.875rem 1.5rem;
      background: #c9a84c;
      color: #0a1628;
      font-size: 0.9rem;
      font-weight: 600;
      border-radius: 8px;
      text-decoration: none;
      text-align: center;
      transition: all 0.2s;
    }
    .news-modal-btn-primary:hover {
      background: #e0c46a;
    }
    .news-modal-btn-secondary {
      padding: 0.875rem 1.5rem;
      background: transparent;
      border: 1px solid #5a7a9a;
      color: #8a9ab0;
      font-size: 0.9rem;
      font-weight: 500;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .news-modal-btn-secondary:hover {
      border-color: #c9a84c;
      color: #c9a84c;
    }
    .news-loading {
      text-align: center;
      padding: 2rem;
      color: #8a9ab0;
    }
    .news-error {
      text-align: center;
      padding: 2rem;
      color: #ef4444;
    }
    @media (max-width: 640px) {
      .news-grid {
        grid-template-columns: 1fr;
      }
      .news-modal-overlay {
        padding: 1rem;
      }
      .news-modal-body {
        padding: 1.5rem;
      }
      .news-modal-image {
        height: 200px;
      }
    }
  `;

  // Inject styles
  function injectStyles() {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  }

  // Fetch news
  async function fetchNews() {
    try {
      const response = await fetch(`${config.apiBaseUrl}/news/public/${config.clientSlug}`);
      if (!response.ok) throw new Error('Failed to fetch news');
      const data = await response.json();
      newsData = data.news || [];
      renderNews();
    } catch (error) {
      console.error('News widget error:', error);
      renderError();
    }
  }

  // Render news cards
  function renderNews() {
    const container = document.getElementById('news-widget-container');
    if (!container) return;

    if (newsData.length === 0) {
      container.innerHTML = '<div class="news-loading">No news available at the moment.</div>';
      return;
    }

    const newsHTML = newsData.slice(0, 4).map((item, index) => `
      <article class="news-card" onclick="NewsWidget.openModal(${index})">
        <img 
          src="${item.imageUrl || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=400&h=250&fit=crop'}" 
          alt="${item.title}" 
          class="news-card-image"
          onerror="this.src='https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=400&h=250&fit=crop'"
        >
        <div class="news-card-body">
          <div class="news-card-source">${item.source || 'News Source'}</div>
          <h3 class="news-card-title">${item.title}</h3>
          <p class="news-card-summary">${item.summary}</p>
          <span class="news-card-btn">Vezi știrea</span>
        </div>
      </article>
    `).join('');

    container.innerHTML = `
      <div class="news-widget">
        <h2 class="news-widget-title">Ultimele <span>Știri</span></h2>
        <div class="news-grid">
          ${newsHTML}
        </div>
      </div>
    `;
  }

  // Render error
  function renderError() {
    const container = document.getElementById('news-widget-container');
    if (container) {
      container.innerHTML = '<div class="news-error">Unable to load news at this time.</div>';
    }
  }

  // Create modal
  function createModal() {
    const modal = document.createElement('div');
    modal.className = 'news-modal-overlay';
    modal.id = 'news-modal';
    modal.innerHTML = `
      <div class="news-modal">
        <button class="news-modal-close" onclick="NewsWidget.closeModal()">&times;</button>
        <img id="news-modal-image" src="" alt="" class="news-modal-image">
        <div class="news-modal-body">
          <div id="news-modal-source" class="news-modal-source"></div>
          <h2 id="news-modal-title" class="news-modal-title"></h2>
          <div id="news-modal-content" class="news-modal-content"></div>
          <div class="news-modal-footer">
            <a id="news-modal-link" href="" target="_blank" rel="noopener" class="news-modal-btn-primary">
              Citește știrea completă →
            </a>
            <button onclick="NewsWidget.closeModal()" class="news-modal-btn-secondary">
              Închide
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });

    document.body.appendChild(modal);
    return modal;
  }

  // Open modal
  function openModal(index) {
    const news = newsData[index];
    if (!news) return;

    currentModalNews = news;
    let modal = document.getElementById('news-modal');
    if (!modal) {
      modal = createModal();
    }

    // Populate modal
    const image = modal.querySelector('#news-modal-image');
    const source = modal.querySelector('#news-modal-source');
    const title = modal.querySelector('#news-modal-title');
    const content = modal.querySelector('#news-modal-content');
    const link = modal.querySelector('#news-modal-link');

    if (image) {
      image.src = news.imageUrl || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&h=400&fit=crop';
      image.alt = news.title;
    }
    if (source) source.textContent = news.source || 'News Source';
    if (title) title.textContent = news.title;
    
    // Format content - split summary into paragraphs if it's long
    let contentHTML = '';
    if (news.summary && news.summary.length > 200) {
      const sentences = news.summary.match(/[^.!?]+[.!?]+/g) || [news.summary];
      contentHTML = sentences.map(s => `<p>${s.trim()}</p>`).join('');
    } else {
      contentHTML = `<p>${news.summary || ''}</p>`;
    }
    contentHTML += `<p>Știrea originală poate fi citită pe site-ul sursă folosind butonul de mai jos.</p>`;
    if (content) content.innerHTML = contentHTML;
    
    if (link) link.href = news.url || '#';

    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  // Close modal
  function closeModal() {
    const modal = document.getElementById('news-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
    currentModalNews = null;
  }

  // Initialize
  function init() {
    if (!config.clientSlug) {
      console.error('News widget: clientSlug not configured');
      return;
    }

    injectStyles();
    fetchNews();

    // Refresh periodically
    setInterval(fetchNews, config.refreshInterval);
  }

  // Expose API
  window.NewsWidget = {
    init,
    openModal,
    closeModal,
    refresh: fetchNews,
  };

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
