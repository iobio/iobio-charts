const server = "https://backend.iobio.io";

async function bamIobioRequest(endpoint, params){
  const response = await fetch(`${server}/${endpoint}`, {
    method: "POST",
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.text();
  return data;
}


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


//get the bam read depth data
async function getBamReadDepth() {
  try {
    const endpoint = "baiReadDepth";
    const params = {
      url: "https://s3.amazonaws.com/iobio/NA12878/NA12878.autsome.bam.bai"
    };
    const data = await bamIobioRequest(endpoint, params);
    return parseReadDepthData(data);
   
  } catch (error) {
    console.error(error);
  } 
}


// get the bam header data
async function getBamHeader() {
  try {
    const endpoint = "alignmentHeader";
    const params = {
      url: "https://s3.amazonaws.com/iobio/NA12878/NA12878.autsome.bam"
    };
    const data = await bamIobioRequest(endpoint, params);
    return parseBamHeaderData(data);
  } catch (error) {
    console.error(error);
  }
}

export { parseReadDepthData, parseBamHeaderData, getBamReadDepth, getBamHeader };
