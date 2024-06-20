import * as d3 from 'd3';

function createBamView(bamHeader, data, element, bamViewControlsElement) {

    let xScale, yScale, xNavScale, yNavScale, svg, main, nav, color, brush, yAxis, bamHeaderArray, 
        margin, margin2, mainHeight, navHeight, innerWidth, innerHeight;

    function createBamViewInner(bamHeader, data, element, bamViewControlsElement) {
        const meanCoverage = calculateMeanCoverage(data);
        const aggregatedDataArray = aggregateData(data, 30);
        bamHeaderArray = getChromosomeData(data);
        const totalLength = d3.sum(bamHeaderArray, d => d.length);

        const width = element.offsetWidth;
        const height = element.offsetHeight;
        margin = { top: 60, right: 20, bottom: 20, left: 60 };
        margin2 = { top: 20, right: 20, bottom: 20, left: 60 };
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
                        newOffset: chunk[0].offset,  // new offset for the chunk data
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
                    totalCoverage += data[key][i].avgCoverage_16kbp;
                }
                totalLength += data[key].length;
            }
            meanCoverage = totalCoverage / totalLength;
            return meanCoverage;
        }


        // get out the chromosome names and lengths from the bamHeader based on the data
        function getChromosomeData(data) {
            const chromosomeData = {};
            for (const key in data) {
                chromosomeData[key] = bamHeader[key];
            }
            return Object.values(chromosomeData).map(d => ({sn: d.sn, length: +d.length}));;
        }


        // Get the start position of each chromosome in the total length
        function getChromosomeStart(sn) {
            let start = 0;
            for (let i = 0; i < bamHeaderArray.length; i++) {
                if (i == sn) break;
                start += bamHeaderArray[i].length;
            }
            return start;
        }

        // Reset to all chromosomes
        function drawCircleButton(svg) {
            // Remove existing chromosome buttons and charts
            svg.selectAll('.chromosome').remove();
            svg.selectAll('.bar').remove();
            svg.selectAll('.brush').remove();
            svg.selectAll('.mean-line').remove();
            svg.selectAll('.mean-label').remove();
            svg.selectAll('.y-axis').remove();
            svg.selectAll('.y-axis-label').remove();
            svg.selectAll('.chromosome-label').remove();
            svg.selectAll(".region-highlight, .region-label").remove();
            // Create a circle button for reseting to all chromosomes
            svg.append('circle')
                .attr('cx', 30)
                .attr('cy', 30)
                .attr('r', 15)
                .attr('fill', 'steelblue')
                .on('mouseover', function (event, d) {
                    d3.select(this).style('cursor', 'pointer')
                                    .attr('stroke', 'red')
                                    .attr('stroke-width', 1);
                })
                .on('mouseout', function (event, d) {
                    d3.select(this).style('cursor', 'default')
                                    .attr('stroke', 'none');
                })
                .on('click', (event, d) => {
                    // Clear the input fields
                    bamViewControlsElement.querySelector('#bamview-region-chromosome').value = '';
                    bamViewControlsElement.querySelector('#bamview-region-start').value = '';
                    bamViewControlsElement.querySelector('#bamview-region-end').value = '';
                    bamViewControlsElement.querySelector('#gene-name-input').value = '';
                    // Redraw the chart
                    drawChart(svg);
                });

            // Create a text for the reset button
            svg.append('text')
                .attr('x', 30)
                .attr('y', 30)
                .attr('dy', '.35em')
                .attr('text-anchor', 'middle')
                .attr('fill', 'white')
                .text('All')
                .style('font-size', '12px');
        }


        // Draw the bar chart
        function drawChart(svg) {

            // Create circle button for reset
            drawCircleButton(svg);

            // Create button group
            const buttons_xScale = d3.scaleLinear()
                                    .range([0, innerWidth])
                                    .domain([0, totalLength]);

            // Create a color scale
            color = d3.scaleSequential(d3.interpolateRainbow)
                            .domain([0, bamHeaderArray.length - 1]);

            // Create groups for each chromosome
            const chromosomes = svg.selectAll('.chromosome')
                .data(bamHeaderArray)
                .enter().append('g')
                .attr('class', 'chromosome')
                .attr('transform', (d, i) => `translate(${buttons_xScale(d3.sum(bamHeaderArray.slice(0, i), e => e.length)) + margin2.left}, ${margin2.top})`);

            let activeButton = null;
            // Add rectangles for each chromosome
            chromosomes.append('rect')
                .attr('width', d => buttons_xScale(d.length))
                .attr('height', 20)
                .attr('y', 0)
                .attr('fill', (d, i) => color(i))
                .style('stroke-width', 2)
                .on('mouseover', function (event, d) {
                    d3.select(this).style('cursor', 'pointer')
                                    .attr('stroke', 'red');
                })
                .on('mouseout', function (event, d) {
                    if (this !== activeButton) {
                        d3.select(this).style('cursor', 'default')
                                        .attr('stroke', 'none');
                    }
                })
                .on('click', function (event, d) {
                    if (activeButton) {
                        d3.select(activeButton)
                        .attr('stroke', 'none');  // Reset the previous active button
                    }
                    activeButton = this;  // Update the currently active button
                    d3.select(this)
                    .attr('stroke', 'red');
                    zoomToChromosome(d.sn);
                    console.log('clicked', d.sn);
                });

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
                            .domain([0, totalLength]);

            yScale = d3.scaleLinear()
                            .range([mainHeight, 0])
                            .domain([0, 2 * meanCoverage]);

            // Scales for the navigation chart
            xNavScale = d3.scaleLinear()
                                .range([0, innerWidth])
                                .domain([0, totalLength]);

            yNavScale = d3.scaleLinear()
                                .range([navHeight, 0])
                                .domain(yScale.domain());    
            // Y-axis
            yAxis = d3.axisLeft(yScale)
                .ticks(Math.floor(mainHeight / 50))
                .tickSize(0)
                .tickFormat(d => `${d}x`);

            // Append Y-axis
            svg.append('g')
                .attr('class', 'y-axis')
                .attr('transform', `translate(${margin.left}, ${margin.top})`)
                .call(yAxis);       

            // Append Y-axis label
            svg.append('text')
                .attr('class', 'y-axis-label')
                .attr('transform', `translate(${margin.left - 40}, ${margin.top + mainHeight / 2}) rotate(-90)`)
                .attr('text-anchor', 'middle')
                .text('Average Coverage')
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

            // Main bars
            main.selectAll('.bar')
                .data(aggregatedDataArray)
                .enter().append('rect')
                .attr('class', 'bar')
                .attr('x', d => xScale(getChromosomeStart(d.group) + parseInt(d.newOffset)))
                .attr('y', d => yScale(d.avgCoverage))
                .attr('width', d => xScale(d.chunkLength * 16384)) // Width of each bar
                .attr('height', d => mainHeight - yScale(d.avgCoverage))
                .attr('fill', 'steelblue');

            // Navigation bars
            nav.selectAll('.bar')
                .data(aggregatedDataArray)
                .enter().append('rect')
                .attr('class', 'bar')
                .attr('x', (d, i) => xNavScale(getChromosomeStart(d.group) + parseInt(d.newOffset)))
                .attr('y', d => yNavScale(d.avgCoverage))
                .attr('width', d => xScale(d.chunkLength * 16384)) // Width of each bar
                .attr('height', d => navHeight - yNavScale(d.avgCoverage))
                .attr('fill', 'steelblue');

            // Add mean line
            main.append('line')
                .attr('class', 'mean-line')
                .attr('x1', 0)
                .attr('x2', innerWidth)
                .attr('y1', yScale(meanCoverage))
                .attr('y2', yScale(meanCoverage))
                .attr('stroke', 'red')
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', '3,3')
                .attr('z-index', 1000);

            // label for mean line
            svg.append('text')
                .attr('class', 'mean-label')
                .attr('x', margin.left)
                .attr('y', yScale(meanCoverage) + margin.top)
                .attr('dy', "0.35em") 
                .attr('text-anchor', 'end') 
                .style('fill', 'red') 
                .text(`${Math.round(meanCoverage)}x`)
                .style('font-size', '12px');

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
                    startIndex = aggregatedDataArray.findIndex(d => getChromosomeStart(d.group) + parseInt(d.newOffset) >= x0);
                    endIndex = aggregatedDataArray.findIndex(d => getChromosomeStart(d.group) + parseInt(d.newOffset) > x1);

                    if (endIndex === -1) {
                        endIndex = aggregatedDataArray.length - 1;
                    }

                    const brushedData = aggregatedDataArray.slice(startIndex, endIndex + 1);
                    xScale.domain([x0, x1]);
                    const selectedMeanCoverage = d3.mean(brushedData, d => d.avgCoverage);

                    svg.selectAll('line.mean-line')
                        .attr('y1', yScale(selectedMeanCoverage))
                        .attr('y2', yScale(selectedMeanCoverage))
                        .attr('z-index', 1000);

                    svg.selectAll('text.mean-label')
                        .attr('y', yScale(selectedMeanCoverage) + margin.top)
                        .text(`${Math.round(selectedMeanCoverage)}x`);

                    // Update the bars
                    main.selectAll('.bar')
                        .attr('x', d => xScale(getChromosomeStart(d.group) + parseInt(d.newOffset)))
                        .attr('width', innerWidth / brushedData.length) // Width of each bar based on brush selection
                        .attr('y', d => yScale(d.avgCoverage))
                        .attr('height', d => mainHeight - yScale(d.avgCoverage));

                    // Update y-axis
                    svg.select('.y-axis').call(d3.axisLeft(yScale).tickSize(0).ticks(Math.floor(mainHeight / 50)).tickFormat(d => `${d}x`));

                    // Update x-axis
                    svg.select('.x-axis').call(d3.axisBottom(xScale).ticks(endIndex - startIndex));
                } else {
                    xScale.domain([0, totalLength]);
                    yScale.domain([0, 2 * meanCoverage]);
                    startIndex = 0;
                    endIndex = aggregatedDataArray.length - 1;

                    const selectedMeanCoverage = d3.mean(aggregatedDataArray, d => d.avgCoverage);

                    svg.selectAll('line.mean-line')
                        .attr('y1', yScale(selectedMeanCoverage))
                        .attr('y2', yScale(selectedMeanCoverage))
                        .attr('z-index', 1000);

                    svg.selectAll('text.mean-label')
                        .attr('y', yScale(selectedMeanCoverage) + margin.top)
                        .text(`${Math.round(selectedMeanCoverage)}x`);

                    main.selectAll('.bar')
                        .attr('x', d => xScale(getChromosomeStart(d.group) + parseInt(d.newOffset)))
                        .attr('width', innerWidth / aggregatedDataArray.length) // Width of each bar based on total data
                        .attr('y', d => yScale(d.avgCoverage))
                        .attr('height', d => mainHeight - yScale(d.avgCoverage));

                    svg.select('.y-axis').call(d3.axisLeft(yScale).tickSize(0).ticks(Math.floor(mainHeight / 50)).tickFormat(d => `${d}x`));
                }
            }

        
            function zoomToChromosome(chromosome) {
                const selectedChromosomeData = data[chromosome - 1];
                const chromosomeEnd = bamHeaderArray[chromosome - 1].length;
                const meanCoverage = d3.mean(selectedChromosomeData, d => d.avgCoverage_16kbp);
                xScale.domain([0, chromosomeEnd]);
                yScale.domain([0, 2 * meanCoverage]);

                // Clear existing bars and brush
                main.selectAll('.bar').remove();
                nav.selectAll('.bar').remove();
                nav.selectAll('.brush').remove();
                svg.selectAll('.chromosome').remove();
                svg.selectAll('.chromosome-label').remove();

                // Re-draw the chromosome button for the selected chromosome
                const chromosomes = svg.selectAll('.chromosome')
                    .data([bamHeaderArray[chromosome - 1]])
                    .enter().append('g')
                    .attr('class', 'chromosome')
                    .attr('transform', `translate(${margin2.left}, ${margin2.top})`);

                chromosomes.append('rect')
                    .attr('width', innerWidth)
                    .attr('height', 20)
                    .attr('y', 0)
                    .attr('fill', color(chromosome - 1))

                chromosomes.append('text')
                    .attr('class', 'label')
                    .attr('x', innerWidth / 2)
                    .attr('y', 10)
                    .attr('dy', '.35em')
                    .attr('text-anchor', 'middle')
                    .attr('fill', 'white')
                    .attr('font-size', '10px')
                    .text(d => d.sn);

                // Update the bars for the selected chromosome in the main and navigation charts
                main.selectAll('.bar')
                    .data(selectedChromosomeData)
                    .enter().append('rect')
                    .attr('class', 'bar')
                    .attr('x', d => xScale(d.offset))
                    .attr('width', d => xScale(16384))
                    .attr('y', d => yScale(d.avgCoverage_16kbp))
                    .attr('height', d => mainHeight - yScale(d.avgCoverage_16kbp))
                    .attr('fill', 'steelblue');

                nav.selectAll('.bar')
                    .data(selectedChromosomeData)
                    .enter().append('rect')
                    .attr('class', 'bar')
                    .attr('x', d => xScale(d.offset))
                    .attr('width', d => xScale(16384))
                    .attr('y', d => yNavScale(d.avgCoverage_16kbp))
                    .attr('height', d => navHeight - yNavScale(d.avgCoverage_16kbp))
                    .attr('fill', 'steelblue');

                // Create a text label for showing the chromosome name and selected region and put it in the botton of the main chart
                svg.append('text')
                    .attr('class', 'chromosome-label')
                    .attr('x', xScale(chromosomeEnd) / 2)
                    .attr('y', margin.top + mainHeight + 10)
                    .attr('dy', '.35em')
                    .attr('text-anchor', 'start')
                    .attr('fill', 'black')
                    .text(`Chr ${chromosome}: 0 - ${chromosomeEnd} (${chromosomeEnd} bp)`)
                    .style('font-size', '12px');

            // Update mean line and label
                svg.selectAll('line.mean-line')
                    .attr('y1', yScale(meanCoverage))
                    .attr('y2', yScale(meanCoverage));

                svg.selectAll('text.mean-label')
                    .text(`${Math.round(meanCoverage)}x`)
                    .attr('y', yScale(meanCoverage) + margin.top);

                // Update y-axis
                svg.select('.y-axis').call(d3.axisLeft(yScale).tickSize(0).ticks(Math.floor(mainHeight / 50)).tickFormat(d => `${d}x`));

                // Define new brush based on new domain
                const brush = d3.brushX()
                    .extent([[0, 0], [innerWidth, navHeight]])
                    .on('brush end', brushedRegion);
            
                // Attach the new brush to the navigation chart
                nav.append('g')
                    .attr('class', 'brush')
                    .call(brush);

                    // Update the input fields
                    bamViewControlsElement.querySelector('#bamview-region-chromosome').value = "chr" + chromosome;
                    bamViewControlsElement.querySelector('#bamview-region-start').value = 0;
                    bamViewControlsElement.querySelector('#bamview-region-end').value = chromosomeEnd;

                function brushedRegion(event) {
                    let mainXScale = xScale.copy(); // Ensure we have a separate scale for the main chart to modify independently
                
                    if (event.selection) {
                        const [x0, x1] = event.selection.map(xScale.invert);
                        mainXScale.domain([x0, x1]);
                
                        // Update main chart bars
                        main.selectAll('.bar')
                            .attr('x', d => mainXScale(d.offset))
                            .attr('width', d => mainXScale(d.offset + 16384) - mainXScale(d.offset));
                
                        // Update mean coverage based on the brushed area
                        const brushedData = selectedChromosomeData.filter(d => d.offset >= x0 && d.offset + 16384 <= x1);

                        // Handle the case where there is no data in the brushed area
                        if (brushedData.length === 0) {
                            return;
                        }
                        const meanCoverageBrushed = d3.mean(brushedData, d => d.avgCoverage_16kbp);
                        
                        // Update the mean line and label to reflect new mean coverage
                        svg.selectAll('line.mean-line')
                            .attr('y1', yScale(meanCoverageBrushed))
                            .attr('y2', yScale(meanCoverageBrushed));
                        
                        svg.selectAll('text.mean-label')
                            .text(`${Math.round(meanCoverageBrushed)}x`)
                            .attr('y', yScale(meanCoverageBrushed) + margin.top);

                        // Update the chromosome label to show the selected region
                        svg.selectAll('.chromosome-label')
                            .text(`Chr ${chromosome}: ${Math.round(x0)} - ${Math.round(x1)} (${Math.round(x1 - x0)} bp)`);

                        // Update the input fields
                        bamViewControlsElement.querySelector('#bamview-region-chromosome').value = "chr" + chromosome;
                        bamViewControlsElement.querySelector('#bamview-region-start').value = Math.round(x0);
                        bamViewControlsElement.querySelector('#bamview-region-end').value = Math.round(x1);
                    } else {
                        // If there is no selection, reset the scales and update the chart
                        mainXScale.domain([0, bamHeaderArray[chromosome - 1].length]);
                        main.selectAll('.bar')
                            .attr('x', d => mainXScale(d.offset))
                            .attr('width', d => mainXScale(d.offset + 16384) - mainXScale(d.offset));
                
                        // Reset the mean line and label to the overall mean
                        svg.selectAll('line.mean-line')
                            .attr('y1', yScale(meanCoverage))
                            .attr('y2', yScale(meanCoverage));
                        
                        svg.selectAll('text.mean-label')
                            .text(`${Math.round(meanCoverage)}x`)
                            .attr('y', yScale(meanCoverage) + margin.top);

                        // Reset the chromosome label to show the full chromosome region
                        svg.selectAll('.chromosome-label')
                            .text(`Chr ${chromosome}: 0 - ${bamHeaderArray[chromosome - 1].length} (${bamHeaderArray[chromosome - 1].length} bp)`);

                        // Reset the input fields
                        bamViewControlsElement.querySelector('#bamview-region-chromosome').value = "chr" + chromosome;
                        bamViewControlsElement.querySelector('#bamview-region-start').value = 0;
                        bamViewControlsElement.querySelector('#bamview-region-end').value = bamHeaderArray[chromosome - 1].length;
                    }
                }
            }

        }

        drawChart(svg);
    }


    // Zoom to a specific region of a chromosome to update the chart
    function brushToRegion(data, chromosome, start, end, geneName) {
        const selectedChromosomeData = data[chromosome - 1];
        const chromosomeEnd = bamHeaderArray[chromosome - 1].length;
        const meanCoverage = d3.mean(selectedChromosomeData, d => d.avgCoverage_16kbp);
        xScale.domain([0, chromosomeEnd]);
        yScale.domain([0, 2 * meanCoverage]);

        const originStart = start;
        const originEnd = end;


        if (geneName != null){
            console.log('geneName', geneName)
            drawGeneRegion(xScale, margin, svg, originStart, originEnd, geneName, chromosome)
        }
        if (geneName == null){
            svg.selectAll(".region-highlight, .region-label").remove();
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
            start = 0;
            end = Math.min(minRange, chromosomeEnd);
        }
        if (end > chromosomeEnd) {
            end = chromosomeEnd;
            start = Math.max(0, chromosomeEnd - minRange);
        }

        // Clear existing bars and brush
        main.selectAll('.bar').remove();
        nav.selectAll('.bar').remove();
        nav.selectAll('.brush').remove();
        svg.selectAll('.chromosome').remove();
        svg.selectAll('.chromosome-label').remove();

        // Re-draw the chromosome button for the selected chromosome
        const chromosomes = svg.selectAll('.chromosome')
            .data([bamHeaderArray[chromosome - 1]])
            .enter().append('g')
            .attr('class', 'chromosome')
            .attr('transform', `translate(${margin2.left}, ${margin2.top})`);

        chromosomes.append('rect')
            .attr('width', innerWidth)
            .attr('height', 20)
            .attr('y', 0)
            .attr('fill', color(chromosome - 1))

        chromosomes.append('text')
            .attr('class', 'label')
            .attr('x', innerWidth / 2)
            .attr('y', 10)
            .attr('dy', '.35em')
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .attr('font-size', '10px')
            .text(d => d.sn);

        // Update the bars for the selected chromosome in the main and navigation charts
        main.selectAll('.bar')
            .data(selectedChromosomeData)
            .enter().append('rect')
            .attr('class', 'bar')
            .attr('x', d => xScale(d.offset))
            .attr('width', d => xScale(16384))
            .attr('y', d => yScale(d.avgCoverage_16kbp))
            .attr('height', d => mainHeight - yScale(d.avgCoverage_16kbp))
            .attr('fill', 'steelblue');

        nav.selectAll('.bar')
            .data(selectedChromosomeData)
            .enter().append('rect')
            .attr('class', 'bar')
            .attr('x', d => xScale(d.offset))
            .attr('width', d => xScale(16384))
            .attr('y', d => yNavScale(d.avgCoverage_16kbp))
            .attr('height', d => navHeight - yNavScale(d.avgCoverage_16kbp))
            .attr('fill', 'steelblue');

        // Create a text label for showing the chromosome name and selected region and put it in the botton of the main chart
        svg.append('text')
            .attr('class', 'chromosome-label')
            .attr('x', xScale(chromosomeEnd) / 2)
            .attr('y', margin.top + mainHeight + 10)
            .attr('dy', '.35em')
            .attr('text-anchor', 'start')
            .attr('fill', 'black')
            .text(`Chr ${chromosome}: 0 - ${chromosomeEnd} (${chromosomeEnd} bp)`)
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
            let mainXScale = xScale.copy(); // Ensure we have a separate scale for the main chart to modify independently

            if (event.selection) {
                const [x0, x1] = event.selection.map(xScale.invert);
                mainXScale.domain([x0, x1]);

                if (geneName != null) {
                    drawGeneRegion(mainXScale, margin, svg, originStart, originEnd, geneName, chromosome);
                }
                if (geneName == null){
                    svg.selectAll(".region-highlight, .region-label").remove();
                }
            

                // Update main chart bars
                main.selectAll('.bar')
                    .attr('x', d => mainXScale(d.offset))
                    .attr('width', d => mainXScale(d.offset + 16384) - mainXScale(d.offset));

                // Update mean coverage based on the brushed area
                const brushedData = selectedChromosomeData.filter(d => d.offset >= x0 && d.offset + 16384 <= x1);

                // Handle the case where there is no data in the brushed area
                if (brushedData.length === 0) {
                    return;
                }
                const meanCoverageBrushed = d3.mean(brushedData, d => d.avgCoverage_16kbp);

                // Update the mean line and label to reflect new mean coverage
                svg.selectAll('line.mean-line')
                    .attr('y1', yScale(meanCoverageBrushed))
                    .attr('y2', yScale(meanCoverageBrushed));
                
                svg.selectAll('text.mean-label')
                    .text(`${Math.round(meanCoverageBrushed)}x`)
                    .attr('y', yScale(meanCoverageBrushed) + margin.top);

                // Update the chromosome label to show the selected region
                svg.selectAll('.chromosome-label')
                    .text(`Chr ${chromosome}: ${Math.round(x0)} - ${Math.round(x1)} (${Math.round(x1 - x0)} bp)`);

                // Update the input fields
                bamViewControlsElement.querySelector('#bamview-region-chromosome').value = "chr" + chromosome;
                bamViewControlsElement.querySelector('#bamview-region-start').value = Math.round(x0);
                bamViewControlsElement.querySelector('#bamview-region-end').value = Math.round(x1);
            } else {
                // Reset to default selection if no brush is present
                mainXScale.domain([0, bamHeaderArray[chromosome - 1].length]);
                main.selectAll('.bar')
                    .attr('x', d => mainXScale(d.offset))
                    .attr('width', d => mainXScale(d.offset + 16384) - mainXScale(d.offset));

                if (geneName != null) {
                    drawGeneRegion(mainXScale, margin, svg, originStart, originEnd, geneName, chromosome);
                }

                // Reset the mean line and label to the overall mean
                svg.selectAll('line.mean-line')
                    .attr('y1', yScale(meanCoverage))
                    .attr('y2', yScale(meanCoverage));

                svg.selectAll('text.mean-label')
                    .text(`${Math.round(meanCoverage)}x`)
                    .attr('y', yScale(meanCoverage) + margin.top);

                // Reset the chromosome label to show the full chromosome region
                svg.selectAll('.chromosome-label')
                    .text(`Chr ${chromosome}: 0 - ${bamHeaderArray[chromosome - 1].length} (${bamHeaderArray[chromosome - 1].length} bp)`);

                // Reset the input fields
                bamViewControlsElement.querySelector('#bamview-region-chromosome').value = "chr" + chromosome;
                bamViewControlsElement.querySelector('#bamview-region-start').value = 0;
                bamViewControlsElement.querySelector('#bamview-region-end').value = bamHeaderArray[chromosome - 1].length;
            }
        }
    }

    function drawGeneRegion(xScale, margin, svg, start, end, geneName, chromosome) {
        const yPos = margin.top - 10;
        const rectHeight = 5;
        svg.selectAll(".region-highlight, .region-label").remove();

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
            .attr("class", "region-highlight")
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
            .attr("class", "region-label")
            .attr("x", xScale(start) + (xScale(end) - xScale(start)) / 2 + margin.left)
            .attr("y", yPos + rectHeight / 2)
            .attr("dy", ".35em")
            .attr("text-anchor", "middle")
            .attr("fill", "black")
            .text(geneName)
            .attr('font-size', '8px');
    }
    createBamViewInner(bamHeader, data, element, bamViewControlsElement)
    return {brushToRegion}
}


export {createBamView}


