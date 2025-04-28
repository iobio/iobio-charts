import * as d3 from 'd3';

function createMultiBam(parent) {
    const parentWidth = parent.clientWidth;
    const parentHeight = parent.clientHeight;

    let svg;

    //create the most basic svg for testing
    const width = parentWidth;
    const height = parentHeight;

    // new svg completely
    svg = d3.create('svg')
        .attr('width', width)
        .attr('height', height);

    return svg;
}

export { createMultiBam };