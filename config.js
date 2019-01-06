/*

Create and export configuration variables

Available environments:
   Staging (default, for development)
   Production

*/

// container for the environments
const environments = {
   staging: {
      httpPort: 3000,
      httpsPort: 3001,
      envName: "staging"
   },
   production: {
      httpPort: 5000,
      httpsPort: 5001,
      envName: "production"
   }
};

// Determine which environment was passed as a command line argument
const currentEnvironment = process.env.NODE_ENV || "";

// Export the correct module
module.exports = environments[currentEnvironment] || environments.staging;
