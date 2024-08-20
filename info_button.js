import { TooltipModal } from '../../modal.js';
const infoButtonTemplate = document.createElement('template');
infoButtonTemplate.innerHTML = `
<style>
    .label-info-button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
    }

    .tooltip-button {
        background-color: #2d8fc1;
        color: white;
        border-radius: 50%;
        cursor: pointer;
    }

</style>
    <div class="label-info-button">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-info-circle tooltip-button" viewBox="0 0 16 16">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
            <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0"/>
        </svg>
    </div>
    <iobio-modal id="modal">
        <slot name="header" slot="header"></slot>
        <slot name="content" slot="content"></slot>
    </iobio-modal> 
`;

class InfoButton extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(infoButtonTemplate.content.cloneNode(true));
        this.initDOMElements();
       
    }

    initDOMElements() {
        this.tooltipButton = this.shadowRoot.querySelector('.tooltip-button');
        this.modal = this.shadowRoot.querySelector('#modal');
        this.label = this.getAttribute('label');
        this.labelPosition = this.getAttribute('icon-position')
        this.headerSlot = this.shadowRoot.querySelector('slot[name="header"]');
    }

    connectedCallback () {
        this.tooltipButton.addEventListener('click', () => this.modal.showModal());
        this.modal.addEventListener('close', () => this.modal.close());
     
        if (this.label) {
            this.addChartLabel();
            this.addModalHeader();
        }
    }

    addChartLabel() {
        const labelDiv = document.createElement('div');
        labelDiv.textContent = this.label;
        labelDiv.classList.add('label-container');
        const container = this.shadowRoot.querySelector('.label-info-button');

        if (this.labelPosition === 'left') {
            container.appendChild(labelDiv);
        } else {
            container.insertBefore(labelDiv, this.tooltipButton);
        }
    }

    addModalHeader() {
        const modalHeader = document.createElement('h4')
        modalHeader.textContent = this.label;
        this.headerSlot.appendChild(modalHeader);
    }
  
}

customElements.define('label-info-button', InfoButton);
export {InfoButton};