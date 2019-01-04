/*

This app is an "uptime monitor", which allows users to enter URLs they want monitored, and receive
alerts when those resources "go down" or "come back up".

*/

// Dependencies

// the builtin http module, which provides functionality for creating servers
const http = require("http");

// the builtin url module, which provides functionality for parsing urls
const url = require("url");

const StringDecoder = require("string_decoder").StringDecoder;

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
   const queryString = parsedUrl.query;

   // get the headers as an object
   const headers = request.headers;

   // get the payload, if any (as a stream)
   const decoder = new StringDecoder("utf-8");
   let buffer = "";
   // respond to the "data" event which specifies that data is being streamed in)
   request.on("data", (data) => {
      buffer += decoder.write(data);
   });
   // respond to the "end" event, which specifies that our data stream has ended
   request.on("end", () => {
      buffer += decoder.end();

      // send the response
      response.end("Got it!");

      // log the path that was requested
      console.log(buffer);
   });
});

const PORT = 3000;

// Start the server and have it listen on port 3000
server.listen(PORT, () => {
   console.log(`The server is listening on port ${PORT}...`);
});
