'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isImmutable = isImmutable;
exports.isImmutableValue = isImmutableValue;
exports.toJS = toJS;
exports.toImmutable = toImmutable;

var _immutable = require('immutable');

var _immutable2 = _interopRequireDefault(_immutable);

var _utils = require('./utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * A collection of helpers for the ImmutableJS library
 */

/**
 * @param {*} obj
 * @return {boolean}
 */
function isImmutable(obj) {
  return _immutable2.default.Iterable.isIterable(obj);
}

/**
 * Returns true if the value is an ImmutableJS data structure
 * or a JavaScript primitive that is immutable (string, number, etc)
 * @param {*} obj
 * @return {boolean}
 */
function isImmutableValue(obj) {
  return isImmutable(obj) || !(0, _utils.isObject)(obj);
}

/**
 * Converts an Immutable Sequence to JS object
 * Can be called on any type
 */
function toJS(arg) {
  // arg instanceof Immutable.Sequence is unreliable
  return isImmutable(arg) ? arg.toJS() : arg;
}

/**
 * Converts a JS object to an Immutable object, if it's
 * already Immutable its a no-op
 */
function toImmutable(arg) {
  return isImmutable(arg) ? arg : _immutable2.default.fromJS(arg);
}