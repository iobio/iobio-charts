import * as d3 from 'd3';

function createBamView(bamHeader, data, container, options={}) {
    let xScale, yScale, xNavScale, yNavScale, svg, main, nav, color, brush, brushGroup, yAxis,
        margin, margin2, mainHeight, navHeight, innerWidth, innerHeight;

    // Get the variables by helper function
    const average = calculateMeanCoverage(data);
    const aggregatedDataArray = aggregateData(data, 30);
    const totalLength = d3.sum(bamHeader, d => d.length);
    const indexMap = bamHeader.reduce((acc, ref, index) => {
        acc[ref.sn] = index;
        return acc;
    }, {});

    const opts = options;

    function createSvg(opts) {
        d3.select(container).selectAll("*").remove();

        let width = container.offsetWidth;
        let height = container.offsetHeight;

        // Set margins
        if (opts.margin) {
            margin = {};
            
            // If we have a Y-axis label, an axis, or an average coverage label rendered externally to the left we need space for that
            if (opts.showYLabel || (opts.showYAxis && opts.yAxisPosition && opts.yAxisPosition === 'external') || (opts.averageCovLabelPosition && opts.averageCovLabelPosition === 'left-external')) {
                margin.left = opts.margin.left + 60;
            } else {
                margin.left = opts.margin.left;
            }
            
            // If we render the average coverage label externally to the right we need space for that
            if (opts.averageCovLabelPosition && opts.averageCovLabelPosition === 'right-external') {
                margin.right = opts.margin.right + 30;
            } else {
                margin.right = opts.margin.right;
            }

            // If we have the chromosomes bar we have to have space for the bar and the all button to the top and left
            if (opts.showChromosomes) {
                margin.top = opts.margin.top + 40;
                margin.left = opts.margin.left + 60;
            } else {
                margin.top = opts.margin.top;
            }

            margin.bottom = opts.margin.bottom;
            margin2 = { top: 10, right: margin.right, bottom: margin.bottom, left: margin.left };
        } else {
            margin = { top: 60, right: 20, bottom: 20, left: 60 };
            margin2 = { top: 10, right: 20, bottom: 20, left: 60 };
        }

        innerWidth = width - margin.left - margin.right;
        innerHeight = height - margin.top - margin.bottom;

        if (opts.showZoomableChart) {
            // Split heights for main and navigation charts
            navHeight = 0.2 * innerHeight;
            mainHeight = innerHeight - navHeight - 10;
        } else {
            navHeight = 0;
            mainHeight = innerHeight;
        }

        // Create SVG container
        svg = d3.select(container)
                .append('svg')
                .attr('width', '100%')
                .attr('height', '100%')
                .attr('viewBox', `0 0 ${width} ${height}`);


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
                    drawBarChart(svg);

                    // Redraw the reference buttons
                    drawRefButtons(svg);

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

                    // Dispatch custom event for resetting the brushed region on global view
                    dispatchCustomEvent('global-brushed-region-change', {
                        start: null,
                        end: null
                    });
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


        function drawRefButtons(svg) {
            svg.selectAll('.chromosome-button-small').remove();
            svg.selectAll('.chromosome-label').remove();
            svg.selectAll('.chromosome-button-big').remove();

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
                    zoomToChromomsomeRegion(data, d.sn);
                    
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

        }

        
        function drawBarChart(svg) {
            // Remove existing elements to avoid duplication
            svg.selectAll('.bar').remove();
            svg.selectAll('.brush').remove();
            svg.selectAll('.y-axis').remove();
            svg.selectAll('.y-axis-label').remove();
            svg.selectAll('.gene-region-highlight, .gene-region-label').remove();

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

            if (opts.showYAxisLabel) {
                // Append Y-axis label
                svg.append('text')
                    .attr('class', 'y-axis-label')
                    .attr('transform', `translate(${margin.left - 40}, ${margin.top + mainHeight / 2}) rotate(-90)`)
                    .attr('text-anchor', 'middle')
                    .text('Coverage (rough estimate)')
                    .style('font-size', '12px');
            }

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
            const aggregatedData = aggregateDataIntoBins(aggregatedDataArray, start, end, numBins, getChromosomeStart);

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

            
            // Brush
            brush = d3.brushX()
                        .extent([[0, 0], [innerWidth, navHeight]])
                        .on('brush end', brushed);

            brushGroup = nav.append('g')
                                .attr('class', 'brush')
                                .call(brush);

            function brushed(event) {
                let startIndex;
                let endIndex;
                if (event.selection) {
                    const [x0, x1] = event.selection.map(xNavScale.invert);

                    // Dispatch custom event for the brushed region
                    dispatchCustomEvent('global-brushed-region-change', {
                        start: Math.round(x0),
                        end: Math.round(x1)
                    });

                    startIndex = aggregatedData.findIndex(d => d.binStart >= x0);
                    endIndex = aggregatedData.findIndex(d => d.binStart > x1);
                    if (endIndex === -1) {
                        endIndex = aggregatedData.length - 1;
                    }
                    const brushedData = aggregatedData.slice(startIndex, endIndex + 1);
                    if (brushedData.length === 0) {
                        return;
                    }

                    xScale.domain([x0, x1]);

                    // Get the brushed bin data in navigation chart to update the main chart bars
                    const brushedBinData = aggregatedDataArray.filter(d => {
                        const position = getChromosomeStart(d.group) + d.offset;
                        return position >= x0 && position < x1;
                    });

                    const aggregatedBinData = aggregateDataIntoBins(brushedBinData, x0, x1, numBins, getChromosomeStart);

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
        drawBarChart(svg);

        if (opts.showChromosomes) {
            // Draw reference buttons 
            drawRefButtons(svg);   
            drawCircleButton(svg);         
        }

    }


    function updateBrushedRegion(start, end) {
        brushGroup.call(brush.move, [xScale(start), xScale(end)]);
    };


    /* Draw the y-axis and mean line dynamically based on the stream coverageMean */
    function updateMeanLineAndYaxis (meanCoverage) {
        // Remove existing mean line and y-axis
        svg.selectAll('.mean-line-group').remove();
        svg.selectAll('.y-axis').remove();

        const conversionRatio = average / meanCoverage;

        const yAxis_scale = d3.scaleLinear()
                    .range([mainHeight, 0])
                    .domain([0, 2 * average / conversionRatio]);

        if (opts.yAxisPosition && opts.yAxisPosition === 'internal') {
            // Y-axis
            yAxis = d3.axisRight(yAxis_scale)
                .ticks(Math.floor(mainHeight / 20))
                .tickSize(0)
                .tickFormat(d => `${d}x`);

            // Append Y-axis (done inside of the logic so that we can also add our rectangles)
            svg.append('g')
                .attr('class', 'y-axis')
                .attr('transform', `translate(${margin.left}, ${margin.top})`)
                .call(yAxis);
            
            // Add rectangles for the y-axis
            let ticks = svg.selectAll('.tick')
            
            // Add rectangles for each tick
            ticks.each(function(d, i) {
                const tick = d3.select(this);
                const text = tick.select('text');

                //the rect should just be where the text is
                const rectWidth = text.node().getBBox().width + 10;
                const rectHeight = 10;
                const rectX = parseFloat(text.attr('x')) - rectWidth / 2;

                tick.append('rect')
                    .attr('class', 'tick-rect')
                    .attr('x', `${rectX + 6}`)
                    .attr('y', `-${rectHeight/2}`)
                    .attr('width', rectWidth)
                    .attr('height', rectHeight)
                    .attr('fill', 'white')
                    .attr('opacity', 0.5)
                    .attr('rx', 3);
                
                //Raise the text above the rectangle
                text.raise();
            });

        } else {
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
        }

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

        if (opts.averageCovLabelPosition && (opts.averageCovLabelPosition === 'right-internal' || opts.averageCovLabelPosition === 'left-internal')) {
            meanLineGroup.append('rect')
                .attr('x', function() {
                    if (opts.averageCovLabelPosition === 'left-internal') {
                        return 25 - 2; // 2px offset for the rectangle vs text
                    } else if (opts.averageCovLabelPosition === 'right-internal') {
                        return innerWidth - 32 - 2; // 2px offset for the rectangle vs text
                    }
                })
                .attr('y', yAxis_scale(meanCoverage) - 7.5)
                .attr('width', 25)
                .attr('height', 15)
                .style('fill', 'white')
                .style('opacity', 0.7)
                .attr('rx', 3);

            // label for mean line
            meanLineGroup.append('text')
                .attr('class', 'mean-label')
                .attr('x', function() {
                    if (opts.averageCovLabelPosition === 'left-internal') {
                        return 25;
                    } else if (opts.averageCovLabelPosition === 'right-internal') {
                        return innerWidth - 32;
                    }
                })
                .attr('y', yAxis_scale(meanCoverage))
                .attr('dy', "0.35em") 
                .style('fill', 'red') 
                .text(`${meanCoverage}x`)
                .style('font-size', '12px');    
        } else {
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
        }
    }


    function zoomToChromomsomeRegion(data, chromosome, start = null, end = null, geneName = null) {
        let chromosomeIndex = indexMap[chromosome] !== undefined ? indexMap[chromosome] : indexMap[chromosome.replace('chr', '')];
        const selectedChromosomeData = data[chromosomeIndex];
        const chromosomeLength = bamHeader[chromosomeIndex].length;
        const meanCoverage = d3.mean(selectedChromosomeData, d => d.avgCoverage);

        const originStart = start;
        const originEnd = end;
        if (start && end) {
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
        }
        
        xScale.domain([1, chromosomeLength]);
        yScale.domain([0, 2 * meanCoverage]);
        xNavScale.domain([1, chromosomeLength]);
    
        // Clear existing elements
        main.selectAll('.bar').remove();
        nav.selectAll('.bar, .brush').remove();
        svg.selectAll('.chromosome-button-small, .chromosome-label, .chromosome-button-big').remove();
    
        // Re-draw the chromosome button
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
    
        const barWidth = 1;
        const numBins = innerWidth;
        // Aggregate data into bins
        const aggregatedData = aggregateDataIntoBins(selectedChromosomeData, 1, chromosomeLength, numBins, null);
    
        // Update the bars for the selected chromosome in the main and navigation charts
        updateBars(main, aggregatedData, xScale, yScale, barWidth, mainHeight);
        updateBars(nav, aggregatedData, xScale, yNavScale, barWidth, navHeight);
    
        // Create a text label for showing the chromosome name and selected region
        svg.append('text')
            .attr('class', 'chromosome-label')
            .attr('x', xScale(chromosomeLength) / 2)
            .attr('y', margin.top + mainHeight + 10)
            .attr('dy', '.35em')
            .attr('text-anchor', 'start')
            .attr('fill', 'black')
            .text(`${bamHeader[chromosomeIndex].sn}:1-${chromosomeLength} (${chromosomeLength} bp)`)
            .style('font-size', '12px');

        dispatchCustomEvent('brushed-region-change', {
            rname: bamHeader[chromosomeIndex].sn,
            start: 1,
            end: chromosomeLength
        });

        // Define new brush based on new domain
        const brush = d3.brushX()
            .extent([[0, 0], [innerWidth, navHeight]])
            .on('brush end', brushed);
    
        // Attach the new brush to the navigation chart
        const brushGroup = nav.append('g')
            .attr('class', 'brush')
            .call(brush);
    
        // If start and end are provided, set the brush to that region
        if (start && end) {
            if (start == 1 && end == chromosomeLength) {
                return
            }
            brushGroup.call(brush.move, [xScale(start), xScale(end)]);
        }
    
        // Draw gene region if provided
        if (geneName) {
            drawGeneRegion(xScale, originStart, originEnd, geneName, chromosome);
        } else {
            svg.selectAll(".gene-region-highlight, .gene-region-label").remove();
             // Dispatch custom event for resetting the gene input
             const geneInput = {
                geneName: ''
            };
            dispatchCustomEvent('selected-gene-change', geneInput);
        }
    
        function brushed(event) {
            if (event.selection) {
                const [x0, x1] = event.selection.map(xNavScale.invert);
                xScale.domain([x0, x1]);
                
                const brushedData = selectedChromosomeData.filter(d => d.offset >= x0 && d.offset <= x1);
    
                if (brushedData.length === 0) return;
    
                if (geneName) {
                    drawGeneRegion(xScale, originStart, originEnd, geneName, chromosome);
                } else {
                    svg.selectAll(".gene-region-highlight, .gene-region-label").remove();
                     // Dispatch custom event for resetting the gene input
                     const geneInput = {
                        geneName: ''
                    };
                    dispatchCustomEvent('selected-gene-change', geneInput);
                }
    
                const aggregatedBrushData = aggregateDataIntoBins(brushedData, x0, x1, numBins, null);
    
                main.selectAll('.bar').remove();
                updateBars(main, brushedData.length > numBins ? aggregatedBrushData : brushedData, xScale, yScale, barWidth, mainHeight);
    
                svg.selectAll('.chromosome-label')
                    .text(`${bamHeader[chromosomeIndex].sn}:${Math.round(x0)}-${Math.round(x1)} (${Math.round(x1 - x0)} bp)`);
    
                dispatchCustomEvent('brushed-region-change', {
                    rname: bamHeader[chromosomeIndex].sn,
                    start: Math.round(x0),
                    end: Math.round(x1)
                });
            } else {
                resetView();
            }
        }

    
        function resetView() {
            xScale.domain([1, chromosomeLength]);

            if (geneName) {
                drawGeneRegion(xScale, originStart, originEnd, geneName, chromosome);
            } else {
                svg.selectAll(".gene-region-highlight, .gene-region-label").remove();
                 // Dispatch custom event for resetting the gene input
                 const geneInput = {
                    geneName: ''
                };
                dispatchCustomEvent('selected-gene-change', geneInput);
            }

            main.selectAll('.bar').remove();
            updateBars(main, aggregatedData, xScale, yScale, barWidth, mainHeight);

            svg.selectAll('.chromosome-label')
                .text(`${bamHeader[chromosomeIndex].sn}:1-${chromosomeLength} (${chromosomeLength} bp)`);

            // Reset the inputs
            dispatchCustomEvent('brushed-region-change', {
                rname: bamHeader[chromosomeIndex].sn,
                start: 1,
                end: chromosomeLength
            });
        }
    }

    
    function updateBars(selection, data, xScale, yScale, barWidth, height) {
        selection.selectAll('.bar')
            .data(data)
            .enter().append('rect')
            .attr('class', 'bar')
            .attr('x', d => xScale(d.binStart || d.offset))
            .attr('y', d => yScale(d.avgCoverage))
            .attr('width', d => {
                if (d.binStart) return barWidth;
                const endX = xScale(d.offset + 16384);
                const startX = xScale(d.offset);
                return endX - startX;
            })
            .attr('height', d => height - yScale(d.avgCoverage));
    }
    

    function drawGeneRegion(xScale, start, end, geneName, chromosome) {
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


    function aggregateDataIntoBins(data, start, end, numBins, getChromosomeStart) {
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

    createSvg(opts)

    return { zoomToChromomsomeRegion, updateMeanLineAndYaxis, updateBrushedRegion }
}


export { createBamView }


