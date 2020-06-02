// DONE: Once your application is deployed, copy an API id here so that the frontend could interact with it
const apiId = 'yah64njojj'
const stageName = 'prod'
const awsRegion = 'eu-central-1'
export const apiEndpoint = `https://${apiId}.execute-api.${awsRegion}.amazonaws.com/${stageName}`

export const authConfig = {
  // DONE: Create an Auth0 application and copy values from it into this map
  domain: 'hydronet.eu.auth0.com',            // Auth0 domain
  clientId: 'LwAVGesMf2zLjS5zQp4XE27BNB2VuzrS',          // Auth0 client id
  callbackUrl: 'http://localhost:3000/callback'
}
