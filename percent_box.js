import { commonStyleSheet, applyCommonGlobalCSS, applyGlobalCSS, getDataFromAttr } from './common.js';
import iobioviz from './lib/iobio.viz/index.js';
import * as d3 from "d3";


class PercentBoxElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this._pbox = core();

    const sheet = new CSSStyleSheet();
    const styles = this._pbox.getStyles()
    sheet.replaceSync(styles);

    this.shadowRoot.adoptedStyleSheets = [commonStyleSheet, sheet];

    this.shadowRoot.appendChild(this._pbox.el);

    (async () => {

      const dataBrokerId = this.getAttribute('broker-id');

      if (dataBrokerId) {
        const broker = document.getElementById(dataBrokerId);

        let data = [1,1];
        this._pbox.update(data);
        broker.addEventListener(this.getAttribute('percent-key'), (evt) => {
          //console.log("update percent-key", evt.detail);
          data = [ evt.detail, data[1] - evt.detail];
          this._pbox.update(data);
        });
        broker.addEventListener(this.getAttribute('total-key'), (evt) => {
          //console.log("update total-key", evt.detail);
          data = [ data[0], evt.detail - data[0] ];
          this._pbox.update(data);
        });
      }
      else {
        const data = await getDataFromAttr(this);
        if (data) {
          this._pbox.update(data);
        }
      }
    })();
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
