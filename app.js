/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/documentation/web-api/tutorials/code-flow
 */

var express = require('express');
var request = require('request');
var crypto = require('crypto');
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

var client_id = '36dd62132c624fbeaaa2f99068f5ff60'; // your clientId
var client_secret = 'abfd85ba165f45d28ffa6d5cb937a5b8'; // Your secret
var redirect_uri = 'https://377-project.vercel.app/callback'; // Your redirect uri
//var redirect_uri = 'localhost:8888/callback'; 



const generateRandomString = (length) => {
  return crypto
  .randomBytes(60)
  .toString('hex')
  .slice(0, length);
}

var stateKey = 'spotify_auth_state';

var app = express();


//app.get('/', (req, res) => {
//  res.sendFile(path.join(__dirname, 'public', 'login.html'));
//});


app.use(express.static(__dirname + '/public'))
   .use(cors())
   .use(cookieParser());


app.use(express.static(__dirname + '/public', { index: 'login.html' }));


app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email user-top-read playlist-modify-public';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/callback', function(req, res) {
  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {

      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token;
        
        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          console.log(body);
        });
        // we can also pass the token to the browser to make requests from there
        res.redirect('main.html#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token,
          }));
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

app.get('/refresh_token', function(req, res) {

  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 
      'content-type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64')) 
    },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token,
          refresh_token = body.refresh_token;
      res.send({
        'access_token': access_token,
        'refresh_token': refresh_token
      });
    }
  });
});

// Form and Submission Handling  
let submissions = [];

app.use(bodyParser.json());
app.use(express.static('public'));

app.post('/submit', (req, res) => {
    console.log('Form Data:', req.body);
    submissions.push(req.body);
    res.json({ message: 'Submission received!' });
});

app.get('/submissions', (req, res) => {
    res.json(submissions);
});

app.get('/view-submissions', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'main.html'));
});

// Profile Page
let userProfile = {}; // Define userProfile in the global scope- not working

let top5Lists = {  // Define top5Lists in the global scope
  artists: [],
  songs: [],
  albums: []
};

async function getAccessToken() {
  const fetch = await import('node-fetch'); // Use dynamic import
  const response = await fetch.default('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64')
    },
    body: 'grant_type=client_credentials'
  });
  const data = await response.json();
  return data.access_token;
}


app.get('/search', async (req, res) => {
  const query = req.query.q;
  const type = req.query.type;
  const artist = req.query.artist || '';
  const token = await getAccessToken();
  const headers = { 'Authorization': 'Bearer ' + token };

  let searchUrl = `https://api.spotify.com/v1/search?q=${query}&type=${type}&limit=5`;
  if (type === 'track' && artist) {
    searchUrl = `https://api.spotify.com/v1/search?q=track:${query}+artist:${artist}&type=track&limit=5`;
  }

  const searchResults = await fetch(searchUrl, { headers });
  const data = await searchResults.json();

  res.json(data);
});

app.get('/top5', (req, res) => {
  res.json(top5Lists);
});

app.post('/top5', (req, res) => {
  const { artists, songs, albums } = req.body;
  top5Lists = { artists, songs, albums };
  res.status(200).json({ message: 'Top 5 lists updated successfully' });
});


// supabase connection
app.use(express.json());  

const supabaseClient = require('@supabase/supabase-js');
const supabaseUrl = 'https://gjcxmiorsyfgsjtkjypo.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqY3htaW9yc3lmZ3NqdGtqeXBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTYxMzYwMzYsImV4cCI6MjAzMTcxMjAzNn0.sHHVXiluHeICLNpwISWfBtwAVJxY-Wb-iX0TQjchCv4'
const supabase = supabaseClient.createClient(supabaseUrl, supabaseKey)

app.get('/api/supabase', (req, res) => {
  res.sendFile('public/about.html', { root: __dirname})
})

app.get('/api/supabase/about', async (req, res) => {
  console.log('Attempting to GET all entries from About');

  const { data, error } = await supabase
      .from('About')
      .select();

  if (error) {
      console.error('Error fetching data:', error);
      res.status(500).send(error);
  } else {
      res.status(200).json(data);
  }
});

app.post('/api/supabase/ticket', async (req, res) => {
  console.log('Adding new entry to About');
  const { name, email, comment } = req.body;

  const { data, error } = await supabase
      .from('About')
      .insert([{ name, email, comment }]);

  if (error) {
      console.error('Error adding entry:', error);
      res.status(500).send(error);
  } else {
      res.status(201).json(data);
  }
});


//console.log('Listening on 8888');
//app.listen(8888);

const port = process.env.PORT;
app.listen(port, () => console.log(`Server running on port ${port}`));
