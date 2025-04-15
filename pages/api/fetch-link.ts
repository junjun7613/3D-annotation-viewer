import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

    const descriptionMatch = html.match(/<meta name="description" content="(.*?)"/);
    const description = descriptionMatch ? descriptionMatch[1] : 'No description';

    const imageMatch = html.match(/<meta property="og:image" content="(.*?)"/);
    const image = imageMatch ? imageMatch[1] : null;

    res.status(200).json({
      success: 1,
      meta: {
        title,
      },
    });
  } catch (error) {
    console.error('Error fetching link data:', error.message);
    res.status(500).json({ success: 0, message: 'Failed to fetch link data', error: error.message });
  }
}