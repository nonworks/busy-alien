# Busy Alien

Streaming communication mapping between ExpressJS and business endpoints.

## Usage

`npm install nonworks/busy-alien`

```javascript
var express = require('express');
var app = express();
var BusyAlien = require('busy-alien');
var versionOfThisApp = 'v1.0';

busyAlien = BusyAlien(app, versionOfThisApp, 'folder/to/endpoints')
```

The `folder/to/endpoints` must be a folder containing files on the form *prefix*\_subject.js, 
where prefix may be one of `get`, `create`, `update` or `remove`.

Example:

* folder/to/endpoint/get_user.js
* folder/to/endpoint/create_profile.js

These files should export a single function taking two parameters `stuff` and `cb`.

* `stuff` is an object with keys `session` and `args`
* `session` is a string
* `cb` must be called once for every data entry which is to be returned with a single argument
  which is an object, one key per data entry.

Example:

```javascript
// get_user.js

module.exports = function(stuff, cb){
    var args = stuff.args;
    var session = stuff.session;

    if (validateSession(session)){
        var fetchedUser = sql.findById(args.id);

        cb({ user: fetchedUser });
    }
};
```

## Communication protocol

Upon connecting, the server will send `['version', 'whatever-version-was-set']`. This is to ensure
that the client is capable of communicating with this server.

Every message received must be an array with the structure `[command, arguments, referenceId]`.

* *command*: 'get', 'salmon' or 'ping'
* *arguments*: Must be object, may contain any data serializable by JSON
* *referenceId*: An ID that will be provided with any data entries being returned

Any message sent will be on the same structure, where command may be 'drip' or 'pong'

Commands:

* *get*: A request from the client to receive one or more resources. Each key in arguments is a resource,
  its value will be sent to the handling function
* *salmon*: A request from client to push data updates upstreams (like a salmon). The update may be created, deleted or updated.
* *ping*: A request to keep the connection alive, will answer pong
* *drip*: A notification sent from server to notify client that a resource has changed (updated, deleted or created)

What action are taken by server on a resource depends on what arguments are provided.

* If arguments are lacking an `id` key, it is requested to be created.
* If arguments have an `id` key, it is requested to be updated.
* If arguments have a truthy `isDeleted` key, it is requested to be deleted.

A client can never know if a resource is newly created or updated. It will know when it's deleted,
because the isDeleted flag will be set.

### Special resource _session_

If a resource is returned by server which is called *session* and has an `id` key, this key
will be persisted to this connection and set for all further requests.

If the session is to be removed, simply send it with an `isDeleted` flag.
