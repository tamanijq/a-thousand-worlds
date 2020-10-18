A Thousand Worlds
======================================================

Based on https://github.com/nprapps/book-concierge

Getting started
---------------

To run this project you will need:

* Node installed (preferably with NVM or another version manager)
* The Grunt CLI (install globally with ``npm i -g grunt-cli``)
* Git

With those installed, you can then set the project up using your terminal:

#. Pull the code - ``git clone git@github.com:raineorshine/a-thousand-worlds``
#. Enter the project folder - ``cd a-thousand-worlds``
#. Install dependencies from NPM - ``npm install``
#. Pull data and covers: ``grunt update``
#. Start the server - ``grunt``
#. Publish - ``grunt publish:stage``

Running tasks
-------------

Like all interactive-template projects, this application uses the Grunt task runner to handle various build steps and deployment processes. To see all tasks available, run ``grunt --help``. ``grunt`` by itself will run the "default" task, which processes data and starts the development server. However, you can also specify a list of steps as arguments to Grunt, and it will run those in sequence. For example, you can just update the JavaScript and CSS assets in the build folder by using ``grunt bundle less``.

Common tasks that you may want to run include:

* ``covers`` - downloads book covers from the book cover API
* ``cron`` - runs builds and deploys on a timer (see ``tasks/cron.js`` for details)
* ``default`` - builds all files, starts the dev server, and watches for changes
* ``docs`` - updates local data from Google Docs
* ``google-auth`` - authenticates your account against Google for private files
* ``publish`` - deploys the build folder to surge

  * ``publish:stage`` uploads to staging

* ``publish-s3`` - uploads files to the staging S3 bucket

  * ``publish:live`` uploads to production
  * ``publish:simulated`` does a dry run of uploaded files and their compressed sizes

* ``scrape`` - downloads book metadata from various service endpoints
* ``sheets`` - updates local data from Google Sheets
* ``shelve`` - puts books into a common data structure, and builds out .json files in /build for AJAX
* ``static`` - builds all files
* ``sync`` - gets/sets cover files from S3 (publish will not push them)
* ``validate`` - runs various integrity tests on the data. You can specify specific tests with the ``--check`` argument:

  * ``integrity`` - checks internal data on the book (IDs and other required fields)
  * ``tags`` - counts tags that have relatively few matches (i.e., are probably typos)
  * ``badCovers`` - finds cover images that are probably "NO IMAGE AVAILABLE"
  * ``missingCovers`` - identifies books that have no cover image at all
  * ``reviewers`` - checks that all reviewers have a book on the shelf somewhere
  * ``reviewed`` - checks that all books have a matching reviewer
  * ``links`` - identifies orphan links (no book on the shelf matches its metadata)

Analytics
---------

The concierge tracks the following events:

* ``book-selected`` - user clicked through to book details
* ``view-mode`` - should be "cover" or "list"
* ``year-selected``
* ``tag-selected``
* ``clear-filters``
* ``fab-select`` - logs the number of selected tags in the mobile filter
* ``clicked-link`` - tracks links with a ``[data-track]`` attribute

Schema
------

The application expects to have access to a Google Doc with the text for the about page, as well as a workbook containing book data. There are four named sheets that the app expects to exist, with the following columns:

* **copy** - contains template text strings as key/value pairs

  * ``key``
  * ``value``

* **links** - related story links for each book

  * ``year`` - year for the book
  * ``id`` - id for the book
  * ``source`` - human-readable text for the link origin
  * ``text`` - link contents
  * ``url`` - link href value

* **reviewers** - reviewer metadata for all blurbs

  * ``key`` - reviewer name
  * ``title`` - reviewer title
  * ``link`` - reviewer home page or profile link

* **years** - index for actual book data

  * ``year`` - calendar year value
  * ``sheet`` - name of sheet containing books for that year
  * ``current`` - flag value to mark this as "checked" by default on page load

* Within the sheet for each year of book data, the following columns are expected:

  * ``id`` - primary key for the book, used for permalinks and table relationships
  * ``title``
  * ``reviewer`` - this name should match the key in the reviewer sheet
  * ``text`` - recommendation blurb
  * ``tags`` - filter categories, separated by ``|`` characters
  * ``isbn``
  * ``seamus``
  * ``itunes``
  * ``goodreads``

Troubleshooting
---------------

**Fatal error: Port 35739 is already in use by another process.**

The live reload port is shared between this and other applications. If you're running another interactive-template project or Dailygraphics Next, they may collide. If that's the case, use ``--reload-port=XXXXX`` to set a different port for the live reload server. You can also specify a port for the webserver with ``--port=XXXX``, although the app will automatically find the first available port after 8000 for you.