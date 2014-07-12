// BROWSERIFY WATCH

var fs = require('fs'),
    watchify = require('watchify'),
    reactify = require('reactify');

var output = fs.createWriteStream('public/assets/application.js')

var w = watchify({
  entries: ['./scripts/application.jsx'],
})

w.transform({harmony: true}, reactify)


function rebundle() {
  console.log('[BROWSERIFY] Bundling')
  var bundle = w.bundle()
  bundle.on('error', browserifyError)
  bundle.pipe(output)
}
rebundle = throttle(rebundle)

w.on('update', rebundle)
w.on('log', function(log) {
  console.log('[BROWSERIFY]', log)
})
w.on('error', browserifyError)

function browserifyError(error) {
  if (error.stack) {
    console.error('[BROWSERIFY]', error.message)
  } else {
    console.error(error.toString())
  }
}

rebundle()


// HTTP SERVER

var connect = require('connect'),
    http = require('http'),
    serveStatic = require('serve-static'),
    httpProxy = require('http-proxy'),
    morgan = require('morgan');

var app = connect()

var proxy = httpProxy.createProxyServer({
  target: 'http://127.0.0.1:3000'
})

app.use(morgan(
  '[ HTTPPROXY] :method :url :status :res[content-length] - :response-time ms'))
app.use(serveStatic('public'))
app.use(function(req, res) {
  proxy.web(req, res)
})


http.createServer(app).listen(8000, function() {
  console.log('[ HTTPPROXY] Server started on http://localhost:8000')
});



// LIVE RELOAD

var sane = require('sane');
var tinylr = require('tiny-lr')()

tinylr.listen(35729, function() {
  console.log('[LIVERELOAD] Started')
})

var publicWatcher = sane('public', ['**'])

publicWatcher.on('ready', function(path) {
  console.log('[LIVERELOAD] Watcher ready')
})

publicWatcher.on('change', function(path) {
  console.log('[LIVERELOAD] File changed:', path)
  tinylr.changed({body: {files: [path]}})
})


// SASS WATCH

var sass = require('node-sass')

var sassWatcher = sane('styles', ['**'])
sassWatcher.on('change', function(path) {
  console.log('[      SASS] File changed:', path)
  renderSass()
})

renderSass = throttle(sass.renderFile, {
  file: 'styles/application.scss',
  outFile: 'public/assets/application.css',
  success: function() {
    console.log('[      SASS] Build succeeded')
  }
})

renderSass()

// Taken from: https://github.com/sass/node-sass/blob/master/lib/cli.js#L55
// throttle function, used so when multiple files change at the same time
// (e.g. git pull) the files are only compiled once.
function throttle(fn) {
  var timer;
  var args = Array.prototype.slice.call(arguments, 1);
  return function() {
    var self = this;
    clearTimeout(timer);
    timer = setTimeout(function() {
      fn.apply(self, args);
    }, 20);
  };
}
