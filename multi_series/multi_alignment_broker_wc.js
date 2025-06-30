import { MultiAlignmentBroker } from "./multi_alignment_broker.js";
import { upgradeProperty } from "../common.js";

class MultiAlignmentBrokerElement extends HTMLElement {
    constructor() {
        super();

        upgradeProperty(this, "alignmentUrls");
        upgradeProperty(this, "alignmentTitles");
        upgradeProperty(this, "indexUrls");
        upgradeProperty(this, "server");
        upgradeProperty(this, "region");
    }

    get broker() {
        return this._broker;
    }

    get alignmentTitles() {
        return this.getAttribute("alignment-titles");
    }
    set alignmentTitles(_) {
        this.broker.alignmentTitles = _;
        this.setAttribute("alignment-titles", _);
    }

    get region() {
        return this.getAttribute("region");
    }
    set region(_) {
        this.setAttribute("region", _);
    }

    get apiUrl() {
        return this.getAttribute("api-url");
    }
    set apiUrl(_) {
        this.broker.apiUrl = _;
        this.setAttribute("api-url", _);
    }

    get alignmentUrls() {
        return this.getAttribute("alignment-urls");
    }
    set alignmentUrls(_) {
        this.broker.alignmentUrls = _;
        this.setAttribute("alignment-urls", _);
    }

    get indexUrls() {
        return this.getAttribute("index-urls");
    }
    set indexUrls(_) {
        this.broker.indexUrls = _;
        this.setAttribute("index-urls", _);
    }

    get server() {
        return this.getAttribute("server");
    }
    set server(_) {
        this.setAttribute("server", _);
    }

    static get observedAttributes() {
        return ["region"];
    }

    connectedCallback() {
        const options = {};

        if (this.server) {
            options.server = this.server;
            options.titles = this.alignmentTitles ? this.alignmentTitles : [];
        }

        this._broker = new MultiAlignmentBroker(this.alignmentUrls, options);
        this._broker.component = this;
    }

    attributeChangedCallback(name, oldVal, newVal) {
        if (name === "region" && newVal && newVal !== oldVal) {
            this.broker.region = JSON.parse(newVal);
        }
    }
}

customElements.define("iobio-multi-alignment-broker", MultiAlignmentBrokerElement);

export { MultiAlignmentBrokerElement };
