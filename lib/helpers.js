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

   // Create a string of random alphanumeric characters of a given length
   createRandomString(len) {
      if (typeof len !== "number" || len < 1) {
         return false;
      }

      const possibleChars = "abcdefghijklmnopqrstuvwxyz1234567890";

      // start the final string
      let str = "";

      for (let i = 0; i < len; i++) {
         const randomChar =
            possibleChars[Math.floor(Math.random() * possibleChars.length)];
         str += randomChar;
      }

      // Return the final string
      return str;
   },

   getDate1HourFromNow() {
      return Date.now() + 1000 * 60 * 60;
   }
};

module.exports = helpers;
