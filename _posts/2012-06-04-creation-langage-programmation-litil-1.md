---
date: '2012-06-04 21:45:00'
layout: post
slug: creation-langage-programmation-litil-1
status: publish
title: Le conte de Litil - Chapitre 1, Génèse d'un langage de programmation
---

{{ page.title }}
================

Comme beaucoup d'autres passionnés d'informatique, j'ai toujours été fasciné par les compilateurs et les langages de programmation, et ce depuis que j'ai appris à programmer. Mais ma fascination ne s'arrêtait pas au fait que je pouvais commander ma machine en écrivant des programmes pour produire des résultats *(parfois)* utiles. En effet, j'étais encore plus fasciné par les compilateurs eux-mêmes. Je trouvais ça magique qu'un programme arrivait à *"lire"* et à exécuter ce que je venais de saisir.

Je me rappelle encore de ma première tentative d'écrire un parseur. A l'époque (j'étais encore au lycée), je ne savais même pas que c'est comme ça que ça s'appelait. Je venais à peine d'apprendre Pascal sur un Commodore, et je voulais absolument écrire un *truc* qui évaluerait une expression arithmétique sous forme d'une chaine de caractères, sans le moindre *background* théorique sur le sujet, ni même d'accès aux internets®. Je ne me rappelle plus si j'avais réussi à le faire ou pas, mais je n'ai pas oublié quelques rustines que j'avais pondu à l'époque, comme par exemple le fait d'évaluer en priorité les expressions parenthésées. Ma solution était de chercher la première parenthèse fermante, puis de partir dans l'autre sens jusqu'à la première parenthèse ouvrante pour délimiter le bout à évaluer en premier, puis répéter le processus jusqu'à ce qu'il ne reste plus de parenthèses *(Non, ce n'est pas comme ça qu'il faut faire ;)*.

Depuis, j'en ai pas mal appris sur le sujet, surtout lors de mes études universitaires, mais surtout dans un cadre professionnel, où j'ai eu la chance de travailler sur 2 projets nécéssitant l'écriture d'un parseur pour un DSL métier. J'essayais aussi d'en apprendre un peu plus en lisant l'occasionnel papier de recherche, ou en fréquentant des sites comme [LtU](http://lambda-the-ultimate.org/).

Récemment, j'ai décidé que, comme tout le monde, je vais créer mon langage de programmation, aka JavaSlayer™, et pour rendre l'exercice encore plus stimulant, j'ai décidé de ne pas utiliser un générateur de parseurs (à la ANTLR) mais plutôt de tout faire à la main et à l'ancienne sans la moindre bibliothèque ni framework. Le but était de vraiment comprendre comment fonctionnait un compilateur. J'avais aussi été influencé par [Niklaus Wirth](http://en.wikipedia.org/wiki/Niklaus_Wirth) (le créateur de Pascal, Modula et Oberon) qui a écrit tous ses compilateurs à la main.

Et je ne sais pas comment, mais après 2 ou 3 mois de travail occasionnel, je me suis retrouvé avec un parseur et évaluateur pour langage plutôt puissant, dites bonjour à `Litil`!

Comme je n'avais plus envie de blogger sur "Comment créer une application `<framework web #1>` avec `<orm #2>` et `<framework js #3>` sur `<un ide>` pour gérer `<sujet hip du moment>` et l'héberger sur `<fournisseur PaaS|SaaS|IaaS>`", je me lance dans une série (enfin j'espère) de billets sur le sujet de parsing, sans plan particulier, quoi que j'essairais de maintenir une semblance d'ordre logique, où j'exposerais les techniques que j'utilise (au fur et à mesure que je les apprenne).

Il faut préciser que bien qu'il existe pleins d'outils qui permettent de générer **facilement** des parseurs, comme SableCC, ANTLR, JavaCC, lex/yacc, flex/bison, etc., mais le but ici est justement de tout faire à la main, l'objectif étant de comprendre comment ça fonctionne à l'intérieur(™).

# Litil

Comme dit plus haut, ce post entame une série où je présenterai et expliquerai les différentes techniques que j'avais utilisées pour créer un parseur et un évaluateur pour un langage de programmation, Litil™, le tout en Java avec toutefois quelques notices:

* C'est du *work in progress*. On n'arrête pas de nous le dire: *release early, release often*, mais je tenais à le préciser quand même: j'avançais en tatonnant, en apprenant au fur et à mesure, et donc, inévitablement, il y'aurait plusieurs coquilles.
* J'en ai parlé dans le point précédent: je ne prétends pas être une autorité dans ce sujet. J'ai eu un début de formation théorique dessus et j'ai lu pas mal de littérature.
* J'ai récemment commencé à travaillé sur la compilation vers du bytecode. Il se peut que j'en parle dans un futur post, mais c'est encore assez tôt et je ne promet rien.

Une présentation rapide de Litil en quelques points:

* langage fonctionnel fortement inspiré de ML, (O)Caml et Haskell et [Roy](http://roy.brianmckenna.org/)
* inférence de types totale avec [Hindley Milner](http://en.wikipedia.org/wiki/Hindley-Milner_type_inference)
* [les blocs sont délimités avec l'indentation (à la Python)](http://en.wikipedia.org/wiki/Off-side_rule)
* types supportés: entiers, chaines, booléens, caractères, [tuples](http://en.wikipedia.org/wiki/Tuple), [records](http://en.wikipedia.org/wiki/Record_(computer_science\)) et [ADTs](http://en.wikipedia.org/wiki/Algebraic_data_type)
* [pattern matching](http://en.wikipedia.org/wiki/Pattern_matching)
* *[curried functions](http://en.wikipedia.org/wiki/Currying)* par défaut
* [closures](http://en.wikipedia.org/wiki/Closure_(computer_science\))
* exceptions (try/catch/throw)

Voilà. Maintenant un petit *teaser* pour vous donner une idée sur à quoi ressemble le langage qu'on va créer.

## affectations, expressions et fonctions

{% highlight litil %}
let fact n =
  if n <= 2 then
    2
  else
    n * fact (n-1)

let f5 = fact 5
{% endhighlight %}


## tuples et records

{% highlight litil %}
let x = (5, "a")
let person = {name: "lpe", age: 12}
{% endhighlight %}

## destructuring

{% highlight litil %}
let (a, b) = (4, "d")

let d = ((4, true), ("test", 'c', a))

let ((_, bool), (_, _, _)) = d
{% endhighlight %}


## types algebriques

{% highlight litil %}
data Option a = Some a | None

let o = Some "thing"

data List a = Cons a (List a) | Nil

let l = Cons 5 (Cons 6 Nil)

data Tree a = Null | Leaf a | Node (Tree a) a (Tree a)

let t = Node (Leaf 5) 4 (Leaf 3)
{% endhighlight %}



## pattern matching

{% highlight litil %}

let len l =
  match l
    []     => 0
    _ :: t => 1 + len t

len [1, 2, 3]
{% endhighlight %}

## application partielle

{% highlight litil %}

let add x y = x + y

let inc = add 1

let three = inc 2
{% endhighlight %}

## closures et higher-order functions

{% highlight litil %}

let map f xs =
  match xs
    []     => Nil
    h :: t => (f h) :: (map f t)

let l = [1, 2]

let double x = 2 * x

-- pass a function by name
let l2 = map double l

-- or simply a lambda
let l2 = map (\x->2*x) l

let a = 4
let f = \x->a*x -- f capture la valeur lexicale de a, i.e. 4
let a = 5
f 5
{% endhighlight %}

# Les thèmes qui seront abordés

La création d'un langage de programmation en général, et de Litil en particulier, nécessite d'aborder les thèmes suivants:

* Lexing
* Parsing
	* BNF/[EBNF](http://en.wikipedia.org/wiki/Ebnf) 
	* [Parsing à descente récursive](http://en.wikipedia.org/wiki/Recursive_descent_parser)
	* [Pratt parsing](http://en.wikipedia.org/wiki/Pratt_parser) pour les expressions
* Inférence et vérification des types (Hindley Milner)
* Evaluation

Pour les posts qui vont suivre, je ne vais pas forcément traiter de ces sujets dans l'ordre. Le but étant d'implémenter graduellement les différentes composantes du langage du parsing jusqu'à l'évaluation. Du coup, la suite va consister à faire des allers-retours sur ces différents thèmes au fur et à mesure de l'avancement du développement du langage.
