'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isKeyPath = isKeyPath;
exports.isEqual = isEqual;

var _immutable = require('immutable');

var _immutable2 = _interopRequireDefault(_immutable);

var _utils = require('./utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Checks if something is simply a keyPath and not a getter
 * @param {*} toTest
 * @return {boolean}
 */
function isKeyPath(toTest) {
  return (0, _utils.isArray)(toTest) && !(0, _utils.isFunction)(toTest[toTest.length - 1]);
}

/**
 * Checks if two keypaths are equal by value
 * @param {KeyPath} a
 * @param {KeyPath} a
 * @return {Boolean}
 */
function isEqual(a, b) {
  var iA = _immutable2.default.List(a);
  var iB = _immutable2.default.List(b);

  return _immutable2.default.is(iA, iB);
}