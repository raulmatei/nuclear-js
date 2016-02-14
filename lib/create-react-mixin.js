'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (reactor) {
  return {
    getInitialState: function getInitialState() {
      return getState(reactor, this.getDataBindings());
    },
    componentDidMount: function componentDidMount() {
      var _this = this;

      this.__unwatchFns = [];
      (0, _utils.each)(this.getDataBindings(), function (getter, key) {
        var unwatchFn = reactor.observe(getter, function (val) {
          _this.setState(_defineProperty({}, key, val));
        });

        _this.__unwatchFns.push(unwatchFn);
      });
    },
    componentWillUnmount: function componentWillUnmount() {
      while (this.__unwatchFns.length) {
        this.__unwatchFns.shift()();
      }
    }
  };
};

var _utils = require('./utils');

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * Returns a mapping of the getDataBinding keys to
 * the reactor values
 */
function getState(reactor, data) {
  var state = {};
  (0, _utils.each)(data, function (value, key) {
    state[key] = reactor.evaluate(value);
  });
  return state;
}

/**
 * @param {Reactor} reactor
 */