var { promisify } = require("util");
var imageSize = promisify(require("image-size"));

var normalizeTags = function(tags) {
  return tags.toLowerCase().replace(/['’]/g, "’");
};

var shelve = async function(grunt) {
  var shelf = [];

  for (var row of grunt.data.json.years) {
    var { year, sheet } = row;
    console.log("Shelving " + year);
    var collection = grunt.data.json[sheet];
    var index = [];
    var lookup = {};
    var links = grunt.data.json.links.filter(l => l.year == year);
    for (var book of collection) {
      // normalize and trim
      book.year = year;
      book.tags = normalizeTags(book.tags);
      book.text = grunt.template.renderMarkdown(book.text);
      "title author reviewer text".split(" ").forEach(p => book[p] = book[p].trim());
      var isbn = String(book.isbn).trim();
      if (isbn.length == 9) isbn = "0" + isbn;
      book.isbn = isbn;

      // create 13-digit ISBN
      if (book.isbn.length == 13) {
        book.isbn13 = book.isbn;
      } else {
        var isbn13 = "978" + book.isbn.slice(0, 9);
        var odds = [1, 3, 5, 7, 9, 11].map(n => Number(isbn13[n])).reduce((acc, n) => n + acc) * 3;
        var evens = [0, 2, 4, 6, 8, 10].map(n => Number(isbn13[n])).reduce((acc, n) => n + acc);
        var remainder = (odds + evens) % 10;
        var check = remainder ? 10 - remainder : 0;
        book.isbn13 = isbn13 + check;
        console.log(book.isbn, book.isbn13);
      }

      // join against links, reviewers
      book.links = links.filter(l => l.id == book.id);

      var indexEntry = {
        title: book.title,
        author: book.author,
        dimensions: {},
        isbn: book.isbn,
        tags: book.tags
      };
      try {
        var size = await imageSize(`src/assets/covers/${book.isbn}.jpg`);
        indexEntry.dimensions = {
          width: size.width,
          height: size.height
        };
      } catch (_) { }
      shelf.push(book);
      index.push(indexEntry);
      lookup[book.isbn] = book;
    };
    grunt.file.write(`build/${year}.json`, JSON.stringify(index, null, 2));
    grunt.file.write(`build/${year}-detail.json`, JSON.stringify(lookup, null, 2));
  }

  grunt.data.shelf = shelf;

  grunt.file.write("build/shelf.json", JSON.stringify(shelf, null, 2));
}


module.exports = function(grunt) {

  grunt.registerTask("shelve", "Assemble books from individual years", function() {

    grunt.task.requires("json");

    var done = this.async();

    shelve(grunt).then(done);

  });

}