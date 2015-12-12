'use strict'

const reverse = require('..')
const tape = require('tape')

tape('throws on unexpected eof in method', assert => {
  assert.throws(() => {
    reverse`GE`
  })
  assert.end()
})

tape('throws on unexpected eof in route', assert => {
  assert.throws(() => {
    reverse`GET /asdf`
  })

  assert.end()
})

tape('throws on unexpected eof in target mode', assert => {
  assert.throws(() => {
    reverse`GET /asdf `
  })

  assert.end()
})

tape('throws on unexpected nl in method', assert => {
  assert.throws(() => {
    reverse`G
    ET / asdf`
  }, 'mid-method')
  assert.throws(() => {
    reverse`GET
    / asdf`
  }, 'right after method')
  assert.doesNotThrow(() => {
    reverse`

        GET /asdf womp
    `
  }, 'but not before method')
  assert.end()
})

tape('throws on unexpected nl in route', assert => {
  assert.throws(() => {
    reverse`GET
      /asdf`
  }, 'before-route')
  assert.throws(() => {
    reverse`GET /asdf
      /asdf`
  }, 'mid-route')
  assert.throws(() => {
    reverse`GET asdf${{boop: 12}}
      asdf
    `
  }, 'mid-route with interpolated value')
  assert.end()
})

tape('throws on param in method', assert => {
  assert.throws(() => {
    reverse`${{any: 'thing'}}GET /asdf anything`
  }, 'pre-method')
  assert.throws(() => {
    reverse`G${null}T /asdf anything`
  }, 'mid-method')
  assert.throws(() => {
    reverse`GET${true} /asdf anything`
  }, 'post-method')
  assert.end()
})

tape('throws on leading param in route', assert => {
  assert.throws(() => {
    reverse`GET ${assert}/asdf targ`
  }, 'pre-target')
  assert.end()
})

tape('throws on param in target', assert => {
  assert.throws(() => {
    reverse`GET /asdf ${assert}targ`
  }, 'pre-target')

  assert.throws(() => {
    reverse`GET /asdf bmar${assert}targ`
  }, 'mid-target')

  assert.throws(() => {
    reverse`GET /asdf zorg${assert}`
  }, 'post-target')
  assert.end()
})

const validMethods = [
  'GET',
  'PUT',
  'POST',
  'DELETE',
  '*'
]

tape(`accepts ${validMethods} as methods`, assert => {
  validMethods.forEach(xs => assert.doesNotThrow(
    () => reverse([`${xs} /test hello`]),
    `${xs} should not throw`
  ))
  assert.end()
})

tape('throws on unknown method', assert => {
  assert.throws(() => {
    reverse`GEM /asdf target`
  }, 'throws on GEM requests')
  assert.end()
})

tape('returns function', assert => {
  assert.equal(
    typeof reverse`GET /asdf target`,
    'function'
  )
  assert.end()
})

tape('allows whitespace between method and route', assert => {
  assert.doesNotThrow(() => {
    reverse`GET   /asdf womp`
  }, 'multiple spaces are okay')
  assert.doesNotThrow(() => {
    reverse`GET	/asdf womp`
  }, 'tabs are okay')

  assert.end()
})

tape('allows whitespace between route and target', assert => {
  assert.doesNotThrow(() => {
    reverse`GET /asdf       womp`
  }, 'multiple spaces are okay')
  assert.doesNotThrow(() => {
    reverse`GET /asdf	womp`
  }, 'tabs are okay')

  assert.end()
})

