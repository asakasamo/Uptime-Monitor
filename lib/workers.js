/*

Worker-related tasks

*/

// Dependencies
const path = require("path");
const fs = require("fs");
const _data = require("./data");
const https = require("https");
const http = require("http");
const helpers = require("./helpers");
const url = require("url");
const validation = require("./validation");
const _logs = require("./logs");
const util = require("util");
const debug = util.debuglog("workers");

// Instantiate the worker object
const workers = {};

workers.gatherAllChecks = () => {
   // get all existing checks
   _data.list("checks", (err, checks) => {
      if (!err && checks && checks.length > 0) {
         checks.forEach((check) => {
            _data.read("checks", check, (err, originalCheckData) => {
               if (!err && originalCheckData) {
                  // Pass it to the check validator, and let that function continue or log errors
                  workers.validateCheckData(originalCheckData);
               } else {
                  debug("Error reading one of the check's data");
               }
            });
         });
      } else {
         debug("Error: could not find any checks to process");
      }
   });
};

// Sanity-check the check-data
workers.validateCheckData = (originalCheckData) => {
   originalCheckData = originalCheckData || {};
   originalCheckData.id = validation.getValidatedString(
      originalCheckData.id,
      validation.isValidId
   );
   originalCheckData.userPhone = validation.getValidatedString(
      originalCheckData.userPhone,
      validation.isValidPhone
   );
   originalCheckData.protocol = validation.getValidatedString(
      originalCheckData.protocol,
      validation.isValidProtocol
   );
   originalCheckData.url = validation.getValidatedString(originalCheckData.url);
   originalCheckData.method = validation.getValidatedString(
      originalCheckData.method,
      validation.isValidMethod
   );
   originalCheckData.successCodes =
      originalCheckData.successCodes instanceof Array
         ? originalCheckData.successCodes
         : false;

   originalCheckData.timeoutSeconds = validation.getValidatedTimeoutSeconds(
      originalCheckData.timeoutSeconds
   );

   // Set the keys that may not be set (if the workers have never seen this check before)
   originalCheckData.state = validation.getStateString(originalCheckData.state);

   originalCheckData.lastChecked = validation.getValidPositiveNumber(
      originalCheckData.lastChecked
   );

   // if all the checks pass, pass the data along to the next step in the process
   const ocd = originalCheckData;
   if (
      ocd.id &&
      ocd.userPhone &&
      ocd.protocol &&
      ocd.url &&
      ocd.method &&
      ocd.successCodes &&
      ocd.timeoutSeconds
   ) {
      workers.performCheck(originalCheckData);
   } else {
      debug("Error: One of the checks is not properly formatted; skipping it");
   }
};

// Perform the check, send the original check data and the outcome of the check process to the next step in the process
workers.performCheck = (originalCheckData) => {
   // Prepare the initial check outcome
   const checkOutcome = {
      error: false,
      responseCode: false
   };

   // mark that the outcome has not been sent yet
   let outcomeSent = false;

   // parse the hostname and the path out of the original check data
   const parsedUrl = url.parse(
      `${originalCheckData.protocol}://${originalCheckData.url}`
   );
   const hostname = parsedUrl.hostname;
   const path = parsedUrl.path; // Using path and not "pathname" because we want the query string

   // Construct the request
   const requestDetails = {
      protocol: originalCheckData.protocol + ":",
      hostname,
      method: originalCheckData.method.toUpperCase(),
      path,
      timeout: originalCheckData.timeoutSeconds * 1000
   };

   // instantiate the request object (using either http or https module)
   const moduleToUse = originalCheckData.protocol === "http" ? http : https;
   const request = moduleToUse.request(requestDetails, (response) => {
      // grab the status of the sent request
      const status = response.statusCode;
      // update the checkOutcome and pass the data along
      checkOutcome.responseCode = status;

      if (!outcomeSent) {
         workers.processCheckOutcome(originalCheckData, checkOutcome);
         outcomeSent = true;
      }
   });

   // Bind to the error event so it doesn't get thrown
   request.on("error", (err) => {
      // Update the checkOutcome and pass the data along
      checkOutcome.error = {
         error: true,
         value: err
      };
      if (!outcomeSent) {
         workers.processCheckOutcome(originalCheckData, checkOutcome);
         outcomeSent = true;
      }
   });

   // Bind to the timeout event
   request.on("timeout", (err) => {
      // Update the checkOutcome and pass the data along
      checkOutcome.error = {
         error: true,
         value: "timeout"
      };
      if (!outcomeSent) {
         workers.processCheckOutcome(originalCheckData, checkOutcome);
         outcomeSent = true;
      }
   });

   // End the request
   request.end();
};

// Process the check outcome, upate the check data as needed, trigger an alert to the user if needed
// Accomodate checks that haven't been tested before
workers.processCheckOutcome = (originalCheckData, checkOutcome) => {
   const isCheckUpOrDown = () => {
      return (
         // there was no error
         !checkOutcome.error &&
            // the response code is within what the user specified as valid
            originalCheckData.successCodes.indexOf(checkOutcome.responseCode) >
               -1
            ? "up"
            : "down"
      );
   };

   // Decide if the check is considered up or down
   const state = isCheckUpOrDown();

   const alertWarranted =
      originalCheckData.lastChecked && originalCheckData.state !== state;

   // LOGGING - Log the outcome
   const timeOfCheck = Date.now();
   workers.log(
      originalCheckData,
      checkOutcome,
      state,
      alertWarranted,
      timeOfCheck
   );

   // Update the check data
   const newCheckData = originalCheckData;
   newCheckData.state = state;
   newCheckData.lastChecked = Date.now();

   // Save the updates
   _data.update("checks", newCheckData.id, newCheckData, (err) => {
      if (!err) {
         // Send the new check data to the next phase in the process if needed
         if (alertWarranted) {
            workers.alertUserToStatusChange(newCheckData);
         } else {
            debug("Check outcome has not changed; no alert needed");
         }
      } else {
         debug("Error trying to save updates to one of the checks");
      }
   });
};

// Alert the user to a change in their check status
workers.alertUserToStatusChange = (newCheckData) => {
   const msg = `Alert: Your check for ${newCheckData.method.toUpperCase()} ${
      newCheckData.protocol
   }://${newCheckData.url} is currently ${newCheckData.state}`;

   helpers.sendSmsViaTwilio(newCheckData.userPhone, msg, (err) => {
      if (!err) {
         debug(
            "Success! User was alerted to a status change in their check via sms:",
            msg
         );
      } else {
         debug(
            "Error: Could not send sms alert to user who had a state change in their check"
         );
      }
   });
};

workers.log = (
   originalCheckData,
   checkOutcome,
   state,
   alertWarranted,
   timeOfCheck
) => {
   //form the log data
   const logData = {
      check: originalCheckData,
      outcome: checkOutcome,
      state,
      alert: alertWarranted,
      time: timeOfCheck
   };

   // Convert data to a tring
   const logString = JSON.stringify(logData);

   // determine the name of the log file
   const logFilename = originalCheckData.id;

   // Append the log string to the file
   _logs.append(logFilename, logString, (err) => {
      if (!err) {
         debug("Logging to file succeeded");
      } else {
         debug("Logging to file failed: ", err);
      }
   });
};

// Timer to execte the worker process once per minute
const CHECK_INTERVAL_SECS = 60;
const LOG_INTERVAL_SECS = 60 * 60 * 24; // daily

workers.rotateLogs = () => {
   // List all the non-compressed log files
   _logs.list(false, (err, logs) => {
      if (!err && logs && logs.length > 0) {
         logs.forEach((logName) => {
            // compress the data to a different file
            const logId = logName.replace(".log", "");
            const newFileId = `${logId}-${Date.now()}`;
            _logs.compress(logId, newFileId, (err) => {
               if (!err) {
                  // Truncate the log
                  _logs.truncate(logId, (err) => {
                     if (!err) {
                        debug("Success truncating logFile!");
                     } else {
                        debug("Error truncating logFile");
                     }
                  });
               } else {
                  debug("Error compressing one of the log files: ", err);
               }
            });
         });
      } else {
         debug("Error: Could not find any logs to rotate");
      }
   });
};

workers.loop = function() {
   setInterval(() => {
      workers.gatherAllChecks();
   }, 1000 * CHECK_INTERVAL_SECS);
};

// Timer to execute the log-rotation process once per day
workers.logRotationLoop = function() {
   setInterval(() => {
      workers.rotateLogs();
   }, 1000 * LOG_INTERVAL_SECS);
};

workers.init = () => {
   const consoleYellow = "\x1b[33m%s\x1b[0m";
   // Send to console in yellow
   console.log(consoleYellow, "Background workers are running");

   // Execute all the checks
   workers.gatherAllChecks();

   // Call the loop so the checks will continue to execute on their own
   workers.loop();

   // Compress all the current logs immediately
   workers.rotateLogs();

   // Call the compression loop so logs will be compressed later on
   workers.logRotationLoop();
};

// Export the module
module.exports = workers;
