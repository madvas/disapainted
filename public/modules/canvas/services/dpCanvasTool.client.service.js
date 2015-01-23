(function() {
  'use strict';

  angular
    .module('canvas')
    .factory('dpCanvasTool', dpCanvasTool);

  dpCanvasTool.$inject = ['$rootScope', 'dpPaperScope', 'dpCanvas', 'dpCanvasConfig', 'dpCanvasFrames'];

  /* @ngInject */
  function dpCanvasTool($rootScope, dpPaperScope, dpCanvas, dpCanvasConfig, dpCanvasFrames) {
    var tool, me, objectsToSelect, selectionRect, refreshHandlesPressed
      , canvasMode = dpCanvasConfig.mode
      , handleState = dpCanvasConfig.handleState
      , _ = $rootScope
      , c = dpCanvas
      , p = dpPaperScope
      , f = dpCanvasFrames;

    me = {
      init            : init,
      attachKeyEvents : attachKeyEvents,
      detachKeyEvents : detachKeyEvents,
      destroy         : destroy
    };

    return me;

    ////////////////

    function init() {
      tool = new p.Tool();
      me.attachKeyEvents();
      tool.onMouseDown = onMouseDown;
      tool.onMouseDrag = onMouseDrag;
      tool.onMouseUp = onMouseUp;
    }

    function attachKeyEvents() {
      tool.onKeyDown = onKeyDown;
      tool.onKeyUp = onKeyUp;
    }

    function detachKeyEvents() {
      tool.off('keydown');
      tool.off('keyup');
    }

    function onMouseDown() {
      if (c.selected.handle) return;
      selectionRect = new p.Path.Rectangle();
      _.extend(selectionRect, {
        selected : true
      });
      selectionRect.bringToFront();
      c.mode = canvasMode.SELECT;
      c.refreshHandles();
      objectsToSelect = [];
    }

    function onMouseDrag(evt) {
      if (!selectionRect) return;
      var x, y, width, height, rect, object, overlappingHandles;

      x = Math.min(evt.point.x, evt.downPoint.x);
      y = Math.min(evt.point.y, evt.downPoint.y);
      width = Math.abs(evt.point.x - evt.downPoint.x);
      height = Math.abs(evt.point.y - evt.downPoint.y);
      rect = new p.Rectangle(x, y, width, height);

      selectionRect.segments = [
        rect.topLeft,
        rect.topRight,
        rect.bottomRight,
        rect.bottomLeft
      ];

      c.setHandlesState(objectsToSelect, handleState.BLUR);

      objectsToSelect = [];
      overlappingHandles = c.handles.dpGetOverlapping(rect);
      for (var i = 0; i < overlappingHandles.length; i++) {
        object = c.getPathByHandle(overlappingHandles[i]).dpGetRootObjectOfJoinedGroup();
        objectsToSelect = objectsToSelect.concat(object.dpGetObjects());
      }
      objectsToSelect = _.uniq(objectsToSelect, 'id');
      c.setHandlesState(objectsToSelect, handleState.SELECTED);
    }

    function onMouseUp() {
      if (c.selected.handle) {
        c.mode = canvasMode.SELECT;
        c.selected.handle = false;
      } else {
        if (selectionRect) {
          selectionRect.remove();
          selectionRect = false;
        }
        if (!_.isEmpty(objectsToSelect)) {
          $rootScope.$apply(function() {
            c.selected.objects = _.uniq(c.selected.objects.concat(objectsToSelect), 'id');
          });
        }
      }
      c.applyActiveLayer();
    }

    function onKeyDown(evt) {
      /* jshint maxcomplexity: false */
      var dir, step
        , shiftKey = evt.event.shiftKey
        , ctrlKey = evt.event.ctrlKey;

      switch (evt.key) {
        case 'left':
        case 'right':
          $rootScope.$apply(function() {
            f.next(evt.key === 'left' ? -1 : 1);
          });
          break;
        case 'c' :
          if (shiftKey) {
            $rootScope.$apply(function() {
              f.clipboardFrame = f.currentFrame;
            });
          } else if (ctrlKey) {
            c.copySelected();
          } else {
            c.cloneSelected();
          }
          break;
        case 'v':
          if (shiftKey) {
            $rootScope.$apply(function() {
              f.pasteFrame(f.clipboardFrame);
            });
          } else {
            c.centerSelected();
          }
          break;
        case 'f':
          c.flipSelected();
          break;
        case 'j':
          c.joinMode();
          break;
        case 'g':
          c.changeSelectedOrder('bringToFront');
          break;
        case 'h':
          c.changeSelectedOrder('sendToBack');
          break;
        case 'delete':
          c.removeSelected();
          break;
        case 'p':
        case 'o':
          if (c.selected.objects.length) {
            dir = evt.key === 'o' ? 'x' : 'y';
            c.selected.objects[0].data.scale[dir] += shiftKey ? -1 : 1;
            c.setSelectedScale(c.selected.objects[0].data.scale[dir], dir);
          }
          break;
        case 'i':
          if (c.selected.objects.length) {
            step = shiftKey ? -1 : 1;
            c.setSelectedStrokeWidth(c.selected.objects[0].strokeWidth + step);
          }
          break;
        case 'y':
        case 'u':
          if (c.isPathSettingVisible('scale')) {
            dir = evt.key === 'y' ? 'x' : 'y';
            c.selected.path.data.scale[dir] += shiftKey ? -1 : 1;
            c.setSelectedPathScale(c.selected.path.data.scale[dir], dir);
          }
          break;
        case 't':
          if (c.isPathSettingVisible('strokeWidth')) {
            step = shiftKey ? -1 : 1;
            c.selected.path.strokeWidth += step;
          }
          break;
        case 'space':
          evt.event.preventDefault();
          if (c.selected.handle) {
            c.selected.handle.emit('mouseup');
          }
          objectsToSelect = [];
          tool.emit('mouseup');
          $rootScope.$apply(function() {
            f.newFrame();
          });
          break;
        case 'x' :
          if (shiftKey) {
            c.pasteSelected();
          }
          break;
        case 'z' :
          if (shiftKey) {
            c.copySelected();
          }
          break;
        case 'b':
          if (shiftKey) {
            $rootScope.$apply(function() {
              f.pasteFrame(f.frames[f.currentFrameIndex - 1]);
            });
          }
          break;
        case 'w':
          $rootScope.$apply(function() {
            c.onionLayers.enabled = !c.onionLayers.enabled;
          });
          break;
        case 'e':
          $rootScope.$apply(function() {
            c.showHandles = !c.showHandles;
          });
          break;
        case 'r':
          $rootScope.$apply(function() {
            c.showAllPaths = !c.showAllPaths;
          });
          break;
        case 'a':
          c.initPlaying();
          break;
        case 'm':
          if (!refreshHandlesPressed) {
            c.refreshHandles(true);
            refreshHandlesPressed = true;
          }
          break;
      }
    }

    function onKeyUp(evt) {
      /* jshint maxcomplexity: false */

      switch (evt.key) {
        case 'm':
          c.refreshHandles();
          refreshHandlesPressed = false;
          break;
      }
    }

    function destroy() {
      tool.remove();
    }

  }
})();
