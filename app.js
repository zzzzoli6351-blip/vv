/**
 * App Controller for Metronome Click Ear Training
 * Auditory Click / Beat Counting Mini App
 */

// Application State
const state = {
  config: {
    difficulty: 'basic',  // 'basic' (60~75 BPM, 3~6회) | 'medium' (90~110 BPM, 5~11회) | 'hard' (130~160 BPM, 7~16회)
    questionCount: 20,    // 20회 이상 기본
    soundType: 'wood',    // 'wood' | 'digital' | 'woodblock' | 'ping'
    volume: 0.75
  },
  questions: [],
  currentIndex: 0,
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
  indicatorBeat: document.getElementById('indicator-beat'),
  indicatorDot: document.getElementById('indicator-dot'),
  indicatorBeatText: document.getElementById('indicator-beat-text'),
  questionPromptText: document.getElementById('question-prompt-text'),
  choiceButtonsContainer: document.getElementById('choice-buttons-container'),
  btnReplayQuestion: document.getElementById('btn-replay-question'),

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
  elements.btnPreviewSound.addEventListener('click', async () => {
    getSelectedConfig();
    window.audioEngine.init();
    window.audioEngine.setVolume(state.config.volume);
    
    // Play 3 sample clicks
    await window.audioEngine.playMetronomeClicks(3, 85, state.config.soundType);
    showToast(`'${getSoundTypeName(state.config.soundType)}' 똑딱 소리 미리듣기`);
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

  // Keyboard Shortcuts for Quiz Choices (1, 2, 3, 4, Space)
  window.addEventListener('keydown', (e) => {
    if (!elements.screens.quiz.classList.contains('active')) return;
    if (state.isAudioPlaying) return;

    if (['1', '2', '3', '4'].includes(e.key)) {
      const index = parseInt(e.key, 10) - 1;
      const current = state.questions[state.currentIndex];
      if (current && current.choices && current.choices[index] !== undefined) {
        handleAnswerSelection(current.choices[index]);
      }
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
    case 'wood': return '기계식 메트로놈';
    case 'digital': return '디지털 클릭';
    case 'woodblock': return '우드블록';
    case 'ping': return '비트 핑';
    default: return type;
  }
}

function getDifficultyName(diff) {
  switch (diff) {
    case 'basic': return '가장 기초 (60~75 BPM)';
    case 'medium': return '보통 (90~110 BPM)';
    case 'hard': return '어려움 (130~160 BPM)';
    default: return diff;
  }
}

/* =========================================================
   Question Generator: Metronome Click Counting
   ========================================================= */
function generateQuestions() {
  const list = [];
  const count = state.config.questionCount;
  const diff = state.config.difficulty;

  for (let i = 1; i <= count; i++) {
    let actualCount = 4;
    let bpm = 70;

    if (diff === 'basic') {
      // 가장 기초: 느린 템포 (60~75 BPM), 3~6회
      actualCount = Math.floor(Math.random() * 4) + 3; // 3, 4, 5, 6
      bpm = Math.floor(Math.random() * 16) + 60; // 60~75 BPM
    } else if (diff === 'medium') {
      // 보통: 표준 템포 (90~110 BPM), 5~11회
      actualCount = Math.floor(Math.random() * 7) + 5; // 5~11
      bpm = Math.floor(Math.random() * 21) + 90; // 90~110 BPM
    } else {
      // 어려움: 빠른 템포 (130~160 BPM), 7~16회
      actualCount = Math.floor(Math.random() * 10) + 7; // 7~16
      bpm = Math.floor(Math.random() * 31) + 130; // 130~160 BPM
    }

    // Generate 4 plausible distinct choice candidates including the actual answer
    const choices = generateChoices(actualCount);

    list.push({
      qNum: i,
      actualCount: actualCount,
      bpm: bpm,
      choices: choices,
      userChoice: null,
      isCorrect: null,
      detailDesc: `${actualCount}회 똑딱 (템포: ${bpm} BPM)`
    });
  }

  return list;
}

function generateChoices(correct) {
  const set = new Set();
  set.add(correct);

  // Generate offsets like -2, -1, +1, +2 around correct
  const candidates = [correct - 1, correct + 1, correct - 2, correct + 2, correct - 3, correct + 3];
  
  for (const c of candidates) {
    if (c >= 1 && !set.has(c)) {
      set.add(c);
    }
    if (set.size === 4) break;
  }

  // If still less than 4 (e.g. correct is very small like 2), add +3, +4
  let extra = 1;
  while (set.size < 4) {
    const val = correct + extra;
    if (!set.has(val)) set.add(val);
    extra++;
  }

  // Sort ascending for clean UX
  return Array.from(set).sort((a, b) => a - b);
}

/* =========================================================
   Quiz Flow
   ========================================================= */
function startQuiz() {
  window.audioEngine.init();
  state.questions = generateQuestions();
  state.currentIndex = 0;
  state.score = 0;

  // UI Setup
  elements.quizDifficultyBadge.textContent = `${getDifficultyName(state.config.difficulty)} · ${getSoundTypeName(state.config.soundType)}`;
  elements.answersDetailPanel.classList.remove('visible');
  elements.btnRevealAnswers.style.display = 'flex';

  switchScreen('quiz');
  renderCurrentQuestion();
  
  // Auto-play audio shortly after screen transition
  setTimeout(() => {
    playCurrentQuestionAudio();
  }, 450);
}

function renderCurrentQuestion() {
  const current = state.questions[state.currentIndex];
  const total = state.questions.length;
  const num = state.currentIndex + 1;

  elements.quizProgressIndicator.textContent = `문제 ${num} / ${total}`;
  const pct = Math.round((num / total) * 100);
  elements.quizProgressFill.style.width = `${pct}%`;

  setBeatIndicator(false, '똑딱 소리 재생 준비');

  // Render 4 choice buttons
  renderChoiceButtons(current.choices);
}

function renderChoiceButtons(choices) {
  const container = elements.choiceButtonsContainer;
  container.innerHTML = '';

  choices.forEach((choiceVal, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-choice btn-choice-count';
    btn.dataset.count = choiceVal;
    btn.innerHTML = `
      <span class="count-num">${choiceVal}</span>
      <span class="count-sub">회 똑딱 [${idx + 1}]</span>
    `;

    btn.addEventListener('click', () => {
      handleAnswerSelection(choiceVal);
    });

    container.appendChild(btn);
  });
}

async function playCurrentQuestionAudio() {
  if (state.isAudioPlaying) return;
  const current = state.questions[state.currentIndex];
  if (!current) return;

  state.isAudioPlaying = true;
  toggleButtonsDisabled(true);

  setBeatIndicator(true, '똑딱 소리 재생 중... 귀 기울여 세어보세요 🎧');

  await window.audioEngine.playMetronomeClicks(
    current.actualCount,
    current.bpm,
    state.config.soundType,
    (beat, total, isLast) => {
      if (beat === 'end') {
        setBeatIndicator(false, '청취 완료! 총 몇 번 들렸는지 선택하세요 ✍️');
      } else {
        // Flash indicator dot on every beat click
        flashBeatIndicator(beat);
      }
    }
  );

  state.isAudioPlaying = false;
  toggleButtonsDisabled(false);
}

function setBeatIndicator(isActive, text) {
  if (elements.indicatorBeat) {
    elements.indicatorBeat.classList.toggle('active', isActive);
  }
  if (elements.indicatorBeatText) {
    elements.indicatorBeatText.textContent = text;
  }
}

function flashBeatIndicator(beatNum) {
  if (elements.indicatorBeat) {
    elements.indicatorBeat.classList.add('active');
    setTimeout(() => {
      if (elements.indicatorBeat) elements.indicatorBeat.classList.remove('active');
    }, 100);
  }
}

function toggleButtonsDisabled(disabled) {
  elements.btnReplayQuestion.disabled = disabled;
  const choiceBtns = elements.choiceButtonsContainer.querySelectorAll('.btn-choice');
  choiceBtns.forEach(b => b.disabled = disabled);
}

function handleAnswerSelection(chosenCount) {
  if (state.isAudioPlaying) return;

  const current = state.questions[state.currentIndex];
  current.userChoice = chosenCount;
  current.isCorrect = (chosenCount === current.actualCount);

  if (current.isCorrect) {
    state.score++;
  }

  // NOTE: Requirement: "1문제가 끝나면 답이 바로 나오게 하지 말고 20문제가 끝나면 답이 나오게"
  state.currentIndex++;

  if (state.currentIndex < state.questions.length) {
    renderCurrentQuestion();
    setTimeout(() => {
      playCurrentQuestionAudio();
    }, 400);
  } else {
    // All questions finished!
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
    elements.resultTitle.textContent = '🏆 완벽한 청각 카운팅!';
    elements.resultDesc.textContent = `${total}문제의 모든 똑딱 소리를 오차 없이 정확히 맞혔습니다!`;
  } else if (percentage >= 80) {
    elements.resultTitle.textContent = '🌟 뛰어난 청각 집중력!';
    elements.resultDesc.textContent = `${total}문제 중 ${correct}문제를 정확히 맞혔습니다. (정답률 ${percentage}%)`;
  } else if (percentage >= 50) {
    elements.resultTitle.textContent = '👍 좋은 리듬 인지 감각입니다';
    elements.resultDesc.textContent = `${total}문제 중 ${correct}문제를 맞혔습니다. 똑딱 비트를 마음속으로 가볍게 세어보세요!`;
  } else {
    elements.resultTitle.textContent = '🌱 청각 비트 카운팅 훈련 중';
    elements.resultDesc.textContent = `${total}문제 중 ${correct}문제를 맞혔습니다. 느린 템포부터 차근차근 집중해보세요!`;
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

    const diffCount = q.userChoice !== null ? q.userChoice - q.actualCount : 0;
    const diffText = diffCount === 0 ? '' : (diffCount > 0 ? ` (+${diffCount}회 많게 선택)` : ` (${diffCount}회 적게 선택)`);

    card.innerHTML = `
      <div class="answer-meta">
        <div class="q-num">Q${q.qNum}</div>
        <div class="q-info">
          <div class="user-vs-answer">
            <span>내 답: <strong class="user-choice ${q.isCorrect ? 'is-correct' : 'is-incorrect'}">${q.userChoice !== null ? q.userChoice + '회' : '미선택'}</strong></span>
            ${q.isCorrect 
              ? '<span style="color:#16a34a; font-weight:700;">✓ 정답 (' + q.actualCount + '회 똑딱)</span>' 
              : '<span class="correct-choice-badge">(실제 정답: <strong>' + q.actualCount + '회 똑딱</strong>' + diffText + ')</span>'}
          </div>
          <div class="detail-notes">템포: ${q.bpm} BPM · 똑딱 소리: ${getSoundTypeName(state.config.soundType)}</div>
        </div>
      </div>
      <div class="answer-actions">
        <button type="button" class="btn-replay-single" data-qnum="${q.qNum}" title="이 문제 똑딱 소리 다시 듣기">
          <span>🔊 다시 듣기</span>
        </button>
      </div>
    `;

    // Replay single question listener
    const replayBtn = card.querySelector('.btn-replay-single');
    replayBtn.addEventListener('click', async () => {
      replayBtn.disabled = true;
      replayBtn.textContent = '재생 중...';
      await window.audioEngine.playMetronomeClicks(q.actualCount, q.bpm, state.config.soundType);
      replayBtn.disabled = false;
      replayBtn.textContent = '🔊 다시 듣기';
    });

    listContainer.appendChild(card);
  });

  panel.classList.add('visible');
  showToast(`전체 ${state.questions.length}문제 정답 및 채점이 공개되었습니다!`);
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* =========================================================
   Visualizer (Canvas) - Warm Metronome Pulse Waveform
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

    // Background center line
    ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(120, 70, 30, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    // Pulse Waveform
    ctx.lineWidth = 3;
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
