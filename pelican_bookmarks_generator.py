# -*- coding: utf-8 -*-
import os.path
import copy
import logging
from datetime import datetime
from urlparse import urlparse
from operator import attrgetter
from pelican import signals
from pelican.settings import DEFAULT_CONFIG
from pelican.generators import Generator

logger = logging.getLogger(__name__)


class Bookmark(object):
    """Represents a bookmark
    """
    mandatory_properties = ('date', 'title', 'url')

    def __init__(self, content, metadata=None, settings=None,
                 source_path=None, context=None):
        # init parameters
        if not metadata:
            metadata = {}
        if not settings:
            settings = copy.deepcopy(DEFAULT_CONFIG)

        self.settings = settings
        self.content = content
        self.translations = []

        local_metadata = dict(settings.get('DEFAULT_METADATA', ()))
        local_metadata.update(metadata)

        # set metadata as attributes
        for key, value in local_metadata.items():
            setattr(self, key.lower(), value)

        # also keep track of the metadata attributes available
        self.metadata = local_metadata
        self.filename = source_path

        self.check_properties()

        self.domain = urlparse(self.url).netloc

    def check_properties(self):
        """test that each mandatory property is set."""
        for prop in self.mandatory_properties:
            if not hasattr(self, prop):
                raise Exception('Property {0} is missing from {1}'.format(prop, self.filename))


class BookmarksGenerator(Generator):

    def __init__(self, *args, **kwargs):
        super(BookmarksGenerator, self).__init__(*args, **kwargs)

    def generate_context(self):
        """change the context"""
        bookmarks_path = os.path.normpath(  # we have to remove trailing slashes
            os.path.join(self.path, self.settings['BOOKMARKS_DIR'])
        )

        bookmarks = []
        for f in self.get_files(bookmarks_path):
            try:
                bookmark = self.readers.read_file( base_path=self.path, path=f, content_class=Bookmark,
                    context=self.context)
            except Exception, e:
                logger.warning(u'Could not process %s\n%s' % (f, str(e)))
                continue

            bookmarks.append(bookmark)

        # sort the articles by date
        bookmarks.sort(key=attrgetter('date'), reverse=True)
        self.context['bookmarks'] = bookmarks

    def generate_output(self, writer):
        writer.write_file(self.settings['BOOKMARKS_SAVE_AS'],
                    self.get_template('bookmarks'),
                    self.context,
                    relative_urls=False)


def get_generators(generators):
    return BookmarksGenerator


def register():
    signals.get_generators.connect(get_generators)
