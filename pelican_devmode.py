from pelican import signals
from os import getenv


def dev_mode(sender):
    sender.context['devMode'] = getenv("DEV_MODE", "")


def register():
    signals.generator_init.connect(dev_mode)
