import { PercentBoxElement, createPercentBox } from './percent_box.js';
import { HistogramElement, createHistogram } from './histogram.js';
import { DataBroker, FILE_FORMAT_BAM, FILE_FORMAT_CRAM } from './data_broker.js';
import { DataBrokerElement } from './data_broker_component.js';
import './coverage/src/BamView-WebComponent.js';
import { Panel } from './panel.js';
import {Tabs, Tab, TabPanel} from './tabs.js';
import { BamControls } from './bam_controls.js';

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
  TabPanel,
  FILE_FORMAT_BAM,
  FILE_FORMAT_CRAM,
};
