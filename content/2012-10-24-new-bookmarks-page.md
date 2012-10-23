date: 2012-10-24
slug: new-bookmarks-page
title: The new bookmarks page
lang: en

Just a quick heads up: I've added a new bookmarks page where I'll be posting interesting[^1] stuff as I stumble upon it on the internets™.

[Bookmarks⇾](http://jawher.me/bookmarks.html)

A link to this page was added in the first position in the index page's menu, and in the second position in the other pages, just after the home link.

## The rationale

as most of you must be already doing,
I click on dozens of links every day, a few of which are very interesting and worth keeping track of.

I use many means to try and collect such links,
like Instapaper, twitter, the save functionality on reddit, starred posts in Google Reader, the browsers bookmarks, and what's not.

Most of these are online services, out of my control and could disappear overnight.
Even if they stay around, I might (as I already have done many times already) abandon a service for another.
 
And so I've decided I'd use my own means of collecting my bookmarks.

## The how *(it works)*
I'm glad [I switched to Pelican](http://jawher.me/2012/10/19/moving-from-jekyll-to-pelican/) and to a static site generator in general to power this blog,
as it was very easy to extend it with a [a plugin](https://github.com/jawher/jawher.me/blob/master/pelican_bookmarks_generator.py)[^2] to generate this new page.

Each bookmark is materialized as a file in the `content/bookmarks` folder.
A bookmark file looks like a regular post, albeit with custom metadata (namely the bookmark url) and an optional (markdown) content.
The plugin I wrote parses and collects these files into a list of bookmarks objects, and passes them to a Jinja2 template.
It is then simply a matter of iterating over them and outputting the appropriate HTML.

[^1]: to me at least, but hopefully to you too.
[^2]: not claiming it is state of the art, but at least it gets the job done.