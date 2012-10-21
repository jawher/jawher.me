import os.path
from datetime import datetime
from logging import info
from codecs import open
from xml.sax.saxutils import escape
from pelican import signals
import string
from operator import attrgetter

ATOM_HEADER = u"""<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
 <title>$sitename</title>
 <link href="$siteurl/atom.xml" rel="self"/>
 <link href="$siteurl/"/>
 <updated>$now</updated>
 <id>$siteurl/</id>
 <author>
   <name>$author</name>
   <email>$author_email</email>
 </author>
"""

ATOM_ENTRY = u"""
<entry>
   <title>$title</title>
   <link href="$url"/>
   <published>$time</published>
   <updated>$time</updated>
   <id>$url</id>
   <content type="html">$content</content>
 </entry>
"""

ATOM_FOOTER = u"""
</feed>
"""


def format_date(d):
    return d.isoformat('T') + 'Z'


class CustomAtomGenerator(object):

    def __init__(self, context, settings, path, theme, output_path, *null):
        self.output_path = output_path
        self.context = context
        self.now = datetime.now()
        self.siteurl = settings.get('SITEURL')
        self.sitename = settings.get('SITENAME')
        self.author = settings.get('AUTHOR')
        self.author_email = settings.get('AUTHOR_EMAIL')

    def generate_output(self, writer):
        path = os.path.join(self.output_path, 'atom.xml')

        entries = [a for a in self.context['articles']]

        for article in self.context['articles']:
            entries += article.translations

        entries.sort(key=attrgetter('date'), reverse=True)

        info('writing {0}'.format(path))

        with open(path, 'w', encoding='utf-8') as fd:
            fd.write(string.Template(ATOM_HEADER).substitute(
                siteurl=self.siteurl,
                sitename=self.sitename,
                author=self.author,
                author_email=self.author_email,
                now=format_date(self.now)))
            for entry in entries:
                url = self.siteurl + '/' + entry.url
                fd.write(string.Template(ATOM_ENTRY).substitute(
                    title=entry.title,
                    url=url,
                    time=format_date(entry.date),
                    content=escape(entry.content)))

            fd.write(ATOM_FOOTER)


def get_generators(generators):
    return CustomAtomGenerator


def register():
    signals.get_generators.connect(get_generators)
