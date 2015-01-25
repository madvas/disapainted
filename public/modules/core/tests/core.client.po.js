exports.getUrl = function() {
  return (process.env.URL || 'http://localhost:') + (process.env.PORT || ':80');
};
