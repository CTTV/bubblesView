var theme = function () {

    var root;
    var currTA;

    var rest = cttvApi()
        // .appname("cttv-web-app")
        // .secret("2J23T20O31UyepRj7754pEA2osMOYfFK")
        .prefix("https://www.targetvalidation.org/api/latest/");


    var view = bubblesView()
        .value("association_score")
        .key("__disease_id")
        .label("__disease_name")
        .stripeInternalNodes(true)
        .index(function (d) {
            return d.__key;
        })
        .showBreadcrumbs(true)
        .breadcrumbsClick(function (d) {
            var node = d.link;
            console.log(node.data());
            // debugger;
            view.focus(node);
                node.property("__focused", false);
                var children = node.children(true);
                if (children) {
                    for (var i=0; i<children.length; i++) {
                        children[i].apply(function (child) {
                            if(!child.is_collapsed()) {
                                child.toggle();
                                child.property("__focused", false);
                            }
                        }, true);
                    }
                }
            view.update();
        });

    return function (div) {
        // switch button
        var button = d3.select(div)
            .append("button")
            .attr("type", "button")
            .text("Switch")
            .on("click", function () {
                // Reset all the opened nodes
                if (currTA) {
                    currTA.apply(function (n) {
                        if (n.data().depth===1) {
                            return;
                        }
                        if (!n.is_collapsed()) {
                            n.toggle();
                            if (n.property('__focused')) {
                                n.property('__focused', false);
                            }
                        }
                    }, true);
                }

                // If we are in a deep node, focus on its TA
                if (view.focus().data().depth > 1) {
                    view.focus(currTA);
                }

                // Switch to flat or tree children structure
                var tas = root.children(true);
                for (var i=0; i<tas.length; i++) {
                    var ta = tas[i];
                    var taData = ta.data();
                    var field;
                    if (ta.is_collapsed()) {
                        field = "_children";
                    } else {
                        field = "children";
                    }
                    taData._bk = taData[field];
                    taData[field] = taData.childrenTree;
                    // We set the coords of the parent in each children
                    var oneChild = taData._bk[0];
                    var parentCoords = {
                        initX: oneChild._parent.initX,
                        initY: oneChild._parent.initY,
                        x: oneChild._parent.x,
                        y: oneChild._parent.y
                    };
                    for (var c=0; c<taData[field].length; c++) {
                        taData[field][c]._parent.initX = parentCoords.initX;
                        taData[field][c]._parent.initY = parentCoords.initY;
                        taData[field][c]._parent.x = parentCoords.x;
                        taData[field][c]._parent.y = parentCoords.y;
                    }
                    taData.childrenTree = taData._bk;
                }
                view.update();
            });

        var url = rest.url.associations({
            target:"ENSG00000157764",
            expandefo: false,
            datastructure: "tree",
            size:1000
        });

        rest.call(url)
        .then (function (resp) {
            var data = resp.body.data;
            processData(data);
            root = tnt.tree.node(data);
            var children = root.children();
            for (var i=0; i<children.length; i++) {
                var child = children[i];
                child.toggle();
                var granChildrenTrees = child.data().childrenTree; // array of nodes
                for (var k=0; k<granChildrenTrees.length; k++) {
                    var granChildrenTree = tnt.tree.node(granChildrenTrees[k]);
                    granChildrenTree.apply(function (n) {
                        n.toggle();
                    }, true);
                }

            }
            view.root(root);
            view.on("click", function (node) {
                if (node.parent() && node.children(true)) {
                    if (node.data().depth===1) {
                        currTA = node;
                    }
                    node.toggle();
                    if (node.property("__focused")) {
                        node.property("__focused", false);
                        // focus on the parent
                        var children = node.children(true);
                        if (children) {
                            for (var i=0; i<children.length; i++) {
                                var child = children[i];
                                if(!child.is_collapsed()) {
                                    child.toggle();
                                    child.property("__focused", false);
                                }
                            }
                        }
                        view.focus(node.parent());
                    } else {
                        node.property("__focused", true);
                        view.focus(node);
                    }
                    view.update();
                }
            });
            view(div);
            console.log(data);
        });
    };


    // process data
    // no flattening
    function processData (data) {
        if (!data) {
            return [];
        }

        if (!data.children) {
            return data;
        }

        var therapeuticAreas = data.children;
        for (var i=0; i<therapeuticAreas.length; i++) {
            var tA = therapeuticAreas[i];
            var taChildren = tA.children;
            if (!taChildren) {
                // If the TA doesn't have children just create one for it with the same information as the TA
                tA.children = [_.clone(tA)];
            }
            tA.__disease_id = tA.disease.id;
            tA.__disease_name = tA.disease.name;

            // adjust name and toggle the tree structure and save it under the "childrenTree" property
            var ta_node = tnt.tree.node(tA);
            ta_node.apply(function (node) {
                var d = node.data();
                d.__disease_id = d.disease.id;
                d.__disease_name = d.disease.name;
                var key = "";
                node.upstream(function (node) {
                    key = key + "_" + node.property(function (d) {return d.disease.id;});
                });
                d.__key = key;
            }, true);
            tA.childrenTree = _.cloneDeep(tA.children); // can be done with ta_node.subtree?

            // Create the flatten structure of the children
            var flattenChildren = ta_node.flatten(true).data().children;
            var newChildren = [];
            var nonRedundant = {};
            for (var j=0; j<flattenChildren.length; j++) {
                var childData = flattenChildren[j];
                if (nonRedundant[childData.name] === undefined) {
                    nonRedundant[childData.name] = 1;
                    newChildren.push(childData);
                }
            }
            tA.children = newChildren;
        }
        return data;
    }
};
