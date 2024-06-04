(async function () {
  'use strict'; 

  const config = await csLib.getConfiguration('sfw-switch', {})
  
  const _log = (...args) => config.debug && console.log('[sfw-switch]', ...args)

  initialiseStyles()
  createSfwButton()
  
  async function initialiseStyles() {
    const enableBlur = localStorage.getItem('sfw-enabled') === 'true'
    
    const baseStyles = document.querySelector('link[href*="sfw-switch"]')
    baseStyles.classList.add('sfw-styles')
    baseStyles.disabled = !enableBlur
    
    addOptionalStyles(enableBlur);
    
    waitForElementClass("plugin_sfw", () => {
      enableBlur
        ? setSvgColour("#5cff00") // green
        : setSvgColour("#f5f8fa") // white
    })
  }

  function setSvgColour(colour) {
    document.getElementById("plugin_sfw_icon").style.fill = colour
  }

  function createNewStyleElement() {
    const newStylesEl = document.createElement('style')
    newStylesEl.classList.add('sfw-styles')
    return newStylesEl
  }

  function attachSfwStyles(newStylesEl) {
    const mainStyles = 
      [...document.querySelectorAll('.sfw-styles-option')]?.at(-1) || 
      document.querySelector('.sfw-styles')

    mainStyles.insertAdjacentElement('afterend', newStylesEl)
  }

  function addOptionalStyles(enableBlur) {
    addBlurStudioLogosStyles(enableBlur)
  }

  function addBlurStudioLogosStyles(enableBlur) {
    const newStylesEl = createNewStyleElement()
    newStylesEl.classList.add('sfw-styles-option')
    newStylesEl.setAttribute('data-config-name', 'blurStudioLogos')
    
    newStylesEl.innerText = `
      .image-thumbnail,
      .scene-studio-overlay .image-thumbnail {
        filter: blur(8px) !important;
      }

      .image-thumbnail:hover {
        filter: blur(0px) !important;
      }
    `
      .replace(/\n/g, '')
      .replace(/\t/g, '')
      .replace(/ /g, '')

    attachSfwStyles(newStylesEl)
    
    if (!enableBlur) {
      newStylesEl.disabled = true
    } else {
      newStylesEl.disabled = config.blurStudioLogos
    }
  }

  function createSfwButton () {
    if (!document.getElementById("plugin_sfw")) {
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
        const navBtnContainer = document
          .getElementsByClassName("navbar-buttons")[0];
        
        if (navBtnContainer.childNodes[0].classList.contains('btn-primary')) {
          navBtnContainer
            .insertBefore(pluginDiv, navBtnContainer.childNodes[1]);
        } else {
          navBtnContainer
            .insertBefore(pluginDiv, navBtnContainer.childNodes[0]);
        }

        pluginDiv.addEventListener("click", toggleSwitch, false);
      })
    }
  }

  function toggleSwitch () {
    const sfwStyles = [...document.querySelectorAll('.sfw-styles')]
    const enableBlur = localStorage.getItem('sfw-enabled') === 'true'

    for (const style of sfwStyles) {

      if (style.tagName.toLowerCase() === 'link') {
        style.disabled = enableBlur
      } else if (style.tagName.toLowerCase() === 'style') {
        const configValue = config[style.dataset.configName]
        
        if (!enableBlur) { // NSFW
          style.disabled = true
        } else { // SFW
          style.disabled = configValue
        }
      }
    }

    if (!enableBlur) { // NSFW
      setSvgColour("#5cff00") // green
      localStorage.setItem('sfw-enabled', 'true')
    } else { // SFW
      setSvgColour("#f5f8fa") // white
      localStorage.removeItem('sfw-enabled')
    }
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
