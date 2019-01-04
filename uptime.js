/*

This app is an "uptime monitor", which allows users to enter URLs they want monitored, and receive
alerts when those resources "go down" or "come back up".

*/

// Dependencies

// the HTTP module, which lets us create a server (that will listen on ports and respond with data)
const http = require("http");

// The server should respond to all requests with a string
const server = http.createServer((request, response) => {
   response.end("Request received!\n");
});

const PORT = 3000;

// Start the server and have it listen on port 3000
server.listen(PORT, () => {
   console.log(`The server is listening on port ${PORT}...`);
});
