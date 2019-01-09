/*

Functions related to input validation

*/

const validation = {
   getValidatedString(str, validateFunc = () => true) {
      return typeof str === "string" && validateFunc(str)
         ? str.trim() || false
         : false;
   },
   isValidPhone(str) {
      return str && str.length === 10;
   },
   isValidId(str) {
      return str && str.length === 20;
   }
};

module.exports = validation;
