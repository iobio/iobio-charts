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

::slotted(*) {
    position: absolute;
    width: 100%;
    height: 100%;
}

::slotted(.hidden) { 
    visibility: hidden;
    z-index: -1;
} 

</style>
    <div class="iobio-tabs">
        <div class="tabs">
            <span class="tab tab1-label"></span>  |
            <span class="tab tab2-label"></span>
        </div>
        <div class="content-container">
            <slot></slot>
        </div>
    </div> 
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