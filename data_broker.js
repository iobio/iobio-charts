class DataBroker {
  constructor(url, options) {

    this._server = "https://backend.iobio.io";

    if (options) {
      if (options.server) {
        this._server = options.server;
      }
    }

    this._callbacks = {};

    const decoder = new TextDecoder('utf8');

    (async () => {

      const coverageTextPromise = this._iobioRequest("/baiReadDepth", {
        url: url + ".bai",
      });

      const headerTextPromise = this._iobioRequest("/alignmentHeader", {
        url,
      });

      const [ coverageText, headerText ] = await Promise.all([
        coverageTextPromise,
        headerTextPromise
      ]);

      const coverage = parseCoverage(await coverageText.text());
      const header = parseHeader(await headerText.text());

      const refsWithCoverage = Object.keys(coverage);
      const validRefs = [];
      for (let i = 0; i < refsWithCoverage.length; i++) {
        validRefs.push(header.sq[i]);
      }

      const regions = sample(validRefs);

      const res = await this._iobioRequest("/alignmentStatsStream", {
        url,
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

        const update = objs[objs.length - 1];

        if (!update) {
          continue;
        }

        for (const key in update) {
          if (update[key] !== prevUpdate[key]) {
            //console.log("emit", key, update[key]);
            if (this._callbacks[key]) {
              for (const callback of this._callbacks[key]) {
                callback(update[key]);
              }
            }
          }
        }

        prevUpdate = update;
      }

    })();
  }

  onEvent(eventName, callback) {
    if (!this._callbacks[eventName]) {
      this._callbacks[eventName] = [];
    }
    this._callbacks[eventName].push(callback);
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

function parseCoverage(coverageText) {

  const readDepth = {};

  let currentSequence;
  for (const line of coverageText.split('\n')) {
    if ( line[0] == '#' ) {
      if (currentSequence) {
        //submitRef(currentSequence); 
      }

      var fields = line.substr(1).split("\t");
      currentSequence = fields[0]
      readDepth[currentSequence] = [];
      if (fields[1]) {
        readDepth[currentSequence].mapped = +fields[1];
        readDepth[currentSequence].unmapped = +fields[2];
      }
    }
    else if (line[0] == '*') {
      //me.n_no_coor = +line.split("\t")[2];
    }
    else {
      if (line != "") {
        var d = line.split("\t");
        readDepth[currentSequence].push({ pos:parseInt(d[0]), depth:parseInt(d[1]) });
      }
    }
  }

  return readDepth;
}

class DataBrokerElement extends HTMLElement {

  get broker() {
    return this._broker
  }

  constructor() {
    super();

    const url = this.getAttribute("url");

    const options = {};
    const server = this.getAttribute("server");

    if (server) {
      options.server = server;
    }

    this._broker = new DataBroker(url, options);
  }

  connectedCallback() {
  }
}

customElements.define('iobio-data-broker', DataBrokerElement);
