import { getDataBroker, upgradeProperty, commonCss} from '../../common.js';
import { getValidRefs } from "../coverage/src/BamData.js";
import { createMultiBam } from './MultiBamChart.js';

const template = document.createElement('template');
template.innerHTML = `
<style>
    :host {
        display: block;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
    }
    #multi-bam-container {
        width: 100%;
        height: 100%;
        border: .5px solid #ccc;
        border-radius: 5px;
    }
</style>
    <div id="multi-bam-container"></div>
`;

class MultiBamChart extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(template.content.cloneNode(true));
        this.initDOMElements();

        this.bamReadDepth = null;
        this.bamHeader = null;
        this.validBamHeader = null;
        this.validBamReadDepth = null;
    }

    initDOMElements() {
        this.multiBamChart = this.shadowRoot.querySelector('#multi-bam-container');
    }

    async connectedCallback() {
        this.broker = getDataBroker(this);

        if (this.broker) {
            this.broker.addEventListener('alignment-data', (event) => {
                const { header, readDepthData } = event.detail;
                this.bamHeader = header;
                this.bamReadDepth = readDepthData;

                this.validBamHeader = getValidRefs(this.bamHeader, this.bamReadDepth);
                this.validBamReadDepth = this.getBamReadDepthByValidRefs(this.validBamHeader, this.bamReadDepth);
            });
        }

        let multiBam = createMultiBam(this.multiBamChart);
        this.multiBamChart.appendChild(multiBam.node());
    }

    getBamReadDepthByValidRefs(bamHeader, bamReadDepth) {
        let validBamReadDepth = {};
        for (let i = 0; i < bamHeader.length; i++) {
            validBamReadDepth[i] = bamReadDepth[i];
        }
       return validBamReadDepth;
    }
}

window.customElements.define('iobio-multi-bam', MultiBamChart);
export { MultiBamChart };