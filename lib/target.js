'use strict'

const quotemeta = require('quotemeta')

module.exports = class Target {
  constructor (method, route, target) {
    this.method = method
    this.route = coalesceStrings(route)
    this.params = this.route.filter(xs => typeof xs !== 'string')
    this.regex = routeToRegExp(this.route)
    this.name = target
  }

  accepts (method) {
    if (this.method === '*') {
      return true
    }
    return this.method === method
  }

  chomp (route) {
    return route.replace(this.regex, '')
  }

  match (route) {
    const result = this.regex.exec(route)
    if (!result) {
      return
    }
    result.shift()
    if (result.length !== this.params.length) {
      return
    }
    for (var i = 0; i < this.params.length; ++i) {
      const coerced = this.params[i].validate(result[i])
      if (coerced.error) {
        return
      }
      result[i] = coerced.value
    }

    const context = new Map()
    // if we've made it all the way through and all parameters are
    // valid, *then* contribute to the context
    for (var j = 0; j < result.length; ++j) {
      context.set(this.params[j].name, result[j])
    }
    return context
  }
}

function coalesceStrings (route) {
  return route.reduce((acc, xs) => {
    if (typeof xs === 'string') {
      if (typeof acc[acc.length - 1] === 'string') {
        acc[acc.length - 1] += xs
        return acc
      }
    }
    acc.push(xs)
    return acc
  }, [])
}

function routeToRegExp (bits) {
  return new RegExp(
    '^' +
    bits.map(
      xs => typeof xs === 'string'
        ? quotemeta(xs)
        : xs.regex || '([^\\/]+)'
    ).join('')
  )
}
