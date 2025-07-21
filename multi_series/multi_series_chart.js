import * as d3 from "d3";

class MultiSeriesChart {
    constructor(parent) {
        this.parentElement = parent;
        this.svg = null;

        this.width = 0;
        this.height = 0;
        this.margin = { top: 5, right: 10, bottom: 5, left: 10 };

        this.yMin = null;
        this.yMean = null;
        this.yMax = null;

        this.xScale = null;
        this.yScale = null;
        this.region = null;
        this.totalSize = null; // Total size of the genome or region

        this.seriesTitles = [];
        this.seriesSegments = [];
        /**
         * An array of objects with the following properties:
         * - title: The title of the series
         * - bins: The bins of the series
         * - mean: The mean of the series bins
         * - sd: The standard deviation of the series bins
         * - min: The minimum value of the series bins
         * - max: The maximum value of the series bins
         */
        this.series = [];
        this.accumulatedSegments = [];

        this._init(parent);
    }

    /**
     *      METHODS: PRIVATE
     */

    _init(parent) {
        //Remove the multiBam chart if it exists in this parent
        const existingChart = parent.querySelector(".multi-series-chart");

        if (existingChart) {
            existingChart.remove();
        }

        this.width = parent.clientWidth;
        this.height = parent.clientHeight;

        // SVG
        this.svg = d3
            .create("svg")
            .attr("width", this.width)
            .attr("height", this.height)
            .attr("viewBox", [0, 0, this.width, this.height])
            .attr("class", "multi-series-chart");

        // Append the SVG to the parent element
        parent.appendChild(this.svg.node());
    }

    _initScale(bins) {
        this.totalSize = d3.sum(this.seriesSegments[0], (d) => d.length);

        // The range is an object with the start and end; to start at 0 and end at the total length
        if (!this.region) {
            // If no region is set, we set it to the full range
            this.region = { start: 0, end: this.totalSize };
        }

        this.xScale = d3
            .scaleLinear()
            .domain([this.region.start, this.region.end])
            .range([this.margin.left, this.width - this.margin.right]);

        this.yMin = 0; //We will set this to 0

        this.yMean = d3.mean(bins, (d) => {
            if (d.start < this.region.start || d.start > this.region.end) {
                return;
            }
            return d.avgCoverage;
        });
        this.yMax = this.yMean * 3; //Three times the mean, arbitrary but reasonable

        this.yScale = d3
            .scaleLinear()
            .domain([this.yMin, this.yMax])
            .range([this.height - this.margin.bottom, this.margin.top]);
    }

    _updateYOnNew(bins) {
        const validBins = bins.filter(
            (d) => d.start >= this.region.start && d.start <= this.region.end && !isNaN(d.avgCoverage) && isFinite(d.avgCoverage),
        );

        if (validBins.length === 0) {
            return false;
        }

        const newYMax = d3.max(validBins, (d) => d.avgCoverage);

        if (newYMax > this.yMax) {
            this.yMean = d3.mean(validBins, (d) => d.avgCoverage);
            this.yMax = Math.min(newYMax, this.yMean * 3);
            this.yScale.domain([this.yMin, this.yMax]); // Update the yScale domain

            this.svg.selectAll("path").remove(); // Remove old paths
            this._redrawSeries(this.series); // Redraw the series with the new yScale
            return true;
        }
        return false;
    }

    _updateYOnRegion() {
        // So for series in this.series we will pull their bins
        const allBins = this.series.flatMap((series) => series.bins);
        // Filter bins based on the current region and validate data
        const filteredBins = allBins.filter(
            (d) => d.start >= this.region.start && d.start <= this.region.end && !isNaN(d.avgCoverage) && isFinite(d.avgCoverage),
        );

        if (filteredBins.length === 0) {
            return;
        }

        this.yMean = d3.mean(filteredBins, (d) => d.avgCoverage);
        // If we get some very weird values, we can set just a maximum we should not exceed
        this.yMax = Math.min(
            d3.max(filteredBins, (d) => d.avgCoverage),
            this.yMean * 3,
        );

        this.yScale.domain([this.yMin, this.yMax]);
    }

    _redrawSeries(seriesValues) {
        //Lets just make sure that we rescale x to match the current region
        this.xScale.domain([this.region.start, this.region.end]);
        this.xScale.range([this.margin.left, this.width - this.margin.right]);

        // Clear existing paths
        this.svg.selectAll("path").remove();

        // Redraw each series
        seriesValues.forEach((series, index) => {
            const allBins = series.bins;
            const dotPath = allBins
                .map((d) => {
                    //If the d.start is outside of our region, skip it
                    if (d.start < this.region.start || d.start > this.region.end) {
                        return "";
                    }
                    // Otherwise, create the path for the dot
                    const x = this.xScale(d.start);
                    const y = this.yScale(d.avgCoverage);
                    return `M${x},${y}h0`;
                })
                .join(" ");

            this.svg
                .append("path")
                .attr("id", `series-${index}`)
                .attr("d", dotPath)
                .attr("stroke", series.color)
                .attr("stroke-opacity", 0.8)
                .attr("stroke-width", 1.5)
                .attr("fill", "none")
                .attr("stroke-linejoin", "round")
                .attr("stroke-linecap", "round");
        });
        this._drawMovingAverage(seriesValues); // Draw moving average
        this._updateLegend(); // Update the legend
    }

    _drawMovingAverage(seriesValues, windowSize = 10) {
        // Remove existing moving average paths
        this.svg.selectAll("path[id^='moving-average-']").remove();
        // Calculate moving averages for each series
        seriesValues.forEach((series, index) => {
            // Only include bins within the region
            const bins = series.bins.filter((d) => d.start >= this.region.start && d.start <= this.region.end);

            const movingAverages = [];

            for (let i = 0; i < bins.length; i++) {
                const start = Math.max(0, i - windowSize + 1);
                const end = i + 1;
                const windowBins = bins.slice(start, end);
                const avgCoverage = d3.mean(windowBins, (d) => d.avgCoverage);
                movingAverages.push({ start: bins[i].start, avgCoverage: avgCoverage });
            }

            // Draw the moving average as a line
            const line = d3
                .line()
                .x((d) => this.xScale(d.start))
                .y((d) => this.yScale(d.avgCoverage))
                .curve(d3.curveMonotoneX);

            this.svg
                .append("path")
                .attr("id", `moving-average-${index}`)
                .attr("d", line(movingAverages))
                .attr("stroke", series.color)
                .attr("stroke-opacity", function () {
                    if (series && series.color === "black") {
                        return 1;
                    }
                    return 0.7;
                })
                .attr("stroke-width", 1)
                .attr("fill", "none")
                .attr("stroke-linejoin", "round")
                .attr("stroke-linecap", "round");
        });
    }

    _addLegend() {
        // If the legend already exists, remove it
        this.svg.select(".legend").remove();

        // Create a legend for the series
        const legend = this.svg.append("g").attr("class", "legend").attr("transform", `translate(${0}, ${this.margin.top})`);

        //Add a background rectangle for the legend depending on the number of series and length of the longest title
        const longestTitle = this.series.reduce((max, series) => Math.max(max, series.title.length), 0);
        const numTitles = this.series.length;

        legend
            .append("rect")
            .attr("x", -2)
            .attr("y", -2)
            .attr("width", longestTitle * 7 + 19) // 7px per character, plus padding
            .attr("height", numTitles * 15 + 4)
            .attr("fill", "white")
            .attr("fill-opacity", 0.5)
            .attr("rx", 5);
        this.series.forEach((series, index) => {
            legend
                .append("rect")
                .attr("x", -1)
                .attr("y", index * 15)
                .attr("width", 10)
                .attr("height", 10)
                .attr("fill", series.color);
            legend
                .append("text")
                .attr("x", 19)
                .attr("y", index * 15 + 9)
                .text(series.title)
                .attr("font-size", "12px")
                .attr("fill", "black");
        });
    }

    _updateLegend() {
        // If the legend already exists, remove it
        this.svg.select(".legend").remove();
        // Create a legend for the series
        this._addLegend();
    }

    /**
     *     METHODS: PUBLIC
     */

    addSeries(values, segments, title = "") {
        try {
            if (!this.accumulatedSegments || this.accumulatedSegments.length === 0) {
                this.accumulatedSegments = this._createAccumulatedMap(segments);
                this.seriesSegments.push(segments);
            }

            let allBins = [];
            Object.entries(values).forEach(([i, bins]) => {
                let chr = this.accumulatedSegments[segments[i].sn];
                let newBins = bins.map((bin) => {
                    bin.start = chr.start + bin.offset;
                    return bin;
                });
                allBins = allBins.concat(newBins);
            });

            if (!this.xScale || !this.yScale) {
                this._initScale(allBins);
            } else {
                this._updateYOnNew(allBins);
            }

            const titleExists = this.seriesTitles.includes(title);
            let index;
            if (!titleExists) {
                this.seriesTitles.push(title);
                index = this.series.length;
            } else {
                index = this.series.findIndex((series) => series.title === title);
            }

            // Probably need 10 colors for the series
            const colors = ["black", "#F08C29", "#1D4FB1", "#0DD01D", "#6D11D6", "#C70000", "pink", "teal", "brown", "yellow"];
            const color = colors[index] || "gray";

            let newSeries;
            if (titleExists) {
                // Then we need to update the series with the new bins
                this.series[index].bins = allBins;
                this.series[index].color = color;
                this.series[index].mean = d3.mean(allBins, (d) => d.avgCoverage);
                this.series[index].sd = d3.deviation(allBins, (d) => d.avgCoverage);
                this.series[index].min = d3.min(allBins, (d) => d.avgCoverage);
                this.series[index].max = d3.max(allBins, (d) => d.avgCoverage);

                newSeries = this.series[index];
                this._redrawSeries(this.series);
            } else {
                newSeries = {
                    title: title,
                    bins: allBins,
                    mean: d3.mean(allBins, (d) => d.avgCoverage),
                    sd: d3.deviation(allBins, (d) => d.avgCoverage),
                    min: d3.min(allBins, (d) => d.avgCoverage),
                    max: d3.max(allBins, (d) => d.avgCoverage),
                    color: color,
                };

                this.series.push(newSeries);

                const dotPath = allBins
                    .map((d) => {
                        //If the d.start is outside of our region, skip it
                        if (d.start < this.region.start || d.start > this.region.end) {
                            return "";
                        }
                        const x = this.xScale(d.start);
                        const y = this.yScale(d.avgCoverage);
                        return `M${x},${y}h0`;
                    })
                    .join(" ");

                this.svg
                    .append("path")
                    .attr("id", `series-${index}`)
                    .attr("d", dotPath)
                    .attr("stroke", newSeries.color)
                    .attr("stroke-opacity", () => {
                        if (newSeries.color === "black") {
                            return 1;
                        }
                        return 0.8;
                    })
                    .attr("stroke-width", 1.5)
                    .attr("fill", "none")
                    .attr("stroke-linejoin", "round")
                    .attr("stroke-linecap", "round");

                this._drawMovingAverage(this.series);
                this._updateLegend();
            }
        } catch (error) {
            console.error("Error in addSeries:", error);
            throw error;
        }
    }

    rescale(parent) {
        if (!parent) {
            // If no parent is provided, we cannot rescale at this time it will likely fire again
            return;
        }
        // Rescale the chart to fit the parent element
        let newWidth = parent.clientWidth;
        let newHeight = parent.clientHeight;

        if (newWidth !== this.width || newHeight !== this.height) {
            this.width = newWidth;
            this.height = newHeight;

            this.svg.attr("width", this.width).attr("height", this.height).attr("viewBox", [0, 0, this.width, this.height]);

            // Rescale the x and y axes
            this.xScale.range([this.margin.left, this.width - this.margin.right]);
            this.yScale.range([this.height - this.margin.bottom, this.margin.top]);

            // Redraw the series with the new scales
            this._updateYOnRegion();
            this._redrawSeries(this.series);
        }
    }

    updateRegion(newRegion) {
        try {
            this.region = newRegion;

            if (!this.xScale || !this.yScale) {
                return;
            }

            // Update the xScale based on the new region
            this.xScale.domain([this.region.start, this.region.end]);
            this.xScale.range([this.margin.left, this.width - this.margin.right]);

            // Update the yScale based on the new region
            this._updateYOnRegion();

            // Redraw the series (this already removes old paths)
            this._redrawSeries(this.series);
        } catch (error) {
            console.error("Error in updateRegion:", error);
            throw error;
        }
    }

    /**
     *      HELPER FUNCTIONS: INTERNAL
     */

    _createAccumulatedMap(segments) {
        /**
         * Takes in the segments and creates a map of the segments
         */
        let accumulatedMap;

        let total = 0;
        let i = 0;
        accumulatedMap = segments.reduce((acc, s) => {
            acc[s.sn] = s;
            acc[s.sn].start = total;
            acc[s.sn].end = total + s.length;
            acc[s.sn].position = i;

            total += s.length;
            i++;
            return acc;
        }, {});

        return accumulatedMap;
    }
}

export { MultiSeriesChart };
