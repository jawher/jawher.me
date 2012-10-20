date: 2012-10-20
slug: creation-langage-programmation-litil-1
title: The Litil chronicle - Chapter 1, The inception of a programming language
lang: en

I've always been fascinated by compilers and programming languages.
I was fascinated by the fact that I could take control of the computer to make it do what I want.
But I was even more impressed with the compilers themselves.
The fact that they could *understand* and execute what I've fed them was comparable to magic to me at that time.

I still remember the first time I tried to write a parser.
I was still in school back then.
I didn't even know that they were named parsers.
I've just started learning Pascal on my commodore.
But I absolutely wanted to write *something* that could evaluate arithmetic expressions input as a string.
I didn't have any theoretical background on the subject.
Hell, I didn't even have an internet connection.
I don't remember if it had worked out or not.
But I still remember some of the hacks I've come up with, like the one to handle prioritising parenthesised expressions.
The solution I came up with was to look for the first closing parenthesis. Then go back to find the first opening parenthesis.
This way I could isolate the part to evaluate first.
Then repeat the same process till there were no more parentheses.

I've learned a lot since then.
I've taken 2 courses on the subject in the college.
I've also read lots of articles and research papers, and keep visiting sites like [LtU](http://lambda-the-ultimate.org/).
I was lucky enough to put modest *modest* knowledge into practice at work, where I had to write DSL parsers in 2 separate projects.

Recently, I've decided that like everybody else seems to be doing, I'd create my own programming language, aka JavaSlayer™.
To make the task more challenging, I chose not to use a parser generator (à la ANTLR) like I usually would, but rather hand roll everything.
Like in the old days, without using any frameworks nor libraries.
My goal was to learn for myself how compilers internals work.
I've also been influenced by [Niklaus Wirth](http://en.wikipedia.org/wiki/Niklaus_Wirth) (the man behind Pascal, Modula and Oberon languages), who has hand written all of his compilers.

And like that, after 2 or 3 months of occasional work, I ended up with a working parser and evaluator of a half-decent language.
Say hello to `Litil` !

Since I'm not in the mood for blogging about "How to create a `<web framework #1>` app with `<orm #2>` and `<js framework #3>` using `<an IDE>` to handle `<hip subject of the day>` and host it on `<PaaS|SaaS|IaaS of the day>`", I'm going instead to start a series of posts covering a more exotic and interesting subject: parsing.

You need to be aware though that there are lots of tools to **easily** generate a working parser, like SableCC, ANTLR, JavaCC, lex/yacc, flex/bison, etc.
I've already used most of these, and that's not my goal here.
As I said earlier, I wanted to understand how things really worked.


# Litil

This is the first post of a series where I'll talk about the different techniques I've used to create a parser and un evaluator for the Litil™  programming language in Java.
However, please keep the following in mind:

* This is still *work in progress*, but I'm honouring the "release early, release often" mantra. I'm also still learning a lot while I'm working on it.
  So inevitably, I might say dumb or plain wrong things.
* I no Matt Might™.
  I've had some courses about this subject, and I've read a couple research papers, but that doesn't make me an expert on the subject.
* I've started working on compiling to byte code.
  I might talk about it in a future post, but it's still too early, so I'm not promising anything.

Here's a quick overview of the Litil language


* A functional language heavily inspired by ML, (O)Caml, Haskell and [Roy](http://roy.brianmckenna.org/)
* Full [Hindley Milner](http://en.wikipedia.org/wiki/Hindley-Milner_type_inference) type inference
* [Python like use of indentation to define blocs](http://en.wikipedia.org/wiki/Off-side_rule)
* Supported types: numerics, strings, characters and boolean, [tuples](http://en.wikipedia.org/wiki/Tuple), [records](http://en.wikipedia.org/wiki/Record_\(computer_science\)) and [ADTs](http://en.wikipedia.org/wiki/Algebraic_data_type)
* [pattern matching](http://en.wikipedia.org/wiki/Pattern_matching)
* [curried functions](http://en.wikipedia.org/wiki/Currying) by default
* [closures](http://en.wikipedia.org/wiki/Closure_\(computer_science\))
* exceptions (try/catch/throw)

Now, some teaser examples to give you a feel for the language we'll be creating.

## assignment, expressions & functions

```litil
let fact n =
  if n <= 2 then
    2
  else
    n * fact (n-1)

let f5 = fact 5
```


## tuples & records

```litil
let x = (5, "a")
let person = {name: "lpe", age: 12}
```

## destructuring

```litil
let (a, b) = (4, "d")

let d = ((4, true), ("test", 'c', a))

let ((_, bool), (_, _, _)) = d
```


## algebraic data types

```litil
data Option a = Some a | None

let o = Some "thing"

data List a = Cons a (List a) | Nil

let l = Cons 5 (Cons 6 Nil)

data Tree a = Null | Leaf a | Node (Tree a) a (Tree a)

let t = Node (Leaf 5) 4 (Leaf 3)
```

## pattern matching

```litil
let len l =
  match l
    []     => 0
    _ :: t => 1 + len t

len [1, 2, 3]
```

## partial application

```litil
let add x y = x + y

let inc = add 1

let three = inc 2
```

## closures & higher-order functions

```litil
let map f xs =
  match xs
    []     => Nil
    h :: t => (f h) :: (map f t)

let l = [1, 2]

let double x = 2 * x

-- pass a function by name
let l2 = map double l

-- or simply a lambda
let l2 = map (\x => 2 * x) l

let a = 4
let f = \x => a * x -- f captures the lexical value of a, i.e. 4
let a = 5
f 5
```

# The subjects that'll be covered

To create a programming language, and Litil in particular, we'll need to cover these topics:

* Lexing
* Parsing
	* BNF/[EBNF](http://en.wikipedia.org/wiki/Ebnf) 
	* [Recursive descent parsing](http://en.wikipedia.org/wiki/Recursive_descent_parser)
	* [Pratt parsing](http://en.wikipedia.org/wiki/Pratt_parser) pour les expressions
* Type inference and checking (Hindley Milner)
* Evaluation

These subjects won't necessarily be covered in this order.
What we'll be doing instead is gradually implementing the different parts from the parsing to the evaluation.
