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
      console.log("Users");
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
            (s) => s.length === 10
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

      get(data, callback) {
         //
      },

      put(data, callback) {
         //
      },

      delete(data, callback) {
         //
      }
   }
};

// Export the module
module.exports = handlers;
