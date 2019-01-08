/*

Helper functions for various tasks

*/

const crypto = require("crypto");
const config = require("./config");

const helpers = {
   // Create a SHA256 hash
   hash(str) {
      if (!(str && typeof str === "string")) {
         return null;
      }

      const hash = crypto
         .createHmac("sha256", config.hashingSecret)
         .update(str)
         .digest("hex");

      return hash;
   },

   // parse a JON string to an object in all cases without throwing
   parseJsonToObject(str) {
      try {
         const obj = JSON.parse(str);
         return obj;
      } catch (e) {
         return {};
      }
   },

   getValidatedString(str, validateFunc = () => true) {
      return typeof str === "string" && validateFunc(str)
         ? str.trim() || false
         : false;
   },

   isValidPhoneNumber(str) {
      return str && str.length === 10;
   }
};

module.exports = helpers;
