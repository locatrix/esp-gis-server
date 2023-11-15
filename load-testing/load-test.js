import { loadTest } from 'loadtest'

// This script runs a load test for fetching tiles via WMTS, with increasingly
// higher amounts of concurrency. Note that the URL generation randomly
// creates URLs for areas within NSW - if load testing with other data sources
// you will need to change the parameters used for `randBetween()` calls to
// fall within your data's area.

console.log('load testing server at', process.argv[2])
console.log('concurrency,numRequests,duration,rps,p50,p90,p99')

function randBetween (min, max) {
  return Math.round(min + Math.random() * (max - min))
}

async function main () {
  for (let concurrency = 1; concurrency < 100; concurrency += 5) {
    let results = []
    for (let i = 0; i < 3; ++i) {
      const options = {
        url: process.argv[2],
        concurrency,
        maxRequests: concurrency * 10,
        requestGenerator: (params, options, client, callback) => {
          options.path = `/wmts/LocatrixESPCoverage/20/${randBetween(935024, 969432)}/${randBetween(612736, 641940)}.png`
          const request = client(options, callback)
          request.write('')
          return request
        }
      }

      const result = await loadTest(options, undefined)

      results.push([
        concurrency,
        concurrency * 10,
        result.totalTimeSeconds,
        result.effectiveRps,
        result.percentiles['50'],
        result.percentiles['90'],
        result.percentiles['99']
      ])
    }

    let totals = []
    for (let i = 0; i < results[0].length; ++i) {
      let total = 0
      for (let r of results) {
        total += r[i]
      }
      totals.push(total)
    }

    const avg = totals.map(t => t / results.length)

    console.log(avg.join(','))
  }
}

main()