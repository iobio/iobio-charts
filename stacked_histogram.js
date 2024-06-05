import iobioviz from './lib/iobio.viz/index.js';
import * as d3 from "d3";

function StackedHistogram() {
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

export default StackedHistogram;
