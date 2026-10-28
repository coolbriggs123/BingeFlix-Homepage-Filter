// ==UserScript==
// @name         Bingeflix – Section Grid Filter
// @namespace    https://bingeflix.tv
// @version      2.0
// @description  Makes every "See all" on the homepage open a filtered grid of that section instead of dumping you on /movies or /tv
// @author       You
// @match        https://bingeflix.tv/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  let filteredOverlay = null;
  let isFiltered = false;
  let currentService = null;
  let isSwitching = false;

  function getRoot() {
    return document.querySelector('body > div') || document.body;
  }

  function getUniqueProviders() {
    const seen = new Set();
    const providers = [];

    document.querySelectorAll('button').forEach(btn => {
      const img = btn.querySelector('img');
      if (!img || !img.alt) return;

      const name = img.alt.trim();
      const allowed = [
        'Netflix', 'Disney+', 'Apple TV+', 'Prime Video',
        'Max', 'Hulu', 'Paramount+', 'Peacock', 'Crunchyroll'
      ];

      if (allowed.includes(name) && !seen.has(name)) {
        seen.add(name);
        providers.push({
          name,
          src: img.src,
          element: btn
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

    const providers = getUniqueProviders();

    providers.forEach(({ name, src }) => {
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

  function showLoading() {
    const grid = filteredOverlay?.querySelector('.media-grid');
    if (!grid) return;

    grid.innerHTML = `
      <div style="
        grid-column: 1 / -1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 4rem 0;
        gap: 1rem;
        color: #a1a1aa;
      ">
        <div style="
          width: 36px;
          height: 36px;
          border: 3px solid rgba(255,255,255,0.1);
          border-top-color: #fff;
          border-radius: 50%;
          animation: bf-spin 0.7s linear infinite;
        "></div>
        <span style="font-size: 0.9rem;">Loading...</span>
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

    showLoading();

    // Update active state immediately
    filteredOverlay.querySelectorAll('.bf-service-bar button').forEach(btn => {
      const isActive = btn.dataset.service === serviceName;
      btn.style.border = isActive ? '1px solid rgba(255,255,255,0.7)' : '1px solid rgba(255,255,255,0.08)';
      btn.style.background = isActive ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)';
    });

    const providers = getUniqueProviders();
    const target = providers.find(p => p.name === serviceName);
    if (!target) {
      isSwitching = false;
      return;
    }

    target.element.click();

    // Wait for the correct section to appear
    const start = Date.now();
    let newCards = [];

    while (Date.now() - start < 2500) {
      await new Promise(r => setTimeout(r, 150));

      const titleEl = Array.from(document.querySelectorAll('h2')).find(h =>
        h.textContent.trim().startsWith('Popular on ')
      );

      if (titleEl && titleEl.textContent.includes(serviceName)) {
        const section = titleEl.closest('section') || titleEl.parentElement?.parentElement;
        newCards = section ? Array.from(section.querySelectorAll('article.poster-card')) : [];
        if (newCards.length > 0) break;
      }
    }

    currentService = serviceName;

    const title = filteredOverlay.querySelector('h1');
    const count = filteredOverlay.querySelector('.bf-count');
    const grid = filteredOverlay.querySelector('.media-grid');

    if (title) title.textContent = `Popular on ${serviceName}`;
    if (count) count.textContent = `${newCards.length} titles`;

    if (grid) {
      grid.innerHTML = '';
      newCards.forEach(card => grid.appendChild(card.cloneNode(true)));
    }

    isSwitching = false;
  }

  function createFilteredView(cards, sectionTitle) {
    if (isFiltered) return;

    const isServiceSection = sectionTitle.startsWith('Popular on ');
    currentService = isServiceSection ? sectionTitle.replace(/^Popular on\s+/i, '').trim() : null;

    const root = getRoot();

    filteredOverlay = document.createElement('div');
    filteredOverlay.id = 'bf-filtered-overlay';
    filteredOverlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 99999;
      background: #09090b;
      overflow-y: auto;
      color: white;
    `;

    const inner = document.createElement('div');
    inner.style.cssText = `
      max-width: 1440px;
      margin: 0 auto;
      padding: 1.5rem 1rem 4rem;
    `;

    // Header
    const header = document.createElement('div');
    header.innerHTML = `
      <div style="display:flex; align-items:center; gap:1rem; margin-bottom:1rem; flex-wrap:wrap;">
        <button id="bf-back-btn" style="
          display:inline-flex; align-items:center; gap:0.4rem;
          background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15);
          color:#fff; padding:0.5rem 1rem; border-radius:9999px;
          font-size:0.875rem; font-weight:500; cursor:pointer;
          transition: background 0.15s;
        ">
          ← Back
        </button>
        <div>
          <p style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.05em; color:#a1a1aa; margin:0 0 0.15rem;">Section</p>
          <h1 style="font-size:1.875rem; font-weight:700; margin:0; line-height:1.2;">${sectionTitle}</h1>
        </div>
      </div>
    `;

    inner.appendChild(header);

    // Only show service bar for "Popular on [Service]" sections
    if (isServiceSection) {
      const serviceBar = createServiceBar(currentService);
      inner.appendChild(serviceBar);
    }

    // Count
    const count = document.createElement('p');
    count.className = 'bf-count';
    count.style.cssText = 'color:#a1a1aa; font-size:0.9rem; margin:0 0 1.25rem;';
    count.textContent = `${cards.length} titles`;
    inner.appendChild(count);

    // Grid
    const grid = document.createElement('div');
    grid.className = 'media-grid';
    cards.forEach(card => grid.appendChild(card.cloneNode(true)));
    inner.appendChild(grid);

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
    isSwitching = false;
  }

  function onEscape(e) {
    if (e.key === 'Escape') destroyFilteredView();
  }

  function handleSeeAllClick(e) {
    const link = e.currentTarget;

    // Find the closest section
    const section = link.closest('section.content-section') ||
                    link.closest('section') ||
                    link.parentElement?.parentElement;
    if (!section) return;

    const titleEl = section.querySelector('h2.section-title') || section.querySelector('h2');
    if (!titleEl) return;

    const sectionTitle = titleEl.textContent.trim();
    if (!sectionTitle) return;

    // Only handle homepage-style sections (skip if it's already a full catalogue page)
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

  // Initial + keep working when React re-renders
  attachListeners();

  const observer = new MutationObserver(() => {
    if (!isFiltered) attachListeners();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  console.log('[Bingeflix Section Filter] v2.0 loaded');
})();
