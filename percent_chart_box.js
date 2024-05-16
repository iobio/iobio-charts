import iobio from './lib/iobio.viz/iobio.viz.esm.js';

function PercentChartBox() {
  const el = document.createElement('div');
  el.classList.add('percent');
  el.classList.add('panel');
  //const el = document.getElementById('container');

  const donutEl = document.createElement('div');
  el.appendChild(donutEl);

  const pie = iobio.viz.pie;

  const d3Pie = d3.layout.pie()
    .sort(null);

  const chart = pie()
    .radius(61)
    .innerRadius(50)
    .color( function(d,i) { if (i==0) return '#2d8fc1'; else return 'rgba(45,143,193,0.2)'; });

  const data = [1, 1, 2, 4];

  const selection = d3.select(donutEl)
    .datum(d3Pie(data));

  setTimeout(() => {
    chart(selection);
  }, 1000);

  return el;
}

export default PercentChartBox;
