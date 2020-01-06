# Useful commands

## ElasticSearch
Follow instructions for installing Hebrew analyzer from (here)[https://github.com/synhershko/elasticsearch-analysis-hebrew/wiki/Getting-Started]. 
 

Create events index
`curl -X PUT "localhost:9200/events?pretty&pretty"`

Create mapping for event

```
curl -X PUT "localhost:9200/events/_mapping/event" -d'{
   "properties":{
      "title":{
         "type":"text",
         "analyzer":"hebrew"
      },
      "description":{
         "type":"text",
         "analyzer":"hebrew"
      },
      "source":{
         "type":"text",
         "analyzer":"hebrew"
      },
      "startTime":{
         "type":"date"
      },
      "endTime":{
         "type":"date"
      },
      "url":{
         "type":"text",
         "index":false
      },
      "rawLocation":{
         "type":"text",
         "index":false
      },
      "city":{
         "type":"text",
         "analyzer":"hebrew",
         "fields": {
          "keyword": { 
            "type": "keyword"
          }
        }
      },
      "exactLocation":{
         "type":"geo_point"
      },
      "created":{
         "type":"date"
      }
   }
}'
```

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

## Elm pagination
https://package.elm-lang.org/packages/jschomay/elm-paginate/latest/Paginate

# TODOs:
1. Add start/end date to crawler + app. (!!)
1. TA municipal events crawler. (!!)
1. Bootstrap CSS. (!!)
1. Pagination.
1. Use `next()` in app response.
1. Deploy. (!!)
