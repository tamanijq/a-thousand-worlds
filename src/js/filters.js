var $ = require("./lib/qsa");

var channel = require("./pubsub");

var filterList = $.one("form.filters");
var viewToggle = $.one(".view-controls");

var getFilters = function() {
  var years = $(".years input:checked", filterList).map(el => el.value * 1);
  var year = years.pop();
  var tags = $(".tags input:checked", filterList).map(el => el.value);
  var view = $.one(".view-controls input:checked").value;

  return { year, tags, view };
};

var setFilters = function(state) {
  var { year, tags, view} = state;

  // update form
  if (year) {
    $(".filters .years input").forEach(input => input.checked = input.value * 1 == year);
  }

  tags = new Set(tags);
  $(".filters .tags input").forEach(input => input.checked = tags.has(input.value));
  
  if (view) {
    $.one(`.view-controls input[value="${view}"]`).checked = true;
  }

  return state;
}

var onChange = function() {
  var state = getFilters();
  channel.send("filterchange", state);
};

filterList.addEventListener("change", onChange);
viewToggle.addEventListener("change", onChange);

module.exports = { getFilters, setFilters }



$.one(".fab-form .tags").addEventListener("change", function() {
  var select = event.target;
  var options = select.selectedOptions;
  var values = new Set();
  for (var i = 0; i < options.length; i++) {
    values.add(options[i].value);
  }
  $(".filters .tags input").forEach(function(input) {
    input.checked = values.has(input.value);
  });
  var change = new Event("change");
  filterList.dispatchEvent(change);
});