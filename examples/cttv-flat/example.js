var theme = function () {

    var rest = cttvApi()
        // .appname("cttv-web-app")
        // .secret("2J23T20O31UyepRj7754pEA2osMOYfFK")
        .prefix("https://www.targetvalidation.org/api/latest/");


    var view = bubblesView()
        .value("association_score")
        .key("__disease_id")
        .label("__disease_name");
        // .on("click", function (d) {
        //     view.focus(d);
        // });

    return function (div) {
        var url = rest.url.associations({
            target:"ENSG00000157764",
            // datastructure:"simple",
            expandefo: false,
            datastructure: "tree",
            // datastructure: "tree",
            size:1000
        });

        rest.call(url)
        .then (function (resp) {
            var data = resp.body.data;
            processData(data);
            var root = tnt.tree.node(data);
            var children = root.children();
            for (var i=0; i<children.length; i++) {
                var child = children[i];
                child.toggle();
            }
            view.root(root);
            view.on("click", function (node) {
                if (node.parent() && node.children(true)) {
                    node.toggle();
                        if (node.property("__focused")) {
                            node.property("__focused", false);
                            view.focus(root);
                        } else {
                            node.property("__focused", true);
                            view.focus(node);
                        }
                    view.update();
                }
            });
            view(div);
        });
    };


    // process data
    // flattening the tree (duplicates?)
    function processData (data) {
        if (data === undefined) {
            return [];
        }

        if (data.children === undefined) {
            return data;
        }
        // data.name = "";
        var therapeuticAreas = data.children;
        for (var i=0; i<therapeuticAreas.length; i++) {
            var tA = therapeuticAreas[i];
            var taChildren = tA.children;
            if (taChildren === undefined) {
                // If the TA doesn't have a child, just create one for it with the same information as the TA
                tA.children = [_.clone(tA)];
                //continue;
            }
            //tA.__disease_id = tA.disease.id;
            tA.__disease_id = tA.disease.id;
            tA.__disease_name = tA.disease.name;
            var ta_node = tnt.tree.node(tA);
            var flattenChildren = ta_node.flatten(true).data().children;
            var newChildren = [];
            var nonRedundant = {};
            for (var j=0; j<flattenChildren.length; j++) {
                var childData = flattenChildren[j];
                // Put some properties to have direct access to disease name and id (will be used by bubblesView)
                //childData.name = childData.disease.id;
                childData.__disease_id = childData.disease.id;
                childData.__disease_name = childData.disease.name;
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
