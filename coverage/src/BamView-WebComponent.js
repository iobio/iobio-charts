import { createBamView} from "./BamViewChart.js";
import { getDataBroker, upgradeProperty, commonCss} from '../../common.js';
import { getValidRefs } from "./BamData.js";
import { InfoButton } from "../../info_button.js";

const template = document.createElement('template');
template.innerHTML = `
<style>
${commonCss}
:host {
    width: 100%;
    height: 100%;
    --data-color: var(--iobio-data-color, #2d8fc1);
}

rect {
    shape-rendering: crispEdges;
}

#bamview {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
}

#bamview-chart-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    border: 1px solid #ccc;
    padding: 5px 0;
    position: relative;
}

#title-container {
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 10px;
}

#title-text {
    font-size: 20px;
}

#chart-container {
    width: 100%;
    height: 100%;
    position: relative;
}

.chromosome-button:hover rect,
.chromosome-button:hover circle {
    cursor: pointer;
    stroke: red;
    stroke-width: 2;
}

.chromosome-button text {
    cursor: pointer;
    user-select: none;
}

.chromosome-button-big text,
.gene-region-label  {
    user-select: none;
}

.bar, .circle {
    fill: var(--data-color);
}

.brush rect.selection {
    stroke: red;
}

.hidden {
    visibility: hidden;
}
</style>
<div id="bamview">
    <div id="bamview-chart-container">
        <div id="title-container">
            <iobio-label-info-button>
                <div slot="header">
                    <div>Read Coverage</div>
                </div>
                <div slot="content">
                    <p>The read coverage shows how the read coverage varies across the entire genome. The coloured
                    numbers beneath represent chromosomes in the reference genome used and can be selected to view
                    the read coverage in an individual chromosome. Selecting a different chromosome will cause
                    all other metrics in bam.iobio to be recalculated based on reads sampled from that chromosome only.
                    Once a chromosome is selected, you can also focus on a smaller region by dragging over the region
                    of interest; again, all other metrics will then be recalculated for that region only.
                    </p>
                </div>
            </iobio-label-info-button>
            <span id="title-text"></span>
        </div>
        <iobio-loading-indicator label="Initializing data"></iobio-loading-indicator>
        <div id="chart-container">
        </div>
    </div>
</div>
`;


class BamViewChart extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(template.content.cloneNode(true));
        this.initDOMElements();
        this.bamReadDepth = null;
        this.bamHeader = null;
        this.validBamHeader = null;
        this.validBamReadDepth = null;
        upgradeProperty(this, 'label');

    }

    get label() {
        return this.getAttribute('label');
      }
    set label(_) {
        this.setAttribute('label', _);
    }

    set backendUrl(url) {
        this._backendUrl = url;
    }

    get backendUrl() {
        return this._backendUrl;
    }

    initDOMElements() {
        this.bamViewContainer = this.shadowRoot.querySelector('#chart-container');
        this.tooltipButton = this.shadowRoot.querySelector('iobio-label-info-button');
        this.modal = this.shadowRoot.querySelector('#modal');
    }

    async connectedCallback() {

        this.broker = getDataBroker(this);
        
        if (this.label) {
            this.shadowRoot.querySelector('#title-text').innerText = this.label;
        }
  
        if (this.broker) {
            this.broker.addEventListener('reset', () => {
                this.toggleSVGContainerAndIndicator(false);
            });

            this.broker.addEventListener('alignment-data', (event) => {
                const { header, readDepthData } = event.detail;
                this.bamHeader = header;
                this.bamReadDepth = readDepthData;

                this.toggleSVGContainerAndIndicator(true);
                this.updateBamView();
            });

            document.addEventListener('region-selected', (event) => this.handleGoClick(event.detail));
            document.addEventListener('gene-entered', (event) => this.handleSearchClick(event.detail));
        }
    }

    toggleSVGContainerAndIndicator(showSVG) {
        const indicator = this.shadowRoot.querySelector('iobio-loading-indicator');
        const svgContainer = this.shadowRoot.querySelector('#chart-container');
        
        svgContainer.classList.toggle('hidden', !showSVG);
        indicator.style.display = showSVG ? 'none' : 'block';
    }

    updateBamView() {
        this.validBamHeader = getValidRefs(this.bamHeader, this.bamReadDepth);
        this.validBamReadDepth = this.getBamReadDepthByValidRefs(this.validBamHeader, this.bamReadDepth);

        // Create the new BAM view
        this._bamView = createBamView(this.validBamHeader, this.validBamReadDepth, this.bamViewContainer, this.broker);

        this.setupResizeObserver();
    }

    getBamReadDepthByValidRefs(bamHeader, bamReadDepth) {
        let validBamReadDepth = {};
        for (let i = 0; i < bamHeader.length; i++) {
            validBamReadDepth[i] = bamReadDepth[i];
        }
       return validBamReadDepth;
    }

    setupResizeObserver() {
        let resizeTimeout;
        this.resizeObserver = new ResizeObserver(entries => {
            if (resizeTimeout) clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                entries.forEach(entry => {
                    if (entry.target === this.bamViewContainer) {
                        this._bamView = createBamView(this.validBamHeader, this.validBamReadDepth, this.bamViewContainer, this.broker);  
                    }
                });
            }, 100);
        });
        this.resizeObserver.observe(this.bamViewContainer);
    }

    disconnectedCallback() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        document.removeEventListener('region-selected', this.handleGoClick);
        document.removeEventListener('gene-entered', this.handleSearchClick);
    }
    
    handleGoClick(detail) {
        const { rname, start, end } = detail;

        // Validate chromosome number first
        if (!this.isValidChromosome(rname)) {
            alert('Invalid chromosome number');
            return;
        }

        // Check if only the chromosome is provided and start and end inputs are empty
        if (start === "" && end === "") {
            this._bamView.zoomToChromomsomeRegion(this.validBamReadDepth, rname);
        } else if (this.validateInput(start, end)) {
            this._bamView.zoomToChromomsomeRegion(this.validBamReadDepth, rname, start, end, null);
        }
    }

    handleSearchClick(detail) {
        const { geneName, source } = detail;
        const build = this.bamHeader[0].length === 249250621 ? 'GRCh37' : 'GRCh38';

        if (geneName) {
            this.fetchGeneInfo(geneName, source, 'homo_sapiens', build);
        }
    }

    async fetchGeneInfo(geneName, source, species, build) {
        try {
            const response = await fetch(`${this._backendUrl}/geneinfo/${geneName}?source=${source}&species=${species}&build=${build}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            if (!data[0] || data[0].chr === undefined) {
                alert(`Gene ${geneName} is not in ${source} for build ${build}`);
                return;
            }
            const chr = data[0].chr;
            const start = parseInt(data[0].start);
            const end = parseInt(data[0].end);
            this._bamView.zoomToChromomsomeRegion(this.validBamReadDepth, chr, start, end, geneName);

        } catch (error) {
            console.error('Error fetching gene information:', error);
            alert('Failed to fetch gene information');
        }
    }

    isValidChromosome(chromosome) {
        const validChromosomes = new Set(this.validBamHeader.map(header => header.sn));
        return validChromosomes.has(chromosome);
    }    

    validateInput(start, end) {
        if (!Number.isInteger(start) || !Number.isInteger(end)) {
            alert('Start and end positions must be integers');
            return false;
        }
        if (start > end) {
            alert('Start position cannot be greater than end position');
            return false;
        }
        if (start <= 0 || end <= 0) {
            alert('Start and end positions must be greater than or equal to 1.');
            return false;
        }
        return true;
    }

    
}

window.customElements.define('iobio-coverage-depth', BamViewChart);
export { BamViewChart };
