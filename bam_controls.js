import { commonCss } from '../../common.js';
const template = document.createElement('template');
template.innerHTML = `
<style>
${commonCss}
#bamview-controls {
    display: flex;
    flex-wrap: wrap;    
    align-items: center;
    gap: 10px 30px;
    padding: 10px 0;
    justify-content: start;
}

.bamview-control-container,
.bedfile-control-container {
    display: flex;
    align-items: center; 
    gap: 10px;
    padding: 5px 10px;
    border-radius: 15px;
    border: 1px solid #ccc;
    justify-content: space-between; 
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
}

.input-group i, .input-group input, .input-group span {
    align-self: center;
    border: none; 
}

.input-group input {
    outline: none;
}

.input-group i {
    color: grey;
}

select {
    border: 1px solid #ccc;
    border-radius: 15px;
    background: white;
    cursor: pointer;
    height: 25.5px;
}

select:focus {
    outline: none;
}

button {
    background-color: #2d8fc1;
    color: white;
    border: none;
    padding: 5px 10px;
    border-radius: 15px; 
    cursor: pointer;
    width: 70px;
    text-align: center;
}

button:hover {
    background-color: #2d8fc1;
    transform: scale(1.05);
}

#file-button-row {
    display: flex;
    align-items: center;
    gap: 10px;
}

</style>
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
                <select id="source-select">
                    <option value="gencode" selected>gencode</option>
                    <option value="refseq">refseq</option>
                </select>
            </div>
            <button id="gene-search-button">Search</button>
        </div>
        <div class="bedfile-control-container">
            <div id="file-button-row">
                <div id="default-bedfile-button-grch37" class="file-selection-button" title="1000G human exome targets file">
                    GRCh37 Exonic Regions
                </div>
                <div id="default-bedfile-button-grch38" class="file-selection-button" title="1000G human exome targets file">
                    GRCh38 Exonic Regions
                </div>
                <iobio-file-picker label="Custom Bed" title="Add Bed format capture target definition file"></iobio-file-picker>
            </div>
            <button id="remove-bedfile-button">Remove</button>
        </div>
    </div>
`;

class BamControls extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(template.content.cloneNode(true));
        this.initDOMElements();
    }

    initDOMElements() {
        this.goButton = this.shadowRoot.querySelector('#bamview-controls-go');
        this.searchButton = this.shadowRoot.querySelector('#gene-search-button');
        this.chromosomeInput = this.shadowRoot.querySelector('#bamview-region-chromosome');
        this.startInput = this.shadowRoot.querySelector('#bamview-region-start');
        this.endInput = this.shadowRoot.querySelector('#bamview-region-end');
        this.geneNameInput = this.shadowRoot.querySelector('#gene-name-input');
        this.sourceSelect = this.shadowRoot.querySelector('#source-select');

        this.defaultBedFileGRCh37 = this.shadowRoot.querySelector('#default-bedfile-button-grch37');
        this.defaultBedFileGRCh38 = this.shadowRoot.querySelector('#default-bedfile-button-grch38');
        this.removeBedFile = this.shadowRoot.querySelector('#remove-bedfile-button');
        this.filePicker =  this.shadowRoot.querySelector('iobio-file-picker');

        this.goButton.addEventListener('click', () => this.handleGoClick());
        this.searchButton.addEventListener('click', () => this.handleSearchClick());
    }

    async connectedCallback() {
        this.defaultBedFileGRCh37.addEventListener("click", () => this.handleBedfileClick('addGRCh37BedFile', this.defaultBedFileGRCh37));
        this.defaultBedFileGRCh38.addEventListener("click", () => this.handleBedfileClick('addGRCh38BedFile', this.defaultBedFileGRCh38));
        this.removeBedFile.addEventListener("click", () => this.handleBedfileRemove('bedFileRemoved'));
         // Add an event listener from the FilePicker
         this.filePicker.addEventListener('file-selected', () => {
            this.clearActiveButtons();
            this.filePicker.shadowRoot.querySelector('label').classList.add('active');
        });
    }

    handleGoClick() {
        const chromosome = this.chromosomeInput.value.trim();
        const start = this.startInput.value.trim();
        const end = this.endInput.value.trim();

        const event = new CustomEvent('go-click', {
            detail: { chromosome, start, end },
            bubbles: true, 
            composed: true
        });
        this.dispatchEvent(event);
    }

    handleSearchClick() {
        const geneName = this.geneNameInput.value.trim().toUpperCase();;
        const source = this.sourceSelect.value;

        const event = new CustomEvent('search-click', {
            detail: { geneName, source },
            bubbles: true,
            composed: true
        });
        this.dispatchEvent(event);
    }

    handleBedfileClick(message, buttonElement) {
        this.clearActiveButtons(); // Ensure only one button can be active
        buttonElement.classList.add('active');

        const event = new CustomEvent('default-bedfile-selected', {
            detail: { message },
            bubbles: true,
            composed: true
        });
        this.dispatchEvent(event);
    }

    handleBedfileRemove(message) {
        this.clearActiveButtons();

        const event = new CustomEvent('bedfile-removed', {
            detail: { message },
            bubbles: true,
            composed: true
        });
        this.dispatchEvent(event);
    }

    clearActiveButtons() {
        this.shadowRoot.querySelectorAll('.file-selection-button').forEach(button => {
            button.classList.remove('active');
        });
        this.filePicker.shadowRoot.querySelector('label').classList.remove('active');
    }
}

customElements.define('iobio-bam-controls', BamControls);
export {BamControls};