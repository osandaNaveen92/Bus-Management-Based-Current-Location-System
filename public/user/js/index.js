// index.js

function toggleDropdown() {
  const dropdown = document.getElementById("loginDropdown");
  dropdown.classList.toggle("show");
}

// Optional: close dropdown when clicking outside
window.addEventListener("click", function (event) {
  if (!event.target.matches('.btn')) {
    const dropdowns = document.getElementsByClassName("dropdown-content");
    for (const d of dropdowns) {
      if (d.classList.contains("show")) {
        d.classList.remove("show");
      }
    }
  }
});
