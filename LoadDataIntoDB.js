#!/usr/bin/env node

//populates a mongoDB database with information from a SLACK history dump
//needs some work
const fs = require("fs");
const mongoose = require('mongoose');
const yargs = require("yargs");
const { hideBin } = require('yargs/helpers')
const { Schema } = mongoose;
const path = require("path")

const userSchema = new Schema({
    first_name: String,
    last_name: String,
    display_name: String,   
    id: String,
    fill_color: String
})

const channelSchema = new Schema({
    name: String,
    creator: String,
    created: String,
    members: [{ type: Schema.ObjectId, ref: 'User' }]
})

const messageSchema  = new Schema({
    client_msg_id: String,
    type : String,
    text: String, 
    user: {
        type: Schema.ObjectId,
        ref: 'User'
     },
    channel: {
        type: Schema.ObjectId,
        ref: 'Channel'
    },
    ts: Number
})

const channelsModel = mongoose.model('Channel', channelSchema);
const  usersModel = mongoose.model('User', userSchema);
const messagesModel = mongoose.model('Message', messageSchema);
 
async function save_messsage(msg) { 
    const doc = new messagesModel(msg) 
    try {
        await doc.save()
//    console.log('message saved');
    } catch (err) {
        console.log(err);
    }
} 
//  console.log(doc)

async function load(argv) {
    console.log("doing load")
    console.log(argv)

   await mongoose.connect(argv.m).then((con) => {
    console.log(`DB connection successful ${con.path}`);
  });
  console.log("reading channels and users")
  try {
    // Note that jsonString will be a <Buffer> since we did not specify an
    // encoding type for the file. But it'll still work because JSON.parse() will
    // use <Buffer>.toString().
    const jsonString = fs.readFileSync(path.join(argv.directory,"channels.json"));
    channels = JSON.parse(jsonString);
    const jsonString2 = fs.readFileSync(path.join(argv.directory,"users.json"));
    users = JSON.parse(jsonString2);
    
  } catch (err) {
    console.log(err);
    return;
  }
  console.log("done");

    //read channels and 
    //users
    //put everything into a DB?
    console.log("Setting up users in DB")
    const colors = [];
    let startingHue = parseInt(Math.random() * 360);
    let gap_between = parseInt(360 / users.length + 1);
    for (let i = 0; i != users.length; i++) {
        colors[i] = `hsl(${(startingHue + (i * gap_between)) % 360},40%, 80%)`;
    }
    for (i in users) {  
        //console.log(users[i])
        const mem_subset = ( ({profile: { first_name,last_name,display_name},id}) => ({first_name,last_name,display_name,id}) )(users[i]);
        mem_subset.fill_color = colors[i]
        const doc = new usersModel(mem_subset)
        //console.log(doc)
       await doc.save()
    //    console.log("USER SAVED")
    }

    console.log("Setting up Channels in DB")
    for (i in channels) {
        const chn_subset = ( ({ name, creator, created, members }) => ({ name, creator, created, members }) )( channels[i] );
        const chn_subset2 = ( ({ name, creator, created }) => ({ name, creator, created}) )( chn_subset);
        const members_objs = await usersModel.find( {id: {$in: chn_subset.members }})
        chn_subset2.members = members_objs;
        const doc = new channelsModel(chn_subset2)  
        await doc.save()
    }
    

    console.log("loading messages into DB")
    for (i in channels) {
        const channelPath = path.join(argv.directory, channels[i].name);
        console.log(channelPath)
        files = fs.readdirSync(channelPath)
        for (f in files)   {
            const jsonString = fs.readFileSync(path.join(channelPath,files[f]));
            messages = await JSON.parse(jsonString);
            console.log(files[f]+" "+messages.length+ " records")  
          for (j in messages) { 
                if (typeof messages[j] !== 'undefined') {
                    // the variable is defined  
                 //   console.log(messages[j])
                    const message_subset = (({client_msg_id, type , text, user,ts}) => ({client_msg_id, type , text, user,ts}))(messages[j])
                    message_subset.channel = await channelsModel.findOne( { name: channels[i].name});
                  //  console.log(messages[j].user)
                    message_subset.user = await usersModel.findOne({id: messages[j].user})
                  //  console.log(message_subset.user)
                //    console.log(message_subset)
                    await save_messsage (message_subset);
                }
            }
        }
            
        
        console.log("loaded messages for channel "+channels[i].name)
    }
    console.log("all messages done")

    mongoose.connection.close();
    console.log("done")


}

async function clear(argv) {
    console.log("doing clear")
   // console.log(argv)
    
    mongoose.connect(argv.m).then((con) => {
        console.log(`DB connection successful ${con.path}`);
      });
    try {
        await channelsModel.deleteMany();
        console.log('All Channels successfully deleted');
      } catch (err) {
        console.log(err);
      }
      try {
        await usersModel.deleteMany();
        console.log('All users successfully deleted');
      } catch (err) {
        console.log(err);
      }
      try {
        await messagesModel.deleteMany();
        console.log('All messages successfully deleted');
      } catch (err) {
        console.log(err);
      }
    mongoose.connection.close();
    console.log("done")
}

const options = yargs
 yargs(hideBin(process.argv))
 .command({command:"clear",desc:"delete everything in DB",builder:() => {},handler: (argv) => clear(argv)})
 .command({command:"load <directory>",desc:"load from a slack export directory into DB",builder:(yargs) => {
    return yargs.positional('directory', {
        describe: 'path to directory/folder containing slack export',default: "slack_export"
      })
    }, handler: (argv) => load(argv) })
 .option("m", { alias: "mongo_URL", describe: "url to connect to mongoDB", type: "string", demandOption: true })
 .option("u", { alias: "username", describe: "mongoDB username", type: "string", demandOption: false })
 .option("p", { alias: "password", describe: "mongoDB password", type: "string", demandOption: false })
 .demandCommand().argv;



