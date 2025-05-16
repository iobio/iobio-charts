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
    #multi-series-container {
        width: 100%;
        height: 100%;
    }
</style>
    <div id="multi-series-container"></div>
`;

class MultiSeriesChartComponent extends HTMLElement {
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

    initDOMElements() {
        this.multiSeriesContainer = this.shadowRoot.querySelector("#multi-series-container");

        // Initialize the chart no data yet
        this.multiSeriesD3Chart = new MultiSeriesChart(this.multiSeriesContainer, this.seriesTitles);
        this.setupResizeObserver();
    }

    async connectedCallback() {
        // Get the data broker assigned to this element
        // Setting the brokerId attribute will automatically set the broker
        this._broker = getDataBroker(this);

        if (this._broker) {
            this._broker.addEventListener("new-series-data", (event) => {
                // The broker is smart in this case the chart is not
                // the data validation is done in the broker
                const { sections, seriesValues, index } = event.detail;

                this.seriesSections[index] = sections;
                this.seriesValues[index] = seriesValues;

                this.multiSeriesD3Chart.addSeries(this.seriesValues[index], this.seriesSections[index], this.seriesTitles[index]);
            });
        }
    }

    setupResizeObserver() {
        let resizeTimeout;

        const resizeHandler = () => {
            this.multiSeriesD3Chart.rescale(); // TODO: Implement a rescale method in the chart
        };

        // Setting up the resize observer
        this.resizeObserver = new ResizeObserver((entries) => {
            if (resizeTimeout) clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                entries.forEach((entry) => {
                    if (entry.target === this.multiSeriesChart) {
                        resizeHandler();
                    }
                });
            }, 100);
        });
        this.resizeObserver.observe(this.multiSeriesChart);
    }

    disconnectedCallback() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
    }
}

window.customElements.define("iobio-multi-series", MultiSeriesChartComponent);
export { MultiSeriesChartComponent };
