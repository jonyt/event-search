import puppeteer from 'puppeteer';
// import 'google-maps-api-typings';
import { createClient, GoogleMapsClient, GeocodingResult } from "@google/maps";
import { Client, ApiResponse, RequestParams } from '@elastic/elasticsearch';

// import url from 'url';
import fs from 'fs'; // TODO: delete

const html = fs.readFileSync('C:\\Users\\jonyo\\Desktop\\katedra.html','utf8');

(async () => {
    const geocodingClient = createClient({
        key: 'my-google-maps-api-key' // TODO
    });    
    const esClient = new Client({ node: 'http://localhost:9200' })

    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();
    await page.goto('file://C:/Users/jonyo/Desktop/katedra.html');
    // await page.goto(`data:text/html,${html}`);
    // await page.goto('https://www.katedra.co.il/%D7%90%D7%99%D7%A8%D7%95%D7%A2%D7%99%D7%9D_%D7%97%D7%93_%D7%A4%D7%A2%D7%9E%D7%99%D7%99%D7%9D');

    try {
        const allEvents = await page.$$eval('a[data-type="show"], a[data-type="event"]', (events, m) => 
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
        
        const mappedEvents = allEvents.map(e => new Event(e[0], e[1], e[2], e[3], e[4], e[5]));
        for (const event of mappedEvents) {
            //await event.geocode(geocodingClient);
            const doc1: RequestParams.Index = {
                index: 'events',
                type: 'event',
                body: JSON.stringify(event)
            };
            await esClient.index(doc1); 
            console.log(event);
        }
    
    } catch (error) {
        console.log(error.stack); 
    }

    await browser.close();
})();

class Event {
    title: string;
    description: string;
    source: string;
    date: Date;
    url: string;
    rawLocation: string = '';
    city: string = '';
    exact_location: number[] = [];

    constructor(title: string, description: string, source: string, dateString: string, url: string, rawLocation: string) {
        this.title = title;
        this.description = description;
        this.source = source;
        this.date = this.parseDate(dateString);
        this.url = url;
    }

    parseDate(dateString: string) : Date {
        const regex = new RegExp(/(\d{2}) (\S+) (\d{4}) \S+ (\d{2})\:(\d{2})/);
        const dateMatch = dateString.match(regex);

        if (dateMatch) {
            const year = parseInt(dateMatch[3]);
            const month = this.monthToInt(dateMatch[2]);
            const day = parseInt(dateMatch[1]);
            const hour = parseInt(dateMatch[4]);
            const minute = parseInt(dateMatch[5]);
            return new Date(year, month, day, hour, minute);
        } else {
            throw new Error(`Unable to parse date [${dateString}]`);
        }
    }

    monthToInt(month: string) : number {
        switch (month) {
            case "ינואר": 
                return 1;
            case "פברואר": 
                return 2;
            case "מרץ": 
                return 3;
            case "אפריל": 
                return 4;
            case "מאי": 
                return 5;
            case "יוני": 
                return 6;
            case "יולי": 
                return 7;    
            case "אוגוסט": 
                return 8;
            case "ספטמבר": 
                return 9;
            case "אוקטובר": 
                return 10;
            case "נובמבר": 
                return 11;
            case "דצמבר": 
                return 12;
            default:
                throw new Error("Unknown month [${month}]");
        }
    }

    async geocode(client: GoogleMapsClient) {
        const response = await client.geocode({ address: this.rawLocation }).asPromise();
        const result = response.json.results[0];
        const cities = result.address_components.filter(component => component.types.includes('locality'));
        if (cities.length > 0)
            this.city = cities[0].long_name;

        this.exact_location = [result.geometry.location.lat, result.geometry.location.lng];    
    }
}