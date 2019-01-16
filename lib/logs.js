/**
 * Library for storing and rotating log files
 */

// Dependencies
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const Logs = {};

Logs.baseDir = path.join(__dirname, "../.data/logs/");

// Append a string to a file; create the file if it does not exist
Logs.append = (filename, str, callback) => {
   // Open the file for appending
   fs.open(`${Logs.baseDir}${filename}.log`, "a", (err, fileDescriptor) => {
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

// list all the log files in the current directory
Logs.list = (includeCompressedLogs, callback) => {
   fs.readdir(Logs.baseDir, (err, data) => {
      if (!err && data && data.length) {
         const trimmedFilenames = [];
         data.forEach((filename) => {
            // Add the .log files
            if (filename.indexOf(".log") > -1) {
               trimmedFilenames.push(filename.replace(".log", ""));
            }

            if (filename.indexOf(".gz.b64") > -1 && includeCompressedLogs) {
               trimmedFilenames.push(filename.replace(".gz.b64", ""));
            }
         });

         callback(false, trimmedFilenames);
      } else {
         callback(err, data);
      }
   });
};

// Compress the contents of one .log file into a .gz.b64 file within the same dir
Logs.compress = (logId, newFileId, callback) => {
   const sourceFile = logId + ".log";
   const destFile = newFileId + ".gz.b64";

   // read the source file
   fs.readFile(Logs.baseDir + sourceFile, "utf8", (err, inputString) => {
      if (!err && inputString) {
         // compress the data using gzip
         zlib.gzip(inputString, (err, buffer) => {
            if (!err && buffer) {
               // Send the data to the destination file
               fs.open(Logs.baseDir + destFile, "wx", (err, fileDescriptor) => {
                  if (!err && fileDescriptor) {
                     // write to the destination file
                     fs.writeFile(
                        fileDescriptor,
                        buffer.toString("base64"),
                        (err) => {
                           if (!err) {
                              fs.close(fileDescriptor, (err) => {
                                 if (!err) {
                                    callback(false);
                                 } else {
                                    callback(err);
                                 }
                              });
                              // Close the destination file
                           } else {
                              callback(err);
                           }
                        }
                     );
                  } else {
                     callback(err);
                  }
               });
            } else {
               callback(err);
            }
         });
      } else {
         callback(err);
      }
   });
};

// Decompress the contents of a .gz.b64 file into a string variable
Logs.decompress = (fileId, callback) => {
   const filename = fileId + ".gz.b64";
   fs.readFile(Logs.baseDir + filename, "utf8", (err, str) => {
      if (!err && str) {
         // Decompress the data
         const inputBuffer = Buffer.from(str, "base64");
         zlib.unzip(inputBuffer, (err, outputBuffer) => {
            if (!err && outputBuffer) {
               // callback
               const str = outputBuffer.toString();
               callback(false, str);
            } else {
               callback(err);
            }
         });
      } else {
         callback(err);
      }
   });
};

// Truncate a log file
Logs.truncate = (logId, callback) => {
   fs.truncate(`${Logs.baseDir}${logId}.log`, 0, (err) => {
      if (!err) {
         callback(false);
      } else {
         callback(err);
      }
   });
};

module.exports = Logs;
