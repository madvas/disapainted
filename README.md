[![Disapainted Logo](http://disapainted.com/modules/core/img/disapainted.png)](http://disapainted.com/)

## About

Disapainted.com is a web application for creating pivot animations online. Pivot animations are funny 2D stick-man animations, which you easily create by dragging stick figure handles. This web app is heavily inspired by [Pivot Animator](http://pivotanimator.net/) desktop application.

## Contribution

Anyone is more than welcome to contribute. Before you can run this web app on your local machine you need to have installed:
* [Node.js](http://nodejs.org/)
* [MongoDB](https://www.mongodb.org/)
* [npm](https://github.com/npm/npm)
* [Node Canvas](https://github.com/Automattic/node-canvas)
* [bower](http://bower.io/)
* [grunt](http://gruntjs.com/installing-grunt)

After you've installed all above components on your local machine, you can install disapainted with following commands: 
* `git clone https://github.com/madvas/disapainted`
* `cd disapainted`
* `npm install`
* `bower install`
* make sure your mongodb is running `sudo service mongodb start`
* run tests `grunt test`
* run development version: `grunt development`

Now you should be up and running. Database will be empty, but you can use app itself to create your new user account and consequently create animations :)

## Thanks

I'd like to express infinite thanks to following open source technologies, which are building blocks for disapainted

* [Node.js](https://github.com/joyent/node)
* [Express.js](https://github.com/strongloop/expressjs.com)
* [Angularjs](https://github.com/angular/angular.js)
* [MongoDB](https://github.com/mongodb/mongo)
* [Paper.js](https://github.com/paperjs/paper.js)
* and many many more...
