import iobioviz from './lib/iobio.viz/index.js';
import { commonCss, applyCommonGlobalCSS, getDataFromAttr, getDataBroker, upgradeProperty, getDimensions } from './common.js';
import * as d3 from "d3";
// TODO: currently data_broker_component has to be imported first, otherwise
// it's methods are not defined when other custom elements try to call them
import './data_broker_component.js';
import { LoadingIndicator } from './loading_indicator.js';
import {TooltipModal} from './modal.js';

function genHtml(styles) {
  return `
    <style>
      ${commonCss}

      .iobio-data {
        shape-rendering: crispEdges;
      }

      .iobio-histogram {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        position: relative;
      }

      .iobio-histogram-svg-container {
        width: 100%;
        height: 90%;
      }

      .hidden {
        visibility: hidden;
      }

    </style>

    <div class='iobio-histogram'>
      <iobio-loading-indicator label="Sampling"></iobio-loading-indicator>
      <div class='iobio-histogram-svg-container'>
      </div>
    </div>
  `;
}

class HistogramElement extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    
    upgradeProperty(this, 'broker-key');
    upgradeProperty(this, 'ignore-outliers');
  }

  get ignoreOutliers() {
    return this.hasAttribute('ignore-outliers');
  }
  set ignoreOutliers(_) {
    this.setAttribute('ignore-outliers', _);
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

    function toggleSVGContainerAndIndicator(showSVG) {
      const indicator = this.shadowRoot.querySelector('iobio-loading-indicator');
      const svgContainer = this.shadowRoot.querySelector('.iobio-histogram-svg-container');
      
      svgContainer.classList.toggle('hidden', !showSVG);
      indicator.style.display = showSVG ? 'none' : 'block';
    }

    broker.addEventListener('stats-stream-request', () => toggleSVGContainerAndIndicator.call(this, false));
    broker.addEventListener('stats-stream-start', () => toggleSVGContainerAndIndicator.call(this, true));

    if (broker) {
      let data = [];
      this._histo.update(data);
      toggleSVGContainerAndIndicator.call(this, false);
      broker.addEventListener('stats-stream-data', (evt) => {
        const data = evt.detail[this.brokerKey];
        var d = Object.keys(data).filter(function (i) {
          return data[i] != "0"
        }).map(function (k) {
          return [+k, +data[k]]
        });

        if (this.ignoreOutliers) {
          d = iobioviz.layout.outlier()(d);
        }

        // Apply custom or default configurations based on attributes
        this.applyChartConfigurations();

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

  applyChartConfigurations() {
    // Apply custom or default configurations for the chart tooltip, xAxis and yAxis
    if (this.hasAttribute('custom-tooltip-format')) {
      this._histo.chart.tooltip((d) => `${d[0]}, ${this.precisionRound(d[1] * 100, 2)}%`);
    } else {
      this._histo.chart.tooltip((d) => this.tooltipFormatter(d));
    }

    if (this.hasAttribute('custom-xaxis-tickformat')) {
      this._histo.chart.xAxis().tickFormat((d) => `${d}X`);
    } else {
      this._histo.chart.xAxis().tickFormat((d) => this.tickFormatter(d));
    }

    if (this.hasAttribute('custom-yaxis-tickformat')) {
      this._histo.chart.yAxis().tickFormat((d) => `${d * 100}%`);
    } else {
      this._histo.chart.yAxis().tickFormat((d) => this.tickFormatter(d));
    }
  }

  tickFormatter (d) {
    if ((d / 1000000) >= 1)
      d = d / 1000000 + "M";
    else if ((d / 1000) >= 1)
      d = d / 1000 + "K";
    return d;
  }
  
  tooltipFormatter (d) {
    var yVal = d[1];
  
    if ((yVal / 1000000) >= 1)
      yVal = this.precisionRound(yVal / 1000000, 1) + "M";
    else if ((yVal / 1000) >= 1)
      yVal = this.precisionRound(yVal / 1000, 1) + "K";
    else
      yVal = this.precisionRound(yVal, 1);
  
    return d[0] + ',' + yVal;
  }
  
  precisionRound(number, precision) {
    var factor = Math.pow(10, precision);
    return Math.round(number * factor) / factor;
  }
}

function createHistogram() {
  applyCommonGlobalCSS();
  return core();
}

let templateEl;
function core() {

  if (!templateEl) {
    templateEl = document.createElement('template');
    templateEl.innerHTML = genHtml("");
  }

  const docFrag = templateEl.content.cloneNode(true);

  const chartEl = docFrag.querySelector('.iobio-histogram-svg-container');

  const chart = iobioviz.barViewer()
    .xValue(function(d) { return d[0]; })
    .yValue(function(d) { return d[1]; })
    .wValue(function() { return 1; })
    //.height(256)
    //.width("100%")
    .margin({ top: 5, right: 20, bottom: 20, left: 55 })
    .sizeRatio(.75)


  let data;

  function render() {
    const dim = getDimensions(chartEl);
    // console.log(dim);

    chart.width(dim.contentWidth);
    chart.height(dim.contentHeight);

    const selection = d3.select(chartEl).datum(data);
    chart(selection);
  }

  const observer = new ResizeObserver(render);
  observer.observe(chartEl);

  function update(newData) {
    data = newData;
    render();
  }

  return { el: docFrag, update, chart };
}


customElements.define('iobio-histogram', HistogramElement);

export {
  createHistogram,
  HistogramElement,
};
