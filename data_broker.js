import { parseReadDepthData, parseBamHeaderData, parseBedFile, getValidRefs } from './coverage/src/BamData.js';
import { sample } from './sampling.js';

/**
 * @typedef {object} Region
 * @property {string} rname Reference sequence name
 * @property {number} start Start index
 * @property {number} end End index
 */


class DataBroker extends EventTarget {
  constructor(alignmentUrl, options) {
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

    this.alignmentUrl = alignmentUrl;
  }

  get apiUrl() {
    return this._server;
  }
  set apiUrl(_) {
    this._server = _;
    this._tryUpdate(this._doUpdate.bind(this));
  }

  get alignmentUrl() {
    return this._alignmentUrl;
  }

  set alignmentUrl(_) {
    this._alignmentUrl = _;
    this._tryUpdate(this._doUpdate.bind(this));
  }

  get indexUrl() {
    return this._indexUrl;
  }
  set indexUrl(_) {
    this._indexUrl = _;
    this._tryUpdate(this._doUpdate.bind(this));
  }

  get bedUrl() {
    return this._bedUrl;
  }
  set bedUrl(_) {
    this._bedUrl = _;
    this._tryUpdate(this._doUpdate.bind(this));
  }

  get bedText() {
    return this._bedText;
  }

  set bedText(_) {
    this._bedText = _;
    this._updateStats();
  }


  get regions() {
    return this._regions;
  }
  set regions(_) {
    this._regions = _;
    this._tryUpdate(this._doUpdate.bind(this));
  }

  emitEvent(eventName, data) {

    this.dispatchEvent(new CustomEvent(eventName, {
      detail: data,
    }));

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
    this.emitEvent('reset', null);
  }

  async _iobioRequest(endpoint, params) {

    const abortController = new AbortController();

    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
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

  _getIndexUrl() {
    const parsedUrl = new URL(this.alignmentUrl);
    const isCram = parsedUrl.pathname.endsWith(".cram"); 

    let indexUrl;

    if (this.indexUrl) {
      indexUrl = this.indexUrl;
    }
    else {
      const pathname = isCram ? parsedUrl.pathname + ".crai" : parsedUrl.pathname + ".bai";
      parsedUrl.pathname = pathname;
      indexUrl = parsedUrl.href;
    }

    return indexUrl;
  }

  async _doUpdate() {

    if (!this.alignmentUrl) {
      return;
    }

    const alignmentUrlChanged = this.alignmentUrl !== this._lastAlignmentUrl;

    if (alignmentUrlChanged) {

      this._lastAlignmentUrl = this.alignmentUrl;

      const parsedUrl = new URL(this.alignmentUrl);

      const isCram = parsedUrl.pathname.endsWith(".cram"); 

      const indexUrl = this._getIndexUrl();

      const coverageEndpoint = isCram ? "/craiReadDepth" : "/baiReadDepth";

      const indexRes = await this._iobioRequest(coverageEndpoint, {
        url: indexUrl,
      });
      const coverageTextPromise = indexRes.response;

      const headerRes = await this._iobioRequest("/alignmentHeader", {
        url: this.alignmentUrl,
      });
      const headerTextPromise = headerRes.response;

      let bedTextPromise;
      if (this.bedUrl) {
        bedTextPromise = fetch(this.bedUrl).then(res => res.text());
      }

      const [ coverageTextRes, headerTextRes, bedText ] = await Promise.all([
        coverageTextPromise,
        headerTextPromise,
        bedTextPromise,
      ]);

      const coverageText = await coverageTextRes.text();
      const headerText = await headerTextRes.text();

      this._readDepthData = parseReadDepthData(coverageText);
      this._header = parseBamHeaderData(headerText);
      this.emitEvent('alignment-data', {
        header: this._header,
        readDepthData: this._readDepthData,
      });

      if (bedText) {
        this._bedData = parseBedFile(bedText, this._header);
      }

      if (this._regions) {
        this._regions = null;
      }
    }
    this._updateStats();
  }

  async _updateStats() {
    const validBamHeader = getValidRefs(this._header, this._readDepthData);
    const validRegions = this.regions ? this.regions : validBamHeader

    let allRegions = validRegions;

    const sns = allRegions.map(ref => {
      return ref.sn;
    });

    const indexMap = validBamHeader.reduce((acc, ref, index) => {
      acc[ref.sn] = index;
      return acc;
    }, {});

    let mappedReads, unmappedReads;
    if (this._readDepthData[0].mapped !== undefined) {
      mappedReads = unmappedReads = 0;
      sns.forEach(sn => {
        mappedReads += this._readDepthData[indexMap[sn]].mapped;
        unmappedReads += this._readDepthData[indexMap[sn]].unmapped;
      });
    }

    if (this._bedData) {
      allRegions = filterRegions(this._bedData.regions, validRegions);
    }

    if (this._bedText) {
      this._bedTextData = parseBedFile(this._bedText, this._header);
      allRegions = filterRegions(this._bedTextData.regions, validRegions);
    }

    const regions = sample(allRegions);

    this.emitEvent('stats-stream-request', null);

    const { response, abortController } = await this._iobioRequest("/alignmentStatsStream", {
      url: this.alignmentUrl,
      indexUrl: this._getIndexUrl(),
      regions,
    });
    if (this._abortController) {
      this._abortController.abort();
    }

    this._abortController = abortController;

    let prevUpdate = {};
    let remainder = "";
    const decoder = new TextDecoder('utf8');

    const reader = response.body.getReader();

    this.emitEvent('stats-stream-start', null);

    while (true) {
      let chunk;
      try {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        chunk = value;
      }
      catch (e) {
        if (e.name !== 'AbortError') {
          console.error(e);
        }
        break;
      }

      const messages = decoder.decode(chunk).split(";");

      if (remainder !== "") {
        messages[0] = remainder + messages[0];
        remainder = "";
      }

      const objs = messages.map((m, i) => {
        try {
          const obj = JSON.parse(m)
          return obj
        }
        catch (e) {
          if (i !== messages.length - 1) {
            console.error(e);
          }
          remainder = m;
          return null;
        }
      })
      .filter(o => o !== null);

      this._update = objs[objs.length - 1];

      if (!this._update) {
        continue;
      }

      if (mappedReads !== undefined && unmappedReads !== undefined) {
        this._update.calculated_mapped_reads = mappedReads;
        this._update.calculated_total_reads = mappedReads + unmappedReads;
      } else {
        this._update.calculated_mapped_reads = this._update.mapped_reads;
        this._update.calculated_total_reads = this._update.total_reads;
      }

      this.dispatchEvent(new CustomEvent('stats-stream-data', {
        detail: {
          stats: this._update,
        }
      }));

      for (const key in this._update) {
        // TODO: need to deep compare
        if (this._update[key] !== prevUpdate[key]) {
          this.emitEvent(key, this._update[key]);
        }
      }

      prevUpdate = this._update;
    }

    this.emitEvent('stats-stream-end', null);
  }
}

/**
 * Takes an array of regions and returns an array of only those regions that
 * completely lie within a second array of regions.
 * @param allRegions {Region[]} Region array to be filtered
 * @param filterRegs {Region[]} Region array to be applied as a filter
 * @returns {Region[]} Filtered regions
 */
function filterRegions(allRegions, filterRegs) {

  if (!filterRegs) {
    return [...allRegions];
  }

  const startTime = performance.now();

  let numIter = 0;
  const result = allRegions.filter((r) => {
    for (let i=0; i<filterRegs.length; i++) {
      numIter++;
      const fr = filterRegs[i];
      if (r.rname === fr.rname && r.start >= fr.start && r.end <= fr.end) {
        return true;
      }
    }
    return false;
  });

  const elapsedMs = performance.now() - startTime;

  if (elapsedMs > 100) {
    console.error("Filtering is taking too long");
  }

  return result;
}

export {
  DataBroker,
};
