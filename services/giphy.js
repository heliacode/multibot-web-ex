import axios from 'axios';

const GIPHY_API_KEY = process.env.GIPHY_API_KEY || '';
const GIPHY_API_BASE = 'https://api.giphy.com/v1/gifs';

/**
 * Search for GIFs on Giphy
 */
export async function searchGifs(query, limit = 25, rating = 'g') {
  if (!GIPHY_API_KEY) {
    throw new Error('GIPHY_API_KEY is not configured');
  }

  try {
    const response = await axios.get(`${GIPHY_API_BASE}/search`, {
      params: {
        api_key: GIPHY_API_KEY,
        q: query,
        limit,
        rating, // g, pg, pg-13, r
        lang: 'en'
      }
    });

    return response.data.data.map(gif => ({
      id: gif.id,
      title: gif.title,
      url: gif.images.original.url,
      previewUrl: gif.images.preview_gif?.url || gif.images.fixed_height_small.url,
      width: parseInt(gif.images.original.width),
      height: parseInt(gif.images.original.height)
    }));
  } catch (error) {
    console.error('Error searching Giphy:', error);
    throw new Error(`Failed to search Giphy: ${error.message}`);
  }
}

/**
 * Get trending GIFs from Giphy
 */
export async function getTrendingGifs(limit = 25, rating = 'g') {
  if (!GIPHY_API_KEY) {
    throw new Error('GIPHY_API_KEY is not configured');
  }

  try {
    const response = await axios.get(`${GIPHY_API_BASE}/trending`, {
      params: {
        api_key: GIPHY_API_KEY,
        limit,
        rating,
        lang: 'en'
      }
    });

    return response.data.data.map(gif => ({
      id: gif.id,
      title: gif.title,
      url: gif.images.original.url,
      previewUrl: gif.images.preview_gif?.url || gif.images.fixed_height_small.url,
      width: parseInt(gif.images.original.width),
      height: parseInt(gif.images.original.height)
    }));
  } catch (error) {
    console.error('Error getting trending GIFs:', error);
    throw new Error(`Failed to get trending GIFs: ${error.message}`);
  }
}

/**
 * Get a random GIF from Giphy
 */
export async function getRandomGif(tag = '', rating = 'g') {
  if (!GIPHY_API_KEY) {
    throw new Error('GIPHY_API_KEY is not configured');
  }

  try {
    const params = {
      api_key: GIPHY_API_KEY,
      rating,
      lang: 'en'
    };
    
    if (tag) {
      params.tag = tag;
    }

    const response = await axios.get(`${GIPHY_API_BASE}/random`, { params });

    if (response.data.data) {
      const gif = response.data.data;
      return {
        id: gif.id,
        title: gif.title,
        url: gif.images.original.url,
        previewUrl: gif.images.preview_gif?.url || gif.images.fixed_height_small.url,
        width: parseInt(gif.images.original.width),
        height: parseInt(gif.images.original.height)
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting random GIF:', error);
    throw new Error(`Failed to get random GIF: ${error.message}`);
  }
}

/**
 * Get a GIF by ID from Giphy
 */
export async function getGifById(gifId) {
  if (!GIPHY_API_KEY) {
    throw new Error('GIPHY_API_KEY is not configured');
  }

  try {
    const response = await axios.get(`${GIPHY_API_BASE}/${gifId}`, {
      params: {
        api_key: GIPHY_API_KEY
      }
    });

    if (response.data.data) {
      const gif = response.data.data;
      return {
        id: gif.id,
        title: gif.title,
        url: gif.images.original.url,
        previewUrl: gif.images.preview_gif?.url || gif.images.fixed_height_small.url,
        width: parseInt(gif.images.original.width),
        height: parseInt(gif.images.original.height)
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting GIF by ID:', error);
    throw new Error(`Failed to get GIF: ${error.message}`);
  }
}

