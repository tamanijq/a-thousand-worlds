var $ = require("./lib/qsa");
var bookService = require("./bookService");
var dot = require("./lib/dot");
var flip = require("./lib/flip");
var hash = require("./hash");
var lazyload = require("./lazyLoading");

var bookTemplate = dot.compile(require("./_book.html"));
var listTemplate = dot.compile(require("./_list.html"));
var coverTemplate = dot.compile(require("./_cover.html"));

var coverContainer = $.one(".catalog-covers");
var listContainer = $.one(".catalog-list");
var bookPanel = $.one(".book-detail");
var bookCounter = $.one(".book-count");

// single book rendering
var renderBook = async function(params, previous) {
  var book = await bookService.getDetail(params.year, params.book);
  var back = hash.serialize(previous.year ? previous : { year: params.year });
  var reviewer = window.conciergeData.reviewers[book.reviewer] || {};
  bookPanel.innerHTML = bookTemplate({ book, back, hash, reviewer });
  document.body.setAttribute("data-mode", "book");
  var h2 = $.one("h2", bookPanel);
  h2.focus();
};

// check a given book against the filters
var checkVisibility = function(b, year, tags) {
  var visible = true;
  if (b.year != year) visible = false;
  if (tags.length) {
    var matches = tags.every(t => b.tags.has(t));
    if (!matches) visible = false;
  }
  return visible;
};

// update book counts
var updateCounts = function(count) {
  bookCounter.innerHTML = count;
  document.body.setAttribute("data-count", count);
}

var renderCovers = function(books, year, tags) {
  $(".book-container").forEach(el => el.classList.add("hidden"));
  var visible = books.filter(b => checkVisibility(b, year, tags));
  updateCounts(visible.length);

  var elements = books.map(b => b.coverElement);

  flip(elements, function() {
    var visibleSet = new Set(visible);
    books.forEach(function(book) {
      book.coverElement.classList.toggle("hidden", !visibleSet.has(book));
    });
  });
};

var renderCatalog = async function(year, tags, view = "covers") {
  var books = await bookService.getYear(year);

  // clear out placeholders
  $(".placeholder", coverContainer).forEach(e => e.parentElement.removeChild(e));

  // render lazily
  if (view == "covers") {
    // add new books (if any)
    books.filter(b => !b.coverElement).sort((a, b) => a.shuffle - b.shuffle).forEach(function(book) {
      var element = document.createElement("li");
      element.dataset.isbn = book.isbn;
      element.className = "book-container";
      element.innerHTML = coverTemplate({ book });
      book.coverElement = element;
      coverContainer.appendChild(book.coverElement);
    });
    return renderCovers(books, year, tags);
  } else {
    // list view just renders in bulk
    // we should probably change this at some point
    // but it makes sorting way easier
    var filtered = books.filter(b => checkVisibility(b, year, tags));
    filtered.sort((a, b) => a.title < b.title ? -1 : 1);
    updateCounts(filtered.length);
    listContainer.innerHTML = listTemplate({ books: filtered });
    lazyload.reset();
  }

};

module.exports = { renderCatalog, renderBook };