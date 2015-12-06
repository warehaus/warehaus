# Labsome [![Build Status](https://travis-ci.org/labsome/labsome.svg?branch=master)](https://travis-ci.org/labsome/labsome)

*This README describes how to build and develop Labsome.*

**For documentation about installation and usage please visit [http://www.labsome.io/](http://www.labsome.io/).**

-----

## Directory Structure

* `src/labsome` is the root of Labsome's Python package
* `src/labsome/backend` contains the web-server part
* `src/labsome/frontend` is a standalone Node package for the UI
* `src/labsome/static` is where the frontend is built into

### Frontend

The frontend of Labsome is a separate Node package which exists in the directory tree, but is not packaged as part of the production Python package -- only the `static` folder is what we use after building the frontend.

To develop the frontend package, install the package and run `gulp`. Make sure you have node 5.0 installed.

    cd src/labsome/frontend
    npm install
    bower install
    gulp

To build, run `gulp build` instead of `gulp`:

    gulp build

All build results are compiled to the `src/labsome/static` folder in the top of the repo.

### Backend

The `setup.py` file for the project can be found in `src/`. As described above, it only builds `src/labsome/backend` and `src/labsome/static` into Labsome's package, so it assumes the frontend is already built when creating the backend package.

To install the backend for development, create a `virtualenv` and install the package in it. Make sure you have Python and virtualenv installed beforehand.

    cd src
    virtualenv _venv
    source _venv/bin/activate
    python setup.py develop

The run the server:

    ./_venv/bin/labsome-server
