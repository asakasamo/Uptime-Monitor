/*

This app is an "uptime monitor", which allows users to enter URLs they want monitored, and receive
alerts when those resources "go down" or "come back up".

*/

// Dependencies
const server = require("./lib/server");
const workers = require("./lib/workers");

// Declare the app
const app = {
   // init function
   init() {
      // Start the server
      server.init();
      //start the workers
      workers.init();
   }
};

// Execute
app.init();

// Export the app
module.exports = app;
