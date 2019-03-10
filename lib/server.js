/**

   Server-related tasks

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

const handlers = require("./handlers");
const helpers = require("./helpers");
const path = require("path");

const util = require("util");
const debug = util.debuglog("server");

const server = {};

server.httpServer = http.createServer((req, res) => {
   server.unifiedServer(req, res);
});

server.httpsServer = https.createServer(
   server.httpsServerOptions,
   (req, res) => {
      server.unifiedServer(req, res);
   }
);

server.httpsServerOptions = {
   key: fs.readFileSync(path.join(__dirname, "/../https/key.pem")),
   cert: fs.readFileSync(path.join(__dirname, "../https/cert.pem"))
};

server.unifiedServer = (request, response) => {
   // get the URL and parse it (including the query string)
   const parsedUrl = url.parse(request.url, true);

   // get the path
   const path = parsedUrl.pathname;
   // trim any trailing slashes
   const trimmedPath = path.replace(/^\/+|\/+$/g, "");

   // get the HTTP method
   const method = request.method.toLowerCase();

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
      const chosenHandler = server.router[trimmedPath] || handlers.notFound;

      // construct the data object to send to the handler
      const data = {
         trimmedPath,
         queryStringObj,
         method,
         headers,
         payload: helpers.parseJsonToObject(buffer)
      };

      // call the request handler
      chosenHandler(data, (statusCode, payload, contentType) => {
         // Determine the type of response (fallback to JSON)
         contentType = typeof contentType === "string" ? contentType : "json";

         // Use the status code called by the handler, or default to 200
         statusCode = typeof statusCode === "number" ? statusCode : 200;

         // Return the response parts that are content specific
         let payloadString = "";

         if (contentType === "json") {
            response.setHeader("Content-Type", "application/json");
            payload = typeof payload === "object" ? payload : {};
            payloadString = JSON.stringify(payload);
         }
         if (contentType === "html") {
            response.setHeader("Content-Type", "text/html");
            payloadString = typeof payload === "string" ? payload : "";
         }

         // Return the response parts that are common to all content types
         response.writeHead(statusCode);
         response.end(payloadString);

         // return the response

         if (statusCode === 200) {
         } else {
         }
      });
   });
};

// Define the request router
server.router = {
   ping: handlers.ping,

   "": handlers.index,

   "account/create": handlers.accountCreate,
   "account/edit": handlers.accountEdit,
   "account/deleted": handlers.accountDeleted,

   "session/create": handlers.sessionCreate,
   "session/deleted": handlers.sessionDeleted,

   "checks/all": handlers.checksAll,
   "checks/create": handlers.checksCreate,
   "checks/edit": handlers.checksEdit,

   "api/users": handlers.users,
   "api/tokens": handlers.tokens,
   "api/checks": handlers.checks
};

server.init = () => {
   const consoleBlue = "\x1b[36m%s\x1b[0m";
   const consolePurple = "\x1b[35m%s\x1b[0m";

   // Start the http server
   server.httpServer.listen(config.httpPort, () => {
      console.log(
         consoleBlue,
         `Server is listening on port ${config.httpPort}...`
      );
   });

   // Start the https server
   server.httpsServer.listen(config.httpsPort, () => {
      console.log(
         consolePurple,
         `Server is listening on port ${config.httpsPort}...`
      );
   });
};

// Export the module
module.exports = server;
