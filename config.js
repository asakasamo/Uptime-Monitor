/*

Create and export configuration variables

Available environments:
   Staging (default, for development)
   Production

*/

// container for the environments
const environments = {
   staging: {
      port: 3000,
      envName: "staging"
   },
   production: {
      port: 5000,
      envName: "production"
   }
};

// Determine which environment was passed as a command line argument
const currentEnvironment = process.env.NODE_ENV || "";

// Export the correct module
module.exports = environments[currentEnvironment] || environments.staging;
