![image](img/logo.png)

## What is it?

Labsome is a management tool for datacenters.

Say that you have a datacenter with some servers. In most cases this datacenter is managed by a small team that needs to make sure everything works well, and there are great tools for doing that.

But what happens when --

* your datacenter has a lot of users, like R&D and QA teams?
* you want to run scripts that directly interact with hardware in the datacenter?
* you want to monitor usage instead of just the problems?

Labsome might be what you need.

## Quick Start

Labsome is distributed as a Docker container and uses the RethinkDB database for storage.

### Setting Up the Database

If you're setting up a new RethinkDB instance, the simplest thing you can do is run it in a Docker container. You can then link that container to Labsome:

    docker run --name rethinkdb rethinkdb

This command line creates a new RethinkDB container. Note that this is great for testing and small deployments -- see the full documentation for this RethinkDB image in [this Docker Hub page](https://hub.docker.com/_/rethinkdb/).

You can also directly connect to an existing RethinkDB instance, see below for "environment variables".

### Starting Labsome

    docker run -p 80:80 --link rethinkdb labsome/labsome

Extra options you can pass as environment variables:

* `RETHINKDB_PORT_28015_TCP_ADDR`: sets the RethinkDB hostname.
* `RETHINKDB_PORT_28015_TCP_PORT`: the RethinkDB port.
* `RETHINKDB_AUTH`: sets the authentication string. *default: empty*
* `RETHINKDB_DB`: Database name. *default: `labsome`*
