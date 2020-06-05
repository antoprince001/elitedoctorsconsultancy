/********************************************************************************/
/*                       ELITE DOCTORS CONSULTANCY                              */
/*                                                                              */
/*   A website that enables the connection between students and reputed medical */
/*   universities throughout the world and provides medical admission guidance  */ 
/*   services.                                                                  */
/*                                                                              */
/*   The website is a multi-page application with server.js as it is genesis    */
/*   point.                                                                     */
/*                                                                              */
/*   The backend development has been done through Node.js and frontend with html*/
/*   ,css and bootstrap.                                                         */
/*                                                                              */
/*   Folders view-                                                                */
/*            assets    - static images and css                                 */
/*            views     - EJS templates with html code                          */    
/*            routes.js - File to handle all routing from requests to response  */
/********************************************************************************/

/********************************************************************************/
/*          Modules to set handling of assets and form handling.                */                                   
/********************************************************************************/

const express = require('express');
const functions = require('firebase-functions');
const session        = require( 'express-session' );
const FirestoreStore = require( 'firestore-store' )(session);
const db= require('./firebase').firestore();
const app = express();
const bodyParser = require('body-parser');
const apiroutes = require('./routes');
const path = require('path');
var http = require('http').createServer(app);
const helmet = require('helmet');

/********************************************************************************/
/*                            Middleware functions                              */   
/*                Templating engine- Embedded javascript templates              */
/*                BodyParser       - To decipher post request messages          */
/*                                                                              */
/********************************************************************************/ 

app.use(bodyParser.json());                     //Post requests
app.use(bodyParser.urlencoded({ extended: false }));
app.use(helmet());
app.set('views', path.join(__dirname, 'views'))

app // or connect
.use( session( {
  store:  new FirestoreStore( {
    database: db
  } ),

  name:              '__session', // ← required for Cloud Functions / Cloud Run
  secret:            'EliteSEcret',
  resave:            true,
  saveUninitialized: true,
} ) );

app.use('/', apiroutes);                        // External routing
app.set('view engine','ejs');                   //Templating engine
app.use(express.static('views'));

app.use(function(req, res, next){
  res.status(404);
  res.render('404.ejs');

});
 
//exports.app = functions.https.onRequest(app); 
http.listen(5000, console.log('server started on port 5000'));