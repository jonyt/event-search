import express = require("express");
import cors = require("cors");
import {Client, RequestParams, ApiResponse} from '@elastic/elasticsearch';

const app = express();
app.use(cors());
app.options('*', cors());
const port = 8080;
const esClient = new Client({ node: 'http://localhost:9200' });

app.get('/search', async ( request, response ) => {
    console.log(request.query);
    const query = request.query.query && request.query.query.trim().length > 0 ? request.query.query : undefined;
    const city = request.query.city;
    const fromDate = request.query.fromDate;

    let queryString = `startTime:>=${fromDate}`;
    let fields = ['startTime'];

    if (city != 'All' && city.trim().length > 0) {
        queryString += ` AND (${city})`;
        fields.push(city);
    } 

    if (query) {
        queryString += ` AND (${query})`;
        fields.push('title', 'description');
    }

    queryString = `(${query}) AND startTime:>=${fromDate}`;

    console.log("AAAAAAAAAAAA " + queryString);

    const search = {
        index: 'events',
        body: {
            query: {
                query_string: {
                    query: queryString,
                    fields: fields,
                    analyzer: 'hebrew_query'
                }
            }
        }
    };

    const termQuery = (query && query.trim().length > 0 ?
        {term: {title: query}}:
        {query: {exists: {field: "title"}}}
    );
    const cityQuery = (city == 'All' ? 
        {query: {exists: {field: "city"}}} :
        {term: {city: city}});
    
    const searchParams = {
        index: 'events',
        body: {
            query: {
                bool: {
                    must: [
                        {range: {startTime: {gte: fromDate}}},
                        {
                            bool: {
                                should: [
                                    {term: {title: query}},
                                    {term: {description: query}},
                                    cityQuery
                                ]
                            }
                        }
                    ]
                }
            }
        }
    };
// curl localhost:9200/events/_search?pretty -d'{"query": {"multi_match": {"query": "פסנתר", "fields": ["title", "description"], "fuzziness": "AUTO"}}}'
    try {
        const result: ApiResponse<SearchResponse<Event>> = await esClient.search(search);
        const jsonResponse = result.body.hits.hits.map(hit => {
            const event = hit._source;
            const unixTime = Date.parse(event.startTime);
            return {
                title: event.title,
                description: event.description,
                location: event.rawLocation,
                source: event.source,
                url: event.url,
                startTime: unixTime
            };
        });
        response.json(jsonResponse);    
    } catch (error) {
        console.error(error);
        response.status(500);
        response.send("An error has occurred");
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
                    terms: {field: 'city.keyword'}
                }
            }
        }
    };

    try {
        const result: ApiResponse<SearchResponse<Event>> = await esClient.search(searchParams);
        const cities = result.body.aggregations.unique_cities.buckets.map(bucket => bucket.key);
        
        res.json(cities);
    } catch (error) {
        // TODO: why can't I use next()? Something to do with the import statement.
        console.log(error);
        res.status(500);
        res.send("An error has occurred");
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

interface Event {
    rawLocation: string;
    city: string;
    title: string;
    description: string;
    source: string;
    startTime: string;
    url: string;
}