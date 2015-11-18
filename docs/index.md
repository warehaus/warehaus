![image](img/logo.png)

## What is it?

Labsome is a management tool for datacenters.

Say that you have a datacenter with some servers. In most cases this datacenter is managed by a small team that needs to make sure everything works well, and there are great tools for doing that.

But what happens when --

* your datacenter has a lot of users, like R&D and QA teams?
* you want to run scripts that directly interact with hardware in the datacenter?
* you want to monitor usage instead of just the problems?

Labsome might be what you need.

## Installation

Labsome is distributed as a Docker container and uses the PostgreSQL database for storage.

### Setting Up the Database

If you're setting up a new PostgreSQL instance, the simplest thing you can do is run it in a Docker container. You can then link that container to Labsome:

    docker run --env POSTGRES_USER=labsome --env POSTGRES_PASSWORD=labsome --name postgres postgres

This command line creates a new PostgreSQL container with a `labsome` user and database.
These values are used by default in Labsome's container. See below on how to change those default.

Also, see more options for the PostgreSQL container in [this page](https://hub.docker.com/_/postgres/).

### Starting Labsome

    docker run -p 5000:5000 --link postgres labsome/labsome

Extra options you can pass as environment variables:

* `POSTGRES_PORT_5432_TCP_ADDR`: sets the PostgreSQL hostname.
* `POSTGRES_PORT_5432_TCP_PORT`: the PostgreSQL port.
* `POSTGRES_USER`: Database username. *default: `labsome`*
* `POSTGRES_PASSWORD`: Database password. *default: `labsome`*
* `POSTGRES_DB_NAME`: Database name. *default: `labsome`*
* `POSTGRES_DATABASE_URI`: An SQLAlchemy-compatible database connection string. Overrides all the variables above.
