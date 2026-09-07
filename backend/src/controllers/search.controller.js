import { ApiResponse } from '../utils/ApiResponse.js'
import * as SearchService from '../services/search.service.js'

export async function search(req, res, next) {
  try {
    const data = await SearchService.search({ query: req.query.q, user: req.user })
    ApiResponse.success(res, data)
  } catch (err) { next(err) }
}
