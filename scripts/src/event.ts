import {Geocoder} from './Geocoder';
import {Moment} from 'moment';
import moment = require('moment');

export class Event {
    title: string;
    description: string;
    source: string;
    startTime: Date;
    endTime?: Date;
    url: string;
    rawLocation: string = '';
    city: string = '';
    exactLocation: number[] = [];
    created = new Date();

    constructor(title: string, description: string, source: string, url: string, rawLocation: string, startDateString: string, endDateString?: string) {
        this.title = title.trim();
        this.description = description.trim();
        this.source = source.trim();
        this.startTime = this.parseDate(startDateString.trim());
        this.endTime = (endDateString == null ? undefined : this.parseDate(endDateString.trim()));
        this.url = url.trim();
        this.rawLocation = rawLocation.trim();
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
            const date = moment(dateString, 'DD/MM/YYYY');
            return date.toDate();
            // TODO: take into account time zone and refactor above regex to use moment.js
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

    async geocode(client: Geocoder) {
        try {
            const result = await client.geocode(this.rawLocation);
            this.exactLocation = result.coordinates;
            this.city = (result.city == 'Tel Aviv-Yafo' ? 'תל אביב יפו' : result.city);    
        } catch (error) {
            console.log(error.stack);    
        }
    }
}