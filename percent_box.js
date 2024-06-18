import { commonStyleSheet, applyCommonGlobalCSS, applyGlobalCSS, getDataFromAttr, getDataBroker } from './common.js';
import iobioviz from './lib/iobio.viz/index.js';
import * as d3 from "d3";
// TODO: currently data_broker has to be imported first, otherwise it's methods
// are not defined when other custom elements try to call them
import './data_broker.js';


class PercentBoxElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  get percentKey() {
    return this.getAttribute('percent-key');
  }
  set percentKey(_) {
    this.setAttribute('percent-key', _);
  }

  get totalKey() {
    return this.getAttribute('total-key');
  }
  set totalKey(_) {
    this.setAttribute('total-key', _);
  }

  get broker() {
    return this._broker;
  }
  set broker(_) {
    this._broker = _;
  }

  connectedCallback() {
    this._pbox = core();

    const sheet = new CSSStyleSheet();
    const styles = this._pbox.getStyles()
    sheet.replaceSync(styles);

    this.shadowRoot.adoptedStyleSheets = [commonStyleSheet, sheet];

    this.shadowRoot.appendChild(this._pbox.el);

    const broker = getDataBroker(this);
    if (broker) {
      let data = [1,1];
      this._pbox.update(data);
      broker.onEvent(this.percentKey, (val) => {
        data = [ val, data[1] - val ];
        this._pbox.update(data);
      });
      broker.onEvent(this.totalKey, (val) => {
        data = [ data[0], val - data[0] ];
        this._pbox.update(data);
      });
    }
    else {
      (async () => {
        const data = await getDataFromAttr(this);
        if (data) {
          this._pbox.update(data);
        }
      })();
    }
  }

  update(data) {
    if (this._pbox) {
      return this._pbox.update(data);
    }
  }
}

function createPercentBox() {

  applyCommonGlobalCSS();

  const pbox = core();

  applyGlobalCSS(pbox.getStyles(), 'percent-box');

  return pbox;
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

customElements.define('iobio-percent-box', PercentBoxElement);


export {
  PercentBoxElement,
  createPercentBox,
};
