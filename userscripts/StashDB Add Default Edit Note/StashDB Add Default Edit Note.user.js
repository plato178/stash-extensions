// ==UserScript==
// @name        StashDB Add Default Edit Note
// @namespace   Violentmonkey Scripts
// @icon        https://docs.stashapp.cc/favicon.ico
// @match       https://stashdb.org/drafts/*
// @grant       none
// @version     0.0.2
// @author      plato178
// @description 06/12/2023, 21:32:53
// @updateURL   https://raw.githubusercontent.com/plato178/stash-extensions/refs/heads/main/userscripts/StashDB Add Default Edit Note/StashDB Add Default Edit Note.user.js
// ==/UserScript==

waitForElm('ul[role="tablist"] li:last-child').then((el) => {
  el.addEventListener('click', e => {
    setTimeout(() => {
      const studioLink = Array.from(document.querySelectorAll('a.SiteLink'))
        .find(el => el?.querySelector('span')?.innerText === 'Studio');

      const studioName = Array.from(document.querySelectorAll('.EditDiff'))
        .find(el => el?.querySelector('a')?.href.includes('studios'))

      const [, studioNameText] = studioName?.innerText?.split(' ')
      const studioLinkHref = new URL(studioLink.nextElementSibling.href)

      const editNote = document.querySelector('textarea[name=note]')
      editNote.value = `Scraped from [${studioNameText} page](${studioLinkHref.href}).`
    }, 0)
  })
})

function waitForElm(selector) {
  return new Promise(resolve => {
    if (document.querySelector(selector)) {
        return resolve(document.querySelector(selector));
    }

    const observer = new MutationObserver(mutations => {
        if (document.querySelector(selector)) {
            resolve(document.querySelector(selector));
            observer.disconnect();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
  });
}
