import iobioviz from './lib/iobio.viz/index.js';
import { applyCommonGlobalCSS, getDataFromAttr } from './common.js';
import * as d3 from "d3";

class HistogramElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {

    this._histo = core();
    
    this.shadowRoot.appendChild(this._histo.el);

    (async () => {
      const data = await getDataFromAttr(this);
      if (data) {
        this._histo.update(data);
      }
    })();
  }

  update(data) {
    return this._histo.update;
  }
}

function createHistogram() {
  applyCommonGlobalCSS();
  return core();
}

function core() {
  const el = document.createElement('div');

  const histogramChart = iobioviz.barViewer()
    .xValue(function(d) { return d[0]; })
    .yValue(function(d) { return d[1]; })
    .wValue(function() { return 1; })
    .height(256)
    .width("100%")
    .margin({ top: 5, right: 20, bottom: 20, left: 50 })
    .sizeRatio(.75)
    .tooltip(function(d) {
      return d[1];
    });

  function update(data) {
    const selection = d3.select(el).datum(data);
    histogramChart(selection);
  }

  return { el, update };
}


customElements.define('iobio-histogram', HistogramElement);

export {
  createHistogram,
  HistogramElement,
};
