(function() {
  'use strict';

  angular
    .module('animations')
    .run(run);

  run.$inject = ['$rootScope', 'AnimsConfig', 'dpPaperScope', '$q', 'dpBrowserType'];

  /* @ngInject */
  function run($rootScope, AnimsConfig, dpPaperScope, $q, dpBrowserType) {
    var p = dpPaperScope
      , _ = $rootScope
      , browser = dpBrowserType.getType()
      , canvasBounds = new p.Rectangle(0, 0, AnimsConfig.canvas.width, AnimsConfig.canvas.height);
    $rootScope.$on('$stateChangeSuccess', function() {
      if (p.projects[0]) {
        p.projects[0].remove();
      }
      if (p.tools[0]) {
        p.tools[0].remove();
      }
    });

    p.Group.inject({
      dpGetBackground : function(bounds) {
        var bgBounds
          , item = this.getItem({name : 'background'});
        if (!item) {
          bgBounds = _.clone(bounds || canvasBounds);
          item = new p.Path.Rectangle(bgBounds);
          item.name = 'background';
          item.strokeWidth = 0;
          this.addChild(item);
        }
        return item;
      }
    });

    /**
     * PaperJS saves raster objects (pictures) as URL to the source image + its modifications.
     * We need to make sure all those images are loaded before frame is rasterized
     */
    p.Layer.inject({
      dpGetDataURL   : function(bounds) {
        var imageLoaded
          , deferred = $q.defer()
          , rasterObjects = this.getItems({'class' : p.Raster});


        deferred.promise.$object = {};
        this.dpGetBackground().opacity = 1;

        imageLoaded = _.after(rasterObjects.length,
          _.bind(_.partial(this.resolveDataURL, deferred, bounds), this));

        _.each(rasterObjects, function(object) {
          if (object.image.complete) {
            imageLoaded();
            return;
          }
          object.image.onload = imageLoaded;
        });

        if (!rasterObjects.length) {
          this.resolveDataURL(deferred, bounds);
        }

        return deferred.promise;
      },
      resolveDataURL : function(deferred, bounds) {
        var raster
          , dataURL
          , subBounds = _.clone(bounds || canvasBounds);
        if (p.view) {
          subBounds.width *= p.view.pixelRatio;
          subBounds.height *= p.view.pixelRatio;
        }
        if (this.strokeBounds.x < 0) {
          subBounds.x -= this.strokeBounds.x;
        }
        if (this.strokeBounds.y < 0) {
          subBounds.y -= this.strokeBounds.y;
        }

        if (bounds && browser !== 'safari') { // Strange Safari bug doesn't rasterise otherwise
          subBounds.x += 1;
          subBounds.y += 1;
        }

        raster = this.rasterize().getSubRaster(subBounds);
        dataURL = raster.toDataURL();
        raster.remove();
        deferred.promise.$object = dataURL;
        deferred.resolve(dataURL);
      }
    });
  }

})();
