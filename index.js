import { PercentBoxElement, createPercentBox } from './percent_box.js';
import { HistogramElement, createHistogram } from './histogram.js';
import { DataBroker } from './data_broker.js';
import { DataBrokerElement } from './data_broker_component.js';
import './coverage/src/BamView-WebComponent.js';
import { Panel } from './panel.js';
import {Tabs, Tab, TabPanel} from './tabs.js';
import { HelpPage } from './help_page.js';
import { initRouter } from './router.js';
import { BamControls } from './bam_controls.js';
import { HomePage } from './home-page.js';


initRouter()

export default {
  PercentBoxElement,
  createPercentBox,
  HistogramElement,
  createHistogram,
  DataBroker,
  DataBrokerElement,
  Panel,
  Tabs,
  Tab,
  TabPanel
};
