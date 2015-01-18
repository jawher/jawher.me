/*
The MIT License (MIT)

Copyright (c) 2015 Jawher Moussa

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

/*jslint browser: true*/
window.timeline = function() {
    var actions = [],
        pos = -1;
    return {
        add: function(from, to, label) {
            actions.push({
                from: from,
                to: to,
                label: label
            });
            return this;
        },
        group: function() {
            var tl = this,
                g = [];
            return {
                add: function(from, to, label) {
                    g.push({
                        from: from,
                        to: to,
                        label: label
                    });
                    return this;
                },
                end: function() {
                    actions.push(g);
                    return tl
                }
            }
        },
        progress: function() {
            return {
                pos: pos,
                length: actions.length
            }
        },
        finished: function() {
            return pos >= actions.length - 1;
        },
        rewind: function() {
            pos = -1;
        },
        next: function() {
            if (pos < actions.length - 1) {
                pos++;
                return true;
            }
            return false;
        },
        prev: function() {
            if (pos >= 0) {
                pos--;
                return true;
            }
            return false;
        },
        frame: function(g) {
            if (pos < 0 || pos >= actions.length) {
                return;
            }
            nodes = {};
            for (var i = 0; i <= pos; i++) {
                var act = actions[i];
                if (!$.isArray(act)) {
                    act = [act];
                }
                for (var j = 0; j < act.length; j++) {
                    a = act[j];
                    if (!nodes[a.from]) {
                        g.setNode(a.from, {
                            shape: 'ellipse',
                            label: a.from
                        });
                        nodes[a.from] = true;
                    }
                    if (a.to && !nodes[a.to]) {
                        g.setNode(a.to, {
                            shape: 'ellipse',
                            label: a.to
                        });
                        nodes[a.to] = true;
                    }
                    if (a.label) {
                        g.setEdge(a.from, a.to, {
                            label: a.label,
                            lineInterpolate: 'basis'
                        });
                    }
                }
            }
        }
    }
};

window.fsmPlayer = function(selector, frames) {
    $(selector).prepend('<ul class="buttons">' +
        '<li><a href=""></a></li>' +
        '<li><a href=""></a></li>' +
        '<li><a href=""></a></li>' +
        '<li class="brand">FSM player by me</li>' +
        '</ul>' +
        '<div class="progress"><div/></div>');

    var playing = false;
    var timeoutPromise;

    function updateButtons() {
        if (playing) {
            $(selector).find('li:nth-child(1)>a').addClass('pause');
            $(selector).find('li:nth-child(2)>a').removeAttr('href');
            $(selector).find('li:nth-child(3)>a').removeAttr('href');
        } else {
            $(selector).find('li:nth-child(1)>a').removeClass('pause');
            $(selector).find('li:nth-child(2)>a').attr('href', '#');
            $(selector).find('li:nth-child(3)>a').attr('href', '#');
        }
    }

    function updateProgress() {
        var p = frames.progress();
        $(selector).find('.progress>div').css('width', (100 * (p.pos + 1) / p.length) + '%');
    }

    updateProgress();

    $(selector).on('click', 'li:nth-child(1)>a', function() {
        if (playing) {
            playing = false;
            clearTimeout(timeoutPromise);
            updateButtons();
        } else {
            playing = true;
            updateButtons();
            if (frames.finished()) {
                frames.rewind();
            }
            play();
        }
        return false;
    });

    $(selector).on('click', 'li:nth-child(2)>a', function() {
        if (playing) {
            return false;
        }
        frames.next();
        renderFrame();
        return false;
    });

    $(selector).on('click', 'li:nth-child(3)>a', function() {
        if (playing) {
            return false;
        }
        frames.prev();
        renderFrame();
        return false;
    });

    var svg = d3.select(selector),
        inner = svg.select("svg g");

    var zoom = d3.behavior.zoom().on("zoom", function() {
        inner.attr("transform", "translate(" + d3.event.translate + ")" +
            "scale(" + d3.event.scale + ")");
    });

    svg.call(zoom);

    if ($(selector).data('zoom')) {
        zoom.scale(parseFloat($(selector).data('zoom')));
        zoom.event(inner.transition());
    }
    var render = new dagreD3.render();


    function renderFrame() {
        var g = new dagreD3.graphlib.Graph();

        // Set an object for the graph label
        g.setGraph({
            rankdir: 'LR',
            WBS: true,
            marginx: 10,
            marginy: 20,
            nodesep: 40,
            ranksep: 20
        });

        // Default to assigning a new object as a label for each new edge.
        g.setDefaultEdgeLabel(function() {
            return {};
        });
        g.graph().transition = function(selection) {
            return selection.transition().duration(800);
        };
        frames.frame(g);
        dagre.layout(g);
        render(inner, g);
        updateProgress();
    }

    function play() {
        if (!frames.next()) {
            playing = false;
            updateButtons();
            return;
        } else if (playing) {
            timeoutPromise = setTimeout(play, 1200);
        }
        renderFrame();
    }
};

$(function() {
    window.fsmPlayer('#fsm-optionality',
        window.timeline()
        .add('S1', 'S2', 'Arg(SRC)')
        .add('S2', 'S3', 'Arg(DST)')
        .add('S1', 'S3', '*')
    );

    window.fsmPlayer('#fsm-choice',
        window.timeline()
        .add('X1', 'X2', 'Opt(-x)')
        .add('Y1', 'Y2', 'Opt(-y)')
        .add('S', 'X1', '*')
        .add('S', 'Y1', '*')
        .add('X2', 'E', '*')
        .add('Y2', 'E', '*')
    );

    window.fsmPlayer('#fsm-sequence-wrong',
        window.timeline()
        .add('F1', 'F2', 'Opt(-f)')
        .add('S1', 'S2', 'Arg(SRC)')
        .add('D1', 'D2', 'Arg(DST')
        .add('F2', 'S1', '*')
        .add('S2', 'D1', '*')
    );

    window.fsmPlayer('#fsm-sequence-ab',
        window.timeline()
        .add('A.start', 'A.end', 'Opt(-f)')
        .add('B.start', 'B.end', 'Opt(-g)')
        .add('A\'.start', 'A\'.end', 'Opt(-f)')
        .add('B\'.start', 'B\'.end', 'Opt(-g)')
        .add('S', 'A.start', '*')
        .add('A.end', 'B.start', '*')
        .add('B.end', 'E', '*')
        .add('S', 'B\'.start', '*')
        .add('B\'.end', 'A\'.start', '*')
        .add('A\'.end', 'E', '*')
    );

    // -a [-b | -c] FILE
    window.fsmPlayer('#fsm-sequence-abcarg',
        window.timeline()
        .add('A1', 'A2', 'Opt(-a)')
        .add('B1', 'B2', 'Opt(-b)')
        .add('C1', 'C2', 'Opt(-c)')
        .group()
        .add('CS', 'B1', '*')
        .add('CS', 'C1', '*')
        .end()
        .group()
        .add('B2', 'CE', '*')
        .add('C2', 'CE', '*')
        .end()
        .add('CS', 'CE', '*')
        .group()
        .add('A\'1', 'A\'2', 'Opt(-a)')
        .end()
        .group()
        .add('B\'1', 'B\'2', 'Opt(-b)')
        .add('C\'1', 'C\'2', 'Opt(-c)')
        .add('C\'S', 'B\'1', '*')
        .add('C\'S', 'C\'1', '*')
        .add('B\'2', 'C\'E', '*')
        .add('C\'2', 'C\'E', '*')
        .add('C\'S', 'C\'E', '*')
        .end()
        .add('S', 'A1', '*')
        .add('A2', 'CS', '*')
        .add('CE', 'E', '*')
        .add('S', 'C\'S', '*')
        .add('C\'E', 'A\'1', '*')
        .add('A\'2', 'E', '*')
        .add('F1', 'F2', 'Arg(FILE)')
        .add('E', 'F1', '*')
    );
});