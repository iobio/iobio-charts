import { getDataBroker } from "./common.js";
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

::slotted(iobio-histogram) {
    position: absolute;
    width: 100%;
    height: 100%;
}
</style>
    <div class="iobio-tabs">
        <div class="tabs">
            <span class="tab tab1"></span>  |
            <span class="tab tab2"></span>
        </div>
        <div class="content-container">
            <slot></slot>
        </div>
    </div> 
`;

class IobioTabs extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(tabsTemplate.content.cloneNode(true));
        
    }
  
    connectedCallback() {
        this.broker = getDataBroker(this);
        this.initDOMElements();
        this.initializeTabs();
        // show default histogram 
        this.showChart(0);
    }

    initDOMElements() {
        this.tab1 = this.shadowRoot.querySelector('.tab1');
        this.tab2 = this.shadowRoot.querySelector('.tab2');
        this.tabs = this.shadowRoot.querySelectorAll('.tab');
        this.histograms = Array.from(this.querySelectorAll('iobio-histogram'));
    }

    initializeTabs() {
        this.tab1.textContent = this.getAttribute('label-1');
        this.tab2.textContent = this.getAttribute('label-2');

        this.tabs.forEach((tab, index) => {
            tab.addEventListener('click', () => {
                this.showChart(index);
                this.updateHistogramVisibility(index);
            });
        });
    }

    showChart(index) {
        this.updateTabStyles(index);

        this.broker.onEvent('data-streaming-start', () => {
            this.updateHistogramVisibility(index);
        });
    }

    updateTabStyles(activeIndex) {
        this.tabs.forEach((tab, index) => {
            tab.classList.toggle('active', index === activeIndex);
        });
    }

    updateHistogramVisibility(activeIndex) {
        this.histograms.forEach((histogram, index) => {
            const svgContainer = histogram.shadowRoot.querySelector('.iobio-histogram-svg-container');
            svgContainer.style.visibility = index === activeIndex ? 'visible' : 'hidden';
        });
    }
}

customElements.define('iobio-tabs', IobioTabs);
export {IobioTabs};