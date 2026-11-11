import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { SearchService } from '../services/SearchService';
import { authContext } from '../utils/authContext';

interface SearchQuery {
  q: string;
}

/**
 * HTTP adapter for global search.
 */
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  public search = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const { q } = req.query as unknown as SearchQuery;
    const results = await this.searchService.search(userId, q);
    res.status(200).json({ results });
  });
}
