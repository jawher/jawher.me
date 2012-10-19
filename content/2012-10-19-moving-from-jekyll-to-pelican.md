date: 2012-10-19
slug: moving-from-jekyll-to-pelican
title: Moving from Jekyll to Pelican
language: en

I just finished migrating this blog from Jekyll to [Pelican](http://blog.getpelican.com/).
I've stumbled upon (no pun intended) Pelican a couple of months ago on `/r/python`.
I thought it was cool but that was it.
But recently, I've decided I'd be translating some Litil posts from French to English in the next weeks.
I've checked, and there wasn't any straitforward way to handle translation in Jekyll.
I could create the translations as new posts, but that would just be messy.
That's when I remembered Pelican, and the fact that it handled translations out of the box.
The fact that Pelican is written in Python didn't hurt, as I'm much more comfortable with Python than with Ruby.

Since I was stranded at home for a couple of days after getting injured in a football game, I've decided to give Pelican a try.
Here's how I've proceeded:

## Content

I started with the content.
Luckily *(or rather unfortunately ?)*, I only had 3 posts in this new blog.
I'm using markdown as my posts format. I had to modify the metadata from the Jekyll format to Pelican's.
All I had to do was to delete the lines (`-`) surrounding the metadata and change a couple of key names.
So it went from:

```
---
date: '2012-06-27 21:45:00'
layout: post
slug: creation-langage-programmation-litil-2-lexer
published: true
title: Le conte de Litil - Chapitre 2, Le dépeceur du texte, aka Lexer
---
```

To:

```
date: 2012-06-27
slug: creation-langage-programmation-litil-2-lexer
title: Le conte de Litil - Chapitre 2, Le dépeceur du texte, aka Lexer
```



I also had to change the code highlighting parts. Whereas in Jekyll it was done using a Liquid block:

```
{% highlight java}
public static final int answer = 42;
{% endhighlight %}
```

In Pelican you use fenced code blocks à-la Github instead:

    :::
    ```java
    public static final int answer = 42;
    ```

I was left with one last problem regarding the content: 
with Jekyll, I have developed a Liquid extension that generates an image from a graph defintion (in the dot language) and inserted it into the content (I used it in [this post](http://jawher.me/2012/06/27/creation-langage-programmation-litil-2-lexer/) for example).
Here's how the source looked like:

```
{% graphviz litil-lexer-dfa0.png %}
digraph G {
  rankdir=LR
  S0 -> A [label="-"]
  A -> B [label="-"]
  A -> C [label=">"]

  A [peripheries=2]
  B [peripheries=2]
  C [peripheries=2]
}
{% endgraphviz %}
```

So I had to come up with something similar in Pelican.
Even worse, I couldn't use something off the shelf as it had to work tightly with the site generator (e.g. place the generated images in a specific directory).
A quick googling didn't turn anything useful, so I came up with [my own version](https://github.com/jawher/markdown-dot).
I've done it differently that with Jekyll though.
This new version is a markdown extension rather than a custom tag (of the templating system), as in Pelican, and unless I'm mistaken, posts do not get processed by the templating engine.
Here's how it looks like now *(ugly syntax, I know)*:

    :::
    {% dot litil-lexer-dfa0.png
    digraph G {
      rankdir=LR
      S0 -> A [label="-"]
      A -> B [label="-"]
      A -> C [label=">"]
    
      A [peripheries=2]
      B [peripheries=2]
      C [peripheries=2]
    }
    %}


## Settings

I've then started tweaking the settings.
The existing urls had to continue working.
It's as simple as that.
Luckily, that wasn't hard at all using these 2 lines:

```python
ARTICLE_URL = '{date:%Y}/{date:%m}/{date:%d}/{slug}/'
ARTICLE_SAVE_AS = '{date:%Y}/{date:%m}/{date:%d}/{slug}/index.html'
```

I also had to tweak the feed generation part:

```python
FEED_ATOM = ('atom.xml')
CATEGORY_FEED_ATOM = None
FEED_DOMAIN = SITEURL
TRANSLATION_FEED = None
```

I couldn't keep the same urls for everything though, e.g. the css files and images.
Pelican has some hard-coded paths for this kind of assets.
Hopefully it'll get more flexible in the future.

## Theming

The theming part was the trickiest.
Theming is handled differently between Jekyll and Pelican.
Jekyll's approach is more *abstract*, e.g. you used metadata in the template files to indicate inheritance, and special vars to inject the content.
Pelican's way of doing things is closer to the metal:
it used Jinja2 as a templating engine, and that was it.

For example, the article template went from:

```html
---
layout: default
---

<div class="nav">
  <a href="/">← all posts</a>
    &mdash;
  <a href="/my-projects">my projects</a>
   &mdash;
  <a href="https://twitter.com/#!/jawher">twitter</a>
   &mdash;
  <a href="https://github.com/jawher">github</a>
</div>

<article id="post">
    <div class="meta">
        <div class="date">
            <span class="day">{{ page.date | date: "%d" }}</span>
            <span class="month">{{ page.date | date: "%b" }}</span>
            <span class="year">{{ page.date | date: "%Y" }}</span>
        </div>
        <!--<div><a href="{{ page.url }}#disqus_thread" data-disqus-identifier="{{ page.url }}">Count</a></div>-->
    </div>

{{ content }}
</article>
```

To:

```html
{% extends "base.html" %}
{% block extra_links %}
  <li><a href="/">← home</a>&#9733;</li>
{% endblock %}
{% block content %}
        
<article id="post">
    <div class="meta">
        <div class="date">
            <span class="day">{{ article.date.strftime("%d") }}</span>
            <span class="month">{{ article.date.strftime("%b") }}</span>
            <span class="year">{{ article.date.strftime("%Y") }}</span>
        </div>
    </div>

<h1>{{article.title}}</h1>
{{ article.content }}
</article>
```

I have to admit that I like Pelican's approach much mor than Jekyll's.
While it was more low level, I found it to be much more intuitive.

And while I was at it, I've also tweaked the design a bit.
Mostly changing the post and page templates design to match the index page.

## Conclusion

Pelican's documentation, while rich, is often imprecise and lacks details.
For example, it'll often tell you to place static assets in a images directory so that they'll be automatically copied to the output.
What it doesn't tell you though is that this directory must be placed in the content directory, and not in the site root.

But all in all, it wasn't such a bad experience, and went rather smoothly. I've grown to love the `make devserver` command, and the generation speed (light years ahead of Jekyll).

Now that the migration is done, I have no more excuses for not publishing more often. See you in the next post.