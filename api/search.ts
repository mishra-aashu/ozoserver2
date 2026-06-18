import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow Cross-Origin Requests (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = req.query.q || req.query.slug;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({
      error: 'Missing query parameter. Please provide "q" or "slug" (e.g. ?q=maggi)'
    });
  }

  const url = 'https://www.bigbasket.com/listing-svc/v2/products';
  
  // These headers and cookies are what we extracted to bypass geofencing / PL400 location block.
  const fallbackCookie = '_bb_cid=1; _bb_sa_ids=19224; _bb_cda_sa_info=djIuY2RhX3NhLjEwLjE5MjI0; is_integrated_sa=1; _bb_aid="MjkxMzA4NDUzMA=="; _bb_nhid=7427; _bb_hid=7427; _bb_dsid=7427; _bb_dsevid=7427; is_global=1; bb2_enabled=true; ufi=1; _bb_vid=MTMwMDkyNDE2MjYxOTM5MjQ5NA==; bigbasket.com=b623f16c-2c81-4d29-94a2-29f8cdbd834f; isintegratedsa=true; PWA=1';

  const headers = {
    'accept': '*/*',
    'accept-language': 'en-GB,en;q=0.9,hi-IN;q=0.8,hi;q=0.7,en-US;q=0.6',
    'common-client-static-version': '101',
    'content-type': 'application/json',
    'dnt': '1',
    'osmos-enabled': 'true',
    'priority': 'u=1, i',
    'sec-ch-ua': '"Google Chrome";v="149", "Chromium";v="149", "Not)A;Brand";v="24"',
    'sec-ch-ua-mobile': '?1',
    'sec-ch-ua-platform': '"Android"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'sec-gpc': '1',
    'user-agent': 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36',
    'x-caller': 'bigbasket-pwa',
    'x-channel': 'BB-PWA',
    'x-entry-context': 'bbnow',
    'x-entry-context-id': '10',
    'x-integrated-fc-door-visible': 'false',
    'x-requested-with': 'XMLHttpRequest',
    'x-tracker': 'dfb9a41b-498f-4fe8-bb0d-6e9bff18148c',
    'cookie': process.env.CATALOG_COOKIE || fallbackCookie
  };

  try {
    const response = await axios.get(url, {
      params: {
        type: 'ps',
        slug: query,
        page: 1,
        bucket_id: 36
      },
      headers,
      timeout: 10000
    });

    if (response.status === 204 || !response.data) {
      return res.status(404).json({
        success: false,
        message: `No products found for query: "${query}"`
      });
    }

    const tabs = response.data.tabs || [];
    if (tabs.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No products found for query: "${query}"`
      });
    }

    const products = tabs[0]?.product_info?.products || [];
    const mappedProducts = products.map((prod: any) => {
      const images = prod.images || [];
      // Grab XXL HD image if available, fallback to XL, L, or M
      const imageUrl = images[0] ? (images[0].xxl || images[0].xl || images[0].l || images[0].m || images[0].s) : null;
      
      return {
        id: prod.id,
        name: prod.desc,
        brand: prod.brand?.name || null,
        image_url: imageUrl,
        categories: {
          tlc: prod.category?.tlc_name || null, // Top-level
          mlc: prod.category?.mlc_name || null, // Mid-level
          llc: prod.category?.llc_name || null  // Low-level
        },
        pricing: {
          mrp: prod.pricing?.discount?.mrp || null,
          sp: prod.pricing?.discount?.prim_price?.sp || null
        }
      };
    });

    return res.status(200).json({
      success: true,
      query,
      results_count: mappedProducts.length,
      products: mappedProducts
    });

  } catch (error: any) {
    console.error('Catalog API error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to search product from catalog provider',
      details: error.response?.data || error.message
    });
  }
}
