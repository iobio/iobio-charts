import { createBamView} from "./BamViewChart.js";
import { getDataBroker } from '../../common.js';

const template = document.createElement('template');
template.innerHTML = `
<style>
:host {
    width: 100%;
    height: 100%;
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

#chart-container {
    width: 100%;
    height: 100%;
    border: 1px solid #ccc;
    position: relative;
}

.loader {
    border: 8px solid #f3f3f3; 
    border-top: 8px solid #3498db;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 2s linear infinite;
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
}

@keyframes spin {
    0% { transform: translate(-50%, -50%) rotate(0deg); }
    100% { transform: translate(-50%, -50%) rotate(360deg); }
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
    <div id="chart-container">
        <div class="loader"></div>
    </div>
</div>`;


class BamViewChart extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(template.content.cloneNode(true));
    }

    async connectedCallback() {
        const broker = getDataBroker(this);

        if (broker) {

            const readDepthPromise = new Promise((resolve, reject) => {
              broker.onEvent('read-depth', resolve);
            });

            const headerPromise = new Promise((resolve, reject) => {
              broker.onEvent('header', resolve);
            });

            let bamReadDepth = await readDepthPromise;
            let bamHeader = await headerPromise;

            const bamViewContainer = this.shadowRoot.querySelector('#chart-container');
            const bamViewControls = this.shadowRoot.querySelector('#bamview-controls');
            this._bamView = createBamView(bamHeader, bamReadDepth, bamViewContainer, bamViewControls);

            this.shadowRoot.querySelector(".loader").style.display = 'none';

            const goButton = this.shadowRoot.querySelector('#bamview-controls-go');
            const searchButton = this.shadowRoot.querySelector('#gene-search-button');

            goButton.addEventListener("click", () => this.handleGoClick(bamReadDepth, bamHeader));
            searchButton.addEventListener("click", () => this.handleSearchClick(bamHeader, bamReadDepth));
        }
    }
    
    handleGoClick(bamReadDepth, bamHeader) {
        const chromosomeInput = this.shadowRoot.querySelector('#bamview-region-chromosome');
        const startInput = this.shadowRoot.querySelector('#bamview-region-start');
        const endInput = this.shadowRoot.querySelector('#bamview-region-end');

        const chromosome = chromosomeInput.value.trim();
        const start = parseInt(startInput.value.trim());
        const end = parseInt(endInput.value.trim());
        const chromosomeNumber = chromosome.replace('chr', '');

        if (this.validateInput(chromosomeNumber, start, end, bamHeader)) {
            this._bamView.brushToRegion(bamReadDepth, chromosomeNumber, start, end, null);
        }
    }

    handleSearchClick(bamHeader, bamReadDepth) {
        const geneNameInput = this.shadowRoot.querySelector('#gene-name-input');
        const geneName = geneNameInput.value.trim();
        const sourceSelect = this.shadowRoot.querySelector('#source-select');
        const source = sourceSelect.value;
        const build = bamHeader[0].length === 249250621 ? 'GRCh37' : 'GRCh38';

        if (geneName) {
            this.fetchGeneInfo(geneName, source, 'homo_sapiens', build, bamReadDepth);
        }
    }

    async fetchGeneInfo(geneName, source, species, build, bamReadDepth) {
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
            this._bamView.brushToRegion(bamReadDepth, chr, start, end, geneName);
        } catch (error) {
            console.error('Error fetching gene information:', error);
        }
    }

    validateInput(chromosomeNumber, start, end, bamHeader) {
        const validChromosomes = new Set(bamHeader.map(header => header.sn));

        // Check if the chromosome number is valid
        if (!validChromosomes.has(chromosomeNumber)) {
            alert('Invalid chromosome number');
            return false;
        }
        if (isNaN(start) || isNaN(end)) {
            alert('Invalid input');
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

window.customElements.define('bam-view-chart', BamViewChart);
export { BamViewChart };
