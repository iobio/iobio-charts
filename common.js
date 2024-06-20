const css = `
  :root {
    --iobio-background-color: #fff;
  }

  .iobio-percent-box,
  .iobio-percent-box *,
  .iobio-percent-box *::before,
  .iobio-percent-box *::after {
    box-sizing: border-box;
  }

  .iobio-percent-box {
    width: 100%;
    height: 100%;
  }

  .iobio-panel > .iobio-title {
    font-size: 30px
  }

  .iobio-panel {
    width: 100%;
    height: 100%;
    background-color: var(--iobio-background-color);
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

function getDataBroker(el) {

  if (el.broker) {
    return el.broker;
  }

  let broker = null;

  const dataBrokerId = el.getAttribute('broker-id');
  let brokerEl;
  if (dataBrokerId) {
    brokerEl = document.getElementById(dataBrokerId);
  }
  else {
    brokerEl = document.querySelector('iobio-data-broker');
  }

  if (brokerEl) {
    broker = brokerEl.broker;
  }

  return broker;
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

// See https://web.dev/articles/custom-elements-best-practices#make_properties_lazy
function upgradeProperty(obj, prop) {
  if (obj.hasOwnProperty(prop)) {
    let value = obj[prop];
    delete obj[prop];
    obj[prop] = value;
  }
}

function getDimensions(el) {
  const bcr = el.getBoundingClientRect();
  const cs = getComputedStyle(el);

  const paddingTop = parseFloat(cs.paddingTop);
  const paddingBottom = parseFloat(cs.paddingBottom);
  const paddingY = paddingTop + paddingBottom;

  const paddingLeft = parseFloat(cs.paddingLeft);
  const paddingRight = parseFloat(cs.paddingRight);
  const paddingX = paddingLeft + paddingRight;

  const borderTop = parseFloat(cs.borderTopWidth);
  const borderBottom = parseFloat(cs.borderBottomWidth);
  const borderY = borderTop + borderBottom;

  const borderLeft = parseFloat(cs.borderLeftWidth);
  const borderRight = parseFloat(cs.borderRightWidth);
  const borderX = borderLeft + borderRight;

  return {
    width: bcr.width,
    height: bcr.height,
    contentWidth: bcr.width - paddingX - borderX,
    contentHeight: bcr.height - paddingY - borderY,
    paddingTop,
    paddingBottom,
    paddingY,
    paddingLeft,
    paddingRight,
    paddingX,
    borderTop,
    borderBottom,
    borderY,
    borderLeft,
    borderRight,
    borderX,
  };
}

export {
  commonStyleSheet,
  applyCommonGlobalCSS,
  applyGlobalCSS,
  getDataFromAttr,
  getDataBroker,
  upgradeProperty,
  getDimensions,
};
