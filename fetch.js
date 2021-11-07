
'use strict';
const { rejects } = require('assert');
const fs = require('fs');
let path = require("path");
var AWS = require("aws-sdk");
require('dotenv').config();


AWS.config.update({
    region: process.env.AWS_DEFAULT_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});
(async ()=>{
    const arr = [];
    for(let j = 0; j<24;j++) arr.push(j); 
    for (const i of arr)
    {
        var docClient = new AWS.DynamoDB.DocumentClient();
        var queryDate = {date: '2021-11-03',hour:i};
        let query_time = new Date(queryDate.date).getTime();
        console.log(query_time);
        query_time+= 3600000*queryDate.hour;
        var params = {
            TableName : "MessageCount",
            ProjectionExpression:"#time, fromMeGmail, fromMeNonGmail, toMeGmail,toMeNonGmail",
            FilterExpression: "#time > :query_time",
            ExpressionAttributeNames:{
                "#time": "timeStamp"
            },
            ExpressionAttributeValues: {
                ":query_time": query_time
            }
        };
        
        await docClient.scan(params).promise().then((data)=>{
            console.log("Query succeeded." + i);
                const row =  data.Items;
                if(row.length===0 || row[0].timeStamp-query_time>3600000 ) console.log('calculation has not been done for this hour');
                else 
                {
                    console.log(row[0].timeStamp-query_time);
                    console.log(row[0]);
                }
        });

    }

})();  
