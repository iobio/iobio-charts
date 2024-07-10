import { upgradeProperty } from './common.js';
import { parseReadDepthData, parseBamHeaderData, parseBedFile, getValidRefs } from './coverage/src/BamData.js';
import { sample } from './sampling.js';

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


  get regions() {
    return this._regions;
  }
  set regions(_) {
    this._regions = _;
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

    const abortController = new AbortController();

    const response = await fetch(`${this._server}${endpoint}`, {
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
  async _tryUpdate() {

    if (this._updateTimeout) {
      clearTimeout(this._updateTimeout);
      this._updateTimeout = null;
    }

    this._updateTimeout = setTimeout(() => {
      this._doUpdate();
    }, 0);
  }

  async _doUpdate() {

    if (!this._url) {
      return;
    }

    if (this._abortController) {
      this._abortController.abort();
      this._abortController = null;
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
      const { response } = await this._iobioRequest("/craiReadDepth", {
        url: indexUrl,
      });
      coverageTextPromise = response;
    }
    else {
      const { response } = await this._iobioRequest("/baiReadDepth", {
        url: indexUrl,
      });
      coverageTextPromise = response;
    }

    const res = await this._iobioRequest("/alignmentHeader", {
      url: this.url,
    });

    const headerTextPromise = res.response;

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

    const { response, abortController } = await this._iobioRequest("/alignmentStatsStream", {
      url: this.url,
      indexUrl,
      regions,
    });

    this._abortController = abortController;

    let prevUpdate = {};
    let remainder = "";

    const reader = response.body.getReader();
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

      for (const key in this._update) {
        // TODO: need to deep compare
        if (this._update[key] !== prevUpdate[key]) {
          this.emitEvent(key, this._update[key]);
        }
      }

      prevUpdate = this._update;
    }

    this._abortController = null;
  }
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

  get regions() {
    return this.broker.regions;
  }
  set regions(_) {
    this.broker.regions = _;
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
