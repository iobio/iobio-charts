import { getDataBroker, upgradeProperty } from "../common.js";
import { createMultiSeries } from "./multi_series_chart.js";

const template = document.createElement("template");
template.innerHTML = `
<style>
    :host {
        display: block;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
    }
    #multi-series-container {
        width: 100%;
        height: 100%;
    }
</style>
    <div id="multi-series-container"></div>
`;

class MultiSeriesChart extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.shadowRoot.appendChild(template.content.cloneNode(true));
        this.initDOMElements();

        upgradeProperty(this, "seriesTitles");
        upgradeProperty(this, "seriesSections");
        upgradeProperty(this, "seriesValues");
        upgradeProperty(this, "brokerId");
    }

    get seriesTitles() {
        return this.getAttribute("series-titles");
    }
    set seriesTitles(_) {
        this.setAttribute("series-titles", _);
    }

    get seriesSections() {
        return this.getAttribute("series-sections");
    }
    set seriesSections(_) {
        this.setAttribute("series-sections", _);
    }

    get seriesValues() {
        return this.getAttribute("series-values");
    }
    set seriesValues(_) {
        this.setAttribute("series-values", _);
    }

    get brokerId() {
        return this.getAttribute("broker-id");
    }
    set brokerId(_) {
        this.setAttribute("broker-id", _);
    }

                let multiBam = createMultiSeries(this.multiBamChart, this.validBamHeader, this.validBamReadDepth);
                this.multiBamChart.appendChild(multiBam.node());

                this.setupResizeObserver();
            });
        }
    }

    getBamReadDepthByValidRefs(bamHeader, bamReadDepth) {
        let validBamReadDepth = {};
        for (let i = 0; i < bamHeader.length; i++) {
            validBamReadDepth[i] = bamReadDepth[i];
        }
        return validBamReadDepth;
    }

    getValidRefs(header, readDepthData) {
        const refsWithCoverage = Object.keys(readDepthData).filter((key) => {
            return readDepthData[key].length > 1000;
        });

        const validRefs = [];
        for (let i = 0; i < refsWithCoverage.length; i++) {
            validRefs.push(header[i]);
        }

        return validRefs;
    }

    setupResizeObserver() {
        let resizeTimeout;

        const resizeHandler = () => {
            let multiBam = createMultiSeries(this.multiBamChart, this.validBamHeader, this.validBamReadDepth);
            this.multiBamChart.appendChild(multiBam.node());
        };

        // Setting up the resize observer
        this.resizeObserver = new ResizeObserver((entries) => {
            if (resizeTimeout) clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                entries.forEach((entry) => {
                    if (entry.target === this.multiBamChart) {
                        resizeHandler();
                    }
                });
            }, 100);
        });
        this.resizeObserver.observe(this.multiBamChart);
    }

    disconnectedCallback() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
    }
}

window.customElements.define("iobio-multi-series", MultiSeriesChart);
export { MultiSeriesChart };
