import { upgradeProperty } from './common.js';
import { parseReadDepthData, parseBamHeaderData, parseBedFile, getValidRefs } from './coverage/src/BamData.js';

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

  get bedUrl() {
    return this._bedUrl;
  }
  set bedUrl(_) {
    this._bedUrl = _;
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

    const readDepthData = parseReadDepthData(coverageText);
    this.emitEvent('read-depth', readDepthData);

    const header = parseBamHeaderData(headerText);
    this.emitEvent('header', header);

    let bedData;
    if (bedText) {
      bedData = parseBedFile(bedText, header);
    }

    const validRefs = getValidRefs(header, readDepthData); //.slice(0, 1);

    const regions = bedData ? sample(bedData.regions) : sample(validRefs);

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


const TARGET_BIN_SIZE = 10000;
const SECONDARY_BIN_SIZE = 5000;
const TERTIARY_BIN_SIZE = 2500;
const NUM_SAMPLES = 20;

function sample(inRegions) {

  let idealRegions = [];
  const secondaryRegions = [];
  const tertiaryRegions = [];

  for (const region of inRegions) {
    const length = region.end - region.start;

    if (length >= TARGET_BIN_SIZE) {
      idealRegions.push(region);
    }
    else if (length >= SECONDARY_BIN_SIZE) {
      secondaryRegions.push(region);
    }
    else if (length >= TERTIARY_BIN_SIZE) {
      tertiaryRegions.push(region);
    }
  }

  if (idealRegions.length < NUM_SAMPLES) {
    const expanded = expandRegions(idealRegions);

    if (expanded.length > idealRegions.length) {
      idealRegions = expanded;
    }
  }

  let sampledRegions = sampleFromRegions(idealRegions, NUM_SAMPLES, TARGET_BIN_SIZE);

  if (sampledRegions.length < NUM_SAMPLES) {
    const remaining = NUM_SAMPLES - sampledRegions.length;
    // readRatio increases the number of regions so we still get the desired number of reads sampled
    const readRatio = 2;
    const batch = sampleFromRegions(secondaryRegions, remaining*readRatio, SECONDARY_BIN_SIZE);
    sampledRegions = [...sampledRegions, ...batch];
  }

  if (sampledRegions.length < NUM_SAMPLES) {
    const remaining = NUM_SAMPLES - sampledRegions.length;
    const readRatio = 4;
    const batch = sampleFromRegions(tertiaryRegions, remaining*readRatio, TERTIARY_BIN_SIZE);
    sampledRegions = [...sampledRegions, ...batch];
  }

  return sampledRegions.sort(function (a, b) {
    if (a.name == b.name) {
      return ((a.start < b.start) ? -1 : ((a.start > b.start) ? 1 : 0));
    }
    else {
      return ((a.name < b.name) ? -1 : ((a.name > b.name) ? 1 : 0));
    }
  });
}

function expandRegions(regions) {

  let expanded = [];

  for (const region of regions) {
    expanded = [...expanded, ...expandRegion(region)];
  }

  return expanded;
}

function expandRegion(region) {
  const samp = [];
  const length = region.end - region.start;

  if (length < TARGET_BIN_SIZE) {
    return [region];
  }

  const numPossibleIndices = Math.floor((length - TARGET_BIN_SIZE) / TARGET_BIN_SIZE);


  if (numPossibleIndices < 1000) {
    // Small enough number to guarantee no duplicates
    const possibleIndices = [];
    for (let i=0; i<numPossibleIndices; i++) {
      possibleIndices.push(i*TARGET_BIN_SIZE);
    }

    for (let i=0; i < NUM_SAMPLES && possibleIndices.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * possibleIndices.length);
      const start = possibleIndices.splice(randomIndex, 1)[0];
      samp.push({
        rname: region.rname,
        start,
        end: start + TARGET_BIN_SIZE,
      });
    }
  }
  else {
    for (let i=0; i < NUM_SAMPLES; i++) {
      const randomStart = Math.floor(Math.random() * numPossibleIndices * TARGET_BIN_SIZE);
      samp.push({
        rname: region.rname,
        start: randomStart,
        end: randomStart + TARGET_BIN_SIZE,
      });
    }
  }

  return samp;
}

function sampleFromRegions(inRegions, numSamples, binSize) {

  const regions = [...inRegions];

  const sampledRegions = [];

  for (let i=0; i < numSamples && regions.length > 0; i++) {

    const randomIndex = Math.floor(Math.random() * regions.length);
    const randomRegion = regions.splice(randomIndex, 1)[0];

    const length = randomRegion.end - randomRegion.start;
    const maxOffset = length - binSize;
    const randomStart = randomRegion.start + Math.round(Math.random() * maxOffset);

    if ((randomStart + binSize) > randomRegion.end) {
      throw new Error("Sampling error. This shouldn't happen.");
    }

    sampledRegions.push({
      name: randomRegion.rname,
      start: randomStart,
      end: randomStart + binSize,
    });
  }

  return sampledRegions;
}


class DataBrokerElement extends HTMLElement {

  constructor() {
    super();

    upgradeProperty(this, 'alignmentUrl');
    upgradeProperty(this, 'indexUrl');
    upgradeProperty(this, 'bedUrl');
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

  get bedUrl() {
    return this.getAttribute('bed-url');
  }
  set bedUrl(_) {
    this.broker.bedUrl = _;
    this.setAttribute('bed-url', _);
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
