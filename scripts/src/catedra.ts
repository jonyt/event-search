import puppeteer from 'puppeteer';
import {Geocoder} from './Geocoder';
import {Event} from './Event';
import { Client, RequestParams } from '@elastic/elasticsearch';
import dotenv from 'dotenv';
import fs from 'fs'; // TODO: delete after testing

const html = fs.readFileSync('C:\\Users\\jonyo\\Desktop\\katedra.html','utf8');

(async () => {
    dotenv.config();
    const geocodingApiKey = process.env.GOOGLE_API_KEY;
    if (!geocodingApiKey)
        throw Error('No Google API key set'); 
    const geocodingClient = new Geocoder(geocodingApiKey);
    const esClient = new Client({ node: 'http://localhost:9200' })

    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();
    await page.goto('file://C:/Users/jonyo/Desktop/katedra.html');
    // await page.goto(`data:text/html,${html}`);
    // await page.goto('https://www.katedra.co.il/%D7%90%D7%99%D7%A8%D7%95%D7%A2%D7%99%D7%9D_%D7%97%D7%93_%D7%A4%D7%A2%D7%9E%D7%99%D7%99%D7%9D');

    try {
        const allEvents = await page.$$eval('a[data-type="show"], a[data-type="event"]', (events) => 
            (events as Element[]).map(event => {
                const titleAttr = event.getAttribute('title');
                const title = titleAttr ? titleAttr : '';

                const descriptionElement = event.querySelector('div.brief');
                const description = descriptionElement && descriptionElement.textContent ? descriptionElement.textContent : '';

                const locationElement = event.querySelector('div.theater_container');
                const location = locationElement && locationElement.textContent ? locationElement.textContent : '';

                const timeElement = event.querySelector('div.time_container');
                const time = timeElement && timeElement.textContent ? timeElement.textContent : '';
                const trimmedTime = time != null ? time.replace(/\s+/gsm, ' ') : '';

                const urlAttr = event.getAttribute('href');
                const url = urlAttr ? new URL(urlAttr, "https://www.katedra.co.il") : '';

                return [title, description, 'הקתדרה', trimmedTime, url.toString(), location];
            })
        );
        
        const mappedEvents = allEvents.map(e => new Event(e[0], e[1], e[2], e[4], e[5], e[3]));
        for (const event of mappedEvents) {
            await event.geocode(geocodingClient);
            const doc1: RequestParams.Index = {
                index: 'events',
                type: 'event',
                id: event.url,
                body: JSON.stringify(event)
            };
            await esClient.index(doc1); 
            // console.log(event);
        }
    
    } catch (error) {
        console.log(error.stack); 
    }

    await browser.close();
})();