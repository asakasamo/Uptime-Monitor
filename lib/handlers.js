/*

These are the request handlers.

*/

const _data = require("./data");
const helpers = require("./helpers");
const validation = require("./validation");
const config = require("./config");

// Define the handlers
const handlers = {
   ping(data, callback) {
      callback(200, { Response: "pong" });
   },

   notFound(data, callback) {
      callback(404);
   },

   /*** HTML HANDLERS */

   index(data, callback) {
      // Reject any request that isn't a GET
      if (data.method === "get") {
         //Prepare data for interpolation
         const templateData = {
            "head.title": "This is the title",
            "head.description": "This is the meta description",
            "body.title": "Hello templated world!",
            "body.class": "index"
         };

         // Read in an index template as a string
         helpers.getTemplate("index", templateData, function(err, str) {
            if (!err && str) {
               // Add the universal header and footer
               helpers.addUniversalTemplates(str, templateData, (err, str) => {
                  if (!err && str) {
                     // return that page as HTML
                     callback(200, str, "html");
                  } else {
                     callback(500, null, "html");
                  }
               });
            } else {
               callback(500, null, "html");
            }
         });
      } else {
         callback(405, null, "html");
      }
   },

   /*** JSON API HANDLERS ***/

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
      get(data, callback) {
         const phone = validation.getValidatedString(
            data.queryStringObj.phone,
            validation.isValidPhone
         );
         if (phone) {
            // Get the token from the headers
            const token = validation.getValidatedString(data.headers.token);

            //Verify that the given token is valid for the phone number
            handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
               if (tokenIsValid) {
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
                  callback(403, {
                     Error: "Missing or invalid token in header"
                  });
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
               // Get the token from the headers
               const token = validation.getValidatedString(data.headers.token);
               if (tokenIsValid) {
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
                  callback(403, {
                     Error: "Missing or invalid token in header"
                  });
               }
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
            // do token validation
            const token = validation.getValidatedString(data.headers.token);
            handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
               if (tokenIsValid) {
                  _data.read("users", phone, (err, userData) => {
                     if (!err && userData) {
                        _data.delete("users", phone, (err) => {
                           if (!err) {
                              // Delete each of the checks associated with the user
                              const userChecks =
                                 userData.checks instanceof Array
                                    ? userData.checks
                                    : [];

                              const checksToDelete = userChecks.length;
                              if (checksToDelete > 0) {
                                 let checksDeleted = 0;
                                 let deletionErrors = false;
                                 // loop through the checks
                                 userChecks.forEach((checkId) => {
                                    _data.delete("checks", checkId, (err) => {
                                       if (err) {
                                          deletionErrors = true;
                                       }
                                       checksDeleted++;

                                       if (checksDeleted === checksToDelete) {
                                          if (!deletionErrors) {
                                             callback(200);
                                          } else {
                                             callback(500, {
                                                Error:
                                                   "Errors encountered while attempting to delete all of the user's checks"
                                             });
                                          }
                                       }
                                    });
                                 });
                              } else {
                                 callback(200);
                              }
                           } else {
                              callback(500, {
                                 Error: "Could not delete the specified user"
                              });
                           }
                        });
                     } else {
                        callback(400, {
                           Error: "Could not find the specified user"
                        });
                     }
                  });
               } else {
                  callback(403, {
                     Error: "Missing or invalid token in header"
                  });
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
                  callback(404, {
                     Error: "Could not find the specified token"
                  });
               }
            });
         } else {
            callback(400, { Error: "Missing required field" });
         }
      },

      verifyToken(id, phone, callback) {
         // Lookup the token
         _data.read("tokens", id, (err, tokenData) => {
            if (!err && tokenData) {
               // Check that the token is for the given user and has not expired
               callback(
                  tokenData.phone === phone && tokenData.expiration > Date.now()
               );
            } else {
               callback(false);
            }
         });
      }
   },

   checks(data, callback) {
      const acceptableMethods = ["post", "get", "put", "delete"];
      if (acceptableMethods.indexOf(data.method) > -1) {
         handlers._checks[data.method](data, callback);
      } else {
         callback(405);
      }
   },

   _checks: {
      // Required data: protocol, url method, successCodes, timeoutSeconds
      // Optional data: none
      post(data, callback) {
         // validate inputs
         const protocol = validation.getValidatedString(
            data.payload.protocol,
            validation.isValidProtocol
         );
         const url = validation.getValidatedString(data.payload.url);
         const method = validation.getValidatedString(
            data.payload.method,
            validation.isValidMethod
         );
         const successCodes =
            data.payload.successCodes instanceof Array &&
            data.payload.successCodes.length > 0
               ? data.payload.successCodes
               : false;
         const timeoutSeconds = validation.getValidatedTimeoutSeconds(
            data.payload.timeoutSeconds
         );

         if (protocol && url && method && successCodes && timeoutSeconds) {
            // make sure user is logged in - get the token fromt he headers
            const token = validation.getValidatedString(data.headers.token);

            //lookup the user by reading the token
            _data.read("tokens", token, (err, tokenData) => {
               if (!err && tokenData) {
                  const userPhone = tokenData.phone;

                  // lookup the user data
                  _data.read("users", userPhone, (err, userData) => {
                     if (!err && userData) {
                        const userChecks =
                           userData.checks instanceof Array
                              ? userData.checks
                              : [];
                        // verify that the user has less than the number of max checks allowed
                        if (userChecks.length < config.maxChecks) {
                           // create a random id for the check
                           const checkId = helpers.createRandomString(20);

                           // Create the check object and include the user's phone
                           const checkObj = {
                              id: checkId,
                              userPhone: userPhone,
                              protocol,
                              url,
                              method,
                              successCodes,
                              timeoutSeconds
                           };

                           // Save the object
                           _data.create("checks", checkId, checkObj, (err) => {
                              if (!err) {
                                 // add te check id to the user's object
                                 userData.checks = userChecks;
                                 userData.checks.push(checkId);

                                 // save the new user data
                                 _data.update(
                                    "users",
                                    userPhone,
                                    userData,
                                    (err) => {
                                       if (!err) {
                                          // Return the data about the new check
                                          callback(200, checkObj);
                                       } else {
                                          callback(500, {
                                             Error:
                                                "Could not update the user with the new check"
                                          });
                                       }
                                    }
                                 );
                              } else {
                                 callback(500, {
                                    Error: "Could not create the new check"
                                 });
                              }
                           });
                        } else {
                           callback(400, {
                              Error: `The user already has the max number of checks allowed (${
                                 config.maxChecks
                              })`
                           });
                        }
                     } else {
                        callback(403);
                     }
                  });
               } else {
                  callback(403);
               }
            });
         } else {
            callback(400, { Error: "Missing or invalid inputs" });
         }
      },
      // required data: id
      // Optional data: none
      get(data, callback) {
         const id = validation.getValidatedString(
            data.queryStringObj.id,
            validation.isValidId
         );
         if (id) {
            // Lookup the check
            _data.read("checks", id, (err, checkData) => {
               if (!err && checkData) {
                  // Get the token from the headers
                  const token = validation.getValidatedString(
                     data.headers.token
                  );

                  //Verify that the given token is valid for the user who created the check
                  handlers._tokens.verifyToken(
                     token,
                     checkData.userPhone,
                     (tokenIsValid) => {
                        if (tokenIsValid) {
                           // return the check data
                           callback(200, checkData);
                        } else {
                           callback(403, {
                              Error: "Missing or invalid token in header"
                           });
                        }
                     }
                  );
               } else {
                  callback(404, { Error: "Check id not found" });
               }
            });
         } else {
            callback(400, { Error: "Missing or invalid required field" });
         }
      },
      // Required data: id
      // optional data: protocol, url, method, successCodes, timeoutSeconds (one must be sent)
      put(data, callback) {
         // check for the required field
         const id = validation.getValidatedString(
            data.payload.id,
            validation.isValidId
         );

         // Check for the optional fields
         const protocol = validation.getValidatedString(
            data.payload.protocol,
            validation.isValidProtocol
         );
         const url = validation.getValidatedString(data.payload.url);
         const method = validation.getValidatedString(
            data.payload.method,
            validation.isValidMethod
         );
         const successCodes =
            data.payload.successCodes instanceof Array &&
            data.payload.successCodes.length > 0
               ? data.payload.successCodes
               : false;
         const timeoutSeconds = validation.getValidatedTimeoutSeconds(
            data.payload.timeoutSeconds
         );

         // Check to make sure id is valid
         if (id) {
            // check to make sure one or more optional fields has been sent
            if (protocol || url || method || successCodes || timeoutSeconds) {
               _data.read("checks", id, (err, checkData) => {
                  if (!err && checkData) {
                     // Get the token from the headers
                     const token = validation.getValidatedString(
                        data.headers.token
                     );

                     //Verify that the given token is valid for the user who created the check
                     handlers._tokens.verifyToken(
                        token,
                        checkData.userPhone,
                        (tokenIsValid) => {
                           if (tokenIsValid) {
                              checkData.protocol =
                                 protocol || checkData.protocol;
                              checkData.url = url || checkData.url;
                              checkData.method = method || checkData.method;
                              checkData.successCodes =
                                 successCodes || checkData.successCodes;
                              checkData.timeoutSeconds =
                                 timeoutSeconds || checkData.timeoutSeconds;

                              _data.update("checks", id, checkData, (err) => {
                                 if (!err) {
                                    callback(200);
                                 } else {
                                    callback(500, {
                                       Error: "Could not update the check"
                                    });
                                 }
                              });
                           } else {
                              callback(403);
                           }
                        }
                     );
                  } else {
                     callback(400, { Error: "Check ID did not exist" });
                  }
               });
            } else {
               callback(400, { Error: "Missing fields to update" });
            }
         } else {
            callback(400, { Error: "Missing required field" });
         }
      },
      // Required data: id
      // Optional data: none
      delete(data, callback) {
         // Check that the id is valid
         const id = validation.getValidatedString(
            data.queryStringObj.id,
            validation.isValidId
         );

         if (id) {
            // lookup the check that they want to delete
            _data.read("checks", id, (err, checkData) => {
               if (!err && checkData) {
                  const token = validation.getValidatedString(
                     data.headers.token
                  );

                  handlers._tokens.verifyToken(
                     token,
                     checkData.userPhone,
                     (tokenIsValid) => {
                        if (tokenIsValid) {
                           // Delete the check data
                           _data.delete("checks", id, (err) => {
                              if (!err) {
                                 _data.read(
                                    "users",
                                    checkData.userPhone,
                                    (err, userData) => {
                                       if (!err) {
                                          const userChecks =
                                             userData.checks instanceof Array
                                                ? userData.checks
                                                : [];

                                          // remove the deleted check from their list of checks
                                          const checkPosition = userChecks.indexOf(
                                             id
                                          );

                                          if (checkPosition > -1) {
                                             userChecks.splice(
                                                checkPosition,
                                                1
                                             );

                                             // re-save the user's data
                                             _data.update(
                                                "users",
                                                checkData.userPhone,
                                                userData,
                                                (err) => {
                                                   if (!err) {
                                                      callback(200);
                                                   } else {
                                                      callback(500, {
                                                         Error:
                                                            "Could not update the user"
                                                      });
                                                   }
                                                }
                                             );
                                          } else {
                                             callback(500, {
                                                Error:
                                                   "Check deleted, but could not find it in the user object"
                                             });
                                          }
                                       } else {
                                          callback(500, {
                                             Error:
                                                "Check deleted, but creator not found"
                                          });
                                       }
                                    }
                                 );
                              } else {
                                 callback(500, {
                                    Error: "Could not delete the check"
                                 });
                              }
                           });
                        } else {
                           callback(403, { Error: "Missing or invalid token" });
                        }
                     }
                  );
               } else {
                  callback(400, {
                     Error: "The specified check ID does not exist"
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
