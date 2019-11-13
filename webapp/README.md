# Event search
This is a web application to help my dad search for interesting events to attend. But really, it's mostly for me to practice my elm/typescript skills. It has:

1. Crawlers which crawl websites with events and insert them to an ElasticSearch database.
2. A web UI to query ElasticSearch.
3. A node.js backend to query ElasticSearch and relay results to the frontend. 