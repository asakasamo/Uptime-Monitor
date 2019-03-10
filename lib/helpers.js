/*

Helper functions for various tasks

*/

const crypto = require("crypto");
const config = require("./config");
const validation = require("./validation");
const QueryString = require("querystring");
const https = require("https");
var path = require("path");
var fs = require("fs");

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
   },

   // send an sms message via twilio
   sendSmsViaTwilio(phone, msg, callback) {
      // validate parameters
      phone = validation.getValidatedString(phone, validation.isValidPhone);
      msg = validation.getValidatedString(msg, validation.isValidSms);

      if (phone && msg) {
         // configure the request payload
         const payload = {
            From: config.twilio.fromPhone,
            To: "+1" + phone,
            Body: msg
         };
         // Stringify the payload
         const strPayload = QueryString.stringify(payload);

         // Configure the request details
         const requestDetails = {
            protocol: "https:",
            hostname: "api.twilio.com",
            method: "POST",
            path: `/2010-04-01/Accounts/${config.twilio.accountSid}/Messages`,
            auth: `${config.twilio.accountSid}:${config.twilio.authToken}`,
            headers: {
               "Content-Type": "application/x-www-form-urlencoded",
               "Content-Length": Buffer.byteLength(strPayload)
            }
         };

         // Instantiate the request object
         const request = https.request(requestDetails, (response) => {
            // Grab the stats of the sent request
            const status = response.statusCode;
            // callback successfully if the request went through
            if (status == 200 || status == 201) {
               callback(false);
            } else {
               callback(`${status}: ${response.statusMessage}`);
            }
         });

         // Bind to the error event so it doesn't get thrown
         request.on("error", (err) => {
            callback(err);
         });

         // Add the payload
         request.write(strPayload);

         // End the request
         request.end();
      } else {
         callback("Given params were missing or invalid");
      }
   },

   // Get the string content of an html template
   getTemplate(templateName, data, callback) {
      if (templateName) {
         const templatesDir = path.join(__dirname, "/../templates/");
         fs.readFile(
            templatesDir + templateName + ".html",
            "utf8",
            (err, str) => {
               if (!err && str) {
                  // Do interpolation on the string
                  const finalString = helpers.interpolate(str, data);
                  callback(false, finalString);
               } else {
                  callback("No template could be found");
               }
            }
         );
      } else {
         callback("A valid template name was not specified");
      }
   },

   // Add the universal header and footer to the string, and pass provided data object to the header
   // and footer for interpoolation
   addUniversalTemplates(str = "", data = {}, callback) {
      helpers.getTemplate("_header", data, (err, headerString) => {
         if (!err && headerString) {
            helpers.getTemplate("_footer", data, (err, footerString) => {
               if (!err && footerString) {
                  // add them all together
                  const fullString = headerString + str + footerString;
                  callback(false, fullString);
               } else {
                  callback("Could not find the footer template");
               }
            });
         } else {
            callback("Could not find the header template");
         }
      });
   },

   //Take a given string and a data object and find/replace all the keys within it
   interpolate(str = "", data = {}) {
      // Add the templateGlobals to the data object, prepending their key name with "global"
      for (let keyName in config.templateGlobals) {
         if (config.templateGlobals.hasOwnProperty(keyName)) {
            data["global." + keyName] = config.templateGlobals[keyName];
         }
      }

      // for each key in the data object, insert its vale into the string at the corresponding placeholder
      for (let key in data) {
         if (data.hasOwnProperty(key) && typeof (data[key] === "string")) {
            if (data[key]) {
               const find = "{" + key + "}";
               const replace = data[key];
               str = str.replace(find, replace);
            }
         }
      }

      return str;
   },

   // Get the contents of a static (public) asset
   getStaticAsset(filename = "", callback) {
      if (filename) {
         const publicDir = path.join(__dirname, "/../public/");
         fs.readFile(publicDir + filename, (err, data) => {
            if (!err && data) {
               callback(false, data);
            } else {
               callback("no file could be found");
            }
         });
      } else {
         callback("A valid file name was not specified");
      }
   }
};

module.exports = helpers;
