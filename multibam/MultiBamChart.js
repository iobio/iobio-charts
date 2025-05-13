import * as d3 from 'd3';

function createMultiBam(parent, header, readDepthData) {
    //Remove the multiBam chart if it exists
    const existingChart = parent.querySelector('#multibam-chart');
    if (existingChart) {
        existingChart.remove();
    }

    const parentWidth = parent.clientWidth;
    const parentHeight = parent.clientHeight;
    const width = parentWidth;
    const height = parentHeight;
    const margin = { top: 5, right: 5, bottom: 5, left: 5 };
    const totalLength = d3.sum(header, (d) => d.length);
    
    // Order the header
    header.sort((a, b) => a.sn - b.sn)

    const accMap = _createAccumulatedMap(header);
    console.log('accMap', accMap);

    let allBins = [];
    Object.entries(readDepthData).forEach(([sn, bins]) => {
        let newSn = parseInt(sn) + 1;
        console.log('newSn', newSn);
        let chr = accMap[newSn];
        let newBins = bins.map((bin) => {
            bin['start'] = chr.start + bin.offset;
            return bin
        });
        allBins = allBins.concat(newBins);
    });
    const minBinValue = d3.min(allBins, (d) => d.avgCoverage);
    const mean = d3.mean(allBins, (d) => d.avgCoverage);

    const maxY = mean * 5; //Five times the mean

    // SVG
    let svg = d3.create('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', [0, 0, width, height])
        .attr('id', 'multibam-chart');

    const x = d3.scaleLinear()
        .domain([0, totalLength])
        .range([margin.left, width - margin.right]);
    
    // our y scale will... be the height minus the margins and our maximum value of any one bin
    const y = d3.scaleLinear()
        .domain([minBinValue, maxY])
        .range([height - margin.bottom, margin.top]);

    const dotPath = allBins
        .map(d => {
            const xPos = x(d.start);
            const yPos = y(d.avgCoverage);
            return `M${xPos},${yPos}h0`;
        })
        .join(" ");

    svg.append("path")
        .attr("d", dotPath)
        .attr("stroke", "black")
        .attr("stroke-opacity", 0.8)
        .attr("stroke-width", 2)
        .attr("fill", "none")
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round");

    return svg;
}

function _createAccumulatedMap(header) {
    /**
     * Takes in the header of relative coordinates and returns an object that has the accumulated positions for a linear view
     */
    let accumulatedMap;

    let total = 0;
    let i = 0;
    accumulatedMap = header.reduce((acc, h) => {
        acc[h.sn] = h;
        acc[h.sn].start = total;
        acc[h.sn].end = total + length;
        acc[h.sn].position = i

        total += h.length;
        i++
        return acc
    }, {});


    return accumulatedMap
}

export { createMultiBam };