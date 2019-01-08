/*

These are the request handlers.

*/

// Define the handlers
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

// Export the module
module.exports = handlers;
