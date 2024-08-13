const tabsTemplate = document.createElement('template');
tabsTemplate.innerHTML = `
<style>
:host {
    --data-color: var(--iobio-data-color, #2d8fc1);
}
.iobio-tabs {
    display: flex;
    flex-direction: column;
}
.tabs {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
}
.tab {
    cursor: pointer;
    text-align: center;
    color: grey;
}
.tab.active {
    color:  var(--data-color);
}

.content-container {
    position: relative;
    width: 100%;
    height: 100%;
}

.content-container .slot-wrapper ::slotted(*) {
    position: absolute;
    width: 100%;
    height: 100%;
}

.content-container .slot-wrapper ::slotted(.hidden) {
    visibility: hidden;
    z-index: -1;
}

</style>
    <div class="iobio-tabs">
        <div class="tabs">
            <iobio-info-button id="info-button-1"></iobio-info-button>
            <span class="tab tab1-label"></span>  |
            <span class="tab tab2-label"></span>
            <iobio-info-button id="info-button-2"></iobio-info-button>
        </div>
        <div class="content-container">
            <div class="slot-wrapper">
                <slot></slot>
            </div>
        </div>
    </div> 
    
    <iobio-modal id="modal-1">
        <slot name="header1" slot="header">Default Header</slot>
        <slot name="content1" slot="content">Default Content</slot>
    </iobio-modal>
    
    <iobio-modal id="modal-2">
        <slot name="header2" slot="header">Default Header</slot>
        <slot name="content2" slot="content">Default Content</slot>
    </iobio-modal>
    
`;

class Tabs extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(tabsTemplate.content.cloneNode(true));
    }
  
    connectedCallback() {
        this.initDOMElements();
        this.initializeTabs();
        this.initializeModals();
        // show default histogram 
        this.showChart(0);
    }

    initDOMElements() {
        this.tab1_label = this.shadowRoot.querySelector('.tab1-label');
        this.tab2_label = this.shadowRoot.querySelector('.tab2-label');
        this.tabs = this.shadowRoot.querySelectorAll('.tab');
        const slot = this.shadowRoot.querySelector('slot');
        this.slottedElements = Array.from(slot.assignedElements());
    }

    initializeTabs() {
        this.tab1_label.textContent = this.getAttribute('label-1');
        this.tab2_label.textContent = this.getAttribute('label-2');

        this.tabs.forEach((tab, index) => {
            tab.addEventListener('click', () => {
                this.showChart(index);
            });
        });
    }

    initializeModals() {
        const infoButton1 = this.shadowRoot.querySelector('#info-button-1');
        const infoButton2 = this.shadowRoot.querySelector('#info-button-2');
        
        const modal1 = this.shadowRoot.querySelector('#modal-1');
        const modal2 = this.shadowRoot.querySelector('#modal-2');
        if (infoButton1 && modal1) {
            infoButton1.addEventListener('click', () => {
                modal1.showModal();
            });
            modal1.addEventListener('close', () => {
                modal1.close();
            });
        }
    
        if (infoButton2 && modal2) {
            infoButton2.addEventListener('click', () => {
                modal2.showModal();
            });
            modal2.addEventListener('close', () => {
                modal2.close();
            });
        }
    }

    showChart(activeIndex) {
        this.tabs.forEach((tab, index) => {
            tab.classList.toggle('active', index === activeIndex);
        });

        this.slottedElements.forEach((element, index) => {
            element.classList.toggle('hidden', index == activeIndex ? false : true);
        });
    }
}

customElements.define('iobio-tabs', Tabs);
export {Tabs};