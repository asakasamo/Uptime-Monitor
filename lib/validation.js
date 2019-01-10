/*

Functions related to input validation

*/

const validation = {
   getValidatedString(str, validateFunc = () => true) {
      return typeof str === "string" && validateFunc(str)
         ? str.trim() || false
         : false;
   },
   getValidatedTimeoutSeconds(n) {
      if (n > 0 && n < 5) {
         return parseInt(n);
      }
      return false;
   },
   isValidPhone(str) {
      return str && str.length === 10;
   },
   isValidId(str) {
      return str && str.length === 20;
   },
   isValidProtocol(str) {
      return !!{ http: 1, https: 1 }[str];
   },
   isValidMethod(str) {
      return !!{ get: 1, put: 1, post: 1, delete: 1 }[str];
   }
};

module.exports = validation;
