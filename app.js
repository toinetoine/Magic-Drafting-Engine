// dependencies
var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var app = express();
var cors = require('cors');


// uncomment after placing your favicon in /public
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(require('express-session')({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
// app.use(express.static(path.join(__dirname, 'public')));

// passport config
var Account = require('./models/account');
passport.use(new LocalStrategy(
  Account.authenticate()
));
passport.serializeUser(Account.serializeUser());
passport.deserializeUser(Account.deserializeUser());

app.use(cors({
  origin: 'http://localhost:8080',
  optionsSuccessStatus: 200,
  credentials: true
}));

var authRoute = require('./routes/auth');
var draftRoute = require('./routes/draft');
var setsRoute = require('./routes/set');
var packRoute = require('./routes/pack');

app.use('/auth', authRoute);
app.use('/draft', draftRoute);
app.use('/sets', setsRoute);
app.use('/pack', packRoute);

// mongoose
mongoose.connect('mongodb://localhost/magic', {
  useNewUrlParser: true, 
  useUnifiedTopology: true
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
});

module.exports = app;