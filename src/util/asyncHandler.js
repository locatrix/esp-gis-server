import express from 'express'

/**
 * @param {(req: express.Request, res: express.Response, next?: express.NextFunction) => Promise<any>} func
 * @returns {(req: express.Request, res: express.Response, next: express.NextFunction) => void}
 */
export function asyncHandler (func) {
  return (req, res, next) => {
    func(req, res, next).catch(next)
  }
}
