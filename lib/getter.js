'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isGetter = isGetter;
exports.getComputeFn = getComputeFn;
exports.getDeps = getDeps;
exports.getFlattenedDeps = getFlattenedDeps;
exports.fromKeyPath = fromKeyPath;
exports.getStoreDeps = getStoreDeps;

var _immutable = require('immutable');

var _immutable2 = _interopRequireDefault(_immutable);

var _utils = require('./utils');

var _keyPath = require('./key-path');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Getter helper functions
 * A getter is an array with the form:
 * [<KeyPath>, ...<KeyPath>, <function>]
 */
var identity = function identity(x) {
  return x;
};

/**
 * Checks if something is a getter literal, ex: ['dep1', 'dep2', function(dep1, dep2) {...}]
 * @param {*} toTest
 * @return {boolean}
 */
function isGetter(toTest) {
  return (0, _utils.isArray)(toTest) && (0, _utils.isFunction)(toTest[toTest.length - 1]);
}

/**
 * Returns the compute function from a getter
 * @param {Getter} getter
 * @return {function}
 */
function getComputeFn(getter) {
  return getter[getter.length - 1];
}

/**
 * Returns an array of deps from a getter
 * @param {Getter} getter
 * @return {function}
 */
function getDeps(getter) {
  return getter.slice(0, getter.length - 1);
}

/**
 * Returns an array of deps from a getter and all its deps
 * @param {Getter} getter
 * @param {Immutable.Set} existing
 * @return {Immutable.Set}
 */
function getFlattenedDeps(getter, existing) {
  if (!existing) {
    existing = _immutable2.default.Set();
  }

  var toAdd = _immutable2.default.Set().withMutations(function (set) {
    if (!isGetter(getter)) {
      throw new Error('getFlattenedDeps must be passed a Getter');
    }

    getDeps(getter).forEach(function (dep) {
      if ((0, _keyPath.isKeyPath)(dep)) {
        set.add((0, _immutable.List)(dep));
      } else if (isGetter(dep)) {
        set.union(getFlattenedDeps(dep));
      } else {
        throw new Error('Invalid getter, each dependency must be a KeyPath or Getter');
      }
    });
  });

  return existing.union(toAdd);
}

/**
 * @param {KeyPath}
 * @return {Getter}
 */
function fromKeyPath(keyPath) {
  if (!(0, _keyPath.isKeyPath)(keyPath)) {
    throw new Error('Cannot create Getter from KeyPath: ' + keyPath);
  }

  return [keyPath, identity];
}

/**
 * Adds non enumerated __storeDeps property
 * @param {Getter}
 */
function getStoreDeps(getter) {
  if (getter.hasOwnProperty('__storeDeps')) {
    return getter.__storeDeps;
  }

  var storeDeps = getFlattenedDeps(getter).map(function (keyPath) {
    return keyPath.first();
  }).filter(function (x) {
    return !!x;
  });

  Object.defineProperty(getter, '__storeDeps', {
    enumerable: false,
    configurable: false,
    writable: false,
    value: storeDeps
  });

  return storeDeps;
}

exports.default = {
  isGetter: isGetter,
  getComputeFn: getComputeFn,
  getFlattenedDeps: getFlattenedDeps,
  getStoreDeps: getStoreDeps,
  getDeps: getDeps,
  fromKeyPath: fromKeyPath
};