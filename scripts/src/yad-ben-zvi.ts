import {Geocoder} from './Geocoder';
import {Event} from './Event';
import { Client, RequestParams } from '@elastic/elasticsearch';
import dotenv from 'dotenv';
import request from 'request';
import cheerio from 'cheerio';
import {URL} from 'url';

dotenv.config();
const geocodingApiKey = process.env.GOOGLE_API_KEY;
if (!geocodingApiKey)
    throw Error('No Google API key set'); 
const geocodingClient = new Geocoder(geocodingApiKey);
const esClient = new Client({ node: 'http://localhost:9200' });

request('https://www.ybz.org.il/?CategoryID=141', undefined, (error, result, body) => {
    if (error) 
        return console.log(error);

    const document = cheerio.load(body);
    const events = document('.EventListRow').map((i, row) => {
        const $row = cheerio(row);
        const dateElement = $row.find('.EventListDate');
        if (dateElement.length == 0) 
            return null;            

        let date = dateElement.text();
        
        const titleElement = $row.find('a.EventsListTitle');
        const title = titleElement.text();
        const link = titleElement.attr('href');
        const url = new URL(link || '', 'https://www.ybz.org.il');

        const descriptionElement = $row.find('.EventListInfo');
        const description = descriptionElement.text();

        return new Event(title, description, 'יד בן צבי', url.toString(), 'אבן גבירול 14, ירושלים', date);
    });
    
    // TODO: geocode, write to es

    const i = 3;
});