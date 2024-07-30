import iobioviz from './lib/iobio.viz/index.js';
import { commonCss, applyCommonGlobalCSS, getDataFromAttr, getDataBroker, upgradeProperty, getDimensions } from './common.js';
import * as d3 from "d3";
// TODO: currently data_broker_component has to be imported first, otherwise
// it's methods are not defined when other custom elements try to call them
import './data_broker_component.js';

function genHtml(styles) {
  return `
    <style>
      ${commonCss}

      .iobio-data {
        shape-rendering: crispEdges;
      }

      .iobio-histogram {
        width: 100%;
        height: 100%;
      }

      .iobio-histogram-title {
        height: 10%;
      }

      .iobio-histogram-svg-container {
        width: 100%;
        height: 90%;
      }

    </style>

    <div class='iobio-histogram'>
      <div class='iobio-panel'>
        <div class="loading-indicator">
          Sampling <img src="../../../images/loading_dots.gif"/>
        </div>
        <div class='iobio-histogram-svg-container'>
        </div>
      </div>
    </div>
  `;
}

class HistogramElement extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });

    upgradeProperty(this, 'label');
    upgradeProperty(this, 'broker-key');
    upgradeProperty(this, 'ignore-outliers');
  }

  get label() {
    return this.getAttribute('label');
  }
  set label(_) {
    this.setAttribute('label', _);
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

    this._histo = core({
      title: this.label,
    });
    this.shadowRoot.appendChild(this._histo.el);
    const broker = getDataBroker(this);

    function toggleSVGContainerAndIndicator(svgVisibility, indicatorDisplay) {
      const indicator = this.shadowRoot.querySelector('.loading-indicator');
      const svgContainer = this.shadowRoot.querySelector('.iobio-histogram-svg-container');
      svgContainer.style.visibility = svgVisibility;
      indicator.style.display = indicatorDisplay;
    }
    
    broker.onEvent('data-request-start', () => {
      toggleSVGContainerAndIndicator.call(this, 'hidden', 'block');
    });
    
    broker.onEvent('data-streaming-start', () => {
      toggleSVGContainerAndIndicator.call(this, 'visible', 'none');
    });

    if (broker) {
      let data = [];
      this._histo.update(data);
      toggleSVGContainerAndIndicator.call(this, 'hidden', 'block');
      broker.onEvent(this.brokerKey, (data) => {
          var d = Object.keys(data).filter(function (i) {
            return data[i] != "0"
          }).map(function (k) {
            return [+k, +data[k]]
          });

          if (this.ignoreOutliers) {
            d = iobioviz.layout.outlier()(d);
          }
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

let templateEl;
function core(opt) {

  if (!templateEl) {
    templateEl = document.createElement('template');
    templateEl.innerHTML = genHtml("");
  }

  const docFrag = templateEl.content.cloneNode(true);

  const panelEl = docFrag.querySelector('.iobio-panel');

  const chartEl = docFrag.querySelector('.iobio-histogram-svg-container');

  if (opt && opt.title) {
    const titleEl = document.createElement('div');
    titleEl.classList.add('iobio-histogram-title');
    titleEl.innerText = opt.title;
    panelEl.insertBefore(titleEl, chartEl);
  }

  const chart = iobioviz.barViewer()
    .xValue(function(d) { return d[0]; })
    .yValue(function(d) { return d[1]; })
    .wValue(function() { return 1; })
    //.height(256)
    //.width("100%")
    .margin({ top: 5, right: 20, bottom: 20, left: 55 })
    .sizeRatio(.75)
    .tooltip(function(d) {
      return d[1];
    });

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

  return { el: docFrag, update };
}


customElements.define('iobio-histogram', HistogramElement);

export {
  createHistogram,
  HistogramElement,
};
