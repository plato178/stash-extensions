// ==UserScript==
// @name        Create Scene From StashDB
// @author      plato178
// @version     0.0.4
// @description Adds button to StashDB to create a scene in Stash instance.
// @grant       GM_getValues
// @icon        https://raw.githubusercontent.com/stashapp/stash/develop/ui/v2.5/public/favicon.png
// @namespace   https://github.com/plato178/stash-extensions
// @match       https://stashdb.org/scenes/*
// @homepageURL https://github.com/plato178/stash-extensions/tree/main/userscripts/Create Scene From StashDB
// @downloadURL https://raw.githubusercontent.com/plato178/stash-extensions/main/userscripts/Create Scene From StashDB/Create Scene From StashDB.user.js
// @updateURL   https://raw.githubusercontent.com/plato178/stash-extensions/main/userscripts/Create Scene From StashDB/Create Scene From StashDB.user.js
// ==/UserScript==

(function () {
  'use strict';

  const {
    stashApiEndpoint,
    stashApiKey,
    stashDbApiEndpoint,
    stashDbApiKey,
  } = GM_getValues(['stashApiEndpoint', 'stashApiKey', 'stashDbApiEndpoint', 'stashDbApiKey'])

  function createButton () {
    const button = document.createElement('button');
    button.classList.add('btn', 'btn-primary');
    button.innerHTML = 'Create in Stash';

    button.addEventListener('click', async (evt) => {
      const sceneId = new URL(location.href).pathname.split('/').at(-1);
      const scene = await getSceneData(sceneId);

      createNewStashScene(scene)
        .then((id) => {
          const url = new URL(stashApiEndpoint).origin + '/scenes/' + id;
          console.log(`Scene created in Stash at ${url}`);
          evt.target.innerHTML = 'Created!';
          evt.target.disabled = true;
        });
    });

    const buttonLink = document.createElement('a');
    buttonLink.classList.add('me-2');
    buttonLink.href = '#';
    buttonLink.appendChild(button);

    waitForElm('.card-header .float-end')
      .then((elm) => elm.insertBefore(buttonLink, elm.firstChild));
  }

  createButton()

  async function getSceneData(sceneId) {
    const query = `
      query GetScene($id: ID!) {
        findScene(id: $id) {
          id
          code
          details
          title
          release_date
          urls {
            url
          }
          performers {
            performer {
              id
              name
            }
          }
          studio {
            id
            name
          }
          images {
            url
          }
        }
      }
    `;

    return sendStashGraphQLRequest(stashDbApiEndpoint, stashDbApiKey, query, { 
      id: sceneId 
    })
      .then((res) => res?.data?.findScene)
      .catch((err) => console.error(err));
  }

  async function findStudioByStashId(stashId) {
    const query = `{
      findStudios(
        studio_filter: {
          stash_id_endpoint: {
            endpoint: "${stashDbApiEndpoint}", 
            stash_id: "${stashId}", 
            modifier: EQUALS
          }
        }
      ) {
        studios {
          id
        }
      }
    }`

    return sendStashGraphQLRequest(stashApiEndpoint, stashApiKey, query)
      .then(res => res?.data?.findStudios?.studios[0]?.id)
      .catch((err) => console.error(err));
  }

  async function findPerformerByStashId(stashId) {
    const query = `{
      findPerformers(
        performer_filter: {
          stash_id_endpoint: {
            endpoint: "${stashDbApiEndpoint}", 
            stash_id: "${stashId}", 
            modifier: EQUALS
          }
        }
      ) {
        performers {
          id
        }
      }
    }`

    return sendStashGraphQLRequest(stashApiEndpoint, stashApiKey, query)
      .then(res => res?.data?.findPerformers?.performers[0]?.id)
      .catch((err) => console.error(err));
  }

  async function sendStashGraphQLRequest(url, apiKey, query, variables) {
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'APIKey': `${apiKey}`
      },  
      body: JSON.stringify({ query, variables })
    }).then((res) => res.json())
      .catch((err) => err);
  }

  async function mapSceneData(scene) {
    const { 
      id,
      release_date: date, 
      studio,
      performers,
      images,
      ...rest 
    } = scene;

    const urls = rest.urls.map(({ url }) => url);

    const studio_id = await findStudioByStashId(studio.id);
    
    const performer_ids = await Promise.all(
      performers.map(({ performer: { id } }) => findPerformerByStashId(id))
    ).then(p => p.filter(Boolean));

    const cover_image = images[0]?.url;

    const stash_ids = [{ stash_id: id, endpoint: stashDbApiEndpoint }]
    
    return { 
      ...rest, 
      urls,
      date, 
      stash_ids,
      studio_id, 
      performer_ids,
      cover_image,
      organized: false,
      tag_ids: ['2849'] // KG: Wishlist
    };
  }

  async function createNewStashScene(scene) {
    const query = `
      mutation CreateScene($scene: SceneCreateInput!) {
        sceneCreate(input: $scene) {
          id
        }
      }
    `;

    const variables = { scene: await mapSceneData(scene) };

    return sendStashGraphQLRequest(stashApiEndpoint, stashApiKey, query, variables)
      .then(res => res?.data?.sceneCreate?.id)
  }

  function waitForElm(selector) {
    return new Promise((resolve) => {
      if (document.querySelector(selector)) {
        return resolve(document.querySelector(selector));
      }

      const observer = new MutationObserver((mutations) => {
        if (document.querySelector(selector)) {
          resolve(document.querySelector(selector));
          observer.disconnect();
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    });
  }

})();