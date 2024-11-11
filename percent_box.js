import { commonCss, applyCommonGlobalCSS, applyGlobalCSS, getDataFromAttr, getDataBroker, upgradeProperty, getDimensions } from './common.js';
import iobioviz from './lib/iobio.viz/index.js';
import * as d3 from "d3";
// TODO: currently data_broker_component has to be imported first, otherwise
// it's methods are not defined when other custom elements try to call them
import './data_broker_component.js';
import { LoadingIndicator } from './loading_indicator.js';

function genHtml(styles) {
  return `
    <style>
      ${commonCss}
      ${styles}

      .iobio-percent-box {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        position: relative;
      }

      .iobio-percent-box-title {
        margin-left: 5px;
      }

      .iobio-percent-box-svg-container {
        width: 100%;
        height: 80%;
        container-type: size;
      }

      .hidden {
        visibility: hidden;
      }

    </style>

    <div class='iobio-percent-box'>
      <iobio-loading-indicator label="Sampling"></iobio-loading-indicator>
      <div class='iobio-percent-box-svg-container'>
      </div>
    </div>
  `;
}


class PercentBoxElement extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });

    upgradeProperty(this, 'label');
    upgradeProperty(this, 'percent-key');
    upgradeProperty(this, 'total-key');
    upgradeProperty(this, 'broker');
  }

  get label() {
    return this.getAttribute('label');
  }
  set label(_) {
    this.setAttribute('label', _);
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

    this._pbox = core({
      title: this.label,
    });

    const sheet = new CSSStyleSheet();
    this.shadowRoot.appendChild(this._pbox.el);
    const broker = getDataBroker(this);
    
    function toggleSVGContainerAndIndicator(showSVG) {
      const indicator = this.shadowRoot.querySelector('iobio-loading-indicator');
      const svgContainer = this.shadowRoot.querySelector('.iobio-percent-box-svg-container');
      
      svgContainer.classList.toggle('hidden', !showSVG);
      indicator.style.display = showSVG ? 'none' : 'block';
    }

    broker.addEventListener('reset', () => toggleSVGContainerAndIndicator.call(this, false));
    
    broker.addEventListener('stats-stream-request', () => toggleSVGContainerAndIndicator.call(this, false));
    broker.addEventListener('stats-stream-start', () => toggleSVGContainerAndIndicator.call(this, true));

    if (broker) {
      let data = [0, 0];
      this._pbox.update(data);
      toggleSVGContainerAndIndicator.call(this, false);
      broker.addEventListener('stats-stream-data', (evt) => {
        const stats = evt.detail.stats;
        // Determine if the values come from index mapped reads or sampled mapped reads
        // if (this.percentKey === "calculated_mapped_reads" && stats.calculated_mapped_reads !== stats.mapped_reads &&
        //     stats.calculated_total_reads !== stats.total_reads) {
        //     this.style.setProperty('--iobio-data-color', 'rgb(9,176,135)');
        //     this.style.setProperty('--iobio-data-color-secondary', 'rgba(9,176,135,0.5)');
        //   }
          const val = stats[this.percentKey];
          const total = stats[this.totalKey];
          data = [ val, total - val ];
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

let templateEl;
function core(opt) {

  const chart = iobioviz.pie()
    .radius(61)
    .innerRadius(50);

  if (!templateEl) {
    templateEl = document.createElement('template');
    templateEl.innerHTML = genHtml(chart.getStyles());
  }

  const docFrag = templateEl.content.cloneNode(true);

  const chartEl = docFrag.querySelector('.iobio-percent-box-svg-container');

  const d3Pie = d3.pie()
  //const d3Pie = d3.layout.pie()
    .sort(null);

  let data = [1, 3];

  const selection = d3.select(chartEl)
    .datum(d3Pie(data));


  function render() {

    const dim = getDimensions(chartEl);
    //console.log(chartEl, dim);

    let smallest = dim.contentWidth < dim.contentHeight ? dim.contentWidth : dim.contentHeight;
    const radius = smallest / 2;
    chart.radius(radius);
    chart.innerRadius(radius - (.1*smallest));

    selection.datum(d3Pie(data));
    chart(selection);
  }

  const ro = new ResizeObserver(() => {
    render();
  });
  ro.observe(chartEl);

  function update(newData) {
    data = newData
    render();
  }

  function getStyles() {
    return chart.getStyles();
  }

  return { el: docFrag, update, getStyles, chart};
}


customElements.define('iobio-percent-box', PercentBoxElement);

export {
  PercentBoxElement,
  createPercentBox,
};
