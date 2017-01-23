/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

require('ass')
var test = require('tap').test
var emailRecord = require('../../lib/email_record')

function simpleEmailRecord() {
  var limits = {
    rateLimitIntervalMs: 1000,
    blockIntervalMs: 800,
    maxEmails: 2,
    maxUnblockAttempts: 2,
    maxVerifyCodes: 2,
  }
  return new (emailRecord(limits))()
}

test(
  'flaky update',
  function (t) {
    var er = simpleEmailRecord()

    t.equal(er.update('recoveryEmailVerifyCode', false, console), 0)
    t.equal(er.update('recoveryEmailVerifyCode', false, console), 0)
    t.equal(er.update('recoveryEmailVerifyCode', false, console), 1)
    t.equal(er.isRateLimited(), true)

    t.end()
  }
)
