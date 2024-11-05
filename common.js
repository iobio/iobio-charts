const commonCss = `

  :host {
    display: block;
    width: 100%;
    height: 100%;
    --data-color: var(--iobio-data-color, #2d8fc1);
    --data-color-secondary: var(--iobio-data-color-secondary, rgba(45,143,193,0.2));
  }

  *, *::before, *::after {
    box-sizing: border-box;
  }

  .iobio-data {
    fill: var(--data-color);
  }

  .iobio-data-secondary {
    fill: var(--data-color-secondary);
  }

  .iobio-panel > .iobio-title {
    font-size: 30px
  }

  .iobio-panel {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    background-color: var(--iobio-background-color);
    padding: 5px;
    border: 1px solid rgb(230,230,230);
    border-radius: 2pt;
    text-align: center;
    position: relative;
  }

  /* Tooltip */
  .iobio-tooltip {   
    position: fixed; 
    top:0px;            
    text-align: center;           
    z-index:20;
    color:white;
    padding: 4px 6px 4px 6px;             
    font: 11px arial;        
    background: rgb(80,80,80);   
    border: 0px;      
    border-radius: 8px;           
    pointer-events: none;         
  }
`;

const commonStyleSheet = new CSSStyleSheet();
commonStyleSheet.replaceSync(commonCss);

let styleEl;
function applyCommonGlobalCSS() {
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.classList.add('iobio-css-common');
    styleEl.textContent = commonCss;
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

function getMeanCoverageFromReadDistribution(data) {
    let coverageMean = 0;
    for (const coverage in data) {
        const freq = data[coverage];
        coverageMean += (coverage * freq);
    }
    return Math.floor(coverageMean);
}


export {
  commonCss,
  commonStyleSheet,
  applyCommonGlobalCSS,
  applyGlobalCSS,
  getDataFromAttr,
  getDataBroker,
  upgradeProperty,
  getDimensions,
  getMeanCoverageFromReadDistribution,
};
