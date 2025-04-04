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
                    numbers above represent chromosomes in the reference genome used and can be selected to view
                    the read coverage in an individual chromosome. Selecting a different chromosome will cause
                    all other metrics in bam.iobio to be recalculated based on reads sampled from that chromosome only.
                    You can also focus on a smaller region by dragging over the region of interest. 
                    The mean coverage across the entire genome or sigle chromosome is shown as a red line.
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

const DEFAULT_OPTIONS = {
    showChartLabel: false,
    showZoomableChart: false,
    showChromosomes: false,
    showAllButton: false,
    showYAxis: true,
    showYAxisLabel: false,
    margin: 0, //px
    padding: 0, //px
    height: 100, //%
    width: 100, //%
}

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
        upgradeProperty(this, 'label'); //Keeping as is for backwards compatability
        upgradeProperty(this, 'options')

        this._regionStart = null;
        this._regionEnd = null;
        this._rname = null;

        this._geneStart = null;
        this._geneEnd = null;
        this._geneName = null;

        this._regionStartGlobal = null;
        this._regionEndGlobal = null;

        this._meanCoverage = null;
    }

    get options() {
        const raw = this.getAttribute('options');
        let parsed = {};
        try {
          parsed = raw ? JSON.parse(raw) : {};
        } catch (e) {
          console.warn('Invalid options JSON', raw);
        }
        //Return the merge of default options and parsed so that we always have the options even if not passed
        return { ...DEFAULT_OPTIONS, ...parsed };
    }

    set options(val) {
        //Sanitize the typing, we expect strings but want to be able to work with the options as a json/object
        const str = typeof val === 'string' ? val : JSON.stringify(val);
        this.setAttribute('options', str);
    }

    //Keeping label as is for backwards compatablility
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
        const opts = this.options;
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

            this.broker.addEventListener('stats-stream-data', (event) => {
                const data = event.detail.coverage_hist;
                let coverageMean = 0;
                for (const coverage in data) {
                    const freq = data[coverage];
                    coverageMean += (coverage * freq);
                }
                this._meanCoverage = Math.floor(coverageMean);
                this._bamView.updateMeanLineAndYaxis(this._meanCoverage);
            });

            // reset state
            this.broker.addEventListener('reset', () => this.resetState());

            document.addEventListener('region-selected', (event) => this.handleGoClick(event.detail));
            document.addEventListener('gene-entered', (event) => this.handleSearchClick(event.detail));

            document.addEventListener('brushed-region-change', (event) => this.handleRegionsInput(event));
            document.addEventListener('selected-gene-change', (event) => this.handleGeneInput(event));
            document.addEventListener('global-brushed-region-change', (event) => {
                this._regionStartGlobal= event.detail.start;
                this._regionEndGlobal = event.detail.end;
            });
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
        this._bamView = createBamView(this.validBamHeader, this.validBamReadDepth, this.bamViewContainer);

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

        // Resize observer to handle resizing of the BAM view chart
        const resizeHandler = () => {
            // Create the BAM view with the new dimensions of the container
            this._bamView = createBamView(this.validBamHeader, this.validBamReadDepth, this.bamViewContainer);
            this._bamView.updateMeanLineAndYaxis(this._meanCoverage);

            // Re-zoom to the region if a region on global view is brushed
            if (this._regionStartGlobal && this._regionEndGlobal) {
                this._bamView.updateBrushedRegion(this._regionStartGlobal, this._regionEndGlobal);
            }

            // Re-zoom to a specific region if a region or gene name on chromosome view is provided
            if (this._rname || this._geneName) {
                const start = this._geneName ? this._geneStart : this._regionStart;
                const end = this._geneName ? this._geneEnd : this._regionEnd;
              
                this._bamView.zoomToChromomsomeRegion(this.validBamReadDepth, this._rname, start, end, this._geneName);
            }
        };

        // Setting up the resize observer
        this.resizeObserver = new ResizeObserver(entries => {
            if (resizeTimeout) clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                entries.forEach(entry => {
                    if (entry.target === this.bamViewContainer) {
                        resizeHandler();
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
        // Store the region values for later use in resize observer
        this._rname = rname;
        this._regionStart = start;
        this._regionEnd = end;

        // Validate chromosome number first
        if (!this.isValidChromosome(rname)) {
            alert('Invalid chromosome number');
            return;
        }

        // Check if only the chromosome is provided and start and end inputs are empty
        if (start === "" && end === "") {
            this._bamView.zoomToChromomsomeRegion(this.validBamReadDepth, rname, null, null, null);
        } else if (this.validateInput(start, end)) {
            this._bamView.zoomToChromomsomeRegion(this.validBamReadDepth, rname , start, end, null);
        }
    }

    handleSearchClick(detail) {
        const { geneName, source } = detail;
        // Store the gene name state for later use in resize observer
        this._geneName = geneName;

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

            const rname = data[0].chr;
            const start = parseInt(data[0].start);
            const end = parseInt(data[0].end);

            this._rname = rname;
            this._geneStart = start;
            this._geneEnd = end;
            this._bamView.zoomToChromomsomeRegion(this.validBamReadDepth, rname, start, end, geneName);

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

    handleRegionsInput(event) {
        const { rname, start, end } = event.detail;
        // Store the region values for later use in resize observer
        this._rname = rname;
        this._regionStart = start;
        this._regionEnd = end;
    }

    handleGeneInput(event) {
        const { geneName } = event.detail;
        // Store the gene name state for later use in resize observer
        this._geneName = geneName;
    }

    resetState() {
        this._rname = null;
        this._regionStart = null;
        this._regionEnd = null;
        this._geneName = null;
        this._geneStart = null;
        this._geneEnd = null;
        this._regionStartGlobal = null;
        this._regionEndGlobal = null;
        this._meanCoverage = null;
    }

    
}

window.customElements.define('iobio-coverage-depth', BamViewChart);
export { BamViewChart };
