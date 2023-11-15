
/** @typedef {any} ParsedQs */

/**
 * @param {string | string[] | ParsedQs | ParsedQs[]} param
 * @returns {string}
 */
export function normalizeQueryParam (param) {
  if (param == null) {
    return null
  }

  if (typeof param === 'string') {
    return param
  } else {
    return param.join(',')
  }
}
