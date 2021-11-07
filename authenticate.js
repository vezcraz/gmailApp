'use strict';

const fs = require('fs');
const express = require('express');

const app = express();
app.listen(3000);

const {google} = require('googleapis');
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
let keys ;
const creds = fs.readFileSync('credentials.json');
keys = JSON.parse(creds).installed;
const TOKEN_PATH = "tokens.json";

const oauth2Client = new google.auth.OAuth2(
    keys.client_id,
    keys.client_secret,
    keys.redirect_uris[0]
  );
google.options({auth: oauth2Client});

//uses the client credentials to call the oauth2 api of google for the above mentioned scope
//the user is redirected to the authorization url if the tokens aren't there
//the user can then generate the authroization code and redirect it to /oauth2callback
app.get('/authenticate',(req,res)=>{
    fs.readFile(TOKEN_PATH, (err,tokens)=>{
        if(err)
        {
            const authorizeUrl = oauth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: SCOPES
            });
            res.redirect(authorizeUrl);
        }
        else 
        {
            tokens = JSON.parse(tokens.toString());
            res.end(JSON.stringify(tokens));
        }
    })
    
});

//this is where the authorization code is then forwarded by the user to the client as a get param
//this authorization code can be used to generate the access and refresh tokens for the client
app.get('/oauth2callback',async (req,res)=>{
    console.log('Authorized successfully');
    const {tokens} = await oauth2Client.getToken(req.query.code);
    console.log(tokens);
    oauth2Client.setCredentials(tokens);
    console.log(tokens);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(tokens));
    
})