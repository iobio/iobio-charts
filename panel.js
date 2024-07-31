const panelTemplate = document.createElement('template');
panelTemplate.innerHTML = `
<style>
.iobio-panel {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    background-color: var(--iobio-background-color);
    padding: 5px;
    border: 1px solid rgb(230,230,230);
    border-radius: 2pt;
    text-align: center;
    box-sizing: border-box;
}
</style>
    <div class="iobio-panel">
        <slot></slot>
    </div> 
`;

class IobioPanel extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(panelTemplate.content.cloneNode(true));
    }
  
}

customElements.define('iobio-panel', IobioPanel);
export {IobioPanel};