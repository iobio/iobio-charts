function parseReadDepthData(rawData) {
  const lines = rawData.split('\n').filter(line => line.trim());
  const groupedData = {};
  let currentGroup = null;

  for (const line of lines) {
      if (line.startsWith('#')) {
          const groupNumber = line.split(/\s+/)[0].substring(1); // Extract the first number after #
          currentGroup = groupNumber;
          groupedData[currentGroup] = [];
      } else if (line.startsWith('*')) {
          // If line starts with '*', ignore it and reset currentGroup
          currentGroup = null;
      } else if (currentGroup !== null) {
          const [offset, reads] = line.trim().split(/\s+/).map(Number);
          groupedData[currentGroup].push({
              offset,
              reads,
              avgCoverage_16kbp: Math.round(reads / 16384),
          });
      }
  }

  return groupedData;
}


// parse the bam header data
function parseBamHeaderData(rawData) {
  const bamHeader = [];
  const lines = rawData.split('\n').filter(line => line && line.startsWith('@SQ'));
  lines.forEach(line => {
    const [_, sn, length] = line.split('\t');
    bamHeader.push({
      sn: sn.split(':')[1],
      length: Number(length.split(':')[1])
    });
  });
  return bamHeader;
}

function getValidRefs(header, readDepthData) {
  const refsWithCoverage = Object.keys(readDepthData).filter((key) => {
    // TODO: 1000 is pretty arbitrary
    return readDepthData[key].length > 1000;
  });

  const validRefs = [];
  for (let i = 0; i < refsWithCoverage.length; i++) {
    validRefs.push(header[i]);
  }

  return validRefs;
}

export {
  parseReadDepthData,
  parseBamHeaderData,
  getValidRefs,
};
