date: 2015-01-11
slug: universal-package-format
title: The universal package format
lang: en

There are dozens of package formats: apk, deb, rpm, jar, war, whl, egg, dmg, and the list goes on.

Some are language agnostic, like deb and rpm.
They still are system specific, e.g. rpm have to be installed in a fedora/redhat system whereas debs go to debian/ubuntu systems [^1].

Others are language/framework specific, like jar and war for Java apps, wheel and egg for Python, gems for Ruby, etc.

What would it take to have a system and language agnostic universal package format ?

## No or universal runtime

Apart form the auto-extracting packages, almost all others need a runtime to function:
debs and rpms needs something like apt-get or yum, eggs and wheels need Python, jars and wars need a JVM and possibly a Java server, etc.

A universal package format would ideally also provde a universal *runner* to bootstrap the package.

## Flexible

A universal package format would need to be damn flexible to be able to handle anything you throw at it, be it a WSGi Python application or a WAR file already deployed into a servlet container or something else alongside a specific version of a native library or program installed (image magick or ffmeg for example).

## Isolated

Since a universal package could embed native programs and libraries, it should not simply be unpacked into the host system or risk conflicting with other versions of said program or library.

A possible solution would be to unpack in a package exclusive directory, but this won't work with unwilling or unknowing programs and libraries which will look for their dependencies in their standard and usual location (e.g. `/usr/lib/`).

Ideally, when such a universal package is installed, the programs it contains shouldn't have to be modified to look for their dependencies in an installation specific location.

A virtual machine is one possible solution for this.

## Lightweight

VMs are too heavyweight.

The universal package format should strive for higher density on the same hardware.

## Configurable

A program inside a universal package might listen on TCP or UDP connections on a specific port.

It also might read or write file from and to a specific directory.

Also, the package user might want to control the environment inside of it.

To be usable, a universal package format must let its users map the ports of the package to other ports in the host (to be able to run two apps listening on the same port).

It also must handle mounting files and directories from the host into the packaged program (to be able to collect the files produced by the program or override the files it embeds).

And finally, it must be possible to inject environment variables into the package.

## Goodies

Being able to step inside the package to interact with the programs it embeds is invaluable.

Log collecting is also a very useful feature to have.

## Solution X

Now, imagine a solution where you start from a pristine base system.
Say a linux distribution, debian wheezy for example.

You then install the packages required by your application: nginx or haproxy, OpenJDK, a specific Ruby version, etc.

You can then interact and modify the configuration files of the system, e.g. adding a frontend and backend declaration in the HAProxy configuration, or a virtual host in your httpd config, etc.

You can also copy files from your machine to the package, e.g. your application compiled code, its static assets and configuration files, etc.

Once you're satisfied with the result, you package the system into an artifact. Let's call it an image since that's what it is: an image of a system.

You copy the resulting image to the target system, say the staging environment and run it there.

We won't be getting on the how of running the image, I'll just frantically wave my hands and tell you it is like running a virtual machine but not really, because it is much more lightweight and without any hardware emulation.

The target system must have a tiny program: the package runtime we talked about earlier.

This program lets me run an image in a configurable way: it lets me remap an image port to a different host port, mount files and directories from the host into the running image and set environment variables inside the running image.

Wouldn't such a solution be great?

It is language agnostic.
I can use it to package PHP applications as well as Java or native apps.

It is much more flexible than the said languages custom package formats since I have total control of the Linux system it contains.

It also is system agnostic: all you'd need is a system capable of running the solution X runtime.

And finally, such a solution is very reliable since it doesn't depend on the host system to have the required dependencies in the correct versions.


## Such a solution already exists

Many of you must have already guessed it:

> Dockah dockah dockah

I won't bore you with details on how Docker works or how to use it, the internet is teeming with talks, slides and articles on this subject.

I'll just say this: among other things, Docker defines a universal package format, the docker images which can handle any stack you throw at it.
Docker went even further and implemented a smart image format where instead of being a ginormous opaque blob (VM images for example) are instead a set of layers which can be reused across other images to reduce the download bandwidth.

Docker also provides a very simple yet powerful tool to automate the image building: Dockerfiles.

And finally, the Docker daemon is the runtime part of the solution X and should run in most reasonably recent linux distros.

While they are an overkill sometimes, Docker images are better WARs than WARs and better X than X in general, for X in language specific deployable package formats.

[^1]: There are workarounds in the form of deb to rpm and vice-versa converters like alien for example.