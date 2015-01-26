/* global importScripts, postMessage, GIFEncoder */
importScripts('/dist/customized/jsgif/jsgif.min.js');

this.onmessage = function(msg) {
  var encoder = new GIFEncoder()
    , imgData = msg.data[0]
    , length = imgData.length
    , delays = msg.data[1]
    , width = msg.data[2]
    , height = msg.data[3];

  encoder.setRepeat(0);
  encoder.start();
  encoder.setSize(width, height);

  for (var i = 0; i < length; i++) {
    encoder.setDelay(delays[i]);
    encoder.addFrame(imgData[i], true);
    postMessage({type : 'progress', value : i + 1});
  }
  encoder.finish();
  postMessage({type : 'result', value : encoder.stream().getData()});
};
