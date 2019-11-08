import express = require("express");
import cors = require("cors");

const app = express();
app.use(cors());
const port = 8080;

app.get( "/search", ( req, res ) => {
    res.send( "Hello world!" );
} );

app.get( "/cities", ( req, res ) => {
    res.json( ['Tel-Aviv', 'Haifa'] );
} );

// start 
app.listen( port, () => {
    console.log( `server started at http://localhost:${ port }` );
} );