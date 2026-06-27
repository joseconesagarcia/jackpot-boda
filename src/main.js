const MAX_MONEY = 600;

let currentQuestionIndex = 0;
let highestReachedIndex = 0;
let totalMoney = 0;
let moneyAnimationFrame = null;
let questionsData = [];
// Map<index, { correct: boolean, userAnswer: string, prize: number }>
const answeredQuestions = new Map();

const moneyAmountEl = document.getElementById("money-amount");
const moneyDisplayEl = document.getElementById("money-display");
const progressLabel = document.getElementById("progress-label");
const questionCard = document.getElementById("question-card");
const prizeTag = document.getElementById("prize-tag");
const statusLine = document.getElementById("status-line");
const questionText = document.getElementById("question-text");
const answerInput = document.getElementById("answer-input");
const answerForm = document.getElementById("answer-form");
const feedbackMessage = document.getElementById("feedback-message");
const submitBtn = document.getElementById("submit-btn");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const reviewActions = document.getElementById("review-actions");
const redoBtn = document.getElementById("redo-btn");
const fakeBtn = document.getElementById("fake-btn");
const fakeModal = document.getElementById("fake-modal");
const fakeModalClose = document.getElementById("fake-modal-close");

const modal = document.getElementById("modal");
const modalContent = document.querySelector(".modal-content");
const modalTitle = document.getElementById("modal-title");
const modalSubtitle = document.getElementById("modal-subtitle");
const modalMoney = document.getElementById("modal-money");
const modalMessage = document.getElementById("modal-message");
const restartBtn = document.getElementById("restart-btn");

function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function formatMoney(amount) {
  return new Intl.NumberFormat("es-ES").format(amount);
}

function animateValue(from, to, duration, onUpdate, onComplete) {
  const start = performance.now();

  function step(timestamp) {
    const progress = Math.min((timestamp - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(from + (to - from) * eased);

    onUpdate(value);

    if (progress < 1) {
      moneyAnimationFrame = requestAnimationFrame(step);
      return;
    }

    moneyAnimationFrame = null;
    onComplete?.();
  }

  moneyAnimationFrame = requestAnimationFrame(step);
}

function updateMoneyUI(amount) {
  const currentValue = Number.parseInt(moneyAmountEl.dataset.value || "0", 10);

  if (moneyAnimationFrame) {
    cancelAnimationFrame(moneyAnimationFrame);
    moneyAnimationFrame = null;
  }

  moneyDisplayEl.classList.add("pulse");

  animateValue(
    currentValue,
    amount,
    520,
    (nextValue) => {
      moneyAmountEl.dataset.value = String(nextValue);
      moneyAmountEl.innerText = formatMoney(nextValue);
    },
    () => {
      moneyDisplayEl.classList.remove("pulse");
    },
  );
}

function updateProgressUI() {
  const totalQuestions = questionsData.length;
  const visibleQuestion = totalQuestions
    ? Math.min(currentQuestionIndex + 1, totalQuestions)
    : 1;

  progressLabel.innerText = `Pregunta ${visibleQuestion}`;

  prevBtn.disabled = currentQuestionIndex <= 0;
  nextBtn.disabled = currentQuestionIndex >= highestReachedIndex;
}

function clearFeedback() {
  feedbackMessage.className = "feedback-message";
  feedbackMessage.innerText = "";
}

function setFeedback(message, type) {
  feedbackMessage.className = `feedback-message show ${type}`;
  feedbackMessage.innerText = message;
}

function loadQuestion(index) {
  if (index >= questionsData.length) {
    endGame(false, "Te has quedado sin preguntas.");
    return;
  }

  currentQuestionIndex = index;
  highestReachedIndex = Math.max(highestReachedIndex, index);

  const question = questionsData[index];
  const answered = answeredQuestions.get(index);

  const availableToWin = answered
    ? answered.prize
    : Math.max(0, Math.min(question.prize, MAX_MONEY - totalMoney));

  updateProgressUI();

  prizeTag.innerText = `Premio de esta ronda: ${formatMoney(availableToWin)} EUR`;
  questionText.innerText = question.question;

  if (answered) {
    answerInput.value = answered.userAnswer;
    answerInput.disabled = true;
    submitBtn.disabled = true;
    statusLine.innerText = answered.correct
      ? "Ya respondiste esta pregunta correctamente."
      : "Ya respondiste esta pregunta. La respuesta era: " + question.answer;
    setFeedback(
      answered.correct ? "Respuesta correcta." : `No era esa. La correcta era: ${question.answer}`,
      answered.correct ? "correct" : "wrong",
    );
    reviewActions.style.display = "flex";
    fakeBtn.style.display = answered.correct ? "none" : "flex";
  } else {
    answerForm.dataset.currentPrize = String(availableToWin);
    answerInput.value = "";
    answerInput.disabled = false;
    submitBtn.disabled = false;
    statusLine.innerText =
      availableToWin > 0
        ? "Escribe la respuesta y pulsa el boton para seguir sumando."
        : "Ya has alcanzado el maximo. Esta ronda es solo para lucirse.";
    clearFeedback();
    reviewActions.style.display = "none";
    answerInput.focus();
  }
}

function endGame(hitJackpot, customReason = "") {
  setTimeout(() => {
    const missingMoney = Math.max(MAX_MONEY - totalMoney, 0);

    modal.style.display = "flex";
    updateProgressUI();

    if (hitJackpot || totalMoney >= MAX_MONEY) {
      modalContent.classList.remove("lose");
      modalTitle.innerText = "JACKPOT";
      modalSubtitle.innerText = "Has alcanzado el premio maximo.";
      modalMessage.innerText =
        "Increible jugada. Has cerrado la partida con todo el bote.";
    } else {
      modalContent.classList.add("lose");
      modalTitle.innerText = "Juego terminado";
      modalSubtitle.innerText = "No quedaban mas preguntas.";
      modalMessage.innerText = `${customReason} Como premio de cierre te sumamos ${formatMoney(missingMoney)} EUR para llegar a 600 EUR.`;
      totalMoney = MAX_MONEY;
    }

    updateMoneyUI(totalMoney);
    modalMoney.innerText = formatMoney(totalMoney);
  }, 720);
}

answerForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const question = questionsData[currentQuestionIndex];
  const userAnswerRaw = answerInput.value;
  const currentPrize = Number.parseInt(answerForm.dataset.currentPrize || "0", 10);

  if (!question || !userAnswerRaw.trim()) {
    return;
  }

  submitBtn.disabled = true;
  answerInput.disabled = true;

  const normalizedUser = normalizar(userAnswerRaw);
  const normalizedCorrect = normalizar(question.answer);

  if (normalizedUser === normalizedCorrect) {
    totalMoney += currentPrize;
    updateMoneyUI(totalMoney);
    answeredQuestions.set(currentQuestionIndex, { correct: true, userAnswer: userAnswerRaw, prize: currentPrize });

    questionCard.classList.add("success");
    setFeedback("Respuesta correcta.", "correct");

    setTimeout(() => {
      questionCard.classList.remove("success");

      if (totalMoney >= MAX_MONEY) {
        endGame(true);
        return;
      }

      loadQuestion(currentQuestionIndex + 1);
    }, 1200);

    return;
  }

  answeredQuestions.set(currentQuestionIndex, { correct: false, userAnswer: userAnswerRaw, prize: currentPrize });
  questionCard.classList.add("shake");
  setFeedback(`No era esa. La correcta era: ${question.answer}`, "wrong");

  setTimeout(() => {
    questionCard.classList.remove("shake");
    loadQuestion(currentQuestionIndex + 1);
  }, 920);
});

redoBtn.addEventListener("click", () => {
  const answered = answeredQuestions.get(currentQuestionIndex);
  if (!answered) return;

  if (answered.correct) {
    totalMoney -= answered.prize;
    updateMoneyUI(totalMoney);
  }

  answeredQuestions.delete(currentQuestionIndex);
  loadQuestion(currentQuestionIndex);
});

fakeBtn.addEventListener("click", () => {
  fakeModal.style.display = "flex";
});

fakeModalClose.addEventListener("click", () => {
  fakeModal.style.display = "none";
});

fakeModal.addEventListener("click", (e) => {
  if (e.target === fakeModal) fakeModal.style.display = "none";
});

prevBtn.addEventListener("click", () => {
  if (currentQuestionIndex > 0) {
    loadQuestion(currentQuestionIndex - 1);
  }
});

nextBtn.addEventListener("click", () => {
  if (currentQuestionIndex < highestReachedIndex) {
    loadQuestion(currentQuestionIndex + 1);
  }
});

restartBtn.addEventListener("click", () => {
  currentQuestionIndex = 0;
  highestReachedIndex = 0;
  totalMoney = 0;
  answeredQuestions.clear();
  moneyAmountEl.dataset.value = "0";
  moneyAmountEl.innerText = "0";
  modal.style.display = "none";
  modalContent.classList.remove("lose");
  loadQuestion(0);
});

async function loadQuestions() {
  const response = await fetch("./src/questions.json", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`No se pudieron cargar las preguntas: ${response.status}`);
  }

  return response.json();
}

async function initGame() {
  try {
    questionsData = await loadQuestions();

    if (!Array.isArray(questionsData) || questionsData.length === 0) {
      throw new Error("El banco de preguntas esta vacio.");
    }

    loadQuestion(0);
  } catch (error) {
    questionText.innerText = "No se pudo iniciar el juego.";
    statusLine.innerText =
      "Fallo al cargar las preguntas. Revisa el despliegue del JSON.";
    answerInput.disabled = true;
    submitBtn.disabled = true;
    setFeedback(error.message, "wrong");
  }
}

initGame();
