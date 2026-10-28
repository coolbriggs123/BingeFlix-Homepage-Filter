# Bingeflix Popular Filter

A small userscript that fixes one specific annoyance on bingeflix.tv.

The "See all" button next to **Popular on Netflix** (and other streaming services) just sends you to the full movie catalogue. I wanted a proper grid of only those titles instead — the same layout as the normal movies page, but filtered to the list I was actually looking at.

This does that.

### Before → After

| Before | After |
|:------:|:-----:|
| <img src="https://i.imgur.com/QYHCVfE.gif" width="380"> | <img src="https://i.imgur.com/s1n3T6Y.gif" width="380"> |

## What it does

- Intercepts the "See all" link on any "Popular on [Service]" section
- Opens a clean full-page grid of only those titles
- Adds the streaming service buttons at the top so you can quickly switch between Netflix, Disney+, Prime, etc.
- Back button returns you to the homepage

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/)
2. Create a new script
3. Paste the contents of `BFSTM.js`
4. Save and refresh bingeflix.tv

---

Built for personal use. Feel free to modify it.
