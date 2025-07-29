import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ success: 0, message: 'Method not allowed' });
    }

    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ success: 0, message: 'No URL provided' });
    }

    const response = await axios.get(url);
    const html = response.data;

    // メタデータを抽出
    const titleMatch = html.match(/<title>(.*?)<\/title>/);
    const title = titleMatch ? titleMatch[1] : 'No title';

    // const descriptionMatch = html.match(/<meta name="description" content="(.*?)"/);
    // const description = descriptionMatch ? descriptionMatch[1] : 'No description';

    // const imageMatch = html.match(/<meta property="og:image" content="(.*?)"/);
    // const image = imageMatch ? imageMatch[1] : null;

    res.status(200).json({
      success: 1,
      meta: {
        title,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error fetching link data:', error.message);
      res
        .status(500)
        .json({ success: 0, message: 'Failed to fetch link data', error: error.message });
    } else {
      console.error('Error fetching link data:', error);
      res.status(500).json({ success: 0, message: 'Failed to fetch link data' });
    }
  }
}
