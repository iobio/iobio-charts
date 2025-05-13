import { getDataBroker } from '../common.js';
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

                this.validBamHeader = this.getValidRefs(this.bamHeader, this.bamReadDepth);
                this.validBamReadDepth = this.getBamReadDepthByValidRefs(this.validBamHeader, this.bamReadDepth);

                let multiBam = createMultiBam(this.multiBamChart, this.validBamHeader, this.validBamReadDepth);
                this.multiBamChart.appendChild(multiBam.node());

                this.setupResizeObserver();
            });
        }
    }

    getBamReadDepthByValidRefs(bamHeader, bamReadDepth) {
        let validBamReadDepth = {};
        for (let i = 0; i < bamHeader.length; i++) {
            validBamReadDepth[i] = bamReadDepth[i];
        }
       return validBamReadDepth;
    }

    getValidRefs(header, readDepthData) {
        const refsWithCoverage = Object.keys(readDepthData).filter((key) => {
                return readDepthData[key].length > 1000;
            });
        
            const validRefs = [];
            for (let i = 0; i < refsWithCoverage.length; i++) {
            validRefs.push(header[i]);
            }
        
            return validRefs;
    }

    setupResizeObserver() {
        let resizeTimeout;

        const resizeHandler = () => {
            let multiBam = createMultiBam(this.multiBamChart, this.validBamHeader, this.validBamReadDepth);
            this.multiBamChart.appendChild(multiBam.node());
        };

        // Setting up the resize observer
        this.resizeObserver = new ResizeObserver(entries => {
            if (resizeTimeout) clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                entries.forEach(entry => {
                    if (entry.target === this.multiBamChart) {
                        resizeHandler();
                    }
                });
            }, 100);
        });
        this.resizeObserver.observe(this.multiBamChart);
    }

    disconnectedCallback() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
    }
}

window.customElements.define('iobio-multi-bam', MultiBamChart);
export { MultiBamChart };