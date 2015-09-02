export default Ember.Route.extend({
  setupController(controller, model) {
    controller.set('model', model);
    controller.set('datastore', window.nuclear_datastore );
  }
});