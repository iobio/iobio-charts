const modalTemplate = document.createElement('template');
modalTemplate.innerHTML = `
  <style>
    .modal {
      background-color: #fefefe;
      margin: 15% auto;
      border: 1px solid #888;
      width: 70%;
      border-radius: 10px;
      padding: 0;
    }

    .modal-header,
    .modal-footer {
      display: flex;
      align-items: center;
      height: 60px;
      padding: 0 20px;
      box-sizing: border-box;
    }

    .modal-header {
      justify-content: space-between;
      border-bottom: 1px solid #ddd;
    }

    .modal-footer {
      justify-content: flex-end;
      border-top: 1px solid #ddd;
    }

    .modal-header {
      margin: 0;
      font-size: 18px;
      font-weight: 500;
    }

    .modal-body {
      text-align: justify;
      padding: 0 30px;
      font-size: 13px;
      max-height: 200px;
      line-height: 1.5;
      width: 100%;
      box-sizing: border-box;
      word-wrap: break-word;
      white-space: normal;
      overflow: auto;
    }

    ::backdrop {
      background-color: rgba(0, 0, 0, 0.4);
    }

    .close-icon {
      color: #aaa;
      float: right;
      font-size: 20px;
      font-weight: bold;
    }

    .close-icon:hover,
    .close-icon:focus {
      color: black;
      text-decoration: none;
      cursor: pointer;
    }

    button {
      background-color: #2d8fc1;
      color: white;
      border: none;
      padding: 5px 15px;
      border-radius: 20px; 
      cursor: pointer;
      outline: none;
    }
    
    button:hover {
        background-color: #2d8fc1;
        transform: scale(1.05);
    }

  </style>
    <dialog class="modal">
      <div class="modal-header">
        <slot name="header">
          <div>Default Title</div>
        </slot>
        <span class="close-icon">&times;</span>
      </div>
      <div class="modal-body">
        <slot name="content">
          <p>Default content...</p>
        </slot>
      </div>
      <div class="modal-footer">
        <button class="close-button">Close</button>
      </div>
    </dialog>
`;

class TooltipModal extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.appendChild(modalTemplate.content.cloneNode(true));
  
      this.modal = this.shadowRoot.querySelector('.modal');
      this.closeIcon = this.shadowRoot.querySelector('.close-icon');
      this.closeButton = this.shadowRoot.querySelector('.close-button');
      this.addCloseEventListener();
    }
  
    addCloseEventListener() {
      this.closeIcon.addEventListener('click', () => {
          this.dispatchEvent(new CustomEvent('close')); 
      });

      this.closeButton.addEventListener('click', () => {
          this.dispatchEvent(new CustomEvent('close'));
      });

      this.modal.addEventListener('click', (event) => {
        if (event.target === this.modal) {
            this.dispatchEvent(new CustomEvent('close'));
        }
      });
    }

    showModal() {
      this.modal.showModal();
    }

    close() {
      this.modal.close();
    }
}

customElements.define('iobio-modal', TooltipModal);
export {TooltipModal};
