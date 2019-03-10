/*
   Frontend Logic for the Application
*/

const app = {
   config: {
      sessionToken: false
   },
   client: {
      request(headers, path, method, queryStringObject, payload, callback) {
         headers = headers || {};
         path = typeof path === "string" ? path : "/";
         method =
            ["POST", "GET", "PUT", "DELETE"].indexOf(method) > -1
               ? method
               : "GET";

         queryStringObject = queryStringObject || {};
         callback = typeof callback === "function" ? callback : false;

         // for each query string param sent, add it to the path
         const requestUrl = path + "?";
         let counter = 0;
         for (let queryKey in queryStringObject) {
            if (queryStringObject.hasOwnProperty(queryKey)) {
               counter++;
               // if at least one query string parameter has already been added, prepend new ones with an ampersand
               if (counter > 1) {
                  requestUrl += "&";
               }

               // Add the key and value
               requestUrl += queryKey + "=" + queryStringObject[queryKey];
            }
         }

         // Form the http request as a JSON type
         const xhr = new XMLHttpRequest();
         xhr.open(method, requestUrl, true);
         xhr.setRequestHeader("Content-Type", "application/json");

         // For each header sent, add it to the request
         for (let headerKey in headers) {
            if (headers.hasOwnProperty(headerKey)) {
               xhr.setRequestHeader(headerKey, headers[headerKey]);
            }
         }

         // If there is a current session token setInterval, add that as a header
         if (app.config.sessionToken) {
            xhr.setRequestHeader("token", app.config.sessionToken.id);
         }

         // When the request comes back, handle the response
         xhr.onreadystatechange = () => {
            if (xhr.readyState === XMLHttpRequest.DONE) {
               const statusCode = xhr.status;
               const responseReturned = xhr.responseText;

               // Callback if requeted
               if (callback) {
                  try {
                     const parsedResponse = JSON.parse(responseReturned);
                     callback(statusCode, parsedResponse);
                  } catch (err) {
                     callback(statusCode, false);
                  }
               }
            }
         };

         // Send he payload as JSON
         const payloadString = JSON.stringify(payload);
         xhr.send(payloadString);
      }
   }
};
