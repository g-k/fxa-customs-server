/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

var test = require('tap').test
var restify = require('restify')
var TestServer = require('../test_server')
var Promise = require('bluebird')
var mcHelper = require('../memcache-helper')

var TEST_EMAIL = 'test@example.com'
var TEST_IP = '192.0.2.1'

var config = {
  listen: {
    port: 7000
  }
}

var testServer = new TestServer(config)

var client = restify.createJsonClient({
  url: 'http://127.0.0.1:' + config.listen.port
})

Promise.promisifyAll(client, { multiArgs: true })

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

test(
      'too many failed logins using different capitalizations',
  function (t) {
    return client.postAsync('/failedLoginAttempt', { email: TEST_EMAIL, ip: TEST_IP })
      .spread(function (req, res, obj) {
        t.equal(res.statusCode, 200, 'first login attempt noted')
        t.ok(obj, 'got an obj, make jshint happy')

        return client.postAsync('/failedLoginAttempt', { email: 'TEST@example.com', ip: TEST_IP })
      })
      .spread(function (req, res, obj) {
        t.equal(res.statusCode, 200, 'second login attempt noted')
        t.ok(obj, 'got an obj, make jshint happy')

        return client.postAsync('/failedLoginAttempt', { email: 'test@Example.Com', ip: TEST_IP })
      })
      .spread(function (req, res, obj) {
        t.equal(res.statusCode, 200, 'third login attempt noted')
        t.ok(obj, 'got an obj, make jshint happy')

        return client.postAsync('/check', { email: TEST_EMAIL, ip: TEST_IP, action: 'accountLogin' })
      })
      .spread(function (req, res, obj) {
        t.equal(res.statusCode, 200, 'login check succeeds')
        t.equal(obj.block, true, 'login with exact email address is blocked')

        return client.postAsync('/check', { email: 'tEST@eXaMpLe.CoM', ip: TEST_IP, action: 'accountLogin' })
      })
      .spread(function (req, res, obj) {
        t.equal(res.statusCode, 200, 'login check succeeds')
        t.equal(obj.block, true, 'login with weird caps is blocked')
        t.end()
      })
      .catch(function(err){
        t.fail(err)
        t.end()
      })
  }
)

test(
  'failed logins are cleared',
  function (t) {
    return client.postAsync('/passwordReset', { email: 'tEst@example.com' })
      .spread(function (req, res, obj) {
        t.equal(res.statusCode, 200, 'request returns a 200')
        t.ok(obj, 'got an obj, make jshint happy')

        return client.postAsync('/check', { email: TEST_EMAIL, ip: TEST_IP, action: 'accountLogin' })
      })
      .spread(function (req, res, obj) {
        t.equal(res.statusCode, 200, 'login check succeeds')
        t.equal(obj.block, false, 'login is no longer blocked')
        t.end()
      })
      .catch(function(err){
        t.fail(err)
        t.end()
      })
  }
)

test(
  'blocking an email using weird caps',
  function (t) {
    return client.postAsync('/blockEmail', { email: 'test@EXAMPLE.COM' })
      .spread(function (req, res, obj) {
        t.equal(res.statusCode, 200, 'block request returns a 200')
        t.ok(obj, 'got an obj, make jshint happy')

        return client.postAsync('/check', { email: TEST_EMAIL, ip: TEST_IP, action: 'accountCreate' })
      })
      .spread(function (req, res, obj) {
        t.equal(res.statusCode, 200, 'check worked')
        t.equal(obj.block, true, 'request was blocked')
        t.end()
      })
      .catch(function(err){
        t.fail(err)
        t.end()
      })
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
