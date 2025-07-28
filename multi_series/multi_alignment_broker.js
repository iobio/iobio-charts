import { parseReadDepthData, parseBamHeaderData } from "../coverage/src/BamData.js";

class MultiAlignmentBroker extends EventTarget {
    constructor(alignmentUrls, options) {
        super();

        this._server = "https://backend.iobio.io";
        this._preciseServer = "https://mosaic.chpc.utah.edu/gru-dev-9002";
        this._alignmentTitles = [];

        if (options) {
            if (options.server) {
                this._server = options.server;
            }
            if (options.titles) {
                this._alignmentTitles = options.titles;
            }
            if (options.region) {
                this._region = options.region;
            }
        }

        this._callbacks = {};
        this._latestUpdates = {};
        this._lastAlignmentUrl = null;
        this._lastRegion = null;
        this._region = null;

        this.alignmentUrls = alignmentUrls;
        this._component = null;
    }

    get apiUrl() {
        return this._server;
    }
    set apiUrl(_) {
        this._server = _;
        this._tryUpdate(this._doUpdate.bind(this));
    }

    get component() {
        return this._component;
    }
    set component(_) {
        this._component = _;
    }

    get preciseApiUrl() {
        return this._preciseServer;
    }
    set preciseApiUrl(_) {
        this._preciseServer = _;
        this._tryUpdate(this._doUpdate.bind(this));
    }

    get region() {
        return this._region;
    }
    set region(_) {
        this._region = _;
        this._tryUpdate(this._doUpdate.bind(this));
    }

    get alignmentUrls() {
        return this._alignmentUrls;
    }
    set alignmentUrls(_) {
        this._alignmentUrls = _;
        this._tryUpdate(this._doUpdate.bind(this));
    }

    get alignmentTitles() {
        return this._alignmentTitles;
    }
    set alignmentTitles(_) {
        this._alignmentTitles = _;
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

    async _preciseRequest(endpoint, params) {
        const abortController = new AbortController();
        const response = await fetch(`${this.preciseApiUrl}${endpoint}`, {
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
            //this._doUpdate() is what is being called after the timeout
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

    _getChartWidth() {
        if (this._component && this._component.id) {
            const brokerId = this._component.id;
            const chartComponent = document.querySelector(`iobio-multi-series[broker-id="${brokerId}"]`);

            if (chartComponent && chartComponent.multiSeriesContainer) {
                return chartComponent.multiSeriesContainer.clientWidth;
            }
        }
        return 1000; // fallback
    }

    async _doUpdate() {
        if (!this.alignmentUrls) {
            return;
        }

        this._lastRegion = this.region;
        this._lastAlignmentUrls = this.alignmentUrls;

        await this._pullAllBins();
        return;
    }

    async _pullAllBins() {
        const chartWidth = this._getChartWidth();
        const indexUrls = this._getIndexUrls();

        //If we have a region and it is not empty (meaning it was small enough to be set), we will want to pull the precise bins
        const regionSize = this.region ? this.region.end - this.region.start : null;
        if (regionSize && regionSize < 1000000) {
            let numBins = chartWidth;
            if (regionSize < chartWidth) {
                numBins = regionSize;
            }
            await this._pullPreciseBins(numBins);
            return;
        }

        // Parse the alignment URLs
        this.emitEvent("start-fetching-series", null);

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

            const emittedData = {
                segments: this._header,
                seriesValues: this._readDepthData,
                seriesTitle: this.alignmentTitles[i] || `Sample ${i + 1}`,
                index: i, // The index of the series URL we have just processed
            };
            this.emitEvent("new-series-data", emittedData);
        }

        this.emitEvent("end-fetching-series", null);
    }

    async _pullPreciseBins(numBins) {
        const indexUrls = this._getIndexUrls();
        // Parse the alignment URLs
        this.emitEvent("start-fetching-series", null);

        for (let i = 0; i < this.alignmentUrls.length; i++) {
            const parsedUrl = new URL(this.alignmentUrls[i]);
            const coverageEndpoint = "/preciseReadDepth";

            // Header promise: First so that we can know the format of the refs
            const headerText = await this._preciseRequest("/alignmentHeader", {
                url: parsedUrl,
            }).then((res) => res.response.text());

            // Parse and process header first
            this._header = parseBamHeaderData(headerText);
            this._header = this._getValidRefs(this._header);
            const hasChrInRef = this._header.some((ref) => ref.sn.includes("chr"));

            // Coverage promise: Now that we have the header, we can process coverage
            const coverageText = await this._preciseRequest(coverageEndpoint, {
                url: parsedUrl,
                indexUrl: indexUrls[i],
                region: {
                    start: this.region.start,
                    end: this.region.end,
                    refName: hasChrInRef ? "chr" + this.region.startChr : this.region.startChr,
                },
                numBins: numBins,
            }).then((res) => res.response.text());

            this._readDepthData = this._parsePreciseReadDepth(coverageText, this.region, this._header, hasChrInRef);

            const emittedData = {
                segments: this._header,
                seriesValues: this._readDepthData,
                seriesTitle: this.alignmentTitles[i] || `Sample ${i + 1}`,
                index: i, // The index of the series URL we have just processed
            };
            this.emitEvent("new-series-data", emittedData);
        }

        this.emitEvent("end-fetching-series", null);
    }

    // We will clean the headers here so that they are valid and the chart can be more generic
    _getValidRefs(header) {
        const allowedChromosomes = [
            "chr1",
            "chr2",
            "chr3",
            "chr4",
            "chr5",
            "chr6",
            "chr7",
            "chr8",
            "chr9",
            "chr10",
            "chr11",
            "chr12",
            "chr13",
            "chr14",
            "chr15",
            "chr16",
            "chr17",
            "chr18",
            "chr19",
            "chr20",
            "chr21",
            "chr22",
            "chrX",
            "chrY",
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            "10",
            "11",
            "12",
            "13",
            "14",
            "15",
            "16",
            "17",
            "18",
            "19",
            "20",
            "21",
            "22",
            "X",
            "Y",
        ];

        //Accumulate and keep track of the original i as well
        let validRefs = [];
        for (let i = 0; i < header.length; i++) {
            let ref = header[i];
            ref.originalIndex = i; // Store the original index for reference
            if (allowedChromosomes.includes(ref.sn)) {
                validRefs.push(ref);
            }
        }

        return validRefs;
    }

    _getBamReadDepthByValidRefs(bamHeader, bamReadDepth) {
        let validBamReadDepth = {};
        for (let i = 0; i < bamHeader.length; i++) {
            const ref = bamHeader[i];
            validBamReadDepth[i] = bamReadDepth[ref.originalIndex];
        }
        return validBamReadDepth;
    }

    _parsePreciseReadDepth(rawReadDepth, region, headers, hasChrInRef) {
        const regionStart = region.start;
        let regionChr = region.startChr;
        let readDepth = {};
        regionChr = hasChrInRef ? "chr" + regionChr : regionChr;

        for (let i = 0; i < headers.length; i++) {
            const header = headers[i];
            const headerChr = header.sn;

            readDepth[i] = [];

            if (headerChr === regionChr) {
                const lines = rawReadDepth.split("\n").filter((line) => line.trim() !== "");
                const numBins = lines.length;
                const binSize = (this.region.end - this.region.start) / numBins;

                for (let j = 0; j < lines.length; j++) {
                    let bin = {};
                    const line = lines[j].trim();

                    // Parse the coverage value from the line
                    const avgCoverage = parseFloat(line.split(/\s+/)[0]) || 0;

                    bin.offset = j * binSize + (regionStart - 1); // The bin is offset from the region
                    bin.avgCoverage = avgCoverage;
                    readDepth[i].push(bin);
                }
            }
        }
        return readDepth;
    }
}

export { MultiAlignmentBroker };
