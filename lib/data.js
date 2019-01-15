/*

Library for storing and editing data

*/

/**
 * Dependencies
 */

// filesystem functions
const fs = require("fs");
// used to normalize the path to different directories
const path = require("path");

const helpers = require("./helpers");

/**
 * Functions
 */

// Container for the module (to be exported)
const lib = {
   // the base directory of the data folder
   baseDir: path.join(__dirname, "/../.data/"),

   create(dir, filename, data, callback) {
      // open the file for writing
      fs.open(
         `${lib.baseDir}${dir}/${filename}.json`,
         "wx",
         (err, fileDescriptor) => {
            if (!err && fileDescriptor) {
               // convert the data to a string
               var stringData = JSON.stringify(data);

               //write to the file and close it
               fs.writeFile(fileDescriptor, stringData, (err) => {
                  if (!err) {
                     fs.close(fileDescriptor, (err) => {
                        if (!err) {
                           callback(false);
                        } else {
                           callback("Error closing new file");
                        }
                     });
                  } else {
                     callback("Error writing to new file");
                  }
               });
            } else {
               callback("Could not create new file, it may already exist");
            }
         }
      );
   },

   read(dir, filename, callback) {
      fs.readFile(
         `${lib.baseDir}${dir}/${filename}.json`,
         "utf8",
         (err, data) => {
            if (!err && data) {
               const parsedData = helpers.parseJsonToObject(data);
               callback(false, parsedData);
            } else {
               callback(err, data);
            }
         }
      );
   },

   update(dir, filename, data, callback) {
      fs.open(
         `${lib.baseDir}${dir}/${filename}.json`,
         "r+",
         (err, fileDescriptor) => {
            if (!err && fileDescriptor) {
               const stringData = JSON.stringify(data);

               // truncate the file before writing on top of it
               fs.truncate(fileDescriptor, (err) => {
                  if (!err) {
                     // write to the file and close it
                     fs.writeFile(fileDescriptor, stringData, (err) => {
                        if (!err) {
                           fs.close(fileDescriptor, (err) => {
                              if (!err) {
                                 callback(false);
                              } else {
                                 callback("Error closing existing file");
                              }
                           });
                        } else {
                           callback("Error writing to existing file");
                        }
                     });
                  } else {
                     callback("Error truncating the file");
                  }
               });
            } else {
               callback(
                  "Could not open the file for updating - it may not exist yet"
               );
            }
         }
      );
   },

   delete(dir, filename, callback) {
      // unlink the file
      fs.unlink(`${lib.baseDir}${dir}/${filename}.json`, (err) => {
         if (!err) {
            callback(false);
         } else {
            callback("Error deleting file");
         }
      });
   },

   // list all the items in a directory
   list(dir, callback) {
      fs.readdir(`${lib.baseDir + dir}/`, (err, data) => {
         if (!err && data && data.length > 0) {
            const trimmedFilenames = [];
            data.forEach((filename) => {
               trimmedFilenames.push(filename.replace(".json", ""));
            });
            callback(false, trimmedFilenames);
         } else {
            callback(err, data);
         }
      });
   }
};

module.exports = lib;
