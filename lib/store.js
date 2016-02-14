'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.isStore = isStore;

var _immutable = require('immutable');

var _utils = require('./utils');

var _immutableHelpers = require('./immutable-helpers');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Stores define how a certain domain of the application should respond to actions
 * taken on the whole system.  They manage their own section of the entire app state
 * and have no knowledge about the other parts of the application state.
 */

var Store = function () {
  function Store(config) {
    _classCallCheck(this, Store);

    this.__handlers = (0, _immutable.Map)({});

    if (config) {
      // allow `MyStore extends Store` syntax without throwing error
      (0, _utils.extend)(this, config);
    }

    this.initialize();
  }

  /**
   * This method is overridden by extending classes to setup message handlers
   * via `this.on` and to set up the initial state
   *
   * Anything returned from this function will be coerced into an ImmutableJS value
   * and set as the initial state for the part of the ReactorCore
   */


  _createClass(Store, [{
    key: 'initialize',
    value: function initialize() {}
    // extending classes implement to setup action handlers


    /**
     * Overridable method to get the initial state for this type of store
     */

  }, {
    key: 'getInitialState',
    value: function getInitialState() {
      return (0, _immutable.Map)();
    }

    /**
     * Takes a current reactor state, action type and payload
     * does the reaction and returns the new state
     */

  }, {
    key: 'handle',
    value: function handle(state, type, payload) {
      var handler = this.__handlers.get(type);

      if (typeof handler === 'function') {
        return handler.call(this, state, payload, type);
      }

      return state;
    }

    /**
     * Pure function taking the current state of store and returning
     * the new state after a NuclearJS reactor has been reset
     *
     * Overridable
     */

  }, {
    key: 'handleReset',
    value: function handleReset(state) {
      return this.getInitialState();
    }

    /**
     * Binds an action type => handler
     */

  }, {
    key: 'on',
    value: function on(actionType, handler) {
      this.__handlers = this.__handlers.set(actionType, handler);
    }

    /**
     * Serializes store state to plain JSON serializable JavaScript
     * Overridable
     * @param {*}
     * @return {*}
     */

  }, {
    key: 'serialize',
    value: function serialize(state) {
      return (0, _immutableHelpers.toJS)(state);
    }

    /**
     * Deserializes plain JavaScript to store state
     * Overridable
     * @param {*}
     * @return {*}
     */

  }, {
    key: 'deserialize',
    value: function deserialize(state) {
      return (0, _immutableHelpers.toImmutable)(state);
    }
  }]);

  return Store;
}();

function isStore(toTest) {
  return toTest instanceof Store;
}

exports.default = (0, _utils.toFactory)(Store);