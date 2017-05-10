'use strict'

const IS_ROUTER_SYM = require('./symbols.js').isRouter
const Target = require('./target.js')

module.exports = class Router {
  constructor (controller, targets) {
    this.targets = targets
    this.controller = controller
  }

  match (method, route) {
    return match(this, method, route, null)
  }

  all () {
    return listEndpoints(this, [], [], [])
  }

  concat (rhs) {
    return new Router({
      lhs: this,
      rhs
    }, [
      new Target('*', [''], 'lhs'),
      new Target('*', [''], 'rhs')
    ])
  }

  reverse (name, args, safe) {
    args = args || {}
    return reverseMatch(
      this,
      Array.isArray(name)
        ? name
        : String(name).split('.'),
      args,
      0,
      null,
      safe ? String : encodeURIComponent
    )
  }

  get [IS_ROUTER_SYM] () {
    return true
  }

  [Symbol.iterator] () {
    return this.values()
  }

  * values () {
    for (var i = 0; i < this.targets.length; ++i) {
      yield this.targets[i]
    }
  }
}

function match (router, method, route, lastMatch) {
  for (const target of router) {
    if (!target.accepts(method)) {
      continue
    }
    const context = target.match(route)
    if (!context) {
      continue
    }

    const value = router.controller[target.name]
    if (!value) {
      throw new Error(`expected controller to provide ${target.name}`)
    }

    if (typeof value === 'function') {
      // if we're pointed at a function, we have to consume
      // _all_ of the rest of the route for it to match.
      if (target.chomp(route) !== '') {
        continue
      }
      return new Match(
        router.controller,
        target.name,
        context,
        lastMatch
      )
    }

    if (value && value[IS_ROUTER_SYM]) {
      // if there's nothing left of the path, pretend
      // it's a slash so we can pick up nested / routes
      const remainingPath = target.chomp(route) || '/'
      const result = match(
        value,
        method,
        remainingPath[0] === '/' ? remainingPath : `/${remainingPath}`,
        new Match(
          router.controller,
          target.name,
          context,
          lastMatch
        )
      )
      if (result) {
        return result
      }
      continue
    }
  }
  return null
}

function reverseMatch (router, nameBits, args, idx, targets, toString) {
  for (const target of router) {
    if (target.name !== nameBits[idx]) {
      continue
    }
    const destination = router.controller[target.name]
    if (typeof destination === 'function') {
      if (idx === nameBits.length - 1) {
        return render(
          new ReverseMatch(target, targets).toList(),
          args,
          nameBits,
          toString
        )
      }
      continue
    }
    return reverseMatch(
      router.controller[target.name],
      nameBits,
      args,
      idx + 1,
      new ReverseMatch(target, targets),
      toString
    )
  }
  return null
}

function render (targets, args, nameBits, toString) {
  return targets.reduce((acc, route, idx) => {
    const pfx = nameBits.slice(0, idx).join('.')
    return acc.concat(route.route.map(param => {
      if (typeof param === 'string') {
        return param
      }

      const fullName = `${pfx}.${param.name}`
      if (fullName in args) {
        return toString(args[fullName])
      }

      if (param.name in args) {
        return toString(args[param.name])
      }

      throw new Error(`
        Needed key "${fullName}" or "${param.name}" to
        reverse "${nameBits.join('.')}".
      `.split('\n').map(xs => xs.trim()).join(' ').trim())
    }))
  }, []).join('').replace(/\/\//g, '/')
}

class ReverseMatch {
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

class Match {
  constructor (controller, name, context, next) {
    this.controller = controller
    this.name = name
    this.context = context
    this.next = next
  }
  * values () {
    var current = this
    while (current) {
      yield current
      current = current.next
    }
  }
  [Symbol.iterator] () {
    return this.values()
  }
  get target () {
    return this.controller[this.name]
  }
}

function * listEndpoints (router, route, names, regexen) {
  for (var target of router.values()) {
    const implementation = router.controller[target.name]
    if (implementation && implementation.values) {
      yield * listEndpoints(
        implementation,
        route.slice().concat([target.route]),
        names.slice().concat([target.name]),
        regexen.slice().concat([target.regex])
      )
    } else {
      yield {
        method: target.method,
        route: route.slice().concat([target.route]).map(
          xs => xs.map(ys => ys.name ? `:${ys.name}` : ys).join('')
        ).reduce((acc, xs) => {
          if (acc[acc.length - 1] === '/' && xs[0] === '/') {
            return `${acc}${xs.slice(1)}`
          }
          return `${acc}${xs}`
        }, ''),
        name: names.slice().concat([target.name]).join('.'),
        regexen: regexen.slice().concat([target.regex]),
        implementation
      }
    }
  }
}
