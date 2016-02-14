"use strict";

try {
  if (!(window.console && console.log)) {
    console = {
      log: function log() {},
      debug: function debug() {},
      info: function info() {},
      warn: function warn() {},
      error: function error() {}
    };
  }
} catch (e) {}