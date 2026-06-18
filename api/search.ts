import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow Cross-Origin Requests (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = req.query.q || req.query.slug;
  const provider = (req.query.provider as string || 'bigbasket').toLowerCase();

  if (!query || typeof query !== 'string') {
    return res.status(400).json({
      error: 'Missing query parameter. Please provide "q" or "slug" (e.g. ?q=maggi)'
    });
  }

  if (provider === 'zepto') {
    // --- ZEPTO PROVIDER ---
    const url = 'https://bff-gateway.zepto.com/user-search-service/api/v3/search';
    const session_id = generateUUID();
    const device_id = generateUUID();
    const store_id = (req.query.store_id as string) || (req.query.storeid as string) || 'b4dc8d65-ed2e-4142-81b6-373982b13500';

    const payload = {
      query: query,
      pageNumber: 0,
      mode: 'SHOW_ALL_RESULTS'
    };

    const headers = {
      'accept': 'application/json, text/plain, */*',
      'accept-language': 'en-GB,en;q=0.9,hi-IN;q=0.8,hi;q=0.7,en-US;q=0.6',
      'content-type': 'application/json',
      'origin': 'https://www.zepto.com',
      'referer': 'https://www.zepto.com/',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'x-source-identifier': 'zepto-customer-web',
      'compatible_components': 'EXTERNAL_COUPONS,BUNDLE,MULTI_SELLER_ENABLED',
      'sessionid': session_id,
      'session_id': session_id,
      'deviceid': device_id,
      'device_id': device_id,
      'platform': 'web',
      'app_sub_platform': 'web',
      'app_version': '15.0.0',
      'appversion': '15.0.0',
      'tenant': 'ZEPTO',
      'source': 'web',
      'storeid': store_id
    };

    try {
      const response = await axios.post(url, payload, { headers, timeout: 10000 });
      
      const layout = response.data?.layout || [];
      const mappedProducts: any[] = [];

      for (const widget of layout) {
        if (widget.widgetId === 'PRODUCT_GRID') {
          const items = widget.data?.resolver?.data?.items || [];
          for (const item of items) {
            const prodRes = item.productResponse;
            if (!prodRes) continue;

            const prod = prodRes.product || {};
            const variant = prodRes.productVariant || {};
            const primaryImage = variant.images?.[0]?.path || '';
            const imageUrl = primaryImage ? `https://cdn.zeptonow.com/production/${primaryImage}` : null;

            // Zepto values are in paise, divide by 100 to get Rupees
            const mrp = prodRes.mrp ? prodRes.mrp / 100 : null;
            const sp = prodRes.sellingPrice ? prodRes.sellingPrice / 100 : (prodRes.discountedSellingPrice ? prodRes.discountedSellingPrice / 100 : null);

            mappedProducts.push({
              id: variant.id || prod.id || prodRes.id,
              name: prod.name || null,
              brand: prod.brand || null,
              image_url: imageUrl,
              categories: {
                tlc: prodRes.primaryCategoryName || null,
                mlc: prodRes.primarySubcategoryName || null,
                llc: item.l3_details?.name || null
              },
              pricing: {
                mrp: mrp,
                sp: sp
              }
            });
          }
        }
      }

      return res.status(200).json({
        success: true,
        provider: 'zepto',
        query,
        results_count: mappedProducts.length,
        products: mappedProducts
      });

    } catch (error: any) {
      console.error('Zepto Catalog API error:', error.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to search product from Zepto catalog provider',
        details: error.response?.data || error.message
      });
    }

  } else {
    // --- BIGBASKET PROVIDER (DEFAULT) ---
    const url = 'https://www.bigbasket.com/listing-svc/v2/products';
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
        return res.status(200).json({
          success: true,
          provider: 'bigbasket',
          query,
          results_count: 0,
          products: []
        });
      }

      const tabs = response.data.tabs || [];
      if (tabs.length === 0) {
        return res.status(200).json({
          success: true,
          provider: 'bigbasket',
          query,
          results_count: 0,
          products: []
        });
      }

      const products = tabs[0]?.product_info?.products || [];
      const mappedProducts = products.map((prod: any) => {
        const images = prod.images || [];
        const imageUrl = images[0] ? (images[0].xxl || images[0].xl || images[0].l || images[0].m || images[0].s) : null;
        
        return {
          id: prod.id,
          name: prod.desc,
          brand: prod.brand?.name || null,
          image_url: imageUrl,
          categories: {
            tlc: prod.category?.tlc_name || null,
            mlc: prod.category?.mlc_name || null,
            llc: prod.category?.llc_name || null
          },
          pricing: {
            mrp: prod.pricing?.discount?.mrp || null,
            sp: prod.pricing?.discount?.prim_price?.sp || null
          }
        };
      });

      return res.status(200).json({
        success: true,
        provider: 'bigbasket',
        query,
        results_count: mappedProducts.length,
        products: mappedProducts
      });

    } catch (error: any) {
      console.error('BigBasket Catalog API error:', error.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to search product from BigBasket catalog provider',
        details: error.response?.data || error.message
      });
    }
  }
}

