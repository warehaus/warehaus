# Developing Labsome

Labsome is built with several Docker containers:

* `labsome/base-image` is a Debian container with some additional packages, mainly Python.
* `labsome/frontend-builder` is a Nodejs based container with `bower`, `gulp` and some gulp modules. This container builds the frontend.
* `labsome/labsome` is the container we get after a successful build.

When `labsome/labsome` is built it's assumed that the frontend is already compiled. In fact, no frontend files are copied into the container.

Therefore, if you want to develop Labsome you'll have to:

First clone the git repo

    git clone https://github.com/labsome/labsome.git

Then run the `labsome/frontend-builder` image so that it builds and monitors the frontend files for changes:

    docker run -ti --rm -v `pwd`:/build labsome/frontend-builder:v3 /bin/sh -c "cd /build/src/labsome/frontend && bower install --allow-root && gulp"
    
Finally, in another terminal, run the `labsome/labsome` container while mapping the sources into `/opt/labsome`. Remember that we still need a running RethinkDB instance as shown in the quick start:

    # cd into the clonsed repo
    docker run -ti -v `pwd`:/opt/labsome -p 80:80 --link rethinkdb

You can now access `http://localhost` while developing Labsome.

## Some Notes

* These instructions work well on both Linux and Mac.
* You might have to adapt permissions/ports to your specific environment.
