## What WebHooks are used for

> Webhooks are "user-defined HTTP callbacks". They are usually triggered by some event, such as pushing code to a repository or a comment being posted to a blog. When that event occurs, the source site makes an HTTP request to the URI configured for the webhook. Users can configure them to cause events on one site to invoke behaviour on another. The action taken may be anything. Common uses are to trigger builds with continuous integration systems or to notify bug tracking systems. Since they use HTTP, they can be integrated into web services without adding new infrastructure.

# node-webhooks

Install:

    npm install node-webhooks --save


## How it works

When a webHook is triggered it will send an HTTPS POST request to the attached URLs, containing a JSON-serialized Update (the one specified when you call the **trigger** method).

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
Trigger a webHook. It requires a JSON body that will be turned over to the webHook URLs.



### Author

Rocco Musolino - hackerstribe.com