/*

Create and export configuration variables

Available environments:
   Staging (default, for development)
   Production

*/

const twilioTestCredentials = {
   accountSid: "ACb0ec35f4290ca8b0e619011598151e04",
   authToken: "c31683df289e67bdb96542aad224d5c9",
   fromPhone: "+15005550006"
};
const twilioLiveCredentials = {
   accountSid: "ACc955b94f5763a32d36acf815558faaa6",
   authToken: "40712d5aba18c88a57e9d32b9ba5d298",
   fromPhone: "+12019480852"
};

// container for the environments
const environments = {
   staging: {
      httpPort: 3000,
      httpsPort: 3001,
      envName: "staging",
      hashingSecret: "thisIsASecret",
      maxChecks: 5,
      twilio: twilioTestCredentials
   },
   production: {
      httpPort: 5000,
      httpsPort: 5001,
      envName: "production",
      hashingSecret: "thisIsAlsoASecret",
      maxChecks: 5,
      twilio: twilioLiveCredentials
   }
};

// Determine which environment was passed as a command line argument
const currentEnvironment = process.env.NODE_ENV || "";

// Export the correct module
module.exports = environments[currentEnvironment] || environments.staging;
