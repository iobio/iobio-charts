import * as d3 from 'd3';

function createMultiSeries(parent, header, readDepthData) {
    //Remove the multiBam chart if it exists
    const existingChart = parent.querySelector('#multi-series-chart');
    if (existingChart) {
        existingChart.remove();
    }

    const parentWidth = parent.clientWidth;
    const parentHeight = parent.clientHeight;
    const width = parentWidth;
    const height = parentHeight;
    const margin = { top: 5, right: 5, bottom: 5, left: 0 };
    const totalLength = d3.sum(header, (d) => d.length);

    const accMap = _createAccumulatedMap(header); //We are going to accumulate based on the header order
    let allBins = [];
    Object.entries(readDepthData).forEach(([i, bins]) => {
        let chr = accMap[header[i].sn];
        let newBins = bins.map((bin) => {
            bin.start = chr.start + bin.offset;
            return bin
        });
        allBins = allBins.concat(newBins);
    });
    const minBinValue = d3.min(allBins, (d) => d.avgCoverage);
    const mean = d3.mean(allBins, (d) => d.avgCoverage);
    const sd = d3.deviation(allBins, (d) => d.avgCoverage);

    const maxY = mean * 5; //Five times the mean

    // SVG
    let svg = d3.create('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', [0, 0, width, height])
        .attr('id', 'multi-series-chart');

    const x = d3.scaleLinear()
        .domain([0, totalLength])
        .range([margin.left, width - margin.right]);
    
    // our y scale will... be the height minus the margins and our maximum value of any one bin
    const y = d3.scaleLinear()
        .domain([minBinValue, maxY])
        .range([height - margin.bottom, margin.top]);

    allBins.forEach((d) => {
        const xPos = x(d.start);
        const yPos = y(d.avgCoverage);
        let strokeColor = "gray";
        let opacity = 1;
        
        if (d.avgCoverage < mean - .5 * mean || d.avgCoverage > mean + .5 * mean) {
            svg.append("path")
            .attr("d", `M${xPos},${yPos}h0`)
            .attr("stroke", strokeColor)
            .attr("stroke-opacity", opacity)
            .attr("stroke-width", 2)
            .attr("fill", "none")
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round");
        }
    
    });

    return svg;
}

function _createAccumulatedMap(header) { //Segments Not Headers
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

export { createMultiSeries };