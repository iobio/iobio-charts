import * as d3 from "d3";

class MultiSeriesChart {
    constructor(parent) {
        this.parentElement = parent;
        this.svg = null;

        this.width = 0;
        this.height = 0;
        this.margin = { top: 5, right: 5, bottom: 5, left: 0 };

        this.yMin = null;
        this.yMean = null;
        this.yMax = null;

        this.xScale = null;
        this.yScale = null;

        this.seriesTitles = [];
        this.seriesSections = [];
        this.seriesValues = [];
        this.accumulatedSections = [];

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
    }

    _initScale(bins) {
        this.accumulatedSections = this._createAccumulatedMap(this.seriesSections); //Accumulate based just on the order provided
        const totalLength = d3.sum(this.seriesSections, (d) => d.length);

        this.xScale = d3
            .scaleLinear()
            .domain([0, totalLength])
            .range([this.margin.left, this.width - this.margin.right]);

        this.yMin = d3.min(bins, (d) => d.avgCoverage);
        this.yMean = d3.mean(bins, (d) => d.avgCoverage);
        this.yMax = mean * 5; //Five times the mean, arbitrary but reasonable

        this.yScale = d3
            .scaleLinear()
            .domain([this.yMin, this.yMax])
            .range([this.height - this.margin.bottom, this.margin.top]);
    }

    _recheckYScale(bins) {
        const newYMin = d3.min(bins, (d) => d.avgCoverage);
        const newYMax = d3.max(bins, (d) => d.avgCoverage);

        if (newYMin < this.yMin || newYMax > this.yMax) {
            this.yMin = newYMin;
            this.yMax = newYMax;

            this.yScale.domain([this.yMin, this.yMax]);

            this.svg.selectAll("path").remove(); // Remove old paths
            this.addSeries(this.seriesValues, this.seriesSections, this.seriesTitles); // Redraw the series with the new yScale
        }
    }

    /**
     *     METHODS: PUBLIC
     */

    addSeries(values, sections, title = "") {
        let allBins = [];
        Object.entries(values).forEach(([i, bins]) => {
            let chr = this.accumulatedSections[sections[i].sn];
            let newBins = bins.map((bin) => {
                bin.start = chr.start + bin.offset;
                return bin;
            });
            allBins = allBins.concat(newBins);
        });

        if (!this.xScale || !this.yScale) {
            this._initScale(allBins);
        } else {
            this._recheckYScale(allBins);
        }

        allBins.forEach((d) => {
            const xPos = this.xScale(d.start);
            const yPos = this.yScale(d.avgCoverage);
            let strokeColor = "gray";
            let opacity = 1;

            if (d.avgCoverage < this.yMean - 0.5 * this.yMean || d.avgCoverage > this.yMean + 0.5 * this.yMean) {
                this.svg
                    .append("path")
                    .attr("d", `M${xPos},${yPos}h0`)
                    .attr("stroke", strokeColor)
                    .attr("stroke-opacity", opacity)
                    .attr("stroke-width", 2)
                    .attr("fill", "none")
                    .attr("stroke-linejoin", "round")
                    .attr("stroke-linecap", "round");
            }
        });
    }

    rescale() {
        // TODO: Rescale the chart functionality
    }

    /**
     *      HELPER FUNCTIONS: INTERNAL
     */

    _createAccumulatedMap(header) {
        //Segments Not Headers
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
            acc[h.sn].position = i;

            total += h.length;
            i++;
            return acc;
        }, {});

        return accumulatedMap;
    }
}

export { MultiSeriesChart };
