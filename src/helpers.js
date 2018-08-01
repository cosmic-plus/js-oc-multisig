'use strict'
/**
 * Various independent helpers.
 *
 * @exports helpers
 */
const helpers = exports

/**
 * Return a promise that takes `x` seconds to resolve
 *
 * @param {number} x Time to wait
 * @return {Promise}
 */
helpers.timeout = function (x) {
  return new Promise(function (resolve) { setTimeout(resolve, x) })
}

/**
 * Return shortified `string` if longer than 30 characters; else return
 * `string`.
 *
 * @param {string}
 * @return {string}
 */
helpers.shorter = function (string) {
  if (string.length > 50) {
    return string.substr(0, 5) + '...' + string.substr(-5)
  } else {
    return string
  }
}
