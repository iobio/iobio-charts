import { createBamView} from "./BamViewChart.js";
import { getBamReadDepth, getBamHeader } from "./BamData";


const template = document.createElement('template');
template.innerHTML = `
<link rel="stylesheet" href="/node_modules/@fortawesome/fontawesome-free/css/all.min.css">
<style>
    :host {
        width: 100%;
        height: 100%;
    }

    #content-container {
        width: 100%;
        height: 100%;
    }

    #bamview {
        width: 100%;
        height: 100%;
    }
  
    #bamview-controls {
        display: flex;
        flex-wrap: wrap;    
        gap: 10px;
        align-items: center;
        margin-top: 15px;
        margin-bottom: 15px;
        overflow: hidden;
    
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
    
    #gene-search-container {
        margin-left: 30px;
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
        overflow: hidden;
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
<div id="content-container">
    <div id="bamview">
        <div id="bamview-controls">
            <div id="baview-controls-chromosome-region" class="input-group">
                <i class="fa fa-search-plus"></i>
                <input type="text" id="bamview-region-chromosome" placeholder="chr1">
                <span>:</span>
                <input type="text" id="bamview-region-start" placeholder="Start">
                <span>-</span>
                <input type="text" id="bamview-region-end" placeholder="End">
            </div>
            <button id="bamview-controls-go">Go</button>
            <div id="gene-search-container" class="input-group">
                <i class="fa fa-search"></i>
                <input type="text" id="gene-name-input" placeholder="Gene name">
            </div>
            <select id="source-select">
                <option value="gencode" selected>gencode</option>
                <option value="refseq">refseq</option>
            </select>
            <button id="gene-search-button">Search</button>
        </div>
        <div id="chart-container">
            <div class="loader"></div>
        </div>
    </div>
</div>`;


class BamViewChart extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(template.content.cloneNode(true));
    }

    async connectedCallback() {
        let bamReadDepth = await getBamReadDepth();
        let bamHeader = await getBamHeader();

        const bamViewContainer = this.shadowRoot.querySelector('#chart-container');
        const bamViewControls = this.shadowRoot.querySelector('#bamview-controls');
        this._bamView = createBamView(bamHeader, bamReadDepth, bamViewContainer, bamViewControls);

        this.shadowRoot.querySelector(".loader").style.display = 'none';

        const goButton = this.shadowRoot.querySelector('#bamview-controls-go');
        const searchButton = this.shadowRoot.querySelector('#gene-search-button');

        goButton.addEventListener("click", () => this.handleGoClick(bamReadDepth, bamHeader));
        searchButton.addEventListener("click", () => this.handleSearchClick(bamHeader, bamReadDepth));
    }
    
    handleGoClick(bamReadDepth, bamHeader) {
        const chromosomeInput = this.shadowRoot.querySelector('#bamview-region-chromosome');
        const startInput = this.shadowRoot.querySelector('#bamview-region-start');
        const endInput = this.shadowRoot.querySelector('#bamview-region-end');

        const chromosome = chromosomeInput.value.trim();
        const start = parseInt(startInput.value.trim());
        const end = parseInt(endInput.value.trim());
        const chromosomeNumber = parseInt(chromosome.replace('chr', ''));

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
            const chr = parseInt(data[0].chr.replace('chr', ''));
            const start = parseInt(data[0].start);
            const end = parseInt(data[0].end);
            this._bamView.brushToRegion(bamReadDepth, chr, start, end, geneName);
        } catch (error) {
            console.error('Error fetching gene information:', error);
        }
    }

    validateInput(chromosomeNumber, start, end, bamHeader) {
        if (isNaN(chromosomeNumber) || isNaN(start) || isNaN(end)) {
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
        if (chromosomeNumber > bamHeader.length || chromosomeNumber < 1) {
            alert('Invalid chromosome number');
            return false;
        }
        return true;
    }
}

window.customElements.define('bam-view-chart', BamViewChart);
export { BamViewChart };