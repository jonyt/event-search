import { createClient, GoogleMapsClient } from "@google/maps";

class CoordinatesAndCity {
    coordinates: number[];
    city: string;

    constructor(coordinates: number[], city: string) {
        this.coordinates = coordinates;
        this.city = city;
    }
}

export class Geocoder {
    client: GoogleMapsClient;
    cache: { [key: string]: CoordinatesAndCity; } = {};

    constructor(key: string) {
        this.client = createClient({
            key: key,
            language: 'iw',
            Promise: Promise
        });
    }

    async geocode(location: string) : Promise<CoordinatesAndCity> {
        if (this.cache[location])
            return this.cache[location];

        const response = await this.client.geocode({ address: location }).asPromise();
        const result = response.json.results[0];
        const cities = result.address_components.filter(component => component.types.includes('locality'));
        let city = '';
        if (cities.length > 0)
            city = cities[0].long_name;

        console.log(city);

        const coordinates = [result.geometry.location.lat, result.geometry.location.lng];
        const coordinatesAndCity = new CoordinatesAndCity(coordinates, city);
        this.cache[location] = coordinatesAndCity;

        return coordinatesAndCity;
    }
}