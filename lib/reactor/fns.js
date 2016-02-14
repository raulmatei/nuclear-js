'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.registerStores = registerStores;
exports.replaceStores = replaceStores;
exports.dispatch = dispatch;
exports.loadState = loadState;
exports.addObserver = addObserver;
exports.getOption = getOption;
exports.removeObserver = removeObserver;
exports.removeObserverByEntry = removeObserverByEntry;
exports.reset = reset;
exports.evaluate = evaluate;
exports.serialize = serialize;
exports.resetDirtyStores = resetDirtyStores;

var _immutable = require('immutable');

var _immutable2 = _interopRequireDefault(_immutable);

var _logging = require('../logging');

var _logging2 = _interopRequireDefault(_logging);

var _cache = require('./cache');

var _immutableHelpers = require('../immutable-helpers');

var _getter = require('../getter');

var _keyPath = require('../key-path');

var _utils = require('../utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Immutable Types
 */
var EvaluateResult = _immutable2.default.Record({ result: null, reactorState: null });

function evaluateResult(result, reactorState) {
  return new EvaluateResult({
    result: result,
    reactorState: reactorState
  });
}

/**
 * @param {ReactorState} reactorState
 * @param {Object<String, Store>} stores
 * @return {ReactorState}
 */
function registerStores(reactorState, stores) {
  return reactorState.withMutations(function (reactorState) {
    (0, _utils.each)(stores, function (store, id) {
      if (reactorState.getIn(['stores', id])) {
        /* eslint-disable no-console */
        console.warn('Store already defined for id = ' + id);
        /* eslint-enable no-console */
      }

      var initialState = store.getInitialState();

      if (initialState === undefined && getOption(reactorState, 'throwOnUndefinedStoreReturnValue')) {
        throw new Error('Store getInitialState() must return a value, did you forget a return statement');
      }
      if (getOption(reactorState, 'throwOnNonImmutableStore') && !(0, _immutableHelpers.isImmutableValue)(initialState)) {
        throw new Error('Store getInitialState() must return an immutable value, did you forget to call toImmutable');
      }

      reactorState.update('stores', function (stores) {
        return stores.set(id, store);
      }).update('state', function (state) {
        return state.set(id, initialState);
      }).update('dirtyStores', function (state) {
        return state.add(id);
      }).update('storeStates', function (storeStates) {
        return incrementStoreStates(storeStates, [id]);
      });
    });
    incrementId(reactorState);
  });
}

/**
 * Overrides the store implementation without resetting the value of that particular part of the app state
 * this is useful when doing hot reloading of stores.
 * @param {ReactorState} reactorState
 * @param {Object<String, Store>} stores
 * @return {ReactorState}
 */
function replaceStores(reactorState, stores) {
  return reactorState.withMutations(function (reactorState) {
    (0, _utils.each)(stores, function (store, id) {
      reactorState.update('stores', function (stores) {
        return stores.set(id, store);
      });
    });
  });
}

/**
 * @param {ReactorState} reactorState
 * @param {String} actionType
 * @param {*} payload
 * @return {ReactorState}
 */
function dispatch(reactorState, actionType, payload) {
  if (actionType === undefined && getOption(reactorState, 'throwOnUndefinedActionType')) {
    throw new Error('`dispatch` cannot be called with an `undefined` action type.');
  }

  var currState = reactorState.get('state');
  var dirtyStores = reactorState.get('dirtyStores');

  var nextState = currState.withMutations(function (state) {
    _logging2.default.dispatchStart(reactorState, actionType, payload);

    // let each store handle the message
    reactorState.get('stores').forEach(function (store, id) {
      var currState = state.get(id);
      var newState = undefined;

      try {
        newState = store.handle(currState, actionType, payload);
      } catch (e) {
        // ensure console.group is properly closed
        _logging2.default.dispatchError(reactorState, e.message);
        throw e;
      }

      if (newState === undefined && getOption(reactorState, 'throwOnUndefinedStoreReturnValue')) {
        var errorMsg = 'Store handler must return a value, did you forget a return statement';
        _logging2.default.dispatchError(reactorState, errorMsg);
        throw new Error(errorMsg);
      }

      state.set(id, newState);

      if (currState !== newState) {
        // if the store state changed add store to list of dirty stores
        dirtyStores = dirtyStores.add(id);
      }
    });

    _logging2.default.dispatchEnd(reactorState, state, dirtyStores);
  });

  var nextReactorState = reactorState.set('state', nextState).set('dirtyStores', dirtyStores).update('storeStates', function (storeStates) {
    return incrementStoreStates(storeStates, dirtyStores);
  });

  return incrementId(nextReactorState);
}

/**
 * @param {ReactorState} reactorState
 * @param {Immutable.Map} state
 * @return {ReactorState}
 */
function loadState(reactorState, state) {
  var dirtyStores = [];
  var stateToLoad = (0, _immutableHelpers.toImmutable)({}).withMutations(function (stateToLoad) {
    (0, _utils.each)(state, function (serializedStoreState, storeId) {
      var store = reactorState.getIn(['stores', storeId]);
      if (store) {
        var storeState = store.deserialize(serializedStoreState);
        if (storeState !== undefined) {
          stateToLoad.set(storeId, storeState);
          dirtyStores.push(storeId);
        }
      }
    });
  });

  var dirtyStoresSet = _immutable2.default.Set(dirtyStores);
  return reactorState.update('state', function (state) {
    return state.merge(stateToLoad);
  }).update('dirtyStores', function (stores) {
    return stores.union(dirtyStoresSet);
  }).update('storeStates', function (storeStates) {
    return incrementStoreStates(storeStates, dirtyStores);
  });
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
 * @param {ObserverState} observerState
 * @param {KeyPath|Getter} getter
 * @param {function} handler
 * @return {ObserveResult}
 */
function addObserver(observerState, getter, handler) {
  // use the passed in getter as the key so we can rely on a byreference call for unobserve
  var getterKey = getter;
  if ((0, _keyPath.isKeyPath)(getter)) {
    getter = (0, _getter.fromKeyPath)(getter);
  }

  var currId = observerState.get('nextId');
  var storeDeps = (0, _getter.getStoreDeps)(getter);
  var entry = _immutable2.default.Map({
    id: currId,
    storeDeps: storeDeps,
    getterKey: getterKey,
    getter: getter,
    handler: handler
  });

  var updatedObserverState = undefined;
  if (storeDeps.size === 0) {
    // no storeDeps means the observer is dependent on any of the state changing
    updatedObserverState = observerState.update('any', function (observerIds) {
      return observerIds.add(currId);
    });
  } else {
    updatedObserverState = observerState.withMutations(function (map) {
      storeDeps.forEach(function (storeId) {
        var path = ['stores', storeId];
        if (!map.hasIn(path)) {
          map.setIn(path, _immutable2.default.Set());
        }
        map.updateIn(['stores', storeId], function (observerIds) {
          return observerIds.add(currId);
        });
      });
    });
  }

  updatedObserverState = updatedObserverState.set('nextId', currId + 1).setIn(['observersMap', currId], entry);

  return {
    observerState: updatedObserverState,
    entry: entry
  };
}

/**
 * @param {ReactorState} reactorState
 * @param {String} option
 * @return {Boolean}
 */
function getOption(reactorState, option) {
  var value = reactorState.getIn(['options', option]);
  if (value === undefined) {
    throw new Error('Invalid option: ' + option);
  }
  return value;
}

/**
 * Use cases
 * removeObserver(observerState, [])
 * removeObserver(observerState, [], handler)
 * removeObserver(observerState, ['keyPath'])
 * removeObserver(observerState, ['keyPath'], handler)
 * removeObserver(observerState, getter)
 * removeObserver(observerState, getter, handler)
 * @param {ObserverState} observerState
 * @param {KeyPath|Getter} getter
 * @param {Function} handler
 * @return {ObserverState}
 */
function removeObserver(observerState, getter, handler) {
  var entriesToRemove = observerState.get('observersMap').filter(function (entry) {
    // use the getterKey in the case of a keyPath is transformed to a getter in addObserver
    var entryGetter = entry.get('getterKey');
    var handlersMatch = !handler || entry.get('handler') === handler;
    if (!handlersMatch) {
      return false;
    }
    // check for a by-value equality of keypaths
    if ((0, _keyPath.isKeyPath)(getter) && (0, _keyPath.isKeyPath)(entryGetter)) {
      return (0, _keyPath.isEqual)(getter, entryGetter);
    }
    // we are comparing two getters do it by reference
    return getter === entryGetter;
  });

  return observerState.withMutations(function (map) {
    entriesToRemove.forEach(function (entry) {
      return removeObserverByEntry(map, entry);
    });
  });
}

/**
 * Removes an observer entry by id from the observerState
 * @param {ObserverState} observerState
 * @param {Immutable.Map} entry
 * @return {ObserverState}
 */
function removeObserverByEntry(observerState, entry) {
  return observerState.withMutations(function (map) {
    var id = entry.get('id');
    var storeDeps = entry.get('storeDeps');

    if (storeDeps.size === 0) {
      map.update('any', function (anyObsevers) {
        return anyObsevers.remove(id);
      });
    } else {
      storeDeps.forEach(function (storeId) {
        map.updateIn(['stores', storeId], function (observers) {
          if (observers) {
            // check for observers being present because reactor.reset() can be called before an unwatch fn
            return observers.remove(id);
          }
          return observers;
        });
      });
    }

    map.removeIn(['observersMap', id]);
  });
}

/**
 * @param {ReactorState} reactorState
 * @return {ReactorState}
 */
function reset(reactorState) {
  var prevState = reactorState.get('state');

  return reactorState.withMutations(function (reactorState) {
    var storeMap = reactorState.get('stores');
    var storeIds = storeMap.keySeq().toJS();
    storeMap.forEach(function (store, id) {
      var storeState = prevState.get(id);
      var resetStoreState = store.handleReset(storeState);
      if (resetStoreState === undefined && getOption(reactorState, 'throwOnUndefinedStoreReturnValue')) {
        throw new Error('Store handleReset() must return a value, did you forget a return statement');
      }
      if (getOption(reactorState, 'throwOnNonImmutableStore') && !(0, _immutableHelpers.isImmutableValue)(resetStoreState)) {
        throw new Error('Store reset state must be an immutable value, did you forget to call toImmutable');
      }
      reactorState.setIn(['state', id], resetStoreState);
    });

    reactorState.update('storeStates', function (storeStates) {
      return incrementStoreStates(storeStates, storeIds);
    });
    resetDirtyStores(reactorState);
  });
}

/**
 * @param {ReactorState} reactorState
 * @param {KeyPath|Gettter} keyPathOrGetter
 * @return {EvaluateResult}
 */
function evaluate(reactorState, keyPathOrGetter) {
  var state = reactorState.get('state');

  if ((0, _keyPath.isKeyPath)(keyPathOrGetter)) {
    // if its a keyPath simply return
    return evaluateResult(state.getIn(keyPathOrGetter), reactorState);
  } else if (!(0, _getter.isGetter)(keyPathOrGetter)) {
    throw new Error('evaluate must be passed a keyPath or Getter');
  }

  // Must be a Getter

  var cache = reactorState.get('cache');
  var cacheEntry = cache.lookup(keyPathOrGetter);
  var isCacheMiss = !cacheEntry || isDirtyCacheEntry(reactorState, cacheEntry);
  if (isCacheMiss) {
    cacheEntry = createCacheEntry(reactorState, keyPathOrGetter);
  }

  return evaluateResult(cacheEntry.get('value'), reactorState.update('cache', function (cache) {
    return isCacheMiss ? cache.miss(keyPathOrGetter, cacheEntry) : cache.hit(keyPathOrGetter);
  }));
}

/**
 * Returns serialized state for all stores
 * @param {ReactorState} reactorState
 * @return {Object}
 */
function serialize(reactorState) {
  var serialized = {};
  reactorState.get('stores').forEach(function (store, id) {
    var storeState = reactorState.getIn(['state', id]);
    var serializedState = store.serialize(storeState);
    if (serializedState !== undefined) {
      serialized[id] = serializedState;
    }
  });
  return serialized;
}

/**
 * Returns serialized state for all stores
 * @param {ReactorState} reactorState
 * @return {ReactorState}
 */
function resetDirtyStores(reactorState) {
  return reactorState.set('dirtyStores', _immutable2.default.Set());
}

/**
 * @param {ReactorState} reactorState
 * @param {CacheEntry} cacheEntry
 * @return {boolean}
 */
function isDirtyCacheEntry(reactorState, cacheEntry) {
  var storeStates = cacheEntry.get('storeStates');

  // if there are no store states for this entry then it was never cached before
  return !storeStates.size || storeStates.some(function (stateId, storeId) {
    return reactorState.getIn(['storeStates', storeId]) !== stateId;
  });
}

/**
 * Evaluates getter for given reactorState and returns CacheEntry
 * @param {ReactorState} reactorState
 * @param {Getter} getter
 * @return {CacheEntry}
 */
function createCacheEntry(reactorState, getter) {
  // evaluate dependencies
  var args = (0, _getter.getDeps)(getter).map(function (dep) {
    return evaluate(reactorState, dep).result;
  });
  var value = (0, _getter.getComputeFn)(getter).apply(null, args);

  var storeDeps = (0, _getter.getStoreDeps)(getter);
  var storeStates = (0, _immutableHelpers.toImmutable)({}).withMutations(function (map) {
    storeDeps.forEach(function (storeId) {
      var stateId = reactorState.getIn(['storeStates', storeId]);
      map.set(storeId, stateId);
    });
  });

  return (0, _cache.CacheEntry)({
    value: value,
    storeStates: storeStates,
    dispatchId: reactorState.get('dispatchId')
  });
}

/**
 * @param {ReactorState} reactorState
 * @return {ReactorState}
 */
function incrementId(reactorState) {
  return reactorState.update('dispatchId', function (id) {
    return id + 1;
  });
}

/**
 * @param {Immutable.Map} storeStates
 * @param {Array} storeIds
 * @return {Immutable.Map}
 */
function incrementStoreStates(storeStates, storeIds) {
  return storeStates.withMutations(function (map) {
    storeIds.forEach(function (id) {
      var nextId = map.has(id) ? map.get(id) + 1 : 1;
      map.set(id, nextId);
    });
  });
}