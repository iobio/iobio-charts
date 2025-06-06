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
        //Accumulate based just on the order provided
        const totalLength = d3.sum(this.seriesSegments[0], (d) => d.length);

        // The range is an object with the start and end; to start at 0 and end at the total length
        this.region = { start: 0, end: totalLength };

        this.xScale = d3
            .scaleLinear()
            .domain([0, totalLength])
            .range([this.margin.left, this.width - this.margin.right]);

        this.yMin = d3.min(bins, (d) => d.avgCoverage);
        this.yMean = d3.mean(bins, (d) => d.avgCoverage);
        this.yMax = this.yMean * 5; //Five times the mean, arbitrary but reasonable

        this.yScale = d3
            .scaleLinear()
            .domain([this.yMin, this.yMax])
            .range([this.height - this.margin.bottom, this.margin.top]);
    }

    _updateYOnNew(bins) {
        const newYMin = d3.min(bins, (d) => d.avgCoverage);
        const newYMax = d3.max(bins, (d) => {
            //If this bin is outside of the region, skip it
            if (d.start < this.region.start || d.start > this.region.end) {
                return this.yMax; // Return current max to avoid skewing the scale
            }
            // Otherwise, return the avgCoverage
            return d.avgCoverage;
        });

        if (newYMin < this.yMin || newYMax > this.yMax) {
            this.yMin = newYMin;
            this.yMean = d3.mean(bins, (d) => d.avgCoverage);
            this.yMax = this.yMax = Math.min(newYMax, this.yMean * 4);
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
        // Filter bins based on the current region
        const filteredBins = allBins.filter((d) => d.start >= this.region.start && d.start <= this.region.end);
        this.yMin = d3.min(filteredBins, (d) => d.avgCoverage);
        this.yMean = d3.mean(filteredBins, (d) => d.avgCoverage);
        // If we get some very weird values, we can set just a maximum we should not exceed
        this.yMax = Math.min(
            d3.max(filteredBins, (d) => d.avgCoverage),
            this.yMean * 4,
        );

        this.yScale = d3
            .scaleLinear()
            .domain([this.yMin, this.yMax])
            .range([this.height - this.margin.bottom, this.margin.top]);
    }

    _redrawSeries(seriesValues) {
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

            this._drawMovingAverage(seriesValues); // Draw moving average with a window size of 5
        });
    }

    _drawMovingAverage(seriesValues, windowSize = 10) {
        // Remove existing moving average paths
        this.svg.selectAll("path[id^='moving-average-']").remove();
        // Calculate moving averages for each series
        seriesValues.forEach((series, index) => {
            const bins = series.bins;
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
                .attr("stroke-opacity", 0.5)
                .attr("stroke-width", 1.5)
                .attr("fill", "none")
                .attr("stroke-linejoin", "round")
                .attr("stroke-linecap", "round");
        });
    }

    /**
     *     METHODS: PUBLIC
     */

    addSeries(values, segments, title = "") {
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

        this.seriesTitles.push(title);
        const index = this.series.length;

        // Probably need 10 colors for the series
        const colors = ["#C70000", "black", "#2D4B87", "orange", "teal", "pink", "green", "purple", "brown", "yellow"];
        const color = colors[index] || "gray";

        let newSeries = {
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
                if (newSeries.color === "#C70000") {
                    return 1;
                }
                return 0.7;
            })
            .attr("stroke-width", 1.5)
            .attr("fill", "none")
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round");
        this._drawMovingAverage(this.series); // Draw moving average with a window size of 5
    }

    rescale(parent) {
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

    updateRange(newRegion) {
        try {
            this.region = JSON.parse(newRegion); // This comes in as a JSON string
        } catch (e) {
            console.error("Invalid region format:", e);
            return;
        }

        // Update the xScale based on the new region
        this.xScale.domain([this.region.start, this.region.end]);
        this.xScale.range([this.margin.left, this.width - this.margin.right]);

        // Redraw the series
        this._redrawSeries(this.series);
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
            acc[s.sn].end = total + length;
            acc[s.sn].position = i;

            total += s.length;
            i++;
            return acc;
        }, {});

        return accumulatedMap;
    }
}

export { MultiSeriesChart };
