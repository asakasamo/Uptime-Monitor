/**
 * Library for storing and rotating log files
 */

// Dependencies
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const lib = {};

lib.baseDir = path.join(__dirname, "../.data/logs/");

// Append a string to a file; create the file if it does not exist
lib.append = (filename, str, callback) => {
   // Open the file for appending
   fs.open(`${lib.baseDir}${filename}.log`, "a", (err, fileDescriptor) => {
      console.log(err, fileDescriptor);

      if (!err && fileDescriptor) {
         fs.appendFile(fileDescriptor, str + "\n", (err) => {
            if (!err) {
               fs.close(fileDescriptor, (err) => {
                  if (!err) {
                     callback(false);
                  } else {
                     callback(
                        "Error closing the log file that was being appended"
                     );
                  }
               });
            } else {
               callback("Error appending to file");
            }
         });
      } else {
         callback("Could not open log file for appending");
      }
   });
};

module.exports = lib;
