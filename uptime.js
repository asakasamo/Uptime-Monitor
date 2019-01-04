/*

This app is an "uptime monitor", which allows users to enter URLs they want monitored, and receive
alerts when those resources "go down" or "come back up".

*/

// Dependencies

// the builtin http module, which provides functionality for creating servers
const http = require("http");

// the builtin url module, which provides functionality for parsing urls
const url = require("url");

// the builtin StringDecoder class, which lets you decode streams as strings
const StringDecoder = require("string_decoder").StringDecoder;

// the config file
const config = require("./config");

// The server, which will listen on a port and respond with data
// The server should respond to all requests with a string
const server = http.createServer((request, response) => {
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

         // log the path that was requested
         console.log("Returned this response: ", statusCode, payloadString);
      });
   });
});

// Object containing all of the handlers
const handlers = {
   sample(data, callback) {
      console.log("The request was routed to /sample");
      callback(406, { name: "Sample header" });
   },
   notFound(data, callback) {
      console.log("The request was routed to not found");
      callback(404);
   }
};

// Define the request router
const router = {
   sample: handlers.sample
};

// Start the server and have it listen on port 3000
server.listen(config.port, () => {
   console.log(
      `Server is listening (port ${config.port} in ${config.envName} mode)...`
   );
});
