import { commonStyleSheet, applyCommonGlobalCSS, applyGlobalCSS } from './common.js';
import iobioviz from './lib/iobio.viz/index.js';
import * as d3 from "d3";

function PercentChartBox() {

  applyCommonGlobalCSS();

  const pbox = core();

  applyGlobalCSS(pbox.getStyles(), 'percent-chart-box');

  return pbox;
}

class PercentChartBoxCustomElement extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this._pbox = core();

    const root = this.attachShadow({ mode: 'open' });

    const sheet = new CSSStyleSheet();
    const styles = this._pbox.getStyles()
    sheet.replaceSync(styles);

    root.adoptedStyleSheets = [commonStyleSheet, sheet];

    root.appendChild(this._pbox.el);

    const dataAttr = this.getAttribute('data');
    const dataScriptId = this.getAttribute('data-script-id');
    const dataScriptUrl = this.getAttribute('data-url');

    if (dataAttr) {
      const data = JSON.parse(dataAttr);
      this._pbox.update(data);
    }
    else if (dataScriptId) {
      const data = JSON.parse(document.getElementById(dataScriptId).textContent);
      this._pbox.update(data);
    }
    else if (dataScriptUrl) {
      (async () => {
        const res = await fetch(dataScriptUrl)
        const data = await res.json();
        this._pbox.update(data);
      })();
    }
  }

  update(data) {
    if (this._pbox) {
      return this._pbox.update(data);
    }
  }
}

function core() {
  const el = document.createElement('div');
  el.classList.add('iobio-percent');
  el.classList.add('iobio-panel');
  //const el = document.getElementById('container');

  const donutEl = document.createElement('div');
  el.appendChild(donutEl);

  const d3Pie = d3.pie()
  //const d3Pie = d3.layout.pie()
    .sort(null);

  const chart = iobioviz.pie()
    .radius(61)
    .innerRadius(50)
    .color( function(d,i) { if (i==0) return '#2d8fc1'; else return 'rgba(45,143,193,0.2)'; });

  const data = [1, 3];

  const selection = d3.select(donutEl)
    .datum(d3Pie(data));

  function update(data) {
    selection.datum(d3Pie(data));
    chart(selection);
  }

  function getStyles() {
    return chart.getStyles();
  }

  return { el, update, getStyles };
}

customElements.define('percent-chart-box', PercentChartBoxCustomElement);


export default PercentChartBox;
