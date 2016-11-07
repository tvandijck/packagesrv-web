var express = require('express')
  , logger = require('morgan')
  , semver = require('semver')
  , fs = require('fs')
  , app = express()
  , template = require('pug').compileFile(__dirname + '/source/templates/homepage.pug')

app.use(logger('dev'))
app.use(express.static(__dirname + '/static'))

app.get('/', function (req, res, next) {
  try {
    var html = template({ title: 'Home' })
    res.send(html)
  } catch (e) {
    next(e)
  }
})

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

app.listen(process.env.PORT || 3000, function () {
  console.log('Listening on http://localhost:' + (process.env.PORT || 3000))
})


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