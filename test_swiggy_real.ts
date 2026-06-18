import handler from './api/search';
import { VercelRequest, VercelResponse } from '@vercel/node';
import * as fs from 'fs';
import * as path from 'path';

async function runRealTest() {
    console.log("Loading config...");
    const configPath = path.join(__dirname, 'config.json');
    if (!fs.existsSync(configPath)) {
        console.error("config.json not found!");
        return;
    }
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const cookie = config.SWIGGY_COOKIE || config.swiggy_cookie;
    
    console.log(`Using cookie length: ${cookie ? cookie.length : 0}`);
    console.log("=== TESTING LIVE SWIGGY PROVIDER ===");
    
    const reqSwiggy = {
        method: 'GET',
        query: { q: 'milk', provider: 'swiggy', cookie: cookie }
    } as unknown as VercelRequest;

    let responseData: any = null;
    let statusCode: number = 0;
    
    const resSwiggy = {
        setHeader: (name: string, value: string) => {},
        status: (code: number) => {
            statusCode = code;
            return {
                json: (data: any) => {
                    responseData = data;
                },
                end: () => {}
            };
        }
    } as unknown as VercelResponse;

    await handler(reqSwiggy, resSwiggy);
    
    console.log(`HTTP Status: ${statusCode}`);
    if (responseData) {
        console.log(`Success: ${responseData.success}`);
        if (responseData.success) {
            console.log(`Results count: ${responseData.results_count}`);
            if (responseData.products && responseData.products.length > 0) {
                console.log("First product sample:\n", JSON.stringify(responseData.products[0], null, 2));
            }
        } else {
            console.log("Error details:", JSON.stringify(responseData, null, 2));
        }
    }
}

runRealTest().catch(console.error);
