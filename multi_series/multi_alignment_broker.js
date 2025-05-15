import { parseReadDepthData, parseBamHeaderData } from "./coverage/src/BamData.js";

class MultiAlignmentBroker extends EventTarget {
    constructor(alignmentUrls, options) {
        super();

        this._server = "https://backend.iobio.io";

        if (options) {
            if (options.server) {
                this._server = options.server;
            }
        }

        this._callbacks = {};
        this._latestUpdates = {};
        this._lastAlignmentUrl = null;

        this.alignmentUrls = alignmentUrls;
    }

    get apiUrl() {
        return this._server;
    }
    set apiUrl(_) {
        this._server = _;
        this._tryUpdate(this._doUpdate.bind(this));
    }

    get alignmentUrls() {
        return this._alignmentUrls;
    }
    set alignmentUrls(_) {
        this._alignmentUrls = _;
        this._tryUpdate(this._doUpdate.bind(this));
    }

    get indexUrls() {
        return this._indexUrls;
    }
    set indexUrls(_) {
        this._indexUrls = _;
        this._tryUpdate(this._doUpdate.bind(this));
    }

    emitEvent(eventName, data) {
        this.dispatchEvent(
            new CustomEvent(eventName, {
                detail: data,
            }),
        );

        if (this._callbacks[eventName]) {
            for (const callback of this._callbacks[eventName]) {
                callback(data);
            }
        }

        this._latestUpdates[eventName] = data;
    }

    onEvent(eventName, callback) {
        if (!this._callbacks[eventName]) {
            this._callbacks[eventName] = [];
        }
        this._callbacks[eventName].push(callback);

        if (this._latestUpdates[eventName]) {
            callback(this._latestUpdates[eventName]);
        }
    }

    reset() {
        this.emitEvent("reset", null);
    }

    async _iobioRequest(endpoint, params) {
        const abortController = new AbortController();

        const response = await fetch(`${this.apiUrl}${endpoint}`, {
            method: "POST",
            headers: {
                "Content-Type": "text/plain",
            },
            body: JSON.stringify(params),
            signal: abortController.signal,
        });

        return { response, abortController };
    }

    // Using 0 timeout here to handle the case where the caller sets url and
    // indexUrl one right after the other. The goal is to prevent firing off two
    // updates.
    async _tryUpdate(func) {
        if (this._updateTimeout) {
            clearTimeout(this._updateTimeout);
            this._updateTimeout = null;
        }

        this._updateTimeout = setTimeout(() => {
            //this._doUpdate();
            func();
        }, 0);
    }

    _getIndexUrls() {
        let indexUrls = [];
        if (this.indexUrls) {
            indexUrls = this.indexUrls;
        } else {
            for (let i = 0; i < this.alignmentUrls.length; i++) {
                const alignmentUrl = this.alignmentUrls[i];
                const parsedUrl = new URL(alignmentUrl);

                const isCram = parsedUrl.pathname.endsWith(".cram");
                const pathname = isCram ? parsedUrl.pathname + ".crai" : parsedUrl.pathname + ".bai";
                parsedUrl.pathname = pathname;
                indexUrls.push(parsedUrl.href);
            }
        }
        return indexUrls;
    }

    async _doUpdate() {
        if (!this.alignmentUrls) {
            return;
        }

        const alignmentUrlsChanged = JSON.stringify(this.alignmentUrls) !== JSON.stringify(this._lastAlignmentUrls);

        if (alignmentUrlsChanged) {
            this._lastAlignmentUrls = this.alignmentUrls;

            const indexUrls = this._getIndexUrls();
            // Parse the alignment URLs
            for (let i = 0; i < this.alignmentUrls.length; i++) {
                const parsedUrl = new URL(this.alignmentUrls[i]);
                const indexUrl = indexUrls[i];
                const isCram = parsedUrl.pathname.endsWith(".cram");
                const coverageEndpoint = isCram ? "/craiReadDepth" : "/baiReadDepth";

                // Coverage promise
                const coverageTextPromise = this._iobioRequest(coverageEndpoint, {
                    url: indexUrl,
                }).then((res) => res.response.text());
                // Header promise
                const headerTextPromise = this._iobioRequest("/alignmentHeader", {
                    url: parsedUrl,
                }).then((res) => res.response.text());

                // Collect all promises
                const [coverageText, headerText, bedText] = await Promise.all([coverageTextPromise, headerTextPromise]);

                // Parse the coverage and header data
                this._readDepthData = parseReadDepthData(coverageText);
                this._header = parseBamHeaderData(headerText);
                this._header = this._getValidRefs(this._header, this._readDepthData);
                this._readDepthData = this._getBamReadDepthByValidRefs(this._header, this._readDepthData);

                this.emitEvent("new-series-data", {
                    segments: this._header,
                    seriesValues: this._readDepthData,
                    index: i, // The index of the series URL we have just processed
                });
            }
        }
    }

    // We will clean the headers here so that they are valid and the chart can be more generic
    _getValidRefs(header, readDepthData) {
        const refsWithCoverage = Object.keys(readDepthData).filter((key) => {
            return readDepthData[key].length > 1000;
        });

        const validRefs = [];
        for (let i = 0; i < refsWithCoverage.length; i++) {
            validRefs.push(header[i]);
        }

        return validRefs;
    }

    _getBamReadDepthByValidRefs(bamHeader, bamReadDepth) {
        let validBamReadDepth = {};
        for (let i = 0; i < bamHeader.length; i++) {
            validBamReadDepth[i] = bamReadDepth[i];
        }
        return validBamReadDepth;
    }
}

export { MultiAlignmentBroker };
