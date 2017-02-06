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