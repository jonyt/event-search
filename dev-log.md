# Useful commands

## ElasticSearch
Create events index
`url -X PUT "localhost:9200/events?pretty&pretty"`

Create mapping for event
`curl -X PUT "localhost:9200/events/_mapping/event" -d"{  \"properties\": {    \"title\": {      \"type\": \"text\"     },    \"description\": {        \"type\": \"text\"     },    \"source\": {        \"type\": \"text\"     },    \"date\": {        \"type\": \"date\"     },    \"url\": {        \"type\": \"text\",        \"index\": false     },    \"raw_location\": {        \"type\": \"text\",        \"index\": false     },    \"city\": {        \"type\": \"text\"     },    \"exact_location\": {        \"type\": \"geo_point\"     },    \"created\": {        \"type\": \"date\"     }  }}"`

Get all docs: `http://localhost:9200/events/_search?pretty=true&q=*:*` 
Delete all documents: `\dev\curl-7.66.0-win64-mingw\bin\curl.exe -XPOST "http://localhost:9200/events/event/_delete_by_query" -d "{\"query\":{\"match_all\":{}}}"`

Query by geolocation: 
```
curl -X GET "localhost:9200/events/_search?pretty" -H "Content-Type: application/json" -d"
{
    \"query\": {
        \"bool\" : {
            \"must\" : {
                \"match_all\" : {}
            },
            \"filter\" : {
                \"geo_distance\" : {
                    \"distance\" : \"20000km\",
                    \"exact_location\" : {
                        \"lat\" : 32.1,
                        \"lon\" : 34.7
                    }
                }
            }
        }
    }
}
"
```

## Google Maps
Install TS typings for Google Maps: `npm i --save-dev @types/google__maps`