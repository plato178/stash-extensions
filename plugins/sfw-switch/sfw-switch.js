(async function () {
  const _log = (...args) => csLib.getConfiguration('sfw-switch', {})
    .then(config => (config.debug && console.log('[sfw-switch]', ...args)))
  
  await initialiseStyles()
  createSfwButton()
  
  async function initialiseStyles() {
    const enableBlur = localStorage.getItem('sfw-enabled') === 'true'

    // const newStylesEl = await defineSfwStyles()
    // attachSfwStyles(newStylesEl)

    const newStylesEl = document.querySelector('link[href*="sfw-switch"]')
    newStylesEl.classList.add('sfw-styles')
    newStylesEl.disabled = !enableBlur

    waitForElementClass("plugin_sfw", () => {
      enableBlur
        // ? document.getElementById("plugin_sfw").style.color = "#5cff00" // green
        // : document.getElementById("plugin_sfw").style.color = "#f5f8fa"
        ? setSvgColour("#5cff00") // green
        : setSvgColour("#f5f8fa")
    })
  }

  function setSvgColour(colour) {
    document.getElementById("plugin_sfw_icon").style.fill = colour
  }

  async function defineSfwStyles() {
    const newStylesEl = document.createElement('style')

    newStylesEl.classList.add('sfw-styles')

    const config = await csLib.getConfiguration('sfw-switch', {});
    _log('defineSfwStyles config', config)

    newStylesEl.innerText = `
      .scene-card-preview-video,
      .scene-card-preview-image,
      .image-card-preview-image,
      ${config.blurStudioLogos ? '.image-thumbnail,' : ''}
      .gallery-card-image,
      .performer-card-image,
      img.performer,
      .movie-card-image,
      .gallery .flexbin img,
      .wall-item-media,
      ${config.blurStudioLogos ? '.scene-studio-overlay .image-thumbnail,' : ''}
      .image-card-preview-image,
      #scene-details-container .text-input,
      #scene-details-container .scene-header,
      #scene-details-container .react-select__single-value,
      .scene-details .pre,
      #scene-tabs-tabpane-scene-file-info-panel span.col-8.text-truncate > a,
      .gallery .flexbin img,
      .movie-details .logo {
        filter: blur(8px);
      }

      .scene-card-video {
        filter: blur(13px);
      }

      .jw-video,
      .jw-preview,
      .jw-flag-floating,
      .video-js:hover .vjs-poster,
      video:hover,
      .image-container,
      .studio-logo,
      .scene-cover {
        filter: blur(20px);
      }

      .movie-card .text-truncate {
        filter: blur(4px);
      }
      
      .thumbnail-section:hover *,
      .card:hover,
      .card:hover .scene-studio-overlay,
      .video-js:hover .vjs-poster,
      video:hover,
      .scene-header:hover>h3,
      div:hover>.scene-header,
      .studio-logo:hover,
      .scene-cover:hover,
      ${config.blurStudioLogos ? '.image-thumbnail:hover,' : ''}
      .scene-card-preview:hover,
      .scrubber-item:hover,

      .image-image:hover,
      div:hover>.image-header,
      .gallery-image:hover,

      .movie-images:hover,
      .movie-details>div>h2:hover,

      div:hover>.gallery-header,
      table>tbody>tr>td:hover>a>img.w-100,

      img.performer:hover,

      .studio-details .logo:hover,
      .studio-details:hover>div>h2,

      .logo-container>.logo:hover,
      .logo-container:hover>h2 {
        filter: blur(0px) !important;
      }

      `
      .replace(/\n/g, '')
      .replace(/\t/g, '')
      .replace(/ /g, '')

    return newStylesEl
  }

  function attachSfwStyles(newStylesEl) {
    const mainStyles = document.querySelector('link[href*="/css"]')
    mainStyles.insertAdjacentElement('afterend', newStylesEl)
  }

  function createSfwButton () {
    // if (!document.getElementById("plugin_sfw")) {
    if (!document.querySelector(".plugin_sfw")) {
      const pluginDiv = document.createElement('a');
      pluginDiv.classList.add("plugin_sfw", "nav-utility", 'nav-link')

      localStorage.getItem('sfw-enabled') === 'true'
        ? pluginDiv.style.color = "#5cff00" // white
        : pluginDiv.style.color = "#f5f8fa"; // green 

      pluginDiv.innerHTML = `
        <button id="plugin_sfw" type="button" class="minimal d-flex align-items-center h-100 btn btn-primary" title="Toggle SFW Mode">
          <svg id="plugin_sfw_icon" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="svg-inline--fa fa-cog fa-w-16 fa-icon undefined" viewBox="1.5 1.5 13 13">
            <path d="m7.646 9.354-3.792 3.792a.5.5 0 0 0 .353.854h7.586a.5.5 0 0 0 .354-.854L8.354 9.354a.5.5 0 0 0-.708 0z"></path>
            <path d="M11.414 11H14.5a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.5-.5h-13a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .5.5h3.086l-1 1H1.5A1.5 1.5 0 0 1 0 10.5v-7A1.5 1.5 0 0 1 1.5 2h13A1.5 1.5 0 0 1 16 3.5v7a1.5 1.5 0 0 1-1.5 1.5h-2.086l-1-1z"></path>
          </svg>
        </button>
      `

      waitForElementClass("navbar-buttons", () => {
        const navBtnContainer = document.getElementsByClassName("navbar-buttons")[0];
        
        if (navBtnContainer.childNodes[0].classList.contains('btn-primary')) {
          navBtnContainer.insertBefore(pluginDiv, navBtnContainer.childNodes[1]);
        } else {
          navBtnContainer.insertBefore(pluginDiv, navBtnContainer.childNodes[0]);
        }

        // document
        //   .getElementById("plugin_sfw")
        //   .addEventListener("click", toggleSwitch, false);

        pluginDiv.addEventListener("click", toggleSwitch, false);
      })
    }
  }

  function toggleSwitch () {
    const sfwStyles = document.querySelector('.sfw-styles')
    const enableBlur = localStorage.getItem('sfw-enabled') === 'true'

    if (!enableBlur) { // NSFW
      // document.getElementById("plugin_sfw").style.color = "#5cff00"; // green
      // document.querySelector(".plugin_sfw").style.color = "#5cff00"; // green
      setSvgColour("#5cff00") // green
      localStorage.setItem('sfw-enabled', 'true')
    } else { // SFW
      // document.getElementById("plugin_sfw").style.color = "#f5f8fa"; // white
      // document.querySelector(".plugin_sfw").style.color = "#f5f8fa"; // white
      setSvgColour("#f5f8fa") // white
      localStorage.removeItem('sfw-enabled')
    }
    
    sfwStyles.disabled = enableBlur
  }

  function waitForElementClass (elementId, callBack, time = 100) {
    window.setTimeout(() => {
      const element = document.getElementsByClassName(elementId);

      if (element.length > 0) {
        callBack(elementId, element);
      } else {
        waitForElementClass(elementId, callBack);
      }
    }, time);
  }
})() 
