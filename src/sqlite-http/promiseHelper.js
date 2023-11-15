
class PromiseHelper {
  constructor () {
    this.resolve = null
    this.reject = null
  }

  resolve (value) {
    this.resolve(value)
  }

  reject (err) {
    this.reject(err)
  }
}

export function makePromiseHelper () {
  const helper = new PromiseHelper()
  const promise = new Promise((resolve, reject) => {
    helper.resolve = resolve
    helper.reject = reject
  })

  return { helper, promise }
}