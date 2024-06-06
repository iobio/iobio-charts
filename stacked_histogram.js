import iobioviz from './lib/iobio.viz/index.js';
import { getDataFromAttr } from './common.js';
import * as d3 from "d3";

class StackedHistogram extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {

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

    this.shadowRoot.appendChild(el);

    (async () => {
      const data = await getDataFromAttr(this);
      if (data) {
        update(data);
      }
    })();

    function update(data) {
      const selection = d3.select(el).datum(data);
      histogramChart(selection);
    }
  }
}


customElements.define('stacked-histogram', StackedHistogram);

export default StackedHistogram;
