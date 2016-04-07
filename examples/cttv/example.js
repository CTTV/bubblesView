var theme = function () {

    var filterbydatatype = "";

    var rest = cttvApi()
        // .appname("cttv-web-app")
        // .secret("2J23T20O31UyepRj7754pEA2osMOYfFK")
        .prefix("https://www.targetvalidation.org/api/latest/");


    var view = bubblesView()
        .value("association_score")
        .key("name")
        .label("name")
        .on("click", function (d) {
            view.focus(d);
            view.update();
        });

    return function (div) {
        // button
        d3.select(div)
            .append("button")
            .text("toggle data")
            .on("click", function () {
                if (filterbydatatype) {
                    filterbydatatype = "";
                } else {
                    filterbydatatype = "rna_expression";
                }
                var opts = {
                    target:"ENSG00000157764",
                    expandefo: false,
                    datastructure: "tree",
                    size:1000
                };
                if (filterbydatatype) {
                    opts.filterbydatatype = filterbydatatype;
                }
                var url = rest.url.associations(opts);

                rest.call(url)
                .then (function (resp) {
                    console.log(resp);
                    view.root(tnt.tree.node(resp.body.data));
                    view.update();
                });


            });

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
            console.log(resp);
            view.root(tnt.tree.node(resp.body.data));
            view(div);
        });
    };
};
