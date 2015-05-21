date: 2015-05-21
slug: go-is-unapologetically-flawed-heres-why-we-use-it
url: http://bravenewgeek.com/go-is-unapologetically-flawed-heres-why-we-use-it/
title: Go Is Unapologetically Flawed, Here’s Why We Use It

> To put it mildly, Go’s type system is impaired. It does not lend itself to writing quality, maintainable code at a large scale, which seems to be in stark contrast to the language’s ambitions. The type system is noble in theory, but in practice it falls apart rather quickly. Without generics, programmers are forced to either copy and paste code for each type, rely on code generation which is often clumsy and laborious, or subvert the type system altogether through reflection. Passing around interface{} harks back to the Java-pre-generics days of doing the same with Object. The code gets downright dopey if you want to write a reusable library.