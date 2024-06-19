import iobioviz from './lib/iobio.viz/index.js';
import { applyCommonGlobalCSS, getDataFromAttr, getDataBroker, upgradeProperty } from './common.js';
import * as d3 from "d3";
// TODO: currently data_broker has to be imported first, otherwise it's methods
// are not defined when other custom elements try to call them
import './data_broker.js';

class HistogramElement extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });

    upgradeProperty(this, 'broker-key');
  }

  get brokerKey() {
    return this.getAttribute('broker-key');
  }
  set brokerKey(_) {
    this.setAttribute('broker-key', _);
  }

  connectedCallback() {

    this._histo = core();
    
    this.shadowRoot.appendChild(this._histo.el);

    const broker = getDataBroker(this);
    if (broker) {
      let data = [[0,1],[1,2]];
      this._histo.update(data);

      broker.onEvent(this.brokerKey, (data) => {

        var d = Object.keys(data).filter(function (i) {
          return data[i] != "0"
        }).map(function (k) {
          return [+k, +data[k]]
        });

        this._histo.update(d);
      });
    }
    else {
      (async () => {
        const data = await getDataFromAttr(this);
        if (data) {
          this._histo.update(data);
        }
      })();
    }
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
