/*

These are the request handlers.

*/

const _data = require("./data");
const helpers = require("./helpers");
const validation = require("./validation");

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
         const fName = validation.getValidatedString(data.payload.fName);
         const lName = validation.getValidatedString(data.payload.lName);
         const phone = validation.getValidatedString(
            data.payload.phone,
            validation.isValidPhone
         );
         const password = validation.getValidatedString(data.payload.password);
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
         const phone = validation.getValidatedString(
            data.queryStringObj.phone,
            validation.isValidPhone
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
         const phone = validation.getValidatedString(
            data.queryStringObj.phone,
            validation.isValidPhone
         );

         const fName = validation.getValidatedString(data.payload.fName);
         const lName = validation.getValidatedString(data.payload.lName);
         const password = validation.getValidatedString(data.payload.password);

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

      // Required field: phone
      // @TODO Only let an authenticated user delete their own object, and only their own object
      // @TODO Cleanup (delete) any other data files associated with this user
      delete(data, callback) {
         // Check that the phone number is valid
         const phone = validation.getValidatedString(
            data.queryStringObj.phone,
            validation.isValidPhone
         );
         if (phone) {
            _data.read("users", phone, (err, data) => {
               if (!err && data) {
                  _data.delete("users", phone, (err) => {
                     if (!err) {
                        callback(200);
                     } else {
                        callback(500, {
                           Error: "Could not delete the specified user"
                        });
                     }
                  });
               } else {
                  callback(400, { Error: "Could not find the specified user" });
               }
            });
         } else {
            callback(400, { Error: "Missing required field" });
         }
      }
   },

   tokens(data, callback) {
      const acceptableMethods = ["post", "get", "put", "delete"];
      if (acceptableMethods.indexOf(data.method) > -1) {
         handlers._tokens[data.method](data, callback);
      } else {
         callback(405);
      }
   },

   _tokens: {
      // Tokens - post
      // Required data: phone, password
      // Optional data: none
      post(data, callback) {
         const phone = validation.getValidatedString(
            data.payload.phone,
            validation.isValidPhone
         );
         const password = validation.getValidatedString(data.payload.password);

         if (phone && password) {
            // Lookup the user who matches that phone number
            _data.read("users", phone, (err, userData) => {
               if (!err && userData) {
                  // hash the sent password and compare it to the stored password
                  const hashedPassword = helpers.hash(password);
                  if (hashedPassword === userData.hashedPassword) {
                     // If valid, create a new token with a random name
                     const tokenId = helpers.createRandomString(20);
                     // Set expiration date 1 hour in the future
                     const expiration = helpers.getDate1HourFromNow();
                     const tokenObj = {
                        phone,
                        id: tokenId,
                        expiration
                     };

                     // Store the token
                     _data.create("tokens", tokenId, tokenObj, (err) => {
                        if (!err) {
                           callback(200, tokenObj);
                        } else {
                           callback(500, {
                              Error: "Could not create the new token"
                           });
                        }
                     });
                  } else {
                     callback(400, {
                        Error:
                           "Password did not match the specified user's stored password"
                     });
                  }
               } else {
                  callback(400, { Error: "Could not find the specified user" });
               }
            });
         } else {
            callback(400, { Error: "Missing required field(s)" });
         }
      },

      // Required data: id
      // Optional data: none
      // Check that the id is valid and return the token if true
      get(data, callback) {
         const id = validation.getValidatedString(
            data.queryStringObj.id,
            validation.isValidId
         );
         if (id) {
            _data.read("tokens", id, (err, tokenData) => {
               if (!err && tokenData) {
                  callback(200, tokenData);
               } else {
                  callback(404);
               }
            });
         } else {
            callback(400, { Error: "Missing required field" });
         }
      },

      // Required data: id, extend
      // Optional data: none
      put(data, callback) {
         const id = validation.getValidatedString(
            data.queryStringObj.id,
            validation.isValidId
         );
         const extend = data.payload.extend === true;

         if (id && extend) {
            _data.read("tokens", id, (err, tokenData) => {
               if (!err && tokenData) {
                  // Check to make sure the token isn't already expired
                  if (tokenData.expiration > Date.now()) {
                     // Set the expiration an hour from now
                     console.log(helpers);
                     tokenData.expiration = helpers.getDate1HourFromNow();

                     _data.update("tokens", id, tokenData, (err) => {
                        if (!err) {
                           callback(200);
                        } else {
                           callback(500, {
                              Error: "Could not update the token's expiration"
                           });
                        }
                     });
                  } else {
                     callback(400, {
                        Error:
                           "The token has already expired and cannot be extended"
                     });
                  }
               } else {
                  callback(400, { Error: "Specified token does not exist" });
               }
            });
         } else {
            callback(400, { Error: "Missing or inavalid required field" });
         }
      },

      // required data: id
      // Optional data: none
      delete(data, callback) {
         // Check that the id is valid
         const id = validation.getValidatedString(
            data.queryStringObj.id,
            validation.isValidId
         );

         if (id) {
            _data.read("tokens", id, (err, data) => {
               if (!err && data) {
                  _data.delete("tokens", id, (err) => {
                     if (!err) {
                        callback(200);
                     } else {
                        callback(500, {
                           Error: "Could not delete the specified token"
                        });
                     }
                  });
               } else {
                  callback(400, {
                     Error: "Could not find the specified token"
                  });
               }
            });
         } else {
            callback(400, { Error: "Missing required field" });
         }
      }
   }
};

// Export the module
module.exports = handlers;
