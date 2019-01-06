/*

This app is an "uptime monitor", which allows users to enter URLs they want monitored, and receive
alerts when those resources "go down" or "come back up".

*/

/**
 * Dependencies
 */

// the builtin http/s modules, which provides functionality for creating servers
const http = require("http");
const https = require("https");

// the builtin url module, which provides functionality for parsing urls
const url = require("url");

// the builtin StringDecoder class, which lets you decode streams as strings
const StringDecoder = require("string_decoder").StringDecoder;

// the server config file
const config = require("./config");

// the filesystem
const fs = require("fs");

/**
 * Global variables
 */

// The servers, which will listen on a port and respond with data
const httpServer = http.createServer((req, res) => {
   unifiedServer(req, res);
});

const httpsServerOptions = {
   key: fs.readFileSync("./https/key.pem"),
   cert: fs.readFileSync("./https/cert.pem")
};

const httpsServer = https.createServer(httpsServerOptions, (req, res) => {
   unifiedServer(req, res);
});

/**
 * Functions (server logic)
 */

function unifiedServer(request, response) {
   // get the URL and parse it (including the query string)
   const parsedUrl = url.parse(request.url, true);

   // get the path
   const path = parsedUrl.pathname;
   // trim any trailing slashes
   const trimmedPath = path.replace(/^\/+|\/+$/g, "");

   // get the HTTP method
   const method = request.method;

   // get the query string as an object
   const queryStringObj = parsedUrl.query;

   // get the headers as an object
   const headers = request.headers;

   // get the payload, if any (as a string stream)
   const decoder = new StringDecoder("utf-8");

   let buffer = "";

   // respond to the "data" event which specifies that data is being streamed in)
   request.on("data", (data) => {
      buffer += decoder.write(data);
   });
   // respond to the "end" event, which specifies that our data stream has ended
   request.on("end", () => {
      buffer += decoder.end();

      // choose the handler that this request should go to (or default to not found)
      const chosenHandler = router[trimmedPath] || handlers.notFound;

      // construct the data object to send to the handler
      const data = {
         trimmedPath,
         queryStringObj,
         method,
         headers,
         payload: buffer
      };

      // call the request handler
      chosenHandler(data, (statusCode, payload) => {
         statusCode = typeof statusCode === "number" ? statusCode : 200;
         payload = typeof payload === "object" ? payload : {};

         // convert the payload to a string
         const payloadString = JSON.stringify(payload);

         // return the response
         response.setHeader("Content-Type", "application/json");
         response.writeHead(statusCode);
         response.end(payloadString);
      });
   });
}

// Object containing all of the handlers
const handlers = {
   ping(data, callback) {
      console.log("pong");
      callback(200);
   },
   notFound(data, callback) {
      console.log("Caught a 404");
      callback(404);
   }
};

// Define the request router
const router = {
   ping: handlers.ping
};

// Start the http server
httpServer.listen(config.httpPort, () => {
   console.log(`Server is listening on port ${config.httpPort}...`);
});

// Start the https server
httpsServer.listen(config.httpsPort, () => {
   console.log(`Server is listening on port ${config.httpsPort}...`);
});
