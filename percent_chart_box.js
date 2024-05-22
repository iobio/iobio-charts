import iobio from './lib/iobio.viz/iobio.viz.esm.js';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";


async function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.setAttribute('src', src);
    script.addEventListener('load', resolve);
    script.addEventListener('error', reject);
    document.body.appendChild(script);
  });
}

function PercentChartBox() {

  const el = document.createElement('div');
  el.classList.add('percent');
  el.classList.add('panel');
  //const el = document.getElementById('container');

  const donutEl = document.createElement('div');
  el.appendChild(donutEl);

  (async () => {

    const d3Pie = d3.pie()
      .sort(null);

    const chart = iobio.viz.pie()
      .radius(61)
      .innerRadius(50)
      .color( function(d,i) { if (i==0) return '#2d8fc1'; else return 'rgba(45,143,193,0.2)'; });

    const data = [1, 3];

    const selection = d3.select(donutEl)
      .datum(d3Pie(data));

    setTimeout(() => {
      chart(selection);
    }, 500);

  })();

  return el;
}

class PercentChartCE extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    const dom = PercentChartBox();
    this.appendChild(dom);
  }

  customFunc() {
    console.log("WAT");
  }
}

customElements.define('percent-chart-ce', PercentChartCE);


export default PercentChartBox;
