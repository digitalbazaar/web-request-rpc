# web-request-rpc
JSON-RPC for Web Request Polyfills

The RPC protocol used in this library relies on the use of `postMessage`
and JSON-RPC. While it could potentially be made more general, it is
currently targeted at building components that help implement "Web Request"
polyfills.

A "Web request" is a catch all for a request made from a Web application
(the relying party) that is fulfilled by another Web application (the
service provider) that is typically from another origin. There are a number
of different "Web requests" such as requests for payment, credentials,
social information, or media. Each of these may have a Web API that is
narrowly targeted (or includes specific features related to) at the
specific type of request, however, each of them follow the same general
model. This means some building blocks for creating polyfills for these
sorts of "Web requests" can be shared.

Some of these building blocks are provided by this library.

## Client

A Client is used to connect to an RPC Server.

TODO

## Server

TODO:

## WebAppContext

A WebAppContext loads or attaches to a window with a remote Web Application
that typically runs on a cross domain website. It is used to manage and
provide access this RPC WebApp. It also enables the WebApp to make some
control calls, such as to show or hide its UI.

Use cases include:

1. Loading and communicating with a "Web Request Mediator" that polyfills
  some missing feature in a user's Web browser that could not be polyfilled
  without the use of a cross-domain third party website. These features
  are typically modeled as some kind of request made by one website that
  will be fulfilled by a different website. The mediator plays the role
  that the browser would natively provide if it implemented the feature,
  namely to facilitate communication and interaction between these two sites
  to process and fulfill the request.
2. Loading and communicating with a third party service provider Web
  application. A "Web Request Mediator" (see the first use case) would use
  a WebAppContext to load these Web applications to enable them to fulfill
  requests made by a relying party.

TODO: Add note about usefulness of passing a Promise for a window handle
when creating/connecting with client/server/WebAppContext/etc. This approach
enables a `message` listener to be attached prior to the creation of the
window where access to the window handle is not available until the window
has loaded. This is important to prevent missing messages.

## WebApp

A Web Application that uses RPC to communicate with a WebAppContext that
is loaded by another, typically cross domain, website. This Web Application
could be a "Web Request Mediator" that will itself load WebApps, or an
application designed to fulfill Web requests.
