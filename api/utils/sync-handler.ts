import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Generic sync handler for all data types
 * Handles both GET (retrieve) and POST (sync/save) operations
 */
export function createSyncHandler(dataType: string) {
  return async (req: VercelRequest, res: VercelResponse) => {
    // GET returns local backup data
    if (req.method === 'GET') {
      return res.status(200).json({ [dataType]: [] });
    }

    // POST syncs data
    if (req.method === 'POST') {
      try {
        const payload = req.body;
        
        // Check if payload contains array data
        if (Array.isArray(payload[dataType])) {
          // In production, save to database here
          return res.status(200).json({ 
            success: true, 
            count: payload[dataType].length 
          });
        }
        
        return res.status(400).json({ 
          error: "Invalid payload: must be array." 
        });
      } catch (err) {
        console.error(`Failed to sync ${dataType}:`, err);
        return res.status(500).json({ 
          error: `Failed to sync ${dataType}` 
        });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  };
}
