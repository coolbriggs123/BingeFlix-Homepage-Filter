# Bingeflix Popular Filter

A small userscript that fixes one specific annoyance on bingeflix.tv.

The "See all" button next to **Popular on Netflix** (and other streaming services) just sends you to the full movie catalogue. I wanted a proper grid of only those titles instead — the same layout as the normal movies page, but filtered to the list I was actually looking at.

This does that.

### Before
![Before - See all goes to all movies](https://imgur.com/QYHCVfE)

### After
![After - Filtered grid of Popular on Netflix](https://i.imgur.com/rB2QWEu.gif)

## What it does

- Intercepts the "See all" link on any "Popular on [Service]" section
- Builds a clean full-page grid using only the titles from that section
- Adds a back button (and Escape key) that returns you to the homepage without breaking provider switching
- Leaves the rest of the site alone

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/)
2. Create a new script
3. Paste the contents of `bingeflix-popular-filter.user.js`
4. Save and refresh bingeflix.tv
---

Built for personal use. Feel free to modify it.
