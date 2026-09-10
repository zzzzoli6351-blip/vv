/**
 * App Controller for Ear Training Mini App
 * Single Sustained Tone Auditory Training (한 음 지속 청각 체화 훈련)
 */

// Application State
const state = {
  config: {
    difficulty: 'basic',  // 'basic' (100% 동일음) | 'medium' (80% 동일음) | 'hard' (미세 차이)
    questionCount: 20,    // 20회 이상 기본
    soundType: 'piano',   // 'piano' | 'sine' | 'synth' | 'bell'
    volume: 0.7
  },
  targetTone: {
    note: 'C4',
    freq: 261.63,
    name: 'C4 (도 · 261Hz)'
  },
  questions: [],
  currentIndex: 0,
  userAnswers: [],
  score: 0,
  isAudioPlaying: false,
  visualizerAnimId: null
};

// DOM Elements
const elements = {
  // Screens
  screens: {
    setup: document.getElementById('screen-setup'),
    quiz: document.getElementById('screen-quiz'),
    result: document.getElementById('screen-result')
  },
  
  // Setup inputs
  difficultyInputs: document.querySelectorAll('input[name="difficulty"]'),
  questionCountInputs: document.querySelectorAll('input[name="questionCount"]'),
  soundTypeInputs: document.querySelectorAll('input[name="soundType"]'),
  volumeSlider: document.getElementById('volume-slider'),
  btnPreviewSound: document.getElementById('btn-preview-sound'),
  btnStartTraining: document.getElementById('btn-start-training'),

  // Quiz elements
  quizProgressIndicator: document.getElementById('quiz-progress-indicator'),
  quizDifficultyBadge: document.getElementById('quiz-difficulty-badge'),
  quizProgressFill: document.getElementById('quiz-progress-fill'),
  waveformCanvas: document.getElementById('waveform-canvas'),
  indicatorSingleTone: document.getElementById('indicator-single-tone'),
  indicatorToneText: document.getElementById('indicator-tone-text'),
  targetToneInfo: document.getElementById('target-tone-info'),
  questionPromptText: document.getElementById('question-prompt-text'),
  btnReplayQuestion: document.getElementById('btn-replay-question'),
  choiceButtons: document.querySelectorAll('.btn-choice'),

  // Result elements
  resultScoreNum: document.getElementById('result-score-num'),
  resultScoreTotal: document.getElementById('result-score-total'),
  resultTitle: document.getElementById('result-title'),
  resultDesc: document.getElementById('result-desc'),
  revealBtnCount: document.getElementById('reveal-btn-count'),
  btnRevealAnswers: document.getElementById('btn-reveal-answers'),
  answersDetailPanel: document.getElementById('answers-detail-panel'),
  answersList: document.getElementById('answers-list'),
  btnRetrySame: document.getElementById('btn-retry-same'),
  btnGoSetup: document.getElementById('btn-go-setup'),

  // Theme Toggle
  btnThemeToggle: document.getElementById('btn-theme-toggle'),
  themeIcon: document.getElementById('theme-icon'),
  themeText: document.getElementById('theme-text'),

  // Toast
  toast: document.getElementById('toast')
};

// Target Note Options for Ear Training
const TARGET_NOTES = [
  { note: 'C4', freq: 261.63, name: 'C4 (도 · 261Hz)' },
  { note: 'D4', freq: 293.66, name: 'D4 (레 · 294Hz)' },
  { note: 'E4', freq: 329.63, name: 'E4 (미 · 330Hz)' },
  { note: 'F4', freq: 349.23, name: 'F4 (파 · 349Hz)' },
  { note: 'G4', freq: 392.00, name: 'G4 (솔 · 392Hz)' },
  { note: 'A4', freq: 440.00, name: 'A4 (라 · 440Hz 표준음)' },
  { note: 'B4', freq: 493.88, name: 'B4 (시 · 494Hz)' },
  { note: 'C5', freq: 523.25, name: 'C5 (높은 도 · 523Hz)' }
];

/* =========================================================
   Initialization
   ========================================================= */
function initApp() {
  setupEventListeners();
  initVisualizer();
}

function setupEventListeners() {
  // Volume slider
  elements.volumeSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    state.config.volume = val;
    window.audioEngine.setVolume(val);
  });

  // Sound Preview Button
  elements.btnPreviewSound.addEventListener('click', () => {
    getSelectedConfig();
    window.audioEngine.init();
    window.audioEngine.setVolume(state.config.volume);
    window.audioEngine.playContinuousTone(state.targetTone.freq, state.config.soundType, 1.0);
    showToast(`'${getSoundTypeName(state.config.soundType)}' 지속음 미리듣기`);
  });

  // Start Training
  elements.btnStartTraining.addEventListener('click', () => {
    getSelectedConfig();
    startQuiz();
  });

  // Replay Question
  elements.btnReplayQuestion.addEventListener('click', () => {
    if (state.isAudioPlaying) return;
    playCurrentQuestionAudio();
  });

  // Choice Buttons
  elements.choiceButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const choice = btn.dataset.choice;
      handleAnswerSelection(choice);
    });
  });

  // Reveal Answers Button
  elements.btnRevealAnswers.addEventListener('click', () => {
    revealAnswers();
  });

  // Retry Same Config
  elements.btnRetrySame.addEventListener('click', () => {
    startQuiz();
  });

  // Go to Setup
  elements.btnGoSetup.addEventListener('click', () => {
    switchScreen('setup');
  });

  // Theme Toggle Button
  if (elements.btnThemeToggle) {
    elements.btnThemeToggle.addEventListener('click', () => {
      const isDark = document.body.classList.toggle('dark-mode');
      if (isDark) {
        elements.themeIcon.textContent = '☀️';
        elements.themeText.textContent = '밝은 모드';
        showToast('어두운 화면(다크 모드)으로 변경되었습니다.');
      } else {
        elements.themeIcon.textContent = '🌙';
        elements.themeText.textContent = '다크 모드';
        showToast('밝은 화면(라이트 모드)으로 변경되었습니다.');
      }
    });
  }

  // Keyboard Shortcuts for Quiz
  window.addEventListener('keydown', (e) => {
    if (!elements.screens.quiz.classList.contains('active')) return;
    if (state.isAudioPlaying) return;

    if (e.key === '1' || e.key === 'o' || e.key === 'O' || e.key === 'Enter') {
      handleAnswerSelection('same');
    } else if (e.key === '2' || e.key === 'x' || e.key === 'X') {
      handleAnswerSelection('diff');
    } else if (e.code === 'Space') {
      e.preventDefault();
      playCurrentQuestionAudio();
    }
  });
}

function getSelectedConfig() {
  const diffEl = document.querySelector('input[name="difficulty"]:checked');
  if (diffEl) state.config.difficulty = diffEl.value;

  const countEl = document.querySelector('input[name="questionCount"]:checked');
  if (countEl) state.config.questionCount = parseInt(countEl.value, 10);

  const soundEl = document.querySelector('input[name="soundType"]:checked');
  if (soundEl) state.config.soundType = soundEl.value;
}

function switchScreen(screenName) {
  Object.keys(elements.screens).forEach(name => {
    elements.screens[name].classList.toggle('active', name === screenName);
  });
}

function showToast(msg) {
  elements.toast.textContent = msg;
  elements.toast.classList.add('show');
  setTimeout(() => {
    elements.toast.classList.remove('show');
  }, 2200);
}

function getSoundTypeName(type) {
  switch (type) {
    case 'piano': return '피아노';
    case 'sine': return '사인파';
    case 'synth': return '레트로 신스';
    case 'bell': return '일렉 벨';
    default: return type;
  }
}

function getDifficultyName(diff) {
  switch (diff) {
    case 'basic': return '가장 기초 (100% 동일음)';
    case 'medium': return '보통 (80% 동일음)';
    case 'hard': return '어려움 (미세 센트 차이)';
    default: return diff;
  }
}

/* =========================================================
   Question Generator: Single Sustained Tone
   Requirement: "음의 변화가 아니라 한 음만 지속적으로 나오고
   난위도 가장 기초부터 같은 소리가 20회 이상이 기본이 되도록"
   ========================================================= */
function generateQuestions() {
  const list = [];
  const count = state.config.questionCount;
  const diff = state.config.difficulty;

  // Pick a base target note for this session (Default C4 or A4)
  state.targetTone = TARGET_NOTES[0]; // C4 (도 · 261.63Hz)
  const baseFreq = state.targetTone.freq;

  for (let i = 1; i <= count; i++) {
    let freq = baseFreq;
    let actualAnswer = 'same';
    let detailDesc = '';

    if (diff === 'basic') {
      // 1. 가장 기초: 20회 이상 100% 동일한 한 음 지속 재생!
      freq = baseFreq;
      actualAnswer = 'same';
      detailDesc = `기준음과 100% 동일한 지속음 (${state.targetTone.name})`;
    } else if (diff === 'medium') {
      // 2. 보통: 80%는 동일한 소리, 20%는 온음/반음 차이의 다른 소리
      const isSame = Math.random() < 0.80;
      if (isSame) {
        freq = baseFreq;
        actualAnswer = 'same';
        detailDesc = `기준음과 동일한 소리 (${Math.round(baseFreq)}Hz)`;
      } else {
        const semitones = (Math.random() < 0.5 ? 1 : 2) * (Math.random() < 0.5 ? 1 : -1);
        freq = baseFreq * Math.pow(2, semitones / 12);
        actualAnswer = 'diff';
        const dirText = semitones > 0 ? `${Math.abs(semitones)}반음 높음` : `${Math.abs(semitones)}반음 낮음`;
        detailDesc = `다른 소리 (${dirText} · ${Math.round(freq)}Hz)`;
      }
    } else {
      // 3. 어려움: 70%는 동일한 소리, 30%는 미세 센트 차이(20~40센트)
      const isSame = Math.random() < 0.70;
      if (isSame) {
        freq = baseFreq;
        actualAnswer = 'same';
        detailDesc = `기준음과 동일한 소리 (${baseFreq.toFixed(1)}Hz)`;
      } else {
        const cents = (Math.floor(Math.random() * 21) + 20) * (Math.random() < 0.5 ? 1 : -1);
        freq = baseFreq * Math.pow(2, cents / 1200);
        actualAnswer = 'diff';
        const dirText = cents > 0 ? `+${cents}센트 미세 차이` : `${cents}센트 미세 차이`;
        detailDesc = `미세하게 다른 소리 (${dirText} · ${freq.toFixed(1)}Hz)`;
      }
    }

    list.push({
      qNum: i,
      freq: freq,
      actualAnswer: actualAnswer,
      detailDesc: detailDesc,
      userChoice: null,
      isCorrect: null
    });
  }

  return list;
}

/* =========================================================
   Quiz Flow
   ========================================================= */
function startQuiz() {
  window.audioEngine.init();
  state.questions = generateQuestions();
  state.currentIndex = 0;
  state.userAnswers = [];
  state.score = 0;

  // UI Setup
  elements.quizDifficultyBadge.textContent = `${getDifficultyName(state.config.difficulty)} · ${getSoundTypeName(state.config.soundType)}`;
  elements.targetToneInfo.textContent = `기준음: ${getSoundTypeName(state.config.soundType)} ${state.targetTone.name}`;
  elements.answersDetailPanel.classList.remove('visible');
  elements.btnRevealAnswers.style.display = 'flex';

  switchScreen('quiz');
  renderCurrentQuestion();
  
  // Auto-play audio
  setTimeout(() => {
    playCurrentQuestionAudio();
  }, 400);
}

function renderCurrentQuestion() {
  const current = state.questions[state.currentIndex];
  const total = state.questions.length;
  const num = state.currentIndex + 1;

  elements.quizProgressIndicator.textContent = `문제 ${num} / ${total}`;
  const pct = Math.round((num / total) * 100);
  elements.quizProgressFill.style.width = `${pct}%`;

  setSingleToneIndicator(false, '소리 재생 준비');
}

async function playCurrentQuestionAudio() {
  if (state.isAudioPlaying) return;
  const current = state.questions[state.currentIndex];
  if (!current) return;

  state.isAudioPlaying = true;
  toggleButtonsDisabled(true);

  setSingleToneIndicator(true, '한 음 지속 재생 중... 🔊');

  await window.audioEngine.playContinuousTone(
    current.freq,
    state.config.soundType,
    1.3,
    (status) => {
      if (status === 'start') {
        setSingleToneIndicator(true, '한 음 지속 재생 중... 🔊');
      } else {
        setSingleToneIndicator(false, '청취 완료 (답안을 선택하세요)');
      }
    }
  );

  state.isAudioPlaying = false;
  toggleButtonsDisabled(false);
}

function setSingleToneIndicator(isActive, text) {
  if (elements.indicatorSingleTone) {
    elements.indicatorSingleTone.classList.toggle('active', isActive);
  }
  if (elements.indicatorToneText) {
    elements.indicatorToneText.textContent = text;
  }
}

function toggleButtonsDisabled(disabled) {
  elements.btnReplayQuestion.disabled = disabled;
  elements.choiceButtons.forEach(b => b.disabled = disabled);
}

function handleAnswerSelection(choice) {
  if (state.isAudioPlaying) return;

  const current = state.questions[state.currentIndex];
  current.userChoice = choice;
  current.isCorrect = (choice === current.actualAnswer);

  if (current.isCorrect) {
    state.score++;
  }

  // NOTE Requirement: "1문제가 끝나면 답이 바로 나오게 하지 말고 20문제가 끝나면 답이 나오게"
  // Move directly to next question without immediate answer display
  state.currentIndex++;

  if (state.currentIndex < state.questions.length) {
    renderCurrentQuestion();
    setTimeout(() => {
      playCurrentQuestionAudio();
    }, 350);
  } else {
    // All 20+ questions finished!
    showQuizFinished();
  }
}

/* =========================================================
   Quiz Finished & Result Screen
   ========================================================= */
function showQuizFinished() {
  switchScreen('result');

  const total = state.questions.length;
  const correct = state.score;
  const percentage = Math.round((correct / total) * 100);

  // Result numbers
  elements.resultScoreNum.textContent = correct;
  elements.resultScoreTotal.textContent = `/ ${total}`;
  elements.revealBtnCount.textContent = total;

  if (percentage === 100) {
    elements.resultTitle.textContent = '🏆 완벽한 집중력과 청각!';
    elements.resultDesc.textContent = `${total}회 모든 소리를 완벽하게 인지하고 체화하였습니다!`;
  } else if (percentage >= 80) {
    elements.resultTitle.textContent = '🌟 뛰어난 동일음 집중 인지!';
    elements.resultDesc.textContent = `${total}회 중 ${correct}회를 정확히 인지했습니다. (정답률 ${percentage}%)`;
  } else if (percentage >= 50) {
    elements.resultTitle.textContent = '👍 좋은 청각 훈련 과정입니다';
    elements.resultDesc.textContent = `${total}회 중 ${correct}회 일치. 한 음에 귀를 기울이며 계속 반복해보세요!`;
  } else {
    elements.resultTitle.textContent = '🌱 청각 기초 훈련 적응 중';
    elements.resultDesc.textContent = `${total}회 중 ${correct}회 일치. 소리가 지속되는 동안 온전히 소리에 집중해보세요!`;
  }

  elements.answersDetailPanel.classList.remove('visible');
  elements.btnRevealAnswers.classList.remove('hidden');
}

/**
 * Key Requirement: "정답을 클릭하면 20문제 답이 나오도록 만들어줘"
 */
function revealAnswers() {
  const panel = elements.answersDetailPanel;
  const listContainer = elements.answersList;
  listContainer.innerHTML = '';

  state.questions.forEach((q) => {
    const card = document.createElement('div');
    card.className = `answer-card ${q.isCorrect ? 'correct' : 'incorrect'}`;

    const userLabel = getBinaryChoiceLabel(q.userChoice);
    const actualLabel = getBinaryChoiceLabel(q.actualAnswer);

    card.innerHTML = `
      <div class="answer-meta">
        <div class="q-num">Q${q.qNum}</div>
        <div class="q-info">
          <div class="user-vs-answer">
            <span>내 선택: <strong class="user-choice ${q.isCorrect ? 'is-correct' : 'is-incorrect'}">${userLabel}</strong></span>
            ${q.isCorrect ? '<span style="color:#16a34a; font-weight:700;">✓ 일치 (정답)</span>' : `<span class="correct-choice-badge">(실제: ${actualLabel})</span>`}
          </div>
          <div class="detail-notes">${q.detailDesc}</div>
        </div>
      </div>
      <div class="answer-actions">
        <button type="button" class="btn-replay-single" data-qnum="${q.qNum}" title="이 문제 다시 듣기">
          <span>🔊 다시 듣기</span>
        </button>
      </div>
    `;

    // Replay single tone listener
    const replayBtn = card.querySelector('.btn-replay-single');
    replayBtn.addEventListener('click', async () => {
      replayBtn.disabled = true;
      replayBtn.textContent = '재생 중...';
      await window.audioEngine.playContinuousTone(q.freq, state.config.soundType, 1.2);
      replayBtn.disabled = false;
      replayBtn.textContent = '🔊 다시 듣기';
    });

    listContainer.appendChild(card);
  });

  panel.classList.add('visible');
  showToast(`전체 ${state.questions.length}회 정답 및 해설이 공개되었습니다!`);
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function getBinaryChoiceLabel(choice) {
  switch (choice) {
    case 'same': return '⭕ 같은 소리 (동일음)';
    case 'diff': return '❌ 다른 소리';
    default: return '미선택';
  }
}

/* =========================================================
   Visualizer (Canvas) - Warm & Cozy Waveform
   ========================================================= */
function initVisualizer() {
  const canvas = elements.waveformCanvas;
  const ctx = canvas.getContext('2d');
  const bufferLength = 256;
  const dataArray = new Uint8Array(bufferLength);

  function draw() {
    state.visualizerAnimId = requestAnimationFrame(draw);

    if (window.audioEngine) {
      window.audioEngine.getWaveformData(dataArray);
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const isDark = document.body.classList.contains('dark-mode');

    // Background grid line
    ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(120, 70, 30, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    // Wave line in warm theme
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = isDark ? '#fb923c' : '#e06326';
    ctx.shadowBlur = isDark ? 8 : 4;
    ctx.shadowColor = isDark ? '#f97316' : 'rgba(224, 99, 38, 0.35)';

    ctx.beginPath();
    const sliceWidth = canvas.width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * canvas.height) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }

    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  draw();
}

// Start app on DOM ready
document.addEventListener('DOMContentLoaded', initApp);
