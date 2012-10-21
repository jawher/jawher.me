date: 2012-10-21
slug: creation-langage-programmation-litil-2-lexer
title: The Litil chronicle - Chapter 2, The text chopper, aka Lexer
lang: en

In this second post of the the Litil chronicle, I'm going to talk about lexing.
Lexing is generally the first step in a compiler's pipeline.
What it does is transform the source code from its textual representation to a token sequence that'll be consumed by the next stage, i.e. the parser.

How the text is broken down into tokens varies from one language to another.
Usually though, at least with conventional languages (in the Algol family), we could define the following token groups:

* symbols: operators (`+`, `-`, `*`, `/`, etc.), punctuation signs (`,`, `;`, `(`, `[`, etc.)
* literals: numerals (`42`, `3.14`, etc.), strings (`"kthxbye"`), booleans (`true`, `false`)
* keywords: `if`, `while`, etc.
* identifiers: language specific, but generally they start with a letter or an underscore (`_`) and optionally a sequence of letters, digits and some other symbols

A token is comprised of a **type** (whether it is a symbol, a keyword or a literal, etc.) and a **value** (its textual value).
A token could also be extended to include contextual data, like the row and column where it appears in the source text.
This could be useful to indicate where in the source an error occurred.

The lexer could also hide parts of the input deemed useless to the following stage, like whitespace and comments for example.

## Whitespace handling

Unlike most other languages, we won't be discarding whitespaces in Litil.
Indeed, and like Python or Haskell for example, whitespace is used in Litil to mark bloc boundaries.
A bloc is started by increasing the indentation level and ended by decreasing it.

Example:

```litil
if n > 0 then
  let x = 10 / n
  print "Ohai"
else
  throw Error
```

The Java equivalent would be:

```java
if (n > 0) {
  int x = 10 / n;
  System.out.print("Ohai");
} else {
  throw new Exception();
}
```

In the previous code snippet the `then` and `else` branches are indented.
This indentation is optional though, and is merely a code convention.
The java lexer and parser couldn't care less if it is there or not.
The bloc boundaries are marked with the opening and closing braces.
So the following code snippet is strictly equivalent:

```java
if (n > 0) {
int x = 10 / n;
System.out.print("Ohai");  
} else {
throw new Exception();
}
```

or even:

```java
if (n > 0) {int x = 10 / n;System.out.print("Ohai");} else {throw new Exception();}
```

This hurts the code readability, but doesn't change anything from the compiler's perspective.
This won't be the case with Litil.
As said earlier, indentation level controls the blocs boundaries.

Also, whereas in Java the `;` is used to separate the statements in the same bloc, Litil uses the line breaks instead.
So `;` are not just optional in Litil (like in Javascript for example).
They aren't even recognised as a valid symbol.
The rationale behind this choice was to create a clean and clutter-free syntax.
We'll cover the syntax in more detail in upcoming posts, but here's a quick primer on the syntax:

* No braces to mark blocs
* No `;` to separate instructions
* No parentheses around function arguments: `sin 5`
* No parentheses around `if` conditions.
* etc.

In a nutshell, the lexer we'll be developing won't completely ignore whitespace.
It should rather produce tokens for line breaks (to indicate the end of an instruction) and for line indentations (to indicate an increase or a decrease in indentation level).

## Implementation

We'll start with the `Token` definition:

```java
public class Token {
    public enum Type {
        NEWLINE, INDENT, DEINDENT, NAME, NUM, STRING, CHAR, SYM, BOOL, KEYWORD, EOF
    }
    public final Type type;
    public final String text;
    public final int row, col;

    public Token(Type type, String text, int row, int col) {
        this.type = type;
        this.text = text;
        this.row = row;
        this.col = col;
    }
}
```

A token is defined by:

* `type`:
	* `NEWLINE`: to indicate a line breaks
	* `INDENT`: to indicate that the indentation level increased relative to the previous line, and thus marks the start of a new bloc
	* `DEINDENT`: to indicate that the indentation level decreased relative to the previous line, and thus marks the bloc end
	* `NAME`: used for identifiers
	* `NUM`, `STRING`, `CHAR`, `BOOL`: used for literals
	* `KEYWORD`: used for keywords
	* `EOF`: produced when the end of the source text is reached
* `text`: a string containing the token's textual value
* `row` et `col`: the token's position in the source file

Here's now the lexer's interface:

```java
public interface Lexer {
    Token pop() throws LexingException;

    String getCurrentLine();
}
```

This interface defines 2 methods:

* `pop`: returns the next token
* `getCurrentLine`: returns the current line in the source file

Notice that there's no method that indicates if there are still more tokens in the source file.
Rather, when the lexer reaches the end of the source file, it generates an `EOF` token.
So I deemed it unnecessary to add another method, à la iterator's `hasNext` to keep the interface minimal.

One other thing: I'm no fan of defining interfaces just for the sake of it.
The lexer was defined as an interface because there'll be more than one implementation, as we'll see further below.

### How it works™ 

What follows is a quick overview of how the base implementation of the lexer works ([The source of `BaseLexer.java` (on Github) for those who'd like to check it out](https://github.com/jawher/litil/blob/master/src/main/java/litil/lexer/BaseLexer.java)):

* The lexer's constructor takes a `java.io.Reader` argument that points to the source text
* The lexer defines a `currentLine` field to hold the line being lexed, plus 2 more fields `row` and `col` to hold the position
* When `pop` is called, we check the value of `currentLine`. If none is set, we try to read a whole line from the reader. If the latter returns `null`, then we've reached the end of the source text. The lexer switches to a mode where it'll always return an `EOF` token
* Else, and after handling the line indentation (we'll come back to this part later), we examine the first non-blank character
* If it is a letter, we consume the next characters as long as they are letters or digits. the consumed characters are appended to a string
	* if this string equals `true` or `false`, we return a `BOOL` token
	* if not, we check if the string is in the list of the keywords and return a `KEYWORD` token if that's the case
	* else, it must be an identifier. We return a `NAME` token.
* If the first character is a digit, we consume the following digits and return a `NUM` token
* If it's rather a `"` or `'`, we try to read a string or a char, and return a `STRING` or `CHAR` token. The implementation logic is rather simple. What complicates the matter is the handling of escapes (like `\"` or `\n` for example)
* If none of the above applies, we try to read a symbol among the list of the known symbols. I'll get back to this part further down in this article, but the trick here is to use an automaton to try and match the longest symbol sequence (one single `->` instead of `-` and `>`)
* Finally, and if we've reached the end of the line, we reset the `currentLine`. This way, the next call `pop` would move to the next line. Else, we throw an exception is we're faced with unrecognised input


### whitespace handling

After reading a new line, and before executing the algorithm presented above, the lexer computes the line indentation level (the number of blanks in the beginning of the line). The lexer then compares this value to the previous line's indentation level (which is stored in a field initialised with 0):

* If the 2 values are equal, the lexer returns a `NEWLINE` token
* If the current line's indentation level is greater than the previous', first an `INDENT` token is returned then a `NEWLINE`
* Else, i.e. if the indentation level decreased, a `DEINDENT` token is returned first, then a `NEWLINE`

In a previous version of the lexer, I used to return only `INDENT` when the indentation level increases, `DEINDENT` is it decreases, and `NEWLINE` otherwise. this caused me no end of troubles in the next stage (the parser) to correctly handle blocs.
Afterwards, I've stumbled upon [this answer in Stackoverflow](http://stackoverflow.com/questions/232682/how-would-you-go-about-implementing-off-side-rule/946398#946398) which suggests the 2 tokens trick (`INDENT` + `NEWLINE`).
This trick made the parsing part much easier and more solid.
I'll explain the why in more details in the upcoming posts.

Here's a concrete example to clarify things. 
Given this input:

```java
a
  b
  c
d
```

The lexer is supposed to generate the following tokens:

1. `NEWLINE`
2. `NAME(a)`
3. `INDENT`: The 2nd line's indentation level increased
4. `NEWLINE`: always produced after line breaks
5. `NAME(b)`
6. `NEWLINE`: the indentation level didn't change between the 2nd and 3rd lines
7. `NAME(c)`
8. `DEINDENT`: the indentation level decreased in the 4th line
9. `NEWLINE`
10. `NAME(d)`
11. `EOF`: well, the end …

There's a catch with the algorithm described above: consider what happens with this input:

```java
a
  b
```

The lexer won't generate a `DEINDENT` token after producing `NAME(b)`, but rather an `EOF`because there's no new line after `b`.
We could try to work around this in the parser by using `EOF` besides `DEINDENT` to mark the end of bloc.
Besides complicating the parser logic, there are some more corner cases.
Given this input:

```java
a
  b
    c
d
```

One single `DEINDENT` token would be generated after `NAME©`, instead of the 2 we really need to correctly detect the end of the bloc started by `c` but also the one started by `b`.

To handle these corner cases, and to keep the base lexer implementation simple, I've created `StructuredLexer` ([source code in Github](https://github.com/jawher/litil/blob/master/src/main/java/litil/lexer/StructuredLexer.java)), a second `Lexer` implementation (See now why there is `Lexer` interface ?).

This implementation uses the decorator pattern *(I'm a professional Java developer, I know my design patterns)*.
It delegates to `BaseLexer` to produce tokens from the source text, while at the same time extending it to do the following:

* It maintains the current indentation level in a field. This level is computed by dividing the number of blanks in the beginning of a line by an indentation unit. This unit was arbitrarily fixed to be **2 spaces**
* In `pop`, when the base lexer returns `INDENT`:
	* Ensure that the number of spaces in that `INDENT` token is a multiple of the unit (2). Throw an exception if that's not the case
	* Also ensure that the indentation level can only increase by a step of **1**
	* Update the field holding the current indentation level
* Still in `pop`, if the base lexer returns `DEINDENT`:
	* As with `INDENT`, ensure that the number of spaces is multiple of the unit. If all is well, compute the indentation level
	* If this level decreased by **more than 1** (like in the previous example), produce as many virtual `DEINDENT` tokens as necessary
	* Update the current indentation level
* Finally, if the base lexer returns an `EOF`, and as with `DEINDENT`, produce as many virtual `DEINDENT` tokens as necessary, until the indentation level reaches **0**, before returning an `EOF`

Thus, with that same problematic example:

```java
a
  b
    c
d
```

The structured lexer would produce an extra `DEINDENT` token (besides the one produced by the base lexer) between `c` and `d`. The next stage (i.e. the parser) would correctly detect that 2 blocs end after `c` and that `d` has the same indentation level as `a`.


### Comments handling

Litil's syntax supports Haskell-like one line comments prefixed by `--`.
I've chosen to handle them in the lexer stage by swallowing them, i.e. not producing any tokens for them.
But I could have chosen to produce `COMMENT` tokens and ignore them *(or not)* in the parser stage.

Comments are handled in 2 locations in the lexer:

* When a line is read from the source text. If it starts with `--`, the whole line is discarded
* If the symbol matching logic matches a `--`, it and the line remainder are discarded

Examples:

```litil
-- compute max x y … NOT !
let max x y = x
```

```litil
let max x y = x -- It is a well known fact that x always wins ! 
```

### Symbols handling

Except maybe for the indentation handling, this is, *imho*, the most interesting part of the lexer.

Before proceeding, I'll introduce [finite automata](http://fr.wikipedia.org/wiki/Automate_fini), a most important topic in compilation and languages theory.

Here's a metaphor that I use to explain finite automata:
> 
> You wake up to find yourself in an empty room with many closed doors.
> You're holding a strange device in your hand.
> It resembles a credit card, except that it has a display on it with showing the word `The cake`.
> 
> You check the first door, and you notice that it is marked with the word `The reaper`.
> Also, there is a slot to its right, and it looks like the card you hold would fit in there.
> 
> You're smart enough to shy away from a door marked with `The reaper`, so you go check on the second door.
> 
> This one is also marked with a word, though it is `An Angel` this time, and it also has a slot to its right.
> 
> You must have guessed it by now, but you try it anyway, and insert the card in the slot.
> A red led blinks, it buzzes, and it ejects your card.
> 
> So you go to the next door, which is marked with `The cake`, the same as what the display in your card shows.
> You like cakes.
> Everybody does.
> So you insert it in the slot: a green led blinks and the door opens.
> You go through it, and it closes behind you.
> 
> You turn around and notice that there is no slot, no word, nothing.
> You can't go back through that door.
> 
> You also notice that the word shown on your card changed.
> It now shows `is`.
> 
> By now, you've understood the rules of the game: you can only go through a door if is marked with the word you have on your card.
> Once you go through a door, you can't go back.
> If the word on your card doesn't match any of the room's doors, you're dead meat.
> You'll be stuck there till you die of thirst, hunger or boredom.
> 
> So you look around for a door marked with `is`, and luckily for you, there is one to the left, so you go through it.
> 
> The word on your card changes to `a lie`, and it must be your lucky day, the fifth door has that same word.
> 
> After going through that door, something strange happens.
> You card display starts flickering before going out.
> Game over, no more words for you sir, and so no more doors: you're stuck.
> 
> But it could be worse, you could have ended up in a room with no doors, if that's a consolation to you.
> 
> But what you don't know is that some lucky souls could end up in special rooms.
> These special rooms have huge refrigerators full of pizza and beers, an XBox, F1 2012, Skyrim, a computer with a working internet connection, and everything you could wish for.
> You won sir. Achievement unlocked.



Now, back to finite automata. A finite automaton is a set of states and transitions.
States are the rooms, and transitions are the doors.
given a sequence of inputs (the words on your card), it consumes them one at a time while following the adequate transition (and hence moving from one state to another) until there are no more inputs (you card display flickers and dies), or it reaches a state with no possible transitions (room without doors), or it reaches a final state (special room, pizza and beers).

Here's what an automaton looks like:

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

This automaton is composed of:

* An initial state `S0` (the first room you wake up in). That's the unique entry point.
* 3 other states (rooms): `A`, `B` and `C`.
  Notice the double edges around them.
  This indicates that they are final states (pizza, beers)
* Transitions (doors) between these states marked with symbols (words on the doors)

Let's apply this automaton to the input `->a`.

We start from the entry point `S0` and with the first symbol `-`.
We try to find a transition annotated with that symbol.
We're in luck: the transition from `S0` to `A` is just what the doctor ordered.
We consume the first symbol `-`, which leaves us with `>` as the current symbol, and we follow that transition to reach `A`.

`A` is a terminal state, so we could just interrupt the operation and say that we successfully matched `-` *(since it led us to pizza and beers, or more formally to a final state)*.
But in Litil, and in most other languages, we try to match the longest possible sequence.
Otherwise, it wouldn't be possible to have `<` and `<=` for example.

So we don't give up just yet. `A` has a transition annotated with `>`.
Following this transition leads us to `C`.
The latter is also final, by by the same token, we continue trying to match a longer sequence.
Except that there is no transition out of `C` annotated with the next character `a`.
So we stop the flow at `C` and say that we matched the string `->`.

The algorithm described above, which is the one currently used by Litil, is rather simplistic and is far from the state of the art.
For one thing, it doesn't support backtracking:
in its quest to match the longest sequence, it might get stuck in between states.

Here's an example:
Given this automaton, which is supposed to recognise the sequences `-` and `-->`, and with the input `--a`, we end up with a no match, whereas it was supposed to recognise 2 times `-` (the why is left as an exercise to the reader):

{% dot litil-lexer-dfa1.png
digraph G {
	rankdir=LR
	S0 -> A [label="-"]
	A -> B [label="-"]
	B -> C [label=">"]

	A [peripheries=2]
	C [peripheries=2]
}
%}

In its current version, the operators or symbols recognised by Litil are: `->`, `.`, `+`, `-`, `*`, `/`, `(`, `)`, `=`, `%`, `<`, `>`, `<=`, `>=`, `:`, `,`, `[`, `]`, `|`, `_`, `=>`, `\\`, `--`, `::`, `{` and `}`.

Now, just for the fun of it *(I like big graphs, they make this blog post look formal and everything)*, here's the automaton that recognises them:

{% dot litil-lexer-dfa-litil.png
digraph G {
	rankdir=LR
	splines=polyline
	S0 -> A1 [label="- (tiret)"]
	A1 -> A2 [label="- (tiret)"]
	A1 -> A3 [label=">"]
	S0 -> B1 [label="="]
	B1 -> B2 [label=">"]
	S0 -> C [label=". (point)"]
	S0 -> D [label="+"]
	S0 -> E [label="*"]
	S0 -> F [label="/ (slash)"]
	S0 -> G [label="("]
	S0 -> H [label=")"]
	S0 -> I [label="["]
	S0 -> J [label="]"]
	S0 -> K [label="{"]
	S0 -> L [label="}"]
	S0 -> M [label="%"]
	S0 -> N1 [label="<"]
	N1 -> N2 [label="="]
	S0 -> O1 [label=">"]
	O1 -> O2 [label="="]
	S0 -> P1 [label=":"]
	P1 -> P2 [label=":"]
	S0 -> Q [label=","]
	S0 -> R [label="| (pipe)"]
	S0 -> S [label="_ (underscore)"]
	S0 -> T [label="\\ (anti-slash)"]
	

	A1 [peripheries=2]
	A2 [peripheries=2]
	A3 [peripheries=2]
	B1 [peripheries=2]
	B2 [peripheries=2]
	C [peripheries=2]
	D [peripheries=2]
	E [peripheries=2]
	F [peripheries=2]
	G [peripheries=2]
	H [peripheries=2]
	I [peripheries=2]
	J [peripheries=2]
	K [peripheries=2]
	L [peripheries=2]
	M [peripheries=2]
	N1 [peripheries=2]
	N2 [peripheries=2]
	O1 [peripheries=2]
	O2 [peripheries=2]
	P1 [peripheries=2]
	P2 [peripheries=2]
	Q [peripheries=2]
	R [peripheries=2]
	S [peripheries=2]
	T [peripheries=2]
}
%}

Now, back to how Litil handles symbols.
I use automata that's how.
In Litil, the symbols automaton is built at runtime from a list of symbols.
Also, Litil's automaton implementation doesn't handle backtracking: remember being too eager and the getting stuck in between states we've seen above ?.
Which is fine, as that problem doesn't occur unless our language has 3-letters long operators.
Litil is no Scala, so we won't be running into that problem.

On the other side, the automaton based operators recognition implementation is barely 50 lines long.
We're talking about Java here, so putting aside all the clutter *(imports, constructor, getters, toString, etc.)*, the essence of the algorithm is barely 12 lines long.
I'm quite proud of it actually.
Here's the [source code](https://github.com/jawher/litil/blob/master/src/main/java/litil/lexer/LexerStage.java) if you're interested.


### Lookahead

Another useful feature to have in a lexer is the ability to look ahead,
i.e. being able to peek into the upcoming tokens without actually consuming them (which would have been the case with `pop`).
I'll get back to the why in the parser post.

As with `StructuredLexer`, I've implemented this feature in [`LookaheadLexerWrapper`](https://github.com/jawher/litil/blob/master/src/main/java/litil/lexer/LookaheadLexerWrapper.java) as a decorator.

The logic behind is rather simple:
This class adds a new method, `lookahead` which takes a number as a parameter that indicate how far ahead we'd like to peek (e.g. 1 for the next token)
When this method is called, it calls `pop` on it's delegate lexer as many times as necessary and stores the returned tokens in a list.
When `pop` is called, and before delegating to the concrete lexer, this class checks if the list of tokens is empty or not.
If it isn't, it returns the first token of the list and removes it.
This way, the next call to `pop` would return the next token.
When this list is empty, it delegates to the concrete lexer.

## Conclusion

In this post, I showcased some of the techniques I used to implement the lexing part of Litil.
They might not be the proper way of doing it, nor the fastest.
They're rather easy to code and to extend, and hava a rather reasonable memory footprint:
we're not reading the whole file in a string as many of the examples you find in the internets do.

This part is also the least *fun* to code.
I was tempted to use a tool (like SableCC) to generate its code.
But I decided that I'll stay true to my original goal of hand rolling everything *(except for the parts that I won't)*

Now that this part is over, the real fun is ahead of us: the parser and the evaluator.