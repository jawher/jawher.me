date: 2015-01-13
slug: parsing-command-line-arguments-shameless-plug-mowcli
title: Parsing command line arguments and a shameless plug of mow.cli
lang: en

Parsing command line arguments is a deceptively complex task.
It looks simple at first:
Just iterate over the arguments, if it starts with a dash (`-`) then it is an option, otherwise it is an argument.

But it's a bit more trickier than that.
A [search on Github](https://github.com/search?utf8=✓&q=cli) with the keyword `cli` yields **55905** repositories at the time when this article was written.
Granted, not all of these hits are libraries for parsing command line arguments, but it still gets the idea across.


## Anantomy of a command line program

Writing a command line program can be divided in two macro tasks:

### Call arguments parsing

Most programming languages expose a way to retrieve the arguments with which the currently running program was executed as an array of strings.

These strings need to be analyzed and grouped into options, commands and arguments and their values stored to be accessed later.

This step, while not particularly hard to implement is very tedious as it has to handle many cases:

* Short options: e.g. `-f`
* Boolean flags (without a value) as in `rm -f` and options with values as in `dd if=/dev/null of=/tmp/out` or without the `=` sign: `head -n 5 readme.txt`
* Long optios: `docker run --name super/container` and `docker run --name=super/container`
* Option grouping/folding, e.g. `rm -rf *.png` besides `rm -r -f *.png`
* Option end marker `--`: `touch -- -f` to treat `-f` as a filename instead of an option
* etc.

A rudimentary form of validation can be performed in this, mainly rejecting unknown options or commands or downright incorrect call syntax.

Almost all command line parsing libraries handle this parsing part with varying degrees of completeness (not all libraries handle option folding for example).

### Routing

Once the call arguments are parsed, the running program needs to select a code path based on the set of options, commands and arguments passed by the program user.

A higher level validation can take place in this step, e.g. reject conflicting options for the task in hand or ensure that the correct number of arguments is present.

Not many command line parsing libraries handle this step, and it is left to the program writer to write the `if/else` soup to make sense of what the user wants to do.

## Naval fate

In the following, I'll be using two open source command line parsing libraries as examples for the state of the art, namely:

* [codegangsta/cli](https://github.com/codegangsta/cli) written in Go
* [docopt](http://docopt.org) written in Python (with [ports to many other languages](https://github.com/docopt/))

The example app that will be used is the naval fate game (shamelessly copied from the [try docopt](http://try.docopt.org) page).

It's a simple game where you can position and move ships and mines in a grid using a command line interface:

```
naval_fate ship new HMS
naval_fate ship move HMS 1 3
naval_fate mine set 4 2 --drifting
```

On a side note, I had to modify the move ship command syntax from:

```
naval_fate.py ship <name> move <x> <y> [--speed=<kn>]
```

To:

```
naval_fate.py ship move <name> <x> <y> [--speed=<kn>]
```

I.e swap the `<name>` argument and `move` command order because the former syntax is not *(easily)* implementable in `codegangsta/cli`.

I also restricted the game to 3 commands: `ship new`, `ship move` and `mine set` as they are sufficient for the purpose of this article.

### docopt

The idea behind this library is simply genious: use the help message you would want to be shown by the app to describe its syntax:

```python
"""Naval Fate.
Usage:
  naval_fate.py ship new <name>...
  naval_fate.py ship move <name> <x> <y> [--speed=<kn>]
  naval_fate.py mine set <x> <y> [--moored|--drifting]

Options:
  --speed=<kn>  Speed in knots [default: 10].
  --moored      Moored (anchored) mine.
  --drifting    Drifting mine.
"""
from docopt import docopt
import sys

if __name__ == '__main__':
    args = docopt(__doc__, version='Naval Fate 2.0')
    if args['ship']:
        if args['new']:
            print 'create ships {}'.format(args['<name>'])
        elif args['move']:
            name = args['<name>']
            try:
                x = int(args['<x>'])
                y = int(args['<y>'])
                speed = int(args['--speed'])
            except ValueError:
                print 'Incorrect Usage'
                sys.exit(1)

            print 'move ship named {} to {}:{} with speed {}'.format(name, x, y, speed)
    elif args['mine']:
        if args['set']:
            try:
                x = int(args['<x>'])
                y = int(args['<y>'])
            except ValueError:
                print 'Incorrect Usage'
                sys.exit(1)
            s = 'moored'
            if args['--moored']:
                s = 'moored'
            elif args['--drifting']:
                s = 'drifting'

            print 'set a {} mine in {}:{}'.format(s, x, y)

```

The help message syntax respects the conventions used in the majority of CLI apps in POSIX systems.

On the positive side:

* Docopt usage syntax is very flexible and can be used to build very complex command syntaxes
* Docopt does the low and high level call args validation for you. In the code above for example, you can't call the `mine set` command with both `--moored` and `--drifting` options.

However, docopts is not without its warts:

* It doesn't do the routing part:  
it only returns a hash containing the call commands, arguments and options, and it is up to the developer to branch on its values to select and execute the correct code path as can be seen in the code above with the nested `if/else` blocks
* Non contexual help messages: either everything is correct and the program runs, or the program exits and the whole usage string is dumped, no matter the commands and options the program called specified

### codegangsta/cli

This is one very popular project (2095 stars in Github at the time where this article was written).

Here's a possible implementation of the naval fate subset using this library:

```go
package main

import (
    "fmt"
    "os"
    "strconv"

    "github.com/codegangsta/cli"
)

func main() {
    app := cli.NewApp()
    app.Name = "naval_fate"
    app.Commands = []cli.Command{
        {
            Name: "ship",
            Subcommands: []cli.Command{
                {
                    Name:   "new",
                    Usage:  "NAME...",
                    Action: newShips,
                },
                {
                    Name:  "move",
                    Usage: "NAME X Y",
                    Flags: []cli.Flag{
                        cli.IntFlag{
                            Name:  "speed",
                            Value: 10,
                            Usage: "Speed in knots",
                        },
                    },
                    Action: moveShip,
                },
            },
        },
        {
            Name: "mine",
            Subcommands: []cli.Command{
                {
                    Name:  "set",
                    Usage: "X Y [--moored|--drifting]",
                    Flags: []cli.Flag{
                        cli.BoolFlag{
                            Name:  "moored",
                            Usage: "Moored (anchored) mine",
                        },
                        cli.BoolFlag{
                            Name:  "drifting",
                            Usage: "Drifting mine",
                        },
                    },
                    Action: setMine,
                },
            },
        },
    }

    app.Run(os.Args)
}

func newShips(c *cli.Context) {
    if len(c.Args()) == 0 {
        fmt.Printf("Incorrect usage\n")

        return
    }
    fmt.Printf("create ships %#v\n", c.Args())
}

func moveShip(c *cli.Context) {
    if len(c.Args()) != 3 {
        fmt.Printf("Incorrect usage\n")
        return
    }
    name := c.Args()[0]
    x, err := strconv.Atoi(c.Args()[1])
    if err != nil {
        fmt.Printf("Incorrect usage\n")
        return
    }
    y, err := strconv.Atoi(c.Args()[2])
    if err != nil {
        fmt.Printf("Incorrect usage\n")
        return
    }
    speed := c.Int("speed")
    fmt.Printf("move ship named %v to %d:%d with speed %d\n", name, x, y, speed)
}

func setMine(c *cli.Context) {
    if len(c.Args()) != 2 {
        fmt.Printf("Incorrect usage\n")
        return
    }
    x, err := strconv.Atoi(c.Args()[0])
    if err != nil {
        fmt.Printf("Incorrect usage\n")
        return
    }
    y, err := strconv.Atoi(c.Args()[1])
    if err != nil {
        fmt.Printf("Incorrect usage\n")
        return
    }
    if c.Bool("moored") && c.Bool("drifting") {
        fmt.Printf("Incorrect usage\n")
        return
    }
    s := "moored"
    switch {
    case c.Bool("moored"):
        s = "moored"
    case c.Bool("drifting"):
        s = "drifting"
    }
    fmt.Printf("set a %s mine in %d:%d\n", s, x, y)
}
```

This clocks at 118 lines of code.

Here's a quick rundown of the code above:
Structs are used to describe the application structure.
Starting from an application, a list of top-level commands are defined used an slice of structs.
Each command can in turn have a list of sub commands, and so on.

Each command has a name, a usage string, a list of flags (options) and an action, the code to be called when the command is invoked.

The good:

* The library does the routing part for you: no need for nested `if/else` blocks
* Declarative and readable code

The bad:

* This library suffers from a major weakness: it doesn't offer any facilities to handle arguments.  
As can be seen in the code blob above, it is up to the library user to ensure that the correct number and values of arguments have been specified.
* No high level validation. For example, it is up to the developper to ensure that `--moored` and `--drifting` can't both be set at the same time
* Type repetition for flags: a flag first needs to be declared with its type (`cli.IntFlag(...)`) when describing the commands. Then, to get its value in the `Action` func, you need to call `c.Int(name)` where the type is specified again.

### Summary

|                       | docopt | codegangsta/cli |
|----------------------:|:------:|:---------------:|
|                   LOC |   45   |       118       |
|               routing |        |        ✓        |
| high level validation |    ✓   |                 |
|      argument support |    ✓   |                 |
|        contexual help |        |        ✓        |

## The cp test

As said earlier, docopt's usage syntax makes it possible to describe very complex and flexible syntaxes.

The implementation though isn't up to par.

Take this innocent looking application:

```python
"""cp
Usage:
  cp.py <src>... <dst>
"""
from docopt import docopt

if __name__ == '__main__':
    args = docopt(__doc__, version='cp 42.0')
    print(args)
```

Running this program, no matter what arguments you provide, will fail with no error message: the usage string will simply be printed.

What happens is that `<src>...` will eagerly consume all the provided arguments leaving nothing for `<dst>`.

This problem is not limited to the repetition operator `...`.
Here's another case where docopt fails:

```python
"""x
Usage:
  x.py [<src>] <dst>
"""
from docopt import docopt

if __name__ == '__main__':
    args = docopt(__doc__, version='x 42.0')
    print(args)
```

this will reject a perfectly valid call like `x.py a`.

And that's why command line parsing is anything but trivial.
A correct solution must handle these (and other) tricky cases.

In the following, I'll present how [mow.cli](https://github.com/jawher/mow.cli), a go library for parsing command line arguments written my humble self solves this problem using finite state machines and backtracking.

## Introducing mow.cli

[mow.cli](https://github.com/jawher/mow.cli) takes a hybrid approach between docopt and codegangsta/cli, while also taking inspiration from the `flag` package of the go standard library:

* It resembles codegangsta/cli in that it provides a structured API to describe commands and subcommands to be able to implement contextual help
* It also lets you use the usage syntax of docopt but on a command by command basis to enable high level validation
* Options and arguments get stored in variables like the standard flag package to avoid the type repetition

Here's how naval fate would be implemented in mow.cli:

```go
package main

import (
    "fmt"
    "os"

    "github.com/jawher/mow.cli"
)

func main() {
    app := cli.App("naval_fate", "")
    app.Command("ship", "", func(ship *cli.Cmd) {
        ship.Command("new", "Create new ships", newShips)
        ship.Command("move", "Move a ship by name", moveShip)
    })

    app.Command("mine", "", func(mine *cli.Cmd) {
        mine.Command("set", "Set a mine", setMine)
    })

    app.Run(os.Args)
}

func newShips(cmd *cli.Cmd) {
    cmd.Spec = "NAME..."
    names := cmd.StringsArg("NAME", nil, "")

    cmd.Action = func() {
        fmt.Printf("create ships %#v\n", *names)
    }
}

func moveShip(cmd *cli.Cmd) {
    cmd.Spec = "NAME X Y [--speed]"
    var (
        name  = cmd.StringArg("NAME", "", "")
        x     = cmd.IntArg("X", 0, "")
        y     = cmd.IntArg("Y", 0, "")
        speed = cmd.IntOpt("speed", 10, "Speed in knots")
    )
    cmd.Action = func() {
        fmt.Printf("move ship named %v to %d:%d with speed %d\n", *name, *x, *y, *speed)
    }
}

func setMine(cmd *cli.Cmd) {
    cmd.Spec = "X Y [--moored|--drifting]"
    var (
        x        = cmd.IntArg("X", 0, "")
        y        = cmd.IntArg("Y", 0, "")
        moored   = cmd.BoolOpt("moored", false, "Moored (anchored) mine")
        drifting = cmd.BoolOpt("drifting", false, "Drifting mine")
    )
    cmd.Action = func() {
        s := "moored"
        switch {
        case *moored:
            s = "moored"
        case *drifting:
            s = "drifting"
        }
        fmt.Printf("set a %s mine in %d:%d\n", s, *x, *y)
    }
}
```

It clocks at **64** lines of code, almost half of that of codegangsta/cli (**118**) and one third more than docopt (**45**).

Feature-wise, here's an updated summary table including mow.cli:

|                       | docopt | codegangsta/cli | jawher/mow.cli |
|----------------------:|:------:|:---------------:|:--------------:|
|        naval fate LOC |   45   |       118       |       64       |
|               routing |        |                 |        ✓       |
| high level validation |    ✓   |                 |        ✓       |
|      argument support |    ✓   |                 |        ✓       |
|        contexual help |        |        ✓        |        ✓       |
|    passes the cp test |        |      manual     |        ✓       |
|         Most flexible |    ✓   |                 |                |

Docopt is still the most flexible and poweful of the lot:
like codegangsta/cli, the original `ship move` syntax cannot *(at least easily)* be expressed using mow.cli.

Also, mow.cli's API is, for the lack of a better way to describe it, *weirder* the the other two: you have to use function to configure a command (its spec, options and arguments)[^1]

But it passes the cp test&#8482;


[^1]: This is not arbitrary: since options and arguments have to be stored in variables, defining them in a function helps to scope them to that function instead of polluting the global scope.

### Usage string

mow.cli uses almost the same syntax as docopt for usage strings.
The differences are (in mow.cli):

* You can define a usage string (spec) on a per command basis, there is no global usage description
* Options are described using the mow.cli API and not in the usage string
* A usage string is in a single line
* Argument names are restricted to uppercased words, the bracketed syntax is not supported *(for the time being at least)*

For a complete documentation on mow.cli's usage syntax, please refer to the the [project's readme](https://github.com/jawher/mow.cli#spec) or [godoc](https://godoc.org/github.com/jawher/mow.cli#hdr-Spec).

## FSM and backtracking

Without going into too much detail, mow.cli is able to handle the tricky cases listed above by using a finite state machine with backtracking to parse the call arguments according to a spec string.

What this means is that mow.cli will not simply iterate over the spec string components (options, arguments, commands, choices, sequences, etc.) and naively select the first matching alternative.  
Instead, it will try all the possible routes until one matches or none does.

For example, given the following spec string (cp test&#8482;):


```
SRC... DST
```


Here's a rundown of the parsing process when the program is called with the arguments `["a", "b"]`:

1. The first argument `a` is matched as a `SRC` argument
2. Next, there are 2 possible routes to take for the value `b`: it can either be treated as `SRC` (because it is repeatable) or `DST`
3. Say the first route is taken, and so `b` is consumed as part of the `SRC` argument
4. All values were consumed but there's still the `DST` argument which didn't match anything.  
The previous step will be undone and `b` will be restored
5. mow.cli will then try the second route by consuming `b` as the `DST` argument

And that's how mow.cli manages to handle the tricky cases you throw at it.

I'll go into much more details [in a follow up article](https://jawher.me/2015/01/18/parsing-command-line-arguments-finite-state-machine-backtracking/) on how an FSM is constructed from a spec string and how it is then applied to the call arguments.




