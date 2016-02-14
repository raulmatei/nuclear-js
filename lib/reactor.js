'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _immutable = require('immutable');

var _immutable2 = _interopRequireDefault(_immutable);

var _createReactMixin = require('./create-react-mixin');

var _createReactMixin2 = _interopRequireDefault(_createReactMixin);

var _fns = require('./reactor/fns');

var fns = _interopRequireWildcard(_fns);

var _cache = require('./reactor/cache');

var _keyPath = require('./key-path');

var _getter = require('./getter');

var _immutableHelpers = require('./immutable-helpers');

var _utils = require('./utils');

var _records = require('./reactor/records');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * State is stored in NuclearJS Reactors.  Reactors
 * contain a 'state' object which is an Immutable.Map
 *
 * The only way Reactors can change state is by reacting to
 * messages.  To update state, Reactor's dispatch messages to
 * all registered cores, and the core returns it's new
 * state based on the message
 */

var Reactor = function () {
  function Reactor() {
    var config = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, Reactor);

    var debug = !!config.debug;
    var baseOptions = debug ? _records.DEBUG_OPTIONS : _records.PROD_OPTIONS;
    var initialReactorState = new _records.ReactorState({
      debug: debug,
      cache: config.cache || (0, _cache.DefaultCache)(),
      // merge config options with the defaults
      options: baseOptions.merge(config.options || {})
    });

    this.prevReactorState = initialReactorState;
    this.reactorState = initialReactorState;
    this.observerState = new _records.ObserverState();

    this.ReactMixin = (0, _createReactMixin2.default)(this);

    // keep track of the depth of batch nesting
    this.__batchDepth = 0;

    // keep track if we are currently dispatching
    this.__isDispatching = false;
  }

  /**
   * Evaluates a KeyPath or Getter in context of the reactor state
   * @param {KeyPath|Getter} keyPathOrGetter
   * @return {*}
   */


  _createClass(Reactor, [{
    key: 'evaluate',
    value: function evaluate(keyPathOrGetter) {
      var _fns$evaluate = fns.evaluate(this.reactorState, keyPathOrGetter);

      var result = _fns$evaluate.result;
      var reactorState = _fns$evaluate.reactorState;

      this.reactorState = reactorState;
      return result;
    }

    /**
     * Gets the coerced state (to JS object) of the reactor.evaluate
     * @param {KeyPath|Getter} keyPathOrGetter
     * @return {*}
     */

  }, {
    key: 'evaluateToJS',
    value: function evaluateToJS(keyPathOrGetter) {
      return (0, _immutableHelpers.toJS)(this.evaluate(keyPathOrGetter));
    }

    /**
     * Adds a change observer whenever a certain part of the reactor state changes
     *
     * 1. observe(handlerFn) - 1 argument, called anytime reactor.state changes
     * 2. observe(keyPath, handlerFn) same as above
     * 3. observe(getter, handlerFn) called whenever any getter dependencies change with
     *    the value of the getter
     *
     * Adds a change handler whenever certain deps change
     * If only one argument is passed invoked the handler whenever
     * the reactor state changes
     *
     * @param {KeyPath|Getter} getter
     * @param {function} handler
     * @return {function} unwatch function
     */

  }, {
    key: 'observe',
    value: function observe(getter, handler) {
      var _this = this;

      if (arguments.length === 1) {
        handler = getter;
        getter = [];
      }

      var _fns$addObserver = fns.addObserver(this.observerState, getter, handler);

      var observerState = _fns$addObserver.observerState;
      var entry = _fns$addObserver.entry;

      this.observerState = observerState;
      return function () {
        _this.observerState = fns.removeObserverByEntry(_this.observerState, entry);
      };
    }
  }, {
    key: 'unobserve',
    value: function unobserve(getter, handler) {
      if (arguments.length === 0) {
        throw new Error('Must call unobserve with a Getter');
      }
      if (!(0, _getter.isGetter)(getter) && !(0, _keyPath.isKeyPath)(getter)) {
        throw new Error('Must call unobserve with a Getter');
      }

      this.observerState = fns.removeObserver(this.observerState, getter, handler);
    }

    /**
     * Dispatches a single message
     * @param {string} actionType
     * @param {object|undefined} payload
     */

  }, {
    key: 'dispatch',
    value: function dispatch(actionType, payload) {
      if (this.__batchDepth === 0) {
        if (fns.getOption(this.reactorState, 'throwOnDispatchInDispatch')) {
          if (this.__isDispatching) {
            this.__isDispatching = false;
            throw new Error('Dispatch may not be called while a dispatch is in progress');
          }
        }
        this.__isDispatching = true;
      }

      try {
        this.reactorState = fns.dispatch(this.reactorState, actionType, payload);
      } catch (e) {
        this.__isDispatching = false;
        throw e;
      }

      try {
        this.__notify();
      } finally {
        this.__isDispatching = false;
      }
    }

    /**
     * Allows batching of dispatches before notifying change observers
     * @param {Function} fn
     */

  }, {
    key: 'batch',
    value: function batch(fn) {
      this.batchStart();
      fn();
      this.batchEnd();
    }

    /**
     * @deprecated
     * @param {String} id
     * @param {Store} store
     */

  }, {
    key: 'registerStore',
    value: function registerStore(id, store) {
      /* eslint-disable no-console */
      console.warn('Deprecation warning: `registerStore` will no longer be supported in 1.1, use `registerStores` instead');
      /* eslint-enable no-console */
      this.registerStores(_defineProperty({}, id, store));
    }

    /**
     * @param {Object} stores
     */

  }, {
    key: 'registerStores',
    value: function registerStores(stores) {
      this.reactorState = fns.registerStores(this.reactorState, stores);
      this.__notify();
    }

    /**
     * Replace store implementation (handlers) without modifying the app state or calling getInitialState
     * Useful for hot reloading
     * @param {Object} stores
     */

  }, {
    key: 'replaceStores',
    value: function replaceStores(stores) {
      this.reactorState = fns.replaceStores(this.reactorState, stores);
    }

    /**
     * Returns a plain object representing the application state
     * @return {Object}
     */

  }, {
    key: 'serialize',
    value: function serialize() {
      return fns.serialize(this.reactorState);
    }

    /**
     * @param {Object} state
     */

  }, {
    key: 'loadState',
    value: function loadState(state) {
      this.reactorState = fns.loadState(this.reactorState, state);
      this.__notify();
    }

    /**
     * Resets the state of a reactor and returns back to initial state
     */

  }, {
    key: 'reset',
    value: function reset() {
      var newState = fns.reset(this.reactorState);
      this.reactorState = newState;
      this.prevReactorState = newState;
      this.observerState = new _records.ObserverState();
    }

    /**
     * Notifies all change observers with the current state
     * @private
     */

  }, {
    key: '__notify',
    value: function __notify() {
      var _this2 = this;

      if (this.__batchDepth > 0) {
        // in the middle of batch, dont notify
        return;
      }

      var dirtyStores = this.reactorState.get('dirtyStores');
      if (dirtyStores.size === 0) {
        return;
      }

      var observerIdsToNotify = _immutable2.default.Set().withMutations(function (set) {
        // notify all observers
        set.union(_this2.observerState.get('any'));

        dirtyStores.forEach(function (id) {
          var entries = _this2.observerState.getIn(['stores', id]);
          if (!entries) {
            return;
          }
          set.union(entries);
        });
      });

      observerIdsToNotify.forEach(function (observerId) {
        var entry = _this2.observerState.getIn(['observersMap', observerId]);
        if (!entry) {
          // don't notify here in the case a handler called unobserve on another observer
          return;
        }

        var getter = entry.get('getter');
        var handler = entry.get('handler');

        var prevEvaluateResult = fns.evaluate(_this2.prevReactorState, getter);
        var currEvaluateResult = fns.evaluate(_this2.reactorState, getter);

        _this2.prevReactorState = prevEvaluateResult.reactorState;
        _this2.reactorState = currEvaluateResult.reactorState;

        var prevValue = prevEvaluateResult.result;
        var currValue = currEvaluateResult.result;

        if (!_immutable2.default.is(prevValue, currValue)) {
          handler.call(null, currValue);
        }
      });

      var nextReactorState = fns.resetDirtyStores(this.reactorState);

      this.prevReactorState = nextReactorState;
      this.reactorState = nextReactorState;
    }

    /**
     * Starts batching, ie pausing notifies and batching up changes
     * to be notified when batchEnd() is called
     */

  }, {
    key: 'batchStart',
    value: function batchStart() {
      this.__batchDepth++;
    }

    /**
     * Ends a batch cycle and will notify obsevers of all changes if
     * the batch depth is back to 0 (outer most batch completed)
     */

  }, {
    key: 'batchEnd',
    value: function batchEnd() {
      this.__batchDepth--;

      if (this.__batchDepth <= 0) {
        // set to true to catch if dispatch called from observer
        this.__isDispatching = true;
        try {
          this.__notify();
        } catch (e) {
          this.__isDispatching = false;
          throw e;
        }
        this.__isDispatching = false;
      }
    }
  }]);

  return Reactor;
}();

exports.default = (0, _utils.toFactory)(Reactor);