var theme = function () {

    var rest = cttvApi()
        // .appname("cttv-web-app")
        // .secret("2J23T20O31UyepRj7754pEA2osMOYfFK")
        .prefix("https://www.targetvalidation.org/api/latest/");


    var view = bubblesView()
        .value("association_score")
        .key("__disease_id")
        .label("__disease_name")
        .stripeInternalNodes(true);

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
            // for (var i=0; i<children.length; i++) {
            //     var child = children[i];
            //     child.toggle();
            // }
            view.root(root);
            view.on("click", function (node) {
                console.log(data);
                if (node.parent() && node.children(true)) {
                    node.toggle();
                        if (node.property("__focused")) {
                            node.property("__focused", false);
                            // view.focus(root);
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

        // data.name = ""; // No name for root
        var therapeuticAreas = data.children;
        for (var i=0; i<therapeuticAreas.length; i++) {
            var tA = therapeuticAreas[i];
            tA.__disease_id = tA.disease.id;
            tA.__disease_name = tA.disease.name;
            var ta_node = tnt.tree.node(tA);
            ta_node.apply(function (node) {
                var d = node.data();
                d.__disease_id = d.disease.id;
                d.__disease_name = d.disease.name;
                if (!node.is_leaf()) {
                    node.toggle();
                }
            }, true);
        }
        return data;
    }
};
