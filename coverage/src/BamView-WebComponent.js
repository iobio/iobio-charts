import { createBamView} from "./BamViewChart.js";
import { getDataBroker, upgradeProperty, commonCss} from '../../common.js';
import { getValidRefs } from "./BamData.js";
import { TooltipModal } from '../../modal.js';

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

#bamview-controls {
    display: flex;
    flex-wrap: wrap;    
    align-items: center;
    gap: 10px 30px;
    padding: 10px 0;
    justify-content: start;
}

.bamview-control-container {
    display: flex;
    align-items: center;
    gap: 10px;
}

#bamview-region-chromosome {
    width: 50px; 
}

#bamview-region-start{
    width: 80px; 
    padding: 0px 5px;
}

#bamview-region-end{
    width: 80px; 
    padding: 0 5px;
}

.input-group {
    display: flex;
    align-items: center;
    border: 1px solid #ccc;
    border-radius: 20px;
    padding: 5px 10px;
}

.input-group i, .input-group input, .input-group span {
    align-self: center;
    border: none; 
    margin: 0 5px;
}

.input-group input {
    outline: none;
}

.input-group i {
    color: grey;
}

select {
    border: 1px solid #ccc;
    border-radius: 20px;
    padding: 5px 10px;
    background: white;
    cursor: pointer;
}

select:focus {
    outline: none;
}

button {
    background-color: #2d8fc1;
    color: white;
    border: none;
    padding: 5px 15px;
    border-radius: 20px; 
    cursor: pointer;
}

button:hover {
    background-color: #2d8fc1;
    transform: scale(1.05);
}


#bamview-chart-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    border: 1px solid #ccc;
    padding: 5px 0;
}

#title-container {
    display: block;
    text-align: center;
}

#title-text {
    width: 100%;
    height: 10%;
    font-size: 20px;
}

#chart-container {
    width: 100%;
    height: 100%;
    position: relative;
}

.tooltip-button {
    background-color: #2d8fc1;
    color: white;
    border-radius: 50%;
    cursor: pointer;
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
</style>
<div id="bamview">
    <div id="bamview-controls">
        <div class="bamview-control-container">
            <div id="baview-controls-chromosome-region" class="input-group">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-zoom-in" viewBox="0 0 16 16">
                    <path fill-rule="evenodd" d="M6.5 12a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11M13 6.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0"/>
                    <path d="M10.344 11.742q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1 6.5 6.5 0 0 1-1.398 1.4z"/>
                    <path fill-rule="evenodd" d="M6.5 3a.5.5 0 0 1 .5.5V6h2.5a.5.5 0 0 1 0 1H7v2.5a.5.5 0 0 1-1 0V7H3.5a.5.5 0 0 1 0-1H6V3.5a.5.5 0 0 1 .5-.5"/>
                </svg>
                <input type="text" id="bamview-region-chromosome" placeholder="chr1">
                <span>:</span>
                <input type="text" id="bamview-region-start" placeholder="Start">
                <span>-</span>
                <input type="text" id="bamview-region-end" placeholder="End">
            </div>
            <button id="bamview-controls-go">Go</button>
        </div>
        <div class="bamview-control-container">
            <div id="gene-search-container" class="input-group">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-search" viewBox="0 0 16 16">
                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/>
                </svg>
                <input type="text" id="gene-name-input" placeholder="Gene name">
            </div>
            <select id="source-select">
                <option value="gencode" selected>gencode</option>
                <option value="refseq">refseq</option>
            </select>
            <button id="gene-search-button">Search</button>
        </div>
    </div>
    <div id="bamview-chart-container">
        <div id="title-container">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-info-circle tooltip-button" viewBox="0 0 16 16">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
                <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0"/>
            </svg>
            <span id="title-text"></span>
        </div>
        <div id="chart-container">
            <iobio-loading-indicator label="Initializing data"></iobio-loading-indicator>
        </div>
    </div>
</div>
<iobio-modal id="modal">
  <div slot="header">
    <h4>Read Coverage</h4>
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
</iobio-modal>
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

    initDOMElements() {
        this.bamViewContainer = this.shadowRoot.querySelector('#chart-container');
        this.bamViewControls = this.shadowRoot.querySelector('#bamview-controls');
        this.chromosomeInput = this.shadowRoot.querySelector('#bamview-region-chromosome');
        this.startInput = this.shadowRoot.querySelector('#bamview-region-start');
        this.endInput = this.shadowRoot.querySelector('#bamview-region-end');
        this.geneNameInput = this.shadowRoot.querySelector('#gene-name-input');
        this.sourceSelect = this.shadowRoot.querySelector('#source-select');
        this.goButton = this.shadowRoot.querySelector('#bamview-controls-go');
        this.searchButton = this.shadowRoot.querySelector('#gene-search-button');
        this.tooltipButton = this.shadowRoot.querySelector('.tooltip-button');
        this.modal = this.shadowRoot.querySelector('#modal');

       
    }

    async connectedCallback() {

        this.broker = getDataBroker(this);

        if (this.broker) {
            const readDepthPromise = new Promise((resolve, reject) => {
              this.broker.addEventListener('read-depth', (evt) => {
                resolve(evt.detail);
              });
            });

            const headerPromise = new Promise((resolve, reject) => {
              this.broker.addEventListener('header', (evt) => {
                resolve(evt.detail);
              });
            });

            this.bamReadDepth = await readDepthPromise;
            this.bamHeader = await headerPromise;
            this.validBamHeader = getValidRefs(this.bamHeader, this.bamReadDepth);
            this.validBamReadDepth = this.getBamReadDepthByValidRefs(this.validBamHeader, this.bamReadDepth);
            this._bamView = createBamView(this.validBamHeader, this.validBamReadDepth, this.bamViewContainer, this.bamViewControls, this.broker);
            this.shadowRoot.querySelector("iobio-loading-indicator").style.display = 'none';
            this.goButton.addEventListener("click", () => this.handleGoClick());
            this.searchButton.addEventListener("click", () => this.handleSearchClick());
            this.setupResizeObserver();
            this.tooltipButton.addEventListener('click', () => this.modal.showModal());
            this.modal.addEventListener('close', () => this.modal.close());
            

            if (this.label) {
                this.shadowRoot.querySelector('#title-text').innerText = this.label;
            }
        }
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
                        this.bamViewContainer.innerHTML = ''; // Clear the current SVG
                        this._bamView = createBamView(this.validBamHeader, this.validBamReadDepth, this.bamViewContainer, this.bamViewControls, this.broker);
                    }
                });
            }, 200);
        });
        this.resizeObserver.observe(this.bamViewContainer);
    }

    disconnectedCallback() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
    }
    
    handleGoClick() {
        let parsedStart, parsedEnd;
        const chromosome = this.chromosomeInput.value.trim();
        const startInput = this.startInput.value.trim();
        const endInput = this.endInput.value.trim();
        const chromosomeNumber = chromosome.replace('chr', '');

        // Validate chromosome number first
        if (!this.isValidChromosome(chromosomeNumber)) {
            alert('Invalid chromosome number');
            return;
        }
        
        // Check if start and end inputs are non-empty before parsing
        if (startInput !== "") {
            parsedStart = parseInt(startInput);
        }
        if (endInput !== "") {
            parsedEnd = parseInt(endInput);
        }

        // Check if only the chromosome is provided and start and end inputs are empty
        if (parsedStart === undefined && parsedEnd === undefined) {
            this._bamView.zoomToChromosome(chromosomeNumber);
        } else if (this.validateInput(parsedStart, parsedEnd)) {
            this._bamView.brushToRegion(this.validBamReadDepth, chromosomeNumber, parsedStart, parsedEnd, null);
        }
    }

    handleSearchClick() {
        const geneName = this.geneNameInput.value.trim().toUpperCase();
        const source = this.sourceSelect.value;
        const build = this.bamHeader[0].length === 249250621 ? 'GRCh37' : 'GRCh38';

        if (geneName) {
            this.fetchGeneInfo(geneName, source, 'homo_sapiens', build);
        }
    }

    async fetchGeneInfo(geneName, source, species, build) {
        try {
            const response = await fetch(`https://backend.iobio.io/geneinfo/${geneName}?source=${source}&species=${species}&build=${build}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            if (!data[0] || data[0].chr === undefined) {
                alert(`Gene ${geneName} is not in ${source} for build ${build}`);
                return;
            }
            const chr = data[0].chr.replace('chr', '');
            const start = parseInt(data[0].start);
            const end = parseInt(data[0].end);
            this._bamView.brushToRegion(this.validBamReadDepth, chr, start, end, geneName);
        } catch (error) {
            console.error('Error fetching gene information:', error);
            alert('Failed to fetch gene information');
        }
    }

    isValidChromosome(chromosomeNumber) {
        const validChromosomes = new Set(this.validBamHeader.map(header => header.sn.replace('chr', '')));
        return validChromosomes.has(chromosomeNumber);
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
        if (start < 0 || end < 0) {
            alert('Start and end positions must be positive');
            return false;
        }
        return true;
    }
    
}

window.customElements.define('iobio-coverage-depth', BamViewChart);
export { BamViewChart };
