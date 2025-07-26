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
        upgradeProperty(this, "regionMap");
        upgradeProperty(this, "totalSize");
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
}

customElements.define("iobio-multi-alignment-broker", MultiAlignmentBrokerElement);

export { MultiAlignmentBrokerElement };
