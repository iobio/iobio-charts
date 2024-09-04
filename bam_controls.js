import { getDataBroker, commonCss } from '../../common.js';
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

#file-selection {
    display: none;
}

/* Bed file button */
.file-selection-button {
    display: flex;
    align-items: center;
    justify-content: center; 
    text-align: center;
    white-space: nowrap;
    padding: 5px 0px;
    cursor: pointer;
    transition: all 0.3s ease;
    width: 100%;
    height: 100%;
    font-size: 13px;
}

.file-selection-button:hover {
    color: var(--data-color)
}

.file-selection-button.active {
  color: var(--data-color);
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
                <div id="default-bedfile-button" class="file-selection-button" title="1000G human exome targets file">
                    Exonic Regions
                </div>
                <div class="iobio-file-picker" title="Add Bed format capture target definition file">
                    <input type="file" id="file-selection" multiple>
                    <label for="file-selection" class="file-selection-button">Custom Bed</label>
                </div>
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

        this.goButton.addEventListener('click', () => this.handleGoClick());
        this.searchButton.addEventListener('click', () => this.handleSearchClick());

        this.defaultBedFileButton = this.shadowRoot.querySelector('#default-bedfile-button');
       
        this.filePicker = this.shadowRoot.querySelector('#file-selection');
        this.label = this.shadowRoot.querySelector('label');

        this.removeBedFile = this.shadowRoot.querySelector('#remove-bedfile-button');
    }

    async connectedCallback() {
        this.broker = getDataBroker(this);
        if (this.broker) {
            const headerPromise = new Promise((resolve, reject) => {
                this.broker.addEventListener('header', (evt) => {
                  resolve(evt.detail);
                });
              });
        
            this.bamHeader = await headerPromise;
            this.build = this.bamHeader[0].length === 249250621 ? 'GRCh37' : 'GRCh38';
        }
        this.defaultBedFileButton.addEventListener("click", () => this.handleBedfileClick(this.defaultBedFileButton));
        this.filePicker.addEventListener('change', (event) => this.handleBedfilePick(event));
        this.removeBedFile.addEventListener("click", () => this.handleBedfileRemove());
    }

    handleGoClick() {
        const rname = this.chromosomeInput.value.trim();
        const start = this.startInput.value.trim();
        const end = this.endInput.value.trim();

        const event = new CustomEvent('region-selected', {
            detail: { 
                rname: rname,
                start: start, 
                end: end
            },
            bubbles: true, 
            composed: true
        });
        this.dispatchEvent(event);
    }

    handleSearchClick() {
        const geneName = this.geneNameInput.value.trim().toUpperCase();;
        const source = this.sourceSelect.value;

        const event = new CustomEvent('gene-entered', {
            detail: { geneName, source },
            bubbles: true,
            composed: true
        });
        this.dispatchEvent(event);
    }

    async handleBedfileClick(buttonElement) {
        let filePath;

        if (this.build === "GRCh37") {
            filePath = '/files/20130108.exome.targets.bed';
        } else if (this.build === "GRCh38") {
            filePath = '/files/20130108.exome.targets.grch38.bed';
        } else {
            alert('Unable to determine reference genome version.');
            return;
        }

        try {
            const response = await fetch(filePath);
    
            if (!response.ok) {
                throw new Error(`Failed to fetch BED file: ${response.statusText}`);
            }
            const bedFileContent = await response.text();
    
            this.clearActiveButtons();
            buttonElement.classList.add('active');
            const event = new CustomEvent('bed-file-selected', {
                detail: { bedText: bedFileContent },
                bubbles: true,
                composed: true
            });
    
            this.dispatchEvent(event);
        } catch (error) {
            console.error('Error fetching BED file:', error);
            alert('Error fetching BED file. Please try again.');
        }
    }

    handleBedfilePick(event) {
        this.clearActiveButtons();

        const files = event.target.files;
        if (files.length === 1) {
            const file = files[0]

            if (file.name.endsWith('.bed')) {
                const reader = new FileReader();

                reader.onload = (e) => {
                    const bedFileContent = e.target.result;

                    this.dispatchEvent(new CustomEvent('bed-file-selected', { 
                        detail: { bedText: bedFileContent },
                        bubbles: true,
                        composed: true 
                    }));
                };

                // Read the file as text
                reader.readAsText(file); 
            } 
            else {
                alert('Must select a .bed file');
                return;
            }
        }
        else {
            alert('Must select only one .bed file')
            return
        }

        this.label.classList.add('active');
    }

    handleBedfileRemove() {
        this.clearActiveButtons();

        const event = new CustomEvent('bed-file-removed', {
            bubbles: true,
            composed: true
        });
        this.dispatchEvent(event);
    }

    clearActiveButtons() {
        this.shadowRoot.querySelectorAll('.file-selection-button').forEach(button => {
            button.classList.remove('active');
        });
        this.label.classList.remove('active');
    }
}

customElements.define('iobio-bam-controls', BamControls);
export {BamControls};