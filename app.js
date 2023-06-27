const mongoose = require('mongoose');
const { Schema } = mongoose;
const path = require('path');

const passportLocalMongoose = require('passport-local-mongoose');

const methodOverride = require('method-override');

const express = require('express')
const passport = require('passport');
const session = require('express-session');  // session middleware
const connectEnsureLogin = require('connect-ensure-login'); //authorization

const LocalStrategy = require('passport-local');
const crypto = require('crypto');
//var db = require('../db');

const app = express();
app.set('views', path.join(__dirname, "views"));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }))
app.use(methodOverride('_method'))

app.use(session({
  secret: 'r8q,+&1LM3)CD*zAGpx1xm{NeQhc;#',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 60 * 60 * 1000 } // 1 hour
}));
app.use(passport.initialize());
app.use(passport.session());

const loginSchema = new Schema ({
    username: String,
    password: String
})

loginSchema.plugin(passportLocalMongoose);

const loginModel = mongoose.model('userData', loginSchema, 'userData');




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

//messageSchema.index({'$**': 'text'});
messageSchema.index({'$**': 'text'},{name:"default_text_index"});

passport.use(loginModel.createStrategy());

passport.serializeUser(loginModel.serializeUser());
passport.deserializeUser(loginModel.deserializeUser());

let connect_string = process.env.MONGOOSE_URL; 

const channelsModel = mongoose.model('Channel', channelSchema);
const  usersModel = mongoose.model('User', userSchema);
const messagesModel = mongoose.model('Message', messageSchema);
/*
const channels = document.querySelector('#channels');
const channelsContainer = document.querySelector('#channelsContainer');
*/

mongoose.connect(connect_string).then((con) => {
    console.log(`DB connection Ok ${con.path}`);
  });


const port = 3000


app.get('/', connectEnsureLogin.ensureLoggedIn(),async (req, res) => {
  //res.send('Hello World!')
  console.log(req.user.username)
  const channels = await channelsModel.find({})
  const users = await usersModel.find({})
  res.render('index',{channels,users})
})

app.get('/channel/:id',connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  const { id } = req.params;
  const channel = await channelsModel.findById(id);
  const messages = await messagesModel.find({channel : channel}).populate("user")
  //console.log(channel);
  //console.log(messages);
  res.render('show_channel', { channel, messages })
})

app.get('/user/:id',connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  const { id } = req.params;
  const user = await usersModel.findById(id);
  const messages = await messagesModel.find({user: user}).populate("channel")
  res.render('show_user', { user, messages })
})

app.get('/login', function(req, res, next) {
  res.render('login');
});

app.post('/login', passport.authenticate('local', { failureRedirect: '/login' }),  function(req, res) {
	console.log(req.user)
	res.redirect('/');
});

app.get('/logout', function(req, res) {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/login');
  });
});

app.post('/search', connectEnsureLogin.ensureLoggedIn(),async (req, res) => {
  console.log(req.body.search_Term); 
  const messages = await messagesModel.find( { "$text": {
    "$search": req.body.search_Term } } ).populate("channel").populate("user")
  console.log(messages)
  const search_term = req.body.search_Term
  res.render('search_results',{search_term,messages})
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
