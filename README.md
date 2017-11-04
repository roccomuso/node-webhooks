# node-webhooks [![Build Status](https://travis-ci.org/roccomuso/node-webhooks.svg?branch=master)](https://travis-ci.org/roccomuso/node-webhooks) [![NPM Version](https://img.shields.io/npm/v/node-webhooks.svg)](https://www.npmjs.com/package/node-webhooks) [![Coverage Status](https://coveralls.io/repos/github/roccomuso/node-webhooks/badge.svg?branch=master)](https://coveralls.io/github/roccomuso/node-webhooks?branch=master) [![bitHound Overall Score](https://www.bithound.io/github/roccomuso/node-webhooks/badges/score.svg)](https://www.bithound.io/github/roccomuso/node-webhooks) [![Dependency Status](https://david-dm.org/roccomuso/node-webhooks.png)](https://david-dm.org/roccomuso/node-webhooks) <span class="badge-patreon"><a href="https://patreon.com/roccomuso" title="Donate to this project using Patreon"><img src="https://img.shields.io/badge/patreon-donate-yellow.svg" alt="Patreon donate button" /></a></span>


[![Standard - JavaScript Style Guide](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

## What WebHooks are used for

> Webhooks are "user-defined HTTP callbacks". They are usually triggered by some event, such as pushing code to a repository or a comment being posted to a blog. When that event occurs, the source site makes an HTTP request to the URI configured for the webhook. Users can configure them to cause events on one site to invoke behaviour on another. The action taken may be anything. Common uses are to trigger builds with continuous integration systems or to notify bug tracking systems. Since they use HTTP, they can be integrated into web services without adding new infrastructure.

## Install

    npm install node-webhooks --save

Supporting Node.js 0.12 or above.

## How it works

When a webHook is triggered it will send an HTTPS POST request to the attached URLs, containing a JSON-serialized Update (the one specified when you call the **trigger** method).

## Debug

This module makes use of the popular [debug](https://github.com/visionmedia/debug) package. Use the env variable to enable debug: <code>DEBUG=node-webhooks</code>.
To launch the example and enable debug: <code>DEBUG=node-webhooks node example.js</code>

## Usage

```javascript

// Initialize WebHooks module.
var WebHooks = require('node-webhooks')

// Initialize webhooks module from on-disk database
var webHooks = new WebHooks({
    db: './webHooksDB.json', // json file that store webhook URLs
    httpSuccessCodes: [200, 201, 202, 203, 204], //optional success http status codes
})

// Alternatively, initialize webhooks module with object; changes will only be
// made in-memory
webHooks = new WebHooks({
    db: {"addPost": ["http://localhost:9100/posts"]}, // just an example
})

// sync instantation - add a new webhook called 'shortname1'
webHooks.add('shortname1', 'http://127.0.0.1:9000/prova/other_url').then(function(){
	// done
}).catch(function(err){
	console.log(err)
})

// add another webHook
webHooks.add('shortname2', 'http://127.0.0.1:9000/prova2/').then(function(){
	// done
}).catch(function(err){
	console.log(err)
});

// remove a single url attached to the given shortname
// webHooks.remove('shortname3', 'http://127.0.0.1:9000/query/').catch(function(err){console.error(err);})

// if no url is provided, remove all the urls attached to the given shortname
// webHooks.remove('shortname3').catch(function(err){console.error(err);})

// trigger a specific webHook
webHooks.trigger('shortname1', {data: 123})
webHooks.trigger('shortname2', {data: 123456}, {header: 'header'}) // payload will be sent as POST request with JSON body (Content-Type: application/json) and custom header

```

## Available events

We're using an event emitter library to expose request information on webHook trigger.

```javascript
var webHooks = new WebHooks({
    db: WEBHOOKS_DB,
    DEBUG: true
})

var emitter = webHooks.getEmitter()

emitter.on('*.success', function (shortname, statusCode, body) {
    console.log('Success on trigger webHook' + shortname + 'with status code', statusCode, 'and body', body)
})

emitter.on('*.failure', function (shortname, statusCode, body) {
    console.error('Error on trigger webHook' + shortname + 'with status code', statusCode, 'and body', body)
})
```

This makes possible checking if a webHook trigger was successful or not getting request information such as status code or response body.

The format for the events is built as `eventName.result`. The choosen library `eventemitter2` provides a lot of freedom for listening events. For example:

- `eventName.success`
- `eventName.failure`
- `eventName.*`
- `*.success`
- `*.*`


## API examples

webHooks are useful whenever you need to make sure that an external service get updates from your app.
You can easily develop in your APP this kind of webHooks entry-points.

- <code>GET /api/webhook/get</code>
Return the whole webHook DB file.

- <code>GET /api/webhook/get/[WebHookShortname]</code>
Return the selected WebHook.

- <code>POST /api/webhook/add/[WebHookShortname]</code>
Add a new URL for the selected webHook. Requires JSON params:

- <code>GET /api/webhook/delete/[WebHookShortname]</code>
Remove all the urls attached to the selected webHook.

- <code>POST /api/webhook/delete/[WebHookShortname]</code>
Remove only one single url attached to the selected webHook.
A json body with the url parameter is required: { "url": "http://..." }

- <code>POST /api/webhook/trigger/[WebHookShortname]</code>
Trigger a webHook. It requires a JSON body that will be turned over to the webHook URLs. You can also provide custom headers.



### Author

Rocco Musolino - [@roccomuso](https://twitter.com/roccomuso)
