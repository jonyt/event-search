import express = require("express");
import cors = require("cors");
import {Client, RequestParams, ApiResponse} from '@elastic/elasticsearch';
// import elasticsearch = require('elasticsearch');

const app = express();
app.use(cors());
const port = 8080;
const esClient = new Client({ node: 'http://localhost:9200' });

app.get( "/search", async ( request, response ) => {
    console.log(request.query);
    const query = request.query.query;
    const city = request.query.city;
    const fromDate = request.query.fromDate;
    const toDate = request.query.toDate;

    const searchParams = {
        index: 'events',
        body: {
            query: {
                bool: {
                    must: [
                        {range: {date: {gte: "2010-01-01"}}},
                        {
                            bool: {
                                should: [
                                    {term: {title: query}},
                                    {term: {description: query}}
                                ]
                            }
                        }
                    ]
                }
            }
        }
    };

    try {
        const result: ApiResponse<SearchResponse<Source>> = await esClient.search(searchParams);
        const jsonResponse = result.body.hits.hits.map(hit => {
            const event = hit._source;
            const unixTime = Date.parse(event.date);
            return {
                title: event.title,
                description: event.description,
                location: event.rawLocation,
                source: event.source,
                date: unixTime
            };
        });
        response.json(jsonResponse);    
    } catch (error) {
        console.error(error);
        response.status(500);
    }
} );

app.get( "/cities", async ( req, res ) => {
    const searchParams = {
        index: 'events',
        body: {
            query: {
                type: {value: 'event'}
            },
            aggs: {
                unique_cities: {
                    terms: {field: 'city'}
                }
            }
        }
    };

    try {
        const result: ApiResponse<SearchResponse<Source>> = await esClient.search(searchParams);
        const cities = result.body.aggregations.unique_cities.buckets.map(bucket => bucket.key);
        
        res.json(cities);
    } catch (error) {
        // TODO: why can't I use next()? Something to do with the import statement.
        console.log(error);
        res.status(500);
    }
} );

// start 
app.listen( port, () => {
    console.log( `server started at http://localhost:${ port }` );
} );

interface SearchResponse<T> {
    hits: {
        hits: Array<{_source: T;}>
    },
    aggregations: {
        unique_cities: {
            buckets: Array<Bucket>
        }
    }
}

interface Bucket {
    key: string;
    doc_count: number;
}

interface Source {
    rawLocation: string;
    city: string;
    title: string;
    description: string;
    source: string;
    date: string;
    url: string;
}