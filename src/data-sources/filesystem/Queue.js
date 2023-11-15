
/**
 * Queue for requests of a given single value. Requests can use the value
 * and then must return it back to the queue, allowing the next request in
 * the queue to get the value.
 * 
 * @template T
 */
export class Queue {
  /** @type {Promise<T>} */
  valPromise

  /** @param {T} val */
  constructor (val) {
    this.valPromise = Promise.resolve(val)
  }

  /**
   * Requests the queue's value, with the value being passed to the provided
   * `func` callback. The callback must return a promise that resolves to the
   * queue's value, signalling that it is safe for the value to be used by
   * other requests.
   * 
   * Returns a promise that resolves once the callback has finished using the
   * value.
   * 
   * @param {(val: T) => Promise<T>} func
   * @returns {Promise<void>}
   */
  async request (func) {
    this.valPromise = this.valPromise.then(v => func(v))
    await this.valPromise
  }
}
