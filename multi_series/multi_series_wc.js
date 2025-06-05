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
    }

    get brokerId() {
        return this.getAttribute("broker-id");
    }
    set brokerId(_) {
        this.setAttribute("broker-id", _);
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
}

window.customElements.define("iobio-multi-series", MultiSeriesChartComponent);
export { MultiSeriesChartComponent };
