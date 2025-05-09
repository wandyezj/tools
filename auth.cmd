:: https://www.npmjs.com/package/vsts-npm-auth
:: command to retrieve auth token
:: Run if the following is seen
:: npm ERR! code E401
:: npm ERR! Unable to authenticate, your authentication token seems to be invalid.
npm install --global vsts-npm-auth
vsts-npm-auth -C .npmrc -F