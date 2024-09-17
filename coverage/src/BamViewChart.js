import * as d3 from 'd3';

function createBamView(bamHeader, data, element, broker) {

    let xScale, yScale, xNavScale, yNavScale, svg, main, nav, color, brush, yAxis,
        margin, margin2, mainHeight, navHeight, innerWidth, innerHeight, indexMap;

    function createBamViewInner(bamHeader, data, element) {
        const average = calculateMeanCoverage(data);
        const aggregatedDataArray = aggregateData(data, 30);
        const totalLength = d3.sum(bamHeader, d => d.length);

        indexMap = bamHeader.reduce((acc, ref, index) => {
            acc[ref.sn] = index;
            return acc;
          }, {});

        const width = element.offsetWidth;
        const height = element.offsetHeight;
        margin = { top: 60, right: 20, bottom: 20, left: 60 };
        margin2 = { top: 10, right: 20, bottom: 20, left: 60 };
        innerWidth = width - margin.left - margin.right;
        innerHeight = height - margin.top - margin.bottom;

        // Split heights for main and navigation charts
        navHeight = 0.2 * innerHeight;
        mainHeight = innerHeight - navHeight - 10;

        // Create SVG container
        svg = d3.select(element)
                .append('svg')
                .attr('width', '100%')
                .attr('height', '100%')
                .attr('viewBox', `0 0 ${width} ${height}`);

        // Aggregate data by bins of 30 for each group
        function aggregateData(data, aggregationSize) {
            const aggregatedDataArray = [];

            for (const [group, arr] of Object.entries(data)) {
                for (let i = 0; i < arr.length; i += aggregationSize) {
                    let chunk = arr.slice(i, i + aggregationSize);
                    const totalReads = d3.sum(chunk, d => d.reads);
                    const chunkLength = chunk.length;
                    const avgCoverage = totalReads / (chunkLength * 16384);
                    aggregatedDataArray.push({
                        offset: chunk[0].offset,  // new offset for the chunk data
                        avgCoverage: avgCoverage,
                        chunkLength: chunkLength,
                        group: group
                    });
                }
            }

            return aggregatedDataArray;
        }


        // Calculate mean coverage
        function calculateMeanCoverage(data) {
            let totalCoverage = 0;
            let totalLength = 0;
            let meanCoverage = 0;
            for (const key in data) {
                for (let i = 0; i < data[key].length; i++) {
                    totalCoverage += data[key][i].avgCoverage;
                }
                totalLength += data[key].length;
            }
            meanCoverage = totalCoverage / totalLength;
            return meanCoverage;
        }


        // Get the start position of each chromosome in the total length
        function getChromosomeStart(sn) {
            let start = 0;
            for (let i = 0; i < bamHeader.length; i++) {
                if (i == sn) break;
                start += bamHeader[i].length;
            }
            return start;
        }


        // Reset to all chromosomes
        function drawCircleButton(svg) {
            // Remove existing reset button if it exists
            svg.selectAll('.circle-button-reset-chromosomes').remove();
            // Create a circle button for reseting to all chromosomes
            const circleButton = svg.append('g')
                .attr('class', 'circle-button-reset-chromosomes chromosome-button')
                .attr('transform', 'translate(30, 20)')
                .on('click', (event, d) => {
                    // Redraw the chart
                    drawChart(svg);

                    // Dispatch custom event from the shadow DOM element
                    dispatchCustomEvent('selected-regions-change', bamHeader);

                    // Dispatch custom event for resetting the region inputs
                    const regionsInput = {
                        rname: '',
                        start: null,
                        end: null
                    };
                    dispatchCustomEvent('brushed-region-change', regionsInput);

                    // Dispatch custom event for resetting the gene input
                    const geneInput = {
                        geneName: ''
                    };
                    dispatchCustomEvent('selected-gene-change', geneInput);
                });

            // Create a circle for the reset button
            circleButton.append('circle')
                .attr('class', 'circle')
                .attr('cx', 0)
                .attr('cy', 0)
                .attr('r', 15);

            // Create a text for the reset button
            circleButton.append('text')
                .attr('x', 0)
                .attr('y', 0)
                .attr('dy', '.35em')
                .attr('text-anchor', 'middle')
                .attr('fill', 'white')
                .text('All')
                .style('font-size', '12px');
        }


        // Draw the bar chart
        function drawChart(svg) {
            // Remove existing elements to avoid duplication
            svg.selectAll('.bar').remove();
            svg.selectAll('.brush').remove();
            svg.selectAll('.y-axis').remove();
            svg.selectAll('.y-axis-label').remove();
            svg.selectAll('.chromosome-button-small').remove();
            svg.selectAll('.chromosome-label').remove();
            svg.selectAll('.chromosome-button-big').remove();
            svg.selectAll('.gene-region-highlight, .gene-region-label').remove();

            // Create button group
            const buttons_xScale = d3.scaleLinear()
                                    .range([0, innerWidth])
                                    .domain([1, totalLength]);

            // Create a color scale
            color = d3.scaleSequential(d3.interpolateRainbow)
                            .domain([0, bamHeader.length - 1]);

            // Create groups for each chromosome
            const chromosomes = svg.selectAll('.chromosome-button-small')
                .data(bamHeader)
                .enter().append('g')
                .attr('class', 'chromosome-button-small chromosome-button')
                .attr('transform', (d, i) => `translate(${buttons_xScale(d3.sum(bamHeader.slice(0, i), e => e.length)) + margin2.left}, ${margin2.top})`)
                .on('click', function (event, d) {
                    zoomToChromosome(d.sn);
                    
                    // Dispatch custom event from the shadow DOM element
                    dispatchCustomEvent('selected-regions-change', [d]);
                });

            
            // Add rectangles for each chromosome
            chromosomes.append('rect')
                .attr('width', d => buttons_xScale(d.length))
                .attr('height', 20)
                .attr('y', 0)
                .attr('fill', (d, i) => color(i));

            // Add labels for each chromosome
            chromosomes.append('text')
                .attr('class', 'label')
                .attr('x', d => buttons_xScale(d.length) / 2)
                .attr('y', 10)
                .attr('dy', '.35em')
                .attr('text-anchor', 'middle')
                .attr('fill', 'white')
                .attr('font-size', '10px')
                .text(d => d.sn);

            // Scales for the main chart
            xScale = d3.scaleLinear()
                            .range([0, innerWidth])
                            .domain([1, totalLength]);

            yScale = d3.scaleLinear()
                            .range([mainHeight, 0])
                            .domain([0, 2 * average]);

            // Scales for the navigation chart
            xNavScale = d3.scaleLinear()
                                .range([0, innerWidth])
                                .domain([1, totalLength]);

            yNavScale = d3.scaleLinear()
                                .range([navHeight, 0])
                                .domain(yScale.domain());          

            // Append Y-axis label
            svg.append('text')
                .attr('class', 'y-axis-label')
                .attr('transform', `translate(${margin.left - 40}, ${margin.top + mainHeight / 2}) rotate(-90)`)
                .attr('text-anchor', 'middle')
                .text('Coverage (rough estimate)')
                .style('font-size', '12px');

            // Clip path
            svg.append('defs')
                .append('clipPath')
                .attr('id', 'clip')
                .append('rect')
                .attr('width', innerWidth)
                .attr('height', mainHeight);

            // Main chart group
            main = svg.append('g')
                            .attr('transform', `translate(${margin.left}, ${margin.top})`)
                            .attr('clip-path', 'url(#clip)');
            // Navigation chart group
            nav = svg.append('g')
                        .attr('transform', `translate(${margin.left}, ${mainHeight + margin.top + 20})`)
                        .attr('clip-path', 'url(#clip)');

            const barWidth = 1; // Fixed bar width with 1 pixel
            const numBins = innerWidth; // Number of bins based on inner width
            const start = 1;
            const end = totalLength;

            // Aggregate data into bins
            const aggregatedData = aggreateDataIntoBins(aggregatedDataArray, start, end, numBins, getChromosomeStart);

            // Main bars
            main.selectAll('.bar')
                .data(aggregatedData)
                .enter().append('rect')
                .attr('class', 'bar')
                .attr('x', d => xScale(d.binStart))
                .attr('y', d => yScale(d.avgCoverage))
                .attr('width', barWidth)
                .attr('height', d => mainHeight - yScale(d.avgCoverage));

            // Navigation bars
            nav.selectAll('.bar')
                .data(aggregatedData)
                .enter().append('rect')
                .attr('class', 'bar')
                .attr('x', d => xNavScale(d.binStart))
                .attr('y', d => yNavScale(d.avgCoverage))
                .attr('width', barWidth)
                .attr('height', d => navHeight - yNavScale(d.avgCoverage));

            broker.addEventListener('stats-stream-data', (evt) => {
                const data = evt.detail.coverage_hist;
                let coverageMean = 0;
                for (const coverage in data) {
                    const freq = data[coverage];
                    coverageMean += (coverage * freq);
                }
                const meanCoverage = Math.floor(coverageMean);
                /* Draw the y-axis and mean line dynamically based on the stream coverageMean 
                */

                // Remove existing mean line and y-axis
                svg.selectAll('.mean-line-group').remove();
                svg.selectAll('.y-axis').remove();

                const conversionRatio = average / meanCoverage;

                const yAxis_scale = d3.scaleLinear()
                            .range([mainHeight, 0])
                            .domain([0, 2 * average / conversionRatio]);

                // Y-axis
                yAxis = d3.axisLeft(yAxis_scale)
                        .ticks(Math.floor(mainHeight / 20))
                        .tickSize(0)
                        .tickFormat(d => `${d}x`);

                // Append Y-axis
                svg.append('g')
                    .attr('class', 'y-axis')
                    .attr('transform', `translate(${margin.left}, ${margin.top})`)
                    .call(yAxis); 

                const meanLineGroup = svg.append('g')
                    .attr('class', 'mean-line-group')
                    .attr('transform', `translate(${margin.left}, ${margin.top})`);

                // Add mean line
                meanLineGroup.append('line')
                    .attr('class', 'mean-line')
                    .attr('x1', 0)
                    .attr('x2', innerWidth)
                    .attr('y1', yAxis_scale(meanCoverage))
                    .attr('y2', yAxis_scale(meanCoverage))
                    .attr('stroke', 'red')
                    .attr('stroke-width', 2)
                    .attr('stroke-dasharray', '3,3')
                    .attr('z-index', 1000);

                // label for mean line
                meanLineGroup.append('text')
                    .attr('class', 'mean-label')
                    .attr('x', 0)
                    .attr('y', yAxis_scale(meanCoverage))
                    .attr('dy', "0.35em") 
                    .attr('text-anchor', 'end') 
                    .style('fill', 'red') 
                    .text(`${meanCoverage}x`)
                    .style('font-size', '12px');           
            });

            // Brush
            brush = d3.brushX()
                        .extent([[0, 0], [innerWidth, navHeight]])
                        .on('brush end', brushed);

            nav.append('g')
                .attr('class', 'brush')
                .call(brush);



            function brushed(event) {
                let startIndex;
                let endIndex;
                if (event.selection) {
                    const [x0, x1] = event.selection.map(xNavScale.invert);
                    startIndex = aggregatedData.findIndex(d => d.binStart >= x0);
                    endIndex = aggregatedData.findIndex(d => d.binStart > x1);

                    if (endIndex === -1) {
                        endIndex = aggregatedData.length - 1;
                    }
                    const brushedData = aggregatedData.slice(startIndex, endIndex + 1);

                    // Get the brushed bin data in navigation chart to update the main chart bars
                    const brushedBinData = aggregatedDataArray.filter(d => {
                        const position = getChromosomeStart(d.group) + d.offset;
                        return position >= x0 && position < x1;
                    });

                    if (brushedData.length === 0) {
                        return;
                    }

                    xScale.domain([x0, x1]);

                    const aggregatedBinData = aggreateDataIntoBins(brushedBinData, x0, x1, numBins, getChromosomeStart);

                    // remove existing bars
                    main.selectAll('.bar').remove();

                    // Update main chart bars for the brushed area more than the number of bins
                    if (brushedBinData.length > numBins) {
                        main.selectAll('.bar')
                            .data(aggregatedBinData)
                            .enter().append('rect')
                            .attr('class', 'bar')
                            .attr('x', d => xScale(d.binStart))
                            .attr('y', d => yScale(d.avgCoverage))
                            .attr('width', barWidth)
                            .attr('height', d => mainHeight - yScale(d.avgCoverage)); 
                    } else {
                        // Update the bars for the brushed area less than the number of bins
                        main.selectAll('.bar')
                            .data(brushedBinData)
                            .enter().append('rect')
                            .attr('class', 'bar')
                            .attr('x', d => xScale(getChromosomeStart(d.group) + d.offset))
                            .attr('width', d => {
                                const startX = xScale(getChromosomeStart(d.group) + d.offset);
                                const endX = xScale(getChromosomeStart(d.group) + d.offset + d.chunkLength * 16384);
                                return endX - startX;
                            })
                            .attr('y', d => yScale(d.avgCoverage))
                            .attr('height', d => mainHeight - yScale(d.avgCoverage));
                    }
                } else {
                    xScale.domain([1, totalLength]);
                    yScale.domain([0, 2 * average]);

                    // Remove existing bars
                    main.selectAll('.bar').remove();
                    // Update main bars
                    main.selectAll('.bar')
                        .data(aggregatedData)
                        .enter().append('rect')
                        .attr('class', 'bar')
                        .attr('x', d => xScale(d.binStart))
                        .attr('y', d => yScale(d.avgCoverage))
                        .attr('width', barWidth)
                        .attr('height', d => mainHeight - yScale(d.avgCoverage));
                }
            }
        }
        
        // Draw the chart
        drawChart(svg);
        // Create circle button for reset chromosomes and redraw the chart
        drawCircleButton(svg);
    }



    function zoomToChromosome(chromosome) {
        const selectedChromosomeData = data[indexMap[chromosome]];
        const chromosomeLength = bamHeader[indexMap[chromosome]].length;
        const meanCoverage = d3.mean(selectedChromosomeData, d => d.avgCoverage);
        xScale.domain([1, chromosomeLength]);
        yScale.domain([0, 2 * meanCoverage]);
        xNavScale.domain([1, chromosomeLength]);

        // Clear existing bars and brush
        main.selectAll('.bar').remove();
        nav.selectAll('.bar').remove();
        nav.selectAll('.brush').remove();
        svg.selectAll('.chromosome-button-small').remove();
        svg.selectAll('.chromosome-label').remove();
        svg.selectAll('.chromosome-button-big').remove();

        // Re-draw the chromosome button for the selected chromosome
        const chromosomes = svg.selectAll('.chromosome-button-big')
            .data([bamHeader[indexMap[chromosome]]])
            .enter().append('g')
            .attr('class', 'chromosome-button-big')
            .attr('transform', `translate(${margin2.left}, ${margin2.top})`);

        chromosomes.append('rect')
            .attr('width', innerWidth)
            .attr('height', 20)
            .attr('y', 0)
            .attr('fill', color(indexMap[chromosome]))

        chromosomes.append('text')
            .attr('class', 'label')
            .attr('x', innerWidth / 2)
            .attr('y', 10)
            .attr('dy', '.35em')
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .attr('font-size', '10px')
            .text(d => d.sn);

        const barWidth = 1; // Fixed bar width in pixels
        const numBins = innerWidth; // Number of bins based on inner width
        const chromStart = 1;
        const chromEnd = chromosomeLength;

        // Aggregate data into bins
        const aggregatedData = aggreateDataIntoBins(selectedChromosomeData, chromStart, chromEnd, numBins, null);

        // Update the bars for the selected chromosome in the main and navigation charts
        main.selectAll('.bar')
            .data(aggregatedData)
            .enter().append('rect')
            .attr('class', 'bar')
            .attr('x', d => xScale(d.binStart))
            .attr('y', d => yScale(d.avgCoverage))
            .attr('width', barWidth)
            .attr('height', d => mainHeight - yScale(d.avgCoverage));

        nav.selectAll('.bar')
            .data(aggregatedData)
            .enter().append('rect')
            .attr('class', 'bar')
            .attr('x', d => xScale(d.binStart))
            .attr('y', d => yNavScale(d.avgCoverage))
            .attr('width', barWidth)
            .attr('height', d => navHeight - yNavScale(d.avgCoverage));

        // Create a text label for showing the chromosome name and selected region and put it in the botton of the main chart
        svg.append('text')
            .attr('class', 'chromosome-label')
            .attr('x', xScale(chromosomeLength) / 2)
            .attr('y', margin.top + mainHeight + 10)
            .attr('dy', '.35em')
            .attr('text-anchor', 'start')
            .attr('fill', 'black')
            .text(`${bamHeader[indexMap[chromosome]].sn}:1-${chromosomeLength} (${chromosomeLength} bp)`)
            .style('font-size', '12px');

        // Define new brush based on new domain
        const brush = d3.brushX()
            .extent([[0, 0], [innerWidth, navHeight]])
            .on('brush end', brushedRegion);
    
        // Attach the new brush to the navigation chart
        nav.append('g')
            .attr('class', 'brush')
            .call(brush);

            // Update the input fields
            const regionsInput = {
                rname: bamHeader[indexMap[chromosome]].sn,
                start: 1,
                end: chromosomeLength
            };
            dispatchCustomEvent('brushed-region-change', regionsInput);

        function brushedRegion(event) {
            if (event.selection) {
                const [x0, x1] = event.selection.map(xNavScale.invert);
                xScale.domain([x0, x1]);

                const brushedData = selectedChromosomeData.filter(d => d.offset >= x0 && d.offset + 16384 <= x1);

                // Handle the case where there is no data in the brushed area
                if (brushedData.length === 0) {
                    return;
                }

                const aggreatedData = aggreateDataIntoBins(brushedData, x0, x1, numBins, null);

                // remove existing bars
                main.selectAll('.bar').remove();

                // Update main chart bars for the brushed area more than the number of bins
                if (brushedData.length > numBins) {
                    main.selectAll('.bar')
                        .data(aggreatedData)
                        .enter().append('rect')
                        .attr('class', 'bar')
                        .attr('x', d => xScale(d.binStart))
                        .attr('y', d => yScale(d.avgCoverage))
                        .attr('width', barWidth)
                        .attr('height', d => mainHeight - yScale(d.avgCoverage));

                } else {
                    // Update main chart bars for the brushed area less than the number of bins
                    main.selectAll('.bar')
                        .data(brushedData)
                        .enter().append('rect')
                        .attr('class', 'bar')
                        .attr('x', d => xScale(d.offset))
                        .attr('y', d => yScale(d.avgCoverage))
                        .attr('width', d => {
                            const endX = xScale(d.offset + 16384);
                            const startX = xScale(d.offset);
                            return endX - startX;
                        })
                        .attr('height', d => mainHeight - yScale(d.avgCoverage));
                }

                // Update the chromosome label to show the selected region
                svg.selectAll('.chromosome-label')
                    .text(`${bamHeader[indexMap[chromosome]].sn}:${Math.round(x0)}-${Math.round(x1)} (${Math.round(x1 - x0)} bp)`);

                // Update the input fields
                const regionsInput = {
                    rname: bamHeader[indexMap[chromosome]].sn,
                    start: Math.round(x0),
                    end: Math.round(x1)
                };
                dispatchCustomEvent('brushed-region-change', regionsInput);
            } else {
                // If there is no selection, reset the scales and update the chart
                xScale.domain([1, chromosomeLength]);

                // Remove existing bars
                main.selectAll('.bar').remove();

                // Update the bars
                main.selectAll('.bar')
                    .data(aggregatedData)
                    .enter().append('rect')
                    .attr('class', 'bar')
                    .attr('x', d => xScale(d.binStart))
                    .attr('y', d => yScale(d.avgCoverage))
                    .attr('width', barWidth)
                    .attr('height', d => mainHeight - yScale(d.avgCoverage));

                // Reset the chromosome label to show the full chromosome region
                svg.selectAll('.chromosome-label')
                    .text(`${bamHeader[indexMap[chromosome]].sn}:1-${chromosomeLength} (${chromosomeLength} bp)`);

                // Reset the input fields
                const regionsInput = {
                    rname: bamHeader[indexMap[chromosome]].sn,
                    start: 1,
                    end: chromosomeLength
                };
                dispatchCustomEvent('brushed-region-change', regionsInput);
            }
        }
    }


    // Zoom to a specific region of a chromosome to update the chart
    function brushToRegion(data, chromosome, start, end, geneName) {
        const originStart = start;
        const originEnd = end;
        
        let chromosomeIndex;
        // Reference format in geneinfo is "chr1", but it's "chr1" or "1" in bamHeader, so make them align with each other.
        if (indexMap[chromosome] !== undefined && indexMap[chromosome] !== null) {
            chromosomeIndex = indexMap[chromosome];
        } else {
            chromosomeIndex = indexMap[chromosome.replace('chr', '')];
        }

        const selectedChromosomeData = data[chromosomeIndex];
        const chromosomeLength = bamHeader[chromosomeIndex].length;
        const meanCoverage = d3.mean(selectedChromosomeData, d => d.avgCoverage);
        xScale.domain([1, chromosomeLength]);
        yScale.domain([0, 2 * meanCoverage]);
        xNavScale.domain([1, chromosomeLength]);

        if (geneName != null){
            drawGeneRegion(xScale, margin, svg, originStart, originEnd, geneName, chromosome)
        }
        if (geneName == null){
            svg.selectAll(".gene-region-highlight, .gene-region-label").remove();
        }

        // Calculate the center of the selected region and adjust to ensure a minimum range of 500,000 bp
        let center = (start + end) / 2;
        let range = end - start;
        let minRange = 500000;
        if (range < minRange) {
            start = center - minRange / 2;
            end = center + minRange / 2;
        }

        // Ensure the new start and end are within the chromosome boundaries
        if (start < 0) {
            start = 1;
            end = Math.min(minRange, chromosomeLength);
        }
        if (end > chromosomeLength) {
            end = chromosomeLength;
            start = Math.max(0, chromosomeLength - minRange);
        }

        // Clear existing bars and brush
        main.selectAll('.bar').remove();
        nav.selectAll('.bar').remove();
        nav.selectAll('.brush').remove();
        svg.selectAll('.chromosome-button-small').remove();
        svg.selectAll('.chromosome-label').remove();
        svg.selectAll('.chromosome-button-big').remove();

        // Re-draw the chromosome button for the selected chromosome
        const chromosomes = svg.selectAll('.chromosome-button-big')
            .data([bamHeader[chromosomeIndex]])
            .enter().append('g')
            .attr('class', 'chromosome-button-big')
            .attr('transform', `translate(${margin2.left}, ${margin2.top})`);

        chromosomes.append('rect')
            .attr('width', innerWidth)
            .attr('height', 20)
            .attr('y', 0)
            .attr('fill', color(chromosomeIndex));

        chromosomes.append('text')
            .attr('class', 'label')
            .attr('x', innerWidth / 2)
            .attr('y', 10)
            .attr('dy', '.35em')
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .attr('font-size', '10px')
            .text(d => d.sn);

        const barWidth = 1; // Fixed bar width with 1 pixel
        const numBins = innerWidth; // Number of bins based on inner width
        const chromStart = 1;
        const chromEnd = chromosomeLength;

        // Aggregate data into bins
        const aggregatedData = aggreateDataIntoBins(selectedChromosomeData, chromStart, chromEnd, numBins, null);

        // Update the bars for the selected chromosome in the main and navigation charts
        main.selectAll('.bar')
            .data(aggregatedData)
            .enter().append('rect')
            .attr('class', 'bar')
            .attr('x', d => xScale(d.binStart))
            .attr('y', d => yScale(d.avgCoverage))
            .attr('width', barWidth)
            .attr('height', d => mainHeight - yScale(d.avgCoverage));

        nav.selectAll('.bar')
            .data(aggregatedData)
            .enter().append('rect')
            .attr('class', 'bar')
            .attr('x', d => xScale(d.binStart))
            .attr('y', d => yNavScale(d.avgCoverage))
            .attr('width', barWidth)
            .attr('height', d => navHeight - yNavScale(d.avgCoverage));

        // Create a text label for showing the chromosome name and selected region and put it in the botton of the main chart
        svg.append('text')
            .attr('class', 'chromosome-label')
            .attr('x', xScale(chromosomeLength) / 2)
            .attr('y', margin.top + mainHeight + 10)
            .attr('dy', '.35em')
            .attr('text-anchor', 'start')
            .attr('fill', 'black')
            .text(`${bamHeader[chromosomeIndex].sn}:1-${chromosomeLength} (${chromosomeLength} bp)`)
            .style('font-size', '12px');

        // Define new brush based on new domain and set default position
        const brush = d3.brushX()
            .extent([[0, 0], [innerWidth, navHeight]])
            .on('brush end', brushedChromosome);

        // Attach the new brush to the navigation chart and set initial selection
        const brushGroup = nav.append('g')
            .attr('class', 'brush')
            .call(brush);
        
        // Set default selection for the brush
        brushGroup.call(brush.move, [xScale(start), xScale(end)]);

        // This function updates the visualization based on the brush selection
        function brushedChromosome(event) {
            if (event.selection) {
                const [x0, x1] = event.selection.map(xNavScale.invert);
                xScale.domain([x0, x1]);
                
                const brushedData = selectedChromosomeData.filter(d => d.offset >= x0 && d.offset <= x1);

                // Handle the case where there is no data in the brushed area
                if (brushedData.length === 0) {
                    return;
                }

                if (geneName != null) {
                    drawGeneRegion(xScale, margin, svg, originStart, originEnd, geneName, chromosome);
                }
                if (geneName == null){
                    svg.selectAll(".gene-region-highlight, .gene-region-label").remove();
                }

                const aggreatedData = aggreateDataIntoBins(brushedData, x0, x1, numBins, null);

                // remove existing bars
                main.selectAll('.bar').remove();

                // Update main chart bars for the brushed area more than the number of bins
                if (brushedData.length > numBins) {
                    main.selectAll('.bar')
                        .data(aggreatedData)
                        .enter().append('rect')
                        .attr('class', 'bar')
                        .attr('x', d => xScale(d.binStart))
                        .attr('y', d => yScale(d.avgCoverage))
                        .attr('width', barWidth)
                        .attr('height', d => mainHeight - yScale(d.avgCoverage));
                } else {
                    // Update main chart bars for the brushed area less than the number of bins
                    main.selectAll('.bar')
                        .data(brushedData)
                        .enter().append('rect')
                        .attr('class', 'bar')
                        .attr('x', d => xScale(d.offset))
                        .attr('y', d => yScale(d.avgCoverage))
                        .attr('width', d => {
                            const endX = xScale(d.offset + 16384);
                            const startX = xScale(d.offset);
                            return endX - startX;
                        })
                        .attr('height', d => mainHeight - yScale(d.avgCoverage));
                }

                // Update the chromosome label to show the selected region
                svg.selectAll('.chromosome-label')
                    .text(`${bamHeader[chromosomeIndex].sn}:${Math.round(x0)}-${Math.round(x1)} (${Math.round(x1 - x0)} bp)`);

                // Update the input fields
                const regionsInput = {
                    rname:  bamHeader[chromosomeIndex].sn,
                    start: Math.round(x0),
                    end: Math.round(x1)
                };
                dispatchCustomEvent('brushed-region-change', regionsInput);
            } else {
                // Reset to default selection if no brush is present
                xScale.domain([1, chromosomeLength]);

                if (geneName != null) {
                    drawGeneRegion(xScale, margin, svg, originStart, originEnd, geneName, chromosome);
                }

                // Remove existing bars
                main.selectAll('.bar').remove();

                // Update the bars
                main.selectAll('.bar')
                    .data(aggregatedData)
                    .enter().append('rect')
                    .attr('class', 'bar')
                    .attr('x', d => xScale(d.binStart))
                    .attr('y', d => yScale(d.avgCoverage))
                    .attr('width', barWidth)
                    .attr('height', d => mainHeight - yScale(d.avgCoverage));

                // Reset the chromosome label to show the full chromosome region
                svg.selectAll('.chromosome-label')
                    .text(`${bamHeader[chromosomeIndex].sn}:1-${chromosomeLength} (${chromosomeLength} bp)`);

                // Reset the input fields
                const regionsInput = {
                    rname: bamHeader[chromosomeIndex].sn,
                    start: 1,
                    end: chromosomeLength
                };
                dispatchCustomEvent('brushed-region-change', regionsInput);
            }
        }
    }
    

    function drawGeneRegion(xScale, margin, svg, start, end, geneName, chromosome) {
        const yPos = margin.top - 10;
        const rectHeight = 5;
        svg.selectAll(".gene-region-highlight, .gene-region-label").remove();

        // Append tooltip div to the body if it doesn't already exist
        let tooltip = d3.select("body").select(".tooltip");
        if (tooltip.empty()) {
            tooltip = d3.select("body")
                        .append("div")
                        .attr("class", "tooltip")
                        .style("position", "absolute")
                        .style("visibility", "hidden")
                        .style("padding", "10px")
                        .style("background", "white")
                        .style("border", "1px solid #ccc")
                        .style("border-radius", "5px")
                        .style('pointer-events', 'none');
        }

        // Draw the rectangle for the gene region
        svg.append("rect")
            .attr("class", "gene-region-highlight")
            .attr("x", xScale(start) + margin.left)
            .attr("y", yPos)
            .attr("width", xScale(end) - xScale(start))
            .attr("height", rectHeight)
            .attr("fill", "red")
            .attr("opacity", 0.5)
            .style('cursor', 'pointer')      
            .on("mouseover", function(event) {
                tooltip.html(`<strong>${geneName}</strong><hr style="border: 0; height: 1px; background-color: #333; margin: 5px 0;">
                    <table style="margin-top: 5px;">
                        <tr><td>Chr:</td><td style="padding-left: 10px;">${chromosome}</td></tr>
                        <tr><td>Start:</td><td style="padding-left: 10px;">${start}</td></tr>
                        <tr><td>End:</td><td style="padding-left: 10px;">${end}</td></tr>
                    </table>`)
                    .style("visibility", "visible")
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            
            .on("mouseout", function() {
                tooltip.style("visibility", "hidden");
            });

            // Add a label for the gene
            svg.append("text")
            .attr("class", "gene-region-label")
            .attr("x", xScale(start) + (xScale(end) - xScale(start)) / 2 + margin.left)
            .attr("y", yPos - rectHeight)
            .attr("dy", ".35em")
            .attr("text-anchor", "middle")
            .attr("fill", "black")
            .text(geneName)
            .attr('font-size', '8px');
    }

    function aggreateDataIntoBins(data, start, end, numBins, getChromosomeStart) {
        const brushedRange = end - start + 1;
        const aggregationfactor =  brushedRange / numBins;
        return new Array(numBins).fill(0).map((_, i) => {
            const binStart = start + i * aggregationfactor;
            const binEnd = binStart + aggregationfactor;
            const binData = data.filter(d => {
                const position = getChromosomeStart ? getChromosomeStart(d.group) + d.offset : d.offset;
                return position >= binStart && position <= binEnd;
            });
            const avgCoverage = d3.mean(binData, d => d.avgCoverage) || 0;
            return {
                binStart: binStart,
                avgCoverage: avgCoverage
            };
        });
    }


    // Dispatch custom event from the shadow DOM element, set to bubble up and be composed to cross shadow DOM boundaries
    function dispatchCustomEvent(eventName, detail) {
        const customEvent = new CustomEvent(eventName, {
            detail: detail,
            bubbles: true,
            composed: true
        });
        const shadowRoot = document.querySelector('iobio-coverage-depth').shadowRoot;
        shadowRoot.dispatchEvent(customEvent);
    }

    createBamViewInner(bamHeader, data, element)
    return {brushToRegion, zoomToChromosome}
}


export {createBamView}


