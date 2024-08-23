import { commonCss } from '../../common.js';
const filePickerTemplate = document.createElement('template');
filePickerTemplate.innerHTML = `
<style>
${commonCss}
.iobio-file-picker {
    width: 100%;
    height: 100%;
}

input {
    display: none;
}
</style>
    <div class="iobio-file-picker">
        <input type="file" id="file-selection" multiple>
        <label for="file-selection" class="file-selection-button">Button label</label>
    </div>
   
`;

class FilePicker extends HTMLElement {
    static get observedAttributes() {
        return ['label'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(filePickerTemplate.content.cloneNode(true));

        const input = this.shadowRoot.querySelector('input');
        const label = this.shadowRoot.querySelector('label');

        // Set the initial label from the attribute
        if (this.hasAttribute('label')) {
            label.textContent = this.getAttribute('label');
        }

        input.addEventListener('change', (event) => {
            const files = event.target.files;
            if (files.length > 0) {
                this.dispatchEvent(new CustomEvent('file-selected', { 
                    detail: { files },
                    bubbles: true,
                    composed: true 
                }));
            }
        });
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'label') {
            this.shadowRoot.querySelector('label').textContent = newValue;
        }
    }
}

customElements.define('iobio-file-picker', FilePicker);
export { FilePicker }
