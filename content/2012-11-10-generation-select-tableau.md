date: 2012-11-10
slug: generation-select-tableau
title: Une génération de "select * => tableau"
lang: fr

Nous sommes des développeurs.
Du moins, si vous lisez ce blog, vous l'êtes très probablement.
On est des millions dans le monde.
Certains d'entre nous sommes passionnés.
On lit des blogs, on fait de la veille techno, on télécharge et teste les nouveaux frameworks dès leur alpha.
On peut s'appeler des consultants, développeurs artisans, développeurs passionnés, des *ninjas*, des *rockstars*, tout ce que vous voulez.
La majorité du temps, ce qu'on fait à longueur de journée se résume à:

* `select * from uneTable`
* dessiner un tableau qui liste les résultats, avec des liens/boutons pour voir les détails, modifier ou supprimer ces entrées

Après, en pratique, on gère effectivement beaucoup plus de choses, comme par exemple:

* Séparer ça en 3 *(ou plus)* couches: isoler le code d'accès à la base de données de la couche métier de la partie web
* Ajouter peut être quelques façades. Sait-t-on jamais !
* Se battre avec le *DBA* pour qu'il ajoute une colonne à telle table
* Décider si on va utiliser un *ORM* (*Hibernate*) ou pas
* Faire le choix entre *Spring* et *JavaEE*
* Quelques uns iront même jusqu'à s'inquiéter de comment leur appli de gestion va *scaler*. L'appli en question sera utilisée par 10 utilisateurs qui sont habitués à des temps de réponse de 50 secondes. Soit, mais que se passera t'il le jour où l'o aura à gérer 1000 utilisateurs ? Ne devrait-t-on pas héberger notre appli sur le *cloud* et passer au *nosql*, avec un zeste de *realtime* ?
* Le tableau qui affiche les résultats du *select* devrait être triable sur n'importe quelle colonne, filtrable, paginé, et joli.
* etc.

On fait que ça.
Oui, des fois, il y'a de la logique métier à implémenter.
Quelques `if` par si et par là.
Ou des fois, c'est de l'**illogique** métier qu'il faut gérer.
Mais on reste toujours dans le *workflow* `select * from table => afficher dans un tableau`.
Bienvenue dans le monde des applications de gestion.

C'est une conséquence inévitable du succès de l'informatique.
C'est devenu un outil indispensable dans tous les domaines.
Du bancaire à la GED en passant par la gestion de stock, tout le monde veut automatiser et informatiser leur *process*.
Je m'en plains pas, c'est ce qui fait qu'il y ait si peu de chômeurs parmi les développeurs.

Mais je n'en suis pas complètement satisfait.
Je dis pas complètement parce que je prend un eu de plaisir à bien implémenter une *feature* qui je sais va simplifier la vie aux utilisateurs de l'application.
Mais ça ne me fait plus rêver.

Je ne suis pas le seul à ressentir ça.
Mais ce que je constate c'est que la majorité de ceux qui veulent s'en sortir vont vers des *startups* pour travailler sur des variantes d'un réseau social.
Des développeurs, qui pour la majorité sont très doués, qui passent des milliers d'heures à créer des produits mort-nés qui se résument à une zone de texte qui permet de publier un *statut/tweet/update/post* et que les *amis/followers* peuvent *liker/retweeter/reblogger/favoriser*.
Quel gâchis !

D'un autre côté, il y'a des développeurs qui travaillent sur des sujets, qui pour moi, sont beaucoup plus intéressants et passionnants:

* Les gens qui créent et optimisent les outils qu'on utilise tous les jours: l'os, la base de données, l'éditeur/IDE, etc. Récemment, le toplink sur [HackerNews](http://news.ycombinator.com/item?id=4763879) parle de [RethinkDb](http://www.rethinkdb.com/): une bande de passionnés[^1] qui travaillent pendant des années pour résoudre des problèmes très durs, comme comment ne pas bloquer la base pendant que l'on exécute du *map/reduce* là-dessus par exemple.  
  Ou même les gens qui bossent sur les systèmes moins *sexy*, comme l'optimisateur de requêtes de Postgres ou Oracle par exemple.
* Les gens qui créent les langages qu'on utilise pour développer nos applis.
  Surtout de nos jours où il ne se passe pas une semaine sans que l'on annonce la sortie d'un nouveau langage: [Rust](https://mail.mozilla.org/pipermail/rust-dev/2012-October/002489.html), Go, ou même les petits langages jouets dont parlent les gens sur des sites spécialisés comme [λ the ultimate](http://lambda-the-ultimate.org/)
  Je suis jaloux de ces gens qui passent leurs journées à réfléchir sur la syntaxe à choisir, la sémantique derrière, l'interaction entre les différents *constructs* du langage, puis aux détails d'implémentation: comment inférer et vérifier des types, générer du code optimisé, implémenter le *garbage collector*, etc.
* Les gens qui travaillent sur l'intelligence artificielle par exemple, ou le *machine-learning* avec les différentes applications tel que l'analyse et compréhension du langage naturel (*Siri* et Google), [collaboration entre plusieurs robots *(vid)*](http://www.youtube.com/watch?feature=player_embedded&v=i3ernrkZ91E), etc.
* Les gens qui ont écrit [le soft *(pdf)*](http://compass.informatik.rwth-aachen.de/ws-slides/havelund.pdf) qui pilote le *rover Curiosity*.
  Ou ceux qui ont [diagnostiqué et corrigé un problème software sur la sonde voyager](http://www.jpl.nasa.gov/news/news.php?release=2010-151) alors qu'elle était à plus de 13 milliards de Km de la terre.
* Les gens qui créent les algorithmes de compression (jpeg, mp3, lzw, etc.), les moteurs de recherche capable de retourner le bon résultat parmi des milliards de pages indexées en quelques millisecondes, les softs de pilotage automatique d'avions ou les voitures sans conducteur, etc.

Je suis jaloux.
J'aimerais travailler sur des sujets qui auront un impact positif sur l'humanité.
Mais ce n'est pas le cas.
J'arrive à survivre en m'intéressant à l'aspect technique du métier.

Dans mon temps libre, j'essaie de travailler sur [des projets](https://github.com/jawher) qui n'ont rien à voir avec les applications de gestion.
Je travaille surtout sur des projets de types "socle technique" (bibliothèque, framework).
Je passe aussi beaucoup de temps à lire d'obscurs papiers de recherche sur la théorie de compilation et l'inférence de types et à travailler sur mon [*toy-language*](http://jawher.me/2012/06/04/creation-langage-programmation-litil-1/).
J'essaie aussi de ne pas me cantonner au sphère Java en allant souvent sur des sites comme HackerNews et Reddit et à me forcer à élargir mes lectures pour inclure d'autres langages/technos comme Python, ML, Haskell, Clojure, Ruby, Erlang, etc.

Mais pendant mes journées, je continue à faire du `select * => tableau`.

---
C'est cette couverture du *MIT Technology Review* du mois de Novembre qui a motivé ce post:

<img src="http://images.digital.technologyreview.com/rvimageserver/Technology%20Review/Technology%20Review/November%20December%202012/page0000001.jpg" alt="Damn" width="500" />

[^1]: Dont Salava Akhmechet, qui tient un [excellent blog](http://www.defmacro.org/) que je vous conseillerais de prendre le temps de lire.
