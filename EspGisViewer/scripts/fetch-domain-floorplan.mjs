const REQUEST_TIMEOUT_MS = 20000;

const domainUrl = process.argv[2];
if (typeof domainUrl !== 'string' || domainUrl.length === 0) {
  process.stderr.write('Missing domain url argument.\n');
  process.exit(1);
}

const result = await fetchDomainFloorplans(domainUrl);
process.stdout.write(`${JSON.stringify(result)}\n`);

async function fetchDomainFloorplans(url) {
  try {
    const response = await fetch(url, {
      headers: createRequestHeaders(),
      redirect: 'follow',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      return {
        urls: [],
        statusCode: response.status,
        error: `request failed with status ${response.status}`,
      };
    }

    const html = await response.text();
    const nextData = parseNextDataPayload(html);
    const urls = extractFloorplanUrls(nextData);

    return {
      urls,
      statusCode: 200,
      error: null,
    };
  } catch (error) {
    return {
      urls: [],
      statusCode: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function parseNextDataPayload(html) {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (match === null) {
    throw new Error('Could not find __NEXT_DATA__ in the Domain property page.');
  }

  return JSON.parse(match[1]);
}

function extractFloorplanUrls(nextData) {
  const apolloState = nextData?.props?.pageProps?.__APOLLO_STATE__;
  if (apolloState === null || apolloState === undefined || typeof apolloState !== 'object') {
    return [];
  }

  const urls = [];

  for (const entity of Object.values(apolloState)) {
    if (entity === null || entity === undefined || typeof entity !== 'object' || Array.isArray(entity)) {
      continue;
    }

    for (const [fieldName, fieldValue] of Object.entries(entity)) {
      if (!fieldName.startsWith('media(') || !Array.isArray(fieldValue)) {
        continue;
      }

      for (const mediaItem of fieldValue) {
        if (mediaItem === null || mediaItem === undefined || typeof mediaItem !== 'object') {
          continue;
        }

        if (mediaItem.type !== 'floorplan') {
          continue;
        }

        const floorplanUrl = selectFloorplanUrl(mediaItem);
        if (typeof floorplanUrl === 'string' && floorplanUrl.length > 0) {
          urls.push(floorplanUrl);
        }
      }
    }
  }

  return [...new Set(urls)];
}

function selectFloorplanUrl(mediaItem) {
  const candidates = [];

  if (typeof mediaItem.url === 'string' && mediaItem.url.length > 0) {
    candidates.push({
      url: mediaItem.url,
      score: scoreFloorplanVariant('url', mediaItem.url),
    });
  }

  for (const [key, value] of Object.entries(mediaItem)) {
    if (!key.startsWith('url(') || typeof value !== 'string' || value.length === 0) {
      continue;
    }

    candidates.push({
      url: value,
      score: scoreFloorplanVariant(key, value),
    });
  }

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((left, right) => right.score - left.score);
  return candidates[0].url;
}

function scoreFloorplanVariant(key, url) {
  const resolutionMatch = key.match(/"resolution":\{"height":(\d+),"width":(\d+)\}/);
  if (resolutionMatch !== null) {
    const height = Number.parseInt(resolutionMatch[1], 10);
    const width = Number.parseInt(resolutionMatch[2], 10);

    if (Number.isInteger(height) && Number.isInteger(width)) {
      return height * width;
    }
  }

  const fitInMatch = url.match(/\/fit-in\/(\d+)x(\d+)\//);
  if (fitInMatch !== null) {
    const width = Number.parseInt(fitInMatch[1], 10);
    const height = Number.parseInt(fitInMatch[2], 10);

    if (Number.isInteger(height) && Number.isInteger(width)) {
      return height * width;
    }
  }

  const baseSizeMatch = url.match(/-w(\d+)-h(\d+)(?:$|[^\d])/i);
  if (baseSizeMatch !== null) {
    const width = Number.parseInt(baseSizeMatch[1], 10);
    const height = Number.parseInt(baseSizeMatch[2], 10);

    if (Number.isInteger(height) && Number.isInteger(width)) {
      return height * width;
    }
  }

  return 0;
}

function createRequestHeaders() {
  return {
    'accept-language': 'en-AU,en;q=0.9',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
  };
}
