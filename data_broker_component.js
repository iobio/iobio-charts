import { DataBroker } from './data_broker.js';
import { upgradeProperty } from './common.js';

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
    this.broker.alignmentUrl = _;
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
  DataBrokerElement,
};
