const loadingIndicatorTemplate = document.createElement('template');
loadingIndicatorTemplate.innerHTML = `
<style>
    :host {
        --data-color: var(--iobio-data-color, #2d8fc1);
    }
   
    .loading-indicator {
        display: flex;
        align-items: center;
        font-size: 14px;
        color: #2687BE;
        position: absolute;
        top: 50%; 
        left: 50%; 
        transform: translate(-50%, -50%); 
        z-index: 10; 
    }

    .loading-indicator svg {
        height:29px;
        vertical-align: middle;
        margin-left: 5px;
    }
    
    .loading-indicator svg circle {
        fill: var(--data-color);
    }

</style>
    <div class="loading-indicator">
        <span class="label">Default Label</span>
        <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><style>.spinner_S1WN{animation:spinner_MGfb .8s linear infinite;animation-delay:-.8s}.spinner_Km9P{animation-delay:-.65s}.spinner_JApP{animation-delay:-.5s}@keyframes spinner_MGfb{93.75%,100%{opacity:.2}}</style><circle class="spinner_S1WN" cx="4" cy="12" r="3"/><circle class="spinner_S1WN spinner_Km9P" cx="12" cy="12" r="3"/><circle class="spinner_S1WN spinner_JApP" cx="20" cy="12" r="3"/></svg>
    </div>
`;

class LoadingIndicator extends HTMLElement {
    static get observedAttributes() {
        return ['label'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(loadingIndicatorTemplate.content.cloneNode(true));
    }

    connectedCallback() {
        this.updateLabel();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'label') {
            this.updateLabel();
        }
    }

    updateLabel() {
        const labelElement = this.shadowRoot.querySelector('.label');
        labelElement.textContent = this.getAttribute('label') || 'Default Label';
    }
}

customElements.define('iobio-loading-indicator', LoadingIndicator);
export { LoadingIndicator };
