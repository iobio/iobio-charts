import { upgradeProperty } from './common.js';
import { parseReadDepthData, parseBamHeaderData } from './coverage/src/BamData.js';

class DataBroker {
  constructor(url, options) {

    this._server = "https://backend.iobio.io";

    if (options) {
      if (options.server) {
        this._server = options.server;
      }
    }

    this._callbacks = {};
    this._latestUpdates = {};

    this.url = url;
  }

  get url() {
    return this._url;
  }

  set url(_) {
    this._url = _;
    this._tryUpdate();
  }

  get indexUrl() {
    return this._indexUrl;
  }

  set indexUrl(_) {
    this._indexUrl = _;
    this._tryUpdate();
  }

  emitEvent(eventName, data) {
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

  async _iobioRequest(endpoint, params) {
    const res = await fetch(`${this._server}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify(params),
    });

    return res;
  }

  // Using 0 timeout here to handle the case where the caller sets url and
  // indexUrl one right after the other. The goal is to prevent firing off two
  // updates.
  async _tryUpdate() {

    if (this._updateTimeout) {
      clearTimeout(this._updateTimeout);
      this._updateTimeout = null;
    }

    this._updateTimeout = setTimeout(() => {
      this._update();
    }, 0);
  }

  async _update() {

    if (!this._url) {
      return;
    }

    const decoder = new TextDecoder('utf8');

    const parsedUrl = new URL(this.url);

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

    let coverageTextPromise;
    if (isCram) {
      coverageTextPromise = this._iobioRequest("/craiReadDepth", {
        url: indexUrl,
      });
    }
    else {
      coverageTextPromise = this._iobioRequest("/baiReadDepth", {
        url: indexUrl,
      });
    }

    const headerTextPromise = this._iobioRequest("/alignmentHeader", {
      url: this.url,
    });

    const [ coverageTextRes, headerTextRes ] = await Promise.all([
      coverageTextPromise,
      headerTextPromise
    ]);

    const coverageText = await coverageTextRes.text();
    const headerText = await headerTextRes.text();

    const readCoverageDepth = parseReadDepthData(coverageText);
    this.emitEvent('read-depth', readCoverageDepth);

    const depthHeader = parseBamHeaderData(headerText);
    this.emitEvent('header', depthHeader);

    const header = parseHeader(headerText);

    const refsWithCoverage = Object.keys(readCoverageDepth).filter((key) => {
      // TODO: 1000 is pretty arbitrary
      return readCoverageDepth[key].length > 1000;
    });

    let validRefs = [];
    for (let i = 0; i < refsWithCoverage.length; i++) {
      validRefs.push(header.sq[i]);
    }

    const regions = sample(validRefs);

    const res = await this._iobioRequest("/alignmentStatsStream", {
      url: this.url,
      indexUrl,
      regions,
    });

    let prevUpdate = {};
    let remainder = "";
    for await (const chunk of res.body) {
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

      for (const key in this._update) {
        // TODO: need to deep compare
        if (this._update[key] !== prevUpdate[key]) {
          this.emitEvent(key, this._update[key]);
        }
      }

      prevUpdate = this._update;
    }
  }
}

function parseHeader(headerStr) {
  var header = { sq:[], toStr : headerStr };
  var lines = headerStr.split("\n");
  for ( var i=0; i<lines.length > 0; i++) {
    var fields = lines[i].split("\t");
    if (fields[0] == "@SQ") {
      var fHash = {};
      fields.forEach(function(field) {
        var values = field.split(':');
        fHash[ values[0] ] = values[1]
      })
      header.sq.push({
        name:fHash["SN"],
        end:1+parseInt(fHash["LN"]),
        hasRecords: false,
      });
    }
  }

  return header;
}

function sample(SQs) {

  const options = {
    start: 0,
    binSize: 10000,
    binNumber: 20,
  };

  var regions = [];
  var bedRegions;
  var sqStart = options.start;
  var length = SQs.length == 1 ? SQs[0].end - sqStart : null;
  if (length && length < options.binSize * options.binNumber) {
    SQs[0].start = sqStart;
    regions.push(SQs[0])
  } else {
    // create random reference coordinates
    var regions = [];
    for (var i = 0; i < options.binNumber; i++) {
      var seq = SQs[Math.floor(Math.random() * SQs.length)]; // randomly grab one seq
      length = seq.end - sqStart;
      var s = sqStart + parseInt(Math.random() * length);
      regions.push({
        'name': seq.name,
        'start': s,
        'end': s + options.binSize
      });
    }
    // sort by start value
    regions = regions.sort(function (a, b) {
      if (a.name == b.name)
        return ((a.start < b.start) ? -1 : ((a.start > b.start) ? 1 : 0));
      else
        return ((a.name < b.name) ? -1 : ((a.name > b.name) ? 1 : 0));
    });
  }

  return regions;
}

class DataBrokerElement extends HTMLElement {

  constructor() {
    super();

    upgradeProperty(this, 'alignmentUrl');
    upgradeProperty(this, 'indexUrl');
    upgradeProperty(this, 'server');
  }

  get broker() {
    return this._broker
  }

  get alignmentUrl() {
    return this.getAttribute('alignment-url');
  }
  set alignmentUrl(_) {
    this.broker.url = _;
    this.setAttribute('alignment-url', _);
  }

  get indexUrl() {
    return this.getAttribute('index-url');
  }
  set indexUrl(_) {
    this.broker.indexUrl = _;
    this.setAttribute('index-url', _);
  }

  get server() {
    return this.getAttribute('server');
  }
  set server(_) {
    this.setAttribute('server', _);
  }

  connectedCallback() {

    const options = {};

    if (this.server) {
      options.server = this.server;
    }

    this._broker = new DataBroker(this.alignmentUrl, options);
  }
}

customElements.define('iobio-data-broker', DataBrokerElement);

export {
  DataBroker,
  DataBrokerElement,
};
