date: 2013-08-11
slug: creation-langage-programmation-litil-3-1-introduction-parsing
title: The Litil chronicle - Chapter 3.1, Introduction to parsing
lang: en

After a [teaser about the Litil language](http://jawher.me/2012/10/20/creation-langage-programmation-litil-1/),
and a [*(boring)* chapter about the lexing component](http://jawher.me/2012/10/21/creation-langage-programmation-litil-2-lexer/),
now we finally get to the interesting parts, starting with the parsing.

There's one catch though: we'll have to go a bit into the theory of grammars and parsing.
But bear with me: I'll try to keep it short and not bore you with too much theory and technical jargon.

## Grammar

A grammar is a formal way to define the syntax of a language.

Let's suppose I wanted to present a programming language's syntax to a friend.
I would start from the top-level language constructs, and from there go into their details.

In the case of litil for example, I would start by telling him that a litil program is a list of let bindings.  
A let binding is a fancy way to say a variable or a function declaration.  
A let binding starts with the `let` keyword followed by the variable or function name.  
For variables, next comes the `=` symbol followed by its value which is an expression, e.g. `let x = 5`.  
For functions, next comes the argument list and then the `=` symbol followed by the function's body (a list of instructions), e.g. `let f x = x`.  
I would then go on to talk about expressions, their different types (arithmetic, if/then/else, etc.) and how they are constructed.
etc.

Using natural languages to describe a programming language works, but is clunky, verbose and often imprecise.  
That's why computer scientists have come up with formal notations for a language's grammar.
One such a notation is [BNF](http://en.wikipedia.org/wiki/Backus%E2%80%93Naur_Form)/[EBNF](http://en.wikipedia.org/wiki/EBNF) (Backus Naur Form and Extended Backus Naur Form).

## BNF

When describing a language, we use these 2 following concepts:

* terminals: keywords, values, symbols etc. that appear in a program text and usually map to a lexer generated token, e.g. `let`, `=`, `34`, etc.
* non-terminals: the "to be defined" concepts, like a function, a let binding, an expression, etc.
  They don't appear in the program's text.

A BNF grammar is a list of production rules (that the technical term).  
A production rule explains how a non-terminal is constructed from other terminals and non-terminals by combining them.  
Combining can be as a sequence, i.e. `A followed by B` or as a choice `A or B`.  
That's it.

Here is the litil language presentation given earlier in english:

> In the case of litil for example, I would start by telling him that a litil program is a list of let bindings.  
A let binding is a fancy way to say a variable or a function declaration.  
A let binding starts with the `let` keyword followed by the variable or function name.  
For variables, next comes the `=` symbol followed by its value which is an expression, e.g. `let x = 5`.  
For functions, next comes the argument list and then the `=` symbol followed by the function's body (a list of instructions), e.g. `let f x = x`.  
I would then go on to talk about expressions, their different types (arithmetic, if/then/else, etc.) and how they are constructed.
> etc.

From the description, we can extract the following terminals: `let`, `=` and names.  
The concepts that don't appear in the program's text but that represent that language's building blocks, i.e. the non-terminals are: `letBinding` and `expression`

Let's write the production rule for a let binding:

```
letBinding → 'let' NAME ('=' expression | arguments '=' expression)
```

In the above, `letBinding` (to the left of `→`) is the non-terminal being defined, whereas the part to the right of `→` is the recipe describing how to construct it.  

The recipe starts with a terminal (`let`) followed by a `NAME`  token.  
Then there are 2 possibilities:

* In case of a variable declaration: a terminal `=` followed by a non-terminal `expression`
* In case of a function declaration: a list of arguments (the non terminal `arguments`), followed by the terminal `=` and the non-terminal `expression`, i.e. the expression that forms the body of the function.

The choice is expressed using the `|` operator. Also note that we can use parenthesis to group strings of terminal and non terminals.

So, to define the `letBinding` non-terminal, we used 2 new non-terminals (`expression` and `arguments`) that we now have to define.

Let's start with `arguments`:

```
arguments → NAME (arguments | ε)
```

The above production rule introduces 2 new concepts:

* recursivity: a non-terminal's definition can reference itself in the right-hand part. This is a very powerful feature of BNF that enables expressing repeating patterns
* ε : means *nothing*. It is usually used to expression optionality or as a stop point for recursive patterns

So an argument list is defined to be either a name followed by an argument list or *nothing*.

Let's tackle expressions now. For the sake of simplicity, I'll limit this post to very simple expressions, mainly names (of other variables) and numeric literals:

```
expression → NAME | NUM
```

The production rule is a simple choice between a `NAME` or a `NUM` token.

## EBNF

EBNF extends BNF with a couple operators to ease the writing of production rules.  
There is nothing we can encode with one but not with the other.
It's just that it is easier and less verbose with EBNF than with BNF.

The operators added by EBNF are:

* `?`: to indicate an optional part
* `*`: to indication a repetition (**zero** or more) of a part
* `+`: to indication a repetition (**one** or more) of a part

Armed with these operators, we can now rewrite the production rule for an argument list from:

```
arguments → NAME (arguments | ε)
```

to:

```
arguments → NAME+
```

I could have used a more contrived example so that the gain from using EBNF would have been more spectacular, but you get the idea.

Here are some examples of EBNF production rules and how they can be expressed in BNF:

| EBNF   | BNF                |
|--------|--------------------|
| s → a? | s → a &#124; ε     |
| s → a* | s → (a s) &#124; ε |
| s → a+ | s → a (s &#124; ε) |

## How to parse

There are essentialy 2 ways to parse an input according to a grammar:

* **Top-down**: Starting from the first production rule, repeatedly expand every non-terminal (by replacing it with its definition) until there are no non-terminals left and the generated terminals string matches the input. If we consume the input from **L**eft to right and always expand the **L**eft-most non terminal, we end up with an **LL** parser.
* **Bottom-up**: Try to recognize patterns (non-terminals) in the input and from there go back up to the first production rule. If we consume the input from **L**eft to right and always expand the **R**ight-most non terminal, we end up with an **LR** parser.

Top-down parsing is arguably more intuitive and easier to understand, implement and debug.
Tools like ANTLR or JavaCC generate Top-down parsers.

Bottom-up parsing, however, is also arguably more powerful as it can parse more grammars and languages than Top-down.
Tools like yacc/bison generate Bottom-up parsers.

Here's an example to show Top-down parsing at work:

Given this grammar describing arithmetic expressions:

```
expr → add_rem
add_rem → mul_div (('+'|'-') add_rem)?
mul_div → atom (('*'|'/') mul_div)?
atom → NUM | NAME | '(' add_rem ')'
```

And this input:

```
x + 15 * (b + 23)
```

Here's a rundown of of the Top-down parsing algorithm:

1. Start with the first rule: `expr → add_rem`
2. No much choice here: there is a single non-terminal to the right so we expand `add_rem` with its defintion to get `mul_div (('+'|'-') add_rem)?`
3. We start with the left-most non terminal, i.e. `mul_div` and expand it: `atom (('*'|'/') mul_div)? (('+'|'-') add_rem)?`
4. Again, we expand the first non-terminal, `atom`. Since its definition contains a choice, we need to choose one of the alternatives based on the input. The first token in our input is `x` which is of type `NAME`, so we pick that alternative and replace `atom` with `NAME` and advance a virtual cursor in the input. We end up with `NAME (('*'|'/') mul_div)? (('+'|'-') add_rem)?`
5. Now the left-most non-terminal is `mul_div`. It is located in an optional segment (due to the use of the `?` operator). The next token in the input is `+`, which doesn't match `'*'|'/'`, so we skip the optional part and end up with: `NAME (('+'|'-') add_rem)?`
6. Now the left-most non-terminal is `add_rem`. Again, it is in an optional segment, so we need to check against the first token of the input (`+`) to decide if it is to be skipped or kept. We're in luck, as the optional segment also starts with `+`. The production rule is now `NAME ('+'|'-') add_rem` and we need to expand `add_rem`: `NAME ('+'|'-') mul_div (('+'|'-') add_rem)?`
7. Now the left-most non-terminal is `mul_div`. After expanding it, we get: `NAME ('+'|'-') atom (('*'|'/') mul_div)? (('+'|'-') add_rem)?`
8. Again, to expand `atom` we need to check against the input to pick an alternative. The next token is `15`, i.e. a `NUM`, so that's the alternative to pick: `NAME ('+'|'-') NUM (('*'|'/') mul_div)? (('+'|'-') add_rem)?`
9. The next token in the input is `*`, so we keep the optional part that comes after `NUM`: `NAME ('+'|'-') NUM ('*'|'/') mul_div (('+'|'-') add_rem)?`
10. After expanding `mul_div`: `NAME ('+'|'-') NUM ('*'|'/') atom (('*'|'/') mul_div)? (('+'|'-') add_rem)?`
11. After expanding `atom` (by replacing it with `'(' add_rem ')'`, since `(` is the next token in the input): `NAME ('+'|'-') NUM ('*'|'/') '(' add_rem ')' (('*'|'/') mul_div)? (('+'|'-') add_rem)?`
12. :
13. :

You get the idea: just continue expanding the left-most non-terminal, using the input to choose among the laternatives until there are no more non-terminals left.
If we get stuck mid-way, then the input is invalid according to our grammar.
Otherwise, the input is considered to be valid.

## Concrete syntax tree

Now, if we keep track of all the intermediate steps, and represent every terminal and non-terminal with a node in a graph, and its expansion as its children, we end up with a tree like structure resembling this:

{% dot litil-parser-topdown-tree.png
graph G {
    rankdir=TB
    graph [rankstep=1]
    node [shape=box, fontname=monospace]
    
    expr

    addrem1 [label="add_rem"]

    muldiv1 [label="mul_div"]
    p1 [label="+"]
    addrem2 [label="add_rem"]

    atom1 [label="atom"]

    name1 [label="NAME"]
    
    muldiv2 [label="mul_div"]

    atom2 [label="atom"]

    m1 [label="*"]
    muldiv3 [label="mul_div"]
    
    lp1 [label="("]
    addrem4 [label="add_rem"]
    rp1 [label=")"]
    
    muldiv4 [label="mul_div"]
    p3 [label="+"]
    addrem5 [label="add_rem"]

    atom3 [label="atom"]
    name2 [label="NAME"]


    expr -- addrem1

    addrem1 -- muldiv1
    addrem1 -- p1
    addrem1 -- addrem2

    addrem2 -- muldiv2

    num1 [label="NUM"]

    muldiv5 [label="mul_div"]
    atom4 [label="atom"]
    num2 [label="NUM"]

    muldiv1 -- atom1 -- name1 -- x
    muldiv2 -- atom2 -- num1 -- 15
    muldiv2 -- m1
    muldiv2 -- muldiv3

    muldiv3 -- lp1
    muldiv3 -- addrem4
    muldiv3 -- rp1

    addrem4 -- muldiv4
    addrem4 -- p3
    addrem4 -- addrem5

    muldiv4 -- atom3 -- name2 -- b

    addrem5 -- muldiv5 -- atom4 -- num2 -- 23
}
%}

This tree is called the [*(concrete)* parse tree](http://en.wikipedia.org/wiki/Parse_tree): a structured representation of an input according to grammar where the leaf nodes are terminals and the other nodes represent non-terminals.

We could write down the Java types representing this tree structure and then a couple of algorithms that operate on it.
For instance, we can represent the tree nodes with the following recursive type:

```java
public class Node {
    public String value;
    public List<Node> children;
}
```


Once the input is transformed into a parse tree, the subsequent operations become much easier as they operate on a structured represetnation instead of the orginal raw text.
Think of an arithmetic evaluator for expressions like the one given above for example.
Compare this with having to implement the said evaluator that directly operates on the input string, without any structured representation.

## Abstract syntax tree

The Concret syntax tree is already a very useful form of representing a parsed input.  
However, it contains a lot of noise and could be trimmed a bit to only the useful and important parts:

1. For instance, we could get rid of the useless terminals like the parenthesis.
   They were useful in the input string to encode the correct precedence.
   No so much in the syntax tree as the tree structure itself suffices.
2. Whenever a node contains a single child, we can get rid of it.
   For instance, for the `b` token, we don't really care what path we took to parse it.
   We're only interested in the fact that it is a `NAME` and the the value is `b`.
   Hence, we can get rid of `atom` and `mul_div` from its parents chain.
   The same applies for all the other terminals.
   A general rule of thum is: **if a node has only one child, we can replace it with that child**.

Applying these 2 optimisations, we end up with this tree:

{% dot litil-parser-topdown-tree-2.png
graph G {
    rankdir=TB
    graph [rankstep=1]
    node [shape=box, fontname=monospace]
    
    expr

    addrem1 [label="add_rem"]

    name1 [label="NAME"]
    p1 [label="+"]
    muldiv2 [label="mul_div"]

    num1 [label="NUM"]
    m1 [label="*"]
    addrem4 [label="add_rem"]
    
    name2 [label="NAME"]
    p3 [label="+"]
    num2 [label="NUM"]
    
    expr -- addrem1

    addrem1 -- name1 -- x
    addrem1 -- p1
    addrem1 -- muldiv2

    muldiv2 -- num1 -- 15
    muldiv2 -- m1
    muldiv2 -- addrem4

    addrem4 -- name2 -- b
    addrem4 -- p3
    addrem4 -- num2 -- 23
}
%}

Just by removing the useless nodes we get a much leaner tree.

But we can go even further to make traversing and operating on the tree easier.  

As it it stands now, while traversing the tree visiting a node at a time, a hypothetical evaluator's code would look like this: 


```java
int evaluate(Node node) {
    if ("NUM".equals(node.value)) {
        return Integer.parseInt(node.children.get(0).value);
    } else if ("add_rem".equals(node.value)) {
        int operand1 = evaluate(node.children.get(0));
        String operator = node.children.get(1).value;
        int operand2 = evaluate(node.children.get(2));
        if ("+".equals(operator)) {
            return operand1 + operand2;
        } else {
            return operand1 - operand2;
        }
    } else ...
}
```

Ugly stuff ! String comparisons all over the place, hard-coded list indices, etc.

A much cleaner and easier to work with and to maintain (once it's done) approach would be to have specialized node types, instead of a single generic `Node` type *(to rule them all)*:

| node   | description       | fields            |
|--------|-------------------|-------------------|
| `Num`  | a numeric literal | value: int        |
| `Name` | a name reference  | name: String      |
| `Add`  | an addition       | left, right: Node |
| `Sub`  | a subtraction     | left, right: Node |
| `Mul`  | a multiplication  | left, right: Node |
| `Div`  | a division        | left, right: Node |

Since some of these nodes do reference other nodes (like the `Add` which references 2 operands), we'll need to define a common base type `Node`.

Now in Java:

```java
interface Node {

}

class Num implements Node {
    int value;
}

class Name implements Node {
    String name;
}

class Add implements Node {
    Node left, right;
}

class Sub implements Node {
    Node left, right;
}

class Mul implements Node {
    Node left, right;
}

class Div implements Node {
    Node left, right;
}
```

Note that we'll also need to write down the algorithm that transforms the concret parse tree to this representation.

Using this strongly-typed tree representation, here's how the parse tree would like like:

{% dot litil-parser-ast-tree.png
graph G {
    rankdir=LR
    graph [rankstep=0]
    node [shape=record, fontname=monospace]
    
    add1 [label="<o> Add|<l> left|<r> right"]
    
    mul1 [label="<o> Mul|<l> left|<r> right"]

    add2 [label="<o> Add|<l> left|<r> right"]

    num1 [label="<o> Num|<v> 15"]
    num2 [label="<o> Num|<v> 23"]
    name1 [label="<o> Name|<v> x"]
    name2 [label="<o> Name|<v> b"]

    add1:l -- name1:o
    add1:r -- mul1:o

    mul1:l -- num1:o
    mul1:r -- add2:o

    add2:l -- name2:o
    add2:r -- num2:o
}
%}

Also, the evaluator can be rewritten to this much cleaner form (it could be made cleaner still using the visitor pattern for example):

```java
int evaluate(Node node) {
    if (node instanceof Num) {
        return ((Num) node).value;
    } else if (node instanceof Add) {
        Add add = (Add) node;
        return evaluate(add.left) + evaluate(add.right);
    } else {
        :
        :
    }
}
```

Another approach would be to have the evaluate method in the node types:

```java
interface Node {
    int evaluate();
}

class Num implements Node {
    int value;

    public int evaluate() {
        return value;
    }
}

class Name implements Node {
    String name;

    public int evaluate() {
        return 42;//Lookup the value somewhere
    }

}

class Add implements Node {
    Node left, right;

    public int evaluate() {
        return left.evaluate() + right.evaluate();
    }
}
```

But as you'll see in the next chapters, I chose to use the first approach (visitor based) instead of the second (polymorphic) because I would like to be able to parse litil in litil *(inception)*.
litil isn't an OOP language and doesn't have subtyping polymorphism, but instead has pattern matching which makes writing the visitor pattern a breeze.

Oh, by the way: this type of tree with specialized node types is what we call the Abstract Syntax Tree or *AST*.

## Closing words

That's all the theory we're going to need: grammars, BNF/EBNF, Top-down parsing, Concrete and Abstract Syntax Trees.

But it is still theory: we still haven't talked about how to write the parser that creates the parse tree.
This is going to be fixed in the [next installment](http://jawher.me/2013/08/19/creation-langage-programmation-litil-3-2-recursive-descent-parsing/) where I'm going to show you how to hand-write a Top-down parser that directly generates an AST using the Recursive descent approach.
