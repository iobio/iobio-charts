import { commonCss } from '../../common.js';
const homePageTemplate = document.createElement('template');
homePageTemplate.innerHTML = `
<style>
${commonCss}
#main {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    margin-left: auto;
    margin-right: auto;
    margin-top: 100px;
    width: 100%;
    height: 100%;
}

.home-page-title {
    font-size: 28px;
    color: rgb(110,110,110);
    margin-bottom: 30px;
    text-align: center;
}

.file-loading-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 20px;
}

#file-selection {
    display: none;
}

.local-file-input,
.remote-file-input,
.demo-data-input {
    width: 300px;
    height: 60px;
    text-align: center;
    background-color: var(--data-color);
}

.file-selection-button {
    display: flex;
    justify-content: center;
    align-items: center;
    color: white;
    height: 100%;
    font-size: 20px;
    cursor: pointer;
}

#info {
    margin-top: 50px;
}

#info ul {
    list-style-type: none;
    padding: 0;
    text-align: center;
}
    
#info li {
    display: inline;
    margin-right: 50px;
}

.variant-files {
    margin: 50px auto 0px auto;
    font-size: 23px;
    width: 100%;
    text-align: center;
    color: rgb(110,110,110);
}

#marth-lab-footer {
    width: 100%;
    margin-top: 100px;
    padding-bottom: 20px;
}

.logos {
    margin: 0px auto 10px auto;
    width: 1200px;
    text-align: center;
    position: relative;
    height: 60px;
    color: rgb(80,80,80);
}

a {
    color: var(--data-color);
}

#marthlabtext {
    position: absolute;
    left: 100px;
    top: 4px;
    font-size: 50px;
    font-family:'Overlock SC', cursive;
}
</style>

<div id="main">
    <div class="home-page-title">
        Examine your sequence alignment file in seconds
    </div>

    <div class="file-loading-container">
        <div class="local-file-input">
            <input type="file" id="file-selection" multiple>
            <label for="file-selection" class="file-selection-button">LOCAL BAM/CRAM FILE</label>
        </div>

        <div class="remote-file-input">
            <div class="file-selection-button">REMOTE BAM/CRAM FILE</div>
        </div>

        <div class="demo-data-input">
            <div class="file-selection-button">LAUNCH WITH DEMO DATA</div>
        </div>
    </div>
   

    <div id="info">
        <ul>
            <li><a href="http://www.nature.com/nmeth/journal/v11/n12/full/nmeth.3174.html">Publication</a></li>
            <li><a href="#file-requirements">File Requirements</a></li>
            <li><a href="#license">License</a></li>
            <li><a href="#browser-compatibility">Compatible Browsers</a></li>
        </ul>
    </div>

    <div class="variant-files">
        <div>For variant files check out <a href="http://vcf.iobio.io">vcf.iobio</a></div>
    </div>
</div>

<div id="marth-lab-footer">
    <div class="logos">
        <div id="marthlabtext">Marthlab</div>
        <img src="/images/ustar-ucgd-logo.jpg" style="height:60px;"/>
        <a href="http://www.genetics.utah.edu/">
        <img src="/images/genetics_mainlogo3_lrg.png" style="height:50px;position:absolute;right:0px;top:7px"/>
        </a>
    </div>
</div>
`;

class HomePage extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(homePageTemplate.content.cloneNode(true));
  }
}

customElements.define('iobio-home-page', HomePage);
export { HomePage }