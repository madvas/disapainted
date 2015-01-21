(function() {
  'use strict';

  angular
    .module('canvas')
    .factory('dpCanvasObjects', dpCanvasObjects);

  dpCanvasObjects.$inject = ['dpPaperScope', 'dpCanvas', 'dpCanvasConfig', '$rootScope', '$http', 'dpObjectData'];

  /* @ngInject */
  function dpCanvasObjects(dpPaperScope, dpCanvas, dpCanvasConfig, $rootScope, $http, dpObjectData) {
    var me, objects
      , predefinedObjects = {}
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

    $http.get('modules/canvas/canvas/predefined-objects.json').success(function(res) {
      predefinedObjects = _.mapValues(res, function(obj) {
        return dpObjectData.unpack(obj);
      });
      me.objectTypes = me.objectTypes.concat(_.keys(predefinedObjects));
    });


    objects = {
      Stickman     : createStickman,
      Line         : createLine,
      Circle       : createCircle,
      Picture      : createPicture,
      Text         : createText,
      'Import SVG' : createSVG,
      'Import STK' : createSTK
    };

    me = {
      objectTypes  : _.keys(objects),
      createObject : createObject
    };

    return me;

    ////////////////

    function createObject(objectName, opts) {
      var object;
      if (objects[objectName]) {
        object = objects[objectName](opts);
        setObjectAdditionalData(object);
        c.objects.addChild(object);
        object.position = p.view.center;
        c.createHandles(object);
      } else {
        object = c.importObjects(predefinedObjects[objectName]);
        setObjectAdditionalData(object);
      }

      c.createScales(object);
      c.selectObject(object);
      c.selectPath(object.firstChild);
      c.draw();
    }

    function setObjectAdditionalData(object) {
      object.data = {
        refId        : object.id,
        handleRadius : cfg.handleRadius
      };
      object.selected = c.showAllPaths;
    }

    function setPathAdditionalData(path) {
      _.extend(path.data, {
        movable : true,
        refId   : path.id
      });
      path.style = defaultStyle;
    }

    function createMainPathGroup() {
      var path = new p.Path(new p.Point(0, 0));
      setPathAdditionalData(path);
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

      setPathAdditionalData(path);
      return new p.Group(path);
    }

    function createStickman() {
      var stickmanGroup, lowerBody, lowerBodyPt, upperBody, middleBodyPt, neckPt, leftArm, leftArmPt, leftForearm,
        leftForearmPt, rightArm, rightArmPt, rightForearm, rightForearmPt, leftThigh, leftThighPt, leftCalf, leftCalfPt,
        rightThigh, rightThighPt, rightCalf, rightCalfPt, head, headPt;

      stickmanGroup = createMainPathGroup();
      lowerBodyPt = stickmanGroup.firstChild.lastSegment.point;

      middleBodyPt = [0, -32];
      lowerBody = createNewPathGroup(lowerBodyPt, middleBodyPt);
      middleBodyPt = lowerBody.firstChild.lastSegment.point;
      stickmanGroup.addChild(lowerBody);

      neckPt = [0, -32];
      upperBody = createNewPathGroup(middleBodyPt, neckPt);
      neckPt = upperBody.firstChild.lastSegment.point;
      lowerBody.addChild(upperBody);

      rightArmPt = [27, 27];
      rightArm = createNewPathGroup(neckPt, rightArmPt);
      rightArmPt = rightArm.firstChild.lastSegment.point;
      upperBody.addChild(rightArm);

      rightForearmPt = [20, 35];
      rightForearm = createNewPathGroup(rightArmPt, rightForearmPt);
      rightArm.addChild(rightForearm);

      leftArmPt = [-27, 27];
      leftArm = createNewPathGroup(neckPt, leftArmPt);
      leftArmPt = leftArm.firstChild.lastSegment.point;
      upperBody.addChild(leftArm);

      leftForearmPt = [-20, 35];
      leftForearm = createNewPathGroup(leftArmPt, leftForearmPt);
      leftArm.addChild(leftForearm);

      rightThighPt = [20, 46];
      rightThigh = createNewPathGroup(lowerBodyPt, rightThighPt);
      rightThighPt = rightThigh.firstChild.lastSegment.point;
      stickmanGroup.addChild(rightThigh);

      rightCalfPt = [20, 46];
      rightCalf = createNewPathGroup(rightThighPt, rightCalfPt);
      rightThigh.addChild(rightCalf);

      leftThighPt = [-20, 46];
      leftThigh = createNewPathGroup(lowerBodyPt, leftThighPt);
      leftThighPt = leftThigh.firstChild.lastSegment.point;
      stickmanGroup.addChild(leftThigh);

      leftCalfPt = [-20, 46];
      leftCalf = createNewPathGroup(leftThighPt, leftCalfPt);
      leftThigh.addChild(leftCalf);

      headPt = [0, -40];
      head = createNewPathGroup(neckPt, headPt, {type : 'circle'});
      upperBody.addChild(head);
      return stickmanGroup;
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
      _.extend(text, opts);
      group = createNewPathGroup(text.bounds.bottomLeft, text.bounds.bottomRight, {absolute : true});
      textGroup.firstChild.firstSegment.point = text.bounds.bottomLeft;
      group.firstChild.visible = false;
      group.addChild(text);
      textGroup.addChild(group);
      return textGroup;
    }

    function createSVG(opts) {
      var group
        , svgGroup  = createMainPathGroup();
      svgGroup.importSVG(opts.source);
      group = createNewPathGroup(svgGroup.bounds.bottomLeft, svgGroup.bounds.bottomRight, {absolute : true});
      svgGroup.firstChild.firstSegment.point = svgGroup.bounds.bottomLeft;
      group.firstChild.visible = false;
      group.addChild(svgGroup.children[1]);
      svgGroup.addChild(group);
      return svgGroup;
    }

    function createSTK(opts) {
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
      setPathAdditionalData(path);
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
