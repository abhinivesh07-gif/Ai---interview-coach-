/* =========================================================
   1. Animated particle-network background
========================================================= */
(function initBackground(){
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  let w, h, particles;
  const COUNT_BASE = 70;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize(){
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    const count = Math.min(COUNT_BASE, Math.floor((w * h) / 18000));
    particles = Array.from({length: count}, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.6 + 0.6
    }));
  }

  function step(){
    ctx.clearRect(0, 0, w, h);
    for(const p of particles){
      p.x += p.vx; p.y += p.vy;
      if(p.x < 0 || p.x > w) p.vx *= -1;
      if(p.y < 0 || p.y > h) p.vy *= -1;
    }
    for(let i=0;i<particles.length;i++){
      for(let j=i+1;j<particles.length;j++){
        const a = particles[i], b = particles[j];
        const dx = a.x-b.x, dy = a.y-b.y;
        const dist = Math.sqrt(dx*dx+dy*dy);
        if(dist < 140){
          ctx.strokeStyle = `rgba(139,92,246,${0.12 * (1 - dist/140)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    for(const p of particles){
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(45,212,255,0.55)';
      ctx.fill();
    }
    if(!reduceMotion) requestAnimationFrame(step);
  }

  window.addEventListener('resize', resize);
  resize();
  step();
})();

/* =========================================================
   2. Nav / scroll-to-section
========================================================= */
document.querySelectorAll('[data-goto]').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = document.getElementById(btn.dataset.goto);
    if(target) target.scrollIntoView({behavior: 'smooth', block: 'start'});
  });
});

/* =========================================================
   3. Scroll reveal
========================================================= */
(function initReveal(){
  const items = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if(e.isIntersecting){
        e.target.classList.add('is-visible');
        io.unobserve(e.target);
      }
    });
  }, {threshold: 0.15});
  items.forEach(i => io.observe(i));
})();

/* =========================================================
   4. Live interview demo — voice input + mock scoring
========================================================= */
(function initInterview(){
  const questions = [
    "Tell me about a time you disagreed with a teammate's technical decision. What did you do?",
    "Describe a project that failed. What would you do differently now?",
    "Walk me through how you'd prioritize a roadmap with three equally urgent requests.",
    "Tell me about a time you had to influence someone without direct authority.",
    "What's a piece of critical feedback you received, and how did you respond to it?"
  ];
  let qIndex = 0;

  const aiQuestion = document.getElementById('ai-question');
  const answerInput = document.getElementById('answer-input');
  const micBtn = document.getElementById('mic-btn');
  const micLabel = document.getElementById('mic-label');
  const micStatus = document.getElementById('mic-status');
  const waveform = document.getElementById('waveform');
  const submitBtn = document.getElementById('submit-answer');
  const nextBtn = document.getElementById('next-question');
  const feedbackNote = document.getElementById('feedback-note');

  const bars = {
    clarity: document.getElementById('bar-clarity'),
    confidence: document.getElementById('bar-confidence'),
    structure: document.getElementById('bar-structure'),
    relevance: document.getElementById('bar-relevance')
  };

  function nextQuestion(){
    qIndex = (qIndex + 1) % questions.length;
    aiQuestion.textContent = questions[qIndex];
    answerInput.value = '';
    Object.values(bars).forEach(b => b.style.width = '0%');
    feedbackNote.textContent = "Scores update after you submit an answer. Nothing is sent anywhere — this demo scores locally in your browser.";
  }
  nextBtn.addEventListener('click', nextQuestion);

  // --- Voice input via Web Speech API ---
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let recording = false;

  if(SpeechRecognition){
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let finalTranscript = '';

    recognition.onresult = (event) => {
      let interim = '';
      for(let i = event.resultIndex; i < event.results.length; i++){
        const transcript = event.results[i][0].transcript;
        if(event.results[i].isFinal){
          finalTranscript += transcript + ' ';
        } else {
          interim += transcript;
        }
      }
      answerInput.value = (finalTranscript + interim).trim();
    };

    recognition.onerror = (event) => {
      micStatus.textContent = event.error === 'not-allowed'
        ? 'Microphone access was blocked — check your browser permissions.'
        : `Voice input stopped (${event.error}).`;
      stopRecording();
    };

    recognition.onend = () => {
      if(recording) stopRecording();
    };

    function startRecording(){
      finalTranscript = answerInput.value ? answerInput.value + ' ' : '';
      recording = true;
      micBtn.classList.add('recording');
      micLabel.textContent = 'Listening… tap to stop';
      waveform.classList.add('active');
      micStatus.textContent = 'Listening — speak your answer naturally.';
      try{ recognition.start(); } catch(e){ /* already started */ }
    }

    function stopRecording(){
      recording = false;
      micBtn.classList.remove('recording');
      micLabel.textContent = 'Speak answer';
      waveform.classList.remove('active');
      micStatus.textContent = answerInput.value ? 'Transcribed. Edit the text if needed, then submit.' : '';
      try{ recognition.stop(); } catch(e){}
    }

    micBtn.addEventListener('click', () => {
      if(recording) stopRecording(); else startRecording();
    });
  } else {
    micLabel.textContent = 'Voice not supported here';
    micBtn.addEventListener('click', () => {
      micStatus.textContent = 'Your browser doesn\u2019t support voice input — try Chrome or Edge, or just type your answer.';
    });
  }

  // --- Mock local scoring ---
  function scoreAnswer(text){
    const words = text.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const fillerWords = ['um','uh','like','basically','actually','literally','just'];
    const fillerCount = words.filter(w => fillerWords.includes(w.toLowerCase())).length;
    const starWords = ['situation','task','result','so i','because','decided','outcome','learned'];
    const lower = text.toLowerCase();
    const starHits = starWords.filter(w => lower.includes(w)).length;

    const clarity = Math.max(20, Math.min(96, 60 + (wordCount > 25 ? 20 : wordCount) - fillerCount * 6));
    const confidence = Math.max(20, Math.min(96, 55 + Math.min(wordCount, 40) - fillerCount * 5));
    const structure = Math.max(15, Math.min(96, 30 + starHits * 12 + (wordCount > 40 ? 15 : 0)));
    const relevance = Math.max(25, Math.min(96, wordCount > 8 ? 70 + Math.min(starHits * 4, 20) : 35));

    return {clarity, confidence, structure, relevance, wordCount, fillerCount};
  }

  submitBtn.addEventListener('click', () => {
    const text = answerInput.value.trim();
    if(!text){
      feedbackNote.textContent = 'Type or speak an answer first — even a rough one works for scoring.';
      return;
    }
    const s = scoreAnswer(text);
    bars.clarity.style.width = s.clarity + '%';
    bars.confidence.style.width = s.confidence + '%';
    bars.structure.style.width = s.structure + '%';
    bars.relevance.style.width = s.relevance + '%';

    let note = `${s.wordCount} words analyzed. `;
    if(s.fillerCount > 2) note += `Watch the filler words (${s.fillerCount} spotted) — pause instead of filling silence. `;
    if(s.structure < 50) note += 'Try framing this with Situation → Task → Action → Result for a clearer structure.';
    else note += 'Good structure — this reads like a complete story.';
    feedbackNote.textContent = note;
  });
})();

/* =========================================================
   5. Dashboard line chart (SVG, hand-drawn path)
========================================================= */
(function drawLineChart(){
  const svg = document.getElementById('line-chart');
  if(!svg) return;
  const W = 560, H = 220, pad = 20;
  const overall = [58, 62, 65, 63, 70, 74, 76, 81];
  const behavioral = [50, 54, 60, 58, 66, 68, 72, 78];

  function toPoints(arr){
    const step = (W - pad*2) / (arr.length - 1);
    return arr.map((v, i) => {
      const x = pad + i * step;
      const y = H - pad - (v/100) * (H - pad*2);
      return [x, y];
    });
  }

  function pathFrom(points){
    return points.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  }

  let svgHTML = `
    <defs>
      <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#2dd4ff" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="#2dd4ff" stop-opacity="0"/>
      </linearGradient>
    </defs>
  `;

  // gridlines
  for(let i=0;i<=3;i++){
    const y = pad + i * ((H - pad*2)/3);
    svgHTML += `<line x1="${pad}" y1="${y}" x2="${W-pad}" y2="${y}" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>`;
  }

  const overallPts = toPoints(overall);
  const behavioralPts = toPoints(behavioral);

  const areaPath = pathFrom(overallPts) + ` L${overallPts[overallPts.length-1][0]},${H-pad} L${overallPts[0][0]},${H-pad} Z`;
  svgHTML += `<path d="${areaPath}" fill="url(#fillGrad)" stroke="none"/>`;
  svgHTML += `<path d="${pathFrom(behavioralPts)}" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-dasharray="4 4" opacity="0.8"/>`;
  svgHTML += `<path d="${pathFrom(overallPts)}" fill="none" stroke="#2dd4ff" stroke-width="2.5"/>`;

  overallPts.forEach(p => {
    svgHTML += `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="#2dd4ff"/>`;
  });

  svg.innerHTML = svgHTML;
})();

/* =========================================================
   6. Donut chart — time per round
========================================================= */
(function drawDonut(){
  const svg = document.getElementById('donut-chart');
  if(!svg) return;
  const cx = 100, cy = 100, r = 70, stroke = 26;
  const data = [
    {value: 45, color: '#2dd4ff'},
    {value: 35, color: '#8b5cf6'},
    {value: 20, color: '#f472b6'}
  ];
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  let html = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="${stroke}"/>`;

  data.forEach(d => {
    const len = (d.value/100) * circumference;
    html += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${d.color}"
      stroke-width="${stroke}" stroke-dasharray="${len} ${circumference-len}"
      stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})" stroke-linecap="butt"
      opacity="0.9"/>`;
    offset += len;
  });

  svg.innerHTML = html;
})();

/* =========================================================
   7. Radar chart — skill gap
========================================================= */
(function drawRadar(){
  const svg = document.getElementById('radar-chart');
  if(!svg) return;
  const cx = 160, cy = 160, maxR = 120;
  const labels = ['Communication', 'Technical depth', 'Problem solving', 'Leadership', 'Composure'];
  const current = [82, 54, 76, 48, 70];
  const target  = [90, 80, 85, 78, 82];
  const n = labels.length;

  function pointFor(value, i){
    const angle = (Math.PI * 2 * i / n) - Math.PI/2;
    const r = (value/100) * maxR;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  }
  function polygon(values){
    return values.map((v,i) => pointFor(v,i).join(',')).join(' ');
  }

  let html = '';
  // rings
  [0.25, 0.5, 0.75, 1].forEach(f => {
    const pts = labels.map((_,i) => pointFor(f*100, i).join(',')).join(' ');
    html += `<polygon points="${pts}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`;
  });
  // axes + labels
  labels.forEach((label, i) => {
    const [x,y] = pointFor(100, i);
    html += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`;
    const [lx, ly] = pointFor(122, i);
    html += `<text x="${lx}" y="${ly}" fill="#8d84ad" font-size="10" text-anchor="middle" dominant-baseline="middle" font-family="Inter, sans-serif">${label}</text>`;
  });

  html += `<polygon points="${polygon(target)}" fill="rgba(139,92,246,0.15)" stroke="#8b5cf6" stroke-width="2"/>`;
  html += `<polygon points="${polygon(current)}" fill="rgba(45,212,255,0.18)" stroke="#2dd4ff" stroke-width="2.5"/>`;

  current.forEach((v,i) => {
    const [x,y] = pointFor(v,i);
    html += `<circle cx="${x}" cy="${y}" r="3.5" fill="#2dd4ff"/>`;
  });

  svg.innerHTML = html;
})();

/* =========================================================
   8. Profile progress ring
========================================================= */
(function drawProfileRing(){
  const ring = document.getElementById('profile-ring');
  if(!ring) return;
  const svg = ring.closest('svg');
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#2dd4ff"/>
      <stop offset="100%" stop-color="#8b5cf6"/>
    </linearGradient>
  `;
  svg.prepend(defs);

  const r = 52;
  const circumference = 2 * Math.PI * r;
  const percent = 0.68;
  ring.style.strokeDasharray = `${circumference}`;
  ring.style.strokeDashoffset = `${circumference}`;
  ring.getBoundingClientRect(); // force reflow
  ring.style.transition = 'stroke-dashoffset 1.4s cubic-bezier(.2,.8,.2,1)';
  requestAnimationFrame(() => {
    ring.style.strokeDashoffset = `${circumference * (1 - percent)}`;
  });
})();
