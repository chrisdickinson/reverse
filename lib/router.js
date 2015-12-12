'use strict'

module.exports = class Router {
  constructor (controller, routes) {
    this.routes = routes
    this.controller = controller
  }

  match (method, route, context) {
    context = context || new Map()
    for (var i = 0; i < this.routes.length; ++i) {
      if (!this.routes[i].accepts(method)) {
        continue
      }
      const match = this.routes[i].match(route)
      if (!match) {
        continue
      }

      const target = this.controller[this.routes[i].name]
      if (!target) {
        throw new Error(`expected controller to provide ${this.routes[i].name}`)
      }

      const newContext = new Map(joinMaps(context, match))
      if (typeof target === 'function') {
        // if we're pointed at a function, we have to consume
        // _all_ of the rest of the route for it to match.
        if (this.routes[i].chomp(route) !== '') {
          continue
        }
        return {
          method: target,
          controller: this.controller,
          context: newContext
        }
      }

      if (target.match) {
        const result = target.match(
          method,
          this.routes[i].chomp(route),
          newContext
        )
        if (result) {
          return result
        }
      }
    }
    return null
  }

  reverse (name, args) {
    args = args || {}
    return reverseMatch(
      this,
      Array.isArray(name)
        ? name
        : String(name).split('.'),
      args,
      0,
      null
    )
  }

  [Symbol.iterator] () {
    return this.values()
  }

  * values () {
    for (var i = 0; i < this.routes.length; ++i) {
      yield this.routes[i]
    }
  }
}

function reverseMatch (router, nameBits, args, idx, routes) {
  for (var i = 0; i < router.routes.length; ++i) {
    const route = router.routes[i]
    if (route.name !== nameBits[idx]) {
      continue
    }
    const destination = router.controller[route.name]
    if (typeof destination === 'function') {
      if (idx === nameBits.length - 1) {
        return render(new Link(route, routes).toList(), args, nameBits)
      }
      continue
    }
    return reverseMatch(
      router.controller[route.name],
      nameBits,
      args,
      idx + 1,
      new Link(route, routes)
    )
  }
  return null
}

function render (routes, args, nameBits) {
  return routes.reduce((acc, route, idx) => {
    const pfx = nameBits.slice(0, idx).join('.')
    return acc.concat(route.route.map(param => {
      if (typeof param === 'string') {
        return param
      }

      const fullName = `${pfx}.${param.name}`
      if (fullName in args) {
        return String(args[fullName])
      }

      if (param.name in args) {
        return String(args[param.name])
      }

      throw new Error(`
        Needed key "${fullName}" or "${param.name}" to
        reverse "${nameBits.join('.')}".
      `.split('\n').map(xs => xs.trim()).join(' ').trim())
    }))
  }, []).join('').replace(/\/\//g, '/')
}

class Link {
  constructor (route, prev) {
    this.route = route
    this.prev = prev
    this.length = this.prev ? this.prev.length + 1 : 1
  }
  toList () {
    var out = new Array(this.length)
    var idx = this.length
    var current = this
    while (current) {
      out[idx - 1] = current.route
      current = current.prev
      --idx
    }
    return out
  }
}

function * joinMaps (lhs, rhs) {
  for (var xs of lhs) {
    yield xs
  }
  for (var ys of rhs) {
    yield ys
  }
}
