function parseReadDepthData(rawData) {
  const lines = rawData.split('\n').filter(line => line.trim());
  const groupedData = {};
  let currentGroup = null;

  for (const line of lines) {
      if (line.startsWith('#')) {
          const idRow = line.substr(1).split("\t");
          currentGroup = idRow[0];
          groupedData[currentGroup] = [];
          if (idRow[1]) {
            groupedData[currentGroup].mapped = +idRow[1];
            groupedData[currentGroup].unmapped = +idRow[2];
          }
      } else if (line.startsWith('*')) {
          groupedData.n_no_coor = +line.split("\t")[2];
      } else if (currentGroup !== null) {
          const [offset, reads] = line.trim().split(/\s+/).map(Number);
          groupedData[currentGroup].push({
              offset,
              reads,
              avgCoverage: Math.round(reads / 16384),
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
    const [_, sn, lengthStr] = line.split('\t');
    const length = Number(lengthStr.split(':')[1]);
    const rname = sn.split(':')[1];
    bamHeader.push({
      sn: rname,
      length: length,
      rname: rname,
      // TODO: start should maybe be 1
      start: 0,
      end: length,
    });
  });
  return bamHeader;
}

function parseBedFile(bedText, header) {

  const lines = bedText.split('\n');

  const regions = [];

  for (const line of lines) {
    if (line == "" || line.startsWith("#")) {
      continue;
    }

    const fields = line.split('\t');
    const region = {
      rname: fields[0],
      start: Number(fields[1]),
      end: Number(fields[2]),
    };

    regions.push(region);
  }


  // Create header object for faster lookups than array
  const headerObj = {};
  for (const ref of header) {
    headerObj[ref.rname] = true;
  }

  // Remove leading 'chr' if present
  for (const region of regions) {
    if (headerObj[region.rname]) {
      continue;
    } else {
      const stripped = region.rname.replaceAll('chr', '');
      if (headerObj[stripped]) {
        region.rname = stripped;
      }
    }
  }

  return {
    regions,
  };
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
  parseBedFile,
  getValidRefs,
};
