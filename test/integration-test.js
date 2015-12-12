'use strict'

const reverse = require('..')
const tape = require('tape')

tape('match requires full route to be consumed', assert => {
  const router = reverse`
    GET /example greet
  `({
    greet () {
    }
  })

  // note the trailing slash!
  assert.equal(router.match('GET', '/example/'), null)
  assert.end()
})

tape('match requires method to match', assert => {
  const router = reverse`
    GET /example greet
  `({
    greet () {
    }
  })

  // note the request method!
  assert.equal(router.match('POST', '/example'), null)
  assert.end()
})

tape('match requires params to be validated', assert => {
  const id = reverse.param('id', /^\d+$/)
  const router = reverse`
    GET /example/${id} greet
  `({
    greet () {
    }
  })

  // note the parameters ("hey", "hey-1", "1") — only "1" should pass!
  assert.equal(router.match('GET', '/example/hey'), null)
  assert.equal(router.match('GET', '/example/hey-1'), null)
  assert.ok(router.match('GET', '/example/1'))
  assert.end()
})

tape('match returns controller, method, and cooked params', assert => {
  const expected = (Math.random() * 10) | 0
  const id = reverse.param('id', function (value) {
    if (isNaN(value)) {
      throw new Error('failed')
    }
    return Number(value)
  })
  const controller = {
    greet () {
    }
  }
  const router = reverse`
    GET /example/${id} greet
  `(controller)

  const result = router.match('GET', `/example/${expected}`)
  assert.ok(result)
  assert.equal(result.method, controller.greet)
  assert.equal(result.controller, controller)
  assert.equal(result.context.get('id'), expected)
  assert.end()
})

tape('match can include routes from other routers', assert => {
  const id = reverse.param('id', /^\d+$/)
  const routes = reverse`
    * /${id} target
  `
  const router = routes({
    target: routes({
      target: routes({
        target () {

        }
      })
    })
  })

  assert.ok(router.match('GET', '/1/2/3'))
  assert.end()
})

tape('match allows routes to "fall through" included routers', assert => {
  const id = reverse.param('id', /^\d+$/)
  const slug = reverse.param('slug', /^[a-z_\-]{1}[\w-]*$/)
  const expected = Math.random()
  const inner = 10 + Math.random()
  const routes = reverse`
    *     /blog           blogRoutes
    GET   /blog/${slug}   blogPost
  `({
    blogRoutes: reverse`
      POST /${id}          target
    `({target () { return inner }}),
    blogPost () {
      return expected
    }
  })

  const match = routes.match('GET', '/blog/hey-there')
  assert.equal(
    match.method(),
    expected,
    'should have matched the appropriate route'
  )
  const match2 = routes.match('GET', '/blog/12')
  assert.equal(match2, null, 'mismatched methods')
  const match3 = routes.match('POST', '/blog/12')
  assert.equal(
    match3.method(),
    inner,
    'should have matched the appropriate inner route'
  )
  assert.end()
})

tape('reverse returns strings', assert => {
  const routes = reverse`
    GET /hello/world  greeting
    GET /good/bye     closing
  `({
    greeting () {},
    closing () {}
  })
  assert.equal(routes.reverse('greeting'), '/hello/world')
  assert.equal(routes.reverse('closing'), '/good/bye')
  assert.end()
})

tape('reverse interpolates values', assert => {
  const name = reverse.param('name', /^\w+$/)
  const id = reverse.param('id', /^\d+$/)
  const routes = reverse`
    GET /hello/${name}                greeting
    GET /good/bye/${name}/${id}       closing
  `({
    greeting () {},
    closing () {}
  })

  assert.throws(() => {
    assert.equal(routes.reverse('greeting'), '/hello/world')
  })
  assert.equal(routes.reverse('greeting', {
    name: 'gary-busey'
  }), '/hello/gary-busey')
  assert.throws(() => {
    routes.reverse('closing', {
      name: 'gary-busey'
    })
  })
  assert.equal(routes.reverse('closing', {
    name: 'gary-busey',
    id: 10
  }), '/good/bye/gary-busey/10')
  assert.end()
})

tape('reverse matches included routes', assert => {
  const name = reverse.param('name', /^\w+$/)
  const id = reverse.param('id', /^\d+$/)
  const inner = reverse`
    GET /${id} getTarget
  `({getTarget () {}})
  const outer = reverse`
    GET /${name} inner
  `({inner})

  assert.equal(outer.reverse('inner.getTarget', {
    'name': 'hello',
    'inner.id': 10
  }), '/hello/10')

  assert.equal(outer.reverse('inner.getTarget', {
    'name': 'hello',
    'id': 10
  }), '/hello/10')
  assert.end()
})
