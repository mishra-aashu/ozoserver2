import handler from './api/search';
import { VercelRequest, VercelResponse } from '@vercel/node';

async function runTest() {
  console.log("=== TESTING BIGBASKET PROVIDER ===");
  const reqBB = {
    method: 'GET',
    query: { q: 'maggi', provider: 'bigbasket' }
  } as unknown as VercelRequest;

  let bbResponseData: any = null;
  const resBB = {
    setHeader: (name: string, value: string) => {},
    status: (code: number) => {
      console.log(`BB Status Code: ${code}`);
      return {
        json: (data: any) => {
          bbResponseData = data;
        },
        end: () => {}
      };
    }
  } as unknown as VercelResponse;

  await handler(reqBB, resBB);
  if (bbResponseData) {
    console.log(`Success: ${bbResponseData.success}`);
    console.log(`Results count: ${bbResponseData.results_count}`);
    if (bbResponseData.products && bbResponseData.products.length > 0) {
      console.log("First Product details:", JSON.stringify(bbResponseData.products[0], null, 2));
    }
  }

  console.log("\n=== TESTING ZEPTO PROVIDER ===");
  const reqZepto = {
    method: 'GET',
    query: { q: 'maggi', provider: 'zepto' }
  } as unknown as VercelRequest;

  let zeptoResponseData: any = null;
  const resZepto = {
    setHeader: (name: string, value: string) => {},
    status: (code: number) => {
      console.log(`Zepto Status Code: ${code}`);
      return {
        json: (data: any) => {
          zeptoResponseData = data;
        },
        end: () => {}
      };
    }
  } as unknown as VercelResponse;

  await handler(reqZepto, resZepto);
  if (zeptoResponseData) {
    console.log(`Success: ${zeptoResponseData.success}`);
    console.log(`Results count: ${zeptoResponseData.results_count}`);
    if (zeptoResponseData.products && zeptoResponseData.products.length > 0) {
      console.log("First Product details:", JSON.stringify(zeptoResponseData.products[0], null, 2));
    } else {
      console.log("No products returned. Full response:", JSON.stringify(zeptoResponseData, null, 2));
    }
  }
}

runTest().catch(console.error);
