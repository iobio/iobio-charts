import { MultiAlignmentBroker } from "./multi_alignment_broker.js";
import { upgradeProperty } from "../common.js";

class MultiAlignmentBrokerElement extends HTMLElement {
    constructor() {
        super();

        upgradeProperty(this, "alignmentUrls");
        upgradeProperty(this, "indexUrls");
        upgradeProperty(this, "server");
    }

    get broker() {
        return this._broker;
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

    connectedCallback() {
        const options = {};

        if (this.server) {
            options.server = this.server;
        }

        this._broker = new MultiAlignmentBroker(this.alignmentUrls, options);
    }
}

customElements.define("iobio-multi-alignment-broker", MultiAlignmentBrokerElement);

export { MultiAlignmentBrokerElement };
