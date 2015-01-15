(function() {
  'use strict';

  angular
    .module('canvas')
    .factory('dpCanvas', dpCanvas);

  dpCanvas.$inject = ['$rootScope', 'dpCanvasConfig', 'dpPaperScope', 'dpCanvasFrames', 'dpObjectData'];

  /* @ngInject */
  function dpCanvas($rootScope, dpCanvasConfig, dpPaperScope, dpCanvasFrames, dpObjectData) {
    /* jshint maxstatements: false */
    var me, groupsToHandle, prevObjectScale, prevPathScale, project, selectedGroupCenter
      , unwatchFuncs = []
      , _ = $rootScope
      , canvasMode = dpCanvasConfig.mode
      , handleState = dpCanvasConfig.handleState
      , p = dpPaperScope
      , f = dpCanvasFrames;

    var d = dpObjectData;

    me = {
      selected                 : {objects : []},
      mode                     : canvasMode.SELECT,
      objectScaleLock          : true,
      pathScaleLock            : true,
      showAllPaths             : false,
      showHandles              : true,
      clipboard                : [],
      onionLayers              : {
        enabled : true,
        count   : 4
      },
      init                     : init,
      initLayers               : initLayers,
      initPlaying              : initPlaying,
      activateLayer            : activateLayer,
      draw                     : draw,
      applyActiveLayer         : applyActiveLayer,
      showOnionLayers          : showOnionLayers,
      selectPath               : selectPath,
      selectObject             : selectObject,
      refreshHandles           : refreshHandles,
      setHandlesState          : setHandlesState,
      joinMode                 : joinMode,
      getPathByHandle          : getPathByHandle,
      isSelectedObjectJoined   : isSelectedObjectJoined,
      changeSelectedOrder      : changeSelectedOrder,
      flipSelected             : flipSelected,
      centerSelected           : centerSelected,
      removeSelected           : removeSelected,
      cloneSelected            : cloneSelected,
      uniteSelected            : uniteSelected,
      copySelected             : copySelected,
      pasteSelected            : pasteSelected,
      importObjects            : importObject,
      setSelectedScale         : setSelectedScale,
      setSelectedStrokeWidth   : setSelectedStrokeWidth,
      setSelectedColor         : setSelectedColor,
      setSelectedPathScale     : setSelectedPathScale,
      objectHandleRadiusChange : objectHandleRadiusChange,
      pathHandleRadiusChange   : pathHandleRadiusChange,
      isObjectSettingVisible   : isObjectSettingVisible,
      isPathSettingVisible     : isPathSettingVisible,
      backgroundChange         : backgroundChange,
      createHandles            : createHandles,
      createScales             : createScales,
      clearCanvas              : clearCanvas,
      destroy                  : destroy
    };

    return me;

    ////////////////

    function init(canvasProject) {
      unwatchFuncs.push($rootScope.$watch(function() {
        return me.onionLayers.enabled;
      }, function(newValue, oldValue) {
        if (!me.background || newValue === oldValue) return;
        me.background.opacity = newValue ? 0.1 : 1;
        showOnionLayers();
      }));

      unwatchFuncs.push($rootScope.$watch(function() {
        return me.showHandles;
      }, function(newValue, oldValue) {
        if (newValue === oldValue) return;
        showHandlesChange();
      }));

      unwatchFuncs.push($rootScope.$watch(function() {
        return me.showAllPaths;
      }, function(newValue, oldValue) {
        if (newValue === oldValue) return;
        showAllPathsChange();
      }));

      project = canvasProject;
      project.activate();
    }

    function initLayers(frames) {
      var handles, background, exportable, objects, layer;
      frames = _.isArray(frames) ? frames : [frames];

      project.activate();
      _.each(frames, function(frame) {
        layer = frame.layer || new p.Layer();
        project.activeLayer.selected = false;
        if (frame.objectData) {
          layer.importJSON(frame.objectData);
        }

        layer.data = {order : frame.order};
        handles = new p.Group();
        handles.name = 'handlesRoot';

        exportable = layer.dpGetExportableGroup();
        background = exportable.dpGetBackground();
        objects = exportable.dpGetObjectsRoot();

        handles.bringToFront();
        background.sendToBack();
        createHandles(objects.children, handles);
        createScales(objects.dpGetObjects());
        layer.addChild(handles);

        background.opacity = 1;
        frame.layer = layer;
      });
    }

    function activateLayer(frame) {
      var layer, refObjects, refPath, refHandle;

      if (!frame.layer || !frame.layer.children.length) {
        initLayers(frame);
      }

      layer = frame.layer;
      layer.activate();
      layer.visible = true;
      layer.opacity = 1;
      me.exportable = layer.dpGetExportableGroup();
      me.objects = me.exportable.dpGetObjectsRoot();
      me.background = me.exportable.dpGetBackground();
      me.background.opacity = me.onionLayers.enabled ? 0.1 : 1;
      me.handles = layer.dpGetHandlesRoot();
      me.handles.visible = me.showHandles;
      if (me.objects.children.length) {
        refObjects = layer.dpGetReferenceObjects(me.selected.objects);
        if (f.prevFrame && refObjects.length) {
          me.selected.objects = refObjects;
          selectObject(refObjects[0]);
          if (me.selected.path) {
            refPath = refObjects[0].dpGetReferencePath(me.selected.path);
            refHandle = getHandleByPath(refPath);
            refHandle.emit('mousedown', {target : refHandle});
          }
        } else {
          selectObject(me.objects.firstChild);
          selectPath(me.objects.firstChild.firstChild);
        }
      }
      showOnionLayers();
    }

    function draw(suppressDirty) {
      p.view.draw();
      applyActiveLayer(suppressDirty);
    }

    function applyActiveLayer(suppressDirty) {
      var activeLayer = project.activeLayer
        , layerClone = activeLayer.clone()
        , currentFrame = f.currentFrame;

      layerClone.dpGetHandlesRoot().visible = false;
      currentFrame.rasterized = layerClone.dpGetDataURL().$object;
      currentFrame.objectData = activeLayer.dpGetExportableGroup().exportJSON({precision : 1, asString : false});
      currentFrame.dirty = suppressDirty ? currentFrame.dirty : true;
      layerClone.remove();
      if (!$rootScope.$$phase) {
        $rootScope.$apply();
      }
    }

    function showOnionLayers() {
      var layers, order;

      deactivateLayers();
      project.activeLayer.visible = true;
      me.objects.selected = me.showAllPaths;

      if (me.selected.path && !me.selected.path.data.movableRoot && me.showHandles) {
        me.selected.path.selected = true;
      }

      if (!me.onionLayers.enabled) {
        draw(true);
        return;
      }
      order = project.activeLayer.data.order;

      layers = _.filter(project.layers, function(layer) {
        return layer.data.order < order;
      });
      layers = _.sortBy(layers, function(layer) {
        return layer.data.order;
      });
      layers = _.last(layers, me.onionLayers.count);
      for (var i = 0; i < layers.length; i++) {
        layers[i].dpGetHandlesRoot().visible = false;
        layers[i].visible = true;
        layers[i].opacity = (i + 0.8) / 10;
        layers[i].dpGetBackground().opacity = 0;
      }
      draw(true);
    }

    function deactivateLayers() {
      var layers = project.layers,
        layersLen = layers.length;
      for (var i = 0; i < layersLen; i++) {
        layers[i].visible = layers[i].selected = false;
      }
    }

    function moveHandles(objects) {
      var handle;
      objects = _.isArray(objects) ? objects : [objects];
      _.each(objects, function(object) {
        _.each(object.dpGetMovablePaths(), function(path) {
          handle = getHandleByPath(path);
          handle.position = path.dpGetOppositeSegment().point;
        });
      });
    }

    function selectPath(path) {
      if (!path) return;
      me.selected.path = path;
      if (!$rootScope.$$phase) {
        $rootScope.$apply();
      }
      if (!me.showAllPaths) {
        me.objects.selected = false;
        me.selected.path.selected = !path.data.movableRoot;
      }
      prevPathScale = _.clone(path.data.scale);
    }

    function selectObject(object) {
      var found = _.findIndex(me.selected.objects, {id : object.id});
      if (!!~found) {
        me.selected.objects[0] = me.selected.objects.splice(found, 1, me.selected.objects[0])[0];
      } else {
        me.selected.objects = [object];
      }

      if (!$rootScope.$$phase) {
        $rootScope.$apply();
      }

      prevObjectScale = _.clone(object.data.scale);
      refreshHandles();
    }

    function getRootObjectsOfSelected() {
      var objects = _.map(me.selected.objects, function(object) {
        return object.dpGetRootObjectOfJoinedGroup();
      });
      return _.uniq(objects, 'id');
    }

    function refreshHandles(forceRadius) {
      setAllHandlesState(handleState.BLUR, forceRadius);
      setHandlesState(me.selected.objects, handleState.SELECTED, forceRadius);
    }

    function setHandlesState(objects, state, forceRadius) {
      objects = _.isArray(objects) ? objects : [objects];
      for (var i = 0; i < objects.length; i++) {
        _.invoke(getObjectHandles(objects[i]), 'dpSetState', state, !objects[i].parent.dpIsObjectsRoot(), forceRadius);
      }
    }

    function setAllHandlesState(state, forceRadius) {
      setHandlesState(me.objects.dpGetObjects(), state, forceRadius);
    }

    function joinMode() {
      var unjoinableObjects;
      me.mode = canvasMode.JOIN;
      if (me.selected.objects[0].parent.dpIsObjectsRoot()) {
        unjoinableObjects = me.selected.objects[0].dpGetObjects();
        setAllHandlesState(handleState.JOIN);
        setHandlesState(unjoinableObjects, handleState.HIDE);
      } else {
        unjoinObjects(me.selected.objects[0]);
        me.mode = canvasMode.SELECT;
      }
      draw();
    }

    function unjoinObjects(objects) {
      var unjoinedHandle;
      objects = _.isArray(objects) ? objects : [objects];
      _.each(objects, function(object) {
        if (object.parent.dpIsObjectsRoot()) return;
        unjoinedHandle = getHandleByPath(object.parent.firstChild);
        me.objects.addChild(object);
        unjoinedHandle.data.joins--;
        unjoinedHandle.sendToBack();
        refreshHandles();
      });
    }

    function getHandleByPath(path) {
      return me.handles.getItem({
        id : path.data.handleId
      });
    }

    function getPathByHandle(handle) {
      return me.objects.getItem({
        data : {
          handleId : handle.id
        }
      });
    }

    function getObjectHandles(object) {
      return me.handles.getItems({
        data : {
          objectId : object.id
        }
      });
    }

    function isSelectedObjectJoined() {
      return !(me.selected.objects[0] && me.selected.objects[0].parent.dpIsObjectsRoot());
    }

    function changeSelectedOrder(direction) {
      var o = me.objects.exportSVG({precision : 3, asString : true});
      me.selected.path.parent.dpChangeOrder(direction);
      _.invoke(_.rest(me.selected.objects), 'dpChangeOrder', direction);
      draw();
    }

    function flipSelected() {
      groupsToHandle = (me.selected.objects.length > 1) ?
        getRootObjectsOfSelected() : [me.selected.objects[0]];

      _.each(groupsToHandle, function(object) {
        object.scale(-1, 1, object.firstChild.firstSegment.point);
        moveHandles(object);
      });

      draw();
    }

    function centerSelected() {
      transformSelectedAsGroup(function(tmpGroup) {
        tmpGroup.position = p.view.center;
      });
      draw();
    }

    function transformSelectedAsGroup(func) {
      var tmpGroup, indexes
        , objects = getRootObjectsOfSelected();

      indexes = _.pluck(objects, 'index');
      tmpGroup = new p.Group(objects);
      me.objects.parent.addChild(tmpGroup);
      func(tmpGroup);
      _.each(_.clone(tmpGroup.children), function(object, key) {
        me.objects.insertChild(indexes[key], object);
      });
      tmpGroup.remove();
      moveHandles(objects);
    }

    function removeSelected() {
      _.each(getRootObjectsOfSelected(), function(object) {
        _.each(object.dpGetObjects(), function(child) {
          _.invoke(getObjectHandles(child), 'remove');
        });
        _.invoke(getObjectHandles(object), 'remove');
        object.remove();
      });
      me.selected.objects = [];
      draw();
    }

    function cloneSelected() {
      var clone;
      _.each(getRootObjectsOfSelected(), function(object) {
        clone = object.clone();
        me.objects.addChild(clone);
        clone.translate([10, 10]);
        clone.dpUpdateReferences();
        createHandles(clone);
      });
      refreshHandles();
      draw();
    }

    function uniteSelected() {
      var mainHandle;
      _.each(getRootObjectsOfSelected(), function(object) {
        _.each(_.rest(object.dpGetObjects()), function(joinedObj) {
          mainHandle = getHandleByPath(joinedObj.firstChild);
          mainHandle.remove();
          joinedObj.firstChild.remove();
          _.each(getObjectHandles(joinedObj), function(handle) {
            handle.data.objectId = object.id;
          });
          _.remove(me.selected.objects, {id : joinedObj.id});
          joinedObj.dpReduce();
        });
        _.each(getObjectHandles(object), function(handle) {
          handle.data.joins = 0;
        });
      });
      refreshHandles();
      draw();
    }

    function copySelected() {
      var exportedObj
        , objects = getRootObjectsOfSelected();
      if (!objects.length) return;
      me.clipboard = _.map(objects, function(object) {
        exportedObj = object.exportJSON({asString : false});
        object.bounds.selected = true;
        draw();
        return exportedObj;
      });
      _.delay(function() {
        _.each(objects, function(object) {
          object.bounds.selected = false;
          object.selected = me.showAllPaths;
        });
        draw();
      }, 100);
    }

    function pasteSelected() {
      if (!me.clipboard.length) return;
      _.each(me.clipboard, function(object) {
        importObject(object);
      });
      refreshHandles();
      draw();
    }

    function importObject(object) {
      var newObject;
      project.activeLayer.importJSON(object);
      newObject = project.activeLayer.lastChild;
      me.objects.addChild(newObject);
      createHandles(newObject);
      return newObject;
    }

    function setSelectedScale(scale, direction) {
      scale = parseInt(scale);
      if (!scale) return;
      var ratio = getScaleRatio(scale, prevObjectScale[direction]);
      _.each(getRootObjectsOfSelected(), function(object) {
        object.dpScale(ratio, direction, me.objectScaleLock);
        moveHandles(object);
        if (me.objectScaleLock) {
          object.data.scale = {x : scale, y : scale};
        }
      });
      draw();
      prevObjectScale = _.clone(me.selected.objects[0].data.scale);
    }

    function setSelectedStrokeWidth(strokeWidth) {
      if (strokeWidth < 0) return;
      _.each(getRootObjectsOfSelected(), function(object) {
        object.strokeWidth = strokeWidth;
      });
      draw();
    }

    function setSelectedColor(type, color, selectedType) {
      var groups = selectedType === 'path' ? [me.selected.path] : getRootObjectsOfSelected();
      _.invoke(groups, 'set' + type + 'Color', color);
      draw();
    }

    function setSelectedPathScale(scale, direction) {
      scale = parseInt(scale);
      if (!scale) return;
      var offset,
        path = me.selected.path,
        ratio = getScaleRatio(scale, prevPathScale[direction]),
        prevPoint = path.dpGetOppositeSegment().point.clone();

      path.dpScale(ratio, direction, me.pathScaleLock, path.firstSegment.point);
      offset = path.dpGetOppositeSegment().point.subtract(prevPoint);
      _.invoke(path.dpGetGroupSiblings(), 'translate', offset);
      moveHandles(path.parent.parent);
      if (me.pathScaleLock) {
        path.data.scale = {
          x : scale,
          y : scale
        };
      }
      draw();
      prevPathScale = _.clone(path.data.scale);
    }

    function objectHandleRadiusChange() {
      var handle,
        newRadius = me.selected.objects[0].firstChild.data.handleRadius;
      _.each(me.selected.objects, function(object) {
        _.each(object.dpGetMovablePaths(), function(path) {
          handle = getHandleByPath(path);
          path.data.handleRadius = handle.data.radius = newRadius;
          handle.dpSetRadius(newRadius);
        });
      });
      draw();
    }

    function pathHandleRadiusChange() {
      var path = me.selected.path
        , handle = getHandleByPath(path);
      handle.data.radius = path.data.handleRadius;
      handle.dpSetRadius(path.data.handleRadius);
      draw();
    }

    function isObjectSettingVisible(setting) {
      var textItem;
      if (!me.selected.objects.length || !me.selected.path) return false;
      if (!me.selected.path.data.movableRoot) return false;
      textItem = me.selected.objects[0].dpGetTextItem();
      return _.contains(['fontFamily', 'fontWeight'], setting) && textItem;
    }

    function isPathSettingVisible(setting) {
      var path = me.selected.path;
      if (!path) return false;
      if (path.data.movableRoot && setting !== 'handleRadius') return false;
      if (setting !== 'handleRadius' && (path.dpIs('Raster') || path.dpIs('PointText'))) return false;
      return !(setting === 'strokeCap' && path.dpIsCircle());
    }

    function getScaleRatio(newScale, prevScale) {
      return 1 + (newScale - prevScale) / 50;
    }

    function showHandlesChange() {
      if (!me.handles) return;
      me.handles.visible = me.showHandles;
      if (me.selected.path && !me.showAllPaths) {
        me.selected.path.selected = me.showHandles;
      }

      draw(true);
    }

    function showAllPathsChange() {
      if (!me.objects) return;
      me.objects.selected = me.showAllPaths;
      selectPath(me.selected.path);
      draw(true);
    }

    function backgroundChange() {
      me.onionLayers.enabled = false;
      me.background.opacity = 1;
      draw();
    }

    function createHandles(objects, handlesGroup) {
      handlesGroup = handlesGroup || me.handles;
      objects = _.isArray(objects) ? objects : [objects];
      _.each(objects, function(object) {
        _.each(object.dpGetMovablePaths(), function(path) {
          path.data.handleRadius = _.isNumber(path.data.handleRadius) ? path.data.handleRadius :
            dpCanvasConfig.handleRadius;
          var handle = new p.Path.Circle({
            data        : {
              mainHandle : path.data.movableRoot,
              objectId   : path.dpGetObject().id,
              joins      : path.dpGetJoinedSiblings().length,
              radius     : path.data.handleRadius
            },
            center      : path.dpGetOppositeSegment().point,
            radius      : 1,
            strokeWidth : 0
          });
          handle.dpSetRadius(path.data.handleRadius);
          path.data.handleId = handle.id;
          bindHandle(handle);
          handlesGroup.addChild(handle);
        });
      });
    }

    function createScales(objects) {
      objects = _.isArray(objects) ? objects : [objects];
      _.each(objects, function(object) {
        object.dpSetScaleParams();
        _.each(object.dpGetMovablePaths(), function(path) {
          path.dpSetScaleParams();
        });
      });
    }

    function clearCanvas() {
      me.handles.removeChildren();
      me.objects.removeChildren();
      me.selected.objects = [];
      me.selected.path = false;
      draw();
    }

    function bindHandle(handle) {
      handle.onMouseDrag = handle.data.mainHandle ? onMainHandleDrag : onHandleDrag;
      handle.onMouseDown = onHandleDown;
      handle.onMouseUp = onHandleUp;
      handle.onDoubleClick = onHandleDoubleClick;
    }

    function initPlaying() {
      var onionEnabled = me.onionLayers.enabled;
      if (f.playing) {
        f.stop();
        return;
      }
      me.showHandles = false;
      me.showAllPaths = false;
      me.onionLayers.enabled = false;
      f.play().then(function() {
        me.showHandles = true;
        me.onionLayers.enabled = onionEnabled;
      });
    }

    function destroy() {
      _.invoke(unwatchFuncs, 'call');
      unwatchFuncs = [];
      project.remove();
    }

    /* Mouse Events */
    function onHandleDown(evt) {
      var handle = evt.target
        , path = getPathByHandle(handle)
        , object = path.dpGetObject();

      groupsToHandle = [];
      selectPath(path);
      me.selected.handle = handle;
      if (me.mode === canvasMode.JOIN) {
        groupsToHandle = [me.selected.objects[0]];
        onMainHandleDrag({point : handle.position});
        path.parent.insertChild(1, me.selected.objects[0]);
        handle.data.joins = handle.data.joins ? handle.data.joins++ : 1;
        groupsToHandle = path.parent;
        handle.bringToFront();
        me.mode = canvasMode.SELECT;
        selectObject(object);
        return;
      }

      selectObject(object);

      if (handle.data.mainHandle) {
        groupsToHandle = getRootObjectsOfSelected();
      } else {
        groupsToHandle = me.selected.path.parent;
      }
    }

    function onMainHandleDrag(evt) {
      var offset = evt.point.subtract(me.selected.objects[0].firstChild.firstSegment.point);

      for (var i = 0; i < groupsToHandle.length; i++) {
        groupsToHandle[i].translate(offset);
        moveHandles(groupsToHandle[i]);
      }
    }

    function onHandleDrag(evt) {
      var firstPoint, lastPoint, oldVector, newVector, angleOffset
        , path = me.selected.path;

      firstPoint = path.firstSegment.point;
      lastPoint = path.dpGetOppositeSegment().point;

      oldVector = lastPoint.subtract(firstPoint);
      newVector = evt.point.subtract(firstPoint);
      angleOffset = oldVector.getDirectedAngle(newVector);

      if (evt.event.shiftKey && !path.dpIsCircle()) {
        path.firstSegment.handleOut = newVector;
        return;
      }

      if (evt.event.altKey) {
        onHandleDragScale(evt, lastPoint, angleOffset);
        return;
      }

      groupsToHandle.rotate(angleOffset, firstPoint);

      if (evt.event.ctrlKey) {
        onHandleDragTranslate(evt, path, firstPoint, lastPoint);
      }

      moveHandles(groupsToHandle);
    }

    function onHandleUp() {
      selectedGroupCenter = false;
    }

    function onHandleDoubleClick(evt) {
      var object = getPathByHandle(evt.target).dpGetObject();
      me.selected.objects = [];
      selectObject(object);
    }

    function onHandleDragTranslate(evt, path, firstPoint, lastPoint) {
      var newRadius, prevPoint, pointOffset;
      if (path.dpIsCircle()) {
        newRadius = evt.point.subtract(firstPoint).length / 2;
        path.dpSetRadius(newRadius, firstPoint);
        prevPoint = lastPoint.clone();
        pointOffset = path.dpGetOppositeSegment().point.subtract(prevPoint);
      } else {
        pointOffset = evt.point.subtract(lastPoint);
        path.dpGetOppositeSegment().point = evt.point;
      }
      _.invoke(me.selected.path.dpGetGroupSiblings(), 'translate', pointOffset);
    }

    function onHandleDragScale(evt, lastPoint, angleOffset) {
      var center, lengthToCenter, newLengthToCenter, ratio;
      transformSelectedAsGroup(function(tmpGroup) {
        if (me.selected.objects.length === 1) {
          center = me.selected.objects[0].firstChild.firstSegment.point;
        } else if (!selectedGroupCenter) {
          center = selectedGroupCenter = tmpGroup.position;
        } else {
          center = selectedGroupCenter;
        }
        lengthToCenter = lastPoint.subtract(center).length;
        newLengthToCenter = evt.point.subtract(center).length;
        ratio = newLengthToCenter / lengthToCenter;
        tmpGroup.rotate(angleOffset, center);
        tmpGroup.dpScale(ratio, 'x', true, center);
      });
    }
  }
})();
