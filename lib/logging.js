'use strict';

var _fns = require('./reactor/fns');

/* eslint-disable no-console */
/**
 * Wraps a Reactor.react invocation in a console.group
 * @param {ReactorState} reactorState
 * @param {String} type
 * @param {*} payload
*/
exports.dispatchStart = function (reactorState, type, payload) {
  if (!(0, _fns.getOption)(reactorState, 'logDispatches')) {
    return;
  }

  if (console.group) {
    console.groupCollapsed('Dispatch: %s', type);
    console.group('payload');
    console.debug(payload);
    console.groupEnd();
  }
};

exports.dispatchError = function (reactorState, error) {
  if (!(0, _fns.getOption)(reactorState, 'logDispatches')) {
    return;
  }

  if (console.group) {
    console.debug('Dispatch error: ' + error);
    console.groupEnd();
  }
};

exports.dispatchEnd = function (reactorState, state, dirtyStores) {
  if (!(0, _fns.getOption)(reactorState, 'logDispatches')) {
    return;
  }

  if (console.group) {
    if ((0, _fns.getOption)(reactorState, 'logDirtyStores')) {
      console.log('Stores updated:', dirtyStores.toList().toJS());
    }

    if ((0, _fns.getOption)(reactorState, 'logAppState')) {
      console.debug('Dispatch done, new state: ', state.toJS());
    }
    console.groupEnd();
  }
};
/* eslint-enable no-console */