import { getDataBroker, upgradeProperty } from "../common.js";
import { MultiSeriesChart } from "./multi_series_chart.js";

const template = document.createElement("template");
template.innerHTML = `
<style>
    :host {
        display: block;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
    }
    #loading-container {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        visibility: hidden;
        display: flex;
        justify-content: center;
        align-items: center;
        background-color: rgba(255, 255, 255, 0.6);
    }
    #multi-series-container {
        width: 100%;
        height: 100%;
    }
</style>
    <div id="multi-series-container">
        <div id="loading-container">
            <iobio-loading-indicator label="Gathering data"></iobio-loading-indicator>
        </div>
    </div>
`;

class MultiSeriesChartComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.shadowRoot.appendChild(template.content.cloneNode(true));
        this.initDOMElements();

        this._broker = null;
        this._seriesTitles = [];
        this._seriesSegments = [];
        this._seriesValues = [];

        upgradeProperty(this, "brokerId");
        upgradeProperty(this, "region");
        upgradeProperty(this, "regionMap");
        upgradeProperty(this, "totalSize");
    }

    get brokerId() {
        return this.getAttribute("broker-id");
    }
    set brokerId(_) {
        this.setAttribute("broker-id", _);
    }

    get region() {
        let attr = this.getAttribute("region");
        return attr ? JSON.parse(attr) : {};
    }
    set region(_) {
        this.setAttribute("region", _);
        if (this.multiSeriesD3Chart) {
            let parsedRegion = JSON.parse(_);
            this.multiSeriesD3Chart.updateRegion(parsedRegion);
        }
    }

    get regionMap() {
        let attr = this.getAttribute("region-map");
        return attr ? JSON.parse(attr) : {};
    }
    set regionMap(_) {
        this.setAttribute("region-map", _);
    }

    get totalSize() {
        return this.getAttribute("total-size");
    }
    set totalSize(_) {
        this.setAttribute("total-size", _);

        if (this.multiSeriesD3Chart) {
            this.multiSeriesD3Chart.updateTotalSize(_);
        }
    }

    // Static getter for observed attributes
    static get observedAttributes() {
        return ["broker-id", "region"];
    }

    initDOMElements() {
        this.multiSeriesContainer = this.shadowRoot.querySelector("#multi-series-container");

        // Initialize the chart no data yet, ensure the container is ready
        // before creating the chart
        requestAnimationFrame(() => {
            this.multiSeriesD3Chart = new MultiSeriesChart(this.multiSeriesContainer);
            this.setupResizeObserver();
        });
    }

    attributeChangedCallback(name, oldVal, newVal) {
        if (name === "broker-id" && newVal) {
            this._setupBroker();
        }

        if (name === "region" && newVal && newVal !== oldVal) {
            let oldValSize;
            let newValSize;
            if (oldVal) {
                oldVal = JSON.parse(oldVal);
                oldValSize = oldVal ? oldVal.end - oldVal.start : 0;
            }
            if (newVal) {
                newVal = JSON.parse(newVal);
                newValSize = newVal.end - newVal.start;
            }

            if (newValSize && newValSize < 1000000) {
                this._broker.region = this._formatRegion(newVal);
            } else if (oldValSize && oldValSize <= 1000000 && newValSize && newValSize > 1000000) {
                // We will want to pull all bins from index
                this._broker.region = {};
            }
        }
    }

    setupResizeObserver() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }

        if (!this.multiSeriesContainer) {
            console.warn("MultiSeriesContainer is not defined yet, cannot set up resize observer.");
            return;
        }

        let resizeTimeout;

        const resizeHandler = () => {
            this.multiSeriesD3Chart.rescale(this.multiSeriesContainer);
        };

        // Setting up the resize observer
        this.resizeObserver = new ResizeObserver((entries) => {
            if (resizeTimeout) clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                entries.forEach((entry) => {
                    if (entry.target === this.multiSeriesContainer) {
                        resizeHandler();
                    }
                });
            }, 100);
        });
        this.resizeObserver.observe(this.multiSeriesContainer);
    }

    disconnectedCallback() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
    }

    toggleLoadingIndicator(showSVG) {
        const indicatorContainer = this.shadowRoot.querySelector("#loading-container");
        if (showSVG) {
            indicatorContainer.style.visibility = "visible";
        } else {
            indicatorContainer.style.visibility = "hidden";
        }
    }

    _formatRegion(region) {
        /**
         * This function should only be called on a small one chromosome region
         */
        let formattedRegion = {
            // Return the whole genome if the region is not a small one chromosome region
            start: 1,
            end: this.totalSize,
            startChr: "1",
            endChr: "",
        };

        if (this.regionMap && Object.keys(this.regionMap).length > 0) {
            let startChr;
            let endChr;
            let relativeStart;
            let relativeEnd;

            for (const [key, value] of Object.entries(this.regionMap)) {
                if (region.start >= value.start && region.start <= value.end) {
                    startChr = key;
                    relativeStart = region.start - value.start;

                    if (relativeStart <= 0) {
                        relativeStart = 1;
                    }
                }

                if (region.end >= value.start && region.end <= value.end) {
                    endChr = key;
                    relativeEnd = region.end - value.start;

                    if (relativeEnd <= 0) {
                        relativeEnd = 1;
                    }
                }
            }

            formattedRegion = {
                start: relativeStart,
                end: relativeEnd,
                startChr: startChr,
                endChr: endChr,
            };
        }
        return formattedRegion;
    }

    _setupBroker() {
        // Get the data broker assigned to this element
        // Setting the broker-id allows us to use this method to find the broker and return it
        this._broker = getDataBroker(this);

        if (this._broker) {
            this._broker.addEventListener("start-fetching-series", () => {
                // This is just our loading indicator showing
                this.toggleLoadingIndicator(true);
            });

            this._broker.addEventListener("end-fetching-series", () => {
                // This is just our loading indicator hiding
                this.toggleLoadingIndicator(false);
            });

            this._broker.addEventListener("new-series-data", (event) => {
                // The broker is smart in this case the chart is not
                // the data validation is done in the broker
                const { segments, seriesValues, seriesTitle, index } = event.detail;

                this._seriesSegments[index] = segments;
                this._seriesValues[index] = seriesValues;
                this._seriesTitles[index] = seriesTitle;

                if (this.region) {
                    this.multiSeriesD3Chart.updateRegion(this.region);
                }

                this.multiSeriesD3Chart.addSeries(
                    this._seriesValues[index],
                    this._seriesSegments[index],
                    this._seriesTitles[index],
                );
            });
        }
    }
}

window.customElements.define("iobio-multi-series", MultiSeriesChartComponent);
export { MultiSeriesChartComponent };
