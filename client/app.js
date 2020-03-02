var angular = require('angular');
require('angular-route');
require('angular-animate');
require('angular-local-storage');
require('angular1-ui-bootstrap4');
require('./styles/main');

angular
  .module('voteApp', [
    'ngRoute',
    'ngAnimate',
    'ui.bootstrap',
    'LocalStorageModule'
  ])
  .config(require('./appRoutes'));

require('./controllers');
require('./directives');
require('./services');
