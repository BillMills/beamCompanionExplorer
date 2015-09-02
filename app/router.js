import Ember from 'ember';
import config from './config/environment';

var Router = Ember.Router.extend({
  location: config.locationType,
  rootURL: '/'
});

Router.map(function() {
    this.route('companion', { path: 'companion/:species/:A' });
});

Router.reopen({
  location: 'hash'
});

export default Router;
