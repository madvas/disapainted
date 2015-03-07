'use strict';

var AppConfig = (function() {
  var appModuleName = 'disapainted'
    , appModuleVendorDependencies = [
      'ngAnimate',
      'ngMessages',
      'ui.router',
      'ui.bootstrap',
      'ui.utils',
      'restangular',
      'angular-lodash',
      'ngStorage',
      'ngMaterial',
      'djds4rce.angular-socialshare',
      'colorpicker.module',
      'ngToast',
      'yaru22.angular-timeago',
      'angulartics',
      'angulartics.google.analytics',
      'angularFileUpload'
    ];

  var registerModule = function(moduleName, dependencies) {
    angular.module(moduleName, dependencies || []);
    angular.module(appModuleName).requires.push(moduleName);
  };

  return {
    appModuleName               : appModuleName,
    appModuleVendorDependencies : appModuleVendorDependencies,
    registerModule              : registerModule
  };
})();

'use strict';

//Start by defining the main module and adding the module dependencies
angular.module(AppConfig.appModuleName, AppConfig.appModuleVendorDependencies);

//Then define the init function for starting up the application
angular.element(document).ready(function() {
	//Fixing facebook bug with redirect
	if (window.location.hash === '#_=_') window.location.hash = '#!';
	angular.bootstrap(document, [AppConfig.appModuleName]);
});

'use strict';

AppConfig.registerModule('animations');

'use strict';

AppConfig.registerModule('canvas');

'use strict';

AppConfig.registerModule('core');

'use strict';

AppConfig.registerModule('users');

(function() {
  'use strict';

  angular
    .module('animations')
    .controller('CommentsAnimationController', CommentsAnimationController);

  CommentsAnimationController.$inject = ['$scope', '$localStorage', 'AnimsConfig', '$analytics'];

  /* @ngInject */
  function CommentsAnimationController($scope, $localStorage, AnimsConfig, $analytics) {
    /* jshint validthis: true */
    var vm = this
      , unwatchFuncs = []
      , _ = $scope
      , current = $scope.current
      , auth = $scope.auth;
    vm.sortOptions = [
      {
        name  : 'Top comments',
        value : '-likesCount'
      },
      {
        name  : 'Newest first',
        value : '-dateCreation'
      }
    ];

    vm.commentsStorage = $localStorage.$default({
      comments : {
        sort : vm.sortOptions[0].value
      }
    }).comments;

    vm.activate = activate;
    vm.sortChange = sortChange;
    vm.getComments = getComments;
    vm.addComment = addComment;
    vm.deleteComment = deleteComment;
    vm.likeComment = likeComment;
    vm.showMore = showMore;
    activate();

    ////////////////

    function activate() {
      unwatchFuncs.push($scope.$watch('current.anim', function(anim) {
        if (_.isEmpty(anim)) return;
        current.anim.comments = getComments(0).$object;
      }));
      $scope.$on('$destroy', destroy);
    }

    function sortChange() {
      current.anim.comments = getComments(0).$object;
    }

    function showMore() {
      getComments(current.anim.comments.length).then(function(comments) {
        current.anim.comments = current.anim.comments.concat(comments);
      });
    }

    function getComments(offset) {
      vm.loading = true;
      var promise = current.anim.getList('comments', {sort : vm.commentsStorage.sort, offset : offset});
      promise.then(function(comments) {
        vm.allLoaded = comments.length < AnimsConfig.commentsPageSize;
        vm.loading = false;
      });
      return promise;
    }

    function addComment(childScope) {
      var msg = vm.message,
        newComment = {
          message      : msg,
          dateCreation : Date.now(),
          creator      : auth.user._id,
          likes        : []
        };
      current.anim.comments.unshift(newComment);
      vm.message = '';
      childScope.commentForm.$setPristine();
      current.anim.post('comments', {message : msg}).then(function(res) {
        newComment._id = res._id;
        $analytics.eventTrack('comment-add', {
          category : auth.user._id,
          label    : res._id
        });
      }, function() {
        current.anim.comments.shift();
        vm.message = msg;
      });
    }

    function deleteComment(comment) {
      var index = _.findIndex(current.anim.comments, {_id : comment._id});
      current.anim.comments.splice(index, 1);
      current.anim.one('comments', comment._id).remove().then(function() {
        $analytics.eventTrack('comment-delete', {
          category : auth.user._id,
          label    : comment._id
        });
      }, function() {
        current.anim.comments.splice(index, 0, comment);
      });
    }

    function likeComment(comment) {
      var action = 'like',
        liked = comment.likes.indexOf(auth.user._id);
      if (!!~liked) {
        comment.likes.splice(liked, 1);
        action = 'unlike';
      } else {
        comment.likes.push(auth.user._id);
      }

      current.anim.one('comments', comment._id).post(action, {}).then(function() {
        $analytics.eventTrack('comment-' + action, {
          category : auth.user._id,
          label    : comment._id
        });
      }, function() {
        if (!!~liked) {
          comment.likes.push(auth.user._id);
        } else {
          comment.likes.pop();
        }
      });
    }

    function destroy() {
      _.invoke(unwatchFuncs, 'call');
    }

  }
})();


(function() {
  'use strict';

  angular
    .module('animations')
    .run(run);

  run.$inject = ['dpResource'];

  /* @ngInject */
  function run(dpResource) {
    dpResource.clear();
  }

})();

(function() {
  'use strict';

  angular
    .module('animations')
    .run(run);

  run.$inject = ['$rootScope', 'AnimsConfig', 'dpPaperScope', 'dpBrowserType'];

  /* @ngInject */
  function run($rootScope, AnimsConfig, dpPaperScope, dpBrowserType) {
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

    p.Layer.inject({
      dpGetDataURL   : function(bounds) {
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
        return dataURL;
      }
    });
  }

})();

(function() {
  'use strict';

  angular
    .module('animations')
    .config(configure);

  configure.$inject = ['$stateProvider'];

  /* @ngInject */
  function configure($stateProvider) {
    $stateProvider
      .state('animations', {
        abstract     : true,
        url          : '/animations',
        controller   : 'ViewAnimationController',
        controllerAs : 'vm',
        templateUrl  : 'modules/animations/view/view-anim.client.view.html'
      })
      .state('animations.list', {
        abstract : true,
        views    : {
          list : {
            controller   : 'ListAnimationsController',
            controllerAs : 'vm',
            templateUrl  : 'modules/animations/list/list-anims.client.view.html'
          },
          ''   : {
            template : '<div data-ui-view></div>'
          }
        }
      })
      .state('animations.list.content', {
        url          : '/:animId',
        controller   : 'ContentAnimationController',
        controllerAs : 'vm',
        templateUrl  : 'modules/animations/view/content-anim.client.view.html'
      });
  }
})();

(function() {
  'use strict';

  angular
    .module('animations')
    .directive('dpAnimHref', dpAnimHref);

  dpAnimHref.$inject = [];

  /* @ngInject */
  function dpAnimHref() {
    var canvasPath = 'canvas/'
      , animsPath = 'animations/'
      , directive = {
        link     : link,
        restrict : 'A'
      };
    return directive;

    function link(scope, el, attr) {
      attr.$observe('dpAnimHref', function(id) {
        var basePath = attr.dpCanvasHref === 'true' ? canvasPath : animsPath;
        if (id) attr.$set('href', basePath + attr.dpAnimHref);
      });
    }
  }
})();

(function() {
  'use strict';

  angular
    .module('animations')
    .directive('dpAnimLoader', dpAnimLoader);

  dpAnimLoader.$inject = ['AnimsConfig', '$window', '$rootScope'];

  /* @ngInject */
  function dpAnimLoader(AnimsConfig, $window, $rootScope) {
    var directive
      , _ = $rootScope
      , ratio = AnimsConfig.canvas.height / AnimsConfig.canvas.width
      , styles = ['md-primary', 'md-accent', 'md-warn'];

    directive = {
      link     : link,
      restrict : 'A',
      transclude : true,
      template : '<div layout="column" layout-align="center center" class="anim-loading-wrap">' +
        '<md-progress-circular md-mode="indeterminate"></md-progress-circular>' +
        '<span class="font-sm mar-top-10" data-ng-transclude></span>' +
        '</div>'
    };
    return directive;

    function link(scope, el) {
      angular.element($window).bind('resize', _.partial(setElHeight, el));
      setElHeight(el);
      el.find('md-progress-circular').removeClass(styles.join(' ')).addClass(styles[_.random(styles.length - 1)]);
    }

    function setElHeight(el) {
      var width = el.prop('clientWidth') || AnimsConfig.canvas.width;
      el.css('height', (width * ratio) + 'px');
    }
  }
})();

(function() {
  'use strict';

  angular
    .module('animations')
    .filter('dpRasterize', dpRasterize);

  dpRasterize.$inject = ['$rootScope'];

  /* @ngInject */
  function dpRasterize($rootScope) {
    var _ = $rootScope
      , emptyFrame = 'dist/thumbnails/anims/anims_tpl.png';

    return function(frame) {
      if (_.isEmpty(frame) || _.isEmpty(frame.rasterized)) {
        return emptyFrame;
      }

      return frame.rasterized.substring(0, 4) === 'data' ? frame.rasterized :
        'data:image/png;base64,' + frame.rasterized;
    };
  }
})();

(function() {
  'use strict';

  angular
    .module('animations')
    .controller('ListAnimationsController', ListAnimationsController);

  ListAnimationsController.$inject = [
    '$scope', '$localStorage', 'AnimsConfig', 'Restangular', 'dpResource', '$anchorScroll', '$location', '$analytics'
  ];

  /* @ngInject */
  function ListAnimationsController($scope, $localStorage, AnimsConfig, Restangular, dpResource, $anchorScroll,
                                    $location, $analytics) {
    /* jshint validthis: true */
    var vm = this
      , unwatchFuncs = []
      , _ = $scope;

    vm.sortOptions = [
      {
        name  : 'Most Awesome Animations',
        value : 'likes/0'
      },
      {
        name  : 'Awesome Animations last day',
        value : 'likes/1'
      },
      {
        name  : 'Awesome Animations last week',
        value : 'likes/7'
      },
      {
        name  : 'Awesome Animations last month',
        value : 'likes/30'
      },
      {
        name  : 'Recent Animations',
        value : 'recent'
      },
      {
        name  : 'Random Animations',
        value : 'random'
      },
      {
        name  : 'More from ...',
        value : 'user/'
      }
    ];

    vm.totalItems = 0;
    vm.listPageSize = AnimsConfig.listPageSize;

    vm.listStorage = $localStorage.$default({
      list : {
        sort : vm.sortOptions[0].value,
        page : 1
      }
    }).list;

    vm.activate = activate;
    vm.getList = getList;
    vm.changeList = changeList;
    activate();

    ////////////////

    function activate() {
      unwatchFuncs.push($scope.$watch('current.creator', function(user) {
        if (_.isEmpty(user)) return;
        vm.sortOptions[6].value = 'user/' + user._id;
        vm.sortOptions[6].name = 'More from ' + user._id;
        if (!!~vm.listStorage.sort.indexOf('user')) {
          vm.listStorage.sort = vm.sortOptions[6].value;
          getList();
        }
      }));
      $scope.$on('$destroy', destroy);

      if (!~vm.listStorage.sort.indexOf('user')) {
        getList();
      } else {
        vm.listStorage.sort = 'user/';
      }
    }

    function getList() {
      vm.loading = true;
      vm.anims = [];
      Restangular.all('list/anims/' + vm.listStorage.sort)
        .getList({page : vm.listStorage.page, limit : AnimsConfig.listPageSize}).then(function(anims) {
          vm.loading = false;
          vm.anims = anims;
          dpResource.set(anims);
          vm.pageCount = anims.meta.pageCount;
          vm.totalCount = anims.meta.totalCount;
          $analytics.eventTrack('listAnims', {
            category : vm.listStorage.sort,
            label    : vm.listStorage.page
          });
        });
    }

    function changeList() {
      if (!vm.listStorage.page || vm.listStorage.page < 1 || vm.listStorage.page > vm.pageCount) return;
      $location.hash('top-list');
      $anchorScroll();
      getList();
    }

    function destroy() {
      _.invoke(unwatchFuncs, 'call');
    }

  }
})();

(function() {
  'use strict';

  angular
    .module('animations')
    .factory('dpGifEncoder', dpGifEncoder);

  dpGifEncoder.$inject = ['$rootScope', 'AnimsConfig', '$window', '$q', '$stateParams'];

  /* @ngInject */
  function dpGifEncoder($rootScope, AnimsConfig, $window, $q, $stateParams) {
    var me, ctx
      , _ = $rootScope
      , height = AnimsConfig.canvas.height
      , width = AnimsConfig.canvas.width
      , worker = new Worker('modules/animations/workers/dpGifEncoder.client.worker.js')
      , canvas = angular.element('<canvas/>')
      , lastReq = {};

    canvas.css('display', 'none');
    canvas[0].width = width;
    canvas[0].height = height;

    ctx = canvas[0].getContext('2d');
    ctx.fillStyle = 'rgb(255,255,255)';

    me = {
      encode        : encode,
      progressValue : 0
    };

    return me;

    ////////////////

    function encode(frames, delays) {
      var imageData = []
        , deferred = $q.defer()
        , imgPromises = [];

      if (lastReq.animId === $stateParams.animId && lastReq.gif) {
        deferred.resolve(lastReq.gif);
        return deferred.promise;
      }

      me.progressValue = 0;
      lastReq = {
        animId : $stateParams.animId,
        gif    : false
      };

      _.each(frames, function(frame) {
        var imgDeferred = $q.defer()
          , img = new Image();

        img.src = frame.rasterized;
        img.addEventListener('load', function(e) {
          imgDeferred.resolve(e.target);
        });
        imgPromises.push(imgDeferred.promise);
        imgDeferred.promise.then(function(image) {
          ctx.clearRect(0, 0, width, height);
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(image, 0, 0);
          imageData.push({
            order : frame.order,
            data  : ctx.getImageData(0, 0, width, height).data
          });
        });
      });


      worker.addEventListener('message', function(msg) {
        switch (msg.data.type) {
          case 'progress' :
            me.progressValue = msg.data.value;
            break;
          case 'result' :
            var dataUrl = $window.btoa(msg.data.value)
              , gif = 'data:image/gif;base64,' + dataUrl;
            if (dataUrl.length <= 5) {
              deferred.reject('Generated gif was too short');
            } else {
              deferred.resolve(gif);
              lastReq.gif = gif;
            }
            break;
        }

      }, false);

      worker.addEventListener('error', function(err) {
        deferred.reject(err.message);
      }, false);

      $q.all(imgPromises).then(function() {
        imageData = _.pluck(_.sortBy(imageData, 'order'), 'data');
        worker.postMessage([imageData, delays, width, height]);
      });


      return deferred.promise;
    }
  }
})();

(function() {
  'use strict';

  angular
    .module('animations')
    .factory('dpObjectData', dpObjectData);

  dpObjectData.$inject = ['$rootScope', 'dpPaperScope', 'jsonpack'];

  /* @ngInject */
  function dpObjectData($rootScope, dpPaperScope, jsonpack) {
    var me
      , _ = $rootScope
      , p = dpPaperScope;

    me = {
      unpackFrames : unpackFrames,
      pack         : pack,
      unpack       : unpack,
      rasterize    : rasterize
    };

    return me;

    ////////////////

    function unpackFrames(frames) {
      _.each(frames, function(frame) {
        if (frame.objectData) {
          frame.objectData = unpack(frame.objectData);
        }
      });
    }

    function unpack(objectData) {
      return jsonpack.unpack(objectData);
    }

    function pack(objectData) {
      objectData = clearDataProperties(objectData);
      return jsonpack.pack(jsonpack.JSON.stringify(objectData));
    }

    function rasterize(frames) {
      var project = new p.Project();

      _.each(frames, function(frame) {
        project.activeLayer.importJSON(frame.objectData);
        frame.rasterized = project.activeLayer.dpGetDataURL();
        project.activeLayer.removeChildren();
      });
      project.remove();
    }

    function clearDataProperties(objectData) {
      recurseObjectData(objectData, function(obj) {
        if (obj.data) {
          delete obj.data.handleId;
          delete obj.data.scale;
          delete obj.data.stkId;
        }
      });
      return objectData;
    }

    function recurseObjectData(object, iterator) {
      function recurse(obj) {
        if (_.isArray(obj)) {
          recurse(obj[1]);
        } else if (obj.children) {
          _.each(obj.children, function(child) {
            iterator(child[1]);
            recurse(child[1]);
          });
        }
      }

      recurse(object);
    }
  }
})();

(function() {
  'use strict';

  angular
    .module('animations')
    .factory('dpPaperScope', dpPaperScope);

  dpPaperScope.$inject = ['paper'];

  /* @ngInject */
  function dpPaperScope(paper) {
    var me = {}
      , paperScope = new paper.PaperScope();

    paperScope.install(me);
    me.paperScope = paperScope;
    return me;

    ////////////////

  }
})();

(function() {
  'use strict';

  angular
    .module('animations')
    .factory('dpPlayer', dpPlayer);

  dpPlayer.$inject = ['$rootScope', '$localStorage', '$timeout'];

  /* @ngInject */
  function dpPlayer($rootScope, $localStorage, $timeout) {
    var me
      , _ = $rootScope
      , settings = $localStorage.$default({
        player : {
          speed     : 5,
          repeat    : false,
          backwards : false
        }
      }).player;

    me = {
      currentFrame : 0,
      frames       : {},
      settings     : settings,
      init         : init,
      next         : next,
      play         : play,
      stop         : stop,
      lastFrame    : lastFrame,
      getDelays    : getDelays
    };

    return me;

    ////////////////

    function init() {
      me.currentFrame = 0;
      me.frames = {};
    }

    function next(step) {
      step = me.settings.backwards ? -step : step;

      if (step < 0) {
        if (me.currentFrame > 0) {
          me.currentFrame += step;
        } else if (me.settings.repeat) {
          me.currentFrame = me.lastFrame();
        } else {
          stop();
          return;
        }
      } else {
        if (me.currentFrame < me.lastFrame()) {
          me.currentFrame += step;
        } else if (me.settings.repeat) {
          me.currentFrame = 0;
        } else {
          stop();
          return;
        }
      }
      playNext();
    }

    function playNext(instant) {
      if (me.playing) {
        var delay = instant ? 0 : getDelay()
          , frame = me.frames[me.currentFrame];
        if (frame) {
          $timeout(_.partial(me.next, 1), delay * me.frames[me.currentFrame].repeat);
        } else {
          stop();
        }
      }
    }

    function play() {
      if (!me.playing) {
        if (me.currentFrame === me.lastFrame() && !me.settings.backwards) {
          me.currentFrame = 0;
        } else if (me.currentFrame === 0 && me.settings.backwards) {
          me.currentFrame = me.lastFrame();
        }
      }
      me.playing = !me.playing;
      playNext(true);
    }

    function stop() {
      me.playing = false;
    }

    function lastFrame() {
      return _.keys(me.frames).length - 1;
    }

    function getDelay() {
      return (11 - me.settings.speed) * 50 - ((11 - me.settings.speed) * 15);
    }

    function getDelays() {
      return _.map(me.frames, function(frame) {
        return getDelay() * frame.repeat;
      });
    }

  }
})();

(function() {
  'use strict';

  angular
    .module('animations')
    .factory('dpResource', dpResource);

  dpResource.$inject = [
    '$rootScope', 'Restangular', '$localStorage', '$sessionStorage', '$q', 'AnimsConfig', 'dpObjectData',
    '$interval'
  ];

  /* @ngInject */
  function dpResource($rootScope, Restangular, $localStorage, $sessionStorage, $q, AnimsConfig, dpObjectData,
                      $interval) {
    var me
      , _ = $rootScope;
    $sessionStorage.anims = $sessionStorage.anims || {};
    $sessionStorage.users = $sessionStorage.users || {};

    me = {
      'get'     : get,
      'set'     : set,
      add       : add,
      getFrames : getFrames,
      clear     : clear
    };

    init();
    return me;

    ////////////////

    function init() {
      $interval(function() {
        $sessionStorage.users = {};
      }, 900000); // Wipe users cache every 15 minutes
    }

    function get(id, type) {
      type = type || 'anims';
      var item = $sessionStorage[type][id];
      if (item) {
        var deferred = $q.defer();
        item = Restangular.restangularizeElement(null, item, type);
        deferred.resolve(item);
        return _.extend(deferred.promise, {$object : item});
      }
      item = Restangular.one(type, id).get();
      $sessionStorage[type][id] = item.$object;
      return item;

    }

    function add(items, type) {
      items = _.isArray(items) ? items : [items];
      _.merge($sessionStorage[type || 'anims'], _.indexBy(items, '_id'));
    }

    function set(items, type) {
      $sessionStorage[type || 'anims'] = _.indexBy(items, '_id');
    }

    function getFrames(anim, edit) {
      var frames = {}
        , promises = []
        , allPromises
        , pageSize = AnimsConfig.framesPageSize
        , route = edit ? 'edit/frames' : 'frames';

      $localStorage.frames = $localStorage.frames || {};

      _.times(Math.ceil(anim.framesCount / pageSize), function(n) {
        var promise = anim.getList(route, {offset : n * pageSize});
        promise.then(function(loadedFrames) {
          _.extend(frames, _.indexBy(loadedFrames, 'order'));
          return dpObjectData.unpackFrames(loadedFrames, frames);
        });
        promises.push(promise);
      });

      allPromises = $q.all(promises);
      allPromises.then(function() {
        _.each(frames, function(frame, key) {
          if (!frame.objectData) {
            frames[key].objectData = frames[frame.order - 1].objectData;
          }
          return frame;
        });
        dpObjectData.rasterize(frames);
      });
      allPromises.$object = frames;
      return allPromises;
    }

    function clear() {
      $sessionStorage.anims = {};
      $sessionStorage.users = {};
    }
  }
})();

(function() {
  'use strict';

  angular
    .module('animations')
    .controller('ContentAnimationController', ContentAnimationController);

  ContentAnimationController.$inject = [
    '$scope', '$location', 'dpResource', '$state', '$stateParams', '$anchorScroll',
    'dpPlayer', '$analytics', '$mdDialog', '$window'
  ];

  /* @ngInject */
  function ContentAnimationController($scope, $location, dpResource, $state, $stateParams, $anchorScroll, dpPlayer,
                                      $analytics, $mdDialog, $window) {
    /* jshint validthis: true */
    var vm = this;

    vm.current = $scope.current;
    vm.auth = $scope.auth;
    vm.player = dpPlayer;
    vm.absUrl = $location.absUrl().split('#')[0];
    vm.activate = activate;
    vm.getShareText = getShareText;
    vm.likeAnim = likeAnim;
    vm.gifDialog = gifDialog;
    vm.isWorkerSupported = isWorkerSupported;
    activate();

    ////////////////

    function activate() {
      $location.hash('top');
      $anchorScroll();

      vm.player.init();
      vm.loading = true;

      dpResource.get($stateParams.animId).then(function(anim) {
        var promise = dpResource.getFrames(anim);
        vm.current.anim = anim;
        vm.player.frames = promise.$object;
        promise.then(function() {
          vm.loading = false;
        });
        dpResource.get(anim.creator, 'users').then(function(user) {
          vm.current.creator = user;
        });
      });
    }

    function getShareText() {
      if (vm.current.anim) {
        return 'Animation: ' + vm.current.anim.title;
      }
    }

    function likeAnim() {
      var like = 1, action = 'like';
      if (!vm.auth.user) {
        $state.go('userForm.signin');
        return;
      }
      if (vm.current.anim.liked) {
        like = -like;
        action = 'unlike';
      }
      vm.current.anim.likesCount += like;
      vm.current.creator.likesCount += like;
      vm.current.anim.liked = !!~like;
      vm.current.anim.post(action, {}).then(function() {
        $analytics.eventTrack('anim-' + action, {
          category : vm.auth.user._id,
          label    : vm.current.anim._id
        });
      }, function() {
        vm.current.anim.likesCount += -like;
        vm.current.creator.likesCount += -like;
        vm.current.anim.liked = !vm.current.anim.liked;
      });
    }

    function gifDialog(evt) {
      $mdDialog.show({
        controller   : 'GifAnimController',
        controllerAs : 'vm',
        templateUrl  : 'modules/animations/view/dialogs/gif-anim.client.view.html',
        targetEvent  : evt,
        hasBackdrop  : false
      });
    }

    function isWorkerSupported() {
      return !!$window.Worker;
    }

  }
})();


(function() {
  'use strict';

  angular
    .module('canvas')
    .controller('GifAnimController', GifAnimController);

  GifAnimController.$inject = [
    '$mdDialog', 'dpPlayer', 'dpGifEncoder', 'dpToast', '$analytics', 'Authentication', '$stateParams'
  ];

  /* @ngInject */
  function GifAnimController($mdDialog, dpPlayer, dpGifEncoder, dpToast, $analytics, Authentication, $stateParams) {
    /* jshint validthis: true */
    var vm = this
      , animId = $stateParams.animId
      , userId = Authentication.user._id;

    vm.answer = answer;
    vm.dpGifEncoder = dpGifEncoder;
    vm.framesCount = dpPlayer.lastFrame() + 1;
    activate();

    ////////////////

    function activate() {
      vm.loading = true;
      dpGifEncoder.encode(dpPlayer.frames, dpPlayer.getDelays()).then(function(imgData) {
        vm.gif = imgData;
        vm.loading = false;
        $analytics.eventTrack('gif-success', {
          category : userId,
          label    : animId
        });
      }, function(err) {
        dpToast.danger('Sorry, I was unable to generate gif from this animation');
        $analytics.eventTrack('gif-err', {
          category : animId,
          label    : err
        });
        answer();
      });
    }

    function answer() {
      $mdDialog.hide();
    }

  }
})();

(function() {
  'use strict';

  angular
    .module('animations')
    .controller('ViewAnimationController', ViewAnimationController);

  ViewAnimationController.$inject = ['$scope', 'Authentication'];

  /* @ngInject */
  function ViewAnimationController($scope, Authentication) {
    /* jshint validthis: true */
    var vm = this;
    $scope.auth = Authentication;
    $scope.current = {};

    ////////////////
  }
})();

(function() {
  'use strict';

  angular
    .module('canvas')
    .controller('CanvasController', CanvasController);

  CanvasController.$inject = [
    '$scope', 'Authentication', 'dpResource', '$stateParams', '$state', 'dpCanvas',
    'dpCanvasObjects', 'dpCanvasTool', 'dpCanvasConfig', 'dpCanvasFrames', '$mdDialog', '$analytics', 'dpToast'
  ];

  /* @ngInject */
  function CanvasController($scope, Authentication, dpResource, $stateParams, $state, dpCanvas, dpCanvasObjects,
                            dpCanvasTool, dpCanvasConfig, dpCanvasFrames, $mdDialog, $analytics, dpToast) {
    /* jshint validthis: true */
    var vm = this
      , _ = $scope;

    vm.current = {};
    vm.loading = true;
    vm.auth = Authentication;
    vm.dpConfig = dpCanvasConfig;
    vm.dpObjects = dpCanvasObjects;
    vm.newObjectType = 'Stickman';
    vm.c = dpCanvas;
    vm.t = dpCanvasTool;
    vm.f = dpCanvasFrames;
    vm.activate = activate;
    vm.isPublishable = isPublishable;
    vm.publishAnimDialog = publishAnimDialog;
    vm.openActionDialog = openActionDialog;
    vm.importSVG = importSVG;
    vm.importSTK = importSTK;
    vm.selectedAction = vm.dpObjects.actions[0];
    activate();

    ////////////////

    function activate() {
      var framesPromise;
      $scope.$on('actionsReady', function() {
        vm.selectedAction = vm.dpObjects.actions[0];
      });
      vm.f.init();
      dpResource.get($stateParams.animId).then(function(anim) {
        if (!vm.auth.user || vm.auth.user._id !== anim.creator) {
          $state.go('userForm.signin');
        }

        vm.current.anim = anim;
        framesPromise = dpResource.getFrames(vm.current.anim, true);
        vm.f.frames = framesPromise.$object;
        framesPromise.then(function(frames) {
          frames = _.sortBy(_.flatten(frames), 'order');
          if (!frames.length) {
            vm.f.newFrame();
          } else {
            vm.c.initLayers(frames);
            vm.f.currentFrameIndex = 0;
            vm.f.currentFrame = frames[0];
            $analytics.eventTrack('anim-edit', {
              category : vm.auth.user._id,
              label    : vm.current.anim._id
            });
          }
          vm.loading = false;
          $scope.$watch('vm.f.currentFrame', function(newValue) {
            vm.c.activateLayer(newValue);
          });
        });
      });
    }

    function isPublishable() {
      return vm.f.framesCount >= 10;
    }

    function importSTK(files) {
      _.each(files, function(file) {
        if (file.name.split('.').pop() !== 'stk') {
          dpToast.danger(file.name + ' doesn\'t seem like .stk file. Stk files are created in Pivot Animator software');
          return;
        }
        var reader = new FileReader();
        reader.onload = function(e) {
          vm.selectedAction.execute({source : e.target.result});
        };
        reader.readAsArrayBuffer(file);
      });
    }

    function importSVG(files) {
      _.each(files, function(file) {
        if (file.type !== 'image/svg+xml') return;
        if (file.size > 50000) {
          dpToast.danger('Sorry, imported SVG file is too big!');
          return;
        }
        var reader = new FileReader();
        reader.onload = function(e) {
          vm.selectedAction.execute({source : e.target.result});
        };
        reader.readAsText(file);
      });
    }

    function publishAnimDialog(evt) {
      vm.t.detachKeyEvents();
      vm.f.save().then(function() {
        $mdDialog.show({
          controller   : 'CanvasPublishAnimController',
          controllerAs : 'vm',
          templateUrl  : 'modules/canvas/canvas/dialogs/publish-canvas.client.view.html',
          targetEvent  : evt,
          hasBackdrop  : false
        }).then(function(publishData) {
          if (!publishData) return;
          vm.current.anim.post('publish', publishData).then(function() {
            dpResource.clear();
            $state.go('animations.list.content', {animId : vm.current.anim._id});
            $analytics.eventTrack('anim-publish', {
              category : vm.auth.user._id,
              label    : vm.current.anim._id
            });
          });
        }).finally(function() {
          vm.t.attachKeyEvents();
        });
      });
    }

    function openActionDialog(type, evt) {
      vm.t.detachKeyEvents();
      $mdDialog.show({
        controller   : 'Canvas' + type + 'Controller',
        controllerAs : 'vm',
        templateUrl  : 'modules/canvas/canvas/dialogs/' + type.toLowerCase() + '-canvas.client.view.html',
        targetEvent  : evt,
        hasBackdrop  : false
      }).then(function(anwser) {
        if (_.isEmpty(anwser)) return;
        vm.selectedAction.execute({source : anwser});
      }).finally(function() {
        vm.t.attachKeyEvents();
      });
    }
  }
})();


(function() {
  'use strict';

  angular
    .module('canvas')
    .controller('CanvasPictureController', CanvasPictureController);

  CanvasPictureController.$inject = ['$rootScope', 'AnimsConfig', '$mdDialog'];

  /* @ngInject */
  function CanvasPictureController($rootScope, AnimsConfig, $mdDialog) {
    /* jshint validthis: true */
    var vm = this
      , _ = $rootScope;

    vm.pictures = AnimsConfig.canvas.pictures;
    vm.answer = answer;
    vm.isSvg = isSvg;
    vm.pageSize = 20;

    ////////////////

    function isSvg(pic) {
      return !!~pic.indexOf('.svg');
    }

    function answer(src, isSvg) {
      if (isSvg) {
        src = _.clone(src.target.nearestViewportElement || src.target);
      }
      $mdDialog.hide(src);
    }

  }
})();

(function() {
  'use strict';

  angular
    .module('canvas')
    .controller('CanvasPublishAnimController', CanvasPublishAnimController);

  CanvasPublishAnimController.$inject = ['AnimsConfig', '$mdDialog'];

  /* @ngInject */
  function CanvasPublishAnimController(AnimsConfig, $mdDialog) {
    /* jshint validthis: true */
    var vm = this;

    vm.answer = answer;
    vm.AnimsConfig = AnimsConfig;

    ////////////////

    function answer(ans) {
      $mdDialog.hide(ans);
    }

  }
})();

(function() {
  'use strict';

  angular
    .module('canvas')
    .controller('CanvasStickfigureController', CanvasStickfigureController);

  CanvasStickfigureController.$inject = ['$rootScope', 'AnimsConfig', '$mdDialog'];

  /* @ngInject */
  function CanvasStickfigureController($rootScope, AnimsConfig, $mdDialog) {
    /* jshint validthis: true */
    var vm = this
      , _ = $rootScope;

    vm.figures = AnimsConfig.canvas.figures;
    vm.figuresPath = AnimsConfig.canvas.figuresPath;
    vm.selected = {};
    vm.answer = answer;
    vm.pageSize = 24;
    vm.toggleSelect = toggleSelect;
    vm.selectedCount = selectedCount;

    ////////////////

    function toggleSelect(figureName) {
      if (vm.selected[figureName]) {
        delete vm.selected[figureName];
      } else {
        vm.selected[figureName] = true;
      }
    }

    function selectedCount() {
      return _.keys(vm.selected).length;
    }

    function answer(ans) {
      $mdDialog.hide(_.keys(ans));
    }

  }
})();

(function() {
  'use strict';

  angular
    .module('canvas')
    .controller('CanvasTextController', CanvasTextController);

  CanvasTextController.$inject = ['$mdDialog'];

  /* @ngInject */
  function CanvasTextController($mdDialog) {
    /* jshint validthis: true */
    var vm = this;

    vm.answer = answer;

    ////////////////

    function answer(ans) {
      $mdDialog.hide(ans);
    }
    
  }
})();

(function() {
  'use strict';

  angular
    .module('canvas')
    .config(configure);

  configure.$inject = ['$stateProvider'];

  /* @ngInject */
  function configure($stateProvider) {
    $stateProvider
      .state('canvas', {
        url          : '/canvas/:animId',
        controller   : 'CanvasController',
        controllerAs : 'vm',
        templateUrl  : 'modules/canvas/canvas/canvas.client.view.html'
      });
  }
})();

(function() {
  'use strict';

  angular
    .module('canvas')
    .directive('dpCanvas', dpCanvas);

  dpCanvas.$inject = ['dpCanvas', 'dpCanvasTool', 'dpCanvasPaper', 'dpPaperScope', 'dpCanvasFrames'];

  /* @ngInject */
  function dpCanvas(dpCanvasService, dpCanvasTool, dpCanvasPaper, dpPaperScope, dpCanvasFrames) {
    var p = dpPaperScope
      , directive = {
        link     : link,
        restrict : 'A'
      };
    return directive;

    function link(scope, el) {
      p.paperScope.setup(el[0]);
      dpCanvasPaper.init();
      dpCanvasService.init(p.projects[0]);
      dpCanvasTool.init();
      scope.$on('$destroy', destroy);
    }

    function destroy() {
      dpCanvasService.destroy();
      dpCanvasTool.destroy();
      dpCanvasFrames.destroy();
    }
  }
})();

(function() {
  'use strict';

  angular
    .module('canvas')
    .directive('dpCanvasThumbnails', dpCanvasThumbnails);

  dpCanvasThumbnails.$inject = [];

  /* @ngInject */
  function dpCanvasThumbnails() {
    var directive = {
      link     : link,
      restrict : 'A'
    };
    return directive;

    function link(scope, el, attr) {
      var frameWidth, framesCount,
        rowWidth = el.prop('offsetWidth') - 30;
      attr.$observe('dpCurrentFrameIndex', function(frameIndex) {
        framesCount = attr.dpFramesCount;
        if (!frameWidth) {
          frameWidth = el.find('li').eq(0).prop('offsetWidth') + 10;
        }
        el.scrollLeft(frameIndex / (framesCount - 1) * (framesCount * frameWidth - rowWidth));
      });
    }
  }
})();

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
      importObject             : importObject,
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
      currentFrame.rasterized = layerClone.dpGetDataURL();
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
      me.selected.path = false;
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

    function importObject(object, forceCenter) {
      var newObject;
      project.activeLayer.importJSON(object);
      newObject = project.activeLayer.lastChild;
      me.objects.addChild(newObject);
      if (forceCenter) {
        newObject.position = p.view.center;
      }
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
      if (!me.selected.objects.length || !me.selected.path || !me.selected.objects[0]) return false;
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

(function() {
  'use strict';

  angular
    .module('canvas')
    .factory('dpCanvasConfig', dpCanvasConfig);

  dpCanvasConfig.$inject = [];

  /* @ngInject */
  function dpCanvasConfig() {
    return {
      mode         : {
        SELECT : 1,
        JOIN   : 2
      },
      handleState  : {
        SELECTED : 1,
        BLUR     : 2,
        JOIN     : 3,
        HIDE     : 4
      },
      handleColor  : {
        1 : ['#FFC107', '#E91E63'],
        2 : ['#00E676', '#4CAF50'],
        3 : ['#82B1FF', '#2196F3']
      },
      handleRadius : 7,
      fonts        : [
        'Arial',
        'Verdana',
        'Times New Roman',
        'Courier New',
        'serif',
        'sans-serif',
        'monospace'
      ],
      fontWeights  : [
        'normal',
        'bold',
        'lighter'
      ]
    };

    ////////////////
  }
})();

(function() {
  'use strict';

  angular
    .module('canvas')
    .factory('dpCanvasFrames', dpCanvasFrames);

  dpCanvasFrames.$inject = ['$stateParams', '$rootScope', 'AnimsConfig', 'dpResource', 'dpToast', '$q', '$interval',
                            '$state', 'dpObjectData', '$timeout'];

  /* @ngInject */
  function dpCanvasFrames($stateParams, $rootScope, AnimsConfig, dpResource, dpToast, $q, $interval, $state,
                          dpObjectData, $timeout) {
    var me, saveInterval, removedCount, playDeferred
      , unwatchFuncs = []
      , _ = $rootScope;

    me = {
      frames         : {},
      currentFrame   : {},
      clipboardFrame : false,
      framesCount    : 0,
      repeat         : true,
      playing        : false,
      init           : init,
      save           : save,
      next           : next,
      play           : play,
      stop           : stop,
      newFrame       : newFrame,
      pasteFrame     : pasteFrame,
      removeFrame    : removeFrame,
      cloneFrame     : cloneFrame,
      getDirty       : getDirty,
      setDirty       : setDirty,
      isClean        : isClean,
      destroy        : destroy
    };

    return me;

    ////////////////

    function init() {
      me.frames = {};
      me.currentFrame = {};
      me.clipboardFrame = false;
      me.framesCount = 0;
      me.playing = false;
      removedCount = 0;
      saveInterval = $interval(me.save, 300000);

      unwatchFuncs.push($rootScope.$watch(function() {
        return _.keys(me.frames).length;
      }, function(newValue) {
        me.framesCount = newValue;
      }));

      unwatchFuncs.push($rootScope.$watch(function() {
        return me.currentFrameIndex;
      }, function(newValue, oldValue) {
        me.currentFrame = me.frames[newValue];
        me.prevFrame = me.frames[oldValue];
      }));

      unwatchFuncs.push($rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState) {
        if (fromState.name === 'canvas') {
          if (!me.isClean()) {
            event.preventDefault();
            me.save().then(_.partial($state.go, toState, toParams));
          }
        }
      }));

    }

    function save() {
      var frames, deferred, promise, promises = []
        , removedBefore = removedCount
        , anim = dpResource.get($stateParams.animId).$object;

      if (me.isClean()) {
        deferred = $q.defer();
        deferred.resolve();
        return deferred.promise;
      }

      frames = _.map(me.getDirty(), function(dirtyFrame) {
        var frame = _.omit(dirtyFrame, 'layer', 'dirty', 'rasterized');
        if (dirtyFrame.order === 0) {
          frame.thumbnail = dirtyFrame.rasterized;
        }
        frame.objectData = dpObjectData.pack(dirtyFrame.objectData);
        return frame;
      });
      dpToast.info('Saving your precious animation...');

      _.each(_.chunk(frames, AnimsConfig.framesPageSize), function(framesChunk) {
        promise = anim.post('edit/frames', framesChunk);
        me.setDirty(framesChunk, false);
        promises.push(promise);
        promise.then(_.noop, function() {
          me.setDirty(framesChunk, true);
        });
      });
      if (removedCount > 0) {
        promise = anim.customDELETE('edit/frames', {
          fromOrder : me.framesCount,
          count     : removedCount
        });
        removedCount = 0;
        promise.then(_.noop, function() {
          removedCount = removedBefore;
        });
        promises.push(promise);
      }

      promises = $q.all(promises);

      promises.then(function() {
        dpToast.success('Great! Your animation was successfully saved');
      });

      return promises;
    }

    function newFrame() {
      var frame;
      if (me.framesCount) {
        if (me.framesCount === AnimsConfig.framesLimit) {
          dpToast.info('WOW! You have made longest animation we can save! It\'s time to publish!');
          return;
        } else if (me.framesCount / AnimsConfig.framesLimit === 0.8) {
          dpToast.warning('You\'re getting close to our limits! ' +
            'Animations can have up to ' + AnimsConfig.framesLimit + ' frames', {timeout : 7000});
        }


        frame = me.cloneFrame(me.frames[me.framesCount - 1]);
        frame.order = me.framesCount;
        me.currentFrameIndex = frame.order;
      } else {
        frame = {
          animation : $stateParams.animId,
          order     : 0,
          repeat    : 1
        };
        me.currentFrameIndex = frame.order;
        me.currentFrame = frame;
      }
      frame.dirty = true;
      me.frames[frame.order] = frame;
      removedCount--;
    }

    function next(step) {
      var framesCount = _.keys(me.frames).length;
      if (step < 0) {
        if (me.currentFrameIndex > 0) {
          me.currentFrameIndex += step;
        } else if (me.repeat) {
          me.currentFrameIndex = framesCount - 1;
        } else {
          stop();
          return;
        }
      } else {
        if (me.currentFrameIndex < framesCount - 1) {
          me.currentFrameIndex += step;
        } else if (me.repeat) {
          me.currentFrameIndex = 0;
        } else {
          stop();
          return;
        }
      }
      playNext();
    }

    function playNext() {
      if (me.playing) {
        $timeout(_.partial(next, 1), 100 * me.frames[me.currentFrameIndex].repeat);
      }
    }

    function play() {
      me.playing = true;
      playNext();
      playDeferred = $q.defer();
      return playDeferred.promise;
    }

    function stop() {
      me.playing = false;
      playDeferred.resolve();
    }

    function removeFrame(removedFrame) {
      if (me.framesCount === 1) return;
      delete me.frames[removedFrame.order];
      removedFrame.layer.remove();
      _.each(me.frames, function(frame, order) {
        if (order <= removedFrame.order) return;
        me.frames[order - 1] = frame;
        frame.order--;
        frame.dirty = true;
      });
      delete me.frames[me.framesCount - 1];
      if (me.frames[me.currentFrameIndex]) {
        me.currentFrame = me.frames[me.currentFrameIndex];
      } else {
        me.currentFrameIndex--;
      }
      removedCount++;
    }

    function pasteFrame(frame) {
      if (!frame) return;
      var pastedFrame = me.cloneFrame(frame);
      me.currentFrame.layer.removeChildren();
      pastedFrame.layer = me.currentFrame.layer;
      pastedFrame.order = me.currentFrame.order;
      pastedFrame.dirty = true;
      me.frames[me.currentFrame.order] = me.currentFrame = pastedFrame;
    }

    function getDirty() {
      return _.filter(_.toArray(me.frames), {dirty : true});
    }

    function setDirty(frames, dirty) {
      frames = _.isArray(frames) ? frames : [frames];
      _.each(frames, function(frame) {
        me.frames[frame.order].dirty = dirty;
      });
    }

    function cloneFrame(frame) {
      var clone = _.clone(_.omit(frame, 'layer'));
      clone.repeat = 1;
      return clone;
    }

    function isClean() {
      return _.isEmpty(me.getDirty()) && removedCount <= 0;
    }

    function destroy() {
      _.invoke(unwatchFuncs, 'call');
      unwatchFuncs = [];
      $interval.cancel(saveInterval);
    }

  }
})();

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

(function() {
  'use strict';

  angular
    .module('core')
    .controller('AboutController', AboutController);

  AboutController.$inject = ['$scope'];

  /* @ngInject */
  function AboutController($scope)
  {
    /* jshint validthis: true */
    var vm = this;

    vm.activate = activate;

    activate();

    ////////////////

    function activate() {
      $scope.$parent.title = 'About Us';
    }
  }
})();

(function() {
  'use strict';

  /* global _: true */
  var sendJsError = _.throttle(function(analytics, exception, Authentication) {
    var user = Authentication.user ? Authentication.user._id : '';
    analytics.eventTrack('error-js', {
      category : exception.message,
      label    : user + '\n' + location.pathname + '\n' + navigator.userAgent + '\n' + exception.stack
    });
  }, 30000);

  angular
    .module('core')
    .config(locationConfig)
    .config(restangularConfig)
    .config(ngToastConfig)
    .config(mdThemeConfig)
    .config(exceptionConfig)
    .config(bootstrapConfig)
    .run(handleRouteChangeErr)
    .run(restangularRun)
    .run(initServices);

  locationConfig.$inject = ['$locationProvider'];

  /* @ngInject */
  function locationConfig($locationProvider) {
    $locationProvider.html5Mode(true);
  }

  restangularConfig.$inject = ['RestangularProvider'];

  /* @ngInject */
  function restangularConfig(RestangularProvider) {
    RestangularProvider
      .setBaseUrl('/api')
      .setRestangularFields({
        id : '_id'
      })
      .setResponseExtractor(function(res, op) {
        var newRes = res || {};
        if (op === 'getList' && !angular.isArray(res)) {
          newRes = res.list;
          newRes.meta = res.meta;
          angular.forEach(newRes, function(val, key) {
            newRes[key].origEl = angular.copy(val);
          });
        } else {
          newRes.origEl = angular.copy(res);
        }
        return newRes;
      });
  }

  ngToastConfig.$inject = ['ngToastProvider'];

  /* @ngInject */
  function ngToastConfig(ngToastProvider) {
    ngToastProvider.configure({
      verticalPosition   : 'top',
      horizontalPosition : 'right',
      maxNumber          : 3,
      timeout            : 5000
    });
  }

  mdThemeConfig.$inject = ['$mdThemingProvider'];

  /* @ngInject */
  function mdThemeConfig($mdThemingProvider) {
    $mdThemingProvider.theme('default')
      .primaryColor('green')
      .accentColor('amber')
      .warnColor('pink');
  }

  bootstrapConfig.$inject = ['$tooltipProvider'];

  /* @ngInject */
  function bootstrapConfig($tooltipProvider) {
    $tooltipProvider.options({
      appendToBody : true
    });
  }


  restangularRun.$inject = ['Restangular', 'dpToast', '$state', '$analytics'];

  /* @ngInject */
  function restangularRun(Restangular, dpToast, $state, $analytics) {
    Restangular
      .setErrorInterceptor(function(res) {
        switch (res.status) {
          case 403 :
            dpToast.danger('Sorry, you\'re to do it, please sign in with different account');
            $state.go('userForm.signin');
            break;
          case 401 :
            dpToast.danger('Please sign in first!');
            $state.go('userForm.signin');
            break;
          case 400 :
            dpToast.danger(res.data && res.data.message);
            break;
          default :
            dpToast.danger();
            break;
        }
        $analytics.eventTrack('error-response-' + res.status, {
          category : res.config.url,
          label    : res.data && res.data.message
        });
      });
  }

  exceptionConfig.$inject = ['$provide'];

  /* @ngInject */
  function exceptionConfig($provide) {
    $provide.decorator('$exceptionHandler', extendExceptionHandler);
  }

  extendExceptionHandler.$inject = ['$delegate', '$analytics', 'Authentication'];

  /* @ngInject */
  function extendExceptionHandler($delegate, $analytics, Authentication) {
    return function(exception, cause) {
      sendJsError($analytics, exception, Authentication);
      $delegate(exception, cause);
    };
  }

  handleRouteChangeErr.$inject = ['$rootScope', 'dpToast', '$state'];

  /* @ngInject */
  function handleRouteChangeErr($rootScope, dpToast, $state) {
    $rootScope.$on('$routeChangeError', function(event, current, previous, rejection) {
        var destination = (current && (current.title || current.name || current.loadedTemplateUrl)) ||
          'unknown target';
        var msg = 'Sorry, I couldn\'t get to ' + destination + '. ' + (rejection.msg || '');
        dpToast.danger(msg);
        $state.go('home');
      }
    );
  }

  initServices.$inject = ['$FB', 'dpBrowseHistory'];

  /* @ngInject */
  function initServices($FB, dpBrowseHistory) {
    $FB.init('150162395079841');
    dpBrowseHistory.init();
  }

})();


/* global jsonpack:false, paper:false */
(function() {
  'use strict';

  angular
    .module('core')
    .constant('jsonpack', jsonpack)
    .constant('paper', paper);
})();

(function() {
  'use strict';

  angular
    .module('core')
    .run(run);

  run.$inject = ['$rootScope'];

  /* @ngInject */
  function run($rootScope) {
    var _ = $rootScope,
      methods = {};

    methods.chunk = function(array, n) {
      return _.transform(array, function(result, el, i, arr) {
        return i % n === 0 ? result.push(arr.slice(i, i + n)) : null;
      });
    };

    methods.stripBase64 = function(str) {
      return str.replace(/^data:image\/png;base64,/, '');
    };

    //methods.recursive = function(obj, opt, iterator) {
    //  function recurse(obj, property) {
    //    iterator(obj, property);
    //    _.each(_.keys(obj), function(prop) {
    //      recurse(obj[prop]);
    //    });
    //    //_.each(obj[opt], recurse);
    //  }
    //  recurse(obj);
    //};

    _.each(methods, function(method, methodName) {
      _[methodName] = _.bind(method, _);
    });
  }

})();

(function() {
  'use strict';

  angular
    .module('core')
    .config(configure);

  configure.$inject = ['$stateProvider', '$urlRouterProvider'];

  /* @ngInject */
  function configure($stateProvider, $urlRouterProvider) {
    $urlRouterProvider.otherwise('/');

    $stateProvider
      .state('home', {
        url          : '/',
        controller   : 'HomeController',
        controllerAs : 'vm',
        templateUrl  : 'modules/core/home/home.client.view.html'
      })
      .state('userForm.contact', {
        url          : '/contact',
        controller   : 'ContactController',
        controllerAs : 'vm',
        templateUrl  : 'modules/core/contact/contact.client.view.html'
      })
      .state('userForm.about', {
        url          : '/about',
        controller   : 'AboutController',
        controllerAs : 'vm',
        templateUrl  : 'modules/core/about/about.client.view.html'
      });
  }
})();

(function() {
  'use strict';

  angular
    .module('core')
    .controller('ContactController', ContactController);

  ContactController.$inject = [
    '$scope', 'Authentication', 'Restangular', 'dpBrowseHistory', 'dpToast', 'UsersConfig', '$analytics'
  ];

  /* @ngInject */
  function ContactController($scope, Authentication, Restangular, dpBrowseHistory, dpToast, UsersConfig, $analytics) {
    /* jshint validthis: true */
    var vm = this;

    vm.sendContactMsg = sendContactMsg;
    vm.contactConfig = UsersConfig.contact;
    vm.contact = {};
    vm.activate = activate;


    activate();

    ////////////////

    function activate() {
      $scope.$parent.title = 'Contact Us';
      vm.contact.email = Authentication.user ? Authentication.user.email : '';
    }

    function sendContactMsg() {
      Restangular.all('contact').post(vm.contact).then(function() {
        dpToast.success('Thank you for leaving a message! We\'ll take a look ASAP');
        dpBrowseHistory.back();
        $analytics.eventTrack('contact', {
          category : vm.contact.email,
          label    : vm.contact.subject
        });
      });
    }

  }
})();

(function() {
  'use strict';

  angular
    .module('users')
    .directive('dpRepeatPassword', dpRepeatPassword);

  dpRepeatPassword.$inject = ['$parse'];

  /* @ngInject */
  function dpRepeatPassword($parse) {
    var directive = {
      link     : link,
      restrict : 'A',
      require  : 'ngModel'
    };
    return directive;

    function link(scope, el, attrs, ctrl) {
      scope.$watch(function() {
        return $parse(attrs.dpRepeatPassword)(scope) === ctrl.$modelValue;
      }, function(currentValue) {
        ctrl.$setValidity('mismatch', currentValue);
      });
    }
  }
})();

(function() {
  'use strict';

  angular
    .module('core')
    .directive('dpThumb', dpThumb);

  dpThumb.$inject = ['Authentication'];

  /* @ngInject */
  function dpThumb(Authentication) {
    var directive
      , basePath = 'dist/thumbnails/';

    directive = {
      link     : link,
      restrict : 'A'
    };
    return directive;

    function link(scope, el, attr) {
      var type = attr.dpThumbType || 'anims'
        , path = basePath + type + '/'
        , clearCache = '';

      attr.$observe('dpThumb', function(id) {
        if (id === Authentication.user._id && Authentication.user.portraitChangeTime) {
          clearCache = '?' + Authentication.user.portraitChangeTime;
        }
        if (id) attr.$set('src', path + id + '.png' + clearCache);
      });

      el.on('error', function() {
        el[0].src = path + type + '_tpl.png';
      });
    }
  }
})();

(function() {
  'use strict';

  angular
    .module('core')
    .directive('dpValidNumber', dpValidNumber);

  dpValidNumber.$inject = [];

  /* @ngInject */
  function dpValidNumber() {
    var directive = {
      link     : link,
      restrict : 'A'
    };
    return directive;

    function link(scope, el, attr) {
      var keyCode = [
        8, 9, 37, 39, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 110
      ];
      el.bind('keydown', function(event) {
        if (!~keyCode.indexOf(event.which)) {
          scope.$apply(function() {
            scope.$eval(attr.dpValidNumber);
            event.preventDefault();
          });
          event.preventDefault();
        }
      });
    }
  }
})();

(function() {
  'use strict';

  angular
    .module('core')
    .filter('characters', characters);

  characters.$inject = [];

  /* @ngInject */
  function characters() {
    return function(input, chars, breakOnWord) {
      if (isNaN(chars)) return input;
      if (chars <= 0) return '';
      if (input && input.length > chars) {
        input = input.substring(0, chars);

        if (!breakOnWord) {
          var lastspace = input.lastIndexOf(' ');
          //get last space
          if (lastspace !== -1) {
            input = input.substr(0, lastspace);
          }
        } else {
          while (input.charAt(input.length - 1) === ' ') {
            input = input.substr(0, input.length - 1);
          }
        }
        return input + '...';
      }
      return input;
    };
  }
})();

(function() {
  'use strict';

  angular
    .module('core')
    .filter('words', words);

  words.$inject = [];

  /* @ngInject */
  function words() {
    return function(input, words) {
      if (isNaN(words)) return input;
      if (words <= 0) return '';
      if (input) {
        var inputWords = input.split(/\s+/);
        if (inputWords.length > words) {
          input = inputWords.slice(0, words).join(' ') + '...';
        }
      }
      return input;
    };
  }
})();

(function() {
  'use strict';

  angular
    .module('core')
    .controller('HomeController', HomeController);

  HomeController.$inject = ['Restangular', 'dpResource'];

  /* @ngInject */
  function HomeController(Restangular, dpResource) {
    /* jshint validthis: true */
    var vm = this;

    vm.sections = {
      anims : {
        limit : 8,
        types : {
          likes  : {
            title : 'Most Liked Animations'
          },
          recent : {
            title : 'Recent Animations'
          },
          random : {
            title : 'Random Animations'
          }
        }
      },
      users : {
        limit : 6,
        types : {
          likes : {
            title : 'Best Animators'
          }
        }
      }
    };
    vm.getList = getList;
    vm.getPopoverPlacement = getPopoverPlacement;

    ////////////////

    function getList(section, type) {
      var sec = vm.sections[section];
      sec.types[type].list = Restangular.all('list/' + section + '/' + type)
        .getList({page : 1, limit : sec.limit}).then(function(list) {
          sec.types[type].list = list;
          dpResource.add(list, section);
        });
    }

    function getPopoverPlacement(key, items) {
      if (key < items.length / 2) return 'top';
      return 'bottom';
    }

  }
})();

(function() {
  'use strict';

  angular
    .module('users')
    .controller('HeaderController', HeaderController);

  HeaderController.$inject = ['Authentication', 'dpResource', '$mdSidenav'];

  /* @ngInject */
  function HeaderController(Authentication, dpResource, $mdSidenav) {
    /* jshint validthis: true */
    var vm = this;

    vm.auth = Authentication;
    vm.logout = logout;
    vm.openSidenav = openSidenav;

    ////////////////

    function logout() {
      dpResource.clear();
    }

    function openSidenav() {
      $mdSidenav('rightSidenav').toggle();
    }
  }
})();

(function() {
  'use strict';

  angular
    .module('users')
    .controller('SidenavController', SidenavController);

  SidenavController.$inject = ['$scope', 'Authentication', '$mdSidenav'];

  /* @ngInject */
  function SidenavController($scope, Authentication, $mdSidenav) {
    /* jshint validthis: true */
    var vm = this;

    vm.auth = Authentication;
    vm.closeSidenav = closeSidenav;
    vm.activate = activate;

    activate();

    ////////////////

    function activate() {
      $scope.$on('$stateChangeSuccess', closeSidenav);
    }

    function closeSidenav() {
      $mdSidenav('rightSidenav').close();
    }

  }
})();

(function() {
  'use strict';

  angular
    .module('core')
    .factory('dpBrowseHistory', dpBrowseHistory);

  dpBrowseHistory.$inject = ['$state', '$rootScope'];

  /* @ngInject */
  function dpBrowseHistory($state, $rootScope) {
    var history = []
      , me = {
        init : init,
        back : back
      };

    return me;

    ////////////////

    function init() {
      history = [];
      $rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams) {
        if (!fromState.name || !!~fromState.name.indexOf('userForm.')) return;
        history.push({
          state  : fromState,
          params : fromParams
        });
      });
    }

    function back() {
      var state = history.pop();
      if (!state) {
        $state.go('home');
      } else {
        $state.go(state.state, state.params);
      }
    }
  }
})();

(function() {
  'use strict';

  angular
    .module('core')
    .factory('dpBrowserType', dpBrowserType);

  dpBrowserType.$inject = ['$window'];

  /* @ngInject */
  function dpBrowserType($window) {
    var browsers = {chrome : /chrome/i, safari : /safari/i, firefox : /firefox/i, ie : /internet explorer/i}
      , me = {
        getType : getType
      };

    return me;

    ////////////////

    function getType() {
      var userAgent = $window.navigator.userAgent;

      for (var key in browsers) {
        if (browsers[key].test(userAgent)) {
          return key;
        }
      }
      return 'unknown';
    }
  }
})();

(function() {
  'use strict';

  angular
    .module('core')
    .factory('dpToast', dpToast);

  dpToast.$inject = ['ngToast', '$rootScope'];

  /* @ngInject */
  function dpToast(ngToast, $rootScope) {
    var me
      , _ = $rootScope
      , errMsgs = [
        'Oops! Something went horribly wrong!',
        'Oh no! I terribly failed!',
        'Sorry, something just broke in me :(',
        'Sorry, I must have bad day ...'
      ];

    me = {
      info    : info,
      success : success,
      warnign : warning,
      danger  : danger
    };

    return me;

    ////////////////

    function info(text, opts) {
      ngToast.create(_.extend({
        content : text,
        'class' : 'info'
      }, opts));
    }

    function success(text, opts) {
      ngToast.create(_.extend({
        content : text,
        'class' : 'success'
      }, opts));
    }

    function warning(text, opts) {
      ngToast.create(_.extend({
        content : text,
        'class' : 'warning'
      }, opts));
    }

    function danger(text, opts) {
      text = _.isString(text) ? text : '';
      ngToast.create(_.extend({
        content : text || errMsgs[_.random(errMsgs.length - 1)],
        'class' : 'danger'
      }, opts));
    }
  }
})();

(function() {
  'use strict';

  angular
    .module('users')
    .controller('AnimsUserController', AnimsUserController);

  AnimsUserController.$inject = [
    '$scope', '$stateParams', 'Authentication', 'dpResource', '$localStorage', 'AnimsConfig',
    'Restangular', '$mdDialog', '$state', '$location', '$anchorScroll', '$analytics'
  ];

  /* @ngInject */
  function AnimsUserController($scope, $stateParams, Authentication, dpResource, $localStorage, AnimsConfig,
                               Restangular, $mdDialog, $state, $location, $anchorScroll, $analytics) {
    /* jshint validthis: true */
    var vm = this
      , _ = $scope
      , allSortOpts = [
        {
          name  : 'Most popular',
          value : '-likesCount'
        },
        {
          name  : 'Newest first',
          value : '-datePublish'
        }
      ];

    vm.activate = activate;
    vm.getList = getList;
    vm.publishedSwitchChange = publishedSwitchChange;
    vm.updateSortOpts = updateSortOpts;
    vm.initGetList = initGetList;
    vm.showMore = showMore;
    vm.removeAnim = removeAnim;
    vm.createAnim = createAnim;
    vm.auth = Authentication;
    vm.creator = Authentication.user && Authentication.user._id === $stateParams.userId;
    vm.sortOpts = _.clone(allSortOpts);
    vm.storage = $localStorage.$default({
      userAnims : {
        sort      : vm.sortOpts[0].value,
        published : false
      }
    }).userAnims;

    activate();

    ////////////////

    function activate() {
      $location.hash('top');
      $anchorScroll();
      vm.current = {
        user : dpResource.get($stateParams.userId, 'users').$object
      };
      vm.updateSortOpts();
      vm.initGetList();
    }

    function getList() {
      vm.loading = true;
      Restangular.all('list/anims/user/' + $stateParams.userId).getList({
        page     : vm.page,
        limit    : AnimsConfig.userAnimsPageSize,
        sort     : vm.storage.sort,
        editable : vm.storage.published ? 0 : 1
      }).then(function(anims) {
        vm.loading = false;
        vm.allLoaded = anims.length < AnimsConfig.userAnimsPageSize;
        vm.anims = vm.anims.concat(anims);
        vm.totalCount = anims.meta.totalCount;
        dpResource.set(vm.anims);
      });
    }

    function publishedSwitchChange() {
      vm.updateSortOpts();
      vm.initGetList();
    }

    function updateSortOpts() {
      if (!vm.creator) return;
      if (!vm.storage.published) {
        vm.storage.sort = vm.sortOpts[1].value;
        vm.sortOpts.shift();
      } else {
        vm.sortOpts = _.clone(allSortOpts);
      }
    }

    function initGetList() {
      vm.anims = [];
      vm.page = 1;
      vm.getList();
    }

    function showMore() {
      vm.page++;
      vm.getList();
    }


    function removeAnim(anim, evt) {
      $mdDialog.show({
        controller   : DeleteAnimController,
        controllerAs : 'vm',
        templateUrl  : 'modules/users/animations/delete-anim.client.view.html',
        targetEvent  : evt,
        hasBackdrop  : false
      }).then(function() {
        var index = _.findIndex(vm.anims, {_id : anim._id});
        vm.anims.splice(index, 1);
        vm.totalCount--;
        Restangular.restangularizeElement(null, anim, 'anims').remove().then(function() {
          $analytics.eventTrack('anim-delete', {
            category : vm.auth.user._id,
            label    : anim._id
          });
        }, function() {
          vm.anims.splice(index, 0, anim);
          vm.totalCount++;
        });
      });
    }


    function createAnim() {
      Restangular.all('anims').customPUT().then(function(anim) {
        $analytics.eventTrack('anim-create', {
          category : vm.auth.user._id,
          label    : anim._id
        });
        $state.go('canvas', {animId : anim._id});
      });
    }
  }


  DeleteAnimController.$inject = ['$mdDialog'];

  /* @ngInject */
  function DeleteAnimController($mdDialog) {
    /* jshint validthis: true */
    var vm = this;
    vm.mdDialog = $mdDialog;
  }


})();

(function() {
  'use strict';

  angular
    .module('users')
    .controller('AuthenticationController', AuthenticationController);

  AuthenticationController.$inject = [
    '$scope', 'Restangular', 'Authentication', '$state', 'dpResource', 'dpBrowseHistory', '$analytics'
  ];

  /* @ngInject */
  function AuthenticationController($scope, Restangular, Authentication, $state, dpResource, dpBrowseHistory,
                                    $analytics) {
    /* jshint validthis: true */
    var vm = this;

    vm.activate = activate;
    vm.auth = Authentication;
    vm.sign = sign;
    activate();

    ////////////////

    function activate() {
      if (vm.auth.user) $state.go('viewUser', {userId : vm.auth.user._id});
      $scope.$parent.title = 'Join us using your social accounts';
    }

    function sign(type) {
      Restangular.all('auth/sign' + type).post(vm.credentials).then(function(user) {
        $analytics.eventTrack('sign' + type, {
          category : user._id
        });
        vm.auth.user = Restangular.restangularizeElement(null, user, 'users');
        dpResource.clear();
        dpBrowseHistory.back();
      });
    }

  }
})();

(function() {
  'use strict';

  angular
    .module('users')
    .controller('ForgotPasswordController', ForgotPasswordController);

  ForgotPasswordController.$inject = ['$scope', 'Restangular', 'Authentication', '$state', 'dpToast', '$analytics'];

  /* @ngInject */
  function ForgotPasswordController($scope, Restangular, Authentication, $state, dpToast, $analytics) {
    /* jshint validthis: true */
    var vm = this;

    vm.activate = activate;
    vm.askForPasswordReset = askForPasswordReset;

    activate();

    ////////////////

    function activate() {
      if (Authentication.user) $state.go('/');
      $scope.$parent.title = 'Restore password';
    }

    function askForPasswordReset() {
      Restangular.all('auth/forgot').post({email : vm.email}).then(function() {
        dpToast.success('Your password was reset. Please check your email');
        $state.go('home');
        $analytics.eventTrack('user-pass-forgot', {
          category : vm.email
        });
      });
    }
  }
})();

(function() {
  'use strict';

  angular
    .module('users')
    .controller('ResetPasswordController', ResetPasswordController);

  ResetPasswordController.$inject = [
    '$scope', '$stateParams', 'Restangular', 'Authentication', '$state', 'dpToast', '$analytics'
  ];

  /* @ngInject */
  function ResetPasswordController($scope, $stateParams, Restangular, Authentication, $state, dpToast, $analytics) {
    /* jshint validthis: true */
    var vm = this;

    vm.activate = activate;
    vm.resetUserPassword = resetUserPassword;

    activate();

    ////////////////

    function activate() {
      if (Authentication.user) $state.go('home');
      $scope.$parent.title = 'Reset your password';
    }

    function resetUserPassword() {
      Restangular.all('auth/reset/' + $stateParams.token).post({newPass : vm.newPass}).then(function() {
        dpToast.success('Your password has been successfully updated, you can now sign in');
        $state.go('userForm.signin');
        $analytics.eventTrack('user-pass-reset', {
          category : $stateParams.token
        });
      });
    }
  }
})();

(function() {
  'use strict';

  angular
    .module('users')
    .run(run);

  run.$inject = ['Restangular', 'Authentication'];

  /* @ngInject */
  function run(Restangular, Authentication) {
    Authentication.user = Restangular.restangularizeElement(null, Authentication.user, 'users');
  }

})();

(function() {
  'use strict';

  angular
    .module('users')
    .config(configure);

  configure.$inject = ['$stateProvider'];

  /* @ngInject */
  function configure($stateProvider) {
    $stateProvider
      .state('userForm', {
        abstract    : true,
        templateUrl : 'modules/users/layout/form-user.client.view.html'
      })
      .state('userForm.profile', {
        url          : '/settings/profile',
        controller   : 'EditProfileController',
        controllerAs : 'vm',
        templateUrl  : 'modules/users/profile/edit-profile.client.view.html',

      })
      .state('userForm.password', {
        url          : '/settings/password',
        controller   : 'ChangePasswordController',
        controllerAs : 'vm',
        templateUrl  : 'modules/users/profile/change-password.client.view.html'
      })
      .state('userForm.signup', {
        url          : '/signup',
        controller   : 'AuthenticationController',
        controllerAs : 'vm',
        templateUrl  : 'modules/users/authentication/signup.client.view.html'
      })
      .state('userForm.signin', {
        url          : '/signin',
        controller   : 'AuthenticationController',
        controllerAs : 'vm',
        templateUrl  : 'modules/users/authentication/signin.client.view.html'
      })
      .state('userForm.forgot', {
        url          : '/password/forgot',
        controller   : 'ForgotPasswordController',
        controllerAs : 'vm',
        templateUrl  : 'modules/users/authentication/password/forgot-password.client.view.html'
      })
      .state('userForm.reset-invalid', {
        url         : '/password/reset/invalid',
        templateUrl : 'modules/users/authentication/password/reset-password-invalid.client.view.html'
      })
      .state('userForm.reset', {
        url          : '/password/reset/:token',
        controller   : 'ResetPasswordController',
        controllerAs : 'vm',
        templateUrl  : 'modules/users/authentication/password/reset-password.client.view.html'
      })
      .state('viewUser', {
        url          : '/users/:userId',
        controller   : 'AnimsUserController',
        controllerAs : 'vm',
        templateUrl  : 'modules/users/animations/anims-user.client.view.html'
      })
      .state('portrait', {
        url          : '/users/:userId/portrait',
        controller   : 'PortraitController',
        controllerAs : 'vm',
        templateUrl  : 'modules/users/portrait/portrait-user.client.view.html'
      });
  }
})();

(function() {
  'use strict';

  angular
    .module('users')
    .directive('dpPortrait', dpPortrait);

  dpPortrait.$inject = ['dpPaperScope', '$rootScope'];

  /* @ngInject */
  function dpPortrait(dpPaperScope, $rootScope) {
    var p = dpPaperScope
      , directive = {
        link     : link,
        restrict : 'A'
      };
    return directive;

    function link(scope, el) {
      p.paperScope.setup(el[0]);
      $rootScope.$broadcast('projectReady');
    }
  }
})();


(function() {
  'use strict';

  angular
    .module('users')
    .directive('dpUserHref', dpUserHref);

  dpUserHref.$inject = [];

  /* @ngInject */
  function dpUserHref() {
    var basePath = 'users/'
      , directive = {
        link     : link,
        restrict : 'A'
      };
    return directive;

    function link(scope, el, attr) {
      attr.$observe('dpUserHref', function(id) {
        if (id) attr.$set('href', basePath + attr.dpUserHref);
      });
    }
  }
})();

(function() {
  'use strict';

  angular
    .module('users')
    .controller('PortraitController', PortraitController);

  PortraitController.$inject = [
    '$scope', '$stateParams', 'Authentication', '$state', 'dpPaperScope', 'dpPortraitTool', 'dpToast', '$analytics'
  ];

  /* @ngInject */
  function PortraitController($scope, $stateParams, Authentication, $state, dpPaperScope, dpPortraitTool, dpToast,
                              $analytics) {
    /* jshint validthis: true */
    var vm = this
      , p = dpPaperScope
      , _ = $scope
      , userImgSrc = 'dist/thumbnails/users/' + $stateParams.userId + '.png?' + new Date().getTime();

    vm.auth = Authentication;
    vm.t = dpPortraitTool;
    vm.p = p;
    vm.activate = activate;
    vm.reset = reset;
    vm.load = load;
    vm.clear = clear;
    vm.save = save;
    vm.addExistingPortrait = addExistingPortrait;

    activate();

    ////////////////

    function activate() {
      if (!vm.auth.user || $stateParams.userId !== vm.auth.user._id) {
        $state.go('userForm.signin');
      }
      $scope.$on('projectReady', function() {
        vm.reset(true);
        vm.load();
        vm.t.init();
      });
    }

    function reset(hideTemplate) {
      p.project.activeLayer.removeChildren();
      vm.background = p.project.activeLayer.dpGetBackground(p.project.view.bounds);
      vm.background.strokeColor = 'black';
      vm.template = new p.Raster({
        source   : 'dist/thumbnails/users/users_tpl.png',
        position : p.view.center
      });
      vm.template.visible = !hideTemplate;
      vm.template.bringToFront();
      vm.drawing = new p.Group();
      vm.drawing.name = 'drawing';
      vm.drawing.bringToFront();
      vm.t.initCursor();
    }

    function load() {
      var img = new Image();
      img.src = userImgSrc;
      if (img.complete) {
        vm.addExistingPortrait(img.src);
      } else {
        img.onload = _.partial(vm.addExistingPortrait, img.src);
        img.onerror = function() {
          vm.template.visible = true;
          p.view.draw();
        };
      }
    }

    function clear() {
      vm.drawing.removeChildren();
      vm.template.remove();
      p.view.draw();
    }

    function addExistingPortrait(src) {
      var portrait = new p.Raster({
        source   : src,
        position : p.view.center
      });
      vm.drawing.addChild(portrait);
      portrait.sendToBack();
    }

    function save() {
      var dataUrl = p.project.activeLayer.dpGetDataURL(p.view.bounds);
      vm.auth.user.post('portrait', {portrait : _.stripBase64(dataUrl)}).then(function() {
        Authentication.user.portraitChangeTime = new Date().getTime();
        dpToast.success('You\'re looking good! Your new portrait was successfully saved');
        $state.go('viewUser', {userId : $stateParams.userId});
        $analytics.eventTrack('user-portrait', {
          category : vm.auth.user._id
        });
      });
    }

  }
})();



(function() {
  'use strict';

  angular
    .module('users')
    .controller('ChangePasswordController', ChangePasswordController);

  ChangePasswordController.$inject = ['$scope', '$state', 'Authentication', 'dpToast', '$analytics'];

  /* @ngInject */
  function ChangePasswordController($scope, $state, Authentication, dpToast, $analytics) {
    /* jshint validthis: true */
    var vm = this;

    vm.user = Authentication.user;
    vm.activate = activate;
    vm.changePassword = changePassword;

    activate();

    ////////////////

    function activate() {
      if (!Authentication.user) $state.go('userForm.signin');
      $scope.$parent.title = 'Change password';
    }

    function changePassword() {
      vm.user.post('password', vm.passwordDetails).then(function() {
        dpToast.success('Your password was successfully changed');
        $state.go('viewUser', {userId : vm.user._id});
        $analytics.eventTrack('user-pass-change', {
          category : vm.user._id
        });
      });
    }
  }
})();

(function() {
  'use strict';

  angular
    .module('users')
    .controller('EditProfileController', EditProfileController);

  EditProfileController.$inject = [
    '$scope', '$state', 'Authentication', 'UsersConfig', 'dpToast', 'dpResource', '$analytics'
  ];

  /* @ngInject */
  function EditProfileController($scope, $state, Authentication, UsersConfig, dpToast, dpResource, $analytics) {
    /* jshint validthis: true */
    var vm = this;

    vm.user = Authentication.user;
    vm.UsersConfig = UsersConfig;
    vm.activate = activate;
    vm.saveProfile = saveProfile;

    activate();

    ////////////////

    function activate() {
      if (!Authentication.user) $state.go('userForm.signin');
      $scope.$parent.title = 'Edit your profile';
    }

    function saveProfile() {
      vm.user.save().then(function() {
        dpToast.success('Your profile was successfully updated');
        dpResource.add(vm.user, 'users');
        $state.go('viewUser', {userId : vm.user._id});
        $analytics.eventTrack('user-profile', {
          category : vm.user._id
        });
      });
    }
  }
})();

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


