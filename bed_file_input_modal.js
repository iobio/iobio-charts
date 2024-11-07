const modalTemplate = document.createElement('template');
modalTemplate.innerHTML = `
<style>
.modal {
    background-color: #f0f0f0;
    margin: 20% auto;
    border: 1px solid #888;
    width: 500px;
    border-radius: 5px;
    padding: 20px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.input-container {
    margin-bottom: 10px;
    position: relative;
    display: flex;
    align-items: center;
}

input[type="text"] {
    flex-grow: 1;
    padding: 10px;
    padding-right: 30px;
    border: 1px solid #ccc;
    border-radius: 3px;
    box-sizing: border-box;
}

.custom-file-input {
    display: flex;
    align-items: center;
    width: 100%;
}

.custom-file-input input[type="text"] {
    flex-grow: 1;
    cursor: pointer;
}

.custom-file-input input[type="file"] {
    display: none;
}

.select-file-button {
    background-color: #2d8fc1;
    color: white;
    padding: 8px 15px;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    margin-left: 10px;
    text-align: center;
    white-space: nowrap;
}

input[type="text"]:disabled {
    background-color: #e0e0e0;
    cursor: not-allowed;
}

.delete-icon {
    position: absolute;
    right: 10px;
    cursor: pointer;
    color: #888;
}

.button-container {
    display: flex;
    justify-content: center;
    margin-top: 20px;
}

button {
    background-color: #2d8fc1;
    color: white;
    padding: 8px 15px;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    margin-left: 10px;
    text-align: center;
}

.load-button, .cancel-button {
    width: 70px;
}

::backdrop {
    background-color: rgba(0, 0, 0, 0.4);
}
</style>

<dialog class="modal">
    <div class="input-container">
        <div class="custom-file-input">
            <input id="fileInputText" type="text" placeholder="Select custom bed file" readonly />
            <input id="fileInput" type="file" />
        </div>
        <span class="delete-icon">&#x2715;</span>
    </div>
    <div class="input-container">
        <input id="urlInput" type="text" placeholder="Input custom bed URL" />
        <span class="delete-icon">&#x2715;</span>
    </div>
    <div class="button-container">
        <button class="load-button">Load</button>
        <button class="cancel-button">Cancel</button>
    </div>
</dialog>
`;

class BedFileInputModal extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(modalTemplate.content.cloneNode(true));

        this.modal = this.shadowRoot.querySelector('.modal');
        this.loadButton = this.shadowRoot.querySelector('.load-button');
        this.cancelButton = this.shadowRoot.querySelector('.cancel-button');
        this.deleteIcons = this.shadowRoot.querySelectorAll('.delete-icon');

        this.fileInput = this.shadowRoot.getElementById('fileInput');
        this.fileInput.setAttribute('accept', '.bed');
        this.fileInputText = this.shadowRoot.getElementById('fileInputText');
        this.urlInput = this.shadowRoot.getElementById('urlInput');

        this.addEventListeners();
    }

    addEventListeners() {
        this.loadButton.addEventListener('click', () => this.handleLoad());
        this.cancelButton.addEventListener('click', () => this.close());
        this.deleteIcons.forEach((icon, index) => {
            icon.addEventListener('click', () => this.clearInput(index));
        });
        this.fileInput.addEventListener('change', (e) => this.handleFileInputChange(e));
        this.urlInput.addEventListener('input', () => this.toggleInput('url'));
        this.fileInputText.addEventListener('click', () => this.fileInput.click());
    }

    handleFileInputChange(event) {
        const fileName = event.target.files[0]?.name || 'Select custom bed file';
        this.fileInputText.value = fileName;
        this.toggleInput('file');
    }

    async handleLoad() {
        const file = this.fileInput.files[0];
        const url = this.urlInput.value.trim();
        
        if (!file && !url) {
            alert('Please provide either a local file or a URL!');
            return;
        }

        if (file) {
            // If a file is provided, check its extension
            const fileExtension = file.name.toLowerCase();
            if (!fileExtension.endsWith('.bed')) {
                alert('Only files with the ".bed" extension are allowed.');
                return;
            }

            const reader = new FileReader();
            reader.onload = () => {
                this.dispatchEvent(new CustomEvent('bed-file-selected', {
                    detail: { bedText: reader.result },
                    bubbles: true,
                    composed: true
                }));
                this.close();
            };
            reader.readAsText(file);
        } 
        else if (url) {
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`Failed to fetch BED file: ${response.statusText}`);
                }
                const bedFileContent = await response.text();

                this.dispatchEvent(new CustomEvent('bed-file-selected', {
                    detail: { bedText: bedFileContent },
                    bubbles: true,
                    composed: true
                }));
                this.close();
            } 
            catch (error){
                console.error('Error fetching BED file:', error);
                alert('Error fetching BED file. Please try again.');
            }
        }
    }

    clearInput(index) {
        if (index === 0) {
            this.fileInput.value = '';
            this.fileInputText.value = '';
            this.toggleInput('file');
        } else if (index === 1) {
            this.urlInput.value = '';
            this.toggleInput('url');
        }
    }

    toggleInput(changedInput) {
        if (changedInput === 'file' && this.fileInput.files.length > 0) {
            this.urlInput.disabled = true;
        } else if (changedInput === 'url' && this.urlInput.value.trim().length > 0) {
            this.fileInputText.disabled = true;
        } else {
            this.fileInputText.disabled = false;
            this.urlInput.disabled = false;
        }
    }

    showModal() {
        this.modal.showModal();
    }

    close() {
        this.modal.close();
    }
}

customElements.define('iobio-bed-file-input-modal', BedFileInputModal);
export { BedFileInputModal };