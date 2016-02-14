"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.LRUCache = exports.BasicCache = exports.CacheEntry = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.DefaultCache = DefaultCache;

var _immutable = require("immutable");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var CacheEntry = exports.CacheEntry = (0, _immutable.Record)({
  value: null,
  storeStates: (0, _immutable.Map)(),
  dispatchId: null
});

/*******************************************************************************
 * interface PersistentCache {
 *    has(item)
 *    lookup(item, notFoundValue)
 *    hit(item)
 *    miss(item, entry)
 *    evict(item)
 *    asMap()
 * }
 *
 * Inspired by clojure.core.cache/CacheProtocol
 *******************************************************************************/

/**
 * Plain map-based cache
 */

var BasicCache = exports.BasicCache = function () {

  /**
   * @param {Immutable.Map} cache
   */

  function BasicCache() {
    var cache = arguments.length <= 0 || arguments[0] === undefined ? (0, _immutable.Map)() : arguments[0];

    _classCallCheck(this, BasicCache);

    this.cache = cache;
  }

  /**
   * Retrieve the associated value, if it exists in this cache, otherwise
   * returns notFoundValue (or undefined if not provided)
   * @param {Object} item
   * @param {Object?} notFoundValue
   * @return {CacheEntry?}
   */


  _createClass(BasicCache, [{
    key: "lookup",
    value: function lookup(item, notFoundValue) {
      return this.cache.get(item, notFoundValue);
    }

    /**
     * Checks if this cache contains an associated value
     * @param {Object} item
     * @return {boolean}
     */

  }, {
    key: "has",
    value: function has(item) {
      return this.cache.has(item);
    }

    /**
     * Return cached items as map
     * @return {Immutable.Map}
     */

  }, {
    key: "asMap",
    value: function asMap() {
      return this.cache;
    }

    /**
     * Updates this cache when it is determined to contain the associated value
     * @param {Object} item
     * @return {BasicCache}
     */

  }, {
    key: "hit",
    value: function hit(item) {
      return this;
    }

    /**
     * Updates this cache when it is determined to **not** contain the associated value
     * @param {Object} item
     * @param {CacheEntry} entry
     * @return {BasicCache}
     */

  }, {
    key: "miss",
    value: function miss(item, entry) {
      return new BasicCache(this.cache.update(item, function (existingEntry) {
        if (existingEntry && existingEntry.dispatchId > entry.dispatchId) {
          throw new Error("Refusing to cache older value");
        }
        return entry;
      }));
    }

    /**
     * Removes entry from cache
     * @param {Object} item
     * @return {BasicCache}
     */

  }, {
    key: "evict",
    value: function evict(item) {
      return new BasicCache(this.cache.remove(item));
    }
  }]);

  return BasicCache;
}();

var DEFAULT_LRU_LIMIT = 1000;
var DEFAULT_LRU_EVICT_COUNT = 1;

/**
 * Implements caching strategy that evicts least-recently-used items in cache
 * when an item is being added to a cache that has reached a configured size
 * limit.
 */

var LRUCache = exports.LRUCache = function () {
  function LRUCache() {
    var limit = arguments.length <= 0 || arguments[0] === undefined ? DEFAULT_LRU_LIMIT : arguments[0];
    var evictCount = arguments.length <= 1 || arguments[1] === undefined ? DEFAULT_LRU_EVICT_COUNT : arguments[1];
    var cache = arguments.length <= 2 || arguments[2] === undefined ? new BasicCache() : arguments[2];
    var lru = arguments.length <= 3 || arguments[3] === undefined ? (0, _immutable.OrderedSet)() : arguments[3];

    _classCallCheck(this, LRUCache);

    this.limit = limit;
    this.evictCount = evictCount;
    this.cache = cache;
    this.lru = lru;
  }

  /**
   * Retrieve the associated value, if it exists in this cache, otherwise
   * returns notFoundValue (or undefined if not provided)
   * @param {Object} item
   * @param {Object?} notFoundValue
   * @return {CacheEntry}
   */


  _createClass(LRUCache, [{
    key: "lookup",
    value: function lookup(item, notFoundValue) {
      return this.cache.lookup(item, notFoundValue);
    }

    /**
     * Checks if this cache contains an associated value
     * @param {Object} item
     * @return {boolean}
     */

  }, {
    key: "has",
    value: function has(item) {
      return this.cache.has(item);
    }

    /**
     * Return cached items as map
     * @return {Immutable.Map}
     */

  }, {
    key: "asMap",
    value: function asMap() {
      return this.cache.asMap();
    }

    /**
     * Updates this cache when it is determined to contain the associated value
     * @param {Object} item
     * @return {LRUCache}
     */

  }, {
    key: "hit",
    value: function hit(item) {
      if (!this.cache.has(item)) {
        return this;
      }

      // remove it first to reorder in lru OrderedSet
      return new LRUCache(this.limit, this.evictCount, this.cache, this.lru.remove(item).add(item));
    }

    /**
     * Updates this cache when it is determined to **not** contain the associated value
     * If cache has reached size limit, the LRU item is evicted.
     * @param {Object} item
     * @param {CacheEntry} entry
     * @return {LRUCache}
     */

  }, {
    key: "miss",
    value: function miss(item, entry) {
      if (this.lru.size >= this.limit) {
        if (this.has(item)) {
          return new LRUCache(this.limit, this.evictCount, this.cache.miss(item, entry), this.lru.remove(item).add(item));
        }

        var cache = this.lru.take(this.evictCount).reduce(function (c, evictItem) {
          return c.evict(evictItem);
        }, this.cache).miss(item, entry);

        return new LRUCache(this.limit, this.evictCount, cache, this.lru.skip(this.evictCount).add(item));
      } else {
        return new LRUCache(this.limit, this.evictCount, this.cache.miss(item, entry), this.lru.add(item));
      }
    }

    /**
     * Removes entry from cache
     * @param {Object} item
     * @return {LRUCache}
     */

  }, {
    key: "evict",
    value: function evict(item) {
      if (!this.cache.has(item)) {
        return this;
      }

      return new LRUCache(this.limit, this.evictCount, this.cache.evict(item), this.lru.remove(item));
    }
  }]);

  return LRUCache;
}();

/**
 * Returns default cache strategy
 * @return {BasicCache}
 */


function DefaultCache() {
  return new BasicCache();
}