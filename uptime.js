/*

This app is an "uptime monitor", which allows users to enter URLs they want monitored, and receive
alerts when those resources "go down" or "come back up".

*/

// Dependencies

// the builtin http module, which provides functionality for creating servers
const http = require("http");

// the builtin url module, which provides functionality for parsing urls
const url = require("url");

// The server, which will listen on a port and respond with data
// The server should respond to all requests with a string
const server = http.createServer((request, response) => {
   // get the URL and parse it (including the query string)
   let parsedUrl = url.parse(request.url, true);

   // get the path
   let path = parsedUrl.pathname;
   // trim any trailing slashes
   let trimmedPath = path.replace(/^\/+|\/+$/g, "");

   // Get the HTTP method
   let method = request.method;

   // send the response
   response.end("Got it!");

   // log the path that was requested
   console.log(`Request received on path ${trimmedPath} with method ${method}`);
});

const PORT = 3000;

// Start the server and have it listen on port 3000
server.listen(PORT, () => {
   console.log(`The server is listening on port ${PORT}...`);
});
