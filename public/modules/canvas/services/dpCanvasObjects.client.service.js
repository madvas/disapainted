(function() {
  'use strict';

  angular
    .module('canvas')
    .factory('dpCanvasObjects', dpCanvasObjects);

  dpCanvasObjects.$inject = [
    'dpPaperScope', 'dpCanvas', 'dpCanvasConfig', '$rootScope', '$http', 'dpObjectData', 'AnimsConfig', '$q',
    '$localStorage'
  ];

  /* @ngInject */
  function dpCanvasObjects(dpPaperScope, dpCanvas, dpCanvasConfig, $rootScope, $http, dpObjectData, AnimsConfig, $q,
                           $localStorage) {
    var me, actions
      , stickfigures = {}
      , p = dpPaperScope
      , c = dpCanvas
      , _ = $rootScope
      , cfg = dpCanvasConfig
      , defaultStyle = {
        strokeWidth : 12,
        fillColor   : '#FFF',
        strokeColor : '#000',
        strokeCap   : 'round'
      };

    actions = [
      {
        name    : 'Stickfigure',
        type    : 'Insert',
        text    : 'Choose Stickfigure',
        execute : createStickfigures
      },
      {
        name    : 'Picture',
        type    : 'Insert',
        text    : 'Choose Picture',
        icon    : 'photo',
        execute : _.wrap(createSvg, createObject)
      },
      {
        name    : 'Text',
        type    : 'Insert',
        text    : 'Write Text',
        icon    : 'text-format',
        execute : _.wrap(createText, createObject)
      },
      {
        name    : 'Line',
        type    : 'Draw',
        text    : 'Add new',
        icon    : 'add',
        execute : _.wrap(createLine, createObject)
      },
      {
        name    : 'Circle',
        type    : 'Draw',
        text    : 'Add new',
        icon    : 'add',
        execute : _.wrap(createCircle, createObject)
      },
      {
        name    : 'Import SVG',
        type    : 'Import',
        format  : 'svg',
        execute : _.wrap(createSvg, createObject)
      },
      {
        name    : 'Import STK',
        type    : 'Import',
        format  : 'stk',
        execute : _.wrap(createStk, createObject)
      }
    ];

    me = {
      actions : actions,
      loading : false
    };

    init();
    return me;

    ////////////////

    function init() {
      $q.when(getRecentlyUsed()).then(function(res) {
        stickfigures = _.mapValues(res.data, function(obj) {
          return dpObjectData.unpack(obj);
        });
        _.each(_.keys(stickfigures).reverse(), function(figureName) {
          pushRecentlyUsed(figureName);
        });
        $rootScope.$broadcast('actionsReady');
      });


      $http.get('/api/anims/config/figures').success(function(res) {
        AnimsConfig.canvas.figures = res;
      });
    }

    function getRecentlyUsed() {
      if (_.isEmpty($localStorage.recentlyUsedFigures)) {
        return $http.get('modules/canvas/canvas/predefined-objects.json').success(function(res) {
          $localStorage.recentlyUsedFigures = res;
        });
      }
      return {data : $localStorage.recentlyUsedFigures};
    }

    function createRecentlyUsed(figureName) {
      return {
        name    : figureName,
        type    : 'Recently Used Figures',
        text    : 'Add new',
        execute : createStickfigures
      };
    }

    function saveRecentlyUsed() {
      $localStorage.recentlyUsedFigures = {};
      _.each(_.filter(me.actions, {type : 'Recently Used Figures'}), function(action) {
        $localStorage.recentlyUsedFigures[action.name] = dpObjectData.pack(stickfigures[action.name]);
      });
    }

    function popRecentlyUsed() {
      var lastEntry = _.findLast(me.actions, {type : 'Recently Used Figures'});
      _.remove(me.actions, {name : lastEntry.name});
    }

    function pushRecentlyUsed(figureName) {
      if (!_.any(me.actions, {name : figureName})) {
        me.actions.unshift(createRecentlyUsed(figureName));
        return true;
      }
    }

    function createStickfigures(opts) {
      var object
        , figures = _.isString(opts) ? [opts] : opts.source;
      loadStickfigures(figures).then(function() {
        _.each(figures, function(figureName) {
          object = c.importObject(stickfigures[figureName], true);
          initObject(object);
          if (pushRecentlyUsed(figureName)) {
            popRecentlyUsed();
            saveRecentlyUsed();
          }
        });
      });
    }

    function loadStickfigures(figures) {
      var deferred, promise, allPromises
        , promises = [];
      _.each(figures, function(figureName) {
        if (stickfigures[figureName]) {
          deferred = $q.defer();
          deferred.resolve();
          promises.push(deferred.promise);
        } else {
          me.loading = true;
          promise = $http.get(AnimsConfig.canvas.figuresPath + figureName + '.jsonpack');
          promise.success(function(res) {
            stickfigures[figureName] = dpObjectData.unpack(res);
          });
          promises.push(promise);
        }
      });
      allPromises = $q.all(promises);
      allPromises.then(function() {
        me.loading = false;
      });
      return allPromises;
    }

    function createObject(createFunc, opts) {
      var object;
      object = createFunc(opts);
      c.objects.addChild(object);
      object.position = p.view.center;
      c.createHandles(object);

      initObject(object);
    }

    function initObject(object) {
      object.data = {
        refId        : object.id,
        handleRadius : cfg.handleRadius
      };
      object.selected = c.showAllPaths;
      c.createScales(object);
      c.selectObject(object);
      c.selectPath(object.firstChild);
      c.draw();
    }

    function initPath(path) {
      _.extend(path.data, {
        movable : true,
        refId   : path.id
      });
      path.style = defaultStyle;
    }

    function createMainPathGroup() {
      var path = new p.Path(new p.Point(0, 0));
      initPath(path);
      path.data.movableRoot = true;
      return new p.Group(path);
    }

    function createNewPathGroup(srcPoint, newPoint, opts) {
      var path, center, point;

      opts = opts || {};

      point = opts.absolute ? newPoint : srcPoint.add(newPoint);

      switch (opts.type) {
        case 'circle' :
          newPoint = new p.Point(newPoint);
          center = srcPoint.add(newPoint.divide(2));
          path = new p.Path.Circle({
            center : center,
            radius : newPoint.length / 2
          });
          path.rotate(-90);
          if (opts.rotate) {
            path.rotate(opts.rotate, srcPoint);
          }
          break;
        default:
          path = new p.Path(srcPoint, point);
          break;
      }

      initPath(path);
      return new p.Group(path);
    }

    function createPicture(opts) {
      var group,
        pictureGroup = createMainPathGroup(),
        raster = new p.Raster(opts);
      raster.pivot = raster.bounds.bottomLeft;
      raster.position = pictureGroup.firstChild.firstSegment.point;
      raster.pivot = null;
      group = createNewPathGroup(raster.bounds.bottomLeft, raster.bounds.bottomRight, {absolute : true});
      group.firstChild.visible = false;
      group.addChild(raster);
      pictureGroup.addChild(group);
      return pictureGroup;
    }

    function createLine() {
      var lineGroup = createMainPathGroup();
      lineGroup.addChild(createNewPathGroup(lineGroup.firstChild.lastSegment.point, [100, 0]));
      return lineGroup;
    }

    function createCircle() {
      var circleGroup = createMainPathGroup();
      circleGroup.addChild(createNewPathGroup(circleGroup.firstChild.firstSegment.point, [0, -100], {type : 'circle'}));
      return circleGroup;
    }

    function createText(opts) {
      var group, textGroup = createMainPathGroup(),
        text = new p.PointText([0, 0]);
      text.fontSize = 30;
      text.content = opts.source;
      group = createNewPathGroup(text.bounds.bottomLeft, text.bounds.bottomRight, {absolute : true});
      textGroup.firstChild.firstSegment.point = text.bounds.bottomLeft;
      group.firstChild.visible = false;
      group.addChild(text);
      textGroup.addChild(group);
      return textGroup;
    }

    function createSvg(opts) {
      var group
        , svgGroup = createMainPathGroup();
      svgGroup.importSVG(opts.source);
      group = createNewPathGroup(svgGroup.bounds.bottomLeft, svgGroup.bounds.bottomRight, {absolute : true});
      svgGroup.firstChild.firstSegment.point = svgGroup.bounds.bottomLeft;
      group.firstChild.visible = false;
      group.addChild(svgGroup.children[1]);
      svgGroup.addChild(group);
      return svgGroup;
    }

    function createStk(opts) {
      var dataview, parent, limbCount, offset
        , limbs = []
        , stkGroup = createMainPathGroup();
      dataview = new DataView(opts.source);
      limbCount = dataview.getUint8(1);
      for (var i = 0; i < limbCount; i++) {
        offset = (i * 24) + 2;
        limbs.push({
          parent      : dataview.getUint8(offset),
          id          : dataview.getUint8(offset + 1),
          length      : dataview.getFloat32(offset + 4, true),
          angle       : dataview.getFloat64(offset + 8, true) * (180 / Math.PI),
          strokeWidth : dataview.getFloat32(offset + 16, true),
          isCircle    : dataview.getUint8(offset + 20),
          isStatic    : dataview.getUint8(offset + 21)
        });
      }
      limbs = _.sortBy(limbs, 'parent');
      _.each(limbs, function(limb) {
        if (stkGroup.dpGetStkPathById(limb.id)) return;
        if (limb.parent === 0) {
          stkGroup.addChild(createStkGroup(stkGroup.firstChild.lastSegment.point, limb));
        } else {
          createStkLimb(limb, limbs, stkGroup);
        }
      });
      return stkGroup;
    }

    function createStkLimb(limb, limbs, stkGroup) {
      var limbGroup
        , parent = stkGroup.dpGetStkPathById(limb.parent);
      if (!parent) {
        parent = createStkLimb(_.find(limbs, {id : limb.parent}), limbs, stkGroup);
      }
      limbGroup = createStkGroup(parent.dpGetOppositeSegment().point, limb);
      parent.parent.addChild(limbGroup);
      return limbGroup.firstChild;
    }

    function createStkGroup(srcPoint, limb) {
      var path, center
        , point = new p.Point({
          length : limb.length,
          angle  : limb.angle
        });

      if (!limb.isCircle) {
        point = point.add(srcPoint);
        path = new p.Path(srcPoint, point);
      } else {
        center = srcPoint.add(point.divide(2));
        path = new p.Path.Circle({
          center : center,
          radius : limb.length / 2
        });
        path.rotate(limb.angle);
      }
      initPath(path);
      path.strokeWidth = limb.strokeWidth;
      path.data.stkId = limb.id;

      if (limb.isStatic) {
        path.data.handleRadius = 0;
      } else if (limb.strokeWidth <= 4) {
        path.data.handleRadius = 4;
      } else if (limb.strokeWidth === 5) {
        path.data.handleRadius = 5;
      } else {
        path.data.handleRadius = cfg.handleRadius;
      }
      return new p.Group(path);
    }
  }
})();
