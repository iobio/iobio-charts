const css = `
  :root {
    --iobio-background-color: #fff;
  }

  .iobio-panel > .iobio-title {
    font-size: 30px
  }

  .iobio-panel {
    background-color: var(--iobio-background-color);
    margin: 20px;
    padding: 5px;
    border: 1px solid rgb(230,230,230);
    border-radius: 2pt;
    text-align: center;
  }
`;

const commonStyleSheet = new CSSStyleSheet();
commonStyleSheet.replaceSync(css);

let styleEl;
function applyCommonGlobalCSS() {
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.classList.add('iobio-css-common');
    styleEl.textContent = css;
    insertStyleElement(styleEl);
  }
}

const styleMap = {};
function applyGlobalCSS(cssText, id) {
  if (!styleMap[id]) {
    const styleEl = document.createElement('style');
    styleEl.classList.add(`iobio-css-${id}`);
    styleEl.textContent = cssText;
    insertStyleElement(styleEl);
    styleMap[id] = styleEl;
  }
}

function insertStyleElement(el) {
  // In order to be able to override values, we want our style elements to be
  // inserted just before any existing ones.
  const firstExistingStyleEl = document.querySelector('style');
  if (firstExistingStyleEl) {
    firstExistingStyleEl.insertAdjacentElement('beforebegin', el);
  }
  else {
    document.head.appendChild(el);
  }
}

async function getDataFromAttr(el) {
  const dataAttr = el.getAttribute('data');
  const dataScriptId = el.getAttribute('data-script-id');
  const dataScriptUrl = el.getAttribute('data-url');

  let data;
  if (dataAttr) {
    return JSON.parse(dataAttr);
  }
  else if (dataScriptId) {
    return JSON.parse(document.getElementById(dataScriptId).textContent);
  }
  else if (dataScriptUrl) {
    return fetch(dataScriptUrl).then(res => res.json());
  }
}

export {
  commonStyleSheet,
  applyCommonGlobalCSS,
  applyGlobalCSS,
  getDataFromAttr,
};
