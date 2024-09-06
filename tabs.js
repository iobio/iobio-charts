const template = document.createElement('template');
template.innerHTML = `
    <style>
    :host {
        --data-color: var(--iobio-data-color, #2d8fc1);
    }

    .tab-panel-container {
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        width: 100%;
        height: 100%;
    }

    .tabs {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        gap: 10px;
    }

    .panels {
        position: relative;
        width: 100%;
        height: 100%;
    }

    ::slotted(iobio-tab) {
       outline: none;
       cursor: pointer;
       text-align: center;
       color: grey;
    }

    ::slotted(iobio-tab[selected]) {
        color: var(--data-color);
    }

    .panels ::slotted(.hidden-panel) {
        position: absolute;
        visibility: hidden;
        z-index: -1;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
    }
    
    </style>
        <div class="tab-panel-container">
            <div class="tabs">
                <slot name="tab"></slot>
            </div>
            <div class="panels">
                <slot name="panel"></slot>
            </div>
        </div>
`;

/**
 * This code is derived from 'components-howto-tabs'
 * The link: https://web.dev/articles/components-howto-tabs
 */
class Tabs extends HTMLElement {
    constructor() {
        super();
        this._onSlotChange = this._onSlotChange.bind(this);
        this.attachShadow({mode: 'open'});
        this.shadowRoot.appendChild(template.content.cloneNode(true));

        this._tabSlot = this.shadowRoot.querySelector('slot[name=tab]');
        this._panelSlot = this.shadowRoot.querySelector('slot[name=panel]');
        this._tabSlot.addEventListener('slotchange', this._onSlotChange);
        this._panelSlot.addEventListener('slotchange', this._onSlotChange);
    }
    
    connectedCallback() {
        this.addEventListener('click', this._onClick);

        if (!this.hasAttribute('role')) {
            this.setAttribute('role', 'tablist');
        }

        this._addSeparators();
    }


    disconnectedCallback() {
        this.removeEventListener('click', this._onClick);
    }

    /**
     * `_onSlotChange()` is called whenever an element is added or removed from
     * one of the shadow DOM slots.
     */
    _onSlotChange() {
        this._linkPanels();
    }

    /**
     * `_linkPanels()` links up tabs with their adjacent panels using
     * `aria-controls` and `aria-labelledby`. Additionally, the method makes
     * sure only one tab is active.
     */
    _linkPanels() {
        const tabs = this._allTabs();
        // Give each panel a `aria-labelledby` attribute that refers to the tab
        // that controls it.
        tabs.forEach(tab => {
            const tabContent = tab.querySelector('[slot="tab-content"]');
            if (!tabContent) {
                console.error(`Tab #${tab.id} does not have a [slot="tab-content"] element.`);
                return;
            }

            const panel = tab.nextElementSibling;
            if (panel.tagName.toLowerCase() !== 'iobio-tab-panel') {
            console.error(`Tab #${tab.id} is not a` +
                `sibling of a <iobio-tab-panel>`);
            return;
            }

            tab.setAttribute('aria-controls', panel.id);
            panel.setAttribute('aria-labelledby', tab.id);
        });

        // The element checks if any of the tabs have been marked as selected.
        // If not, the first tab is now selected.
        const selectedTab =
            tabs.find(tab => tab.selected) || tabs[0];
            this._selectTab(selectedTab);
    }

    _allPanels() {
        return Array.from(this.querySelectorAll('iobio-tab-panel'));
    }

    _allTabs() {
        return Array.from(this.querySelectorAll('iobio-tab'));
    }

    _panelForTab(tab) {
        const panelId = tab.getAttribute('aria-controls');
        return this.querySelector(`#${panelId}`);
    }

    reset() {
        const tabs = this._allTabs();
        const panels = this._allPanels();

        tabs.forEach(tab => tab.selected = false);
        panels.forEach(panel => panel.classList.add('hidden-panel'));
    }

    _selectTab(newTab) {
        // Deselect all tabs and hide all panels.
        this.reset();

        // Get the panel that the `newTab` is associated with.
        const newPanel = this._panelForTab(newTab);
        // If that panel doesn’t exist, abort.
        if (!newPanel)
            throw new Error(`No panel with id ${newPanelId}`);

        // Find the tab content element
        const newTabContent = newTab.querySelector('[slot="tab-content"]');
        if (!newTabContent) {
            console.error(`Tab #${newTab.id} does not have a [slot="tab-content"] element.`);
            return;
        }

        newTab.selected = true;
        newPanel.classList.remove('hidden-panel');
        // newTab.focus();
    }

    _onClick(event) {
        const tabContent = event.target.closest('[slot="tab-content"]');
        if (tabContent) {
            this._selectTab(tabContent.closest('iobio-tab'));
        }
    }

    _addSeparators() {
        const tabs = this.querySelectorAll('iobio-tab');
        tabs.forEach((tab, index) => {
            // Skip the last tab
            if (index < tabs.length - 1) {
                const separator = document.createElement('span');
                separator.textContent = '|';
                separator.style.margin = '0 10px';
                separator.style.color = 'grey';
                tab.appendChild(separator);
            }
        });
    }
}
customElements.define('iobio-tabs', Tabs);

let TabCounter = 0;
class Tab extends HTMLElement {
    static get observedAttributes() {
        return ['selected'];
    }

    constructor() {
        super();
    }

    connectedCallback() {
        // If this is executed, JavaScript is working and the element
        // changes its role to `tab`.
        this.setAttribute('role', 'tab');
        if (!this.id)
            this.id = `iobio-tab-generated-${TabCounter++}`;

        // Set a well-defined initial state.
        this.setAttribute('aria-selected', 'false');
        this.setAttribute('tabindex', -1);
        this._upgradeProperty('selected');
    }

    _upgradeProperty(prop) {
        if (this.hasOwnProperty(prop)) {
            let value = this[prop];
            delete this[prop];
            this[prop] = value;
        }
    }

    attributeChangedCallback() {
        const value = this.hasAttribute('selected');
        this.setAttribute('aria-selected', value);
        this.setAttribute('tabindex', value ? 0 : -1);
    }

    set selected(value) {
        value = Boolean(value);
        if (value)
            this.setAttribute('selected', '');
        else
            this.removeAttribute('selected');
    }

    get selected() {
        return this.hasAttribute('selected');
    }
}
customElements.define('iobio-tab', Tab);


let PanelCounter = 0;
class TabPanel extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.setAttribute('role', 'tabpanel');
        if (!this.id)
            this.id = `iobio-tab-panel-generated-${PanelCounter++}`;
    }
}
customElements.define('iobio-tab-panel', TabPanel);

export {Tabs, Tab, TabPanel}



  
  
  