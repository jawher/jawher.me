date: 2015-01-18
slug: parsing-command-line-arguments-finite-state-machine-backtracking
title: Parsing command line arguments using a finite state machine and backtracking
lang: en

In the [previous article](https://jawher.me/2015/01/13/parsing-command-line-arguments-shameless-plug-mowcli/), I've quickly presented [mow.cli](https://github.com/jawher/mow.cli), a command line parsing library I created in Go and compared it against [docopt](http://docopt.org) and [codegangsta/cli](https://github.com/codegangsta/cli).

In this article, I'll talk about the innards of mow.cli and how it uses finite state machines (FSM) and backtracking to handle some tricky usage strings like the cp test&#8482; for example:

```
SRC... DST
```

## Introduction

In mow.cli, you can set a spec string on a CLI application or any of its commands and sub commands.

The spec string defines the call syntax, i.e. the options and arguments it accepts and their order.

The [spec string syntax](https://github.com/jawher/mow.cli#spec) is almost the same as docopt's and POSIX commands.

For example, here's the `cp` command spec (or usage) from its man page:

```
CP(1)                     BSD General Commands Manual                    CP(1)

NAME
     cp -- copy files

SYNOPSIS
     cp [-R [-H | -L | -P]] [-fi | -n] [-apvX] source_file target_file
     cp [-R [-H | -L | -P]] [-fi | -n] [-apvX] source_file ... target_directory
```

In mow.cli, the second usage can be expressed as the following spec string:

```
[-R [-H | -L | -P]] [-fi | -n] [-apvX] SRC... DST
```

Except for some small differences, the syntax reamins mostly the same.

## Parsing a spec string

mow.cli uses a tokenizer followed by a recursive descent parser to parse a spec string.

Here's the **simplified** EBNF grammar of mow.cli's spec strings:

```
spec         -> sequence
sequence     -> choice*
req_sequence -> choice+
choice       -> atom ('|' atom)*
atom         -> (shortOpt | longOpt | group | optional) rep?
shortOp      -> '-' [A-Za-z]
longOpt      -> '--' [A-Za-z][A-Za-z0-9]*
group        -> '(' req_sequence ')'
optional     -> '[' req_sequence ']'
rep          -> '...'
```


A conventional parser transforms the source into an abstract syntax tree which will then be traversed and acted upon.  
For example, a compiler traverses the abstract syntax tree to generate native or byte code.

However, in mow.cli, the process is a bit more *inception* like: the spec string is parsed not into an abstract syntax tree but into a second parser which will be later used to parse the program call arguments:

{% dot mow-parsiong-inception.png
digraph G {
    rankdir=LR
    "Spec string" -> "FSM" [label="Spec Parser"]
    "FSM" -> "Parse context" [label="Call arguments"]
}
%}

An FSM is composed of states and transitions:

* The states are abstract, they do not represent anything in particular, just a position in the command line parsing process.  
Reaching a terminal state means that what was parsed so far is valid according to the spec string
* The transitions are concrete matchers.  
For example, a transition can be triggered when encoutering the an option named `-f` or an argument.

## The big picture

Before delving into how the FSM is contsructed, here's a quick example:  
Given the following spec string (from the `cp` command man page):

```
[-R [-H | -L | -P]] SRC... DST
```

The corresponding FSM is:

{% dot mow-cp-fsm.png
digraph G {
    rankdir=LR
    S1 -> S9 [label="Opt([-R])"]
    S9 -> S31 [label="Opt([-H])"]
    S31 -> S41 [label="ARG(SRC)"]
    S41 -> S47 [label="ARG(DST)"]
    S47 [peripheries=2]
    S41 -> S41 [label="ARG(SRC)"]
    S9 -> S35 [label="Opt([-L])"]
    S35 -> S41 [label="ARG(SRC)"]
    S9 -> S37 [label="Opt([-P])"]
    S37 -> S41 [label="ARG(SRC)"]
    S9 -> S41 [label="ARG(SRC)"]
    S1 -> S17 [label="Opt([-H])"]
    S17 -> S26 [label="Opt([-R])"]
    S26 -> S41 [label="ARG(SRC)"]
    S1 -> S19 [label="Opt([-L])"]
    S19 -> S26 [label="Opt([-R])"]
    S1 -> S21 [label="Opt([-P])"]
    S21 -> S26 [label="Opt([-R])"]
    S1 -> S26 [label="Opt([-R])"]
    S1 -> S41 [label="ARG(SRC)"]
}
%}

This may seem intimidating at first, but it really isn't that hard.

Simply start from the entry point `S1` and follow the transitions until the exit point `S47` is reached.
some possible routes:

* `S1 -> S9 -> S31 -> S41 -> S47`: matches the call `cp -R -H SRC DST`
* `S1 -> S26 -> S41 -> S41 -> S47`: matches the call `cp -R -H SRC SRC DST`
* etc.

In the following, I'll explain how the previous FSM was constructed from the spec string `[-R [-H | -L | -P]] SRC... DST`.

## The spec parser

As [described in another article of mine](https://jawher.me/2013/08/19/creation-langage-programmation-litil-3-2-recursive-descent-parsing/), transforming an EBNF grammar into a recursive descent parser is almost a mechanical task.  
And so, unsurprisingly, for every non-terminal in the spec grammar there is a similarly named method which will parse it.

For example, the spec parser defines a `choice` method for the `choice` production rule:

```go
func (p *uParser) choice() (*state, *state) {
    ...
}
```

A state is a go struct representing a state in the FSM and contains a list of outgoing transitions to other states.  
It also contains a boolean flag to indicate if it is terminal or not.

As can be seen in the method signature above, all the parsing methods return a pair of states representing the entry and exit points of the partial FSM.  
It is possible to only return the entry point of the FSM.
The exit points can then be retrieved by traversing the transitions until reaching the terminal states (there could be multiple exit points).  
However, I decided to always return exactly one entry point and one exit point to make my life easier (as would be seen below).

Here's how mow.cli transforms the different spec string components into FSMs.

### Options

Spec: 

```
-f
```

FSM:

{% dot mow-options-fsm.png
digraph G {
    rankdir=LR
    S1 -> S2 [label="Opt(-f)"]
}
%}

Easy: one state with a single transition with the option to a terminal state.

### Arguments

Spec: 

```
SRC
```

FSM:

{% dot mow-args-fsm.png
digraph G {
    rankdir=LR
    S1 -> S2 [label="Arg(SRC)"]
}
%}

Same as before, the execution starts in the `S1` state.  
The only possible transition is when an argument (anything which doesn't start with a dash) is encountered.

### Optionality

Rendering an FSM component optional is a simple matter of creating a shortcut from its start state to its end state.

For example, starting from a 2 positional arguments FSM:

{% dot mow-optional0-fsm.png
digraph G { 
    rankdir=LR
    S1 -> S2 [label="Arg(SRC)"]
    S2 -> S3 [label="Arg(DST)"]
}
%}

It is a simple matter of creating a shortcut transition from `S1` (start) to `S3` (end):

{% dot mow-optional1-fsm.png
digraph G {
    rankdir=LR
    S1 -> S2 [label="Arg(SRC)"]
    S2 -> S3 [label="Arg(DST)"]
    S1 -> S3 [label="*"]
}
%}

A shortcut transition is marked with the `*` symbol and can always be followed without consuming any call arguments.

This way, starting from `S1`, the FSM can either match an `SRC` and a `DST` arguments, or it can directly jump to the exit point `S3`.

### Repetition

To handle repetition, a shortcut transition `*` is created from the end state back to the start state.

For example, starting from the FSM for the spec string `X Y`:
{% dot mow-repetition0-fsm.png
digraph G {
    rankdir=LR
    S1 -> S2 [label="Arg(X)"]
    S2 -> S3 [label="Arg(Y)"]
}
%}

The FSM for `(X Y)...` becomes:

{% dot mow-repetition1-fsm.png
digraph G {
    rankdir=LR
    S1 -> S2 [label="Arg(X)"]
    S2 -> S3 [label="Arg(Y)"]
    S3 -> S1 [label="*"]
}
%}

This way, after matching a `X` and a `Y` arguments and reaching the exit point `S3`, the FSM can go back to the entry point `S1` to match more arguments.

### Choice

We start from n possible alternatives.
Each alternative is a partial FSM.
The FSM of a choice is then constructed by:

* Create a pair of start and end states `S` and `E`
* Connect `S` to every partial FSM's start state using a shortcut `*` transition
* Connect every partial FSM's end state to the `E` state using a shortcut `*` transition

For example, starting from the FSM for the spec strings `-x` and `-y`:

{% dot mow-choice0-fsm.png
digraph G {
    rankdir=LR
    S1 -> S2 [label="Opt(-x)"]
    S3 -> S4 [label="Opt(-y)"]
}
%}

The FSM for `(X Y)...` becomes:

{% dot mow-choice1-fsm.png
digraph G {
    rankdir=LR
    S1 -> S2 [label="Opt(-x)"]
    S3 -> S4 [label="Opt(-y)"]
    
    S -> S1 [label="*"]
    S -> S3 [label="*"]

    S2 -> E [label="*"]
    S4 -> E [label="*"]
}
%}

Here's an interactive animation to demonstrate the process at work:

> Press the play button to start the animation  
> Press pause to pause it  
> When paused, you can advance or go back by a frame using the advance and back buttons  
> You can scroll and zoom in the animation area  

<div id="fsm-choice" class="fsm-player">
    <svg width=800 height=200><g/></svg>
</div>

As a side note, to create this interactive animation, I used the [dagre-d3](https://github.com/cpettitt/dagre-d3) JS library which implements graphviz-like graph layouting algorithms and uses D3 for the rendering, plus some hand written Javascript code for the interactive part.

### Sequence

The last piece is handling sequences, e.g.:

```
-f SRC DST
```

We start from n consecutive components (`-f`, `SRC` and `DST` in the example above).
As always, every component of the sequence is partial FSM with a start and an end state.  

One to construct the FSM of a sequence is to connect the end state of every partial FSM to the start state of the following FSM.

Here's how that process would look like:

<div id="fsm-sequence-wrong" class="fsm-player">
    <svg width=800 height=300><g/></svg>
</div>

This method, while it works for the example above, introduces an annoying side-effect: options order.

Because it connects the partial FSMs in the order in which they appear in the spec string, the generated FSM will only accept the options in that same order.

For example, given a hypothetical command `cmd` with the following spec string:

```
-f [-g] FILE
```

The resulting FSM, will only accept the following invocations:

* `cmd -f README.md`
* `cmd -fg README.md`

But it will reject `cmd -g -f README.md` for example, which is annoying for the command users.  
It only gets worse when the number of options grows, like in `cp` for example:

```
cp [-R [-H | -L | -P]] [-fi | -n] [-apvX] SRC... DST
```

![One does not simply ask the users to remember the order of 11 options](/images/11-options-command.jpg)

To solve this, mow.cli does not simply *(no pun intended)* connect the partial FSMs in a linear fashion.  
Instead, the following logic is applied:  
Given 2 components FSMs `A` and `B`, each composed of a start and an end state `(A.start, A.end)` and `(B.start, B.end)`:

* if `A` or `B` contains a positional argument, connect them using the process described above as the order of positional arguments is important
* else, i.e. `A` and `B` contain only options (and maybe shortcuts), construct an FSM which accepts both `A` followed by `B` and `B` followed by `A`:
    * Create a copy `A'` of `A` and `B'` of `B`
    * Create 2 new states `S` and `E` which will become the start and end states of the generated FSM
    * Connect `S` to `A.start`, `A.end` to `B.start` and `B.end` to `E` using shortcuts: `S->A->B->E`. This will accept `A` then `B`
    * Connect `S` to `B'.start`, `B'.end` to `A'.start` and `A'.end` to `E` using shortcuts: `S->B'->A'->E`. This will accept `B` then `A`

And since it took me a couple of hours to create this FSM animation thingy, here's another interactive animation which demonstrates the process described above in action:

<div id="fsm-sequence-ab" class="fsm-player">
    <svg width=800 height=320><g/></svg>
</div>

The process described above works on 2 components.  
Generalizing it to work on more is trivial:  apply it to the first 2 components `A` and `B` which results in `A+B`, and then apply the same process on `A+B` and the third component `C`, etc.

Here's a more complex example involving 3 options, a choice and an argument:

```
-a [-b | -c] FILE
```

<div id="fsm-sequence-abcarg" class="fsm-player" data-zoom="0.7">
    <svg width=800 height=600><g/></svg>
</div>

The final FSM may seem daunting, but it can get even more scarier with more complex spec strings.

However, the generation logic, as explained above, is composed of very simple generation rules which can be then be composed to produce such monstrosities.  
And the complexity of the generated FSM is there for a reason: except for a rules engine[^1], I don't think that there is another way to correctly validate a program call arguments according to a spec string (be sure to check [the previous article](https://jawher.me/2015/01/13/parsing-command-line-arguments-shameless-plug-mowcli/) for some cases where docopt either fails to accept valid cases or to reject invalid ones).

[^1]: I'm sure somebody in the internet will prove me wrong on this point: I'd love you to !

## The call arguments parser

Once a spec string is transformed into a FSM, the latter can be used to parse the program call arguments using the following algorithm:

The inputs are the current state and the call arguments.  
Initially, the current state is the FSM start state and the call arguments are the list of arguments passed by the user to the program:

1. If the call arguments list is empty and the current state is terminal, the parsing succeeds, else if fails
2. Else, i.e. the call arguments list is not empty: List all the possible transitions from the current state:
    * if a transition is a shortcut, it is always possible to follow
    * if a transition is an option `-x`, it can only be followed if the first call argument is an option with the same name
    * if a transition is an argument, it can only be followed if the first argument is a string not starting with a dash `-` (i.e. not an option)
2. For every possible transition:
    * consume the matching call arguments:
        * if the transition is a shortcut, nothing is consumed
        * if the transition is an option, consume the first one or two arguments depending on the call syntax and the option type: consume one argument for boolean options or in case of a `=` (e.g. `-s=42`), and two arguments otherwise (e.g. `-s 42`)
        * if the transition is an argument, consume exactly one call argument
    * set the current state to the target state of the transition
    * go back to step **1.**
    * if following this transition (the call return `true`), also return `true`
3. If there are no possible transitions, or all of them failed, fail too

Here's the same algorithm in Go (simplified for readability)

```go
func parse(currentState state, args []string) bool {
    if len(args)==0 {
        // no more call args and current is terminal, succeed
        return state.terminal
    }
    for _, transition := range currentState.transitions {
        /* transition.matches returns a boolean to indicate 
         * if it matched or not and the number of consumed
         * arguments (0, 1 or 2)
         */
        if ok, consumed := transition.matches(args); ok {
            /* recursively call parse again with the transition
             * target as the current state and with the call
             * args minus what the transition consumed
             */
            if parse(transition.next, args[consumed:]) {
                // this transition succeeded, succeed too !
                return true
            }
        }
    }
    // none of the transitions matched, fail
    return false
}
```

Now for an example:

### Successful parse
Spec string:

```
[-f|-g] FILE
```

FSM:

{% dot mow-parse-example-success-fsm.png
digraph G {
    rankdir=LR
    S -> F1 [label="*"]
    S -> G1 [label="*"]
    
    F1 -> F2 [label="-f"]
    G1 -> G2 [label="-g"]

    F2 -> A [label="*"]
    G2 -> A [label="*"]

    A -> E [label="Arg(FILE)"]

    E [peripheries=2]
}
%}

Execution with the argument list `-f X`:

| State       | Args               | Comment                                                                   |
| :---------: | ------------------ | ------------------------------------------------------------------------- |
| S           | `-f` `X`           | args is not empty, so check all the possible transitions                  |
|             |                    | there are two possible transitions to `F1` and `G1`                       |
|             |                    | try the first one leading to `F1`                                         |
| F1          | `-f` `X`           | args is not empty, so check all the possible transitions                  |
|             |                    | there is one possible transition to `F2` and it consumes one argument     |
| F2          | `X`                | there is one possible transition to `A` and it doesn't consume anything   |
| A           | `X`                | there is one possible transition to `E` and it consumes one argument      |
| E           | ``                 | args is empty and current state is terminal, success !                    |

### Failed parse

Same spec string but with the argument list `-f -g X`:

| State     | Args                  | Comment                                                                   |
| :-------: | --------------------- | ------------------------------------------------------------------------- |
| S         | `-f` `-g` `X`         | args is not empty, so check all the possible transitions                  |
|           |                       | there are two possible transitions to `F1` and `G1`                       |
|           |                       | try the first one leading to `F1`                                         |
| F1        | `-f` `-g` `X`         | args is not empty, so check all the possible transitions                  |
|           |                       | there is one possible transition to `F2` and it consumes one argument     |
| F2        | `-g` `X`              | there is one possible transition to `A` and it doesn't consume anything   |
| A         | `-g` `X`              | there are no possible transitions, fail                                   |
| F2        | `-g` `X`              | no more transitions to try, fail                                          |
| F1        | `-g` `X`              | no more transitions to try, fail                                          |
| S         | `-f` `-g` `X`         | try the second transition to `G1`                                         |
| G1        | `-f` `-g` `X`         | there are no possible transitions, fail                                   |
| S         | `-f` `-g` `X`         | no more transitions to try, fail                                          |
|           |                       |                                                                           |


## Simplification

We're not done yet.  
The FSMs generated using the rules described above, while semantically correct, can cause infinite loops due to the shortcut transitions `*`.

For example, given this spec string:

```
[-e]...
```

i.e. a repeatable options string, like the `-e` flag in the `docker run` command for example.

mow.cli would generate the following FSM for such a spec:

{% dot mow-infinite-loop-fsm.png
digraph G {
    rankdir=LR
    A -> B [label="*"]
    A -> B [label="Opt(-e)"]
    B -> A [label="*"]
    B [peripheries=2]
}
%}

The `-e` option gets a start and an end states `A` and `B` with the option name as a transition.  
Because it is optional, a shortcut is added from `A` to `B`.  
Finally, because it is repeatable, another shortcut from `B` to `A` is also added.

In some situations, the algorithm described above will run forever (or until the call stack explodes) bouncing back and forth taking the shortcut transitions between `A` and `B`.

The shortcuts are very handy during the spec parsing phase to easily construct semantically correct FSM, so we'd rather keep them during that phase.  

The solution is to let the spec parsing phase generate shortcuts but to then apply a transformation on the FSM to get rid of them.

Here's how this is done in mow.cli:

For every state `S`:

1. Bail out if `S` was already visited
2. For every transition, recursively apply the algorithm on the next state
3. While `S` has a shortcut transition `tr` leading to a state `T`:
    * Add all of `T`'s transitions to `S` (without adding duplicates)
    * If `T` is terminal, mark `S` as also terminal
    * remove the transition `tr` from `S`'s transitions

And here's how this algorithm would behave when applied to the FSM of the spec string `[-e]...` (which causes an infinite loop as shown above):

| St        | Step       | Remark                                                                                         | FSM                                                                         |
| :-------: | ---------: | ---------------------------------------------------------------------------------------------- | ----------------------------------------------                              |
| A         | 1          | Initial state                                                                                  | <div class="wide"><img src="/images/graphviz/mow-simplify-0-fsm.png"></div> |
|           | 2          | `A` has a transition `t1` to `B`, simplify `B`                                                 |                                                                             |
| B         | 1          | `B` has not already been visited                                                               |                                                                             |
|           | 2          | `B` has a transition `t3` to `A`, but `A` was already visited, NOP                             |                                                                             |
|           | 3          | `B` has one shortcut `t3` to `A`                                                               |                                                                             |
|           | 3.1        | add all of `A`'s transitions (`t1` and `t2`) to `B`                                            |                                                                             |
|           | 3.2        | `A` is not terminal, NOP                                                                       |                                                                             |
|           | 3.3        | remove `t3`                                                                                    | <div class="wide"><img src="/images/graphviz/mow-simplify-1-fsm.png"></div> |
|           | 3          | `B` has one shortcut `t1'` to `B`                                                              |                                                                             |
|           | 3.1        | Nothing to add as `B` already has all of the target transitions                                |                                                                             |
|           | 3.2        | `B` is already terminal                                                                        |                                                                             |
|           | 3.3        | remove `t1'`                                                                                   | <div class="wide"><img src="/images/graphviz/mow-simplify-2-fsm.png"></div> |
|           | 3.         | `B` has no more shortcuts                                                                      |                                                                             |
| A         | 3.         | `A` has one shortcut `t1` to `B`                                                               |                                                                             |
|           | 3.1        | add all of `B`'s transitions to `A`                                                            |                                                                             |
|           | 3.2        | `B` is terminal, mark `A` as also terminal                                                     |                                                                             |
|           | 3.3        | remove `t1`                                                                                    | <div class="wide"><img src="/images/graphviz/mow-simplify-3-fsm.png"></div> |
|           | 3          | `A` has no more shortcuts                                                                      |                                                                             |

We went from:

![](/images/graphviz/mow-simplify-0-fsm.png)

to:

![](/images/graphviz/mow-simplify-3-fsm.png)

Both will accept and reject exactly the same set of call args, but the second form doesn't contain any shortcuts and so is more suitable for parsing as it can't cause infinite loops.



{% dot !mow-simplify-0-fsm.png
digraph G {
    rankdir=LR
    A -> B [label="t1: *"]
    A -> B [label="t2: Opt(-e)"]
    B -> A [label="t3: *"]

    B [peripheries=2]
}
%}

{% dot !mow-simplify-1-fsm.png
digraph G {
    rankdir=LR
    A -> B [label="t1: *"]
    A -> B [label="t2: Opt(-e)"]
    B -> B [label="t2': Opt(-e)"]
    B:s -> B [label="t1': *"]
    

    B [peripheries=2]
}
%}

{% dot !mow-simplify-2-fsm.png
digraph G {
    rankdir=LR
    A -> B [label="t1: *"]
    A -> B [label="t2: Opt(-e)"]
    B -> B [label="t2': Opt(-e)"]

    B [peripheries=2]
}
%}

{% dot !mow-simplify-3-fsm.png
digraph G {
    rankdir=LR
    A -> B [label="t2: Opt(-e)"]
    B -> B [label="t2': Opt(-e)"]

    A [peripheries=2]
    B [peripheries=2]
}
%}

## Backtracking

The backtracking is already implemented in the algorithm above because all the possible transitions will be tried and not only the first that matches.

Here's how that would work for the cp test&#8482;, i.e. with the following spec `SRC... DST` and FSM:

{% dot mow-backtracking-0-fsm.png
digraph G {
    rankdir=LR
    S1 -> S2 [label="ARG(SRC)"]
    S2 -> S3 [label="ARG(DST)"]
    S3 [peripheries=2]
    S2 -> S2 [label="ARG(SRC)"]
}
%}


| State     | Args                  | Comment                                                                   |
| :-------: | --------------------- | ------------------------------------------------------------------------- |
| S1        | `A` `B`               | args is not empty, so check all the possible transitions                  |
|           |                       | there is one possible transition to `S2` and it consumes one argument     |
| S2        | `B`                   | args is not empty, so check all the possible transitions                  |
|           |                       | there are 2 possible transitions to `S2` and to `S3`                      |
|           |                       | try the first one which loops back to `S2`                                |
| S2        | ``                    | args is empty but `S2` is not terminal, fail                              |
| S2        | `B`                   | try the second transition leading to `S3`                                 |
| S3        | ``                    | args is empty and `S3` is terminal, success                               |

This simple algorithm scales to arbitrarily complex cases.

## Fin

To summarize:

* mow.cli uses a recursive descent parser to transform a spec string into an FSM
* the FSM is then simplified to get rid of the shortcuts because they may lead to infinite loops
* the resulting FSM is then used to validate the program call arguments using a backtracking algorithm

This only covers the high-level concepts and does not cover everything mow.cli does, like collecting, converting and storing the various options and arguments values for the user to retrieve them later.

<link rel="stylesheet" type="text/css" href="/extra/mow-fsm/styles.css">
<script src="/extra/jquery-2.1.3.min.js" charset="utf-8"></script>
<script src="/extra/d3.v3.min.js" charset="utf-8"></script>
<script src="/extra/dagre.min.js"></script>
<script src="/extra/dagre-d3.min.js"></script>
<script src="/extra/mow-fsm/app.js"></script>
