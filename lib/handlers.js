/*

These are the request handlers.

*/

const _data = require("./data");
const helpers = require("./helpers");

// Define the handlers
const handlers = {
   ping(data, callback) {
      console.log("pong");
      callback(200);
   },

   notFound(data, callback) {
      console.log("Caught a 404");
      callback(404);
   },

   users(data, callback) {
      const acceptableMethods = ["post", "get", "put", "delete"];
      if (acceptableMethods.indexOf(data.method) > -1) {
         handlers._users[data.method](data, callback);
      } else {
         callback(405);
      }
   },

   _users: {
      // Required data: fName, lName, phone, password, tosAgreement
      post(data, callback) {
         // check that all required fields are filled out
         const fName = helpers.getValidatedString(data.payload.fName);
         const lName = helpers.getValidatedString(data.payload.lName);
         const phone = helpers.getValidatedString(
            data.payload.phone,
            helpers.isValidPhoneNumber
         );
         const password = helpers.getValidatedString(data.payload.password);
         const tosAgreement = data.payload.tosAgreement === true;

         if (fName && lName && phone && password && tosAgreement) {
            // make sure the user doesn't already exist
            _data.read("users", phone, (err, data) => {
               if (err) {
                  // hash the password
                  const hashedPassword = helpers.hash(password);

                  if (hashedPassword) {
                     // create the user object
                     const userObject = {
                        fName,
                        lName,
                        phone,
                        hashedPassword,
                        tosAgreement
                     };

                     // store the user
                     _data.create("users", phone, userObject, (err) => {
                        if (!err) {
                           callback(200);
                        } else {
                           console.log(err);
                           callback(500, {
                              Error: "Could not create the new user"
                           });
                        }
                     });
                  } else {
                     callback(500, {
                        Error: "Could not hash the user's password"
                     });
                  }
               } else {
                  console.log(err);
                  callback(400, {
                     Error: "A user with that phone number already exists"
                  });
               }
            });
         } else {
            callback(400, { Error: "Missing required fields" });
         }
      },

      // Required data: phone
      // Optional data: none
      // TODO: Only let an authenticated user access their own object
      get(data, callback) {
         const phone = helpers.getValidatedString(
            data.queryStringObj.phone,
            helpers.isValidPhoneNumber
         );
         if (phone) {
            _data.read("users", phone, (err, data) => {
               if (!err && data) {
                  // Remove the hashed password from the user object before returning it to the requester
                  delete data.hashedPassword;
                  callback(200, data);
               } else {
                  callback(404);
               }
            });
         } else {
            callback(400, { Error: "Missing required field" });
         }
      },

      // Required data: phone
      // Optional data: fName, lName, password (at least one must be specified)
      // Only let an authenticated user update their own object, dont't let them update another user
      put(data, callback) {
         // Check for the required field
         const phone = helpers.getValidatedString(
            data.queryStringObj.phone,
            helpers.isValidPhoneNumber
         );

         const fName = helpers.getValidatedString(data.payload.fName);
         const lName = helpers.getValidatedString(data.payload.lName);
         const password = helpers.getValidatedString(data.payload.password);

         if (phone) {
            // Error if nothing is sent to update
            if (fName || lName || password) {
               // Lookup the user
               _data.read("users", phone, (err, userData) => {
                  if (!err && userData) {
                     if (fName) {
                        userData.fName = fName;
                     }
                     if (lName) {
                        userData.lName = lName;
                     }
                     if (password) {
                        userData.hashedPassword = helpers.hash(password);
                     }

                     // Store the new updates
                     _data.update("users", phone, userData, (err) => {
                        if (!err) {
                           callback(200);
                        } else {
                           console.log(err);
                           callback(500, {
                              Error: "Could not update the user"
                           });
                        }
                     });
                  } else {
                     callback(400, {
                        Error: "The specified user does not exist"
                     });
                  }
               });
            } else {
               callback(400, { Error: "Missing fields to update" });
            }
         } else {
            callback(400, { Error: "Missing required field" });
         }
      },

      delete(data, callback) {
         //
      }
   }
};

// Export the module
module.exports = handlers;
