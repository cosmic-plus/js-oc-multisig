'use_strict'
/**
 * Concatenate records from `callBuilder` call response that pass `options.filter`
 * until `options.limit` is reached, `options.breaker` returns a true value or
 * no more are available.
 * 
 * **Warning**: Please be aware that unlimited loopcall can iterate over the
 * full set of data available on a network, sending thousands of request to the
 * API. Please use it wisely :)
 * 
 * @example
 * const callBuilder = server.transactions().forAccount('GDE...YBX')
 * const allTransactions = await loopcall(callBuilder)
 * const transactionWithoutMemo = await loopcall(callBuilder, {
 *   filter: (tx) => !tx.memo
 * }
 * const thisYearTransactions = await loopcall(callBuilder, {
 *   breaker: (tx) => tx.created_at.substr(0,4) < 2018
 * }
 * 
 * @example
 * const callBuilder = server.operations().order('asc')
 * const 2000firstOperations = await loopcall(callBuilder, { limit: 2000 })
 * const 20firstAccountCreations = await loopcall(callBuilder, {
 *   limit: 20,
 *   filter: (op) => op.type === 'create_account'
 * }
 * 
 * @param {CallBuilder} callBuilder A CallBuilder object
 * @param {Object} [options]
 * @param {integer} [options.limit] The maximum number of record to return
 * @param {function} [options.filter] A function that accept a record argument. It
 *   is called with each fetched record. If it returns a true value, the record
 *   is added to returned records, else it is discarded.
 * @param {function} [options.breaker] A function that accept a record argument.
 *   It is called with each fetched record. If it returns a true value, the loop
 *   ends and the array of the filtered records is returned.
 * @returns {Array} The fetched records
 */
module.exports = async function (callBuilder, options = {}) {
  const callerLimit = options.limit ? Math.min(options.limit, 200) : 200
  const callAnswer = await callBuilder.limit(callerLimit).call()

  if (options.filter || options.breaker) {
    return loopWithBreakpoints(callAnswer, options)
  } else {
    return loop(callAnswer, options.limit)
  }
}

/**
 * Concatenate records from `callAnswer` pages until `limit` is reached or no
 * more are available.
 * 
 * @param {Object} callAnswer A resolved CallBuilder.call() object
 * @param {integer} limit The maximum number of record to return
 * @returns {Array} The fetched records
 */
async function loop (callAnswer, limit) {
  let records = []

  while (callAnswer.records.length) {
    if (limit) {
      const length = records.length + callAnswer.records.length
      if (limit === length) {
        return records.concat(callAnswer.records)
      } else if (length > limit) {
        const splitAt = limit - records.length
        const tailRecords = callAnswer.records.slice(0, splitAt)
        return records.concat(tailRecords)
      }
    }
    records = records.concat(callAnswer.records)
    callAnswer = await callAnswer.next()
  }
  
  return records
}

/**
 * Concatenate records from `callAnswer` pages that pass `options.filter` until
 * `options.limit` is reached, `options.breaker` returns a true value or no more
 * are available.
 * 
 * @param {Object} callAnswer A resolved CallBuilder.call() object
 * @param {Object} [options]
 * @param {integer} [options.limit] The maximum number of record to return
 * @param {function} [options.filter] A function that accept a record argument. It
 *   is called with each fetched record. If it returns a true value, the record
 *   is added to returned records, else it is discarded.
 * @param {function} [options.breaker] A function that accept a record argument.
 *   It is called with each fetched record. If it returns a true value, the loop
 *   ends and the array of the filtered records is returned.
 * @returns {Array} The fetched records
 */
async function loopWithBreakpoints (callAnswer, options) {
  const records = []
  
  while (callAnswer.records.length) {
    for (let index in callAnswer.records) {
      if (options.limit && records.length === options.limit) return records
      const nextRecord = callAnswer.records[index]
      if (options.breaker) {
        const recordTriggerBreak = await options.breaker(nextRecord)
        if (recordTriggerBreak) return records
      }
      if (options.filter) {
        const recordPassTest = await options.filter(nextRecord)
        if (!recordPassTest) continue
      }
      records.push(nextRecord)
    }
    callAnswer = await callAnswer.next()
  }
  
  return records
}
