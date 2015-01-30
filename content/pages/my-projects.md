date: 2010-08-22
slug: my-projects
permalink: /my-projects/
title: My projects

I'm mainly using [Github](http://github.com/jawher) to publish the (tiny) projects I'm working on in my free time:

## [mow.cli](https://github.com/jawher/mow.cli)

mow.cli is a sophisticated yet simple to use library to write command line applications in Go.

Behind the scenes, mow.cli uses finite state machines and backtracking to validate the program call syntax and correctly extract the passed options and arguments values, à la docopt, although in mow.cli it is correctly implemented.

I've already published 2 articles on this subject:

* [Parsing command line arguments and a shameless plug of mow.cli](https://lojawher.me/2015/01/13/parsing-command-line-arguments-shameless-plug-mowcli/)
* * [Parsing command line arguments using a finite state machine and backtracking](https://jawher.me/2015/01/14/parsing-command-line-arguments-finite-state-machine-backtracking/)
* 
Here's an example demonstrating how to use it to implement a subset of the docker client:

```go
docker := App("docker", "A self-sufficient runtime for linux containers")

docker.Command("run", "Run a command in a new container", func(cmd *Cmd) {
    cmd.Spec = "[-d|--rm] IMAGE [COMMAND [ARG...]]"

    var (
        detached = cmd.Bool(BoolOpt{Name: "d detach", Value: false, Desc: "Detached mode: run the container in the background and print the new container ID"})
        rm       = cmd.Bool(BoolOpt{Name: "rm", Value: false, Desc: "Automatically remove the container when it exits (incompatible with -d)"})
        memory   = cmd.String(StringOpt{Name: "m memory", Value: "", Desc: "Memory limit (format: <number><optional unit>, where unit = b, k, m or g)"})
    )

    var (
        image   = cmd.String(StringArg{Name: "IMAGE", Value: "", Desc: ""})
        command = cmd.String(StringArg{Name: "COMMAND", Value: "", Desc: "The command to run"})
        args    = cmd.Strings(StringsArg{Name: "ARG", Value: nil, Desc: "The command arguments"})
    )

    cmd.Action = func() {
        how := ""
        switch {
        case *detached:
            how = "detached"
        case *rm:
            how = "rm after"
        default:
            how = "--"
        }
        fmt.Printf("Run image %s, command %s, args %v, how? %v, mem %s", *image, *command, *args, how, *memory)
    }
})

docker.Run(os.Args)
```

## [X-AVR](https://github.com/jawher/xavr)

X-AVR is an XCode template for generating AVR C projects.

Be sure to check [this blog post](https://jawher.me/2014/03/21/using-xcode-avr-c/) which goes into more detail on how it works and the nice features it has.

## Templating

As I do a lot of web applications development, I'm fascinated by the subject of templating (HTML mostly), especially after learning Wicket and with it discovering a different way of how to drive markup generation compared to the majority of other frameworks and languages (99% of java frameworks, good ol'jsp, stock php and even asp.net).
Moulder is my second attempt at creating a templating library that uses a jQuery-like techniques to manipulate the markup.



### [moulder-j](http://github.com/jawher/moulder-j)


Written in Java and [published](http://github.com/jawher/moulder-j) under the [MIT license](http://www.opensource.org/licenses/mit-license.php).

Here's a short usage sample:

Given this markup:

```html
<html>
    <body>
        <h1>[...]</h1>
    </body>
</html>
```

This moulder based snippet:

```java
Document doc = Jsoup.parse(HTML);
MoulderShop m = new MoulderShop();

m.register("h1", 
        repeat(Arrays.asList("Spring", "Summer", "Autumn", "Winter")),
        attr("class", new Values<String>("even", "odd").cycle()),
        text(new ElementDataValue<String>()),
        append("<p>content</p>")
          );

m.process(doc);
```

Will generate the following:

```html
<html>
    <body> 
        <h1 class="even">Spring</h1> 
        <p>content</p>
        <h1 class="odd">Summer</h1> 
        <p>content</p>
        <h1 class="even">Autumn</h1> 
        <p>content</p>
        <h1 class="odd">Winter</h1> 
        <p>content</p>
    </body>
</html>
```




### [moulder-s](http://github.com/jawher/moulder-s)


This is the Scala port of moulder-j and [published](http://github.com/jawher/moulder-s) under the [MIT license](http://www.opensource.org/licenses/mit-license.php).

Here's a short usage sample:

Given this markup:

```html
<html>
    <body>
        <h1>[...]</h1>
    </body>
</html>
```

This moulder based snippet:

```scala
Dval document = Jsoup.parse("<html><body><h1>[...]</h1></body></html>")
val s = MoulderShop()
s.register("h1", 
           repeat("Summer" :: "Autumn" :: "Winter" :: "Spring" :: Nil)) 
           :: attr("class", Values("even" :: "odd" :: Nil).cycle) 
           :: text(eData()) 
           :: append(h(tr(eData[String](), (c:String)=>"<p>"+ c +"</p>"))) 
           :: Nil)
s.process(document)
```

Will generate the following:

```html
<html>
    <head>
    </head>
    <body> 
        <h1 class="even">Spring</h1> 
        <p>Spring</p>
        <h1 class="odd">Summer</h1> 
        <p>Summer</p>
        <h1 class="even">Autumn</h1> 
        <p>Autumn</p>
        <h1 class="odd">Winter</h1> 
        <p>Winter</p>
    </body>
</html>
```





### [themplator](http://github.com/jawher/themplator)


This is my first try a templating a is heavily influenced by Wicket and is [published](http://github.com/jawher/themplator) under the [MIT license](http://www.opensource.org/licenses/mit-license.php).

Here's a short usage sample:

Given this markup:

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<root>
    <div thid="d">
        <span style="color: aqua;" thid="s">hello world</span>
    </div>
    <h1 thid="invisible">title</h1>
</root>
```

This themplator based snippet:

```java
List<String> data = Arrays.asList("one", "two", "three", "four");

Themplate t = new Themplate();

ListRepeater<String> d = new ListRepeater<String>("d",
        new SimpleModel<List<String>>(data)) {

    @Override
    protected void populate(
            themplator.bricks.ListRepeater.ListItem<String> item) {
        InjectMarkup im = new InjectMarkup("s", Thest2.class
                .getResourceAsStream("brick.html"));
        im.add(new Label("s", item.getModel()));
        item.add(im);
    }

};

d.setRenderBodyOnly(true);
t.add(d);

Label label = new Label("invisible", new SimpleModel<String>("text"));
label.setRenderBodyOnly(true);
t.add(label);

InputStream is = Thest2.class.getResourceAsStream("test0.html");
ByteArrayOutputStream os = new ByteArrayOutputStream();

t.render(is, os);

System.out.println(new String(os.toByteArray()));
```

Will generate the following:

```xml
<?xml version='1.0' encoding='UTF-8'?>
<root>
    <span style="color: aqua;" thid="s">
        <ul class="menu">
            <li class="active" thid="s">one</li>
            <li>Item 1</li>
        </ul>
    </span>

    <span style="color: aqua;" thid="s">
        <ul class="menu">
            <li class="active" thid="s">two</li>
            <li>Item 1</li>
        </ul>
    </span>

    <span style="color: aqua;" thid="s">
        <ul class="menu">
            <li class="active" thid="s">three</li>
            <li>Item 1</li>
        </ul>
    </span>

    <span style="color: aqua;" thid="s">
        <ul class="menu">
            <li class="active" thid="s">four</li>
            <li>Item 1</li>
        </ul>
    </span>

    text
</root>
```



## Other projects




### [neo4j-scala](http://github.com/jawher/neo4j-scala)


Scala wrapper for [Neo4j](http://neo4j.org/) Graph Database [published](http://github.com/jawher/neo4j-scala) under the [MIT license](http://www.opensource.org/licenses/mit-license.php).

Using this wrapper, this is how creating two relationships can look in Scala:

```scala
start --> "KNOWS" --> intermediary --> "KNOWS" --> end
```

And this is how getting and setting properties on a node or relationship looks like :

```scala
start("foo") = "bar"
start("foo") match {
    case Some(x) => println(x)
    case None => println("aww")
}
```

Besides, the neo4j scala binding makes it possible to write stop and returnable evaluators in a functional style :

```scala
//StopEvaluator.END_OF_GRAPH, written in a Scala idiomatic way :
start.traverse(Traverser.Order.BREADTH_FIRST, (tp : TraversalPosition) => false, ReturnableEvaluator.ALL_BUT_START_NODE, DynamicRelationshipType.withName("foo"), Direction.OUTGOING)

//ReturnableEvaluator.ALL_BUT_START_NODE, written in a Scala idiomatic way :
start.traverse(Traverser.Order.BREADTH_FIRST, StopEvaluator.END_OF_GRAPH, (tp : TraversalPosition) => tp.notStartNode(), DynamicRelationshipType.withName("foo"), Direction.OUTGOING)
```




### [JDBC can be nice](http://github.com/jawher/jdbc-can-be-nice)


JDBC is a masterpiece: its as bad as APIs can be, yet it is very useful in real life programming. Spring JDBC shows how JDBC can be used without loosing your sanity, but requiring Spring to do some quick hacking at a database is an overkill, so I created "JDBC can be nice", a tiny Java wrapper that makes common tasks easy. It is
[published](http://github.com/jawher/jdbc-can-be-nice) under the [MIT license](http://www.opensource.org/licenses/mit-license.php).

Here's how hacking at a db look like with this wrapper:

```java
ConnectionProvider connectionProvider = cachingConnectionProvider(driverManagerConnectionProvider(
    "org.apache.derby.jdbc.Driver40",
    "jdbc:derby:crud;create=true", "", ""));
Number key = doWithConnection(
    sqlTx(
            sqlUpdate("delete * from table").then(
                    sqlUpdate("insert into table values(?, ?)",
                            true, "a"))).thenReturn(
            dontThrowSqlException(sqlUpdateAndReturnKey(
                    "insert into table2 values(?)", 8), -1)),
    connectionProvider);
RowMapper<String> namesMapper = new RowMapper<String>() {

public String mapRow(ResultSet resultSet, int row)
        throws SQLException {
    return resultSet.getString("name");
}
};

List<String> names = doWithConnection(sqlQuery(
    "select name from table where age < ?", namesMapper, 20),
    connectionProvider);
```



## There is even more


There is a couple more projects in [my Github page](http://github.com/jawher), but they're mostly random musings.
