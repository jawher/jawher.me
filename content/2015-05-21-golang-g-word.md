date: 2015-05-21
slug: golang-g-word
title: Golang and the G word
lang: en

Look, I like Go.
It's a fun language to code in.

It has an extensive and mostly well-thought standard library which fits in my head *(I'm looking at you Java)*.

I like the fact that I can whip out a http service serving json in just a couple of lines using only a text editor and without the need for any external library or complex framework.

But there is a problem in Go the language and the community, and it all comes down to the G word, aka *Generics*, or the lack thereof.

It is bad enough that the language doesn't have them, forcing you to either copy/paste the same code again and again to handle different types, or to resort to using `interface{}`, losing yourself the benefits of a staticaly-typed language.  

What's worse though is the reaction of at least a part of the community whenever a poor soul dares to mention the G word:

* "*generics are overrated*"
* "*I've been coding in Go for 2 years and didn't even miss them*"
* "*just use the built-in generic types, i.e slices, maps and channels*"
* "*can we satop the trolls and get back to writing real-world software*"

And the list goes on and on.
Just google "golang generics" and feast your eyes on long-winded battles between the 2 camps.

First: it is simply not true that you don't need generics in Go:
every program makes use of them whenever slices, maps and channels are used.  
I'd like to see the users' reaction if Go really lacked any form of generics and instead forced you to keep casting any thing you read from the built-in containers from `interface{}`.  
You bet it won't be *generics are overrated*.

Second: you can indeed write any software in Go even with the lack of generics.  
The same way we used to be able to write full games in assembler with only jumps and without `for` loops or `if/else` constructs.  
The same with Java before version 5 where we didn't bat an eyelid when we had casts all over our code everytime we touched a collection from the standard library.  
Or before version 8, i.e. before the advent of lamda expressions and streams where we kept dilluting our code with for loops and/or anonymous classes whenever we wanted to filter or project a collection and finding nothing wrong with it.

Programs can be limited to using the built-in generic containers only, but they shouldn't be: there are dozens of useful and efficient other datastructures besides lists and maps: tries, trees, sorted sets, heaps, and the list goes on and on.  
Picking the right datastructure or algorithm for the problem on hand is the core of our job as developers.

So there it is: Go ships with only 2 datastructures, and doesn't let you write the missing ones in a generic and type-safe way.

I'm not saying that this makes Go unusable, and I shall continue using it almost daily as I've been doing for the last couple of months.  
But enjoying the language doesn't mean it is perfect and criticizing it shouldn't be met with the scorn and vicious responses it elicits today.  

Here to a future where the following snippet is valid Go:

```go
type BTree[T] struct {
    Compare func(T)Comp
    Root    *Node[T] 
}
type Node[T] struct {
    Value       T
    Left, Right *Node[T]
}

func New[T](compare func(T) Comp) *BTree[T] {
    return &BTree[T]{Compare: compare}
}

func (*BTree[T]) Insert(value T) bool {
    ...
}

tree := btree.New[*Account](func(x, y *Account) Comp {
    switch {
        case x.Created == y.Created: return Eq
        case x.Created >  y.Created: return Gt
        default: return Lt
    }
})
```