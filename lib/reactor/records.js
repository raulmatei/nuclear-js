'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ObserverState = exports.ReactorState = exports.DEBUG_OPTIONS = exports.PROD_OPTIONS = undefined;

var _immutable = require('immutable');

var _cache = require('./cache');

var PROD_OPTIONS = exports.PROD_OPTIONS = (0, _immutable.Map)({
  // logs information for each dispatch
  logDispatches: false,
  // log the entire app state after each dispatch
  logAppState: false,
  // logs what stores changed after a dispatch
  logDirtyStores: false,
  // if true, throws an error when dispatching an `undefined` actionType
  throwOnUndefinedActionType: false,
  // if true, throws an error if a store returns undefined
  throwOnUndefinedStoreReturnValue: false,
  // if true, throws an error if a store.getInitialState() returns a non immutable value
  throwOnNonImmutableStore: false,
  // if true, throws when dispatching in dispatch
  throwOnDispatchInDispatch: false
});

var DEBUG_OPTIONS = exports.DEBUG_OPTIONS = (0, _immutable.Map)({
  // logs information for each dispatch
  logDispatches: true,
  // log the entire app state after each dispatch
  logAppState: true,
  // logs what stores changed after a dispatch
  logDirtyStores: true,
  // if true, throws an error when dispatching an `undefined` actionType
  throwOnUndefinedActionType: true,
  // if true, throws an error if a store returns undefined
  throwOnUndefinedStoreReturnValue: true,
  // if true, throws an error if a store.getInitialState() returns a non immutable value
  throwOnNonImmutableStore: true,
  // if true, throws when dispatching in dispatch
  throwOnDispatchInDispatch: true
});

var ReactorState = exports.ReactorState = (0, _immutable.Record)({
  dispatchId: 0,
  state: (0, _immutable.Map)(),
  stores: (0, _immutable.Map)(),
  cache: (0, _cache.DefaultCache)(),
  // maintains a mapping of storeId => state id (monotomically increasing integer whenever store state changes)
  storeStates: (0, _immutable.Map)(),
  dirtyStores: (0, _immutable.Set)(),
  debug: false,
  // production defaults
  options: PROD_OPTIONS
});

var ObserverState = exports.ObserverState = (0, _immutable.Record)({
  // observers registered to any store change
  any: (0, _immutable.Set)(),
  // observers registered to specific store changes
  stores: (0, _immutable.Map)({}),

  observersMap: (0, _immutable.Map)({}),

  nextId: 1
});