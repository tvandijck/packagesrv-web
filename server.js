var express = require('express')
  , logger = require('morgan')
  , semver = require('semver')
  , cookieSession = require('cookie-session')
  , bodyParser = require('body-parser')
  , passport = require('passport')
  , pg = require('pg-promise')()
  , github = require('github-api')
  , moment = require('moment')
  , marked = require('marked')
  , highlight = require('highlight')
  , fs = require('fs')
  , app = express()
  , c_secrets = require('./secrets.js')

//------------------------------------------------------------------------------
// global configuration

var base_url = 'http://packagesrv.com';
if (c_secrets.BASE_URL) {
	base_url = c_secrets.BASE_URL;
}


//------------------------------------------------------------------------------
// express

app.use(logger('dev'))
app.use(express.static(__dirname + '/static'))
app.set('view engine', 'pug');

app.use(cookieSession({ name: 'session', keys: ['39Er5F3tdn', 'xX5eWOdOlb'] }))

//------------------------------------------------------------------------------
// body parser

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//------------------------------------------------------------------------------
// passport

app.use(passport.initialize());
app.use(passport.session());

var GitHubStrategy = require('passport-github2').Strategy;

passport.use(new GitHubStrategy({
		clientID: c_secrets.GITHUB_CLIENT_ID,
		clientSecret: c_secrets.GITHUB_CLIENT_SECRET,
		callbackURL: base_url + '/api/v1/github-callback',
		authorizationURL: c_secrets.GITHUB_OAUTH ? c_secrets.GITHUB_OAUTH + '/authorize' : undefined,
		tokenURL: c_secrets.GITHUB_OAUTH ? c_secrets.GITHUB_OAUTH + '/access_token' : undefined,
		userProfileURL: c_secrets.GITHUB_API ? c_secrets.GITHUB_API + '/user' : undefined,
		userEmailURL: c_secrets.GITHUB_API ? c_secrets.GITHUB_API + '/user/emails' : undefined
	},
	function (accessToken, refreshToken, profile, done) {
		// pause, dramatic
		process.nextTick(function () {

			console.log("github profile " + JSON.stringify(profile, null, 4))
			return done(null, 
				{
					name: profile.displayName,
					username: profile.username,
					profile_url: profile.profileUrl,
					avatar_url: profile._json.avatar_url,
					access_token: accessToken,
					refresh_token: refreshToken,
				});
		});
	}
));

passport.serializeUser(function(user, done) {
	done(null, user);
});

passport.deserializeUser(function(obj, done) {
	done(null, obj);
});

//------------------------------------------------------------------------------

app.get('/', function (request, response, next) {
  try {
    response.render('Home', { user: request.user });
  } catch (e) {
    next(e)
  }
})

app.get('/login', 
  passport.authenticate('github', { scope: [ 'write:repo_hook' ]}), 
  function (request, response) { }
);

app.get('/logout', function (request, response) {
  var name = request.user.username;
  console.log("logging out " + name)
  request.logout();
  response.redirect('/');
  request.session.notice = "You have successfully been logged out " + name + "!";
});

app.get('/api/v1/github-callback', 
  passport.authenticate('github', { failureRedirect: '/login' }),
  function (request, response) {
    var name = request.user.username;
    console.log("logging in " + JSON.stringify(request.user, null, 4))
    response.redirect('/')
    request.session.notice = "You logged in as " + name + "!";
  }
);


app.get('/api/v1/modules', function (req, res, next) {
  try {
    res.send(getModules())
  } catch (e) {
    next(e)
  }
})

app.get('/api/v1/module/:modname', function (req, res, next) {
  try {
    var modules = getModules()
    var modname = req.params.modname;

    if (modules[modname]) {
      var version = modules[modname][0];
      var link = req.protocol + '://' + req.get('host') + '/module/' + modname + '/' + version;
      res.send(link);
    }
    else {
      res.status(404).send('Module not found');
    }
  } catch (e) {
    next(e)
  }
})

app.get('/module/:modname/:version', function (req, res, next) {
  try {
    var modules = getModules()
    var modname = req.params.modname;
    var version = req.params.version;

    var versions = modules[modname];
    if (versions) {
      var index = versions.indexOf(version);
      if (index >= 0)
      {
        var filename = __dirname + '/data/modules/' + modname + '/' + version + '.zip';
        res.sendFile(filename);
      } else {
        res.status(404).send('Version not found');
      }
    }
    else {
      res.status(404).send('Module not found');
    }
  } catch (e) {
    next(e)
  }
})


//------------------------------------------------------------------------------
// application entry point.
var port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log('Listening on port   : ' + port);
  console.log('base_url            : ' + base_url);
	console.log('GITHUB_CLIENT_ID    : ' + c_secrets.GITHUB_CLIENT_ID);
	console.log('GITHUB_CLIENT_SECRET: ' + c_secrets.GITHUB_CLIENT_SECRET);
})

//------------------------------------------------------------------------------
// utility methods.

function getModules() {
    result = {};

    var dir = __dirname + '/data/modules';
    var modules = fs.readdirSync(dir);
    for(var i in modules) {
        var name = dir + '/' + modules[i];
        if (fs.statSync(name).isDirectory()) {
            var versions = [];

            var files = fs.readdirSync(name);
            for(var j in files) {
              var zip = name + '/' + files[j];
              if (!fs.statSync(zip).isDirectory()) {
                var version = files[j].replace('.zip', '');
                versions.push(version);
              }
            }

            versions.sort();
            result[modules[i]] = versions;
        }
    }
    return result;
}