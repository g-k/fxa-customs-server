/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

var test = require('tap').test
var Promise = require('bluebird')
var restify = Promise.promisifyAll(require('restify'))
var TestServer = require('../test_server')
var mcHelper = require('../memcache-helper')

var TEST_EMAIL = 'test@example.com'
var ACTION = 'dummyAction'
var BLOCK_IP = '1.93.0.224'
var BLOCK_IP_INRANGE = '0.1.0.0'
var VALID_IP = '3.0.0.0'

process.env.IP_BLOCKLIST_ENABLE = true
process.env.IP_BLOCKLIST_LOGONLY = false
process.env.IP_BLOCKLIST_FILES = [
  './../test/mocks/simple.netset'
]

var config = {
  listen: {
    port: 7000
  }
}
var testServer = new TestServer(config)

test(
  'startup',
  function (t) {
    testServer.start(function (err) {
      t.type(testServer.server, 'object', 'test server was started')
      t.notOk(err, 'no errors were returned')
      t.end()
    })
  }
)

test(
  'clear everything',
  function (t) {
    mcHelper.clearEverything(
      function (err) {
        t.notOk(err, 'no errors were returned')
        t.end()
      }
    )
  }
)

var client = restify.createJsonClient({
  url: 'http://127.0.0.1:' + config.listen.port
})

Promise.promisifyAll(client, {multiArgs: true})

test(
  'block ip from ip blocklist',
  function (t) {
    client.postAsync('/check', {ip: BLOCK_IP, email: TEST_EMAIL, action: ACTION},
      function (err, req, res, obj) {
        t.equal(obj.block, true, 'request is blocked')
        t.end()
      }
    )
  }
)

test(
  'block ip in range of blocklist',
  function (t) {
    client.postAsync('/check', {ip: BLOCK_IP_INRANGE, email: TEST_EMAIL, action: ACTION},
      function (err, req, res, obj) {
        t.equal(obj.block, true, 'request is blocked')
        t.end()
      }
    )
  }
)

test(
  'do not block ip not in range blocklist',
  function (t) {
    client.postAsync('/check', {ip: VALID_IP, email: TEST_EMAIL, action: ACTION},
      function (err, req, res, obj) {
        t.equal(obj.block, false, 'request is not blocked')
        t.end()
      }
    )
  }
)

test(
  'teardown',
  function (t) {
    testServer.stop()
    t.equal(testServer.server.killed, true, 'test server has been killed')
    t.end()
  }
)
