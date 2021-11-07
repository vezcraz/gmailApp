exports.handler = async (event) => {
    // TODO implement
    
    'use strict';

    const { rejects } = require('assert');
    const fs = require('fs');
    let path = require("path");

    const {google} = require('googleapis');
    const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
    let keys ;
    const creds = fs.readFileSync('credentials.json');
    keys = JSON.parse(creds).installed;
    const TOKEN_PATH = 'tokens.json';
    // const
    var AWS = require("aws-sdk");
    require('dotenv').config();
    AWS.config.update({
        region: process.env.AWS_DEFAULT_REGION,
        // accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        // secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    });

    var docClient = new AWS.DynamoDB.DocumentClient();

   
    console.log("Adding a new item...");
    

    const oauth2Client = new google.auth.OAuth2(
        keys.client_id,
        keys.client_secret,
        keys.redirect_uris[0]
    );
    google.options({auth: oauth2Client});
    
    //tries to authenticate the user using the tokens acquired from authenticate.js
    const authenticate=  ()=>{
        console.log('trying to authenticate');
        return new Promise((resolve,reject)=>{
            fs.readFile(TOKEN_PATH, (err,tokens)=>{
                if(err)
                {
                    reject('tokens missing for accessing data; Create tokens.json file to continue');
                }
                else 
                {
                    tokens = JSON.parse(tokens.toString());
                    console.log(tokens);
                    oauth2Client.setCredentials(tokens);
                    resolve();
                }
            });

        });
    }

    //calculates and returns the count for a particular page of results
    const calculateCount = async (gmail,options)=>
    {
        let messages;
        let cnt=0;
        try{
            messages = await gmail.users.messages.list(options);
            if(messages.data.messages)
                cnt = messages.data.messages.length;
        }
        catch(e){
            console.log(e);
        }
        const ret =  {count:cnt, pageToken:messages.data.nextPageToken};
        // console.log(ret);
        return ret;
    }

    //calculates and returns the total count for a particular query type
    const calculate = async(gmail, query)=>{
        let cnt=0, currPageToken = null;
        const options = {
            userId: 'me', 
            q: query,
            maxResults: 500,
            pageToken: currPageToken
        };
        do
        {
            const ret =  await calculateCount(gmail,options);
            cnt+= ret.count;
            currPageToken = ret.pageToken;
            options.pageToken = currPageToken;
        }while(currPageToken);
        return cnt;
    }
    const fetchResults = async ()=>{
        console.log('fetch started')
        await authenticate()
        
        const gmail = google.gmail({version: 'v1'});
        const myProfile= (await gmail.users.getProfile({userId:'me'}));
        const myEmail = myProfile.data.emailAddress;
        const lastHourStart = Math.floor((Date.now())/1000 - 3600);
        console.log(lastHourStart)
        let fromMeGmail = 0, toMeGmail = 0, fromMeNonGmail = 0, toMeNonGmail=0;
        fromMeGmail =  calculate(gmail,
            `after: ${lastHourStart} from: ${myEmail} to:(*@gmail.com)`);
        fromMeNonGmail =  calculate(gmail,
            `after: ${lastHourStart} from:${myEmail} to:(!(*@gmail.com))`);
        toMeGmail =  calculate(gmail,
            `after: ${lastHourStart} to:${myEmail} from:(*@gmail.com)`);    
        toMeNonGmail =  calculate(gmail,
            `after: ${lastHourStart} to:${myEmail} from:(!(*@gmail.com))`);
        let ans ;
        await Promise.all([fromMeGmail,fromMeNonGmail,toMeGmail,toMeNonGmail]).then((result)=>ans=result);
        console.log(ans);
        const params = {
            TableName:'MessageCount',
            Item:{
                id:1,
                timeStamp: (lastHourStart+3600)*1000,
                fromMeGmail: ans[0],
                fromMeNonGmail: ans[1],
                toMeGmail: ans[2],
                toMeNonGmail: ans[3]
            }
        };
        const res =  await docClient.put(params).promise()
    
    };
    await fetchResults();
    
};
// exports.handler();
