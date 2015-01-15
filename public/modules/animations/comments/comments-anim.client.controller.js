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

