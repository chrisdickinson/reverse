# reverse

A [DSL][domain-specific-language] for building [routers][what-is-a-router].
Supports forward and reverse matching.

```javascript
const routes = require('reverse')

const slug = routes.param('slug', /^[\w-]+$/)
const myRouter = routes`
  GET   /blog/${slug}   showPost
  POST  /blog/${slug}   updatePost
  PUT   /blog/${slug}   replacePost
  GET   /               listPosts
`({
  showPost () {
  }
  listPosts () {
  }
  updatePost () {
  }
  replacePost () {
  }
})

myRouter.match('GET', '/blog/hello-world')
// Match { name: 'showPost', controller: ..., }

myRouter.reverse('showPost', {
  'slug': 'hello'
}) // "/blog/hello"
```

## Documentation

* [Why reverse?][docs-why-reverse]
* [Getting started][docs-getting-started]
* [Topics][docs-topics]
  * [Defining Targets][docs-defining-targets]
    * [Validating Parameters][docs-validating-params]
    * [Binding Controllers][docs-binding-controllers]
    * [Nesting Routers][docs-nesting-routers]
  * [Using `Match` Objects][docs-using-match-objects]
  * [Using `reverse`][docs-using-reverse]
* [API reference][docs-api-reference]

## API

This is an abridged version of the [full API reference][docs-api-reference] for
quick lookup!

#### `reverse ̀<Language> ̀ → Function(Controller) → Router`

Use `reverse` as a template literal tag against a string containing `Language`
to create a function. That function can bind routes to a controller to create a
`Router` instance. The function may be used with multiple controllers to create
multiple `Router` instances.

Example:

```javascript
const reverse = require('reverse')
const slug = reverse.param('slug', /^[\w\-]+$/)

const createCRUDRouter = reverse`
  GET     /${slug}  show
  DELETE  /${slug}  delete
`

const blogRouter = createCRUDRouter({
  show: showBlog,
  delete: deleteBlog
})

const commentRouter = createCRUDRouter({
  show: showComment,
  delete: deleteComment
})

const rootURLs = reverse`
  * /blog                   blog
  * /blog/${slug}/comments  comments
`({
  blog: blogRouter,
  comments: commentRouter
})
```

Each line containing `$method $route $name` is known as a **target**. Note that
the `createCRUDRouter` function is invoked twice on different object literals.
These object literals are **controllers**, and the invocation creates
**routers**. Routers may include other routers, as we've done here with
`rootURLs` (e.g., one **target** is `blog`, which in the **controller object**
points to `blogRouter`.)

This creates two `routes` functions that produce three `Router` instances.
The net result is that both "blogs" and "comments" are linked to a root
router. Targets not matched by an "included" router will fall through to
the parent router. 

##### `Language`

The language is a template literal string, each line of which is comprised
of the following parts:

`$METHOD $ROUTE $NAME`

Each line with these elements defines a **target**. All whitespace between any
of these parts is ignored.

* `$METHOD` defines the HTTP methods that the **target** accepts. Valid values are
`GET`, `POST`, `PUT`, `DELETE`, and `*` (for "match all".) Only strings may be interpolated
here. All other interpolations are disallowed.
* `$ROUTE` defines the route that must be matched. Interpolated objects must be
valid **parameters**. It's common to begin the route with a leading `/`.
* `$NAME` is a string that will be used to match a property in bound **controllers**. Only
string interpolation is allowed here, all others are disallowed.

##### `Controller` object

A controller, as aforementioned, is any object passed to the function returned
from `reverse ̀<Language> ̀`. There should be a key for every **target** `$NAME`
defined in the string passed as `Language`.

```javascript
const createCRUDRouter = reverse`
  GET     /${slug}  show
  DELETE  /${slug}  delete
`

// OK:
createCRUDRouter({
  show: function () { },
  delete() { }
})

// also OK:
class NetBeans {
  show () {
  }
  delete () {
  }
}
createCRUDRouter(new NetBeans())
```

-------------

##### `Router#match(method:String, route:String) → Match | null`

Given an HTTP method and a string representing the [`pathname` of the url][url-parse],
return a `Match` object (or `null`, if no target matches.)

###### `Match` object

A `Match` object contains the following properties:

* `controller` — the controller object.
* `name` — the name of the target.
* `context` — a `Map` containing processed **parameters**.
* `next` — If the matched target was included in another router, this will
  point to the parent target. Otherwise, it will point to `null`.

To get the full list of matches:

```
// using rootURLs from above:
const match = rootURLs.match('GET', '/blog/hello-world/comments/hi')
for (var submatch of match) {
  console.log(submatch.context) // Map { slug => hi }, Map { slug => hello-world }
}
```

##### `Router#reverse(name:String[, args:Object]) → String | null`

Given a dot-delimited string of names and an optional "args" object containing
values to insert for parameters, return a string representing any targets that
match.

This is useful so that objects can refer to routes without knowing specifics
of the full url. An example:

```javascript
class Comment {
  constructor (blogPost, slug, content) {
    this.blogPost = blogPost
    this.slug = slug
    this.content = content
  }
  get url() {
    // fill in the parameters using the knowledge
    // this comment object has:
    return rootURLs.reverse('comments.show', {
      'comments.slug': this.slug
      '.slug': this.blogPost.slug
    })
  }
}
```

The `name` passed references `$NAME` portions of targets from the current
router on down — so `comments.name` is interpreted as "pull the `comments`
target from *this* router, and the `name` target from that target".

If parameter names are repeated in the desired route, they can be made more
specific by adding `$name.$paramName` — that is, the full route of `$NAME`s to
the desired target, followed by the desired parameter name to fill in.
Otherwise, if parameter names are not repeated, the parameter name itself can
be used without further specification.

-------------

#### `reverse.param(name: String, validator: Validator) → Parameter`

* `Validator : Function(String) → Any`
* `Validator : RegExp`
* `Validator : Joi`

`Parameter` objects do additional checking on potential matches. All values
matching `/[\/]+/` are forwarded to a parameter included in a route. The
parameter's validator is executed on the route. 

If the `validator` is a function the value it returns is included in the
context as the parameter's name. Exceptions are treated as a "did not match"
condition.

If the `validator` is a [joi][joi] instance, any errors will be treated as "did
not match". It's advisable to always specify `.required()` on these objects.
The value returned will be the cooked value returned by joi.

If the `validator` is a `RegExp`, the value will always be a string. These
regexen should always begin with `^` and end with `$` to ensure a full match.

-------------

## License

