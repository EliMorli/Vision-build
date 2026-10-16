(function () {
  var input = document.getElementById("license-search");
  var count = document.getElementById("result-count");
  var empty = document.getElementById("no-results");
  var items = Array.prototype.slice.call(document.querySelectorAll("[data-package]"));
  var total = items.length;
  function update() {
    var q = input.value.trim().toLowerCase();
    var shown = 0;
    items.forEach(function (li) {
      var match = !q || li.getAttribute("data-search").indexOf(q) !== -1;
      li.hidden = !match;
      if (match) shown++;
    });
    count.textContent = q ? "Showing " + shown + " of " + total + " packages" : total + " packages";
    empty.hidden = shown !== 0;
  }
  input.addEventListener("input", update);
  update();
})();
