(function() {
  'use strict';

  angular
    .module('users')
    .factory('dpPortraitTool', dpPortraitTool);

  dpPortraitTool.$inject = ['dpPaperScope', '$rootScope'];

  /* @ngInject */
  function dpPortraitTool(dpPaperScope, $rootScope) {
    var me, tool, path, activeLayer
      , cursor = {}
      , _ = $rootScope
      , p = dpPaperScope;

    me = {
      init        : init,
      initCursor  : initCursor,
      strokeColor : '#000',
      strokeWidth : 10,
      mouseLeave  : mouseLeave
    };

    return me;

    ////////////////

    function init() {
      activeLayer = p.project.activeLayer;
      tool = new p.Tool();
      tool.onMouseDown = onMouseDown;
      tool.onMouseDrag = onMouseDrag;
      tool.onMouseUp = onMouseUp;
      tool.onMouseMove = onMouseMove;
      me.initCursor();
    }

    function initCursor() {
      cursor = new p.Shape.Circle();
      cursor.strokeColor = '#000';
      cursor.bringToFront();
    }

    function mouseLeave() {
      cursor.visible = false;
      p.view.draw();
    }

    /* Tool events */
    function onMouseDown(evt) {
      cursor.visible = false;
      path = new p.Path({
        segments    : [evt.point, evt.point.add(0, 0.1)],
        strokeWidth : me.strokeWidth,
        strokeColor : me.strokeColor,
        strokeCap   : 'round'
      });
      activeLayer.getItem({name : 'drawing'}).addChild(path);
    }

    function onMouseDrag(evt) {
      path.add(evt.point);
    }

    function onMouseUp(evt) {
      path.simplify();
      cursor.position = evt.point;
      cursor.visible = true;
    }

    function onMouseMove(evt) {
      var hitResult, color
        , bounds = _.clone(p.view.bounds);
      bounds.height -= 1;
      // Little workaround, because cursor wasn't sometimes disappearing, when left from down
      if (!evt.point.isInside(bounds)) {
        cursor.visible = false;
        return;
      }

      cursor.visible = true;
      cursor.position = evt.point;
      cursor.radius = me.strokeWidth / 2;

      hitResult = activeLayer.hitTest(evt.point);
      if (!hitResult) {
        cursor.strokeColor = '#000';
        return;
      }

      switch (hitResult.type) {
        case 'segment' :
        case 'stroke':
          color = hitResult.item.strokeColor;
          break;
        case 'fill':
          color = hitResult.item.fillColor;
          break;
        case 'pixel':
          color = hitResult.color;
          if (!color.alpha) {
            color = new p.Color(255, 255, 255);
          }
          break;
      }
      cursor.strokeColor = new p.Color(Math.round(1 - color.gray));
    }
  }
})();


