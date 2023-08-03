SlackHistory App

Simple WebApp to serve and search Export dumps of Slack workspace history..

Two parts:

A node/express web application, and a simple node.js command-line script thing that parses the json files and pushes things to a mongoDB.

I use a free mongoCloud database: https://www.mongodb.com/cloud/atlas/register
to register.

The connection URL (with username and password is passed on the command-line to the script, and as an environment variable (MONGOOSE_URL) for the web server.

The way I have things set up, you need to push credentials manually to a document: 
I'll fix it sometime..

UserDetails.register({ username: 'example_username', active: false }, 'exciting_secret_passwrod');


