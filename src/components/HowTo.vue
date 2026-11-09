<script setup>
import { ref, computed, onMounted } from 'vue'
import { markHowToSeen } from '../lib/howTo.js'
import Icon from './Icon.vue'
import PlaneIcon from './PlaneIcon.vue'

// "How Upkeep works": a few screens, each with a small looping scene that acts out one
// part of the app (a check filling, a row sliding away) above a sentence or two.
// Arrows, the dots, the arrow keys or a swipe move between them.
const emit = defineEmits(['close'])

const slides = [
  {
    title: 'Welcome to Upkeep',
    text: 'Upkeep keeps track of three kinds of things. Habits are things you want to do regularly. Chores need doing on a schedule. To-dos are one-off tasks.',
  },
  {
    title: 'Today is your list',
    text: 'Everything for today shows here. Tap the circle to check something off, and it drops into Completed at the bottom.',
  },
  {
    title: 'Goals that count up',
    text: 'Some habits are a count, like stretching 4 times a week. Each tap adds one and the ring fills. It stays on Today until you reach the goal.',
  },
  {
    title: 'Due days and grace',
    text: 'A chore can be due on a set day. Give it grace days and doing it a little late still counts, so Sunday can rescue a Saturday chore.',
  },
  {
    title: 'Get it out of your head',
    text: 'Type a to-do in the bar at the top of Today or To-dos (on a computer, press N). Add a due date, tags, notes or steps if you like.',
  },
  {
    title: 'Nothing slips by',
    text: 'When a habit or chore’s day passes without a check, it waits under Missed. Did it but forgot to log it? Tap Did it. If not, Missed it clears it.',
  },
  {
    title: 'Personal and Work',
    text: 'Keep two separate lists. The switch at the top flips between them, and they never mix.',
  },
  {
    title: 'Routines and vacations',
    text: 'Set up habits and chores under Routines. Going away? Tap the plane to pause the ones you pick, so nothing counts as missed while you’re gone.',
  },
  {
    title: 'Quick moves',
    text: 'On a phone, swipe a row left to skip it (or delete a to-do). On a computer, hover a row for the same button. That’s it. You’re ready.',
  },
]

const at = ref(0)
const last = computed(() => at.value === slides.length - 1)
const go = (i) => (at.value = Math.max(0, Math.min(slides.length - 1, i)))
function next() {
  if (last.value) dialog.value.close()
  else go(at.value + 1)
}

const dialog = ref(null)
onMounted(() => dialog.value.showModal())
function closed() {
  markHowToSeen()
  emit('close')
}
// Clicking the dimmed backdrop closes it.
function onClick(e) {
  const r = dialog.value.getBoundingClientRect()
  if (e.target === dialog.value && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) dialog.value.close()
}
function onKey(e) {
  if (e.key === 'ArrowRight') go(at.value + 1)
  if (e.key === 'ArrowLeft') go(at.value - 1)
}
// Swipe sideways (phones) to move between screens.
let startX = null
const down = (e) => (startX = e.clientX)
function up(e) {
  if (startX === null) return
  const dx = e.clientX - startX
  startX = null
  if (Math.abs(dx) > 50) go(at.value + (dx < 0 ? 1 : -1))
}
</script>

<template>
  <Teleport to="body">
    <dialog ref="dialog" class="howto" aria-labelledby="howto-title" @close="closed" @click="onClick" @keydown="onKey">
      <button class="x" aria-label="Close" title="Close" @click="dialog.close()"><Icon name="close" /></button>

      <!-- The scene. Each one is a tiny, simplified copy of part of the app. -->
      <div class="stage" @pointerdown="down" @pointerup="up" @pointercancel="startX = null">
        <div :key="at" class="scene" :class="`s${at}`" aria-hidden="true">
          <template v-if="at === 0">
            <div class="card">
              <div class="row r1"><span class="ck"></span><span class="nm">Read 20 minutes</span><span class="kind habit">Habit</span></div>
              <div class="row r2"><span class="ck"></span><span class="nm">Take out the trash</span><span class="kind chore">Chore</span></div>
              <div class="row r3"><span class="ck"></span><span class="nm">Call the dentist</span><span class="kind todo">To-do</span></div>
            </div>
          </template>

          <template v-else-if="at === 1">
            <div class="card">
              <div class="h">Today</div>
              <div class="row a"><span class="ck"><i class="fill"><Icon name="check" /></i></span><span class="nm">Water the plants</span><i class="pip chore"></i></div>
              <div class="row"><span class="ck"></span><span class="nm">Read 20 minutes</span><i class="pip habit"></i></div>
              <div class="row"><span class="ck"></span><span class="nm">Call the dentist</span><i class="pip todo"></i></div>
              <div class="h sub">Completed</div>
              <div class="row done"><span class="ck on"><Icon name="check" /></span><span class="nm">Water the plants</span><i class="pip chore"></i></div>
            </div>
            <span class="tap" style="--x: 30px; --y: 64px"></span>
          </template>

          <template v-else-if="at === 2">
            <div class="card">
              <div class="h">Today</div>
              <div class="row">
                <span class="ring">
                  <svg viewBox="0 0 22 22"><circle cx="11" cy="11" r="9" class="track" /><circle cx="11" cy="11" r="9" class="arc" /></svg>
                  <i class="full"><Icon name="check" /></i>
                </span>
                <span class="nm">Stretch</span>
                <span class="counts"><b class="c1">1 / 4 this week</b><b class="c2">2 / 4 this week</b><b class="c3">3 / 4 this week</b><b class="c4">Done for the week</b></span>
              </div>
              <div class="row"><span class="ck"></span><span class="nm">Read 20 minutes</span><i class="pip habit"></i></div>
            </div>
            <span class="tap t1" style="--x: 30px; --y: 64px"></span>
            <span class="tap t2" style="--x: 30px; --y: 64px"></span>
            <span class="tap t3" style="--x: 30px; --y: 64px"></span>
          </template>

          <template v-else-if="at === 3">
            <div class="card">
              <div class="week">
                <i class="today"></i>
                <i class="grace"></i>
                <span v-for="(d, i) in ['M', 'T', 'W', 'T', 'F', 'S', 'S']" :key="i" class="day">
                  <small>{{ d }}</small>
                  <b :class="{ due: i === 5, sun: i === 6 }">{{ 16 + i }}</b>
                </span>
              </div>
              <div class="row">
                <span class="ck"><i class="fill chore"><Icon name="check" /></i></span>
                <span class="nm">Do laundry</span>
                <span class="meta"><b class="m1">Due Saturday</b><b class="m2">Due today</b><b class="m3">Grace day · still on time</b><b class="m4">Done</b></span>
              </div>
            </div>
            <span class="tap" style="--x: 30px; --y: 104px"></span>
          </template>

          <template v-else-if="at === 4">
            <div class="card">
              <div class="bar">
                <Icon name="plus" class="plus" />
                <span class="typed"><span class="txt">Pick up dry cleaning</span><i class="caret"></i></span>
                <span class="ph">Brain dump…</span>
              </div>
              <div class="chips"><span class="chip">Errands</span><span class="chip off">Home</span></div>
              <div class="row new"><span class="ck"></span><span class="nm">Pick up dry cleaning</span><span class="chip sm">Errands</span></div>
              <div class="row"><span class="ck"></span><span class="nm">Call the dentist</span><i class="pip todo"></i></div>
            </div>
            <span class="tap" style="--x: 42px; --y: 64px"></span>
          </template>

          <template v-else-if="at === 5">
            <div class="card">
              <div class="missed-h"><Icon name="chevron" class="chev" />Missed<b class="badge">1</b></div>
              <div class="row miss">
                <span class="nm">Water plants <small>Yesterday</small></span>
                <span class="mini">Did it</span><span class="mini quiet">Missed it</span>
              </div>
              <div class="row"><span class="ck"></span><span class="nm">Read 20 minutes</span><i class="pip habit"></i></div>
              <div class="toast">Logged Water plants for yesterday</div>
            </div>
            <span class="tap t1" style="--x: 34px; --y: 30px"></span>
            <span class="tap t2" style="--x: 192px; --y: 66px"></span>
          </template>

          <template v-else-if="at === 6">
            <div class="card">
              <div class="ctx"><i class="knob"></i><span>Personal</span><span>Work</span></div>
              <div class="lists">
                <div class="list personal">
                  <div class="row"><span class="ck"></span><span class="nm">Do laundry</span><i class="pip chore"></i></div>
                  <div class="row"><span class="ck"></span><span class="nm">Stretch</span><i class="pip habit"></i></div>
                  <div class="row"><span class="ck"></span><span class="nm">Call Mom</span><i class="pip todo"></i></div>
                </div>
                <div class="list work">
                  <div class="row"><span class="ck"></span><span class="nm">Send the weekly report</span><i class="pip chore"></i></div>
                  <div class="row"><span class="ck"></span><span class="nm">Clear the inbox</span><i class="pip habit"></i></div>
                  <div class="row"><span class="ck"></span><span class="nm">Book the team lunch</span><i class="pip todo"></i></div>
                </div>
              </div>
            </div>
            <span class="tap" style="--x: 232px; --y: 30px"></span>
          </template>

          <template v-else-if="at === 7">
            <div class="card">
              <div class="vac-head">
                <span class="h">Routines</span>
                <span class="vbar"><PlaneIcon class="pl" />Away until Nov 27</span>
                <span class="plane-btn"><PlaneIcon /></span>
              </div>
              <div class="row v"><span class="nm">Water the plants</span><PlaneIcon class="tag-pl" /></div>
              <div class="row"><span class="nm">Stretch</span></div>
              <div class="row v"><span class="nm">Take out the trash</span><PlaneIcon class="tag-pl" /></div>
            </div>
            <span class="tap" style="--x: 262px; --y: 30px"></span>
          </template>

          <template v-else>
            <div class="card">
              <div class="h">Today</div>
              <div class="swipe">
                <span class="behind"><Icon name="skip" />Skip</span>
                <div class="row front"><span class="ck"></span><span class="nm">Go for a run</span><span class="skipped">Skipped</span></div>
              </div>
              <div class="row"><span class="ck"></span><span class="nm">Read 20 minutes</span><i class="pip habit"></i></div>
            </div>
            <span class="tap drag" style="--x: 220px; --y: 64px"></span>
          </template>
        </div>
      </div>

      <h2 id="howto-title">{{ slides[at].title }}</h2>
      <p class="text">{{ slides[at].text }}</p>

      <div class="foot">
        <button class="btn small" :disabled="at === 0" @click="go(at - 1)">Back</button>
        <div class="dots">
          <button
            v-for="(s, i) in slides"
            :key="i"
            class="dot"
            :class="{ on: i === at }"
            :aria-label="`Screen ${i + 1}: ${s.title}`"
            :aria-current="i === at ? 'step' : null"
            @click="go(i)"
          ></button>
        </div>
        <button class="btn small primary" @click="next">{{ last ? 'Get started' : 'Next' }}</button>
      </div>
    </dialog>
  </Teleport>
</template>

<style scoped>
.howto {
  width: min(460px, calc(100vw - 24px));
  padding: 16px 20px 18px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
  color: var(--text);
  box-shadow: 0 20px 50px rgb(0 0 0 / 0.3);
}
.howto::backdrop {
  background: rgb(0 0 0 / 0.35);
}
.x {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: none;
  color: var(--muted);
}
.x:hover {
  background: var(--hover);
}
.x svg {
  width: 16px;
  height: 16px;
}
h2 {
  margin: 16px 0 6px;
  font-size: 1.15rem;
}
.text {
  min-height: 5.8em; /* four lines (phones), so the buttons don't jump between screens */
  margin: 0 0 16px;
  color: var(--muted);
  line-height: 1.45;
}
.foot {
  display: flex;
  align-items: center;
  gap: 10px;
}
.foot .btn {
  min-width: 92px;
}
.dots {
  flex: 1;
  display: flex;
  justify-content: center;
  gap: 6px;
}
.dot {
  width: 7px;
  height: 7px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--faint);
}
.dot.on {
  background: var(--accent);
}

/* ---------- The stage ---------- */
.stage {
  position: relative;
  height: 216px;
  margin-top: 26px;
  overflow: hidden;
  border-radius: 12px;
  background: var(--raised);
  touch-action: pan-y;
  user-select: none;
}
.scene {
  --loop: 6s;
  position: absolute;
  inset: 0;
  display: grid;
  justify-items: center;
  padding-top: 18px;
  animation: fade-in 0.3s;
}
@keyframes fade-in {
  from { opacity: 0; transform: translateY(4px); }
}
.card {
  position: relative;
  width: 300px;
  height: max-content;
  padding: 6px 14px;
  border-radius: 10px;
  background: var(--surface);
  box-shadow: var(--shadow);
  font-size: 0.82rem;
}
.h {
  padding: 6px 0 2px;
  font-weight: 700;
  font-size: 0.9rem;
}
.h.sub {
  padding-top: 8px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--muted);
}
.row {
  display: flex;
  align-items: center;
  gap: 9px;
  height: 36px;
  border-bottom: 1px solid var(--border);
  overflow: hidden;
  background: var(--surface);
}
.row:last-child {
  border-bottom: 0;
}
.nm {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.nm small {
  margin-left: 6px;
  color: var(--muted);
}
.ck {
  position: relative;
  flex: none;
  display: grid;
  place-items: center;
  width: 17px;
  height: 17px;
  border: 1.5px solid var(--faint);
  border-radius: 50%;
}
.ck svg {
  width: 9px;
  height: 9px;
  color: #fff;
}
.ck.on,
.fill {
  border-color: var(--accent);
  background: var(--accent);
}
.fill {
  position: absolute;
  inset: -1.5px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  opacity: 0;
}
.fill.chore {
  background: var(--chore);
}
.pip {
  flex: none;
  width: 3px;
  height: 11px;
  border-radius: 2px;
}
.pip.habit { background: var(--habit); }
.pip.chore { background: var(--chore); }
.pip.todo { background: var(--faint); }

/* The pretend finger: a soft circle that pops where a tap happens. */
.tap {
  position: absolute;
  left: calc(50% - 150px + var(--x) - 13px);
  top: calc(18px + var(--y) - 13px);
  width: 26px;
  height: 26px;
  border: 2px solid var(--accent);
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent) 25%, transparent);
  opacity: 0;
  pointer-events: none;
}

/* 0 · Welcome: the three kinds arrive one by one. */
.s0 .row { opacity: 0; animation: arrive var(--loop) infinite; }
.s0 .r2 { animation-name: arrive2; }
.s0 .r3 { animation-name: arrive3; }
@keyframes arrive { 0% { opacity: 0; transform: translateY(6px); } 6%, 92% { opacity: 1; transform: none; } 100% { opacity: 0; } }
@keyframes arrive2 { 0%, 14% { opacity: 0; transform: translateY(6px); } 20%, 92% { opacity: 1; transform: none; } 100% { opacity: 0; } }
@keyframes arrive3 { 0%, 28% { opacity: 0; transform: translateY(6px); } 34%, 92% { opacity: 1; transform: none; } 100% { opacity: 0; } }
.s0 .row { height: 44px; }
.kind {
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 0.72rem;
  font-weight: 600;
}
.kind.habit { background: var(--accent-soft); color: var(--accent); }
.kind.chore { background: var(--chore-soft); color: var(--chore); }
.kind.todo { background: var(--neutral-soft); color: var(--muted); }

/* 1 · Today: check the first row; it slides down into Completed. */
.s1 .tap { animation: tap1 var(--loop) infinite; }
@keyframes tap1 { 0%, 14% { opacity: 0; transform: scale(0.5); } 18% { opacity: 1; transform: scale(1); } 24%, 100% { opacity: 0; transform: scale(1.3); } }
.s1 .a .fill { animation: on1 var(--loop) infinite; }
@keyframes on1 { 0%, 19% { opacity: 0; } 22%, 94% { opacity: 1; } 100% { opacity: 0; } }
.s1 .a { animation: leave1 var(--loop) infinite; }
@keyframes leave1 { 0%, 34% { height: 36px; opacity: 1; } 44%, 94% { height: 0; opacity: 0; border-width: 0; } 100% { height: 36px; opacity: 1; } }
.s1 .done { color: var(--muted); animation: come1 var(--loop) infinite; }
@keyframes come1 { 0%, 42% { height: 0; opacity: 0; } 52%, 94% { height: 36px; opacity: 1; } 100% { height: 0; opacity: 0; } }

/* 2 · Counted goal: three taps fill the ring to 4 of 4. */
.s2 { --loop: 7s; }
.ring {
  position: relative;
  flex: none;
  width: 19px;
  height: 19px;
}
.ring svg {
  width: 19px;
  height: 19px;
  transform: rotate(-90deg);
}
.ring circle {
  fill: none;
  stroke-width: 2.4;
}
.ring .track { stroke: var(--track); }
.ring .arc {
  stroke: var(--accent);
  stroke-linecap: round;
  stroke-dasharray: 56.5;
  stroke-dashoffset: 42.4;
  animation: ring2 var(--loop) infinite;
}
@keyframes ring2 {
  0%, 17% { stroke-dashoffset: 42.4; }
  20%, 40% { stroke-dashoffset: 28.3; }
  43%, 63% { stroke-dashoffset: 14.1; }
  66%, 94% { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: 42.4; }
}
.ring .full {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--accent);
  opacity: 0;
  animation: full2 var(--loop) infinite;
}
.ring .full svg { width: 9px; height: 9px; color: #fff; transform: none; }
@keyframes full2 { 0%, 68% { opacity: 0; } 72%, 94% { opacity: 1; } 100% { opacity: 0; } }
.counts {
  position: relative;
  width: 120px;
  height: 18px;
  text-align: right;
}
.counts b {
  position: absolute;
  right: 0;
  color: var(--muted);
  font-weight: 500;
  opacity: 0;
}
.counts .c4 { color: var(--accent); font-weight: 600; }
.c1 { animation: w1 var(--loop) infinite; }
.c2 { animation: w2 var(--loop) infinite; }
.c3 { animation: w3 var(--loop) infinite; }
.c4 { animation: w4 var(--loop) infinite; }
@keyframes w1 { 0%, 17% { opacity: 1; } 19%, 98% { opacity: 0; } 100% { opacity: 1; } }
@keyframes w2 { 0%, 18% { opacity: 0; } 20%, 40% { opacity: 1; } 42%, 100% { opacity: 0; } }
@keyframes w3 { 0%, 41% { opacity: 0; } 43%, 63% { opacity: 1; } 65%, 100% { opacity: 0; } }
@keyframes w4 { 0%, 64% { opacity: 0; } 66%, 94% { opacity: 1; } 98%, 100% { opacity: 0; } }
.s2 .t1 { animation: tap2a var(--loop) infinite; }
.s2 .t2 { animation: tap2b var(--loop) infinite; }
.s2 .t3 { animation: tap2c var(--loop) infinite; }
@keyframes tap2a { 0%, 13% { opacity: 0; transform: scale(0.5); } 17% { opacity: 1; transform: scale(1); } 23%, 100% { opacity: 0; transform: scale(1.3); } }
@keyframes tap2b { 0%, 36% { opacity: 0; transform: scale(0.5); } 40% { opacity: 1; transform: scale(1); } 46%, 100% { opacity: 0; transform: scale(1.3); } }
@keyframes tap2c { 0%, 59% { opacity: 0; transform: scale(0.5); } 63% { opacity: 1; transform: scale(1); } 69%, 100% { opacity: 0; transform: scale(1.3); } }

/* 3 · Due day + grace: the days roll from Friday to Sunday; Sunday's check still counts. */
.s3 { --loop: 8s; }
.week {
  position: relative;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  padding: 8px 0 10px;
  border-bottom: 1px solid var(--border);
}
.day {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 4px;
}
.day small {
  font-size: 0.66rem;
  color: var(--muted);
}
.day b {
  position: relative;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  font-weight: 500;
}
.day b.due {
  box-shadow: inset 0 0 0 2px var(--due);
  animation: ring3 var(--loop) infinite;
}
@keyframes ring3 { 0%, 74% { box-shadow: inset 0 0 0 2px var(--due); } 77%, 94% { box-shadow: inset 0 0 0 2px var(--chore); } 100% { box-shadow: inset 0 0 0 2px var(--due); } }
.day b.sun { animation: logged3 var(--loop) infinite; }
@keyframes logged3 { 0%, 74% { background: transparent; color: var(--text); } 77%, 94% { background: var(--chore); color: #fff; } 100% { background: transparent; color: var(--text); } }
.today {
  position: absolute;
  top: 2px;
  bottom: 2px;
  left: calc(100% / 7 * 4);
  width: calc(100% / 7);
  border-radius: 8px;
  background: var(--selected);
  animation: today3 var(--loop) infinite;
}
@keyframes today3 {
  0%, 24% { left: calc(100% / 7 * 4); }
  28%, 50% { left: calc(100% / 7 * 5); }
  54%, 94% { left: calc(100% / 7 * 6); }
  100% { left: calc(100% / 7 * 4); }
}
/* Grace: an amber pill under Saturday and Sunday. */
.grace {
  position: absolute;
  bottom: 9px;
  left: calc(100% / 7 * 5 + 6px);
  right: 6px;
  height: 30px;
  border-radius: 15px;
  background: var(--amber-soft);
}
.meta {
  position: relative;
  width: 150px;
  height: 18px;
}
.meta b {
  position: absolute;
  right: 0;
  font-weight: 500;
  opacity: 0;
}
.m1 { color: var(--muted); animation: q1 var(--loop) infinite; }
.m2 { color: var(--due); animation: q2 var(--loop) infinite; }
.m3 { color: var(--amber); animation: q3 var(--loop) infinite; }
.m4 { color: var(--chore); animation: q4 var(--loop) infinite; }
@keyframes q1 { 0%, 24% { opacity: 1; } 27%, 98% { opacity: 0; } 100% { opacity: 1; } }
@keyframes q2 { 0%, 26% { opacity: 0; } 28%, 50% { opacity: 1; } 52%, 100% { opacity: 0; } }
@keyframes q3 { 0%, 52% { opacity: 0; } 54%, 74% { opacity: 1; } 76%, 100% { opacity: 0; } }
@keyframes q4 { 0%, 75% { opacity: 0; } 77%, 94% { opacity: 1; } 98%, 100% { opacity: 0; } }
.s3 .fill { animation: on3 var(--loop) infinite; }
@keyframes on3 { 0%, 74% { opacity: 0; } 77%, 94% { opacity: 1; } 100% { opacity: 0; } }
.s3 .tap { animation: tap3 var(--loop) infinite; }
@keyframes tap3 { 0%, 69% { opacity: 0; transform: scale(0.5); } 73% { opacity: 1; transform: scale(1); } 79%, 100% { opacity: 0; transform: scale(1.3); } }

/* 4 · Add bar: type, pick a tag, and it lands in the list. */
.s4 { --loop: 7s; }
.bar {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  margin-top: 6px;
  padding: 0 10px;
  border-radius: 8px;
  background: var(--raised);
}
.plus { width: 13px; height: 13px; color: var(--muted); }
.typed {
  display: flex;
  align-items: center;
  animation: clear4 var(--loop) infinite;
}
.txt {
  display: inline-block;
  overflow: hidden;
  white-space: nowrap;
  max-width: 0;
  animation: type4 var(--loop) infinite;
}
@keyframes type4 { 0%, 6% { max-width: 0; } 34%, 100% { max-width: 12em; } }
.caret {
  width: 1.5px;
  height: 15px;
  margin-left: 1px;
  background: var(--accent);
  animation: blink 0.9s steps(1) infinite;
}
@keyframes blink { 50% { opacity: 0; } }
@keyframes clear4 { 0%, 54% { opacity: 1; } 56%, 99% { opacity: 0; } 100% { opacity: 1; } }
.ph {
  position: absolute;
  left: 31px;
  color: var(--muted);
  animation: ph4 var(--loop) infinite;
}
@keyframes ph4 { 0%, 5% { opacity: 1; } 7%, 55% { opacity: 0; } 58%, 100% { opacity: 1; } }
.chips {
  display: flex;
  gap: 6px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
}
.chip {
  padding: 2px 8px;
  border: 1px solid var(--chore);
  border-radius: 6px;
  color: var(--chore);
  font-size: 0.72rem;
  font-weight: 600;
  animation: pick4 var(--loop) infinite;
}
.chip.off {
  border-color: var(--faint);
  color: var(--muted);
  animation: none;
}
.chip.sm {
  border-color: transparent;
  background: var(--chore-soft);
  animation: none;
}
@keyframes pick4 { 0%, 41% { background: transparent; color: var(--chore); } 44%, 55% { background: var(--chore); color: #fff; } 57%, 100% { background: transparent; color: var(--chore); } }
.s4 .tap { animation: tap4 var(--loop) infinite; }
@keyframes tap4 { 0%, 37% { opacity: 0; transform: scale(0.5); } 41% { opacity: 1; transform: scale(1); } 47%, 100% { opacity: 0; transform: scale(1.3); } }
.s4 .new { animation: new4 var(--loop) infinite; }
@keyframes new4 { 0%, 55% { height: 0; opacity: 0; border-width: 0; } 63%, 94% { height: 36px; opacity: 1; } 100% { height: 0; opacity: 0; border-width: 0; } }

/* 5 · Missed: open the section, tap Did it, and it's logged. */
.s5 { --loop: 7s; }
.missed-h {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  margin-top: 4px;
  color: var(--late);
  font-weight: 600;
  animation: mh5 var(--loop) infinite;
}
@keyframes mh5 { 0%, 54% { opacity: 1; height: 30px; } 60%, 94% { opacity: 0; height: 0; margin: 0; } 100% { opacity: 1; height: 30px; } }
.chev {
  width: 12px;
  height: 12px;
  animation: chev5 var(--loop) infinite;
}
@keyframes chev5 { 0%, 16% { transform: none; } 19%, 94% { transform: rotate(90deg); } 100% { transform: none; } }
.badge {
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: var(--late);
  color: #fff;
  font-size: 0.66rem;
  line-height: 16px;
  text-align: center;
}
.miss {
  gap: 6px;
  animation: miss5 var(--loop) infinite;
}
@keyframes miss5 { 0%, 16% { height: 0; opacity: 0; border-width: 0; } 22%, 46% { height: 36px; opacity: 1; } 54%, 100% { height: 0; opacity: 0; border-width: 0; } }
.mini {
  flex: none;
  padding: 3px 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 0.72rem;
  font-weight: 500;
}
.mini.quiet { color: var(--muted); }
.s5 .t1 { animation: tap5a var(--loop) infinite; }
.s5 .t2 { animation: tap5b var(--loop) infinite; }
@keyframes tap5a { 0%, 11% { opacity: 0; transform: scale(0.5); } 15% { opacity: 1; transform: scale(1); } 21%, 100% { opacity: 0; transform: scale(1.3); } }
@keyframes tap5b { 0%, 39% { opacity: 0; transform: scale(0.5); } 43% { opacity: 1; transform: scale(1); } 49%, 100% { opacity: 0; transform: scale(1.3); } }
.toast {
  position: absolute;
  left: 50%;
  bottom: -46px;
  padding: 6px 12px;
  border-radius: 8px;
  background: var(--text);
  color: var(--surface);
  font-size: 0.74rem;
  white-space: nowrap;
  transform: translateX(-50%);
  opacity: 0;
  animation: toast5 var(--loop) infinite;
}
@keyframes toast5 { 0%, 54% { opacity: 0; transform: translate(-50%, 6px); } 58%, 88% { opacity: 1; transform: translate(-50%, 0); } 93%, 100% { opacity: 0; } }

/* 6 · Personal / Work: flip the switch and the whole list changes. */
.ctx {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  margin: 6px 0 4px;
  padding: 3px;
  border-radius: 9px;
  background: var(--raised);
  font-weight: 600;
  text-align: center;
}
.ctx span {
  position: relative;
  padding: 5px 0;
  color: var(--muted);
}
.knob {
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: 3px;
  width: calc(50% - 3px);
  border-radius: 7px;
  background: var(--surface);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.12);
  animation: knob6 var(--loop) infinite;
}
@keyframes knob6 { 0%, 38% { transform: none; } 44%, 90% { transform: translateX(100%); } 96%, 100% { transform: none; } }
.lists {
  display: grid;
}
.list {
  grid-area: 1 / 1;
}
.personal { animation: pers6 var(--loop) infinite; }
.work { opacity: 0; animation: work6 var(--loop) infinite; }
@keyframes pers6 { 0%, 40% { opacity: 1; } 45%, 90% { opacity: 0; } 96%, 100% { opacity: 1; } }
@keyframes work6 { 0%, 40% { opacity: 0; } 45%, 90% { opacity: 1; } 96%, 100% { opacity: 0; } }
.s6 .tap { animation: tap6 var(--loop) infinite; }
@keyframes tap6 { 0%, 32% { opacity: 0; transform: scale(0.5); } 36% { opacity: 1; transform: scale(1); } 42%, 100% { opacity: 0; transform: scale(1.3); } }

/* 7 · Vacation: tap the plane; the routines set to pause turn teal. */
.vac-head {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  margin-top: 4px;
}
.vac-head .h {
  flex: 1;
  padding: 0;
}
.vbar {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 8px;
  border: 1px solid var(--vacation);
  border-radius: 7px;
  color: var(--vacation);
  font-size: 0.72rem;
  font-weight: 600;
  white-space: nowrap;
  opacity: 0;
  animation: vbar7 var(--loop) infinite;
}
@keyframes vbar7 { 0%, 20% { opacity: 0; transform: translateX(8px); } 26%, 92% { opacity: 1; transform: none; } 98%, 100% { opacity: 0; } }
.pl { width: 12px; height: 12px; }
.plane-btn {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--border);
  border-radius: 7px;
  color: var(--muted);
  animation: pbtn7 var(--loop) infinite;
}
@keyframes pbtn7 { 0%, 18% { color: var(--muted); } 22%, 92% { color: var(--vacation); border-color: var(--vacation); } 98%, 100% { color: var(--muted); } }
.plane-btn svg { width: 14px; height: 14px; }
.s7 .row { padding-left: 2px; }
.v .nm { animation: vname7 var(--loop) infinite; }
@keyframes vname7 { 0%, 26% { color: var(--text); } 32%, 92% { color: var(--vacation); } 98%, 100% { color: var(--text); } }
.tag-pl {
  width: 13px;
  height: 13px;
  color: var(--vacation);
  opacity: 0;
  animation: vname7b var(--loop) infinite;
}
@keyframes vname7b { 0%, 26% { opacity: 0; } 32%, 92% { opacity: 1; } 98%, 100% { opacity: 0; } }
.s7 .tap { animation: tap7 var(--loop) infinite; }
@keyframes tap7 { 0%, 12% { opacity: 0; transform: scale(0.5); } 16% { opacity: 1; transform: scale(1); } 22%, 100% { opacity: 0; transform: scale(1.3); } }

/* 8 · Swipe: drag the row left to show Skip, then tap it. */
.s8 { --loop: 6s; }
.swipe {
  position: relative;
  overflow: hidden;
  border-bottom: 1px solid var(--border);
}
.behind {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 5px;
  width: 84px;
  padding-left: 14px;
  background: var(--muted);
  color: #fff;
  font-weight: 600;
}
.behind svg { width: 13px; height: 13px; }
.front {
  position: relative;
  border-bottom: 0;
  animation: slide8 var(--loop) infinite;
}
@keyframes slide8 { 0%, 14% { transform: none; } 30%, 52% { transform: translateX(-84px); } 58%, 100% { transform: none; } }
.skipped {
  color: var(--muted);
  font-size: 0.72rem;
  opacity: 0;
  animation: sk8 var(--loop) infinite;
}
@keyframes sk8 { 0%, 56% { opacity: 0; } 60%, 92% { opacity: 1; } 98%, 100% { opacity: 0; } }
.s8 .front .nm { animation: dim8 var(--loop) infinite; }
@keyframes dim8 { 0%, 56% { color: var(--text); } 60%, 92% { color: var(--muted); } 98%, 100% { color: var(--text); } }
/* The finger presses, drags left, lets go, then taps Skip. */
.tap.drag { animation: drag8 var(--loop) infinite; }
@keyframes drag8 {
  0%, 8% { opacity: 0; transform: none; }
  12% { opacity: 1; transform: none; }
  30% { opacity: 1; transform: translateX(-84px); }
  33% { opacity: 0; transform: translateX(-84px); }
  40% { opacity: 0; transform: translateX(28px) scale(0.5); }
  44% { opacity: 1; transform: translateX(28px) scale(1); }
  50%, 100% { opacity: 0; transform: translateX(28px) scale(1.3); }
}
</style>
