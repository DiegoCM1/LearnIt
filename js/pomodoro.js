let timeLeft = 1500; // 25 minutes in seconds
let timerId = null;
const stopBtn = document.getElementById("stopButton");
const startBtn = document.getElementById("startButton");
stopBtn.style.display = "none";

function updateDisplay() {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const display = `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
  document.getElementById("timer").textContent = display;
}

function startTimer() {
  if (timerId === null) {
    timerId = setInterval(() => {
      timeLeft--;
      updateDisplay();
      if (timeLeft === 0) {
        clearInterval(timerId);
        timerId = null;
      }
    }, 1000);
    startBtn.style.display = "none";
    stopBtn.style.display = "flex";
  }
}

function stopTimer() {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
    startBtn.style.display = "flex";
    stopBtn.style.display = "none";
    timeLeft = 1500; // 25 minutes in seconds
  }
  updateDisplay();
}

// Initialize display
document.addEventListener("DOMContentLoaded", updateDisplay);
