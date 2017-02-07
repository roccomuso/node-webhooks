# node-webhooks [![Build Status](https://travis-ci.org/oscarnevarezleal/node-webhooks.svg?branch=master)](https://travis-ci.org/oscarnevarezleal/node-webhooks) [![NPM Version](https://img.shields.io/npm/v/node-webhooks.svg)](https://www.npmjs.com/package/node-webhooks)


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
var WebHooks = require('./index');
var debug = require('debug')('example');

const redisConfig = {
    preffix: 'whe_',
    host: '192.168.99.100',
    port: '32772'
};
//const redisStorage = require('./src/storage').get('redis', redisConfig);
var fileConfig = {
    filename: 'webHooksDB.json'
};
const fileStorage = require('./src/storage').get('file', fileConfig);
const webHooks = new WebHooks({
    storage: fileStorage
});

webHooks.ready().then(function () {
    'use strict';

    debug('Webhooks is ready');
    // sync instantation - add a new webhook called 'shortname1'
    webHooks.add('shortname_x', 'http://stackoverflow.com/?q=1').then(function () {
        // done
    }).catch(function (err) {
        debug(err)
    })

    // add another webHook
    webHooks.add('shortname_y', 'http://stackoverflow.com/?q=2').then(function () {
        // done
    }).catch(function (err) {
        debug(err)
    });

    webHooks.multi([
        {name: 'shortname01', url: 'http://stackoverflow.com/?q=01'},
        {name: 'shortname02', url: 'http://stackoverflow.com/?q=02'},
        {name: 'shortname03', url: 'http://stackoverflow.com/?q=03'},
        {name: 'shortname04', url: 'http://stackoverflow.com/?q=04'}
    ]).then(function (data) {
        //debug('Multi finished', data);

        webHooks.exists('shortname04', function (exists) {
            debug('shortname04 existence is ' + exists);
        });

        webHooks.exists('shortname05', function (exists) {
            debug('shortname05 existence is ' + exists);
        });

        webHooks.trigger('shortname01', {data: 123456}, {header: 'header'}) // payload will be sent as POST request with JSON body (Content-Type: application/json) and custom header
        webHooks.trigger('shortname02', {data: 123456}, {header: 'header'}) // payload will be sent as POST request with JSON body (Content-Type: application/json) and custom header
        webHooks.trigger('shortname03', {data: 123456}, {header: 'header'}) // payload will be sent as POST request with JSON body (Content-Type: application/json) and custom header
        webHooks.trigger('shortname04', {data: 123456}, {header: 'header'}) // payload will be sent as POST request with JSON body (Content-Type: application/json) and custom header

    });
});
```

## Available events

We're using an event emitter library to expose request information on webHook trigger.

```javascript
var webHooks = new WebHooks({
    storage: fileStorage,
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

Rocco Musolino - hackerstribe.com
Oscar Nevarez Leal
