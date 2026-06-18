import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function extractMetadata(link: string): any {
  if (!link) return null;
  try {
    const urlObj = new URL(link.replace('swiggy://', 'http://'));
    const metadataStr = urlObj.searchParams.get('metadata');
    if (metadataStr) {
      return JSON.parse(decodeURIComponent(metadataStr));
    }
  } catch (e) {
    try {
      const match = link.match(/[?&]metadata=([^&]+)/);
      if (match && match[1]) {
        return JSON.parse(decodeURIComponent(match[1]));
      }
    } catch (err) {
      // ignore
    }
  }
  return null;
}

function mapSuggestion(sugg: any): any {
  const metadata = extractMetadata(sugg.cta?.link);
  
  // Extract categories
  const tlc = metadata?.data?.superCategoriesL1?.[0] || metadata?.superCategoriesL1?.[0] || sugg.category || 'Instamart';
  const mlc = metadata?.data?.categoriesL2?.[0] || metadata?.categoriesL2?.[0] || sugg.subCategory || null;
  const llc = metadata?.data?.subCategoriesL3?.[0] || metadata?.subCategoriesL3?.[0] || null;
  
  // Image URL from cloudinaryId
  let imageUrl = null;
  if (sugg.cloudinaryId) {
    imageUrl = `https://media-assets.swiggy.com/swiggy/image/upload/fl_lossy,f_auto,q_auto,h_600/${sugg.cloudinaryId}`;
  }
  
  // Brand name
  const brand = metadata?.data?.brand || metadata?.brand || null;
  
  // ID
  const id = metadata?.suggestionId || sugg.entityId || sugg.text || `sugg_${Math.random()}`;
  
  // Pricing
  let mrp: number | null = null;
  let sp: number | null = null;
  
  if (sugg.price && !isNaN(Number(sugg.price))) {
    sp = Number(sugg.price);
  }
  
  return {
    id: id,
    name: sugg.text || null,
    brand: brand,
    image_url: imageUrl,
    categories: {
      tlc: tlc,
      mlc: mlc,
      llc: llc
    },
    pricing: {
      mrp: mrp || sp || null,
      sp: sp || null
    }
  };
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
    return res.status(200).json({
      status: "online",
      message: "Grocery API Gateway is active",
      providers: ["bigbasket", "zepto", "swiggy"],
      usage: {
        endpoint: "/api/search?q=<product_name>&provider=<bigbasket|zepto|swiggy>",
        example: "/api/search?q=milk&provider=swiggy"
      }
    });
  }

  if (provider === 'swiggy' || provider === 'instamart') {
    // --- SWIGGY INSTAMART PROVIDER ---
    const url = 'https://www.swiggy.com/api/instamart/search/suggest-items/v2';
    const store_id = (req.query.store_id as string) || (req.query.storeid as string) || '1392421';
    const primary_store_id = (req.query.primary_store_id as string) || (req.query.primarystoreid as string) || store_id;
    const secondary_store_id = (req.query.secondary_store_id as string) || (req.query.secondarystoreid as string) || '1388998';
    const tracking_id = (req.query.tracking_id as string) || (req.query.trackingid as string) || '_iafzxjdvn';

    const fallbackCookie = 'deviceId=s%3Aa263dd96-e412-481c-81d0-7ca0e252283a.RUqNm43SUhQC9eTZwERsc8mcHlxLyWRU1sG1l8zY9kU; tid=eyJLSUQiOiIyIiwiYWxnIjoiSFMyNTYiLCJ0eXAiOiJKV1QifQ.eyJleHAiOjE3ODE4MTkxMDEsImlhdCI6MTc4MTgxNTUwMSwic2Vzc2lvbl9kYXRhIjoiUVNxQURmTHU3ZHlwdUJjY3RBRWNkdm5uRW5XNXFBUGkwdkZqVU5QUlU0amZ1Yk03VC9uaVRkUmNFQzdVNkdwSDdaRnV0MEpCWkJGMWRYbFhZQWpaTHRkWkJ5eGNOT0NWekljRGp1dVdBUU5SWkVuV0pxNDNaK1dtOUlPc0VOdUE1REZkNVV2VDNFelNmNG80aW5GZno3U2RTRTJNN0xIdVFvbER1djNiYXQwRUNST3JBcWJiZHp1NjVMdHVVZk93bnR3ZUUxQmxqSERldFNLaHROcHZTZz09Iiwic2lkIjoiczAyZTM4MzFiMjYtZTBjYS00ZDU4LTljMjUtZjYxOGRkMDRiIiwic3ViIjoiYTY5Mzg3ZWItMDUzNC00MWUxLWI2NTktZmM0ZWI3ZmZlZDU3IiwidXNlcl9pZCI6IjAifQ.Oq_DoNztPFXFtehcEqhTmr2PhHMa9v0OM_aC6Pny5wA; sid=s%3As02e3831b26-e0ca-4d58-9c25-f618dd04b.eml8yCujF8Zz2%2FmKZQHxhSWrVRDyMSEaUOxj2vdsa9I; versionCode=1200; platform=web; statusBarHeight=0; bottomOffset=0; genieTrackOn=false; ally-on=false; isNative=false; strId=; openIMHP=false; _gcl_au=1.1.618416289.1781815503; aws-waf-token=ef3c90c1-52be-43e2-979d-dbc51188e321:HgoAnX6QRfceAAAA:seQvSicnOB3tK1ExYcRoRjF7RN/48T78Ak9/EM7d5RGzmhtBgYkc68rYd14m7Hxe7SDmnFxi34nMI17QVobYRCjJFSpq6B8JloKeYHZf2UyHySVboRt+E4yXyQ59Lg4B0Fzf1PIjVsEDCXUGMjFOvUv9+N6B4aIetEidTNttdBFweZ9fwt9A5l3Zm3icMbUwAhZXRO8HjhzzwSBAPUQnwThdz+bqW5s7xs+6iBLM4Rx39yRWJ8LvqRGTuIA=; subplatform=mweb';
    const customCookie = (req.query.cookie as string) || (req.query.swiggy_cookie as string);
    const activeCookie = customCookie || process.env.SWIGGY_COOKIE || fallbackCookie;

    const headers = {
      'accept': '*/*',
      'accept-language': 'en-GB,en;q=0.9,hi-IN;q=0.8,hi;q=0.7,en-US;q=0.6',
      'content-type': 'application/json',
      'dnt': '1',
      'priority': 'u=1, i',
      'referer': 'https://www.swiggy.com/instamart/search?custom_back=true',
      'sec-ch-ua': '"Google Chrome";v="149", "Chromium";v="149", "Not)A;Brand";v="24"',
      'sec-ch-ua-mobile': '?1',
      'sec-ch-ua-platform': '"Android"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'sec-gpc': '1',
      'user-agent': 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36',
      'x-build-version': '2.350.0',
      'x-device-id': 'a263dd96-e412-481c-81d0-7ca0e252283a',
      'cookie': activeCookie
    };

    try {
      const response = await axios.get(url, {
        params: {
          query: query,
          storeId: store_id,
          primaryStoreId: primary_store_id,
          secondaryStoreId: secondary_store_id,
          trackingId: tracking_id
        },
        headers,
        timeout: 10000
      });

      console.log('Swiggy response status:', response.status);
      console.log('Swiggy response data snippet:', JSON.stringify(response.data || '').substring(0, 1000));

      if (response.status === 202 || !response.data || Object.keys(response.data).length === 0) {
        return res.status(202).json({
          success: false,
          error: 'WAF Challenge Triggered',
          message: 'Swiggy Instamart returned a WAF challenge (202) or empty response. Please update your SWIGGY_COOKIE.'
        });
      }

      const cards = response.data?.data?.cards || [];
      const mappedProducts: any[] = [];

      for (const cardObj of cards) {
        const sugg = cardObj.card?.card;
        if (!sugg || !sugg.text || !sugg['@type']?.includes('GlobalAutoSuggestion')) {
          continue;
        }

        // Parse main suggestion
        mappedProducts.push(mapSuggestion(sugg));

        // Parse nested suggestions
        if (Array.isArray(sugg.nestedSuggestions)) {
          for (const nested of sugg.nestedSuggestions) {
            if (nested && nested.text) {
              mappedProducts.push(mapSuggestion(nested));
            }
          }
        }
      }

      return res.status(200).json({
        success: true,
        provider: 'swiggy',
        query,
        results_count: mappedProducts.length,
        products: mappedProducts
      });

    } catch (error: any) {
      console.error('Swiggy Catalog API error:', error.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to search product from Swiggy catalog provider',
        details: error.response?.data || error.message
      });
    }
  } else if (provider === 'zepto') {
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

