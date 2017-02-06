'use strict'

const querystring = require('querystring')
const quotemeta = require('quotemeta')

module.exports = class Target {
  constructor (method, route, target) {
    this.method = method
    this.route = coalesceStrings(route)
    this.params = normalizeParams(this.route.filter(xs => typeof xs !== 'string'))
    this.expectCount = this.params.reduce((acc, xs) => {
      return acc + xs.groupCount
    }, 0)
    this.output = this.params.map(xs => null)
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
    if (result.length !== this.expectCount) {
      return
    }
    for (var i = 0, j = 0; i < this.params.length; ++i) {
      const coerced = this.params[i].validate(
        querystring.unescape(result[j])
      )
      if (coerced.error) {
        return
      }
      this.output[i] = coerced.value
      j += this.params[i].groupCount
    }

    const context = new Map()
    // if we've made it all the way through and all parameters are
    // valid, *then* contribute to the context
    for (var k = 0; k < this.params.length; ++k) {
      context.set(this.params[k].name, this.output[k])
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
        : xs.regex
    ).join('')
  )
}

function normalizeParams (params) {
  return params.map(xs => {
    xs.regex = xs.regex || '([^\\/]+)'
    xs.groupCount = countGroups(xs.regex)
    return xs
  })
}

function countGroups (src) {
  var count = 0
  for (var i = 0; i < src.length; ++i) {
    switch (src[i]) {
      case '\\':
        ++i
        break
      case '(':
        if (src[i + 1] === '?') {
          if (src[i + 2] === ':' ||
              src[i + 2] === '!' ||
              src[i + 2] === '=') {
            break
          }
        }
        ++count
        break
    }
  }
  return count
}
