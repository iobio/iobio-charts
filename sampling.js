const TARGET_BIN_SIZE = 10000;
const SECONDARY_BIN_SIZE = 5000;
const TERTIARY_BIN_SIZE = 2500;
const NUM_SAMPLES = 20;

function sample(inRegions, sampleMultiplier) {

  let idealRegions = [];
  const secondaryRegions = [];
  const tertiaryRegions = [];

  for (const region of inRegions) {
    const length = region.end - region.start;

    if (length >= TARGET_BIN_SIZE) {
      idealRegions.push(region);
    }
    else if (length >= SECONDARY_BIN_SIZE) {
      secondaryRegions.push(region);
    }
    else if (length >= TERTIARY_BIN_SIZE) {
      tertiaryRegions.push(region);
    }
  }

  if (idealRegions.length < NUM_SAMPLES) {
    const expanded = expandRegions(idealRegions);

    if (expanded.length > idealRegions.length) {
      idealRegions = expanded;
    }
  }

  let sampledRegions = [];
  if (sampleMultiplier == undefined) {
    sampledRegions = sampleFromRegions(idealRegions, NUM_SAMPLES, TARGET_BIN_SIZE);
  }

  if (sampleMultiplier > 1) {
    const targetBinSize = TARGET_BIN_SIZE + (TARGET_BIN_SIZE / 4) * sampleMultiplier;
    const numSamples = NUM_SAMPLES + (NUM_SAMPLES / 4) * sampleMultiplier;
    sampledRegions = sampleFromRegions(idealRegions, numSamples, targetBinSize);
  }

  if (sampledRegions.length < NUM_SAMPLES) {
    const remaining = NUM_SAMPLES - sampledRegions.length;
    // readRatio increases the number of regions so we still get the desired number of reads sampled
    const readRatio = Math.floor(TARGET_BIN_SIZE/SECONDARY_BIN_SIZE);
    const batch = sampleFromRegions(secondaryRegions, remaining*readRatio, SECONDARY_BIN_SIZE);
    sampledRegions = [...sampledRegions, ...batch];
  }

  if (sampledRegions.length < NUM_SAMPLES) {
    const remaining = NUM_SAMPLES - sampledRegions.length;
    const readRatio = Math.floor(TARGET_BIN_SIZE/TERTIARY_BIN_SIZE);
    const batch = sampleFromRegions(tertiaryRegions, remaining*readRatio, TERTIARY_BIN_SIZE);
    sampledRegions = [...sampledRegions, ...batch];
  }

  return sampledRegions.sort(function (a, b) {
    if (a.name == b.name) {
      return ((a.start < b.start) ? -1 : ((a.start > b.start) ? 1 : 0));
    }
    else {
      return ((a.name < b.name) ? -1 : ((a.name > b.name) ? 1 : 0));
    }
  });
}

function expandRegions(regions) {

  let expanded = [];

  for (const region of regions) {
    expanded = [...expanded, ...expandRegion(region)];
  }

  return expanded;
}

/**
 * Takes a single region and breaks it into multiple smaller regions of at
 * least TARGET_BIN_SIZE if possible.
 */
function expandRegion(region) {
  const samp = [];
  const length = region.end - region.start;

  if (length <= TARGET_BIN_SIZE) {
    return [region];
  }

  const numPossibleIndices = Math.floor((length - TARGET_BIN_SIZE) / TARGET_BIN_SIZE);


  if (numPossibleIndices < 1000) {
    // Small enough number to guarantee no duplicates
    const possibleIndices = [];
    for (let i=0; i<numPossibleIndices; i++) {
      possibleIndices.push(i*TARGET_BIN_SIZE);
    }

    for (let i=0; i < NUM_SAMPLES && possibleIndices.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * possibleIndices.length);
      const start = possibleIndices.splice(randomIndex, 1)[0];
      samp.push({
        rname: region.rname,
        start,
        end: start + TARGET_BIN_SIZE,
      });
    }
  }
  else {
    for (let i=0; i < NUM_SAMPLES; i++) {
      const randomStart = Math.floor(Math.random() * numPossibleIndices * TARGET_BIN_SIZE);
      samp.push({
        rname: region.rname,
        start: randomStart,
        end: randomStart + TARGET_BIN_SIZE,
      });
    }
  }

  return samp;
}

function sampleFromRegions(inRegions, numSamples, binSize) {

  const regions = [...inRegions];

  const sampledRegions = [];

  for (let i=0; i < numSamples && regions.length > 0; i++) {

    const randomIndex = Math.floor(Math.random() * regions.length);
    const randomRegion = regions.splice(randomIndex, 1)[0];

    const length = randomRegion.end - randomRegion.start;
    const maxOffset = length - binSize;
    const randomStart = randomRegion.start + Math.round(Math.random() * maxOffset);

    if ((randomStart + binSize) > randomRegion.end) {
      throw new Error("Sampling error. This shouldn't happen.");
    }

    sampledRegions.push({
      name: randomRegion.rname,
      start: randomStart,
      end: randomStart + binSize,
    });
  }

  return sampledRegions;
}

export {
  sample
};
