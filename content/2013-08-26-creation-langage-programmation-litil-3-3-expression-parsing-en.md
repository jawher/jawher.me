date: 2013-08-26
slug: creation-langage-programmation-litil-3-3-expression-parsing
title: The Litil chronicle - Chapter 3.2, Expression Parsing
lang: en

In [the previous post](http://jawher.me/2013/08/19/creation-langage-programmation-litil-3-2-recursive-descent-parsing/), I showed how to write a recursive descent parser starting from an EBNF grammar.

The grammar used as an example described a minimal expression language that could only handle numeric and boolean literals and if/else expressions.

In this post, I'll expand that language to handle more types of expressions, notably:

* arithmetic operators: addition (`+`), subtraction (`-`), multiplication (`*`), division (`/`) and modulu (`%`)
* comparison operators: `=`, `<`, `<=`, `>`, `>=`
* boolean operators: `and`, `or` and `not`
* if/else expressions: `if x >= y then x else y`
* function application: `sin x` for example
* parenthesized expressions: `( ... )` 

Let's try and write down an EBNF grammar for such a language.

## First go

Let's start with additions and multiplications first:

```
expr → atom ( '*' | '+') expr | atom
atom → NUM | BOOL | NAME
```

According to the grammar above, an expression is an `atom`, optionally followed by a `*` or `+` operator and another `atom`.
An `atom` can be either a name or a numeric or boolean literal.

Here are the AST nodes types for this grammar:

```java
abstract class Expression {
}

class ENum extends Expression {
    public final int value;

    ENum(int value) {
        this.value = value;
    }
}

class EBool extends Expression {
    public final boolean value;

    EBool(boolean value) {
        this.value = value;
    }
}

class EName extends Expression {
    public final String name;

    EName(String name) {
        this.name = name;
    }
}

class EOp extends Expression {
    public final String operator;
    public final Expression left, right;

    Op(String operator, Expression left, Expression right) {
        this.operator = operator;
        this.left = left;
        this.right = right;
    }
}
```

And the recursive descent parser that recognizes it:

```java
Expression expr() {
    Expression left = atom();
    if (found(Token.Type.SYM, "*") || found(Token.Type.SYM, "+")) {
        String operator = token.text;
        Expression right = expr();
        return new EOp(operator, left, right);
    } else {
        return left;
    }
}

Expression atom() {
    if (found(Token.Type.NUM)) {
        return new ENum(Integer.parseInt(token.text));
    } else if (found(Token.Type.BOOL)) {
        return new EBool(Boolean.parseBoolean(token.text));
    } else if (found(Token.Type.NAME)) {
        return new EName(token.text);
    } else {
        throw error("Unexpected input");
    }
}
```

Looks promising right ?

Let's test it with the following input `1 + 2 * 3`

Remember that the lexer produces a `NEWLINE` in the beginning of a line, se we need to consume it before calling the `expr` method:

```java
Reader reader = new StringReader("1 + 2 * 3");
ExprParser p = new ExprParser(new LookaheadLexerWrapper(new StructuredLexer(new BaseLexer(reader), "  ")));
p.expect(Token.Type.NEWLINE);
Expression expr = p.expr();
```

And here's the resulting AST:

{% dot litil-pratt-parser-ast0.png
graph Program {
    rankdir=LR
    graph [rankstep=0]
    node [shape=record, fontname=monospace]
    ENum1 [label="<o> ENum|1"]
    ENum2 [label="<o> ENum|2"]
    ENum3 [label="<o> ENum|3"]
    EOp4 [label="<o> *|<left> left|<right> right"]
    EOp4:left -- ENum2:o
    EOp4:right -- ENum3:o
    EOp5 [label="<o> +|<left> left|<right> right"]
    EOp5:left -- ENum1:o
    EOp5:right -- EOp4:o
}
%}

So far so good.
But before trying to implement the rest of the expression language, let's first implement an evaluator that walks an expression's AST and computes its value.
Such a tool could come in handy to ensure that the parser is producing the correct AST.

```java
int evaluate(Expression expr) {
    if (expr instanceof ENum) {
        ENum eNum = (ENum) expr;
        return eNum.value;
    } else if (expr instanceof EOp) {
        EOp op = (EOp) expr;
        int left = evaluate(op.left);
        int right = evaluate(op.right);
        if ("*".equals(op.operator)) {
            return left * right;
        } else if ("+".equals(op.operator)) {
            return left + right;
        }
    }
    throw new UnsupportedOperationException("Not impelmented");
}
```

Running this evaluator on the AST of `1 + 2 * 3` returns `7`, which is the correct answer.

How about `5 * 2 + 3` ?
We would expect the evaluation result to be `13`.
However, if you run the evaluator on the AST produced by the parser given above, you would get `25` instead.

Looking at the resulting AST should explain it:

{% dot litil-pratt-parser-ast1.png
graph Program {
    rankdir=LR
    graph [rankstep=0]
    node [shape=record, fontname=monospace]
    ENum1 [label="<o> ENum|5"]
    ENum2 [label="<o> ENum|2"]
    ENum3 [label="<o> ENum|3"]
    EOp4 [label="<o> +|<left> left|<right> right"]
    EOp4:left -- ENum2:o
    EOp4:right -- ENum3:o
    EOp5 [label="<o> *|<left> left|<right> right"]
    EOp5:left -- ENum1:o
    EOp5:right -- EOp4:o
}
%}

Here's a rundown of how the parsing went for the `5 * 2 + 3` expression:

1. `expr` calls `atom`
2. `atom` matches the numeric literal `5` and returns `ENum(5)`
3. Now back to `expr`, which stores the result in `left`
4. It will then match the `+` operator
5. And so it will recursively call itself the get the `right` operand
    1. This is a new invocation of `expr`. `atom` is called again
    2. `atom` matches the numeric literal `2` and returns `ENum(2)`
    3. `ENum(2)` is stored in `left`
    4. The `*` operator is matched
    5. and so `expr` is again recursively called to get the value of the right operand
        1. `atom` is called and returns `ENum(3)`
        2. There is nothing left in the input, no operator is found and so `expr` returns `left`, i.e. `ENum(3)`
    6. `expr` returns `EOp(operator, left, right)`, i.e. `EOp('*', ENum(2), ENum(3))`
6. `expr` returns `EOp(operator, left, right)`, i.e. `EOp('+', ENum(5), EOp('*', ENum(2), ENum(3)))`

In its current form, the parser doesn't know anything about precedence rules, and would simply parse expressions from left to right, always giving precedence to rightmost operator regardless of arithmetic rules.

## Precedence

One possible solution to the precedence problem is to encode them in the grammar itself.

What we need to do is to rewrite the grammar in a way that forces the parser to handle the operators with more precedence before those with less precedence.

In our particular case, this means coaxing the parser into parsing the multiplications before the additions.

Here's a grammar that does just that:

```
expr → add
add → mul ('+' add)?
mul → atom ('*' mul)?
atom → NUM | NAME
```

A grammar written like the one above forces the parser to try and parse multiplications before additions, even though the first rule (`expr → add`) might indicate otherwise.
You have to move to the next rule, `add → mul ('+' add)?`, to see that the first non-terminal is `mul`, which ensures the precedence rules are respected.

Here's the parser rewritten to match this modified grammar:

```java
public Expression expr() {
    return add();
}

public Expression add() {
    Expression left = mul();
    if (found(Token.Type.SYM, "+")) {
        String operator = token.text;
        Expression right = add();
        return new EOp(operator, left, right);
    } else {
        return left;
    }
}

public Expression mul() {
    Expression left = atom();
    if (found(Token.Type.SYM, "*")) {
        String operator = token.text;
        Expression right = mul();
        return new EOp(operator, left, right);
    } else {
        return left;
    }
}

public Expression atom() {
    if (found(Token.Type.NUM)) {
        return new ENum(Integer.parseInt(token.text));
    } else if (found(Token.Type.BOOL)) {
        return new EBool(Boolean.parseBoolean(token.text));
    } else if (found(Token.Type.NAME)) {
        return new EName(token.text);
    } else {
        throw error("Unexpected input");
    }
}
```

And here's the AST this parser produces for the same problematic expression `5 * 2 + 3`:

{% dot litil-pratt-parser-ast2.png
graph Program {
    rankdir=LR
    graph [rankstep=0]
    node [shape=record, fontname=monospace]
    ENum1 [label="<o> ENum|5"]
    ENum2 [label="<o> ENum|2"]
    EOp3 [label="<o> *|<left> left|<right> right"]
    EOp3:left -- ENum1:o
    EOp3:right -- ENum2:o
    ENum4 [label="<o> ENum|3"]
    EOp5 [label="<o> +|<left> left|<right> right"]
    EOp5:left -- EOp3:o
    EOp5:right -- ENum4:o
}
%}

Contrast it to the problematic AST:

![Bad AST](/static/images/graphviz/litil-pratt-parser-ast1.png)

### More arithmetic operators

Now that we know how to handle the precedence rules, let's extend the grammar to handle more operators and expression types.

One easy addition is to handle subtraction and division (with both the quotient and remainder operators).
We simply add the desired operators to the production rules:

```
expr → add_rem
add_rem → mul_div (('+'|'-') add_rem)?
mul_div → atom (('*'|'/'|'%') mul_div)?
atom → NUM | NAME
```

Which translates to *ored* `found` calls in the parser code:

```java
public Expression add_rem() {
    Expression left = mul_div();
    if (found(Token.Type.SYM, "+") || found(Token.Type.SYM, "-")) {
        String operator = token.text;
        Expression right = add_rem();
        return new EOp(operator, left, right);
    } else {
        return left;
    }
}

public Expression mul_div() {
    Expression left = atom();
    if (found(Token.Type.SYM, "*") || found(Token.Type.SYM, "/") || found(Token.Type.SYM, "%")) {
        String operator = token.text;
        Expression right = mul_div();
        return new EOp(operator, left, right);
    } else {
        return left;
    }
}
```

We'll also need to update the evaluator to handle these new operators:

```java
int evaluate(Expression expr) {
    if (expr instanceof ENum) {
        ENum eNum = (ENum) expr;
        return eNum.value;
    } else if (expr instanceof EOp) {
        EOp op = (EOp) expr;
        int left = evaluate(op.left);
        int right = evaluate(op.right);
        if ("*".equals(op.operator)) {
            return left * right;
        } else if ("/".equals(op.operator)) {
            return left / right;
        } else if ("%".equals(op.operator)) {
            return left % right;
        } else if ("+".equals(op.operator)) {
            return left + right;
        } else if ("-".equals(op.operator)) {
            return left - right;
        }
    }
    throw new UnsupportedOperationException("Not impelmented");
}
```

## Associativity

Now that we've added subtractions to the grammar, if we try and evaluate the expression `3 - 2 + 1`, which should evaluate to `2`, we will get `0` instead.

Here's the AST for the problematic expression:

{% dot litil-pratt-parser-ast-bad-assoc.png
graph Program {
    rankdir=LR
    graph [rankstep=0]
    node [shape=record, fontname=monospace]
    ENum1 [label="<o> ENum|3"]
    ENum2 [label="<o> ENum|2"]
    ENum3 [label="<o> ENum|1"]
    EOp4 [label="<o> +|<left> left|<right> right"]
    EOp4:left -- ENum2:o
    EOp4:right -- ENum3:o
    EOp5 [label="<o> -|<left> left|<right> right"]
    EOp5:left -- ENum1:o
    EOp5:right -- EOp4:o
}
%}

Which explains why we're getting the wrong result: the `2 + 1` sub expression ends up in its own `EOp` node.  
Thus, the evaluator have to evaluate it first, which returns `3`, and subtracts that from `3`, which results in the wrong result `0`.

To fix this this, we'll need to modify the parser so that it handles operators associativity.

Operator associativity comes into play when operators of the same precedence appears more than once in a sequence, as in `3 - 2 + 1`.
There are 2 ways to evaluate such an expression:

1. `(3 - 2) + 1`: which is the correct one
2. `3 - (2 + 1)`: which is the wrong one

An operator is said to be **left-associative** when the operations are grouped from the left (the first way of evaluating the expression above), and **right-associative** when the operations are grouped from the right (the second way of evaluating the expression above).  
Some operators are non-associative, meaning that they cannot appear in sequence, e.g. comparison operators: `4 < x >= 23`.

Here's our problematic grammar:

```
expr → add_rem
add_rem → mul_div (('+'|'-') add_rem)?
mul_div → atom (('*'|'/'|'%') mul_div)?
atom → NUM | NAME
```

In the `add_rem` production rule, there are 2 things going on:

1. Calling `mul_div` to get the first operand, which ensures operator precedence rules are respected
2. Recursively calling itself to get the second operand, which handles operations sequences (`3 + x + 1`)

The associativity *bug* is caused by the second point:
to handle operations sequences, we forced the operators to be right-associative, whereas the arithmetic operators `+`, `-`, `*` and `/` are left-associative.

To fix this, we'll have to handle operations sequences differently:

```
expr → add_rem
add_rem → mul_div (('+'|'-') mul_div)*
mul_div → atom (('*'|'/'|'%') atom)*
atom → NUM | NAME
```

In this fixed version of the grammar, recursivity was replaced by the usage of the `*` operator, which in EBNF means *zero or more repetitions*.

With this grammar, and when parsing the problematic expression `3 - 2 + 1`:

1. `expr` calls `add_rem`
2. `add_rem` calls `mul_div` to get its first operand
3. `mul_div` calls `atom` to get its first operand
4. `atom` matches the `3` literal
5. `mul_div` yields because the input doesn't match any of the operators it expects
6. `add_rem` has `3` as its first operand. It then starts the repetition cycle because the input matches one of the operators it handles (`+`)
7. `add_rem` calls `mul_div` again to get its second operand, which will eventually return `2`
8. It can't be seen in the grammar, but the parser should now create an `EOp` node with what was matched so far. This way the left-associativity of `-` is honored. Also, this produced node now becomes the first operand for the next operation
9. The repetition cycle loops again, as the next input is `-`
10. `mul_div` calls `atom` which returns the `1` literal
11. another `EOp` is created, with the first subtraction as its first argument and `1` as its second.

Here's the modified parser code for `add_rem` and `mul_div` that implements this logic:

```java
public Expression add_rem() {
    Expression left = mul_div();
    while (found(Token.Type.SYM, "+") || found(Token.Type.SYM, "-")) {
        String operator = token.text;
        Expression right = mul_div();
        left = new EOp(operator, left, right);
    }
    return left;
}

public Expression mul_div() {
    Expression left = atom();
    while (found(Token.Type.SYM, "*") || found(Token.Type.SYM, "/") || found(Token.Type.SYM, "%")) {
        String operator = token.text;
        Expression right = atom();
        left = new EOp(operator, left, right);
    }
    return left;
}
```

This modified version of the parser produces the following AST for `3 - 2 + 1`:

{% dot litil-pratt-parser-ast-good-assoc.png
graph Program {
    rankdir=LR
    graph [rankstep=0]
    node [shape=record, fontname=monospace]
    ENum1 [label="<o> ENum|3"]
    ENum2 [label="<o> ENum|2"]
    EOp3 [label="<o> -|<left> left|<right> right"]
    EOp3:left -- ENum1:o
    EOp3:right -- ENum2:o
    ENum4 [label="<o> ENum|1"]
    EOp5 [label="<o> +|<left> left|<right> right"]
    EOp5:left -- EOp3:o
    EOp5:right -- ENum4:o
}
%}

Again, constrast it to the *bad* AST:

![Bad AST](/static/images/graphviz/litil-pratt-parser-ast-bad-assoc.png)

### Parenthesized expressions

Next the parenthesized expressions.  
Such expressions must have precedence over the others.
Now remember how we solved the precedence problem between additions and multiplications:
we first try the expression with less precedence, and have it call the one with more precedence to parse its operands.
For parenthesized expressions, they have more precedence than additions and multiplications.
Actually, they have the same precedence as atoms (numeric literals and names for example):

```
expr → add_rem
add_rem → mul_div (('+'|'-') add_rem)?
mul_div → atom (('*'|'/'|'%') mul_div)?
atom → NUM | NAME | '(' expr ')'
```

And the parser code:

```java
public Expression atom() {
    if (found(Token.Type.NUM)) {
        return new ENum(Integer.parseInt(token.text));
    } else if (found(Token.Type.BOOL)) {
        return new EBool(Boolean.parseBoolean(token.text));
    } else if (found(Token.Type.NAME)) {
        return new EName(token.text);
    } else if (found(Token.Type.SYM, "(")) {
        Expression expr = expr();
        expect(Token.Type.SYM, ")");
        return expr;
    } else {
        throw error("Unexpected input");
    }
}
```

Here's the AST produced from parsing `5 * (2 + 3)`, which shows that it is correctly parsed:

{% dot litil-pratt-parser-ast-par.png
graph Program {
    rankdir=LR
    graph [rankstep=0]
    node [shape=record, fontname=monospace]
    ENum1 [label="<o> ENum|5"]
    ENum2 [label="<o> ENum|2"]
    ENum3 [label="<o> ENum|3"]
    EOp4 [label="<o> +|<left> left|<right> right"]
    EOp4:left -- ENum2:o
    EOp4:right -- ENum3:o
    EOp5 [label="<o> *|<left> left|<right> right"]
    EOp5:left -- ENum1:o
    EOp5:right -- EOp4:o
}
%}

 
### Unary minus

We already handled the binary minus (`-`) in subtractions, e.g. `5 - x`.  
We'd also like to handle the unary minus to support negative numbers, e.g. `-3`, or in an expression like `-3 - x`.

The unary minus has a higher precedence than binary operators (like `+`, `*`, etc.).
We'll handle it in the `atom` production rule:

```
expr → add_rem
add_rem → mul_div (('+'|'-') mul_div)*
mul_div → atom (('*'|'/'|'%') atom)*
atom → NUM | NAME | '(' expr ')' | `-` atom
```

Here's the revised `atom` parsing method:

```java
public Expression atom() {
        if (found(Token.Type.NUM)) {
            return new ENum(Integer.parseInt(token.text));
        } else if (found(Token.Type.BOOL)) {
            return new EBool(Boolean.parseBoolean(token.text));
        } else if (found(Token.Type.NAME)) {
            return new EName(token.text);
        } else if (found(Token.Type.SYM, "(")) {
            Expression expr = expr();
            expect(Token.Type.SYM, ")");
            return expr;
        } else if (found(Token.Type.SYM, "-")) {
            Expression operand = atom();
            return new EOp("-", operand, null);
        } else {
            throw error("Unexpected input");
        }
    }
```

Notice that unary minus produces an operation with the `-` operator and no right operand.

Here's the updated `evaluate` method that handles unary minus:

```java
int evaluate(Expression expr) {
    if (expr instanceof ENum) {
        ENum eNum = (ENum) expr;
        return eNum.value;
    } else if (expr instanceof EOp) {
        EOp op = (EOp) expr;
        int left = evaluate(op.left);
        Integer right = op.right == null ? null : evaluate(op.right);
        if ("*".equals(op.operator)) {
            return left * right;
        } else if ("/".equals(op.operator)) {
            return left / right;
        } else if ("%".equals(op.operator)) {
            return left % right;
        } else if ("+".equals(op.operator)) {
            return left + right;
        } else if ("-".equals(op.operator)) {
            if (right == null) {
                return -left;
            } else {
                return left - right;
            }
        }
    }
    throw new UnsupportedOperationException("Not impelmented");
}
```


### Comparison operators

We'd like to handle the following comparison operators: `<`, `<=`, `>`, `>=` and `=`.  
We'd like these operators to have less precedence than the arithmetic ones, so that expressions like `i - 1 < length` get parsed correctly.  
Again, the trick is to stick the production rule for such expressions `comp` before the `add_rem` rule, and have `comp` call `add_rem`:

```
expr → comp
comp → add_rem (('<'|'<='|'>'|'>='|'=') add_rem)?
```

Also notice that `comp` is not recursive, unlike `add_rem` and `mul_div`.
That's because comparisons cannot be chained like arithmetic operations.
For instance, `1 + 2 - 3` is a valid expression, whereas `1 > 2 <= 3` is not.

Here's the parser code for `expr` and `comp`:

```java
public Expression expr() {
    return comp();
}

public Expression comp() {
    Expression left = add_rem();
    if (found(Token.Type.SYM, "<") || found(Token.Type.SYM, "<=")
            || found(Token.Type.SYM, ">") || found(Token.Type.SYM, ">=")
            || found(Token.Type.SYM, "=")) {
        String operator = token.text;
        Expression right = add_rem();
        return new EOp(operator, left, right);
    } else {
        return left;
    }
}
```

And here's the AST produced from parsing `i -1 < length` which shows that it is correctly parsed:

{% dot litil-pratt-parser-ast-comp.png
graph Program {
    rankdir=LR
    graph [rankstep=0]
    node [shape=record, fontname=monospace]
    EName1 [label="<o> EName|i"]
    ENum2 [label="<o> ENum|1"]
    EOp3 [label="<o> -|<left> left|<right> right"]
    EOp3:left -- EName1:o
    EOp3:right -- ENum2:o
    EName4 [label="<o> EName|length"]
    EOp5 [label="<o> \>|<left> left|<right> right"]
    EOp5:left -- EOp3:o
    EOp5:right -- EName4:o
}
%}

We'll also need to update the `evaluate` method to handle the comparison operators.  
The `evaluate` method should be modified to return `Object` instead of `int`, as we'll be dealing with booleans besides integers:

```java
Object evaluate(Expression expr) {
    if (expr instanceof ENum) {
        ENum eNum = (ENum) expr;
        return eNum.value;
    } else if (expr instanceof EOp) {
        EOp op = (EOp) expr;
        Object left = evaluate(op.left);
        Object right = op.right == null ? null : evaluate(op.right);
        if ("*".equals(op.operator)) {
            return (Integer) left * (Integer) right;
        } else if ("/".equals(op.operator)) {
            return (Integer) left / (Integer) right;
        } else if ("%".equals(op.operator)) {
            return (Integer) left % (Integer) right;
        } else if ("+".equals(op.operator)) {
            return (Integer) left + (Integer) right;
        } else if ("-".equals(op.operator)) {
            if (right == null) {
                return -(Integer) left;
            } else {
                return (Integer) left - (Integer) right;
            }
        } else if ("<".equals(op.operator)) {
            return (Integer) left < (Integer) right;
        } else if ("<=".equals(op.operator)) {
            return (Integer) left <= (Integer) right;
        } else if (">".equals(op.operator)) {
            return (Integer) left > (Integer) right;
        } else if (">=".equals(op.operator)) {
            return (Integer) left >= (Integer) right;
        } else if ("=".equals(op.operator)) {
            return left.equals(right);
        }
    }
    throw new UnsupportedOperationException("Not impelmented");
}
```

### Binary boolean operators

The binary boolean operators `and` and `or`:
* are left-associative: and so we'll use the same trick we used for the arithmetic expressions (using the * repetition)
* should have lower precedence than comparison operators in order to be able to handle expressions like `x > 0 and x < 10`. We'll declare their production rule `and_or` before `comp` and have `and_or` call `comp` for its operands
* `and` have a higher precedence than `or` as is the case in many programming languages

Here's the revised EBNF grammar:

```
expr → or
or → and (`or` and)*
and → comp ('and' comp)*
comp → add_rem (('<'|'<='|'>'|'>='|'=') add_rem)?
add_rem → mul_div (('+'|'-') mul_div)*
mul_div → atom (('*'|'/'|'%') atom)*
atom → NUM | NAME | '(' expr ')' | `-` atom
```

The parser code:

```java
public Expression expr() {
    return or();
}

public Expression or() {
    Expression left = and();
    while (found(Token.Type.KEYWORD, "or")) {
        String operator = token.text;
        Expression right = and();
        left = new EOp(operator, left, right);
    }
    return left;
}

public Expression and() {
    Expression left = comp();
    while (found(Token.Type.KEYWORD, "and")) {
        String operator = token.text;
        Expression right = comp();
        left = new EOp(operator, left, right);
    }
    return left;
}
```

And the evaluator:

```java
Object evaluate(Expression expr) {
    if (expr instanceof ENum) {
        ENum eNum = (ENum) expr;
        return eNum.value;
    } else if (expr instanceof EOp) {
        EOp op = (EOp) expr;
        Object left = evaluate(op.left);
        Object right = op.right == null ? null : evaluate(op.right);
        if ("*".equals(op.operator)) {
            return (Integer) left * (Integer) right;
        } else if ("/".equals(op.operator)) {
            return (Integer) left / (Integer) right;
        } else if ("%".equals(op.operator)) {
            return (Integer) left % (Integer) right;
        } else if ("+".equals(op.operator)) {
            return (Integer) left + (Integer) right;
        } else if ("-".equals(op.operator)) {
            if (right == null) {
                return -(Integer) left;
            } else {
                return (Integer) left - (Integer) right;
            }
        } else if ("<".equals(op.operator)) {
            return (Integer) left < (Integer) right;
        } else if ("<=".equals(op.operator)) {
            return (Integer) left <= (Integer) right;
        } else if (">".equals(op.operator)) {
            return (Integer) left > (Integer) right;
        } else if (">=".equals(op.operator)) {
            return (Integer) left >= (Integer) right;
        } else if ("=".equals(op.operator)) {
            return left.equals(right);
        } else if ("and".equals(op.operator)) {
            return (Boolean) left && (Boolean) right;
        } else if ("or".equals(op.operator)) {
            return (Boolean) left || (Boolean) right;
        }
    }
    throw new UnsupportedOperationException("Not impelmented");
}
```

### Unary boolean operator, aka *not*

`not` closely resembles the unary minus:

```
atom → NUM | NAME | '(' expr ')' | `-` atom | `not` atom
```

The parser:

```java
public Expression atom() {
    if (found(Token.Type.NUM)) {
        return new ENum(Integer.parseInt(token.text));
    } else if (found(Token.Type.BOOL)) {
        return new EBool(Boolean.parseBoolean(token.text));
    } else if (found(Token.Type.NAME)) {
        return new EName(token.text);
    } else if (found(Token.Type.SYM, "(")) {
        Expression expr = expr();
        expect(Token.Type.SYM, ")");
        return expr;
    } else if (found(Token.Type.SYM, "-")) {
        Expression operand = atom();
        return new EOp("-", operand, null);
    } else if (found(Token.Type.KEYWORD, "not")) {
        Expression operand = atom();
        return new EOp("not", operand, null);
    } else {
        throw error("Unexpected input");
    }
}
```

And the evaluator:

```java
:
:
else if ("not".equals(op.operator)) {
    return !(Boolean) left;
}
```

### If expressions

We've already implemented the parsing of `if` expressions in the previous post, so I'll just reproduce the code here:

```
atom → NUM | NAME | '(' expr ')' | `-` atom | `not` atom | 'if' expr 'then' expr 'else' expr
```

The AST type:

```java
class EIf extends Expression {
    public final Expression cond;
    public final Expression thenExpr;
    public final Expression elseExpr;

    EIf(Expression cond, Expression thenExpr, Expression elseExpr) {
        this.cond = cond;
        this.thenExpr = thenExpr;
        this.elseExpr = elseExpr;
    }
}
```

The parser (in the `atom` method):

```java
:
:
else if (found(Token.Type.KEYWORD, "if")) {
    Expression cond = expr();
    expect(Token.Type.KEYWORD, "then");
    Expression thenExpr = expr();
    expect(Token.Type.KEYWORD, "else");
    Expression elseExpr = expr();
    return new EIf(cond, thenExpr, elseExpr);
}
```

And the evaluator:

```java
:
:
else if (expr instanceof EIf) {
    EIf eIf = (EIf) expr;
    if ((Boolean) evaluate(eIf.cond)) {
        return evaluate(eIf.thenExpr);
    } else {
        return evaluate(eIf.elseExpr);
    }
}
```


### Function application

This is one of the trickiest parts of the language to parse.  
Here's how the syntax looks like:

```litil
function arg1 arg2 arg3 ... 
```

Where in a language like Java `function` would be the function name, in litil `function` can be an expression that returns a function.

Here are some actual examples from litil:

```litil
print x -- simplest case
(incBy 2) x -- incBy is a function that returns a function
(\x => 2 * x) 30 -- applying an anonymous lambda 
```

Parsing function applications would consist of:

* Parse an `atom`
* Look ahead to see if the next token is the start of an `atom`.
    * If that's the case, then we're parsing a function application where the first `atom` is the function expression and the other `atom`s following it are its arguments
    * Otherwise, it is no function appliation, just a regular `atom` instead

There's a small catch though with the unary minus:
consider the following program:

```litil
f -1
```

Should it be parsed as *f minus one* or *the f function applied to minus 1* ?
I've decided to pick the the first form, i.e. *f minus one*, because otherwise regular arithmetic exceptions would fail to parse whenever the minus operator is involved, which would be a *PITA*.

Parenthesis can be used to express the second form:

```litil
f (-1)
```

In the grammar, we'll add a new production rule `app` for function application after `mul_div` and before `atom`:

```
expr → or
or → and (`or` and)*
and → comp ('and' comp)*
comp → add_rem (('<'|'<='|'>'|'>='|'=') add_rem)?
add_rem → mul_div (('+'|'-') mul_div)*
mul_div → app (('*'|'/'|'%') app)*
app → atom atom*
atom → NUM | NAME | '(' expr ')' | `-` atom | `not` atom | 'if' expr 'then' expr 'else' expr
```

Notice that `mul_div` now calls `app` instead of `atom` for its operands.

We'll also need to create a new AST node type, `EAp`, for function applications.
`EAp` should consist of a function expression and a list of the call arguments' expressions.

```java
class EAp extends Expression {
    public final Expression fn;
    public final List<Expression> args;

    EAp(Expression fn, List<Expression> args) {
        this.fn = fn;
        this.args = args;
    }
}
```

The parser needs to be updaed to add the `app` parsing method and to modify `mul_div` so that it calls the new function instead of `atom` for its operands:

```java
public Expression mul_div() {
    Expression left = app();
    while (found(Token.Type.SYM, "*") || found(Token.Type.SYM, "/") || found(Token.Type.SYM, "%")) {
        String operator = token.text;
        Expression right = app();
        left = new EOp(operator, left, right);
    }
    return left;
}

public Expression app() {
    Expression fn = atom();
    List<Expression> args = new ArrayList<Expression>();
    while (peek(Token.Type.NUM) || peek(Token.Type.BOOL) || peek(Token.Type.NAME) || peek(Token.Type.SYM, "(")
            || peek(Token.Type.KEYWORD, "not") || peek(Token.Type.KEYWORD, "if")) {
        args.add(atom());
    }
    if (args.isEmpty()) {
        return fn;
    } else {
        return new EAp(fn, args);
    }
}
```

Notice the usage of the `peek` method.
`peek` is pretty much the same as `found`, except that it doesn't consume the token even if it matches its arguments.
Here's its code:

```java
boolean peek(Token.Type key) {
    Token tk = lexer.peek(1);
    return tk.type == key;
}

boolean peek(Token.Type key, String value) {
    Token tk = lexer.peek(1);
    return tk.type == key && tk.text.equals(value);
}
```


As explained earlier, `app()` starts by parsing an `atom`.
Afterwards, if the next token **can be the start of an `atom`** (hence the the *ored* calls to `peek`), `atom` gets called again to parse it and the returned expression is stored in the arguments list.  
At the end, if we didn't parse any arguments, then it was just a *regular* `atom` and its expression is returned.  
Otherwise, it was a function call, and so an `EAp` node is constructed and returned.

The unary minus ambiguity was handled by not considering the `-` symbol as a start of an atom (in the calls to `peek` from `app`).


## Closing words

And we're done !
We just finished writing a *not-too-shabby* expression parser that handles arithmetic, comparison and boolean operators, function applications and `if` expressions in approximately 100 lines of Java code[^1]

How able is it ?
It can parse this expression `(x + 2) * y < max and -(f x y) - 1 >= min or not h` into this AST[^2]:

{% dot litil-pratt-parser-ast-big.png
graph Program {
    rankdir=LR
    graph [rankstep=0]
    node [shape=record, fontname=monospace]
    EName1 [label="<o> EName|x"]
    ENum2 [label="<o> ENum|2"]
    EOp3 [label="<o> +|<left> left|<right> right"]
    EOp3:left -- EName1:o
    EOp3:right -- ENum2:o
    EName4 [label="<o> EName|y"]
    EOp5 [label="<o> *|<left> left|<right> right"]
    EOp5:left -- EOp3:o
    EOp5:right -- EName4:o
    EName6 [label="<o> EName|max"]
    EOp7 [label="<o> \<|<left> left|<right> right"]
    EOp7:left -- EOp5:o
    EOp7:right -- EName6:o
    EName8 [label="<o> EName|f"]
    EName9 [label="<o> EName|x"]
    EName10 [label="<o> EName|y"]
    EAp11 [label="<o>EAp |<fn> fn|<arg1> arg 1|<arg2> arg 2"]
    EAp11:fn -- EName8:o
    EAp11:arg1 -- EName9:o
    EAp11:arg2 -- EName10:o
    EOp12 [label="<o> -|<left> left|<right> right"]
    EOp12:left -- EAp11:o
    ENum13 [label="<o> ENum|1"]
    EOp14 [label="<o> -|<left> left|<right> right"]
    EOp14:left -- EOp12:o
    EOp14:right -- ENum13:o
    EName15 [label="<o> EName|min"]
    EOp16 [label="<o> \>=|<left> left|<right> right"]
    EOp16:left -- EOp14:o
    EOp16:right -- EName15:o
    EOp17 [label="<o> and|<left> left|<right> right"]
    EOp17:left -- EOp7:o
    EOp17:right -- EOp16:o
    EName18 [label="<o> EName|h"]
    EOp19 [label="<o> not|<left> left|<right> right"]
    EOp19:left -- EName18:o
    EOp20 [label="<o> or|<left> left|<right> right"]
    EOp20:left -- EOp17:o
    EOp20:right -- EOp19:o

}
%}

However, parsing a very simple expression composed of a single numeric literal, like `5` for example, requires 8 method calls:

1. `expr()`
2. `or()`
3. `and()`
4. `comp()`
5. `add_rem()`
6. `mul_div()`
7. `app()`
8. `atom()`

Not very efficient, but necessary in a recursive descent parser if we want to respect the operators precedence rules.  
That's why I ended up parsing expressions in litil using a [Pratt parser](http://en.wikipedia.org/wiki/Pratt_parser) instead.


[^1]: excluding the imports and the parsing support code (`found`, `expect` and `peek`) as can be seen in [this gist](https://gist.github.com/jawher/67f77ba0574496837e41)
[^2]: yes, I love graph images and footnotes too !