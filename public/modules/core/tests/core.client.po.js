exports.getUrl = function() {
  if (!process.env.URL && !process.env.PORT) {
    return 'http://localhost:3000';
  }
  return (process.env.URL || 'http://localhost:') + (process.env.PORT || ':80');
};
