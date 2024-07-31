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
        const label1 = this.getAttribute('label-1');
        const label2 = this.getAttribute('label-2');
        const tab1 = this.shadowRoot.querySelector('.tab1');
        const tab2 = this.shadowRoot.querySelector('.tab2');
        tab1.textContent = label1;
        tab2.textContent = label2;
        this.tabs = this.shadowRoot.querySelectorAll('.tab');
        this.histograms = Array.from(this.querySelectorAll('iobio-histogram'));

        this.tabs.forEach((tab, index) => {
            tab.addEventListener('click', () => {
                this.showChart(index);
            });
        });
        this.showChart(0);
    }

    showChart(index) {
        this.tabs.forEach((tab, tabIndex) => {
            if (tabIndex === index) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        this.histograms.forEach((histogram, histIndex) => {
            if (histIndex === index) {
                histogram.style.visibility = 'visible';
            } else {
                histogram.style.visibility = 'hidden';
            }
        });
    }
}

customElements.define('iobio-tabs', IobioTabs);
export {IobioTabs};