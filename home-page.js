const homePageTemplate = document.createElement('template');
homePageTemplate.innerHTML = `
<style>
#main {
    display: flex;
    width: 100%;
    height: 100%;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    margin-left: auto;
    margin-right: auto;
    margin-top: 100px;
}

.title {
    font-size: 28px;
    color: rgb(110,110,110);
    margin-bottom: 30px;
    text-align: center;
}

#info ul {
    list-style-type: none;
    padding: 0;
    text-align: center;
}
    
#info li {
    display: inline;
    margin-right: 10px;
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
    color: #2d8fc1;
}

#marthlabtext {
    position: absolute;
    left: 100px;
    top: 4px;
    font-size: 50px;
}
</style>

<div id="main">
    <div class="title">
        Examine your sequence alignment file in seconds
    </div>
    
    <div class="iobio-file-picker" title="Add Bed format capture target definition file">
        <input type="file" id="file-selection" multiple>
        <label for="file-selection" class="file-selection-button">Custom Bed</label>
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
        <div>for variant files check out <a href="http://vcf.iobio.io">vcf.iobio</a></div>
    </div>
</div>

<div id="marth-lab-footer">
    <div class="logos">
        <div id="marthlabtext">Marthlab</div>
        <img src="../../../images/ustar-ucgd-logo.jpg" style="height:60px;"/>
        <a href="http://www.genetics.utah.edu/">
        <img src="../../../images/genetics_mainlogo3_lrg.png" style="height:50px;position:absolute;right:0px;top:7px"/>
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