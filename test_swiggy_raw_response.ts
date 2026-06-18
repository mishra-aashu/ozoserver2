import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

async function testSwiggyRaw() {
    const configPath = path.join(__dirname, 'config.json');
    if (!fs.existsSync(configPath)) {
        console.error("config.json not found!");
        return;
    }
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const cookie = config.SWIGGY_COOKIE || config.swiggy_cookie;
    
    const url = 'https://www.swiggy.com/api/instamart/search/suggest-items/v2';
    
    const headers = {
      'accept': '*/*',
      'accept-language': 'en-GB,en;q=0.9,hi-IN;q=0.8,hi;q=0.7,en-US;q=0.6',
      'content-type': 'application/json',
      'referer': 'https://www.swiggy.com/instamart/search?custom_back=true',
      'user-agent': 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36',
      'cookie': cookie
    };

    try {
      const response = await axios.get(url, {
        params: {
          query: 'milk',
          storeId: '1392421',
          primaryStoreId: '1392421',
          secondaryStoreId: '1388998',
          trackingId: '_iafzxjdvn'
        },
        headers,
        timeout: 10000
      });

      console.log('Status Code:', response.status);
      console.log('Response Keys:', Object.keys(response.data || {}));
      console.log('Full Response Data:', JSON.stringify(response.data, null, 2).substring(0, 3000));
    } catch (e: any) {
      console.error('Error querying Swiggy directly:', e.message);
      if (e.response) {
        console.error('Status:', e.response.status);
        console.error('Headers:', e.response.headers);
        console.error('Data:', JSON.stringify(e.response.data).substring(0, 1000));
      }
    }
}

testSwiggyRaw().catch(console.error);
