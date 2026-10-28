// ==UserScript==
// @name         Bingeflix – Section Grid Filter
// @namespace    https://bingeflix.tv
// @version      2.1
// @description  Makes every "See all" open a filtered grid + Load More for Popular on [Service]
// @author       You
// @match        https://bingeflix.tv/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const TMDB_API_KEY = '68e094699525b18a70bab2f86b1fa706';

  // TMDB Watch Provider IDs used by the site
  const PROVIDER_IDS = {
    'Netflix': '8',
    'Disney+': '337',
    'Apple TV+': '350',
    'Prime Video': '9',
    'Max': '1899|384',
    'Hulu': '15',
    'Paramount+': '531',
    'Peacock': '386',
    'Crunchyroll': '283',
    'Starz': '43',
    'Discovery+': '520',
    'Tubi': '73',
    'Pluto TV': '300',
    'Plex': '538',
    'Vudu': '7'
  };

  let filteredOverlay = null;
  let isFiltered = false;
  let currentService = null;
  let currentPage = 1;
  let isSwitching = false;
  let isLoadingMore = false;

  function getRoot() {
    return document.querySelector('body > div') || document.body;
  }

  function getUniqueProviders() {
    const seen = new Set();
    const providers = [];

    document.querySelectorAll('button img').forEach(img => {
      const name = img.alt?.trim();
      if (name && PROVIDER_IDS[name] && !seen.has(name)) {
        seen.add(name);
        providers.push({
          name,
          src: img.src,
          element: img.closest('button')
        });
      }
    });

    return providers;
  }

  function createServiceBar(activeService) {
    const bar = document.createElement('div');
    bar.className = 'bf-service-bar';
    bar.style.cssText = `
      display: flex;
      gap: 0.75rem;
      overflow-x: auto;
      padding: 0.5rem 0 1.25rem;
      margin-bottom: 0.25rem;
      scrollbar-width: none;
    `;

    getUniqueProviders().forEach(({ name, src }) => {
      const isActive = name === activeService;

      const btn = document.createElement('button');
      btn.title = name;
      btn.dataset.service = name;
      btn.style.cssText = `
        flex-shrink: 0;
        width: 72px;
        height: 52px;
        border-radius: 12px;
        border: 1px solid ${isActive ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.08)'};
        background: ${isActive ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)'};
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.15s;
        padding: 8px;
      `;

      const img = document.createElement('img');
      img.src = src;
      img.alt = name;
      img.style.cssText = 'width: 100%; height: 100%; object-fit: contain; pointer-events: none;';
      btn.appendChild(img);

      btn.addEventListener('mouseenter', () => {
        if (!isActive && !isSwitching) btn.style.background = 'rgba(255,255,255,0.08)';
      });
      btn.addEventListener('mouseleave', () => {
        if (!isActive) btn.style.background = 'rgba(255,255,255,0.03)';
      });

      btn.addEventListener('click', () => {
        if (name === currentService || isSwitching) return;
        switchService(name);
      });

      bar.appendChild(btn);
    });

    return bar;
  }

  function createPosterCard(movie) {
    const poster = movie.poster_path
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
      : '';
    const year = (movie.release_date || '').slice(0, 4) || '—';
    const title = movie.title || movie.name || 'Unknown';
    const id = movie.id;

    const article = document.createElement('article');
    article.className = 'poster-card group';
    article.innerHTML = `
      <div class="poster-art">
        <img alt="${title}" loading="lazy" class="object-cover transition-transform duration-500 group-hover:scale-[1.035]"
             src="${poster}" style="position:absolute;height:100%;width:100%;inset:0;object-fit:cover;">
        <span class="poster-scrim"></span>
        <a class="absolute inset-0 z-[1]" aria-label="View details for ${title}" href="/movie/${id}/details"></a>
        <div class="poster-info">
          <h3 class="poster-title">${title}</h3>
          <div class="poster-meta">
            <span>${year}</span>
            <span aria-hidden="true">·</span>
            <span>Movie</span>
            <a class="poster-watch" href="/movie/${id}">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-play h-3.5 w-3.5 fill-current"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>
              Play
            </a>
          </div>
        </div>
      </div>
    `;
    return article;
  }

  async function loadMoreTitles() {
    if (!currentService || isLoadingMore || !PROVIDER_IDS[currentService]) return;
    isLoadingMore = true;

    const btn = filteredOverlay.querySelector('.bf-load-more');
    if (btn) {
      btn.textContent = 'Loading...';
      btn.disabled = true;
    }

    currentPage += 1;
    const providerId = PROVIDER_IDS[currentService];
    const url = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_watch_providers=${providerId}&watch_region=US&sort_by=popularity.desc&page=${currentPage}`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      const grid = filteredOverlay.querySelector('.media-grid');
      const countEl = filteredOverlay.querySelector('.bf-count');

      if (data.results && data.results.length > 0) {
        data.results.forEach(movie => {
          grid.appendChild(createPosterCard(movie));
        });

        if (countEl) {
          const currentCount = grid.querySelectorAll('article.poster-card').length;
          countEl.textContent = `${currentCount} titles`;
        }
      } else {
        if (btn) btn.style.display = 'none';
      }
    } catch (err) {
      console.error('[Bingeflix Filter] Load more failed', err);
    }

    if (btn) {
      btn.textContent = 'Load More Titles';
      btn.disabled = false;
    }
    isLoadingMore = false;
  }

  function showLoading() {
    const grid = filteredOverlay?.querySelector('.media-grid');
    if (!grid) return;

    grid.innerHTML = `
      <div style="grid-column:1/-1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem 0;gap:1rem;color:#a1a1aa;">
        <div style="width:36px;height:36px;border:3px solid rgba(255,255,255,0.1);border-top-color:#fff;border-radius:50%;animation:bf-spin 0.7s linear infinite;"></div>
        <span style="font-size:0.9rem;">Loading...</span>
      </div>
    `;

    if (!document.getElementById('bf-spinner-style')) {
      const style = document.createElement('style');
      style.id = 'bf-spinner-style';
      style.textContent = `@keyframes bf-spin { to { transform: rotate(360deg); } }`;
      document.head.appendChild(style);
    }
  }

  async function switchService(serviceName) {
    if (!filteredOverlay || isSwitching) return;
    isSwitching = true;
    currentPage = 1;

    showLoading();

    filteredOverlay.querySelectorAll('.bf-service-bar button').forEach(btn => {
      const isActive = btn.dataset.service === serviceName;
      btn.style.border = isActive ? '1px solid rgba(255,255,255,0.7)' : '1px solid rgba(255,255,255,0.08)';
      btn.style.background = isActive ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)';
    });

    const providers = getUniqueProviders();
    const target = providers.find(p => p.name === serviceName);

    if (target?.element) {
      target.element.click();
      await new Promise(r => setTimeout(r, 900));
    }

    // Also fetch page 1 from TMDB for consistency + Load More support
    const providerId = PROVIDER_IDS[serviceName];
    let cards = [];

    if (providerId) {
      try {
        const res = await fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_watch_providers=${providerId}&watch_region=US&sort_by=popularity.desc&page=1`);
        const data = await res.json();
        cards = data.results || [];
      } catch (e) {}
    }

    // Fallback to DOM cards if API fails
    if (cards.length === 0) {
      const titleEl = Array.from(document.querySelectorAll('h2')).find(h => h.textContent.includes(serviceName));
      const section = titleEl?.closest('section');
      const domCards = section ? Array.from(section.querySelectorAll('article.poster-card')) : [];
      cards = domCards; // keep as DOM nodes
    }

    currentService = serviceName;

    const title = filteredOverlay.querySelector('h1');
    const count = filteredOverlay.querySelector('.bf-count');
    const grid = filteredOverlay.querySelector('.media-grid');
    const loadMoreBtn = filteredOverlay.querySelector('.bf-load-more');

    if (title) title.textContent = `Popular on ${serviceName}`;
    if (count) count.textContent = `${cards.length} titles`;

    if (grid) {
      grid.innerHTML = '';
      cards.forEach(item => {
        if (item.nodeType === 1) {
          grid.appendChild(item.cloneNode(true));
        } else {
          grid.appendChild(createPosterCard(item));
        }
      });
    }

    if (loadMoreBtn) loadMoreBtn.style.display = providerId ? 'block' : 'none';

    isSwitching = false;
  }

  function createFilteredView(cards, sectionTitle) {
    if (isFiltered) return;

    const isServiceSection = sectionTitle.startsWith('Popular on ');
    currentService = isServiceSection ? sectionTitle.replace(/^Popular on\s+/i, '').trim() : null;
    currentPage = 1;

    const root = getRoot();

    filteredOverlay = document.createElement('div');
    filteredOverlay.id = 'bf-filtered-overlay';
    filteredOverlay.style.cssText = `
      position: fixed; inset: 0; z-index: 99999;
      background: #09090b; overflow-y: auto; color: white;
    `;

    const inner = document.createElement('div');
    inner.style.cssText = `max-width: 1440px; margin: 0 auto; padding: 1.5rem 1rem 4rem;`;

    // Header
    const header = document.createElement('div');
    header.innerHTML = `
      <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem;flex-wrap:wrap;">
        <button id="bf-back-btn" style="
          display:inline-flex;align-items:center;gap:0.4rem;
          background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);
          color:#fff;padding:0.5rem 1rem;border-radius:9999px;
          font-size:0.875rem;font-weight:500;cursor:pointer;transition:background 0.15s;">
          ← Back
        </button>
        <div>
          <p style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;color:#a1a1aa;margin:0 0 0.15rem;">Section</p>
          <h1 style="font-size:1.875rem;font-weight:700;margin:0;line-height:1.2;">${sectionTitle}</h1>
        </div>
      </div>
    `;
    inner.appendChild(header);

    if (isServiceSection) {
      inner.appendChild(createServiceBar(currentService));
    }

    const count = document.createElement('p');
    count.className = 'bf-count';
    count.style.cssText = 'color:#a1a1aa;font-size:0.9rem;margin:0 0 1.25rem;';
    count.textContent = `${cards.length} titles`;
    inner.appendChild(count);

    const grid = document.createElement('div');
    grid.className = 'media-grid';
    cards.forEach(card => grid.appendChild(card.cloneNode(true)));
    inner.appendChild(grid);

    // Load More button (only for Popular on [Service])
    if (isServiceSection && PROVIDER_IDS[currentService]) {
      const loadMore = document.createElement('button');
      loadMore.className = 'bf-load-more';
      loadMore.textContent = 'Load More Titles';
      loadMore.style.cssText = `
        display: block;
        margin: 2.5rem auto 0;
        padding: 0.75rem 1.75rem;
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.15);
        color: white;
        border-radius: 9999px;
        font-size: 0.9rem;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.15s;
      `;
      loadMore.addEventListener('mouseenter', () => loadMore.style.background = 'rgba(255,255,255,0.14)');
      loadMore.addEventListener('mouseleave', () => loadMore.style.background = 'rgba(255,255,255,0.08)');
      loadMore.addEventListener('click', loadMoreTitles);
      inner.appendChild(loadMore);
    }

    filteredOverlay.appendChild(inner);
    document.body.appendChild(filteredOverlay);

    root.style.visibility = 'hidden';
    isFiltered = true;

    const backBtn = document.getElementById('bf-back-btn');
    backBtn.addEventListener('click', destroyFilteredView);
    backBtn.addEventListener('mouseenter', () => backBtn.style.background = 'rgba(255,255,255,0.14)');
    backBtn.addEventListener('mouseleave', () => backBtn.style.background = 'rgba(255,255,255,0.08)');

    document.addEventListener('keydown', onEscape, { once: true });
  }

  function destroyFilteredView() {
    if (!isFiltered || !filteredOverlay) return;
    filteredOverlay.remove();
    filteredOverlay = null;
    getRoot().style.visibility = '';
    isFiltered = false;
    currentService = null;
    currentPage = 1;
    isSwitching = false;
    isLoadingMore = false;
  }

  function onEscape(e) {
    if (e.key === 'Escape') destroyFilteredView();
  }

  function handleSeeAllClick(e) {
    const link = e.currentTarget;
    const section = link.closest('section.content-section') || link.closest('section') || link.parentElement?.parentElement;
    if (!section) return;

    const titleEl = section.querySelector('h2.section-title') || section.querySelector('h2');
    if (!titleEl) return;

    const sectionTitle = titleEl.textContent.trim();
    const cards = Array.from(section.querySelectorAll('article.poster-card'));
    if (cards.length === 0) return;

    e.preventDefault();
    e.stopImmediatePropagation();
    createFilteredView(cards, sectionTitle);
  }

  function attachListeners() {
    document.querySelectorAll('a.section-link').forEach(link => {
      if (link.dataset.bfHandled) return;
      link.dataset.bfHandled = '1';
      link.addEventListener('click', handleSeeAllClick, true);
    });
  }

  attachListeners();
  const observer = new MutationObserver(() => {
    if (!isFiltered) attachListeners();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  console.log('[Bingeflix Section Filter] v2.1 loaded');
})();
