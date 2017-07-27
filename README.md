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

## ServerContext

A ServerContext is a window that loads a page that runs an RPC server
and an RPC client that can make some control calls, such as to show
or hide its UI.

A ServerContext is used to run and provide access to a Web application that
runs on a cross domain website. Use cases include:

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
  a ServerContext to load these Web applications to enable them to fulfill
  requests made by a relying party.
