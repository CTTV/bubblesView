var tree_node = require("tnt.tree.node");
var snitchTooltip = require("./snitchTooltip.js");

var bubblesView = function () {
    "use strict";

    var dispatch = d3.dispatch ("click", "dblclick", "contextmenu", "mouseover", "mouseout");

    var conf = {
        diameter: 600,
        format: d3.format(",d"),
        maxVal : 1,
        root: undefined,
        value: "value",
        index: function (d) {
            if (!d._parent) {
                return d[conf.key];
            }
            return d[conf.key] + "_" + d._parent[conf.key];
        },
        key: "name",
        label: "name",
        duration: 1000,
        stripeInternalNodes: false,
        showBreadcrumbs: true,
        color: function (node) {
            if (!node.parent()) {
                return "none";
            }
            if (!node.children()) {
                return "#3182bd";
            }
            return "#eff3ff";
        },
        labelColor: function (node) {
            return "white";
        },
        breadcrumbsClick: function (n) {
            render.focus(n.link);
            render.update();
        },
        useFullPath: false,
        focus: undefined
    };

    var tooltips = snitchTooltip();

    var view;
    var svg;
    var g;
    var pack;
    var defs;
    var circle;
    var label;
    var topLabel;
    var path;
    var divId;
    var breadcrumbs;

    var render = function (div) {
        divId = d3.select(div).attr("id");

        conf.focus = conf.root;

        svg = d3.select(div)
            .append("svg")
            .attr("width", conf.diameter)
            .attr("height", conf.diameter)
            .attr("class", "cttv_bubblesView");

        // breadcrumbs-like navigation
        breadcrumbs = d3.select(div)
            .append("div")
            .attr("class", "cttv_bubblesView_breadcrumbs")
            .attr("height","50");

        defs = svg.append("defs");

        defs.append("pattern")
            .attr("id", "pattern-stripe")
            .attr("width", 24)
            .attr("height", 1)
            .attr("patternUnits", "userSpaceOnUse")
            .attr("patternTransform", "rotate(45)")
            .append("rect")
            .attr("width", 23)
            .attr("height", 1)
            .attr("transform", "translate(0,0)")
            .attr("fill", "white");
        defs.append("mask")
            .attr("id", "mask-stripe")
            .append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("fill", "url(#pattern-stripe)");

        g = svg
            .append("g");

        pack = d3.layout.pack()
            .value(function(d) {
                return d[conf.value];
            })
            .sort(null)
            .size([conf.diameter, conf.diameter])
            .padding(1.5);

        render.update();

        return render;
    };

    // Redraws the bubbles view
    // if "relocate" is true it sets the transition to go from current position to its new position. If false, it doesn't interpolate the positions (useful for changes in diameter & responsive design)
    function redraw (relocate) {
        var focusData = render.focus().data();
        if (!view) {
            var d = conf.root.data();
            view = [d.x, d.y, d.r*2];
        }
        var t = svg.transition("update")
            .duration(conf.duration)
            .tween("zoom", function () {
                // focus interpolation
                var fi = d3.interpolateZoom (view, [focusData.x, focusData.y, focusData.r*2]);

                // circles
                circle.each (function (d, i) {
                    // If the bubble doesn't have siblings, make it smaller by 10%
                    var r = d.r;
                    if (d.depth>1 && d._parent.children.length === 1) {
                        r = r - r/5;
                    }
                    var c = d3.select(this);
                    var initX = relocate ? (c.attr("cx") || 0) : d.x;
                    d.interpolateX = d3.interpolate(initX, d.x);
                    var initY = relocate ? (c.attr("cy") || 0) : d.y;
                    d.interpolateY = d3.interpolate(initY, d.y);
                    var initR = relocate ? (c.attr("r") || 0) : d.r;
                    d.interpolateR = d3.interpolate(initR, r);
                    var initColor = c.attr("fill");
                    d.interpolateColor = d3.interpolate(initColor, d3.functor(conf.color)(tree_node(d)));
                });
                circle
                    .attr("class", function (d) {
                        var classes = ["bubblewView_" + d[conf.key] + "_" + divId, "bubblesViewNode"];
                        if (d.children) { // Intermediate node
                            classes.push("bubblesViewInternal");
                        } else if (d._children && d._parent && d._parent._parent) { // Potencial interm
                            classes.push("bubblesViewStripe");
                        }
                        if (!d._parent) {
                            classes.push("bubblesViewRoot");
                        }
                        if (!d.children) {
                            classes.push("bubblesViewLeaf");
                        }

                        return classes.join(" ");
                    });


                // label
                label.each (function (d) {
                    var l = d3.select(this);
                    var initColor = l.attr("fill");
                    d.interpolateLabelColor = d3.interpolate(initColor, d3.functor(conf.labelColor)(tree_node(d)));
                });

                return function (t) {
                    // focus
                    var v = fi(t);
                    // view = v;
                    var diameter = conf.diameter;
                    var offset = diameter / 2;
                    var k = diameter / v[2];

                    // circles
                    circle
                        .each (function (d) {
                            if (d.interpolateX && d.interpolateY && d.interpolateR) {
                                var mx = ((d.interpolateX(t)-v[0])*k)+offset;
                                var my = ((d.interpolateY(t)-v[1])*k)+offset;
                                var mr = d.interpolateR(t)*k;
                                var mc = d.interpolateColor(t);
                                d.initX = mx;
                                d.initY = my;
                                d.initR = mr;
                                d3.select(this)
                                    .attr("cx", function () {
                                        return mx;
                                    })
                                    .attr("cy", function () {
                                        return my;
                                    })
                                    .attr("r", function () {
                                        return mr;
                                    })
                                    .attr("fill", function () {
                                        return mc;
                                    });
                            }
                        });

                    // Label paths
                    path
                        .attr("d", function (d) {
                            return describeArc(d.initX, d.initY+10, d.initR, 160, -160);
                        });

                    // TopLabels
                    topLabel
                        .each(function (d, i) {
                            d3.select(this)
                                .select("*")
                                .remove();
                            d3.select(this)
                                .append("textPath")
                                // .attr("xlink:href", function () {
                                //     return "#s"+i;
                                // })
                                // When the "base" tag is present in the page, linking by name doesn't work in FF (Safari and Chrome looks good). We prepend window.location.href to get full IRI
                                // https://gist.github.com/leonderijke/c5cf7c5b2e424c0061d2
                                .attr("xlink:href", (conf.useFullPath ? window.location.href : "") + "#" + getPathId(d))
                                .attr("startOffset", "50%")
                                .text(function () {
                                    if (Math.PI*d.initR/8 < 5) {
                                        return "";
                                    }
                                    return d[conf.label] ? d[conf.label].substring(0, Math.PI*d.initR/8) : "";
                                });
                        });

                    // Labels
                    label
                        .each(function (d, i) {
                            if (d.interpolateColor) {
                                var mc = d.interpolateLabelColor(t);
                                d3.select(this)
                                    .attr("x", function (d) {
                                        return d.initX;
                                    })
                                    .attr("y", function (d) {
                                        return d.initY;
                                    })
                                    .attr("fill", function () {
                                        return mc;
                                    })
                                    .text(function (d) {
                                        if (d[conf.label]) {
                                            if (d.initR / 3 < 3) {
                                                return "";
                                            }
                                            return d[conf.label].substring(0, d.initR / 3);
                                        }
                                    })
                                    .attr("font-size", function (d) {
                                        var circleLength = d.initR / 3;
                                        var labelLength = d[conf.label] ? d[conf.label].length : 0;
                                        if (circleLength < labelLength) {
                                            return 10;
                                        }
                                        if (circleLength * 0.8 < labelLength) {
                                            return 12;
                                        }
                                        if (circleLength * 0.6 < labelLength) {
                                            return 14;
                                        }
                                    });
                                }
                        });

                };
            });

        // snitch circles (number of hidden elements)
        t.each("end", function () {
            circle
                .each(function (d) {
                    if (d._hidden && d.depth > 1) {
                        var parentCircle = d3.select(this);
                        var px = parseInt(parentCircle.attr("cx"));
                        var py = parseInt(parentCircle.attr("cy"));
                        var pr = parseInt(parentCircle.attr("r"));
                        var pos = polarToCartesian(px, py, pr, 45);
                        svg.append("rect")
                            .attr("class", "snitchRect")
                            .attr("x", pos.x-7)
                            .attr("rx", 3)
                            .attr("ry", 3)
                            .attr("y", pos.y-7)
                            .attr("width", 14)
                            .attr("height", 14)
                            .on("mouseover", function () {
                                tooltips.mouseover.call(this, d);
                            })
                            .on("mouseout", function () {
                                tooltips.mouseout.call(this, d);
                            });

                        svg.append("text")
                            .attr("class", "snitchText")
                            .attr("x", pos.x)
                            .attr("y", pos.y)
                            // .attr("fontsize", 10)
                            .attr("text-anchor", "middle")
                            .attr("alignment-baseline", "middle")
                            .text(d._hidden);
                    }
                });
        });

        // Removing exit element
        // circles
        circle
            .exit()
            .transition()
            .duration(conf.duration)
            .attr("cx", function (d) {
                if (d._parent) {
                    return d._parent.x;
                }
                return d.x;
            })
            .attr("cy", function (d) {
                if (d._parent) {
                    return d._parent.y;
                }
                return d.y;
            })
            .attr("r", 0)
            .remove();

        // TopLabels
        topLabel
            .exit()
            .remove();

        // labels
        label
            .exit()
            .transition()
            .duration(conf.duration)
            .attr("x", function (d) {
                if (d._parent) {
                    return d._parent.x;
                }
                return d.x;
            })
            .attr("y", function (d) {
                if (d._parent) {
                    return d._parent.y;
                }
                return d.y;
            })
            .attr("font-size", 0)
            .remove();

    }

    render.update = function () {
        var packData = pack
            .nodes(conf.root.data());

        // Circles
        circle = g.selectAll("circle.bubblesViewNode")
            .data(packData, conf.index);

        circle
            .enter()
            .append("circle")
            .attr("class", function (d) {
                var classes = ["bubblewView_" + d[conf.key] + "_" + divId, "bubblesViewNode"];
                if (d.children) { // Intermediate node
                    classes.push("bubblesViewInternal");
                } else if (d._children && d._parent && d._parent._parent) { // Potential interm
                    classes.push("bubblesViewStripe");
                }
                if (!d._parent) {
                    classes.push("bubblesViewRoot");
                }
                if (!d.children) {
                    classes.push("bubblesViewLeaf");
                }

                return classes.join(" ");
            })
            .attr("r", 0)
            .attr("fill", function (d) {
                var c = d3.functor(conf.color)(tree_node(d));
                return c;
            })
            .attr("cx", function (d) {
                if (d._parent) {
                    return d._parent.initX || d._parent.x;
                }
                return d.x;
            })
            .attr("cy", function (d) {
                if (d._parent) {
                    return d._parent.initY || d._parent.y;
                }
                return d.y;
            })
            .on("dblclick", function () {
                if (d3.event.defaultPrevented) {
                    return;
                }
                d3.event.stopPropagation();
            })
            .on ("click", function (d) {
                if (d3.event.defaultPrevented) {
                    return;
                }
                dispatch.click.call(this, tree_node(d));
            })
            .on ("contextmenu", function (d) {
                if (d3.event.defaultPrevented) {
                    return;
                }
                dispatch.contextmenu.call(this, tree_node(d));
            })
            .on ("mouseover", function (d) {
                dispatch.mouseover.call(this, tree_node(d));
            })
            .on ("mouseout", function (d) {
                dispatch.mouseout.call(this, tree_node(d));
            });

        // remove snitchSquares
        d3.selectAll("rect.snitchRect")
            .remove();
        d3.selectAll("text.snitchText")
            .remove();

        // label paths
        var topData = packData.filter(function (d) {
            return d.children !== undefined;
        });
        path = defs.selectAll("path")
            .data(topData, conf.index);

        path
            .enter()
            .append("path")
            .attr("id", getPathId);
        path
            .exit()
            .remove();

        // Top level Labels
        topLabel = g.selectAll("text.topLabel")
            .data(topData, conf.index);

        topLabel
            .enter()
            .append("text")
            .attr("class", "topLabel")
            .style({
                "cursor": "default",
                "pointer-events": "none"
            })
            .attr("font-size", "12")
            .attr("text-anchor", "middle");

        // Leaf Labels
        label = g.selectAll("text.leafLabel")
            .data(packData.filter(function (d) {return d.children === undefined;}), conf.index);

        label
            .enter()
            .append("text")
            .attr("class", function (d) {
                if (d.children) {
                    return "topLabel";
                }
                return "leafLabel";
            })
            .attr("fill", function (d) {
                var c = d3.functor(conf.labelColor)(tree_node(d));
                return c;
            })
            .style({
                "cursor": "default",
                "pointer-events": "none"
            })

            .on("click", function (d) { // only on those with pointer-events "auto" ie, on therapeutic areas labels
                if (d3.event.defaultPrevented) {
                    return;
                }
                dispatch.click.call(this, tree_node(d));
            })
            .attr("font-size", 0)
            .attr("text-anchor", "middle");

        // Make sure all the top level labels are on top
        topLabel
            .each (function () {
                var elem = this;
                elem.parentNode.appendChild(elem); // Move to front
            });

        redraw(true);
    };

    ////////////////////////
    // Auxiliar functions //
    ////////////////////////
    function getPathId (d) {
        var id = "s";
        if (d[conf.key]) {
            id += d[conf.key];
            if (d._parent && d._parent[conf.key]) {
                id += d._parent[conf.key];
            }
        }
        return id;
    }

    function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
        var angleInRadians = (angleInDegrees-90) * Math.PI / 180.0;
        return {
            x: centerX + (radius * Math.cos(angleInRadians)),
            y: centerY + (radius * Math.sin(angleInRadians))
        };
    }

    function describeArc(x, y, radius, startAngle, endAngle){
        var start = polarToCartesian(x, y, radius, endAngle);
        var end = polarToCartesian(x, y, radius, startAngle);
        var arcSweep = endAngle - startAngle <= 180 ? "0" : "1";
        var d = [
            "M", start.x, start.y,
            "A", radius, radius, 0, 1, 1, end.x, end.y
        ].join(" ");
        return d;
    }


    render.root = function (newData) {
        if (!arguments.length) {
            return conf.root;
        }
        conf.root = newData;
        return this;
    };

    render.focus = function (f) {
        if (!arguments.length) {
            return conf.focus;
        }

        // Breadcrumbs
        if (conf.showBreadcrumbs) {
            var up = [];
            f.upstream (function (ancestor) {
                if (!ancestor.property("_parent")) { // Root
                    // up.push(ancestor.property(conf.label) || "All");
                    up.push({
                        "label": "All",
                        "link": ancestor
                    });
                } else {
                    up.push({
                        "label": ancestor.property(conf.label),
                        "link": ancestor
                    });
                }
            });
            up.reverse();
            if (up.length === 1) {
                up = [];
            }

            var breadLabels = breadcrumbs.selectAll("span")
                .data(up, function (d) {
                    return d.label;
                });

            breadLabels
                .enter()
                .append("span")
                .attr("class", "cttv_bubblesView_breadcrumbLabel")
                .text(function (d) {
                    return d.label;
                });

            breadLabels
                .classed ("cttv_bubblesView_link", false)
                .on ("click", null);

            breadLabels.exit().remove();

            var allBreadLabelsButLast = breadcrumbs.selectAll(":not(:last-child)");

            // Remove old chevrons between labels
            allBreadLabelsButLast
                .select("span")
                .remove();

            // Create new chevrons
            allBreadLabelsButLast
                .append("span")
                .attr("class", "chevron");

            allBreadLabelsButLast
                .classed ("cttv_bubblesView_link", true)
                .on("click", conf.breadcrumbsClick);
        }

        conf.focus = f;
        return this;
    };

    render.breadcrumbsClick = function (cb) {
        if (!arguments.length) {
            return conf.breadcrumbsClick;
        }
        conf.breadcrumbsClick = cb;
        return this;
    };

    render.snitchInfo = function (cb) {
        if (!arguments.length) {
            return conf.snitchInfo;
        }
        snitchInfo = cb;
        return this;
    };

    render.showBreadcrumbs = function (b) {
        if (!arguments.length) {
            return conf.showBreadcrumbs;
        }
        conf.showBreadcrumbs = b;
        return this;
    };

    render.index = function (cb) {
        if (!arguments.length) {
            return conf.index;
        }
        conf.index = cb;
        return this;
    };

    render.key = function (n) {
        if (!arguments.length) {
            return conf.key;
        }
        conf.key = n;
        return this;
    };

    render.label = function (n) {
        if (!arguments.length) {
            return conf.label;
        }
        conf.label = n;
        return this;
    };

    render.stripeInternalNodes = function (b) {
        if (!arguments.length) {
            return conf.stripeInternalNodes;
        }
        conf.stripeInternalNodes = b;
        return this;
    };

    render.value = function (v) {
        if (!arguments.length) {
            return conf.value;
        }
        conf.value = v;
        return this;
    };

    render.diameter = function (d) {
        if (!arguments.length) {
            return conf.diameter;
        }

        // Hot plug
        if (svg) {
            svg
                .attr("width", d)
                .attr("height", d);

            //render.focus(render.focus());
            redraw(false);
        }
        conf.diameter = d;
        return this;
    };

    render.useFullPath = function (b) {
        if (!arguments.length) {
            return conf.useFullPath;
        }
        conf.useFullPath = b;
        return this;
    };

    render.color = function (cb) {
        if (!arguments.length) {
            return conf.color;
        }
        conf.color = cb;
        return this;
    };

    render.labelColor = function (cb) {
        if (!arguments.length) {
            return conf.labelColor;
        }
        conf.labelColor = cb;
        return this;
    };

    return d3.rebind (render, dispatch, "on");
};

module.exports = bubblesView;
