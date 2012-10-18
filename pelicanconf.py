#!/usr/bin/env python
# -*- coding: utf-8 -*- #

AUTHOR = u"Jawher"
SITENAME = u"Jawher"
SITEURL = 'http://jawher.me'

TIMEZONE = 'Europe/Paris'

DEFAULT_LANG = 'fr'
TRANSLATION_FEED = None

DEFAULT_PAGINATION = False

MD_EXTENSIONS = ['codehilite', 'extra', 'toc', 'fenced_code', 'dot']
MARKUP = ('md')

PAGE_URL = '{slug}/'
PAGE_SAVE_AS = '{slug}/index.html'

ARTICLE_URL = '{date:%Y}/{date:%m}/{date:%d}/{slug}/'
ARTICLE_SAVE_AS = '{date:%Y}/{date:%m}/{date:%d}/{slug}/index.html'

FEED_ATOM = ('atom.xml')
CATEGORY_FEED_ATOM = None
FEED_DOMAIN = SITEURL

THEME = 'theme'

from datetime import datetime
LAST_TIME = datetime.today()

STATIC_PATHS = ['images']

FILES_TO_COPY = (('extra/favicon.ico', 'favicon.ico'),)

