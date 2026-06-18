import handler from './api/search';
import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// Mock axios.get to return local swiggy_success.json contents
axios.get = async function(url: string, config?: any): Promise<any> {
  console.log(`[Mock Axios] Intercepted GET request to: ${url}`);
  const filePath = path.join(__dirname, 'swiggy_success.json');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(fileContent);
  return {
    data: data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {}
  };
};

async function runTest() {
  console.log("=== TESTING SWIGGY PROVIDER (MOCKED) ===");
  const reqSwiggy = {
    method: 'GET',
    query: { q: 'milk', provider: 'swiggy' }
  } as unknown as VercelRequest;

  let responseData: any = null;
  const resSwiggy = {
    setHeader: (name: string, value: string) => {},
    status: (code: number) => {
      console.log(`Swiggy Status Code: ${code}`);
      return {
        json: (data: any) => {
          responseData = data;
        },
        end: () => {}
      };
    }
  } as unknown as VercelResponse;

  await handler(reqSwiggy, resSwiggy);
  if (responseData) {
    console.log(`Success: ${responseData.success}`);
    console.log(`Results count: ${responseData.results_count}`);
    if (responseData.products && responseData.products.length > 0) {
      console.log("All mapped products:\n", JSON.stringify(responseData.products, null, 2));
    } else {
      console.log("Full Response:", JSON.stringify(responseData, null, 2));
    }
  }
}

runTest().catch(console.error);
