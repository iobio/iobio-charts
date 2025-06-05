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

        this._broker = null;
        this._seriesTitles = [];
        this._seriesSegments = [];
        this._seriesValues = [];

        upgradeProperty(this, "brokerId");
        upgradeProperty(this, "region");
    }

    get brokerId() {
        return this.getAttribute("broker-id");
    }
    set brokerId(_) {
        this.setAttribute("broker-id", _);
    }

    get region() {
        return this.getAttribute("region");
    }
    set region(_) {
        this.setAttribute("region", _);

        if (this.multiSeriesD3Chart) {
            this.multiSeriesD3Chart.updateRange(_);
        }
    }

    // Static getter for observed attributes
    static get observedAttributes() {
        return ["broker-id"];
    }

    initDOMElements() {
        this.multiSeriesContainer = this.shadowRoot.querySelector("#multi-series-container");

        // Initialize the chart no data yet, ensure the container is ready
        // before creating the chart
        requestAnimationFrame(() => {
            this.multiSeriesD3Chart = new MultiSeriesChart(this.multiSeriesContainer, this.seriesTitles);
            this.setupResizeObserver();
        });
    }

    attributeChangedCallback(name, oldVal, newVal) {
        if (name === "broker-id" && newVal) {
            this._setupBroker();
        }
    }

    setupResizeObserver() {
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

    _setupBroker() {
        // Get the data broker assigned to this element
        // Setting the brokerId attribute will automatically set the broker
        this._broker = getDataBroker(this);

        if (this._broker) {
            this._broker.addEventListener("new-series-data", (event) => {
                // The broker is smart in this case the chart is not
                // the data validation is done in the broker
                const { segments, seriesValues, index } = event.detail;

                this._seriesSegments[index] = segments;
                this._seriesValues[index] = seriesValues;

                this.multiSeriesD3Chart.addSeries(this._seriesValues[index], this._seriesSegments[index], this._seriesTitles);
            });
        }
    }
}

window.customElements.define("iobio-multi-series", MultiSeriesChartComponent);
export { MultiSeriesChartComponent };
