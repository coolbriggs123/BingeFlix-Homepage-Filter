// ==UserScript==
// @name         Bingeflix – Popular on [Service] Grid
// @namespace    https://bingeflix.tv
// @version      1.3
// @description  Turn "See all" on Popular on Netflix (and similar) into a filtered grid. Preserves provider switching.
// @author       You
// @match        https://bingeflix.tv/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  let filteredOverlay = null;
  let isFiltered = false;

  function getRoot() {
    // Highest-level content container we can safely cover
    return document.querySelector('body > div') || document.body;
  }

  function createFilteredView(cards, serviceName) {
    if (isFiltered) return;

    const root = getRoot();

    // Create full takeover overlay
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
    header.style.cssText = 'margin-bottom: 2rem;';
    header.innerHTML = `
      <div style="display:flex; align-items:center; gap:1rem; margin-bottom:0.75rem; flex-wrap:wrap;">
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
          <p style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.05em; color:#a1a1aa; margin:0 0 0.15rem;">Films</p>
          <h1 style="font-size:1.875rem; font-weight:700; margin:0; line-height:1.2;">Popular on ${serviceName}</h1>
        </div>
      </div>
      <p style="color:#a1a1aa; font-size:0.9rem; margin:0;">${cards.length} titles</p>
    `;

    // Grid – reuse site class for correct layout
    const grid = document.createElement('div');
    grid.className = 'media-grid';
    grid.style.marginTop = '1.75rem';

    cards.forEach(card => {
      const clone = card.cloneNode(true);
      // Make sure the cards are fully interactive
      clone.style.pointerEvents = 'auto';
      grid.appendChild(clone);
    });

    inner.appendChild(header);
    inner.appendChild(grid);
    filteredOverlay.appendChild(inner);
    document.body.appendChild(filteredOverlay);

    // Hide the original page content so only the filtered view is visible
    root.style.visibility = 'hidden';
    isFiltered = true;

    // Back button
    const backBtn = document.getElementById('bf-back-btn');
    backBtn.addEventListener('click', destroyFilteredView);
    backBtn.addEventListener('mouseenter', () => backBtn.style.background = 'rgba(255,255,255,0.14)');
    backBtn.addEventListener('mouseleave', () => backBtn.style.background = 'rgba(255,255,255,0.08)');

    // Also allow Escape key
    document.addEventListener('keydown', onEscape, { once: true });
  }

  function destroyFilteredView() {
    if (!isFiltered || !filteredOverlay) return;

    filteredOverlay.remove();
    filteredOverlay = null;

    const root = getRoot();
    root.style.visibility = '';

    isFiltered = false;
  }

  function onEscape(e) {
    if (e.key === 'Escape') destroyFilteredView();
  }

  function handleSeeAllClick(e) {
    const link = e.currentTarget;
    const section = link.closest('section.content-section') ||
                    link.closest('section') ||
                    link.parentElement?.parentElement;
    if (!section) return;

    const titleEl = section.querySelector('h2.section-title') || section.querySelector('h2');
    if (!titleEl) return;

    const title = titleEl.textContent.trim();
    if (!title.startsWith('Popular on ')) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    const serviceName = title.replace(/^Popular on\s+/i, '').trim();
    const cards = Array.from(section.querySelectorAll('article.poster-card'));

    if (cards.length === 0) {
      console.warn('[Bingeflix Filter] No cards found');
      return;
    }

    createFilteredView(cards, serviceName);
  }

  function attachListeners() {
    document.querySelectorAll('a.section-link').forEach(link => {
      if (link.dataset.bfHandled) return;
      link.dataset.bfHandled = '1';

      const section = link.closest('section') || link.parentElement?.parentElement;
      const title = section?.querySelector('h2')?.textContent?.trim() || '';
      if (title.startsWith('Popular on ')) {
        link.addEventListener('click', handleSeeAllClick, true);
      }
    });
  }

  // Initial + keep working when React re-renders sections
  attachListeners();

  const observer = new MutationObserver(() => {
    if (!isFiltered) attachListeners();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  console.log('[Bingeflix Popular Filter] v1.3 loaded');
})();
