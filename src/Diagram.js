var DBSDM = DBSDM || {};

/**
 * Canvas controller
 * Creates canvas which is used to manipulate other elements
 */
DBSDM.Diagram = (function() {
    var ns = DBSDM;
    var self = {};

    /** Should only be read */
    self.allowEdit = true;
    self.allowFile = true;
    self.allowCorrectMode = false;
    self.showTutorial = true;
    self.confirmLeave = false;

    self._canvasList = [];
    self._lastCanvas = null;
    self.cancelAction = null;

    self.init = function(options){
        options = options || {};
        if (typeof options.allowEdit == "boolean") { self.allowEdit = options.allowEdit; }
        if (typeof options.allowFile == "boolean") { self.allowFile = options.allowFile; }
        if (typeof options.allowCorrectMode == "boolean") { self.allowCorrectMode = options.allowCorrectMode; }
        if (typeof options.showTutorial == "boolean") { self.showTutorial = options.showTutorial; }
        if (typeof options.confirmLeave == "boolean") { self.confirmLeave = options.confirmLeave; }

        ns.Menu.build();

        // create shared hidden svg for defs
        var svg = document.body.appendChild(ns.Element.el("svg", {id: "dbsdmShared"}));
        this._defs = svg.appendChild(ns.Element.el("defs"));

        this._createEntityElements();
        this._createAttributeElements();
        this._createRelationElements();
        this._createRelationLegElements();

        // global events
        if (self.confirmLeave) {
            window.onbeforeunload = function(e) {
                if (self.didAnyCanvasChange()) {
                    var dialog = "Are you sure you want to leave? Your model may not have been saved.";
                    e.returnValue = dialog;
                    return dialog;
                }
            };
        }

        window.addEventListener('keypress',function(e){
            if (self.lastCanvas) {
                if (e.keyCode == 112) { // F1
                    self.lastCanvas.ui.toggleHelp();
                    return;
                }
                switch(e.key) {
                    case "+": self.lastCanvas.zoomIn(); return;
                    case "-": self.lastCanvas.zoomOut(); return;
                    case "*": self.lastCanvas.zoomReset(); return;
                }
            }
            if (e.keyCode == 27 && self.cancelAction) { // ESC
                self.cancelAction();
                self.cancelAction = null;
            } else if (ns.Control.Entity.activeEntity) {
                ns.Control.Entity.activeEntity.onKeyPress(e);
            }
        });
        window.addEventListener("mousedown", function(e) {
            ns.Menu.hide();
            if (ns.Control.Entity.activeEntity) {
                ns.Control.Entity.activeEntity.deactivate();
            }
        });
        ns.Fullscreen.setEvents(function(e) {
            var el = ns.Fullscreen.fullscreenElement();
            if (el) {
                el.classList.add("fullscreen");
            } else {
                document.querySelector(".fullscreen").classList.remove("fullscreen");
            }
            if (ns.Fullscreen.lastCanvas) {
                ns.Fullscreen.lastCanvas.updateViewbox();
            }
        });
    };

    self.registerCanvas = function(canvas) {
        self._canvasList.push(canvas);
    };

    self.didAnyCanvasChange = function() {
        var changed = false;
        var count = self._canvasList.length;
        for (var i=0; i<count; i++) {
            if (self._canvasList[i].didDataChange()) {
                self._canvasList[i].ui.error("Changes in this model have not been saved");
                changed = true;
            }
        }
        return changed;
    };

    // svg elements
    self._sharedElementName = function(name) {
        return name;
    };

    self.hasSharedElement = function(name) {
        return document.getElementById(this._sharedElementName(name)) != null;
    };

    self.createSharedElement = function(name, element) {
        ns.Element.attr(element, { id: this._sharedElementName(name) });
        this._defs.appendChild(element);
    };

    self.getSharedElement = function(name, attrs) {
        if (!this.hasSharedElement(name)) { return null; }
        return ns.Element.use(this._sharedElementName(name), attrs);
    };

    self.getSharedElementId = function(name) {
        if (!this.hasSharedElement(name)) { return null; }
        return "#" + this._sharedElementName(name);
    };

    // create shared svg elements
    self._createEntityElements = function() {
        self.createSharedElement("Entity.Bg",
            ns.Element.rect(0, 0, "100%", "100%", {
                rx: 10, ry: 10,
                fill: "#A4E1FF",
                stroke: "#0000FF", // #5271FF
                strokeWidth: ns.Consts.EntityStrokeWidth
            })
        );

        self.createSharedElement("Entity.Bg.Selected",
            ns.Element.rect(0, 0, "100%", "100%", {
                rx: 10, ry: 10,
                fill: "#EFFFA4",
                stroke: "#ffa800",
                strokeWidth: ns.Consts.EntityStrokeWidth
            })
        );

        self.createSharedElement("Entity.Bg.Incorrect",
            ns.Element.rect(0, 0, "100%", "100%", {
                rx: 10, ry: 10,
                fill: "#ffaaaa",
                stroke: "#b62727",
                strokeWidth: ns.Consts.EntityStrokeWidth
            })
        );

        self.createSharedElement("Entity.ControlRectangle",
            ns.Element.rect(0, 0, "100%", "100%", {
                fill: "none",
                strokeWidth: 1,
                shapeRendering: "crispEdges",
                pointerEvents: "none",
                stroke: "black"
            })
        );

        self.createSharedElement("Entity.ControlPoint",
            ns.Element.rect(0, 0, 8, 8, {
                fill: "none",
                strokeWidth: 1,
                stroke: "black",
                shapeRendering: "crispEdges",
                transform: "translate(-4,-4)",
                pointerEvents: "all"
            })
        );
    };

    self._createRelationElements = function() {
        self.createSharedElement("Relation.MiddlePoint",
            ns.Element.rect(0, 0, 6, 6, {
                fill: "black",
                strokeWidth: 1,
                stroke: "black",
                shapeRendering: "crispEdges",
                transform: "translate(-3,-3)",
                pointerEvents: "visible"
            })
        );
    };

    self._createRelationLegElements = function() {
        ns.Diagram.createSharedElement("Relation.AnchorControl",
            ns.Element.rect(-9.5,-14.5, 18,15, {
                fill: "none",
                stroke: "none"
            })
        );

        ns.Diagram.createSharedElement("Relation.AnchorMany",
            ns.Element.el("polyline", {
                points: "-4.5,-0.5, -0.5,-10.5, 0.5,-10.5, 4.5,-0.5",
                fill: 'none',
                stroke:'black',
                strokeWidth: 1
            })
        );

        ns.Diagram.createSharedElement("Relation.AnchorIdentifying",
            ns.Element.el("polyline", {
                points: "-5.5,-10.5, 5.5,-10.5",
                fill: 'none',
                stroke:'black',
                strokeWidth: 1
            })
        );

        ns.Diagram.createSharedElement("Relation.CP",
            ns.Element.rect(0, 0, 6, 6, {
                fill: "none",
                strokeWidth: 1,
                stroke: "black",
                shapeRendering: "crispEdges",
                transform: "translate(-3,-3)"
            })
        );
    };

    self._createAttributeElements = function() {
        var gradient = ns.Element.el("linearGradient", { x1: 0, y1: 0, x2: 0, y2: 1 });
        gradient.appendChild(
            ns.Element.el("stop", {
                "stop-color": "#ffffff",
                "offset": "0%"
            })
        );
        gradient.appendChild(
            ns.Element.el("stop", {
                "stop-color": "#eaeaea",
                "offset": "100%"
            })
        );
        ns.Diagram.createSharedElement("Attr.BgGradient", gradient );

        ns.Diagram.createSharedElement("Attr.Bg",
            ns.Element.rect(0, 0, "100%", "100%", {
                stroke: "#5271FF",
                strokeWidth: 1,
                fill: "#eaeaea"
            })
        );
    };

    return self;
})();
