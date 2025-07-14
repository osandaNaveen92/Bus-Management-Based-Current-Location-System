// index.js

function goToLogin(role) {
  switch (role) {
    case 'admin':
      window.location.href = 'admin.html';
      break;
    case 'driver':
      window.location.href = 'driver.html';
      break;
    case 'user':
      window.location.href = 'user.html';
      break;
    default:
      alert("Invalid role selected.");
  }
}

// Toggle role options visibility with animation
const roleBtn = document.getElementById("roleBtn");
const roleOptions = document.getElementById("roleOptions");

roleBtn.addEventListener("click", () => {
  roleOptions.classList.toggle("show");
});
