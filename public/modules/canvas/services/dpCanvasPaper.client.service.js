(function() {
  'use strict';

  angular
    .module('canvas')
    .factory('dpCanvasPaper', dpCanvasPaper);

  dpCanvasPaper.$inject = ['$rootScope', 'dpCanvasConfig', 'dpPaperScope'];

  /* @ngInject */
  function dpCanvasPaper($rootScope, dpCanvasConfig, dpPaperScope) {
    var me
      , p = dpPaperScope
      , _ = $rootScope
      , handleState = dpCanvasConfig.handleState
      , handleColor = dpCanvasConfig.handleColor;

    me = {
      init : init
    };

    return me;

    ////////////////

    function init() {
      p.Item.inject({
        dpGetRootObjectOfJoinedGroup : function() {
          if (this.parent.dpIsObjectsRoot()) return this;
          return this.parent.dpGetRootObjectOfJoinedGroup();
        },
        dpIs                         : function(className) {
          return _.any(this.parent.children, function(item) {
            return item.getClassName() === className;
          });
        },
        dpScale                      : function(scale, direction, lock, center) {
          var hor = scale, ver = scale;
          if (!lock) {
            ver = direction === 'x' ? 1 : ver;
            hor = direction === 'y' ? 1 : hor;
          }
          this.scale(hor, ver, center);
          if (this.dpScaleStrokeWidth) {
            this.dpScaleStrokeWidth(scale);
          }
        },
        dpSetScaleParams             : function() {
          if (!this.data.scale || !_.isFinite(this.data.scale.x) || !_.isFinite(this.data.scale.y)) {
            this.data.scale = {x : 100, y : 100};
          }
        }
      });

      p.Path.inject({
        dpGetOppositeSegment : function() {
          return this.segments.length === 4 ? this.segments[2] : this.lastSegment;
        },
        dpGetObject          : function() {
          if (this.data.movableRoot) return this.parent;
          return this.parent.parent.firstChild.dpGetObject();
        },
        dpSetState           : function(state, objectIsJoined, forceRadius) {
          if (state === handleState.HIDE || (objectIsJoined && this.data.mainHandle)) {
            this.visible = false;
            return;
          }
          this.visible = true;
          if (state === handleState.JOIN || forceRadius) {
            this.dpSetRadius(dpCanvasConfig.handleRadius);
          } else {
            this.dpSetRadius(this.data.radius);
          }

          state = this.data.joins ? handleState.JOIN : state;
          this.fillColor = handleColor[state][this.data.mainHandle ? 0 : 1];
        },
        dpGetGroupSiblings   : function() {
          return _.rest(this.parent.children);
        },
        dpIsCircle           : function() {
          return this.segments.length === 4;
        },
        dpGetJoinedSiblings  : function() {
          return _.filter(this.dpGetGroupSiblings(), function(group) {
            return group.firstChild && group.firstChild.data.movableRoot;
          });
        },
        dpSetRadius          : function(newRadius, center) {
          var radius = this.bounds.width / 2;
          if (!newRadius) {
            this.visible = false;
            return;
          }
          this.scale(newRadius / radius, center);
          this.visible = true;
        }
      });

      p.Group.inject({
        dpGetObjects       : function() {
          var paths = this.getItems({data : {movableRoot : true}});
          return _.pluck(paths, 'parent');
        },
        dpGetMovablePaths  : function() {
          return this.getItems({data : {movable : true}});
        },
        dpGetOverlapping   : function(rect) {
          return this.getItems({overlapping : rect, data : {mainHandle : true}});
        },
        dpGetTextItem      : function() {
          return this.getItem({'class' : p.PointText});
        },
        dpIsObjectsRoot    : function() {
          return this.name === 'objectsRoot';
        },
        dpGetObjectsRoot   : function() {
          var item = this.getItem({name : 'objectsRoot'});
          if (!item) {
            item = new p.Group();
            item.name = 'objectsRoot';
            this.addChild(item);
          }
          return item;
        },
        dpGetHandlesRoot   : function() {
          return this.getItem({name : 'handlesRoot'});
        },
        dpGetReferencePath : function(path) {
          if (!path) return;
          return this.getItem({data : {refId : path.data.refId}});
        },
        dpChangeOrder      : function(direction) {
          if (this.dpIsObjectsRoot()) return;

          if (!this.data.movableRoot) {
            if (this.parent.dpIsObjectsRoot() || direction === 'bringToFront') {
              this[direction]();
            } else {
              this.moveAbove(this.parent.firstChild);
            }
          }
          this.parent.dpChangeOrder(direction);
        },
        dpScaleStrokeWidth : function(ratio) {
          _.each(this.dpGetMovablePaths(), function(path) {
            path.strokeWidth *= ratio;
          });
        },
        dpReduce           : function() {
          var me = this;
          _.each(_.clone(this.children), function(child) {
            me.parent.addChild(child);
          });
          me.remove();
        },
        dpGetReferenceable : function() {
          return this.getItems({
            data : function(value) {
              return _.isNumber(value.refId);
            }
          });
        },
        dpUpdateReferences : function() {
          this.data.refId = this.id;
          _.each(this.dpGetReferenceable(), function(path) {
            path.data.refId = path.id;
          });
        },
        dpGetStkPathById   : function(id) {
          return this.getItem({
            data : function(value) {
              return value.stkId === id;
            }
          });
        }
      });

      p.Layer.inject({
        dpGetExportableGroup  : function() {
          var item = this.getItem({name : 'exportable'});
          if (!item) {
            item = new p.Group();
            item.name = 'exportable';
          }
          return item;
        },
        dpGetReferenceObjects : function(objects) {
          var me = this;
          objects = _.isArray(objects) ? objects : [objects];
          return _.compact(_.map(objects, function(object) {
            return me.getItem({data : {refId : object.data.refId}});
          }));
        }
      });
    }
  }
})();
