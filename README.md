# node-webhooks [![Build Status](https://travis-ci.org/roccomuso/node-webhooks.svg?branch=master)](https://travis-ci.org/roccomuso/node-webhooks) [![NPM Version](https://img.shields.io/npm/v/node-webhooks.svg)](https://www.npmjs.com/package/node-webhooks) [![Coverage Status](https://coveralls.io/repos/github/roccomuso/node-webhooks/badge.svg?branch=master)](https://coveralls.io/github/roccomuso/node-webhooks?branch=master) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com) [![Dependency Status](https://david-dm.org/roccomuso/node-webhooks.png)](https://david-dm.org/roccomuso/node-webhooks) <span class="badge-patreon"><a href="https://patreon.com/roccomuso" title="Donate to this project using Patreon"><img src="https://img.shields.io/badge/patreon-donate-yellow.svg" alt="Patreon donate button" /></a></span>

## What webhooks are used for

> Webhooks are "user-defined HTTP callbacks". They are usually triggered by an event, such as pushing code to a repository or posting a comment to a blog. When that event occurs, the source site makes an HTTP request to the URI configured for the webhook. Users can configure webhooks to cause events on one site to invoke behavior on another. Common uses include triggering builds with continuous integration systems or notifying bug tracking systems. Since webhooks use HTTP, they can be integrated into web services without adding new infrastructure.

## Install

    npm install node-webhooks --save

or:

    yarn add node-webhooks

Supports Node.js 18 or later.

## How it works

When a webhook is triggered, it sends a POST request to each attached URL. The request body contains the JSON-serialized payload passed to the **trigger** method.

## Debug

This module uses the popular [debug](https://github.com/visionmedia/debug) package. Set the environment variable to enable debug output: <code>DEBUG=node-webhooks</code>.
To launch the example with debug output enabled, run: <code>DEBUG=node-webhooks node example.js</code>

## Usage

```javascript

// Initialize the WebHooks module.
var WebHooks = require('node-webhooks')

// Initialize the webhooks module with an on-disk database.
var webHooks = new WebHooks({
  db: './webHooksDB.json', // JSON file that stores webhook URLs.
  httpSuccessCodes: [200, 201, 202, 203, 204] // Optional success status codes.
})

// Alternatively, initialize the webhooks module with an object.
// Changes will only be made in memory.
webHooks = new WebHooks({
  db: {
    addPost: ['http://localhost:9100/posts']
  }
})

// Add a new webhook called 'shortname1'.
webHooks.add('shortname1', 'http://127.0.0.1:9000/prova/other_url').then(function () {
  // done
}).catch(function (err) {
  console.log(err)
})

// Add another webhook.
webHooks.add('shortname2', 'http://127.0.0.1:9000/prova2/').then(function () {
  // done
}).catch(function (err) {
  console.log(err)
})

// Remove a single URL attached to the given shortname.
// webHooks.remove('shortname3', 'http://127.0.0.1:9000/query/').catch(function (err) { console.error(err) })

// If no URL is provided, remove all URLs attached to the given shortname.
// webHooks.remove('shortname3').catch(function (err) { console.error(err) })

// Trigger a specific webhook.
webHooks.trigger('shortname1', {data: 123})
webHooks.trigger('shortname2', {data: 123456}, {header: 'header'}) // Send a JSON POST body with custom headers.

```

## Available events

The module uses an event emitter to expose request information when a webhook is triggered.

```javascript
var webHooks = new WebHooks({
  db: WEBHOOKS_DB
})

var emitter = webHooks.getEmitter()

emitter.on('*.success', function (shortname, statusCode, body) {
  console.log('Successfully triggered webhook ' + shortname + ' with status code', statusCode, 'and body', body)
})

emitter.on('*.failure', function (shortname, statusCode, body) {
  console.error('Error triggering webhook ' + shortname + ' with status code', statusCode, 'and body', body)
})
```

This makes it possible to check whether a webhook trigger succeeded and to inspect request information such as the status code or response body.

Events use the format `eventName.result`. The selected library, `eventemitter2`, provides a flexible way to listen for events. For example:

- `eventName.success`
- `eventName.failure`
- `eventName.*`
- `*.success`
- `*.*`


## API examples

Webhooks are useful whenever you need to make sure an external service receives updates from your app.
You can build API endpoints like these in your app.

- <code>GET /api/webhook/get</code>
Return the full webhook DB file.

- <code>GET /api/webhook/get/[WebHookShortname]</code>
Return the selected webhook.

- <code>POST /api/webhook/add/[WebHookShortname]</code>
Add a new URL for the selected webhook. A JSON body with the `url` parameter is required: `{ "url": "http://..." }`

- <code>GET /api/webhook/delete/[WebHookShortname]</code>
Remove all URLs attached to the selected webhook.

- <code>POST /api/webhook/delete/[WebHookShortname]</code>
Remove a single URL attached to the selected webhook.
A JSON body with the `url` parameter is required: `{ "url": "http://..." }`

- <code>POST /api/webhook/trigger/[WebHookShortname]</code>
Trigger a webhook. It requires a JSON body that will be forwarded to the webhook URLs. You can also provide custom headers.



### Author

Rocco Musolino - [@roccomuso](https://twitter.com/roccomuso)
