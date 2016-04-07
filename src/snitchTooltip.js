var tnt_tooltip = require("tnt.tooltip");
var deferCancel = require("tnt.utils").defer_cancel;

var tooltips = function () {
    var t = {};

    var hover_tooltip;
    var show_deferred = deferCancel(function (obj, ev) {
        hover_tooltip.call(this, obj, ev);
    }, 200);
    var hide_deferred = deferCancel(function () {
        if (hover_tooltip) {
            hover_tooltip.close();
        }
    }, 200);

    t.mouseover = function (d) {
        var ev = d3.event;
        hover_tooltip = tnt_tooltip.plain()
            .id(89134)
            .width(180)
            .show_closer(false);
        var obj = {};
        obj.header="";
        obj.body = d._hidden + " node collapsed <br /> click the bubble to expand";

        show_deferred.call(this, obj, ev);
    };

    t.mouseout = function () {
        hide_deferred();
    };

    return t;
};

module.exports = exports = tooltips;
